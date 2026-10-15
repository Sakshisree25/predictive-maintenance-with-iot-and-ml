/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { SensorReading, SensorBaseline } from '../../types/industrial';
import { useTheme } from '../../context/ThemeContext';

interface TelemetryChartProps {
  data: SensorReading[];
  baseline: SensorBaseline;
  selectedMetric: 'all' | 'temperature' | 'vibration' | 'pressure' | 'risk';
  alertThreshold: number;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  data,
  baseline,
  selectedMetric,
  alertThreshold,
}) => {
  const { isDark } = useTheme();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(() => {
    // Show last 60 points for high clarity
    return data.slice(-60);
  }, [data]);

  if (points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 border border-slate-800 rounded bg-slate-950/40">
        No telemetry stream available
      </div>
    );
  }

  const width = 800;
  const height = 260;
  const padding = { top: 25, right: 30, bottom: 35, left: 55 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Determine scales based on active metric
  let yMin = 0;
  let yMax = 100;
  let unit = '';
  let title = '';
  let warnLine: number | null = null;
  let critLine: number | null = null;

  if (selectedMetric === 'temperature') {
    yMin = Math.max(0, Math.floor(baseline.tempNominal * 0.7));
    yMax = Math.ceil(baseline.tempCritical * 1.25);
    unit = '°C';
    title = 'Bearing & Core Temperature (°C)';
    warnLine = baseline.tempWarning;
    critLine = baseline.tempCritical;
  } else if (selectedMetric === 'vibration') {
    yMin = 0;
    yMax = Math.max(8.0, Math.ceil(baseline.vibCritical * 1.3));
    unit = 'mm/s';
    title = 'ISO 10816 Triaxial Vibration (mm/s RMS)';
    warnLine = baseline.vibWarning;
    critLine = baseline.vibCritical;
  } else if (selectedMetric === 'pressure') {
    yMin = Math.max(0, Math.floor(baseline.pressureCriticalLow * 0.7));
    yMax = Math.ceil(baseline.pressureCriticalHigh * 1.25);
    unit = 'bar';
    title = 'System / Hydraulic Pressure (bar)';
    warnLine = baseline.pressureWarningHigh;
    critLine = baseline.pressureCriticalHigh;
  } else if (selectedMetric === 'risk') {
    yMin = 0;
    yMax = 100;
    unit = '%';
    title = 'Failure Risk Probability & Degradation Curve (%)';
    warnLine = Math.round(alertThreshold * 100);
    critLine = 75;
  } else {
    // Normalized Composite Multi-Trace (0 to 100%)
    yMin = 0;
    yMax = 100;
    unit = '%';
    title = 'Synchronized Multi-Sensor Envelope (Normalized % of Trip Limit)';
    warnLine = Math.round(alertThreshold * 100);
    critLine = 85;
  }

  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return padding.top + innerHeight - ((clamped - yMin) / (yMax - yMin)) * innerHeight;
  };

  const getX = (idx: number) => {
    if (points.length <= 1) return padding.left;
    return padding.left + (idx / (points.length - 1)) * innerWidth;
  };

  // Generate SVG path for a value extractor
  const createPath = (valFn: (d: SensorReading) => number) => {
    return points.reduce((path, d, i) => {
      const x = getX(i);
      const y = getY(valFn(d));
      return `${path} ${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  };

  const hoveredData = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : points[points.length - 1];

  return (
    <div className={`relative rounded-lg p-3 font-mono shadow-inner select-none border transition-colors ${
      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
        <div>
          <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{title}</span>
          <span className={`ml-2 text-xs font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
            Live: {selectedMetric === 'temperature' ? `${hoveredData.temperature} °C` :
                   selectedMetric === 'vibration' ? `${hoveredData.vibration} mm/s (Zone ${hoveredData.isoZone})` :
                   selectedMetric === 'pressure' ? `${hoveredData.pressure} bar` :
                   selectedMetric === 'risk' ? `${(hoveredData.failureRisk * 100).toFixed(1)}%` :
                   `Health: ${hoveredData.healthScore}% | Risk: ${(hoveredData.failureRisk * 100).toFixed(0)}%`}
          </span>
        </div>
        <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {warnLine !== null && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span>
              <span>Warn: {warnLine}{unit}</span>
            </span>
          )}
          {critLine !== null && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-rose-500 inline-block"></span>
              <span>Trip: {critLine}{unit}</span>
            </span>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden w-full aspect-[800/260]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const svgX = (relX / rect.width) * width;
            const clampedX = Math.max(padding.left, Math.min(padding.left + innerWidth, svgX));
            const progress = (clampedX - padding.left) / innerWidth;
            const idx = Math.round(progress * (points.length - 1));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Subtle Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
            const y = padding.top + innerHeight * (1 - ratio);
            const val = yMin + ratio * (yMax - yMin);
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
                  fontSize="10"
                  fill={isDark ? '#64748b' : '#94a3b8'}
                >
                  {val.toFixed(val >= 10 ? 0 : 1)}
                </text>
              </g>
            );
          })}

          {/* Warning Threshold Line */}
          {warnLine !== null && warnLine >= yMin && warnLine <= yMax && (
            <g>
              <line
                x1={padding.left}
                y1={getY(warnLine)}
                x2={padding.left + innerWidth}
                y2={getY(warnLine)}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.8"
              />
              <text
                x={padding.left + innerWidth - 4}
                y={getY(warnLine) - 4}
                textAnchor="end"
                fontSize="9"
                fill="#f59e0b"
              >
                WARN LIMIT ({warnLine}{unit})
              </text>
            </g>
          )}

          {/* Critical Threshold Line */}
          {critLine !== null && critLine >= yMin && critLine <= yMax && (
            <g>
              <line
                x1={padding.left}
                y1={getY(critLine)}
                x2={padding.left + innerWidth}
                y2={getY(critLine)}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.85"
              />
              <text
                x={padding.left + innerWidth - 4}
                y={getY(critLine) - 4}
                textAnchor="end"
                fontSize="9"
                fill="#ef4444"
                fontWeight="bold"
              >
                CRITICAL TRIP ({critLine}{unit})
              </text>
            </g>
          )}

          {/* Traces */}
          {selectedMetric === 'temperature' && (
            <>
              <path
                d={createPath(d => d.temperature)}
                fill="none"
                stroke="#f97316"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Shaded Area */}
              <path
                d={`${createPath(d => d.temperature)} L ${padding.left + innerWidth} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`}
                fill="url(#tempGradient)"
                opacity="0.25"
              />
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </linearGradient>
              </defs>
            </>
          )}

          {selectedMetric === 'vibration' && (
            <>
              <path
                d={createPath(d => d.vibration)}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d={`${createPath(d => d.vibration)} L ${padding.left + innerWidth} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`}
                fill="url(#vibGradient)"
                opacity="0.25"
              />
              <defs>
                <linearGradient id="vibGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>
            </>
          )}

          {selectedMetric === 'pressure' && (
            <>
              <path
                d={createPath(d => d.pressure)}
                fill="none"
                stroke="#a855f7"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d={`${createPath(d => d.pressure)} L ${padding.left + innerWidth} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`}
                fill="url(#pressGradient)"
                opacity="0.25"
              />
              <defs>
                <linearGradient id="pressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </linearGradient>
              </defs>
            </>
          )}

          {selectedMetric === 'risk' && (
            <>
              <path
                d={createPath(d => d.failureRisk * 100)}
                fill="none"
                stroke="#e11d48"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d={`${createPath(d => d.failureRisk * 100)} L ${padding.left + innerWidth} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`}
                fill="url(#riskGradient)"
                opacity="0.3"
              />
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e11d48" />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
                </linearGradient>
              </defs>
            </>
          )}

          {selectedMetric === 'all' && (
            <>
              {/* Normalized Temp (% of critical) */}
              <path
                d={createPath(d => Math.min(100, (d.temperature / baseline.tempCritical) * 100))}
                fill="none"
                stroke="#f97316"
                strokeWidth="1.8"
                opacity="0.8"
              />
              {/* Normalized Vib (% of critical) */}
              <path
                d={createPath(d => Math.min(100, (d.vibration / baseline.vibCritical) * 100))}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.2"
                opacity="0.9"
              />
              {/* Normalized Pressure (% of critical high) */}
              <path
                d={createPath(d => Math.min(100, (d.pressure / baseline.pressureCriticalHigh) * 100))}
                fill="none"
                stroke="#a855f7"
                strokeWidth="1.8"
                opacity="0.8"
              />
              {/* Failure Risk Curve */}
              <path
                d={createPath(d => d.failureRisk * 100)}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.8"
              />
            </>
          )}

          {/* Hover Crosshair */}
          {hoverIndex !== null && points[hoverIndex] && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + innerHeight}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(
                  selectedMetric === 'temperature' ? hoveredData.temperature :
                  selectedMetric === 'vibration' ? hoveredData.vibration :
                  selectedMetric === 'pressure' ? hoveredData.pressure :
                  selectedMetric === 'risk' ? hoveredData.failureRisk * 100 :
                  hoveredData.failureRisk * 100
                )}
                r="4.5"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Time axis stamps */}
          {points.length > 0 && (
            <>
              <text x={padding.left} y={height - 12} fontSize="9" fill="#64748b">
                -{((points[points.length - 1].timestamp - points[0].timestamp) / 1000).toFixed(0)}s ago
              </text>
              <text x={padding.left + innerWidth / 2} y={height - 12} textAnchor="middle" fontSize="9" fill="#475569">
                Time Series Stream (2s Ingestion Windows)
              </text>
              <text x={padding.left + innerWidth} y={height - 12} textAnchor="end" fontSize="9" fill="#64748b">
                Now (Live)
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Trace Legend when 'all' is selected */}
      {selectedMetric === 'all' && (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2 pt-2 border-t border-slate-800 text-xs">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span>
            Vibration (% Trip)
          </span>
          <span className="flex items-center gap-1.5 text-orange-400">
            <span className="w-3 h-0.5 bg-orange-400 inline-block"></span>
            Temperature (% Trip)
          </span>
          <span className="flex items-center gap-1.5 text-purple-400">
            <span className="w-3 h-0.5 bg-purple-400 inline-block"></span>
            Pressure (% Trip)
          </span>
          <span className="flex items-center gap-1.5 text-rose-500 font-semibold">
            <span className="w-3 h-1 bg-rose-500 inline-block"></span>
            Composite Failure Risk (%)
          </span>
        </div>
      )}
    </div>
  );
};
