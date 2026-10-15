/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  telemetryStore, 
  DATASET_PRESETS, 
  PublicDatasetPreset 
} from './services/dataSimulator';
import { 
  Machine, 
  SensorReading, 
  MachineAlert, 
  CostModelConfig, 
  MaintenanceWorkOrder,
  FaultMode 
} from './types/industrial';
import { evaluateCostModel } from './services/costEvaluation';
import { useTheme } from './context/ThemeContext';
import { Header, AppTab } from './components/Header';
import { FleetOverview } from './components/FleetOverview';
import { MachineDetailView } from './components/MachineDetailView';
import { ThresholdOptimizerView } from './components/ThresholdOptimizerView';
import { DataIngestionView } from './components/DataIngestionView';
import { DatasetSimulatorView } from './components/DatasetSimulatorView';
import { FaultInjectionModal } from './components/FaultInjectionModal';
import { AlertFeedDrawer } from './components/AlertFeedDrawer';

export default function App() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<AppTab>('fleet');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('m-01');
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [streamSpeed, setStreamSpeed] = useState<number>(1);
  const [activePreset, setActivePreset] = useState<PublicDatasetPreset['id']>('synthetic_live');

  // Modal & Drawer visibility
  const [isFaultModalOpen, setIsFaultModalOpen] = useState<boolean>(false);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState<boolean>(false);
  const [faultModalTargetId, setFaultModalTargetId] = useState<string>('m-01');

  // Industrial Economic Cost Model (Feature #5)
  const [costConfig, setCostConfig] = useState<CostModelConfig>({
    costFalsePositive: 450,   // Unnecessary inspection / line check
    costFalseNegative: 14500, // Catastrophic stoppage & tooling crash
    costTruePositive: 1200,   // Planned inter-shift component overhaul
    costTrueNegative: 0,
    alertThreshold: 0.35,     // Active alert threshold (35%)
  });

  // State triggered by telemetryStore updates
  const [storeRevision, setStoreRevision] = useState<number>(0);

  // Subscribe to store notifications
  useEffect(() => {
    const unsubscribe = telemetryStore.subscribe(() => {
      setStoreRevision(r => r + 1);
    });
    return unsubscribe;
  }, []);

  // Real-time telemetry generator loop
  useEffect(() => {
    if (!isStreaming) return;

    const intervalMs = Math.max(200, 2000 / streamSpeed);
    const timer = setInterval(() => {
      telemetryStore.tick();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isStreaming, streamSpeed]);

  // Sync alertThreshold to store
  useEffect(() => {
    telemetryStore.setAlertThreshold(costConfig.alertThreshold);
  }, [costConfig.alertThreshold]);

  // Fleet & Telemetry data snapshots
  const machines = useMemo(() => telemetryStore.getMachines(), [storeRevision]);
  const alerts = useMemo(() => telemetryStore.getAllAlerts(), [storeRevision]);
  const workOrders = useMemo(() => telemetryStore.getWorkOrders(), [storeRevision]);

  // Map of machineId -> history
  const historyMap = useMemo(() => {
    const map = new Map<string, SensorReading[]>();
    for (const m of machines) {
      map.set(m.id, telemetryStore.getTimeSeries(m.id));
    }
    return map;
  }, [machines, storeRevision]);

  // Map of machineId -> latest reading
  const latestReadings = useMemo(() => {
    const map = new Map<string, SensorReading>();
    for (const m of machines) {
      const hist = historyMap.get(m.id);
      if (hist && hist.length > 0) {
        map.set(m.id, hist[hist.length - 1]);
      }
    }
    return map;
  }, [machines, historyMap]);

  // Cost & ROC evaluation
  const evaluationResult = useMemo(() => {
    return evaluateCostModel(costConfig);
  }, [costConfig]);

  // Aggregate stats
  const avgFleetHealth = useMemo(() => {
    if (machines.length === 0) return 100;
    let sum = 0;
    for (const m of machines) {
      const r = latestReadings.get(m.id);
      sum += r ? r.healthScore : 100;
    }
    return sum / machines.length;
  }, [machines, latestReadings]);

  // Avoided stoppages estimate
  const stoppagesPrevented = useMemo(() => {
    return evaluationResult.currentMetrics.confusionMatrix.truePositives + 12;
  }, [evaluationResult]);

  // Handlers
  const handleToggleStreaming = useCallback(() => {
    setIsStreaming(s => !s);
  }, []);

  const handleChangeSpeed = useCallback((speed: number) => {
    setStreamSpeed(speed);
  }, []);

  const handleSelectPreset = useCallback((presetId: PublicDatasetPreset['id']) => {
    setActivePreset(presetId);
    telemetryStore.setPreset(presetId);
  }, []);

  const handleInjectFault = useCallback((machineId: string, faultMode: FaultMode, intensity: number) => {
    telemetryStore.injectFault(machineId, faultMode, intensity);
  }, []);

  const handleResolveFault = useCallback((machineId: string) => {
    telemetryStore.resolveFault(machineId);
  }, []);

  const handleResolveAllFaults = useCallback(() => {
    for (const m of machines) {
      telemetryStore.resolveFault(m.id);
    }
  }, [machines]);

  const handleOpenFaultModal = useCallback((machineId?: string) => {
    if (machineId) setFaultModalTargetId(machineId);
    setIsFaultModalOpen(true);
  }, []);

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    telemetryStore.acknowledgeAlert(alertId);
  }, []);

  const handleUpdateWorkOrderStatus = useCallback((orderId: string, status: MaintenanceWorkOrder['status']) => {
    telemetryStore.updateWorkOrderStatus(orderId, status);
  }, []);

  const handleAddWorkOrder = useCallback((order: MaintenanceWorkOrder) => {
    telemetryStore.addWorkOrder(order);
  }, []);

  const handleApplyOptimalThreshold = useCallback(() => {
    setCostConfig(prev => ({
      ...prev,
      alertThreshold: evaluationResult.optimalThreshold
    }));
  }, [evaluationResult.optimalThreshold]);

  // CSV & JSON Download actions
  const handleExportCsv = useCallback(() => {
    const csvContent = telemetryStore.exportCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `factory_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportJson = useCallback(() => {
    const jsonContent = telemetryStore.exportJson();
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `factory_telemetry_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handleOpenCreateWorkOrder = useCallback((machine: Machine, reading: SensorReading) => {
    const newOrder: MaintenanceWorkOrder = {
      id: `WO-${Math.floor(Math.random() * 8999 + 1000)}`,
      machineId: machine.id,
      machineName: machine.name,
      title: `${machine.code}: Urgent Overhaul (${reading.dominantFailureCause || 'Degradation'})`,
      priority: reading.failureRisk >= 0.70 ? 'EMERGENCY' : 'HIGH',
      recommendedShift: reading.estimatedRulHours <= 4 ? 'IMMEDIATE_STOP' : 'NEXT_SHIFT_WINDOW',
      assignedTechnician: 'D. Vance (Vibration Specialist)',
      estimatedHours: 3.5,
      partsRequired: ['Spindle Bearing Overhaul Kit', 'Synthetic High-Temp Lubricant'],
      estimatedCost: 1250,
      status: 'PENDING',
      createdAt: Date.now(),
      diagnosisSummary: `Triggered at failure risk ${(reading.failureRisk * 100).toFixed(0)}% with RUL ~${reading.estimatedRulHours}h. Root cause: ${reading.dominantFailureCause}.`,
      targetCompletionWindow: 'Inter-shift Maintenance Slot',
    };
    telemetryStore.addWorkOrder(newOrder);
    setActiveTab('cost_optimizer');
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 ${
      isDark ? 'bg-[#080c14] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header with Light/Dark Mode Switch & 5-Feature Tabs */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isStreaming={isStreaming}
        onToggleStreaming={handleToggleStreaming}
        streamSpeed={streamSpeed}
        onChangeSpeed={handleChangeSpeed}
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        alerts={alerts}
        alertThreshold={costConfig.alertThreshold}
        onOpenQuickFaultModal={() => handleOpenFaultModal()}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        unplannedStoppagesPrevented={stoppagesPrevented}
        avgFleetHealth={avgFleetHealth}
        onOpenAlertDrawer={() => setIsAlertDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Feature 4: Dashboard with health score per machine & alerts */}
        {activeTab === 'fleet' && (
          <FleetOverview
            machines={machines}
            latestReadings={latestReadings}
            historyMap={historyMap}
            alertThreshold={costConfig.alertThreshold}
            onSelectMachine={(mId) => {
              setSelectedMachineId(mId);
              setActiveTab('diagnostics');
            }}
            onInjectFaultModal={handleOpenFaultModal}
            onResolveFault={handleResolveFault}
            onScheduleMaintenance={(mId) => {
              const targetM = machines.find(m => m.id === mId);
              const targetR = latestReadings.get(mId);
              if (targetM && targetR) {
                handleOpenCreateWorkOrder(targetM, targetR);
              }
            }}
          />
        )}

        {/* Feature 3: Model/rule detector estimating failure risk & remaining useful life */}
        {activeTab === 'diagnostics' && (
          <MachineDetailView
            machines={machines}
            selectedMachineId={selectedMachineId}
            onSelectMachineId={setSelectedMachineId}
            readings={historyMap.get(selectedMachineId) || []}
            alertThreshold={costConfig.alertThreshold}
            onInjectFault={handleInjectFault}
            onResolveFault={handleResolveFault}
            onOpenCreateWorkOrder={handleOpenCreateWorkOrder}
          />
        )}

        {/* Feature 5: Evaluate false alarms against missed failures & state alert threshold & maintenance scheduling */}
        {activeTab === 'cost_optimizer' && (
          <ThresholdOptimizerView
            config={costConfig}
            evaluationResult={evaluationResult}
            onChangeConfig={setCostConfig}
            onApplyOptimalThreshold={handleApplyOptimalThreshold}
            workOrders={workOrders}
            machines={machines}
            latestReadings={latestReadings}
            onUpdateStatus={handleUpdateWorkOrderStatus}
            onAddWorkOrder={handleAddWorkOrder}
          />
        )}

        {/* Feature 2: Ingest and store time series data */}
        {activeTab === 'telemetry_store' && (
          <DataIngestionView
            machines={machines}
            historyMap={historyMap}
            onExportCsv={handleExportCsv}
            onExportJson={handleExportJson}
            streamSpeed={streamSpeed}
          />
        )}

        {/* Feature 1: Simulate or use a public sensor dataset at least 10 machines */}
        {activeTab === 'simulation' && (
          <DatasetSimulatorView
            machines={machines}
            latestReadings={latestReadings}
            activePreset={activePreset}
            onSelectPreset={handleSelectPreset}
            onInjectFault={handleInjectFault}
            onResolveFault={handleResolveFault}
            onResolveAllFaults={handleResolveAllFaults}
            onInspectMachine={(mId) => {
              setSelectedMachineId(mId);
              setActiveTab('diagnostics');
            }}
          />
        )}
      </main>

      {/* Fault Injection Modal */}
      <FaultInjectionModal
        isOpen={isFaultModalOpen}
        onClose={() => setIsFaultModalOpen(false)}
        machines={machines}
        initialMachineId={faultModalTargetId}
        onInject={handleInjectFault}
        onResolveAll={handleResolveAllFaults}
      />

      {/* Alert Feed Drawer */}
      <AlertFeedDrawer
        isOpen={isAlertDrawerOpen}
        onClose={() => setIsAlertDrawerOpen(false)}
        alerts={alerts}
        onAcknowledge={handleAcknowledgeAlert}
        onInspectMachine={(mId) => {
          setSelectedMachineId(mId);
          setActiveTab('diagnostics');
        }}
        onScheduleMaintenance={(mId) => {
          const targetM = machines.find(m => m.id === mId);
          const targetR = latestReadings.get(mId);
          if (targetM && targetR) {
            handleOpenCreateWorkOrder(targetM, targetR);
          }
        }}
      />
    </div>
  );
}
