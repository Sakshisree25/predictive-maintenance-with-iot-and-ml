/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ThresholdEvaluationPoint } from '../../types/industrial';
import { useTheme } from '../../context/ThemeContext';

interface CostTradeoffChartProps {
  evaluationCurve: ThresholdEvaluationPoint[];
  optimalThreshold: number;
  currentThreshold: number;
  costFalsePositive: number;
  costFalseNegative: number;
  costTruePositive: number;
  onSelectThreshold: (thresh: number) => void;
}

export const CostTradeoffChart: React.FC<CostTradeoffChartProps> = ({
  evaluationCurve,
  optimalThreshold,
  currentThreshold,
  costFalsePositive,
  costFalseNegative,
  costTruePositive,
  onSelectThreshold,
}) => {
  const { isDark } = useTheme();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!evaluationCurve || evaluationCurve.length === 0) return null;

  const width = 760;
  const height = 260;
  const padding = { top: 30, right: 30, bottom: 40, left: 70 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Find max cost for scaling
  const maxCost = Math.max(...evaluationCurve.map(p => p.totalCost)) * 1.08;
  const minCost = Math.min(...evaluationCurve.map(p => p.totalCost)) * 0.9;

  const getX = (thresh: number) => {
    return padding.left + ((thresh - 0.05) / (0.95 - 0.05)) * innerWidth;
  };

  const getY = (cost: number) => {
    const clamped = Math.max(minCost, Math.min(maxCost, cost));
    return padding.top + innerHeight - ((clamped - minCost) / (maxCost - minCost)) * innerHeight;
  };

  // Generate path for total expected cost
  const totalCostPath = evaluationCurve.reduce((path, pt, i) => {
    const x = getX(pt.threshold);
    const y = getY(pt.totalCost);
    return `${path} ${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');

  // Sub-costs: Missed Failure component (FN * C_FN)
  const fnCostPath = evaluationCurve.reduce((path, pt, i) => {
    const x = getX(pt.threshold);
    const y = getY(pt.confusionMatrix.falseNegatives * costFalseNegative);
    return `${path} ${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');

  // Sub-costs: False Alarm component (FP * C_FP)
  const fpCostPath = evaluationCurve.reduce((path, pt, i) => {
    const x = getX(pt.threshold);
    const y = getY(pt.confusionMatrix.falsePositives * costFalsePositive);
    return `${path} ${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');

  const hoveredPoint = hoverIndex !== null ? evaluationCurve[hoverIndex] : null;

  return (
    <div className={`border rounded-lg p-3 font-mono shadow-inner select-none transition-colors ${
      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
        <div>
          <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Total Factory Financial Loss vs Alert Threshold (τ)
          </span>
          <span className={`ml-2 text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            Min Cost at τ* = {(optimalThreshold * 100).toFixed(0)}%
          </span>
        </div>
        <div className={`flex flex-wrap items-center gap-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <span className="flex items-center gap-1.5 text-rose-500">
            <span className="w-2.5 h-0.5 bg-rose-500 inline-block"></span>
            Missed Stoppage Loss (FN × ${costFalseNegative.toLocaleString()})
          </span>
          <span className="flex items-center gap-1.5 text-amber-500">
            <span className="w-2.5 h-0.5 bg-amber-500 inline-block"></span>
            False Alarm Waste (FP × ${costFalsePositive.toLocaleString()})
          </span>
          <span className={`flex items-center gap-1.5 font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
            <span className={`w-3 h-1 inline-block ${isDark ? 'bg-cyan-400' : 'bg-cyan-600'}`}></span>
            Total Expected Loss
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden w-full aspect-[760/260]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full cursor-crosshair"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const svgX = (relX / rect.width) * width;
            const progress = (svgX - padding.left) / innerWidth;
            const thresh = Math.max(0.05, Math.min(0.95, 0.05 + progress * 0.90));
            onSelectThreshold(Number(thresh.toFixed(2)));
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const svgX = (relX / rect.width) * width;
            const progress = Math.max(0, Math.min(1, (svgX - padding.left) / innerWidth));
            const idx = Math.min(evaluationCurve.length - 1, Math.max(0, Math.round(progress * (evaluationCurve.length - 1))));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal Cost Reference Grid */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
            const y = padding.top + innerHeight * (1 - ratio);
            const costVal = minCost + ratio * (maxCost - minCost);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke={isDark ? '#1e293b' : '#e2e8f0'}
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9.5"
                  fill={isDark ? '#64748b' : '#94a3b8'}
                >
                  ${(costVal / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}

          {/* Vertical Threshold Reference Lines */}
          {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((t) => {
            const x = getX(t);
            return (
              <g key={t}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + innerHeight}
                  stroke="#172554"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
                <text
                  x={x}
                  y={padding.top + innerHeight + 15}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="#64748b"
                >
                  {(t * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Sub-curves */}
          <path
            d={fnCostPath}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.85"
          />
          <path
            d={fpCostPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.85"
          />

          {/* Total Cost Curve */}
          <path
            d={totalCostPath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Optimal Threshold Marker (Vertical Line & Flag) */}
          <g>
            <line
              x1={getX(optimalThreshold)}
              y1={padding.top}
              x2={getX(optimalThreshold)}
              y2={padding.top + innerHeight}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
            <circle
              cx={getX(optimalThreshold)}
              cy={getY(evaluationCurve.find(p => Math.abs(p.threshold - optimalThreshold) < 0.01)?.totalCost || minCost)}
              r="6"
              fill="#10b981"
              stroke="#064e3b"
              strokeWidth="2"
            />
            <rect
              x={getX(optimalThreshold) - 34}
              y={padding.top - 20}
              width="68"
              height="18"
              rx="3"
              fill="#065f46"
              stroke="#34d399"
              strokeWidth="1"
            />
            <text
              x={getX(optimalThreshold)}
              y={padding.top - 8}
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill="#ecfdf5"
            >
              τ* = {(optimalThreshold * 100).toFixed(0)}%
            </text>
          </g>

          {/* Current Threshold Marker (Interactive) */}
          <g>
            <line
              x1={getX(currentThreshold)}
              y1={padding.top}
              x2={getX(currentThreshold)}
              y2={padding.top + innerHeight}
              stroke="#f59e0b"
              strokeWidth="1.8"
            />
            <circle
              cx={getX(currentThreshold)}
              cy={getY(evaluationCurve.find(p => Math.abs(p.threshold - currentThreshold) < 0.01)?.totalCost || minCost)}
              r="5.5"
              fill="#f59e0b"
              stroke="#78350f"
              strokeWidth="2"
            />
          </g>

          {/* Hover Crosshair & Tooltip */}
          {hoveredPoint && (
            <g>
              <line
                x1={getX(hoveredPoint.threshold)}
                y1={padding.top}
                x2={getX(hoveredPoint.threshold)}
                y2={padding.top + innerHeight}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoveredPoint.threshold)}
                cy={getY(hoveredPoint.totalCost)}
                r="4.5"
                fill="#ffffff"
                stroke="#0284c7"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X Axis Label */}
          <text
            x={padding.left + innerWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fontSize="10"
            fill="#94a3b8"
            fontWeight="bold"
          >
            Alert Threshold (τ) — Sensitivity Trade-off (Lower = More Alerts, Higher = Fewer Alerts)
          </text>
        </svg>
      </div>

      {/* Interactive Legend & Instruction */}
      <div className="flex flex-wrap items-center justify-between mt-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
        <div>
          <span>Click anywhere on chart to set active threshold τ.</span>
        </div>
        {hoveredPoint && (
          <div className="text-cyan-300 font-bold">
            At τ = {(hoveredPoint.threshold * 100).toFixed(0)}%: Total Cost: ${hoveredPoint.totalCost.toLocaleString()} |
            FP (False Alarms): {hoveredPoint.confusionMatrix.falsePositives} |
            FN (Missed Stoppages): {hoveredPoint.confusionMatrix.falseNegatives} |
            Sensitivity: {(hoveredPoint.tpr * 100).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
};
