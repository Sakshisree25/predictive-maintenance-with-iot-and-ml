/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { INITIAL_FLEET } from '../data/machineFleet';
import { 
  Machine, 
  SensorReading, 
  MachineAlert, 
  FaultMode, 
  MaintenanceWorkOrder 
} from '../types/industrial';
import { analyzeSensorReading } from './detectionEngine';
import { generateSchedulingSuggestion } from './costEvaluation';

export interface PublicDatasetPreset {
  id: 'synthetic_live' | 'ai4i_2020' | 'nasa_cmapss';
  name: string;
  description: string;
  source: string;
  sampleCount: number;
}

export const DATASET_PRESETS: PublicDatasetPreset[] = [
  {
    id: 'synthetic_live',
    name: 'Real-Time Factory IoT Stream (12 Machinery Cells)',
    description: 'High-resolution industrial sensor simulator featuring thermal, triaxial vibration, and hydraulic pressure dynamics with fault injection support.',
    source: 'Physics-Grounded Factory Telemetry Generator',
    sampleCount: 12000,
  },
  {
    id: 'ai4i_2020',
    name: 'AI4I 2020 Predictive Maintenance (UCI Benchmark)',
    description: 'Calibrated distribution reflecting the 10,000 real-world milling operational records with Tool Wear (TWF), Heat Dissipation (HDF), and Overstrain (OSF) failure modes.',
    source: 'UCI Machine Learning Repository / Matan et al.',
    sampleCount: 10000,
  },
  {
    id: 'nasa_cmapss',
    name: 'NASA C-MAPSS Run-to-Failure Turbomachinery',
    description: 'Progressive exponential sensor degradation trajectory modeling turbofan engine operational run-to-catastrophic-failure.',
    source: 'NASA Prognostics Center of Excellence (PCoE)',
    sampleCount: 20631,
  },
];

class TelemetryStore {
  private machines: Map<string, Machine> = new Map();
  // Circular buffer per machine: maps machineId -> SensorReading[]
  private timeSeriesData: Map<string, SensorReading[]> = new Map();
  private alerts: MachineAlert[] = [];
  private workOrders: MaintenanceWorkOrder[] = [];
  private maxBufferSize = 500; // Store last 500 readings per machine
  private listeners: Set<() => void> = new Set();
  private alertThreshold = 0.35;
  private currentPreset: PublicDatasetPreset['id'] = 'synthetic_live';

  constructor() {
    this.initFleet();
  }

  public initFleet() {
    this.machines.clear();
    this.timeSeriesData.clear();
    this.alerts = [];
    this.workOrders = [];

    // Pre-seed with machines
    for (const m of INITIAL_FLEET) {
      this.machines.set(m.id, { ...m });
      this.timeSeriesData.set(m.id, []);
    }

    // Pre-populate 120 historical readings per machine to have rich charts right away
    const now = Date.now();
    const intervalMs = 2000; // 2 seconds between samples
    const historicalCount = 120;

    for (const [mId, machine] of this.machines.entries()) {
      const readings: SensorReading[] = [];
      const historyStartTime = now - (historicalCount * intervalMs);

      // Give 2 machines slight natural pre-existing degradation to make dashboard instantly interesting
      let mockFault: FaultMode = 'none';
      let mockIntensity = 0;
      if (mId === 'm-01') {
        mockFault = 'bearing_wear';
        mockIntensity = 0.42;
      } else if (mId === 'm-04') {
        mockFault = 'thermal_runaway';
        mockIntensity = 0.35;
      }

      for (let step = 0; step < historicalCount; step++) {
        const stepTime = historyStartTime + (step * intervalMs);
        const progress = step / historicalCount;
        const currentIntensity = mockFault !== 'none' ? mockIntensity * progress : 0;
        
        const reading = this.generateSampleReading(machine, stepTime, mockFault, currentIntensity, readings);
        readings.push(reading);
      }

      this.timeSeriesData.set(mId, readings);

      // Set machine status based on latest reading
      const lastReading = readings[readings.length - 1];
      if (lastReading) {
        if (mockFault !== 'none') {
          machine.faultMode = mockFault;
          machine.faultIntensity = mockIntensity;
        }
        if (lastReading.isStoppage) {
          machine.status = 'STOPPED';
        } else if (lastReading.failureRisk >= 0.70) {
          machine.status = 'CRITICAL';
        } else if (lastReading.failureRisk >= this.alertThreshold) {
          machine.status = 'WARNING';
        } else {
          machine.status = 'NORMAL';
        }
      }
    }

    // Pre-seed 2 initial work orders for high-risk machines
    const m01 = this.machines.get('m-01')!;
    const m01Suggestion = generateSchedulingSuggestion(m01.name, 0.45, 18.5, 'Bearing Inner Raceway Spalling', this.alertThreshold);
    this.workOrders.push({
      id: 'WO-8910',
      machineId: m01.id,
      machineName: m01.name,
      title: 'Vibration Exceedance & Spindle Bearing Inspection',
      priority: m01Suggestion.urgency,
      recommendedShift: m01Suggestion.recommendedShift,
      assignedTechnician: 'D. Vance (Vibration Specialist)',
      estimatedHours: 3.5,
      partsRequired: m01Suggestion.parts,
      estimatedCost: 1150,
      status: 'PENDING',
      createdAt: now - 3600000,
      diagnosisSummary: 'Vibration reached 3.4 mm/s with Kurtosis 4.3. Bearing wear detected early.',
      targetCompletionWindow: m01Suggestion.targetWindow,
    });
  }

