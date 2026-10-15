/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Machine, SensorReading } from '../types/industrial';
import { useTheme } from '../context/ThemeContext';
import { 
  Database, 
  Download, 
  Search, 
  Filter, 
  HardDrive, 
  Cpu, 
  Clock, 
  ShieldAlert, 
  FileSpreadsheet,
  CheckCircle,
  FileCode,
  Layers
} from 'lucide-react';

interface DataIngestionViewProps {
  machines: Machine[];
  historyMap: Map<string, SensorReading[]>;
  onExportCsv: () => void;
  onExportJson: () => void;
  streamSpeed: number;
}

export const DataIngestionView: React.FC<DataIngestionViewProps> = ({
  machines,
  historyMap,
  onExportCsv,
  onExportJson,
  streamSpeed,
}) => {
  const { isDark } = useTheme();
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('ALL');
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Flatten and filter telemetry records
  const allReadings: (SensorReading & { machineName: string; machineCode: string })[] = [];

  for (const m of machines) {
    if (selectedMachineFilter !== 'ALL' && m.id !== selectedMachineFilter) continue;
    const list = historyMap.get(m.id) || [];
    for (const r of list) {
      if (anomalyOnly && !r.isAlertTriggered && !r.isStoppage) continue;
      allReadings.push({
        ...r,
        machineName: m.name,
        machineCode: m.code,
      });
    }
  }

  // Sort descending by timestamp
  allReadings.sort((a, b) => b.timestamp - a.timestamp);

  const totalPages = Math.max(1, Math.ceil(allReadings.length / pageSize));
  const displayedReadings = allReadings.slice((page - 1) * pageSize, page * pageSize);

  const totalPointsInMemory = Array.from(historyMap.values()).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Banner: Pipeline & Buffer Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Buffer Ingestion Rate</span>
            <Cpu className="w-4 h-4 text-cyan-500" />
          </div>
          <div className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {(6 * streamSpeed).toFixed(1)} samples/s
          </div>
          <span className={`text-[10px] mt-0.5 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            12 Concurrent Sensor Channels
          </span>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>In-Memory Storage</span>
            <HardDrive className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {totalPointsInMemory.toLocaleString()} records
          </div>
          <span className={`text-[10px] mt-0.5 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Circular Ring Buffer (500 pts/machine)
          </span>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Telemetry Schema</span>
            <Database className="w-4 h-4 text-purple-500" />
          </div>
          <div className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            7 Signals / Tick
          </div>
          <span className={`text-[10px] mt-0.5 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Temp, Vib, Press, RPM, kW, K, Crest
          </span>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors flex flex-col justify-between ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Historical Export</span>
            <Download className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={onExportCsv}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-bold text-[11px] border cursor-pointer ${
                isDark 
                  ? 'bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border-cyan-800' 
                  : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={onExportJson}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-bold text-[11px] border cursor-pointer ${
                isDark 
                  ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Filter & Table */}
      <div className={`p-5 rounded-2xl border transition-colors space-y-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b pb-3 ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Filter Unit:
              </span>
              <select
                value={selectedMachineFilter}
                onChange={(e) => { setSelectedMachineFilter(e.target.value); setPage(1); }}
                className={`border rounded-lg px-2.5 py-1 text-xs cursor-pointer ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="ALL">All 12 Machines</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                ))}
              </select>
            </div>

            <label className={`flex items-center gap-1.5 cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <input
                type="checkbox"
                checked={anomalyOnly}
                onChange={(e) => { setAnomalyOnly(e.target.checked); setPage(1); }}
                className="accent-rose-500 rounded"
              />
              <span className="text-xs">Show High-Risk / Alert Records Only</span>
            </label>
          </div>

          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Showing <strong className={isDark ? 'text-white' : 'text-slate-900'}>{displayedReadings.length}</strong> of {allReadings.length} records
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className={`border-b ${
                isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <th className="py-2.5 px-3">Timestamp (ISO)</th>
                <th className="py-2.5 px-3">Machine</th>
                <th className="py-2.5 px-3">Temp (°C)</th>
                <th className="py-2.5 px-3">Vib (mm/s RMS)</th>
                <th className="py-2.5 px-3">Pressure (bar)</th>
                <th className="py-2.5 px-3">Kurtosis</th>
                <th className="py-2.5 px-3">Crest Factor</th>
                <th className="py-2.5 px-3">Failure Risk</th>
                <th className="py-2.5 px-3">Health</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {displayedReadings.map((r, idx) => {
                const dateStr = new Date(r.timestamp).toLocaleTimeString();
                const isWarn = r.isAlertTriggered;

                return (
                  <tr
                    key={`${r.machineId}-${r.timestamp}-${idx}`}
                    className={`transition-colors ${
                      r.isStoppage 
                        ? 'bg-rose-500/10 text-rose-500 font-bold' 
                        : isWarn 
                        ? 'bg-amber-500/10 text-amber-500' 
                        : isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className={`py-2 px-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{dateStr}</td>
                    <td className="py-2 px-3 font-bold text-cyan-500">
                      {r.machineCode}
                    </td>
                    <td className="py-2 px-3">{r.temperature.toFixed(1)}</td>
                    <td className="py-2 px-3">
                      <span>{r.vibration.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({r.isoZone})</span>
                    </td>
                    <td className="py-2 px-3">{r.pressure.toFixed(1)}</td>
                    <td className="py-2 px-3">{r.kurtosis.toFixed(2)}</td>
                    <td className="py-2 px-3">{r.crestFactor.toFixed(2)}</td>
                    <td className="py-2 px-3 font-bold">
                      <span className={
                        r.failureRisk >= 0.7 ? 'text-rose-500' : 
                        r.failureRisk >= 0.35 ? 'text-amber-500' : 
                        'text-emerald-500'
                      }>
                        {(r.failureRisk * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold">{r.healthScore}%</td>
                    <td className="py-2 px-3">
                      {r.isStoppage ? (
                        <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold">
                          STOPPAGE
                        </span>
                      ) : r.isAlertTriggered ? (
                        <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-bold">
                          ALERT
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-500">NORMAL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={`flex items-center justify-between pt-3 border-t text-xs ${
          isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
        }`}>
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`px-2.5 py-1 rounded border disabled:opacity-40 cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={`px-2.5 py-1 rounded border disabled:opacity-40 cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
