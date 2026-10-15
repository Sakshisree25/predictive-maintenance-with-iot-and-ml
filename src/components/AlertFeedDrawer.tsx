/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MachineAlert } from '../types/industrial';
import { useTheme } from '../context/ThemeContext';
import { AlertTriangle, ShieldAlert, CheckCircle, Clock, Wrench, X, Activity } from 'lucide-react';

interface AlertFeedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: MachineAlert[];
  onAcknowledge: (alertId: string) => void;
  onInspectMachine: (machineId: string) => void;
  onScheduleMaintenance: (machineId: string) => void;
}

export const AlertFeedDrawer: React.FC<AlertFeedDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onAcknowledge,
  onInspectMachine,
  onScheduleMaintenance,
}) => {
  const { isDark } = useTheme();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs font-mono text-xs">
      <div className={`w-full max-w-md h-full flex flex-col justify-between shadow-2xl p-5 border-l transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Active Failure Warning Feed
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {alerts.length} Total Telemetry Alarms
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`p-1 rounded-lg cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {alerts.length === 0 ? (
            <div className={`py-20 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
              <p>No active failure alerts recorded.</p>
              <p className="text-[10px] mt-1">All 12 machines reporting in normal envelope.</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const timeStr = new Date(alert.timestamp).toLocaleTimeString();
              const isCrit = alert.severity === 'CRITICAL';

              return (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    alert.acknowledged
                      ? isDark ? 'bg-slate-950/60 border-slate-800 opacity-70' : 'bg-slate-50 border-slate-200 opacity-70'
                      : isCrit
                      ? isDark ? 'bg-rose-950/40 border-rose-800 text-rose-100 shadow-sm' : 'bg-rose-50 border-rose-200 text-rose-900 shadow-sm'
                      : isDark ? 'bg-amber-950/40 border-amber-800 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isCrit 
                        ? 'bg-rose-600 text-white' 
                        : 'bg-amber-500 text-slate-950'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{timeStr}</span>
                  </div>

                  <div className={`font-bold text-xs mt-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {alert.machineName}
                  </div>

                  <p className={`text-[11px] font-sans mt-0.5 leading-snug ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <strong className="font-mono">{alert.rootCause}</strong> — Risk reached {alert.currentValue}% (Threshold: {alert.threshold}%).
                  </p>

                  {alert.stoppagePredictedInHours && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-300">
                      <Clock className="w-3 h-3" />
                      <span>Predicted Stoppage within: {alert.stoppagePredictedInHours}h</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className={`flex items-center justify-between gap-2 mt-2.5 pt-2 border-t ${
                    isDark ? 'border-slate-800/80' : 'border-slate-200'
                  }`}>
                    <button
                      onClick={() => {
                        onInspectMachine(alert.machineId);
                        onClose();
                      }}
                      className="text-cyan-500 hover:text-cyan-600 flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      <Activity className="w-3 h-3" />
                      <span>Inspect Telemetry</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {!alert.acknowledged && (
                        <button
                          onClick={() => onAcknowledge(alert.id)}
                          className={`px-2 py-1 rounded text-[10px] border cursor-pointer ${
                            isDark 
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                        >
                          Ack
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onScheduleMaintenance(alert.machineId);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Work Order</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`pt-3 border-t flex justify-end ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <button
            onClick={onClose}
            className={`w-full py-2 rounded-xl font-bold cursor-pointer border ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            Close Feed
          </button>
        </div>
      </div>
    </div>
  );
};