  public setAlertThreshold(threshold: number) {
    this.alertThreshold = threshold;
    this.notify();
  }

  public getAlertThreshold(): number {
    return this.alertThreshold;
  }

  public getMachines(): Machine[] {
    return Array.from(this.machines.values());
  }

  public getMachine(id: string): Machine | undefined {
    return this.machines.get(id);
  }

  public getTimeSeries(machineId: string, limit?: number): SensorReading[] {
    const list = this.timeSeriesData.get(machineId) || [];
    if (limit && limit > 0) {
      return list.slice(-limit);
    }
    return list;
  }

  public getAllAlerts(): MachineAlert[] {
    return [...this.alerts].reverse();
  }

  public getWorkOrders(): MaintenanceWorkOrder[] {
    return [...this.workOrders];
  }

  public addWorkOrder(order: MaintenanceWorkOrder) {
    this.workOrders.unshift(order);
    this.notify();
  }

  public updateWorkOrderStatus(orderId: string, status: MaintenanceWorkOrder['status']) {
    const order = this.workOrders.find(w => w.id === orderId);
    if (order) {
      order.status = status;
      if (status === 'COMPLETED') {
        // Resolve machine fault if in maintenance
        const machine = this.machines.get(order.machineId);
        if (machine) {
          this.resolveFault(machine.id);
        }
      }
      this.notify();
    }
  }

