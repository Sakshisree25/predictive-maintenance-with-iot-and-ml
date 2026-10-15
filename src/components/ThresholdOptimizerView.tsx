/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CostModelConfig, 
  CostEvaluationResult, 
  MaintenanceWorkOrder, 
  Machine, 
  SensorReading 
} from '../types/industrial';
import { CostTradeoffChart } from './charts/CostTradeoffChart';
import { RocCurveChart } from './charts/RocCurveChart';
import { useTheme } from '../context/ThemeContext';
import { generateSchedulingSuggestion } from '../services/costEvaluation';
import { 
  DollarSign, 
  Settings2, 
  AlertTriangle, 
  TrendingDown, 
  ShieldAlert, 
  CheckCircle, 
  Sparkles, 
  ArrowRight, 
  Info, 
  Scale,
  Calendar,
  Wrench,
  Clock,
  Package,
  User,
  CheckCircle2
} from 'lucide-react';

interface ThresholdOptimizerViewProps {
  config: CostModelConfig;
  evaluationResult: CostEvaluationResult;
  onChangeConfig: (newConfig: CostModelConfig) => void;
  onApplyOptimalThreshold: () => void;
  workOrders?: MaintenanceWorkOrder[];
  machines?: Machine[];
  latestReadings?: Map<string, SensorReading>;
  onUpdateStatus?: (orderId: string, status: MaintenanceWorkOrder['status']) => void;
  onAddWorkOrder?: (order: MaintenanceWorkOrder) => void;
}

