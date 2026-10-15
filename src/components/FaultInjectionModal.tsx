/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Machine, FaultMode } from '../types/industrial';
import { useTheme } from '../context/ThemeContext';
import { Flame, AlertTriangle, RotateCcw, Zap, Waves, Thermometer, Gauge, X } from 'lucide-react';

interface FaultInjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  initialMachineId?: string;
  onInject: (machineId: string, faultMode: FaultMode, intensity: number) => void;
  onResolveAll: () => void;
}

export const FaultInjectionModal: React.FC<FaultInjectionModalProps> = ({
  isOpen,
  onClose,
  machines,
  initialMachineId,
  onInject,
  onResolveAll,
}) => {
  const { isDark } = useTheme();
  const [selectedMachineId, setSelectedMachineId] = useState<string>(initialMachineId || machines[0]?.id || '');
  const [faultMode, setFaultMode] = useState<FaultMode>('bearing_wear');
  const [intensity, setIntensity] = useState<number>(0.8);

  if (!isOpen) return null;

  const currentMachine = machines.find(m => m.id === selectedMachineId) || machines[0];

  const handleQuickPreset = (mCode: string, mode: FaultMode, intens: number) => {
    const m = machines.find(item => item.code.startsWith(mCode));
    if (m) {
      onInject(m.id, mode, intens);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-mono text-xs">
      <div className={`border rounded-2xl p-5 max-w-xl w-full space-y-4 shadow-2xl relative transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? 'bg-rose-950 border border-rose-800 text-rose-400' : 'bg-rose-100 text-rose-600 border border-rose-200'
            }`}>
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Industrial Fault Injection Sandbox
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Stress-test early warning algorithms and cost-optimal thresholds
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`p-1 rounded-lg cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick 1-Click Scenario Buttons */}
        <div>
          <label className={`block mb-1.5 uppercase text-[10px] tracking-wider ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Quick Failure Scenarios:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickPreset('CNC', 'bearing_wear', 0.85)}
              className={`p-2.5 rounded-xl text-left transition-colors border cursor-pointer ${
                isDark 
                  ? 'bg-slate-950 hover:bg-rose-950/60 border-slate-800 hover:border-rose-700/80' 
                  : 'bg-slate-50 hover:bg-rose-50 border-slate-200 hover:border-rose-300'
              }`}
            >
              <div className={`flex items-center gap-1.5 font-bold text-[11px] ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                <Waves className="w-3.5 h-3.5 text-cyan-500" />
                <span>CNC Mill 01: Spindle Bearing Seizure</span>
              </div>
              <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Vibration + Kurtosis 5.8 spike (ISO Zone D)
              </span>
            </button>

            <button
              onClick={() => handleQuickPreset('HPR', 'seal_leak', 0.80)}
              className={`p-2.5 rounded-xl text-left transition-colors border cursor-pointer ${
                isDark 
                  ? 'bg-slate-950 hover:bg-rose-950/60 border-slate-800 hover:border-rose-700/80' 
                  : 'bg-slate-50 hover:bg-rose-50 border-slate-200 hover:border-rose-300'
              }`}
            >
              <div className={`flex items-center gap-1.5 font-bold text-[11px] ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                <Gauge className="w-3.5 h-3.5 text-purple-500" />
                <span>Press 02: Hydraulic Seal Rupture</span>
              </div>
              <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Line pressure collapse from 285 to 195 bar
              </span>
            </button>

            <button
              onClick={() => handleQuickPreset('CSP', 'cavitation', 0.90)}
              className={`p-2.5 rounded-xl text-left transition-colors border cursor-pointer ${
                isDark 
                  ? 'bg-slate-950 hover:bg-rose-950/60 border-slate-800 hover:border-rose-700/80' 
                  : 'bg-slate-50 hover:bg-rose-50 border-slate-200 hover:border-rose-300'
              }`}
            >
              <div className={`flex items-center gap-1.5 font-bold text-[11px] ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Pump 03: Fluid Cavitation</span>
              </div>
              <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Violent pressure oscillations & impeller wear
              </span>
            </button>

            <button
              onClick={() => handleQuickPreset('RSC', 'thermal_runaway', 0.85)}
              className={`p-2.5 rounded-xl text-left transition-colors border cursor-pointer ${
                isDark 
                  ? 'bg-slate-950 hover:bg-rose-950/60 border-slate-800 hover:border-rose-700/80' 
                  : 'bg-slate-50 hover:bg-rose-50 border-slate-200 hover:border-rose-300'
              }`}
            >
              <div className={`flex items-center gap-1.5 font-bold text-[11px] ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                <span>Compressor 04: Thermal Runaway</span>
              </div>
              <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Cooler fan loss, temperature climbs &gt;104°C
              </span>
            </button>
          </div>
        </div>

        {/* Custom Injection Form */}
        <div className={`p-3.5 rounded-xl border space-y-3 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={`font-bold text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Custom Fault Injection:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Target Machine:</label>
              <select
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                className={`w-full rounded-lg p-2 border cursor-pointer ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Fault Mechanism:</label>
              <select
                value={faultMode}
                onChange={(e) => setFaultMode(e.target.value as FaultMode)}
                className={`w-full rounded-lg p-2 border cursor-pointer ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="bearing_wear">Bearing Wear (High Vib + Kurtosis)</option>
                <option value="thermal_runaway">Thermal Runaway (Coolant Loss)</option>
                <option value="seal_leak">Seal Leak (Hydraulic Pressure Drop)</option>
                <option value="cavitation">Fluid Cavitation (Shock Pulses)</option>
                <option value="overstrain">Tooling Overstrain (Excessive Torque)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Fault Severity:</span>
              <span className="text-rose-500 font-bold">{(intensity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="1.0"
              step="0.05"
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          <button
            onClick={() => {
              onInject(selectedMachineId, faultMode, intensity);
              onClose();
            }}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            <Flame className="w-4 h-4" />
            <span>Apply Fault Injection</span>
          </button>
        </div>

        {/* Global Reset Action */}
        <div className={`flex items-center justify-between pt-2 border-t ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <button
            onClick={() => {
              onResolveAll();
              onClose();
            }}
            className="text-emerald-500 hover:text-emerald-600 flex items-center gap-1 font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Entire Fleet to Nominal</span>
          </button>

          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg border cursor-pointer ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