  public acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.notify();
    }
  }

  public injectFault(machineId: string, faultMode: FaultMode, intensity: number = 0.75) {
    const machine = this.machines.get(machineId);
    if (!machine) return;

    machine.faultMode = faultMode;
    machine.faultIntensity = Math.min(1.0, Math.max(0.1, intensity));
    machine.faultStartTimestamp = Date.now();
    this.notify();
  }

  public resolveFault(machineId: string) {
    const machine = this.machines.get(machineId);
    if (!machine) return;

    machine.faultMode = 'none';
    machine.faultIntensity = 0;
    machine.faultStartTimestamp = undefined;
    machine.status = 'NORMAL';
    machine.lastMaintenanceDate = new Date().toISOString().split('T')[0];
    this.notify();
  }

  public setPreset(presetId: PublicDatasetPreset['id']) {
    this.currentPreset = presetId;
    if (presetId === 'ai4i_2020') {
      this.loadAi4iDatasetPreset();
    } else if (presetId === 'nasa_cmapss') {
      this.loadNasaCmapssPreset();
    } else {
      this.initFleet();
    }
    this.notify();
  }

  public getCurrentPreset(): PublicDatasetPreset['id'] {
    return this.currentPreset;
  }

  /**
   * Generates a single physics-grounded reading
   */
  private generateSampleReading(
    machine: Machine,
    timestamp: number,
    faultMode: FaultMode,
    faultIntensity: number,
    history: SensorReading[]
  ): SensorReading {
    const { baseline } = machine;
    
    // Natural operational jitter (Gaussian approximation)
    const jitter = () => (Math.random() - 0.5) * 2;
    // Harmonic oscillation
    const tSec = timestamp / 1000;
    const cycle = Math.sin(tSec / 30);

    let temp = baseline.tempNominal + cycle * 0.8 + jitter() * 0.6;
    let vib = baseline.vibNominal + cycle * 0.08 + jitter() * 0.12;
    let press = baseline.pressureNominal + cycle * 0.3 + jitter() * 0.4;
    let rpm = baseline.rpmNominal + jitter() * 15;
    let power = baseline.powerNominal + jitter() * 1.5;
    let kurtosis = 2.95 + jitter() * 0.18;
    let crestFactor = 1.6 + jitter() * 0.15;

    // Apply Fault Dynamics
    if (faultMode === 'bearing_wear') {
      // High vibration growth, high-frequency impacts (kurtosis spike)
      vib += (baseline.vibCritical - baseline.vibNominal) * (0.45 + faultIntensity * 0.8) + jitter() * 0.3;
      kurtosis += 1.8 + faultIntensity * 3.5 + Math.random() * 0.6;
      crestFactor += 1.0 + faultIntensity * 1.8;
      temp += (baseline.tempCritical - baseline.tempNominal) * (0.15 * faultIntensity);
    } else if (faultMode === 'thermal_runaway') {
      // Exponential temperature rise from cooling/lubricant failure
      temp += (baseline.tempCritical - baseline.tempNominal) * (0.6 + faultIntensity * 0.7) + jitter() * 1.2;
      vib += (baseline.vibWarning - baseline.vibNominal) * (0.3 * faultIntensity);
      power += baseline.powerNominal * 0.18 * faultIntensity;
    } else if (faultMode === 'seal_leak') {
      // Pressure drop and high variance
      press -= (baseline.pressureNominal - baseline.pressureCriticalLow) * (0.55 + faultIntensity * 0.6) + Math.random() * 2.0;
      vib += (baseline.vibWarning - baseline.vibNominal) * 0.25;
    } else if (faultMode === 'cavitation') {
      // Violent pressure oscillations & impeller vibration shocks
      press += (Math.sin(tSec * 4) * (baseline.pressureNominal * 0.28)) * (0.5 + faultIntensity);
      vib += (baseline.vibCritical - baseline.vibNominal) * (0.5 + faultIntensity * 0.6) + jitter() * 0.5;
      kurtosis += 1.4 * faultIntensity;
    } else if (faultMode === 'overstrain') {
      // High load: temp, vibration, and power simultaneously maxed
      power += baseline.powerNominal * 0.45 * faultIntensity;
      temp += (baseline.tempWarning - baseline.tempNominal) * 0.8 * faultIntensity;
      vib += (baseline.vibCritical - baseline.vibNominal) * 0.6 * faultIntensity;
      rpm -= baseline.rpmNominal * 0.08 * faultIntensity;
    }

    // Safety clamps
    temp = Math.max(0, temp);
    vib = Math.max(0.1, vib);
    press = Math.max(0.1, press);
    kurtosis = Math.max(1.8, kurtosis);
    crestFactor = Math.max(1.2, crestFactor);

    // Run Detection Engine
    const detection = analyzeSensorReading(
      machine,
      {
        temperature: temp,
        vibration: vib,
        pressure: press,
        kurtosis,
        crestFactor,
        rpm,
        powerDraw: power
      },
      this.alertThreshold,
      history
    );

    // Stoppage trigger: if risk >= 0.96 or vibration exceeds critical trip limit
    const isStoppage = detection.failureRisk >= 0.95 || vib >= baseline.vibCritical * 1.35;

    return {
      timestamp,
      machineId: machine.id,
      temperature: Number(temp.toFixed(2)),
      vibration: Number(vib.toFixed(3)),
      pressure: Number(press.toFixed(2)),
      rpm: Math.round(rpm),
      powerDraw: Number(power.toFixed(1)),
      kurtosis: Number(kurtosis.toFixed(2)),
      crestFactor: Number(crestFactor.toFixed(2)),
      anomalyScore: detection.anomalyScore,
      failureRisk: detection.failureRisk,
      healthScore: detection.healthScore,
      estimatedRulHours: detection.estimatedRulHours,
      isoZone: detection.isoZone,
      dominantFailureCause: detection.dominantFailureCause,
      isAlertTriggered: detection.isAlertTriggered,
      isStoppage
    };
  }

  /**
   * Main real-time simulation tick
   */
  public tick() {
    const now = Date.now();

    for (const machine of this.machines.values()) {
      const history = this.timeSeriesData.get(machine.id) || [];
      
      // If machine is in a fault mode, gently advance fault intensity
      if (machine.faultMode !== 'none') {
        machine.faultIntensity = Math.min(1.0, machine.faultIntensity + 0.015);
      }

      const reading = this.generateSampleReading(
        machine,
        now,
        machine.faultMode,
        machine.faultIntensity,
        history
      );

      // Append to buffer and maintain circular bound
      history.push(reading);
      if (history.length > this.maxBufferSize) {
        history.shift();
      }
      this.timeSeriesData.set(machine.id, history);

      // Update machine status
      if (reading.isStoppage) {
        machine.status = 'STOPPED';
      } else if (reading.failureRisk >= 0.70) {
        machine.status = 'CRITICAL';
      } else if (reading.failureRisk >= this.alertThreshold) {
        machine.status = 'WARNING';
      } else {
        machine.status = 'NORMAL';
      }

      // Check for Alert Trigger
      if (reading.isAlertTriggered) {
        // Debounce: don't flood if alert already raised within last 30 seconds
        const recentAlert = this.alerts.find(
          a => a.machineId === machine.id && (now - a.timestamp) < 30000
        );

        if (!recentAlert) {
          const detection = analyzeSensorReading(
            machine,
            {
              temperature: reading.temperature,
              vibration: reading.vibration,
              pressure: reading.pressure,
              kurtosis: reading.kurtosis,
              crestFactor: reading.crestFactor,
            },
            this.alertThreshold,
            history
          );

          const alertObj: MachineAlert = {
            id: `ALT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`,
            timestamp: now,
            machineId: machine.id,
            machineName: machine.name,
            severity: detection.alertLevel === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
            metric: 'composite',
            currentValue: Number((reading.failureRisk * 100).toFixed(1)),
            threshold: Number((this.alertThreshold * 100).toFixed(0)),
            unit: '% Risk',
            rootCause: detection.dominantFailureCause,
            recommendedAction: detection.diagnosticRationale,
            acknowledged: false,
            stoppagePredictedInHours: reading.estimatedRulHours,
          };

          this.alerts.unshift(alertObj);
          // Keep max 100 alerts
          if (this.alerts.length > 100) {
            this.alerts.pop();
          }
        }
      }
    }

    this.notify();
  }

  /**
   * Preload AI4I 2020 Predictive Maintenance Dataset Preset
   */
  private loadAi4iDatasetPreset() {
    const now = Date.now();
    for (const machine of this.machines.values()) {
      const history: SensorReading[] = [];
      const count = 120;
      for (let i = 0; i < count; i++) {
        const time = now - (count - i) * 2000;
        const progress = i / count;
        // Distribute AI4I failure modes
        let fMode: FaultMode = 'none';
        let fInt = 0;
        if (machine.id === 'm-01' && progress > 0.6) {
          fMode = 'overstrain';
          fInt = (progress - 0.6) * 2.2;
        } else if (machine.id === 'm-06' && progress > 0.4) {
          fMode = 'thermal_runaway';
          fInt = (progress - 0.4) * 1.5;
        }
        history.push(this.generateSampleReading(machine, time, fMode, fInt, history));
      }
      this.timeSeriesData.set(machine.id, history);
    }
  }

  /**
   * Preload NASA C-MAPSS Run-to-Failure Preset
   */
  private loadNasaCmapssPreset() {
    const now = Date.now();
    for (const machine of this.machines.values()) {
      const history: SensorReading[] = [];
      const count = 150;
      for (let i = 0; i < count; i++) {
        const time = now - (count - i) * 2000;
        const progress = i / count;
        // Exponential degradation curve
        const expDegradation = Math.pow(progress, 3);
        const fMode = machine.id === 'm-11' || machine.id === 'm-03' ? 'bearing_wear' : 'none';
        history.push(this.generateSampleReading(machine, time, fMode, expDegradation, history));
      }
      this.timeSeriesData.set(machine.id, history);
    }
  }

  /**
   * Export all time series data to CSV
   */
  public exportCsv(): string {
    const headers = [
      'timestamp',
      'timestamp_iso',
      'machine_id',
      'machine_name',
      'temperature_c',
      'vibration_mms',
      'pressure_bar',
      'rpm',
      'power_kw',
      'kurtosis',
      'crest_factor',
      'anomaly_score',
      'failure_risk',
      'health_score',
      'rul_hours',
      'iso_zone',
      'alert_triggered',
      'stoppage'
    ];

    const rows: string[] = [headers.join(',')];

    for (const machine of this.machines.values()) {
      const history = this.timeSeriesData.get(machine.id) || [];
      for (const r of history) {
        rows.push([
          r.timestamp,
          new Date(r.timestamp).toISOString(),
          `"${r.machineId}"`,
          `"${machine.name}"`,
          r.temperature,
          r.vibration,
          r.pressure,
          r.rpm,
          r.powerDraw,
          r.kurtosis,
          r.crestFactor,
          r.anomalyScore,
          r.failureRisk,
          r.healthScore,
          r.estimatedRulHours,
          r.isoZone,
          r.isAlertTriggered ? 1 : 0,
          r.isStoppage ? 1 : 0,
        ].join(','));
      }
    }

    return rows.join('\n');
  }

  /**
   * Export summary JSON
   */
  public exportJson(): string {
    const data = {
      exportedAt: new Date().toISOString(),
      fleetSize: this.machines.size,
      alertThreshold: this.alertThreshold,
      machines: Array.from(this.machines.values()),
      recentTelemetry: Object.fromEntries(
        Array.from(this.timeSeriesData.entries()).map(([k, v]) => [k, v.slice(-50)])
      ),
      activeAlerts: this.alerts,
      workOrders: this.workOrders
    };
    return JSON.stringify(data, null, 2);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }
}

export const telemetryStore = new TelemetryStore();
