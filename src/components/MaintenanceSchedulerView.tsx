/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MaintenanceWorkOrder, Machine, SensorReading } from '../types/industrial';
import { 
  Calendar, 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  DollarSign, 
  Package, 
  Plus, 
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { generateSchedulingSuggestion } from '../services/costEvaluation';

interface MaintenanceSchedulerViewProps {
  workOrders: MaintenanceWorkOrder[];
  machines: Machine[];
  latestReadings: Map<string, SensorReading>;
  alertThreshold: number;
  onUpdateStatus: (orderId: string, status: MaintenanceWorkOrder['status']) => void;
  onAddWorkOrder: (order: MaintenanceWorkOrder) => void;
}

export const MaintenanceSchedulerView: React.FC<MaintenanceSchedulerViewProps> = ({
  workOrders,
  machines,
  latestReadings,
  alertThreshold,
  onUpdateStatus,
  onAddWorkOrder,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState(machines[0]?.id || '');
  const [technicianName, setTechnicianName] = useState('Alex Rivers (Lead Millwright)');

  // Identify machines that need maintenance scheduling right now (risk >= threshold or RUL <= 24h)
  const machinesAtRisk = machines.filter((m) => {
    const r = latestReadings.get(m.id);
    return r && (r.isAlertTriggered || r.estimatedRulHours <= 36 || m.status !== 'NORMAL');
  });

  const filteredOrders = workOrders.filter((wo) => {
    if (filterStatus === 'ALL') return true;
    return wo.status === filterStatus;
  });

  const handleCreateAutoOrder = (machine: Machine) => {
    const reading = latestReadings.get(machine.id);
    const risk = reading?.failureRisk || 0.45;
    const rul = reading?.estimatedRulHours || 16;
    const rootCause = reading?.dominantFailureCause || 'Bearing / Mechanical Fatigue';

    const suggestion = generateSchedulingSuggestion(
      machine.name,
      risk,
      rul,
      rootCause,
      alertThreshold
    );

    const newOrder: MaintenanceWorkOrder = {
      id: `WO-${Math.floor(Math.random() * 8999 + 1000)}`,
      machineId: machine.id,
      machineName: machine.name,
      title: `${machine.code}: ${suggestion.urgency} Maintenance (${rootCause})`,
      priority: suggestion.urgency,
      recommendedShift: suggestion.recommendedShift,
      assignedTechnician: suggestion.technicianRole,
      estimatedHours: suggestion.urgency === 'EMERGENCY' ? 2.5 : 4.0,
      partsRequired: suggestion.parts,
      estimatedCost: suggestion.urgency === 'EMERGENCY' ? 1850 : 1200,
      status: 'PENDING',
      createdAt: Date.now(),
      diagnosisSummary: suggestion.recommendedAction,
      targetCompletionWindow: suggestion.targetWindow,
    };

    onAddWorkOrder(newOrder);
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Banner: Shift Schedules & Smart Allocation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              Factory Shift-Aware Maintenance Scheduler
            </h3>
          </div>
          <p className="text-slate-400 text-xs font-sans mt-1">
            Automates repair dispatch by cross-referencing Remaining Useful Life (RUL) with line changeovers to prevent unplanned downtime.
          </p>
        </div>

        {/* Shift Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-[11px]">
            <span className="text-slate-500 mr-1.5">Current:</span>
            <span className="text-emerald-400 font-bold">Shift 1 (Day Production)</span>
          </div>
          <div className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-[11px]">
            <span className="text-slate-500 mr-1.5">Changeover Window:</span>
            <span className="text-cyan-400 font-bold">14:00 - 15:00 (Buffer Slot)</span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Work Order</span>
          </button>
        </div>
      </div>

      {/* Recommended Actions for At-Risk Machinery */}
      {machinesAtRisk.length > 0 && (
        <div className="bg-rose-950/20 border border-rose-900/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-rose-400 font-bold flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              Units Requiring Immediate Maintenance Intervention ({machinesAtRisk.length})
            </span>
            <span className="text-[10px] text-slate-400">
              Evaluated against threshold τ = {(alertThreshold * 100).toFixed(0)}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {machinesAtRisk.map((m) => {
              const r = latestReadings.get(m.id);
              const hasExistingOrder = workOrders.some(
                wo => wo.machineId === m.id && wo.status !== 'COMPLETED'
              );

              return (
                <div key={m.id} className="bg-slate-950/90 border border-rose-800/60 p-3 rounded-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{m.name}</span>
                      <span className="text-[10px] bg-rose-900/80 text-rose-200 px-1.5 py-0.2 rounded font-mono">
                        RUL: {r?.estimatedRulHours.toFixed(1)}h
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-1 line-clamp-2">
                      Fault: {m.faultMode !== 'none' ? m.faultMode.replace('_', ' ') : 'Vibration Exceedance'} • Bay: {m.bay}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    {hasExistingOrder ? (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Order Dispatched
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCreateAutoOrder(m)}
                        className="w-full bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-bold text-[11px] py-1 px-2 rounded transition-colors flex items-center justify-center gap-1"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Schedule Preventative Overhaul</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Work Orders Board */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
        {/* Filters */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase text-[11px]">Filter Orders:</span>
            {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === st
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <span className="text-slate-400 text-xs">
            {filteredOrders.length} Work Order{filteredOrders.length !== 1 ? 's' : ''} Listed
          </span>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
            No work orders matching current filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((wo) => {
              return (
                <div
                  key={wo.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                >
                  {/* Left: Info & Diagnosis */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-cyan-400 text-xs">{wo.id}</span>
                      <span className="font-semibold text-white text-xs">{wo.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        wo.priority === 'EMERGENCY' ? 'bg-rose-950 text-rose-300 border border-rose-700' :
                        wo.priority === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {wo.priority}
                      </span>
                      <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                        {wo.recommendedShift.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                      {wo.diagnosisSummary}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-cyan-400" />
                        Tech: {wo.assignedTechnician}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        Window: {wo.targetCompletionWindow} ({wo.estimatedHours}h est.)
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        Est. Cost: ${wo.estimatedCost}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-purple-400" />
                        Parts: {wo.partsRequired.join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Status Workflow Controls */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {wo.status === 'PENDING' && (
                      <button
                        onClick={() => onUpdateStatus(wo.id, 'IN_PROGRESS')}
                        className="bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                      >
                        Start Maintenance
                      </button>
                    )}

                    {wo.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => onUpdateStatus(wo.id, 'COMPLETED')}
                        className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Complete & Restore Machine</span>
                      </button>
                    )}

                    {wo.status === 'COMPLETED' && (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Completed & Restored
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Work Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="font-bold text-white text-sm">Schedule Machine Work Order</h4>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Target Machine:</label>
                <select
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 text-xs"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code}: {m.name} ({m.bay})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Assigned Specialist:</label>
                <input
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const targetM = machines.find(m => m.id === selectedMachineId) || machines[0];
                  handleCreateAutoOrder(targetM);
                  setShowCreateModal(false);
                }}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold"
              >
                Dispatch Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