export const ThresholdOptimizerView: React.FC<ThresholdOptimizerViewProps> = ({
  config,
  evaluationResult,
  onChangeConfig,
  onApplyOptimalThreshold,
  workOrders = [],
  machines = [],
  latestReadings = new Map(),
  onUpdateStatus,
  onAddWorkOrder,
}) => {
  const { isDark } = useTheme();
  const { costFalsePositive, costFalseNegative, costTruePositive, alertThreshold } = config;
  const { optimalThreshold, currentMetrics, naiveReactiveCost, totalCostSavings, rationale } = evaluationResult;
  const cm = currentMetrics.confusionMatrix;

  const isAtOptimal = Math.abs(alertThreshold - optimalThreshold) < 0.02;

  // Identify machines that exceed the active alert threshold (or RUL <= 24h)
  const machinesExceedingThreshold = machines.filter((m) => {
    const r = latestReadings.get(m.id);
    return r && (r.failureRisk >= alertThreshold || r.estimatedRulHours <= 36 || m.status !== 'NORMAL');
  });

  const handleCreateAutoOrder = (machine: Machine) => {
    if (!onAddWorkOrder) return;
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
    <div className="space-y-6 font-mono">
      {/* Top Banner: Stated Alert Threshold & Financial Impact */}
      <div className={`p-5 rounded-2xl border transition-colors shadow-sm ${
        isDark 
          ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border-emerald-500/30' 
          : 'bg-gradient-to-r from-emerald-50 via-white to-cyan-50 border-emerald-200'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                isDark 
                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300' 
                  : 'bg-emerald-100 border-emerald-300 text-emerald-800'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Cost-Optimal Threshold Stated: τ* = {(optimalThreshold * 100).toFixed(0)}%
              </span>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                (Active User Threshold: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{(alertThreshold * 100).toFixed(0)}%</strong>)
              </span>
            </div>
            <h2 className={`text-xl font-display font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Feature #5: False Alarms vs. Missed Failures Cost Optimization
            </h2>
            <p className={`text-xs max-w-3xl leading-relaxed font-sans ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {rationale}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isAtOptimal && (
              <button
                onClick={onApplyOptimalThreshold}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Apply Cost-Optimal ({(optimalThreshold * 100).toFixed(0)}%)</span>
              </button>
            )}

            <div className={`px-4 py-2 rounded-xl border text-right ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className={`text-[10px] uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Estimated Net Savings
              </span>
              <span className="text-lg font-bold text-emerald-500">
                +${totalCostSavings.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Parameters on Left, Curves & Matrix on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Industrial Economic Parameters */}
        <div className={`p-5 rounded-2xl border transition-colors space-y-4 text-xs ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between border-b pb-2.5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-500" />
              <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Factory Cost Economics
              </h3>
            </div>
            <span className={`text-[10px] uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Cost Inputs</span>
          </div>

          {/* Slider 1: Cost of Missed Stoppage (FN) */}
          <div className={`space-y-1.5 p-3 rounded-xl border ${
            isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-rose-500 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Missed Failure (FN Cost):
              </span>
              <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ${costFalseNegative.toLocaleString()}
              </span>
            </div>
            <p className={`text-[10px] font-sans leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Emergency stoppage, line standstill, damaged tooling, scrap parts.
            </p>
            <input
              type="range"
              min="2000"
              max="40000"
              step="500"
              value={costFalseNegative}
              onChange={(e) => onChangeConfig({ ...config, costFalseNegative: Number(e.target.value) })}
              className="w-full accent-rose-500 mt-1 cursor-pointer"
            />
          </div>

          {/* Slider 2: Cost of False Alarm (FP) */}
          <div className={`space-y-1.5 p-3 rounded-xl border ${
            isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-amber-500 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                False Alarm (FP Cost):
              </span>
              <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ${costFalsePositive.toLocaleString()}
              </span>
            </div>
            <p className={`text-[10px] font-sans leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Technician dispatch & inspection of an actually healthy machine.
            </p>
            <input
              type="range"
              min="100"
              max="3000"
              step="50"
              value={costFalsePositive}
              onChange={(e) => onChangeConfig({ ...config, costFalsePositive: Number(e.target.value) })}
              className="w-full accent-amber-500 mt-1 cursor-pointer"
            />
          </div>

          {/* Slider 3: Cost of Planned Maintenance (TP) */}
          <div className={`space-y-1.5 p-3 rounded-xl border ${
            isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Planned Repair (TP Cost):
              </span>
              <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ${costTruePositive.toLocaleString()}
              </span>
            </div>
            <p className={`text-[10px] font-sans leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Scheduled inter-shift bearing/seal replacement before failure occurs.
            </p>
            <input
              type="range"
              min="400"
              max="6000"
              step="100"
              value={costTruePositive}
              onChange={(e) => onChangeConfig({ ...config, costTruePositive: Number(e.target.value) })}
              className="w-full accent-emerald-500 mt-1 cursor-pointer"
            />
          </div>

          {/* Active Alert Threshold Slider */}
          <div className={`space-y-2 p-3.5 rounded-xl border ${
            isDark ? 'bg-slate-950 border-cyan-800/40' : 'bg-cyan-50/50 border-cyan-200'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-cyan-500 font-bold">Active Alert Threshold (τ):</span>
              <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">
                {(alertThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.95"
              step="0.02"
              value={alertThreshold}
              onChange={(e) => onChangeConfig({ ...config, alertThreshold: Number(parseFloat(e.target.value).toFixed(2)) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className={`flex justify-between text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>5% (Hyper-Sensitive)</span>
              <span>τ* = {(optimalThreshold * 100).toFixed(0)}%</span>
              <span>95% (Conservative)</span>
            </div>
          </div>

          {/* Asymmetry Rationale Explanation */}
          <div className={`p-3 rounded-xl border text-[11px] space-y-1.5 font-sans ${
            isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <div className={`font-bold flex items-center gap-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <Info className="w-3.5 h-3.5 text-cyan-500" />
              <span>Why τ* is NOT 50%:</span>
            </div>
            <p>
              Missing an unplanned breakdown costs <strong className="text-rose-500 font-mono">${costFalseNegative.toLocaleString()}</strong>, whereas a false alarm costs only <strong className="text-amber-500 font-mono">${costFalsePositive.toLocaleString()}</strong> ({Math.round(costFalseNegative / costFalsePositive)}:1 ratio).
            </p>
            <p>
              Minimizing factory cost strictly drives the alert threshold down to <strong className="text-emerald-500 font-mono">{(optimalThreshold * 100).toFixed(0)}%</strong> to guarantee high sensitivity.
            </p>
          </div>
        </div>

        {/* Right 2 Columns: Cost Curve & Confusion Matrix */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cost vs Threshold Curve */}
          <CostTradeoffChart
            evaluationCurve={evaluationResult.evaluationCurve}
            optimalThreshold={optimalThreshold}
            currentThreshold={alertThreshold}
            costFalsePositive={costFalsePositive}
            costFalseNegative={costFalseNegative}
            costTruePositive={costTruePositive}
            onSelectThreshold={(newT) => onChangeConfig({ ...config, alertThreshold: newT })}
          />

          {/* Lower Row: Confusion Matrix + ROC Curve */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Confusion Matrix Table */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-colors ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <div className={`flex items-center justify-between border-b pb-2 mb-3 ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <h4 className={`font-semibold text-xs uppercase tracking-wider ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    Confusion Matrix at τ = {(alertThreshold * 100).toFixed(0)}%
                  </h4>
                  <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    2,000 Benchmark Cycles
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* True Positive */}
                  <div className={`p-2.5 rounded-xl border ${
                    isDark ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                      True Positives (TP)
                    </div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-300 mt-1">
                      {cm.truePositives}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Failures caught in advance
                    </div>
                  </div>

                  {/* False Positive */}
                  <div className={`p-2.5 rounded-xl border ${
                    isDark ? 'bg-amber-950/30 border-amber-800/60' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">
                      False Positives (FP)
                    </div>
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-300 mt-1">
                      {cm.falsePositives}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      False alarms (${costFalsePositive} checks)
                    </div>
                  </div>

                  {/* False Negative */}
                  <div className={`p-2.5 rounded-xl border ${
                    isDark ? 'bg-rose-950/40 border-rose-800/60' : 'bg-rose-50 border-rose-200'
                  }`}>
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">
                      False Negatives (FN)
                    </div>
                    <div className="text-xl font-bold text-rose-600 dark:text-rose-300 mt-1">
                      {cm.falseNegatives}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Missed catastrophic stoppages
                    </div>
                  </div>

                  {/* True Negative */}
                  <div className={`p-2.5 rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      True Negatives (TN)
                    </div>
                    <div className={`text-xl font-bold mt-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                      {cm.trueNegatives}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Normal uninterrupted runs
                    </div>
                  </div>
                </div>

                {/* Key Ratios */}
                <div className={`grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-[11px] ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <div>
                    <span className={`block text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sensitivity:</span>
                    <span className="text-emerald-500 font-bold text-sm">
                      {(currentMetrics.tpr * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className={`block text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Specificity:</span>
                    <span className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {(currentMetrics.specificity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className={`block text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Precision:</span>
                    <span className="text-cyan-500 font-bold text-sm">
                      {(currentMetrics.precision * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className={`text-[10px] mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Downtime avoided: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{currentMetrics.unplannedDowntimeSavedHours.toFixed(0)} hours</strong>
              </div>
            </div>

            {/* ROC Curve */}
            <RocCurveChart
              evaluationCurve={evaluationResult.evaluationCurve}
              currentThreshold={alertThreshold}
              optimalThreshold={optimalThreshold}
            />
          </div>
        </div>
      </div>

      {/* Prominent Maintenance Scheduling Suggestions Section (Requirement #5) */}
      <div className={`p-5 rounded-2xl border transition-colors space-y-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-500" />
            <div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Maintenance Scheduling Suggestions (Cost-Threshold Driven)
              </h3>
              <p className={`text-xs font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Intelligent shift-aware dispatch suggestions based on machine RUL and active threshold (τ = {(alertThreshold * 100).toFixed(0)}%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-1 rounded border ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              Shift 1 Window: <strong className="text-emerald-500">14:00 - 15:00</strong>
            </span>
          </div>
        </div>

        {/* Actionable Suggestions for Units Exceeding Threshold */}
        {machinesExceedingThreshold.length === 0 ? (
          <div className={`py-6 text-center text-xs rounded-xl border border-dashed ${
            isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}>
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-70" />
            No machines currently exceed the alert threshold (τ = {(alertThreshold * 100).toFixed(0)}%). All units safe.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {machinesExceedingThreshold.map((m) => {
              const r = latestReadings.get(m.id);
              const risk = r?.failureRisk || 0.45;
              const rul = r?.estimatedRulHours || 18;
              const hasOrder = workOrders.some(wo => wo.machineId === m.id && wo.status !== 'COMPLETED');
              const suggestion = generateSchedulingSuggestion(m.name, risk, rul, m.faultMode !== 'none' ? m.faultMode.replace('_', ' ') : 'Vibration Exceedance', alertThreshold);

              return (
                <div key={m.id} className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                  suggestion.urgency === 'EMERGENCY'
                    ? isDark ? 'bg-rose-950/30 border-rose-800/80' : 'bg-rose-50 border-rose-300'
                    : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        suggestion.urgency === 'EMERGENCY'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                      }`}>
                        {suggestion.urgency}
                      </span>
                    </div>

                    <p className={`text-[11px] font-sans mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {suggestion.recommendedAction}
                    </p>

                    <div className="mt-2 space-y-1 text-[10px]">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3 h-3 text-cyan-500" />
                        <span>Target Window: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{suggestion.targetWindow}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <User className="w-3 h-3 text-emerald-500" />
                        <span>Role: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{suggestion.technicianRole}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <Package className="w-3 h-3 text-purple-500" />
                        <span>Parts: {suggestion.parts.slice(0, 2).join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t flex items-center justify-between">
                    {hasOrder ? (
                      <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Work Order Logged
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCreateAutoOrder(m)}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Dispatch Work Order</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Existing Work Orders List if any */}
        {workOrders.length > 0 && (
          <div className="pt-2">
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Active Work Orders Queue:
            </h4>
            <div className="space-y-2">
              {workOrders.slice(0, 3).map((wo) => (
                <div key={wo.id} className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="font-bold text-cyan-500 mr-2">{wo.id}</span>
                    <strong className={isDark ? 'text-white' : 'text-slate-900'}>{wo.title}</strong>
                    <span className={`ml-2 text-[10px] px-1.5 py-0.2 rounded ${
                      wo.priority === 'EMERGENCY' ? 'bg-rose-900 text-rose-100' : 'bg-amber-900 text-amber-100'
                    }`}>
                      {wo.priority}
                    </span>
                    <p className={`text-[11px] font-sans mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Tech: {wo.assignedTechnician} • Window: {wo.targetCompletionWindow} • Est: ${wo.estimatedCost}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {wo.status === 'PENDING' && onUpdateStatus && (
                      <button
                        onClick={() => onUpdateStatus(wo.id, 'IN_PROGRESS')}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[11px] cursor-pointer"
                      >
                        Start Work
                      </button>
                    )}
                    {wo.status === 'IN_PROGRESS' && onUpdateStatus && (
                      <button
                        onClick={() => onUpdateStatus(wo.id, 'COMPLETED')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Complete & Reset Unit</span>
                      </button>
                    )}
                    {wo.status === 'COMPLETED' && (
                      <span className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed & Verified
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
