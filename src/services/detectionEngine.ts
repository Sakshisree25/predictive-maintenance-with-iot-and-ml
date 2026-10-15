/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Machine, SensorReading } from '../types/industrial';

export interface DetectionResult {
  anomalyScore: number;       // 0.0 - 1.0
  failureRisk: number;        // 0.0 - 1.0
  healthScore: number;        // 0 - 100
  estimatedRulHours: number;  // Hours until critical stoppage
  isoZone: 'A' | 'B' | 'C' | 'D';
  dominantFailureCause: string;
  isAlertTriggered: boolean;
  alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL';
  diagnosticRationale: string;
}

/**
 * Calculates ISO 10816 Vibration Severity Zone
 * Standard industrial evaluation for rigid/flexible foundation machinery
 */
export function calculateIsoZone(vibrationMmS: number): 'A' | 'B' | 'C' | 'D' {
  if (vibrationMmS < 1.8) return 'A'; // Good
  if (vibrationMmS < 4.5) return 'B'; // Acceptable
  if (vibrationMmS < 7.1) return 'C'; // Unsatisfactory (Warning)
  return 'D';                         // Unacceptable (Damage imminent)
}

/**
 * Multi-layer Model & Rule-Based Detector
 * Combines physical bounds, ISO standards, statistical kurtosis, and exponential degradation models.
 */
