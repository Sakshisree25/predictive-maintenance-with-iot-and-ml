/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MachineStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'MAINTENANCE' | 'STOPPED';

export type FaultMode = 
  | 'none'
  | 'bearing_wear'        // High vibration, kurtosis spike, harmonic chatter
  | 'thermal_runaway'     // Coolant failure, exponential temp rise
  | 'seal_leak'           // Hydraulic valve leak, pressure loss & instability
  | 'cavitation'          // Fluid turbulence, high frequency pressure & vibration pulses
  | 'overstrain';         // Heavy tooling overload, high power + high vibration

export type MachineType = 
  | 'CNC Milling Center'
  | 'Hydraulic Stamping Press'
  | 'Centrifugal Slurry Pump'
  | 'Rotary Screw Compressor'
  | 'Induction Motor Drive'
  | 'Polymer Extruder'
  | 'Overhead Conveyor Drive'
  | 'Injection Molding Press'
  | 'Process Water Chiller'
  | 'Articulated Welding Robot'
  | 'Turbine Generator'
  | 'High-Pressure Feed Pump';

export interface SensorBaseline {
  tempNominal: number;       // °C
  tempWarning: number;
  tempCritical: number;
  
  vibNominal: number;        // mm/s RMS (ISO 10816)
  vibWarning: number;
  vibCritical: number;

  pressureNominal: number;   // bar
  pressureWarningLow: number;
  pressureWarningHigh: number;
  pressureCriticalLow: number;
  pressureCriticalHigh: number;

  rpmNominal: number;
  powerNominal: number;      // kW
}

export interface Machine {
  id: string;
  name: string;
  code: string;
  bay: string;
  type: MachineType;
  operationalSince: string;
  totalRunHours: number;
  baseline: SensorBaseline;
  status: MachineStatus;
  faultMode: FaultMode;
  faultIntensity: number; // 0 to 1
  faultStartTimestamp?: number;
  lastMaintenanceDate: string;
  criticality: 'CRITICAL_PATH' | 'HIGH' | 'MEDIUM';
}

export interface SensorReading {
  timestamp: number;
  machineId: string;
  temperature: number;      // °C
  vibration: number;        // mm/s RMS
  pressure: number;         // bar
  rpm: number;
  powerDraw: number;        // kW
  kurtosis: number;         // Bearing impact indicator (nominal ~3.0)
  crestFactor: number;      // Peak / RMS ratio (nominal ~1.4 - 2.0)
  
  // Model & detector inferences:
  anomalyScore: number;     // 0.0 - 1.0 (multivariate statistical deviation)
  failureRisk: number;      // 0.0 - 1.0 (composite calibrated risk probability)
  healthScore: number;      // 0 - 100%
  estimatedRulHours: number;// Remaining Useful Life in operational hours
  isoZone: 'A' | 'B' | 'C' | 'D'; // ISO 10816 Vibration severity zone
  dominantFailureCause?: string;
  isAlertTriggered: boolean;
  isStoppage: boolean;      // Whether machine physically stalled
}

export interface MachineAlert {
  id: string;
  timestamp: number;
  machineId: string;
  machineName: string;
  severity: 'WARNING' | 'CRITICAL' | 'INFO';
  metric: 'temperature' | 'vibration' | 'pressure' | 'composite';
  currentValue: number;
  threshold: number;
  unit: string;
  rootCause: string;
  recommendedAction: string;
  acknowledged: boolean;
  workOrderId?: string;
  stoppagePredictedInHours?: number;
}

export interface MaintenanceWorkOrder {
  id: string;
  machineId: string;
  machineName: string;
  title: string;
  priority: 'EMERGENCY' | 'HIGH' | 'PLANNED';
  recommendedShift: 'IMMEDIATE_STOP' | 'NEXT_SHIFT_WINDOW' | 'WEEKEND_MAINTENANCE';
  assignedTechnician: string;
  estimatedHours: number;
  partsRequired: string[];
  estimatedCost: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: number;
  diagnosisSummary: string;
  targetCompletionWindow: string;
}

export interface CostModelConfig {
  costFalsePositive: number; // Unnecessary stoppage & inspection ($)
  costFalseNegative: number; // Missed failure / catastrophic stoppage ($)
  costTruePositive: number;  // Planned preventative maintenance ($)
  costTrueNegative: number;  // Normal operation cost baseline ($0)
  alertThreshold: number;    // User-selected alert threshold (0.05 - 0.95)
}

export interface ConfusionMatrix {
  truePositives: number;   // Early warning given & true degradation/failure occurred
  falsePositives: number;  // False alarm: alert fired on healthy operation
  trueNegatives: number;   // Normal operation correctly ignored
  falseNegatives: number;  // Missed failure: machine failed without warning!
}

export interface ThresholdEvaluationPoint {
  threshold: number;
  confusionMatrix: ConfusionMatrix;
  tpr: number; // Recall / Sensitivity
  fpr: number; // 1 - Specificity
  precision: number;
  specificity: number;
  f1Score: number;
  totalCost: number;
  unplannedDowntimeSavedHours: number;
}

export interface CostEvaluationResult {
  optimalThreshold: number;
  minCost: number;
  currentThresholdCost: number;
  naiveReactiveCost: number; // Cost if relying only on breakdown / no detector
  totalCostSavings: number;
  evaluationCurve: ThresholdEvaluationPoint[];
  currentMetrics: ThresholdEvaluationPoint;
  rationale: string;
}
