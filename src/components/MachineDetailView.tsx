/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Machine, SensorReading, FaultMode } from '../types/industrial';
import { TelemetryChart } from './charts/TelemetryChart';
import { useTheme } from '../context/ThemeContext';
import { 
  Activity, 
  AlertTriangle, 
  Flame, 
  Wrench, 
  Clock, 
  RotateCcw, 
  ShieldCheck, 
  Info, 
  Gauge, 
  Thermometer, 
  Waves,
  Zap,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { analyzeSensorReading } from '../services/detectionEngine';

interface MachineDetailViewProps {
  machines: Machine[];
  selectedMachineId: string;
  onSelectMachineId: (id: string) => void;
  readings: SensorReading[];
  alertThreshold: number;
  onInjectFault: (machineId: string, faultMode: FaultMode, intensity: number) => void;
  onResolveFault: (machineId: string) => void;
  onOpenCreateWorkOrder: (machine: Machine, reading: SensorReading) => void;
}

export const MachineDetailView: React.FC<MachineDetailViewProps> = ({
  machines,
  selectedMachineId,
  onSelectMachineId,
  readings,
  alertThreshold,
  onInjectFault,
  onResolveFault,
  onOpenCreateWorkOrder,
}) => {
  const { isDark } = useTheme();
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'temperature' | 'vibration' | 'pressure' | 'risk'>('all');
  const [injectionMode, setInjectionMode] = useState<FaultMode>('bearing_wear');
  const [injectionIntensity, setInjectionIntensity] = useState<number>(0.75);

  const machine = machines.find((m) => m.id === selectedMachineId) || machines[0];
  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  if (!machine) return null;

  const detection = latest ? analyzeSensorReading(
    machine,
    {
      temperature: latest.temperature,
      vibration: latest.vibration,
      pressure: latest.pressure,
      kurtosis: latest.kurtosis,
      crestFactor: latest.crestFactor,
    },
    alertThreshold,
    readings
  ) : null;

  const isStoppage = latest?.isStoppage;
  const isAlert = latest?.isAlertTriggered;

  return (
    <div className="space-y-6">
      {/* Top Bar: Machine Selector & Operational State */}
      <div className={`p-4 rounded-2xl border transition-colors flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono font-bold text-sm ${
            isDark ? 'bg-cyan-950 border-cyan-800 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700'
          }`}>
            {machine.code}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <select
                value={machine.id}
                onChange={(e) => onSelectMachineId(e.target.value)}
                className={`font-bold text-base rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer border ${
                  isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code}) — {m.bay}
                  </option>
                ))}
              </select>
            </div>
            <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Bay: {machine.bay} • Total Run: {machine.totalRunHours.toLocaleString()} hrs • Criticality: {machine.criticality}
            </p>
          </div>
        </div>

        {/* Live Status and RUL pill */}
        <div className="flex flex-wrap items-center gap-3 font-mono">
          <div className={`px-3 py-1.5 rounded-lg border text-xs ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`mr-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Remaining Useful Life:</span>
            <span className={`font-bold ${
              latest && latest.estimatedRulHours <= 6 ? 'text-rose-500 font-black animate-pulse' :
              latest && latest.estimatedRulHours <= 36 ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'
            }`}>
              {latest ? `${latest.estimatedRulHours} hrs` : '--'}
            </span>
          </div>

          <div className={`px-3 py-1.5 rounded-lg border text-xs ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`mr-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Status:</span>
            {isStoppage ? (
              <span className="text-rose-500 font-bold">UNPLANNED STOPPAGE</span>
            ) : machine.status === 'CRITICAL' ? (
              <span className="text-rose-500 font-bold">CRITICAL DEGRADATION</span>
            ) : machine.status === 'WARNING' ? (
              <span className="text-amber-500 font-bold">PRE-FAILURE WARNING</span>
            ) : (
              <span className="text-emerald-500 font-bold">NOMINAL SAFE</span>
            )}
          </div>

          {latest && (
            <button
              onClick={() => onOpenCreateWorkOrder(machine, latest)}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule Work Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Multi-Sensor Oscilloscope / Time Series Canvas */}
      <div className={`p-4 rounded-2xl border transition-colors space-y-3 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Metric Selector Bar */}
        <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
            <span className={`mr-2 uppercase text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Telemetry Channel:
            </span>
            {[
              { id: 'all', label: 'Composite Envelope (%)' },
              { id: 'vibration', label: 'ISO 10816 Vibration (mm/s)' },
              { id: 'temperature', label: 'Temperature (°C)' },
              { id: 'pressure', label: 'Pressure (bar)' },
              { id: 'risk', label: 'Failure Risk Probability (%)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedMetric(tab.id as any)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer border ${
                  selectedMetric === tab.id
                    ? isDark 
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' 
                      : 'bg-cyan-50 text-cyan-800 border-cyan-300 font-bold'
                    : isDark 
                      ? 'text-slate-400 hover:text-slate-200 bg-slate-950 border-slate-800' 
                      : 'text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Buffer: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{readings.length} samples</strong> (2s ticks)
          </div>
        </div>

        {/* Time-Series Chart */}
        <TelemetryChart
          data={readings}
          baseline={machine.baseline}
          selectedMetric={selectedMetric}
          alertThreshold={alertThreshold}
        />
      </div>

      {/* Bottom 2 Columns: Explainable Diagnostic Engine + Sensor Tolerances & Fault Injector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
        {/* Diagnostic Explanation & Physical Root Cause */}
        <div className={`lg:col-span-2 p-4 rounded-2xl border transition-colors space-y-4 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between border-b pb-2.5 ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500" />
              <h4 className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Feature #3: Rule & Model-Based Failure Diagnostic Engine
              </h4>
            </div>
            <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${
              isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
            }`}>
              ISO 10816 + Kurtosis Shock
            </span>
          </div>

          {/* Root cause callout */}
          <div className={`p-3.5 rounded-xl border ${
            isAlert 
              ? isDark 
                ? 'bg-rose-950/40 border-rose-800 text-rose-200' 
                : 'bg-rose-50 border-rose-200 text-rose-900'
              : isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-300' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-start gap-2.5">
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isAlert ? 'text-rose-500' : 'text-slate-400'}`} />
              <div>
                <div className={`text-xs uppercase tracking-wider font-bold ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Dominant Incipient Failure Mode:
                </div>
                <div className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {detection ? detection.dominantFailureCause : 'Normal Operation'}
                </div>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {detection ? detection.diagnosticRationale : 'All physical sensors reporting within safe operational boundary.'}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Health Score</span>
              <span className={`text-lg font-bold font-mono ${
                (latest?.healthScore || 100) < 50 ? 'text-rose-500' :
                (latest?.healthScore || 100) < 75 ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {latest ? `${latest.healthScore}%` : '--'}
              </span>
              <span className="text-[9px] text-slate-400 block">Target: &gt;80%</span>
            </div>

            <div className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Bearing Kurtosis (K)</span>
              <span className={`text-lg font-bold font-mono ${
                (latest?.kurtosis || 3.0) > 4.5 ? 'text-rose-500' :
                (latest?.kurtosis || 3.0) > 3.6 ? 'text-amber-500' : isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {latest ? latest.kurtosis.toFixed(2) : '3.00'}
              </span>
              <span className="text-[9px] text-slate-400 block">Nominal Gaussian: ~3.0</span>
            </div>

            <div className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Crest Factor (Pk/RMS)</span>
              <span className={`text-lg font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {latest ? latest.crestFactor.toFixed(2) : '1.60'}
              </span>
              <span className="text-[9px] text-slate-400 block">Impact shock peak</span>
            </div>

            <div className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>ISO 10816 Zone</span>
              <span className={`text-lg font-bold font-mono ${
                latest?.isoZone === 'D' ? 'text-rose-500' :
                latest?.isoZone === 'C' ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                Zone {latest?.isoZone || 'A'}
              </span>
              <span className="text-[9px] text-slate-400 block">Vibration severity</span>
            </div>
          </div>

          {/* Tolerance Boundaries Reference Table */}
          <div className={`rounded-xl border overflow-hidden ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`px-3 py-2 border-b text-[11px] font-semibold flex items-center justify-between ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <span>Physical Operating Envelope Limits</span>
              <span className="text-[10px]">Live Value</span>
            </div>
            <div className="p-3 space-y-2.5">
              {/* Temp Row */}
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                  Temperature:
                </span>
                <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nominal {machine.baseline.tempNominal}°C | Warn {machine.baseline.tempWarning}°C | Trip {machine.baseline.tempCritical}°C
                </span>
                <span className={`font-bold ${
                  latest && latest.temperature >= machine.baseline.tempCritical ? 'text-rose-500' :
                  latest && latest.temperature >= machine.baseline.tempWarning ? 'text-amber-500' : isDark ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  {latest ? `${latest.temperature.toFixed(1)}°C` : '--'}
                </span>
              </div>

              {/* Vib Row */}
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Waves className="w-3.5 h-3.5 text-cyan-500" />
                  Vibration (RMS):
                </span>
                <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nominal {machine.baseline.vibNominal} mm/s | Warn {machine.baseline.vibWarning} mm/s | Trip {machine.baseline.vibCritical} mm/s
                </span>
                <span className={`font-bold ${
                  latest && latest.vibration >= machine.baseline.vibCritical ? 'text-rose-500' :
                  latest && latest.vibration >= machine.baseline.vibWarning ? 'text-amber-500' : isDark ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  {latest ? `${latest.vibration.toFixed(2)} mm/s` : '--'}
                </span>
              </div>

              {/* Press Row */}
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Gauge className="w-3.5 h-3.5 text-purple-500" />
                  Hydraulic Pressure:
                </span>
                <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nominal {machine.baseline.pressureNominal}b | Safe [{machine.baseline.pressureWarningLow} - {machine.baseline.pressureWarningHigh} bar]
                </span>
                <span className={`font-bold ${
                  latest && (latest.pressure <= machine.baseline.pressureCriticalLow || latest.pressure >= machine.baseline.pressureCriticalHigh) ? 'text-rose-500' : isDark ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  {latest ? `${latest.pressure.toFixed(1)} bar` : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fault Injection Sandbox */}
        <div className={`p-4 rounded-2xl border transition-colors flex flex-col justify-between space-y-4 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className={`flex items-center gap-2 border-b pb-2.5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <Flame className="w-4 h-4 text-rose-500" />
              <h4 className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Unit Fault Simulator
              </h4>
            </div>
            <p className={`text-[11px] mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Simulate degradation in <strong className={isDark ? 'text-white' : 'text-slate-900'}>{machine.code}</strong> to verify early warning response before stoppage.
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Failure Mechanism:</label>
                <select
                  value={injectionMode}
                  onChange={(e) => setInjectionMode(e.target.value as FaultMode)}
                  className={`w-full rounded-lg p-2 text-xs focus:outline-none focus:border-rose-500 border cursor-pointer ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="bearing_wear">Bearing Wear (Vibration & Kurtosis)</option>
                  <option value="thermal_runaway">Thermal Runaway (Coolant Loss)</option>
                  <option value="seal_leak">Seal Leak (Hydraulic Pressure Drop)</option>
                  <option value="cavitation">Fluid Cavitation (Shock Pulses)</option>
                  <option value="overstrain">Tooling Overstrain (Excessive Load)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Severity:</span>
                  <span className="text-rose-500 font-bold">{(injectionIntensity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={injectionIntensity}
                  onChange={(e) => setInjectionIntensity(parseFloat(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              <button
                onClick={() => onInjectFault(machine.id, injectionMode, injectionIntensity)}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Flame className="w-3.5 h-3.5 text-white" />
                <span>Simulate Fault Signature</span>
              </button>

              {machine.faultMode !== 'none' && (
                <button
                  onClick={() => onResolveFault(machine.id)}
                  className={`w-full font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 mt-2 border cursor-pointer ${
                    isDark 
                      ? 'bg-emerald-950 hover:bg-emerald-900 border-emerald-700 text-emerald-300' 
                      : 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Restore Machine to Nominal</span>
                </button>
              )}
            </div>
          </div>

          <div className={`p-3 rounded-lg border text-[11px] ${
            isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className={`font-bold block mb-1 flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <Info className="w-3 h-3 text-cyan-500" />
              Threshold Warning:
            </span>
            Failure risk crosses the alert threshold (τ = {(alertThreshold * 100).toFixed(0)}%) early to give maintenance hours of lead time before physical stoppage occurs.
          </div>
        </div>
      </div>
    </div>
  );
};
