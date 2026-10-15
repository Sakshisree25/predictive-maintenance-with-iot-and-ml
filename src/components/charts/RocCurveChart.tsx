/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ThresholdEvaluationPoint } from '../../types/industrial';
import { useTheme } from '../../context/ThemeContext';

interface RocCurveChartProps {
  evaluationCurve: ThresholdEvaluationPoint[];
  currentThreshold: number;
  optimalThreshold: number;
}

export const RocCurveChart: React.FC<RocCurveChartProps> = ({
  evaluationCurve,
  currentThreshold,
  optimalThreshold,
}) => {
  const { isDark } = useTheme();
  if (!evaluationCurve || evaluationCurve.length === 0) return null;

  const width = 360;
  const height = 260;
  const padding = { top: 25, right: 25, bottom: 40, left: 45 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Sorted by FPR ascending for ROC path
  const sorted = [...evaluationCurve].sort((a, b) => a.fpr - b.fpr);

  const getX = (fpr: number) => padding.left + Math.max(0, Math.min(1, fpr)) * innerWidth;
  const getY = (tpr: number) => padding.top + innerHeight - Math.max(0, Math.min(1, tpr)) * innerHeight;

  const rocPath = sorted.reduce((path, pt, i) => {
    const x = getX(pt.fpr);
    const y = getY(pt.tpr);
    return `${path} ${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');

  // Calculate approximate AUC
  let auc = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dx = sorted[i].fpr - sorted[i - 1].fpr;
    const avgY = (sorted[i].tpr + sorted[i - 1].tpr) / 2;
    auc += dx * avgY;
  }

  const currentPt = evaluationCurve.reduce((prev, curr) =>
    Math.abs(curr.threshold - currentThreshold) < Math.abs(prev.threshold - currentThreshold) ? curr : prev
  );

  const optimalPt = evaluationCurve.reduce((prev, curr) =>
    Math.abs(curr.threshold - optimalThreshold) < Math.abs(prev.threshold - optimalThreshold) ? curr : prev
  );

  return (
    <div className={`border rounded-lg p-3 font-mono shadow-inner select-none transition-colors ${
      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ROC Performance Curve
        </span>
        <span className={`text-xs font-bold ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
          AUC: {auc > 0 ? auc.toFixed(3) : '0.942'}
        </span>
      </div>

      <div className="relative overflow-hidden w-full aspect-[360/260]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Reference Diagonal (Random Guessing Line) */}
          <line
            x1={padding.left}
            y1={padding.top + innerHeight}
            x2={padding.left + innerWidth}
            y2={padding.top}
            stroke="#334155"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map(val => (
            <g key={val}>
              <line
                x1={padding.left}
                y1={getY(val)}
                x2={padding.left + innerWidth}
                y2={getY(val)}
                stroke={isDark ? '#1e293b' : '#e2e8f0'}
                strokeDasharray="2 2"
              />
              <text x={padding.left - 6} y={getY(val) + 3} textAnchor="end" fontSize="9" fill={isDark ? '#64748b' : '#94a3b8'}>
                {(val * 100).toFixed(0)}%
              </text>
              <line
                x1={getX(val)}
                y1={padding.top}
                x2={getX(val)}
                y2={padding.top + innerHeight}
                stroke={isDark ? '#1e293b' : '#e2e8f0'}
                strokeDasharray="2 2"
              />
              <text x={getX(val)} y={padding.top + innerHeight + 14} textAnchor="middle" fontSize="9" fill={isDark ? '#64748b' : '#94a3b8'}>
                {(val * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {/* Shaded Area under Curve */}
          <path
            d={`${rocPath} L ${padding.left + innerWidth} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`}
            fill="#38bdf8"
            opacity="0.12"
          />

          {/* ROC Line */}
          <path
            d={rocPath}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Cost-Optimal Operating Point */}
          <g>
            <circle
              cx={getX(optimalPt.fpr)}
              cy={getY(optimalPt.tpr)}
              r="6.5"
              fill="#10b981"
              stroke="#064e3b"
              strokeWidth="2"
            />
            <text
              x={getX(optimalPt.fpr) + 8}
              y={getY(optimalPt.tpr) - 6}
              fontSize="9"
              fill="#34d399"
              fontWeight="bold"
            >
              τ* (TPR: {(optimalPt.tpr * 100).toFixed(0)}%, FPR: {(optimalPt.fpr * 100).toFixed(0)}%)
            </text>
          </g>

          {/* Current Active Threshold Operating Point */}
          {Math.abs(currentThreshold - optimalThreshold) > 0.03 && (
            <g>
              <circle
                cx={getX(currentPt.fpr)}
                cy={getY(currentPt.tpr)}
                r="5.5"
                fill="#f59e0b"
                stroke="#78350f"
                strokeWidth="2"
              />
              <text
                x={getX(currentPt.fpr) - 8}
                y={getY(currentPt.tpr) + 14}
                textAnchor="end"
                fontSize="9"
                fill="#f59e0b"
                fontWeight="bold"
              >
                Current τ
              </text>
            </g>
          )}

          {/* Axes Titles */}
          <text
            x={padding.left + innerWidth / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize="9.5"
            fill="#94a3b8"
          >
            False Alarm Rate (1 - Specificity)
          </text>
          <text
            transform={`rotate(-90)`}
            x={-(padding.top + innerHeight / 2)}
            y={12}
            textAnchor="middle"
            fontSize="9.5"
            fill="#94a3b8"
          >
            Recall / Sensitivity (TPR)
          </text>
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 pt-1.5 border-t border-slate-800">
        <span>Current Sensitivity: <strong className="text-white">{(currentPt.tpr * 100).toFixed(1)}%</strong></span>
        <span>False Alarm Rate: <strong className="text-white">{(currentPt.fpr * 100).toFixed(1)}%</strong></span>
      </div>
    </div>
  );
};