export function analyzeSensorReading(
  machine: Machine,
  reading: {
    temperature: number;
    vibration: number;
    pressure: number;
    kurtosis: number;
    crestFactor: number;
    rpm?: number;
    powerDraw?: number;
  },
  alertThreshold: number = 0.35,
  recentReadings?: SensorReading[]
): DetectionResult {
  const { baseline } = machine;

  // 1. Normalized Thermal Stress [0, 1+]
  const tempStress = Math.max(
    0,
    (reading.temperature - baseline.tempNominal) / 
    Math.max(1, baseline.tempCritical - baseline.tempNominal)
  );

  // 2. Normalized Vibration Stress [0, 1+]
  const vibStress = Math.max(
    0,
    (reading.vibration - baseline.vibNominal) / 
    Math.max(0.5, baseline.vibCritical - baseline.vibNominal)
  );

  // 3. Normalized Pressure Envelope Stress [0, 1+]
  let pressStress = 0;
  if (reading.pressure < baseline.pressureNominal) {
    pressStress = Math.max(
      0,
      (baseline.pressureNominal - reading.pressure) / 
      Math.max(0.1, baseline.pressureNominal - baseline.pressureCriticalLow)
    );
  } else {
    pressStress = Math.max(
      0,
      (reading.pressure - baseline.pressureNominal) / 
      Math.max(0.1, baseline.pressureCriticalHigh - baseline.pressureNominal)
    );
  }

  // 4. Impulsive Shock Stress (Kurtosis above Gaussian background 3.0)
  const kurtosisExcess = Math.max(0, reading.kurtosis - 3.0);
  const crestExcess = Math.max(0, reading.crestFactor - 1.8);
  const bearingShockStress = Math.min(1.0, (kurtosisExcess / 3.0) * 0.7 + (crestExcess / 2.0) * 0.3);

  // 5. Composite Multivariate Anomaly Metric
  // Weights: Vibration (35%), Pressure (25%), Temperature (25%), Bearing Shock (15%)
  const anomalyScoreRaw = 
    0.35 * vibStress +
    0.25 * tempStress +
    0.25 * pressStress +
    0.15 * bearingShockStress;
  
  const anomalyScore = Math.min(1.0, Math.max(0.01, anomalyScoreRaw));

  // 6. Calibrated Failure Risk Probability Function:
  // Non-linear sigmoid response mimicking accelerated degradation physics
  const steepness = 7.0;
  const inflectionPoint = 0.42;
  const failureRiskRaw = 1 / (1 + Math.exp(-steepness * (anomalyScore - inflectionPoint)));
  const failureRisk = Math.min(0.99, Math.max(0.01, Number(failureRiskRaw.toFixed(4))));

  // 7. Health Score (0 - 100)
  const healthScore = Math.max(0, Math.min(100, Math.round((1 - failureRisk) * 100)));

  // 8. ISO 10816 Severity Zone
  const isoZone = calculateIsoZone(reading.vibration);

  // 9. Remaining Useful Life (RUL) Estimation in Hours:
  // When healthy, machine has high expected lifetime (e.g. 1,000+ hours to maintenance)
  // When degradation slope accelerates, calculate remaining operational hours before reaching risk >= 0.90
  let estimatedRulHours: number;
  
  // Calculate historical rate of change if we have rolling history
  let degradationRatePerHour = 0.02; // default small background drift
  if (recentReadings && recentReadings.length >= 10) {
    const oldest = recentReadings[0];
    const newest = recentReadings[recentReadings.length - 1];
    const deltaHours = Math.max(0.01, (newest.timestamp - oldest.timestamp) / (1000 * 3600));
    const deltaRisk = newest.failureRisk - oldest.failureRisk;
    if (deltaRisk > 0 && deltaHours > 0) {
      degradationRatePerHour = Math.max(0.02, deltaRisk / deltaHours);
    }
  }

  if (failureRisk < 0.15) {
    // Healthy baseline: 1200 - 2400 hours
    estimatedRulHours = Math.round(1800 - failureRisk * 3000);
  } else if (failureRisk < 0.40) {
    // Early degradation: 150 - 600 hours
    estimatedRulHours = Math.round(480 - (failureRisk - 0.15) * 1200);
  } else if (failureRisk < 0.70) {
    // Warning degradation phase: 12 - 72 hours
    const remainingRiskBudget = 0.90 - failureRisk;
    estimatedRulHours = Math.max(4.0, Math.round(remainingRiskBudget / (degradationRatePerHour * 0.15)));
    estimatedRulHours = Math.min(72, estimatedRulHours);
  } else {
    // Critical terminal phase: 0.5 - 8 hours
    const hoursLeft = Math.max(0.2, (1.0 - failureRisk) * 12);
    estimatedRulHours = Number(hoursLeft.toFixed(1));
  }

  // 10. Root Cause Attribution
  const stressEntries = [
    { name: 'Vibration & Mechanical Imbalance', val: vibStress, metric: 'vibration' },
    { name: 'Thermal Dissipation / Bearing Overheating', val: tempStress, metric: 'temperature' },
    { name: 'Hydraulic / Pressure Boundary Instability', val: pressStress, metric: 'pressure' },
    { name: 'Impulsive Bearing Raceway Impact (High Kurtosis)', val: bearingShockStress, metric: 'kurtosis' }
  ];
  stressEntries.sort((a, b) => b.val - a.val);
  const dominant = stressEntries[0];

  let dominantFailureCause = 'Nominal Operation';
  let diagnosticRationale = 'Sensors reporting within standard operational envelope.';

  if (anomalyScore > 0.25) {
    if (dominant.metric === 'vibration' || dominant.metric === 'kurtosis') {
      dominantFailureCause = reading.kurtosis > 4.2 
        ? 'Bearing Inner/Outer Raceway Spalling' 
        : 'Spindle Unbalance / Shaft Misalignment';
      diagnosticRationale = `Vibration level reached ${reading.vibration.toFixed(2)} mm/s (${isoZone} zone), with impact shock factor (kurtosis ${reading.kurtosis.toFixed(2)}).`;
    } else if (dominant.metric === 'temperature') {
      dominantFailureCause = 'Lubricant Breakdown / Coolant Heat Saturation';
      diagnosticRationale = `Core temperature ${reading.temperature.toFixed(1)}°C exceeded normal baseline by +${(reading.temperature - baseline.tempNominal).toFixed(1)}°C.`;
    } else {
      dominantFailureCause = reading.pressure < baseline.pressureNominal
        ? 'Hydraulic Cavitation / Line Pressure Loss'
        : 'Manifold Choke / Over-pressure Stress';
      diagnosticRationale = `Operating pressure ${reading.pressure.toFixed(1)} bar drifted beyond allowable tolerances.`;
    }
  }

  // Alert determination using active threshold
  const isAlertTriggered = failureRisk >= alertThreshold;
  let alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
  if (failureRisk >= 0.70 || isoZone === 'D') {
    alertLevel = 'CRITICAL';
  } else if (failureRisk >= alertThreshold || isoZone === 'C') {
    alertLevel = 'WARNING';
  }

  return {
    anomalyScore,
    failureRisk,
    healthScore,
    estimatedRulHours,
    isoZone,
    dominantFailureCause,
    isAlertTriggered,
    alertLevel,
    diagnosticRationale
  };
}
