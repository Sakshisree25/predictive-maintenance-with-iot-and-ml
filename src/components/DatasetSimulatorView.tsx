/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Machine, FaultMode, SensorReading } from '../types/industrial';
import { DATASET_PRESETS, PublicDatasetPreset } from '../services/dataSimulator';
import { useTheme } from '../context/ThemeContext';
import { 
  Cpu, 
  Database, 
  Flame, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface DatasetSimulatorViewProps {
  machines: Machine[];
  latestReadings: Map<string, SensorReading>;
  activePreset: PublicDatasetPreset['id'];
  onSelectPreset: (presetId: PublicDatasetPreset['id']) => void;
  onInjectFault: (machineId: string, faultMode: FaultMode, intensity: number) => void;
  onResolveFault: (machineId: string) => void;
  onResolveAllFaults: () => void;
  onInspectMachine: (machineId: string) => void;
}

export const DatasetSimulatorView: React.FC<DatasetSimulatorViewProps> = ({
  machines,
  latestReadings,
  activePreset,
  onSelectPreset,
  onInjectFault,
  onResolveFault,
  onResolveAllFaults,
  onInspectMachine,
}) => {
  const { isDark } = useTheme();
  const [selectedMachineId, setSelectedMachineId] = useState<string>(machines[0]?.id || 'm-01');
  const [selectedFault, setSelectedFault] = useState<FaultMode>('bearing_wear');
  const [faultIntensity, setFaultIntensity] = useState<number>(0.85);

  const selectedMachine = machines.find(m => m.id === selectedMachineId) || machines[0];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className={`p-5 rounded-2xl border transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                isDark ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
              }`}>
                Feature #1: 10+ Machinery Cells & Public Datasets
              </span>
            </div>
            <h2 className={`text-xl font-display font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Industrial Telemetry Simulation & Benchmark Datasets
            </h2>
            <p className={`text-xs max-w-3xl leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Simulate high-fidelity sensor physics across 12 distinct manufacturing cells (CNC mills, hydraulic presses, slurry pumps, extruders, compressors) or load authenticated public predictive maintenance benchmarks.
            </p>
          </div>

          <button
            onClick={onResolveAllFaults}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition-colors border cursor-pointer ${
              isDark 
                ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-700' 
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-emerald-500" />
            <span>Reset All Fleet to Nominal</span>
          </button>
        </div>
      </div>

      {/* Dataset Presets Cards */}
      <div>
        <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 font-mono ${
          isDark ? 'text-slate-300' : 'text-slate-700'
        }`}>
          Select Public Benchmark or Real-Time Generator:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DATASET_PRESETS.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectPreset(p.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? isDark 
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/50' 
                      : 'bg-cyan-50/70 border-cyan-400 shadow-sm'
                    : isDark 
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isSelected 
                        ? 'bg-cyan-500 text-slate-950' 
                        : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isSelected ? 'ACTIVE PRESET' : 'SELECT'}
                    </span>
                    <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {p.sampleCount.toLocaleString()} Samples
                    </span>
                  </div>

                  <h4 className={`font-bold text-sm mt-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {p.name}
                  </h4>
                  <p className={`text-xs mt-1.5 leading-relaxed font-sans ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {p.description}
                  </p>
                </div>

                <div className={`mt-3 pt-2 border-t text-[10px] font-mono flex items-center justify-between ${
                  isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'
                }`}>
                  <span>Source: {p.source}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Fault Injection Deck */}
      <div className={`p-5 rounded-2xl border transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-2 border-b pb-3 mb-4 font-mono">
          <Flame className="w-5 h-5 text-rose-500" />
          <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Machinery Fault Injection Deck
          </h3>
          <span className={`text-xs ml-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Trigger physical failure signatures to evaluate early warning detection
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
          {/* Target Machine */}
          <div className="space-y-2">
            <label className={`block font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              1. Select Target Unit (from 12 Units):
            </label>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-xs focus:outline-none focus:border-cyan-500 cursor-pointer ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-slate-200' 
                  : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code}: {m.name} ({m.type})
                </option>
              ))}
            </select>

            {selectedMachine && (
              <div className={`p-3 rounded-lg border text-[11px] font-sans ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div><strong>Location:</strong> {selectedMachine.bay}</div>
                <div><strong>Nominal Baselines:</strong> {selectedMachine.baseline.tempNominal}°C | {selectedMachine.baseline.vibNominal} mm/s | {selectedMachine.baseline.pressureNominal} bar</div>
                <div><strong>Current State:</strong> <span className="font-bold text-cyan-500">{selectedMachine.status}</span></div>
              </div>
            )}
          </div>

          {/* Fault Mechanism */}
          <div className="space-y-2">
            <label className={`block font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              2. Failure Mechanism to Inject:
            </label>
            <select
              value={selectedFault}
              onChange={(e) => setSelectedFault(e.target.value as FaultMode)}
              className={`w-full p-2.5 rounded-lg border text-xs focus:outline-none focus:border-rose-500 cursor-pointer ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-slate-200' 
                  : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <option value="bearing_wear">Bearing Wear (Vibration & Kurtosis Spike)</option>
              <option value="thermal_runaway">Thermal Runaway (Coolant Heat Saturation)</option>
              <option value="seal_leak">Seal Leak (Hydraulic Line Pressure Drop)</option>
              <option value="cavitation">Fluid Cavitation (Impeller Shock Pulses)</option>
              <option value="overstrain">Tooling Overstrain (Excessive Power & Load)</option>
            </select>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Degradation Severity:</span>
                <span className="font-bold text-rose-500">{(faultIntensity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="1.0"
                step="0.05"
                value={faultIntensity}
                onChange={(e) => setFaultIntensity(parseFloat(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Action & Status */}
          <div className="flex flex-col justify-between space-y-3">
            <div className={`p-3 rounded-lg border text-[11px] leading-relaxed font-sans ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-1 font-bold text-amber-500 mb-1">
                <Info className="w-3.5 h-3.5" />
                <span>Simulation Behavior:</span>
              </div>
              Once injected, sensor signals will progressively exceed safe boundaries until the detection engine flags a pre-failure warning (risk $\ge \tau$). Unmitigated faults will trigger an unplanned machine stoppage!
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => onInjectFault(selectedMachineId, selectedFault, faultIntensity)}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Flame className="w-4 h-4" />
                <span>Inject Fault into {selectedMachine?.code}</span>
              </button>

              {selectedMachine?.faultMode !== 'none' && (
                <button
                  onClick={() => onResolveFault(selectedMachineId)}
                  className={`w-full py-1.5 px-3 rounded-lg transition-colors border flex items-center justify-center gap-1.5 font-bold cursor-pointer ${
                    isDark 
                      ? 'bg-emerald-950 hover:bg-emerald-900 border-emerald-700 text-emerald-300' 
                      : 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Clear Fault on {selectedMachine?.code}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 12-Machine Directory & Envelopes Table */}
      <div className={`p-5 rounded-2xl border transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <div>
            <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Monitored Machinery Fleet Directory (12 Units)
            </h3>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Engineering physical baselines, safety trip limits, and real-time operational status
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className={`border-b ${
                isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <th className="py-2.5 px-3">Unit Code</th>
                <th className="py-2.5 px-3">Machine Name</th>
                <th className="py-2.5 px-3">Bay / Line</th>
                <th className="py-2.5 px-3">Nominal Temp</th>
                <th className="py-2.5 px-3">Nominal Vib</th>
                <th className="py-2.5 px-3">Nominal Press</th>
                <th className="py-2.5 px-3">Health</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {machines.map((m) => {
                const r = latestReadings.get(m.id);
                const health = r?.healthScore || 100;
                const isStoppage = r?.isStoppage;

                return (
                  <tr 
                    key={m.id} 
                    className={`transition-colors ${
                      isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-cyan-500">{m.code}</td>
                    <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {m.name}
                    </td>
                    <td className={`py-2.5 px-3 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {m.bay}
                    </td>
                    <td className="py-2.5 px-3">{m.baseline.tempNominal}°C <span className="text-[10px] text-slate-400">(Trip {m.baseline.tempCritical}°)</span></td>
                    <td className="py-2.5 px-3">{m.baseline.vibNominal} mm/s <span className="text-[10px] text-slate-400">(Trip {m.baseline.vibCritical})</span></td>
                    <td className="py-2.5 px-3">{m.baseline.pressureNominal} bar</td>
                    <td className="py-2.5 px-3 font-bold">
                      <span className={health < 50 ? 'text-rose-500' : health < 75 ? 'text-amber-500' : 'text-emerald-500'}>
                        {health}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {isStoppage ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-900 text-rose-100">
                          STOPPED
                        </span>
                      ) : m.status === 'CRITICAL' ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                          CRITICAL
                        </span>
                      ) : m.status === 'WARNING' ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          WARNING
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-500">NORMAL</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onInspectMachine(m.id)}
                        className={`text-xs px-2 py-1 rounded transition-colors font-bold cursor-pointer ${
                          isDark 
                            ? 'text-cyan-400 hover:text-cyan-300 bg-slate-800 hover:bg-slate-700' 
                            : 'text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200'
                        }`}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
