/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Machine, 
  SensorReading, 
  FaultMode 
} from '../types/industrial';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Clock, 
  Gauge, 
  Thermometer, 
  Waves, 
  Wrench,
  Search,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Info
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface FleetOverviewProps {
  machines: Machine[];
  latestReadings: Map<string, SensorReading>;
  historyMap: Map<string, SensorReading[]>;
  alertThreshold: number;
  onSelectMachine: (machineId: string) => void;
  onInjectFaultModal: (machineId: string) => void;
  onResolveFault: (machineId: string) => void;
  onScheduleMaintenance: (machineId: string) => void;
}

export const FleetOverview: React.FC<FleetOverviewProps> = ({
  machines,
  latestReadings,
  historyMap,
  alertThreshold,
  onSelectMachine,
  onInjectFaultModal,
  onResolveFault,
  onScheduleMaintenance,
}) => {
  const { isDark } = useTheme();
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NORMAL' | 'WARNING' | 'CRITICAL' | 'STOPPED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickHelp, setShowQuickHelp] = useState(false);

  const filteredMachines = machines.filter((m) => {
    const reading = latestReadings.get(m.id);
    const status = reading?.isStoppage ? 'STOPPED' : m.status;

    if (filterStatus !== 'ALL' && status !== filterStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.bay.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Friendly Guide Banner */}
      <div className={`p-4 rounded-xl border transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isDark ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-cyan-100 text-cyan-700 border border-cyan-200'
            }`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Factory Pre-Failure Early Warning Dashboard
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Continuous telemetry monitoring across 12 industrial machinery cells • Alerts fire when failure risk $\ge$ {(alertThreshold * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickHelp(!showQuickHelp)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors border cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showQuickHelp ? 'Hide Guide' : 'Platform Guide'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Platform Guide */}
        {showQuickHelp && (
          <div className={`mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-sans ${
            isDark ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-600'
          }`}>
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
              <strong className="block text-cyan-500 mb-1">1. Health Score (0-100%)</strong>
              Calculated by combining temperature stress, ISO 10816 vibration velocity, and bearing kurtosis impact shocks.
            </div>
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
              <strong className="block text-amber-500 mb-1">2. Predicted RUL Countdown</strong>
              Estimates operational hours remaining before critical stoppage so repairs can be scheduled without unplanned downtime.
            </div>
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
              <strong className="block text-emerald-500 mb-1">3. Cost-Optimal Alert Threshold</strong>
              Set to τ* = {(alertThreshold * 100).toFixed(0)}% to minimize factory loss from expensive missed failures ($14,500) vs false checks ($450).
            </div>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl border font-mono text-xs transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`mr-2 text-[11px] uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Status:
          </span>
          {(['ALL', 'NORMAL', 'WARNING', 'CRITICAL', 'STOPPED'] as const).map((st) => {
            const count = st === 'ALL' 
              ? machines.length 
              : machines.filter(m => {
                  const r = latestReadings.get(m.id);
                  const effectiveStatus = r?.isStoppage ? 'STOPPED' : m.status;
                  return effectiveStatus === st;
                }).length;

            return (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  filterStatus === st
                    ? st === 'CRITICAL' || st === 'STOPPED'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700 font-bold'
                      : st === 'WARNING'
                      ? 'bg-amber-950 text-amber-300 border border-amber-700 font-bold'
                      : isDark
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold'
                      : 'bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold'
                    : isDark 
                    ? 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bay, code, machine..."
            className={`w-full rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500 font-sans border ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500' 
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>
      </div>

      {/* 12-Machine Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMachines.map((machine) => {
          const reading = latestReadings.get(machine.id);
          const history = historyMap.get(machine.id) || [];
          const isStoppage = reading?.isStoppage;
          const health = reading ? reading.healthScore : 100;
          const risk = reading ? reading.failureRisk : 0.05;
          const rul = reading ? reading.estimatedRulHours : 1800;
          const iso = reading ? reading.isoZone : 'A';

          // Color tokens
          const healthColor = 
            isStoppage || health < 35 ? 'text-rose-500 stroke-rose-500' :
            health < 65 ? 'text-amber-500 stroke-amber-500' :
            'text-emerald-500 stroke-emerald-500';

          const cardBorder = 
            isStoppage 
              ? 'border-rose-600 bg-rose-950/20 shadow-lg shadow-rose-950/40' 
              : machine.status === 'CRITICAL' 
              ? 'border-rose-500/80 bg-rose-950/10' 
              : machine.status === 'WARNING' 
              ? 'border-amber-500/80 bg-amber-950/10' 
              : isDark 
              ? 'border-slate-800 hover:border-slate-700 bg-slate-900/60' 
              : 'border-slate-200 hover:border-slate-300 bg-white shadow-xs';

          return (
            <div
              key={machine.id}
              className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${cardBorder} relative overflow-hidden`}
            >
              {/* Stoppage Banner if machine stalled */}
              {isStoppage && (
                <div className="absolute top-0 left-0 right-0 bg-rose-600 text-white font-mono text-[10px] uppercase font-bold py-0.5 text-center tracking-wider animate-pulse flex items-center justify-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Unplanned Machine Stoppage Triggered
                </div>
              )}

              {/* Card Header: Code & Status */}
              <div className={`flex items-start justify-between gap-2 ${isStoppage ? 'mt-4' : ''}`}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                      isDark 
                        ? 'text-cyan-400 bg-cyan-950/80 border-cyan-800/60' 
                        : 'text-cyan-700 bg-cyan-50 border-cyan-200'
                    }`}>
                      {machine.code}
                    </span>
                    <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {machine.bay}
                    </span>
                  </div>
                  <h3 className={`font-semibold text-sm mt-1 line-clamp-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {machine.name}
                  </h3>
                  <p className={`text-[11px] line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {machine.type}
                  </p>
                </div>

                {/* Status Badge */}
                <div className="flex flex-col items-end">
                  {isStoppage ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-900/90 text-rose-200 border border-rose-500">
                      STOPPED
                    </span>
                  ) : machine.status === 'CRITICAL' ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                      CRITICAL
                    </span>
                  ) : machine.status === 'WARNING' ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                      WARNING
                    </span>
                  ) : (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
                      isDark 
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      NORMAL
                    </span>
                  )}
                </div>
              </div>

              {/* Center: Radial Health Gauge + RUL */}
              <div className={`my-3.5 flex items-center justify-between rounded-xl p-2.5 border ${
                isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                {/* SVG Radial Health Gauge */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background track */}
                    <path
                      className={isDark ? 'text-slate-800 stroke-current' : 'text-slate-200 stroke-current'}
                      strokeWidth="3.5"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Health arc */}
                    <path
                      className={`${healthColor} transition-all duration-500 ease-out`}
                      strokeWidth="3.5"
                      strokeDasharray={`${health}, 100`}
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className={`font-mono font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{health}%</span>
                    <span className={`text-[8px] uppercase tracking-wider font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Health</span>
                  </div>
                </div>

                {/* Remaining Useful Life (RUL) & Risk Indicator */}
                <div className="flex-1 ml-3 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Predicted RUL:</span>
                    <span className={`font-bold ${
                      rul <= 8 ? 'text-rose-500 font-extrabold' : rul <= 48 ? 'text-amber-500' : isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}>
                      {rul >= 100 ? `${rul} hrs` : `${rul.toFixed(1)} hrs`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Failure Risk:</span>
                    <span className={`font-bold ${
                      risk >= 0.7 ? 'text-rose-500' : risk >= alertThreshold ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {(risk * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ISO 10816:</span>
                    <span className={`font-bold px-1 rounded text-[10px] ${
                      iso === 'A' ? 'bg-emerald-950 text-emerald-400' :
                      iso === 'B' ? 'bg-blue-950 text-blue-400' :
                      iso === 'C' ? 'bg-amber-950 text-amber-300' :
                      'bg-rose-950 text-rose-300'
                    }`}>
                      Zone {iso}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sensor Tickers */}
              {reading ? (
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px] mb-3">
                  {/* Temp */}
                  <div className={`p-1.5 rounded-lg border ${
                    isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-1 text-slate-500 text-[9px]">
                      <Thermometer className="w-2.5 h-2.5 text-orange-500" />
                      <span>Temp</span>
                    </div>
                    <div className={`font-bold mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {reading.temperature.toFixed(1)}°C
                    </div>
                  </div>

                  {/* Vib */}
                  <div className={`p-1.5 rounded-lg border ${
                    isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-1 text-slate-500 text-[9px]">
                      <Waves className="w-2.5 h-2.5 text-cyan-500" />
                      <span>Vib (RMS)</span>
                    </div>
                    <div className={`font-bold mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {reading.vibration.toFixed(2)}
                    </div>
                  </div>

                  {/* Pressure */}
                  <div className={`p-1.5 rounded-lg border ${
                    isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-1 text-slate-500 text-[9px]">
                      <Gauge className="w-2.5 h-2.5 text-purple-500" />
                      <span>Press</span>
                    </div>
                    <div className={`font-bold mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {reading.pressure.toFixed(1)}b
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-2">Sensors initializing...</div>
              )}

              {/* Active Fault Banner if injected */}
              {machine.faultMode !== 'none' && (
                <div className={`mb-3 px-2 py-1 rounded font-mono text-[10px] flex items-center justify-between border ${
                  isDark ? 'bg-rose-950/50 border-rose-800/70 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <span className="flex items-center gap-1 truncate">
                    <Flame className="w-3 h-3 text-rose-500 shrink-0" />
                    <span>Fault: {machine.faultMode.replace('_', ' ')} ({(machine.faultIntensity * 100).toFixed(0)}%)</span>
                  </span>
                  <button
                    onClick={() => onResolveFault(machine.id)}
                    className="underline text-rose-500 hover:text-rose-600 shrink-0 ml-1 cursor-pointer font-bold"
                  >
                    Reset
                  </button>
                </div>
              )}

              {/* Actions Footer */}
              <div className={`flex items-center gap-2 pt-2 border-t text-xs font-mono ${
                isDark ? 'border-slate-800/80' : 'border-slate-100'
              }`}>
                <button
                  onClick={() => onSelectMachine(machine.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
                      : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-semibold'
                  }`}
                >
                  <span>Diagnose</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>

                <button
                  onClick={() => onInjectFaultModal(machine.id)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border-slate-800' 
                      : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200'
                  }`}
                  title="Inject physical fault mode"
                >
                  <Flame className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onScheduleMaintenance(machine.id)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-slate-950 hover:bg-emerald-950/60 text-slate-400 hover:text-emerald-300 border-slate-800' 
                      : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border-slate-200'
                  }`}
                  title="Schedule maintenance work order"
                >
                  <Wrench className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
