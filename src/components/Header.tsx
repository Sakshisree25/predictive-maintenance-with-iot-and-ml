/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Play, 
  Pause, 
  Database, 
  Download, 
  Flame, 
  Settings2, 
  Layers, 
  Cpu, 
  Sun, 
  Moon,
  Sparkles,
  Info
} from 'lucide-react';
import { DATASET_PRESETS, PublicDatasetPreset } from '../services/dataSimulator';
import { MachineAlert } from '../types/industrial';
import { useTheme } from '../context/ThemeContext';

export type AppTab = 'fleet' | 'diagnostics' | 'cost_optimizer' | 'telemetry_store' | 'simulation';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  streamSpeed: number;
  onChangeSpeed: (speed: number) => void;
  activePreset: PublicDatasetPreset['id'];
  onSelectPreset: (presetId: PublicDatasetPreset['id']) => void;
  alerts: MachineAlert[];
  alertThreshold: number;
  onOpenQuickFaultModal: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  unplannedStoppagesPrevented: number;
  avgFleetHealth: number;
  onOpenAlertDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  isStreaming,
  onToggleStreaming,
  streamSpeed,
  onChangeSpeed,
  activePreset,
  onSelectPreset,
  alerts,
  alertThreshold,
  onOpenQuickFaultModal,
  onExportCsv,
  onExportJson,
  unplannedStoppagesPrevented,
  avgFleetHealth,
  onOpenAlertDrawer,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <header className={`sticky top-0 z-30 backdrop-blur transition-colors duration-200 border-b ${
      isDark ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-sm'
    }`}>
      {/* Top Banner: Branding + Live Stream Controls + Theme Switcher */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-900/30 border border-cyan-400/40">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-display font-bold text-lg tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                VIGILANT<span className="text-cyan-500">EDGE</span>
              </span>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                isDark ? 'bg-cyan-950/80 border border-cyan-800 text-cyan-300' : 'bg-cyan-50 border border-cyan-200 text-cyan-700'
              }`}>
                Early Warning Platform
              </span>
            </div>
            <p className={`text-xs hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Industrial Failure Prevention • 10+ Machinery Cells • Cost-Optimal Thresholds
            </p>
          </div>
        </div>

        {/* Real-time Controls & Theme Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stream Play/Pause & Speed */}
          <div className={`flex items-center border rounded-lg p-1 font-mono text-xs ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={onToggleStreaming}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                isStreaming 
                  ? isDark 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                  : isDark 
                    ? 'bg-amber-950 text-amber-300 border border-amber-700/60' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
              }`}
              title={isStreaming ? 'Pause sensor stream simulation' : 'Resume real-time sensor stream'}
            >
              {isStreaming ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <Pause className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Streaming</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Paused</span>
                </>
              )}
            </button>

            {/* Speed multipliers */}
            <div className={`flex items-center ml-1 border-l pl-1 text-[11px] ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-500'
            }`}>
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onChangeSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                    streamSpeed === spd 
                      ? isDark 
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold' 
                        : 'bg-cyan-100 text-cyan-800 font-bold'
                      : 'hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Dataset Preset Selector */}
          <div className="relative">
            <select
              value={activePreset}
              onChange={(e) => onSelectPreset(e.target.value as any)}
              className={`border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-slate-200' 
                  : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              {DATASET_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  Dataset: {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fault Injector Action */}
          <button
            onClick={onOpenQuickFaultModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors shadow-sm cursor-pointer border ${
              isDark 
                ? 'bg-rose-950/80 hover:bg-rose-900 border-rose-800 text-rose-300' 
                : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-700'
            }`}
            title="Inject Bearing Fatigue, Thermal Runaway, or Cavitation"
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Inject Fault</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`flex items-center gap-1.5 border px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Export</span>
            </button>
            {showExportMenu && (
              <div 
                className={`absolute right-0 mt-1 w-44 border rounded-lg shadow-xl py-1 z-50 text-xs font-mono ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-800'
                }`}
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  onClick={() => { onExportCsv(); setShowExportMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span>Time Series CSV</span>
                  <span className="text-[10px] text-slate-500">.csv</span>
                </button>
                <button
                  onClick={() => { onExportJson(); setShowExportMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span>Fleet Telemetry JSON</span>
                  <span className="text-[10px] text-slate-500">.json</span>
                </button>
              </div>
            )}
          </div>

          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800' 
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-xs'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline font-semibold">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden md:inline font-semibold">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Ticker Bar */}
      <div className={`border-t px-4 py-1.5 font-mono text-xs transition-colors ${
        isDark ? 'bg-slate-900/60 border-slate-900 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5">
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Fleet Health:</span>
              <span className={`font-bold ${
                avgFleetHealth >= 80 
                  ? 'text-emerald-500 font-extrabold' 
                  : avgFleetHealth >= 60 
                  ? 'text-amber-500 font-bold' 
                  : 'text-rose-500 font-bold'
              }`}>
                {avgFleetHealth.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Stoppages Prevented:</span>
              <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                {unplannedStoppagesPrevented} events
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Alert Threshold:</span>
              <span className="text-amber-500 font-bold">τ = {(alertThreshold * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAlertDrawer}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer border ${
                unacknowledgedCount > 0
                  ? isDark 
                    ? 'text-rose-300 bg-rose-950/80 hover:bg-rose-900 border-rose-800 animate-pulse font-bold' 
                    : 'text-rose-800 bg-rose-100 hover:bg-rose-200 border-rose-300 animate-pulse font-bold'
                  : isDark 
                    ? 'text-slate-300 bg-slate-900 hover:bg-slate-800 border-slate-800' 
                    : 'text-slate-700 bg-white hover:bg-slate-100 border-slate-200'
              }`}
              title="Open active warning alarms feed"
            >
              <AlertTriangle className={`w-3 h-3 ${unacknowledgedCount > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
              <span>
                {unacknowledgedCount > 0
                  ? `${unacknowledgedCount} Active Pre-Failure Warning${unacknowledgedCount > 1 ? 's' : ''}`
                  : 'Active Alarms (0)'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs — Mapped directly to the 5 Core User Requirements */}
      <div className={`max-w-7xl mx-auto px-4 flex overflow-x-auto no-scrollbar border-t ${
        isDark ? 'border-slate-800/80' : 'border-slate-200'
      }`}>
        <nav className="flex space-x-1 sm:space-x-2 py-1.5 font-sans">
          {/* Feature 4: Dashboard with health score per machine & alerts */}
          <button
            onClick={() => onSelectTab('fleet')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'fleet'
                ? isDark 
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-xs' 
                  : 'bg-cyan-50 text-cyan-700 border border-cyan-300 shadow-xs font-semibold'
                : isDark 
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-500" />
            <span>Dashboard & Health Scores</span>
          </button>

          {/* Feature 3: Model / rule detector for failure risk & remaining life */}
          <button
            onClick={() => onSelectTab('diagnostics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'diagnostics'
                ? isDark 
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-xs' 
                  : 'bg-cyan-50 text-cyan-700 border border-cyan-300 shadow-xs font-semibold'
                : isDark 
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-500" />
            <span>Risk & RUL Detector</span>
          </button>

          {/* Feature 5: Evaluate false alarms against missed failures & state alert threshold */}
          <button
            onClick={() => onSelectTab('cost_optimizer')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'cost_optimizer'
                ? isDark 
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs' 
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs font-semibold'
                : isDark 
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings2 className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">Evaluate False Alarms & Threshold</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
              isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              τ* = {(alertThreshold * 100).toFixed(0)}%
            </span>
          </button>

          {/* Feature 2: Ingest and store time series data */}
          <button
            onClick={() => onSelectTab('telemetry_store')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'telemetry_store'
                ? isDark 
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-xs' 
                  : 'bg-cyan-50 text-cyan-700 border border-cyan-300 shadow-xs font-semibold'
                : isDark 
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4 text-cyan-500" />
            <span>Time-Series Ingestion & Store</span>
          </button>

          {/* Feature 1: Simulate or use public sensor dataset (at least 10 machines) */}
          <button
            onClick={() => onSelectTab('simulation')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'simulation'
                ? isDark 
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-xs' 
                  : 'bg-cyan-50 text-cyan-700 border border-cyan-300 shadow-xs font-semibold'
                : isDark 
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-500" />
            <span>10+ Machine Simulator & Datasets</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
