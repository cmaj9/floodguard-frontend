import { useMemo } from 'react';
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { format } from 'date-fns';
import type { WaterLevelReading, Station, TimeRange } from '../../types';

interface WaterLevelChartProps {
  readings: WaterLevelReading[];
  station: Station;
  timeRange: TimeRange;
  height?: number;
}

function CustomTooltip({ active, payload, label, station }: any) {
  if (!active || !payload?.length) return null;
  const pData = payload[0]?.payload;
  const val: number = payload[0]?.value ?? 0;
  const refName = station?.referencePointName || 'จุดอ้างอิง';

  const warnVal =
    station?.warningLevel !== null && station?.warningLevel !== undefined && !isNaN(Number(station.warningLevel))
      ? Number(station.warningLevel)
      : (station as any)?.warning_level !== null && (station as any)?.warning_level !== undefined && !isNaN(Number((station as any).warning_level))
      ? Number((station as any).warning_level)
      : null;

  const critVal =
    station?.criticalLevel !== null && station?.criticalLevel !== undefined && !isNaN(Number(station.criticalLevel))
      ? Number(station.criticalLevel)
      : (station as any)?.critical_level !== null && (station as any)?.critical_level !== undefined && !isNaN(Number((station as any).critical_level))
      ? Number((station as any).critical_level)
      : null;

  let status = { label: 'ระดับน้ำปกติ', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' };
  if (critVal !== null && val >= critVal) {
    status = { label: 'ระดับน้ำวิกฤต', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' };
  } else if (warnVal !== null && val >= warnVal) {
    status = { label: 'ระดับน้ำเฝ้าระวัง', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' };
  } else if (val > 0) {
    status = { label: `สูงกว่า${refName}`, color: '#0284C7', bg: 'rgba(2, 132, 199, 0.12)', border: 'rgba(2, 132, 199, 0.3)' };
  }

  const relDesc =
    val < 0
      ? `ต่ำกว่า${refName} ${Math.abs(val).toFixed(2)} ม.`
      : val === 0
      ? `เสมอ${refName} พอดี`
      : `สูงกว่า${refName} +${val.toFixed(2)} ม.`;

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.96)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 13,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(12px)',
        minWidth: 200,
      }}
    >
      <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 6, fontWeight: 500 }}>
        {pData?.fullTime || label}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            color: val >= (critVal ?? 0) ? '#EF4444' : val >= (warnVal ?? 0) ? '#F59E0B' : '#38BDF8',
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: '-0.02em',
          }}
        >
          {val >= 0 ? `+${val.toFixed(3)}` : val.toFixed(3)}
        </span>
        <span style={{ color: '#94A3B8', fontSize: 12 }}>ม. (รสม.)</span>
      </div>

      {pData?.rawDistance != null && (
        <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>
          ระยะเซนเซอร์วัดได้: <strong style={{ color: '#E2E8F0', fontFamily: 'monospace' }}>{Number(pData.rawDistance).toFixed(3)} ม.</strong>
        </div>
      )}

      <div style={{ color: '#CBD5E1', fontSize: 11, marginTop: 6 }}>{relDesc}</div>

      {/* Threshold Comparison in Tooltip */}
      <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {warnVal !== null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F59E0B' }}>
            <span>เกณฑ์เฝ้าระวัง</span>
            <span>{warnVal >= 0 ? '+' : ''}{warnVal.toFixed(2)} ม. ({val >= warnVal ? `เกิน +${(val - warnVal).toFixed(2)}` : `ต่ำกว่า ${(warnVal - val).toFixed(2)}`} ม.)</span>
          </div>
        )}
        {critVal !== null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444' }}>
            <span>เกณฑ์วิกฤต</span>
            <span>{critVal >= 0 ? '+' : ''}{critVal.toFixed(2)} ม. ({val >= critVal ? `เกิน +${(val - critVal).toFixed(2)}` : `ต่ำกว่า ${(critVal - val).toFixed(2)}`} ม.)</span>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: status.bg,
          border: `1px solid ${status.border}`,
          borderRadius: 6,
          padding: '3px 8px',
          color: status.color,
          fontWeight: 600,
          fontSize: 11,
          marginTop: 8,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: status.color }} />
        {status.label}
      </div>
    </div>
  );
}

export default function WaterLevelChart({ readings, station, timeRange, height = 480 }: WaterLevelChartProps) {
  const refName = station?.referencePointName || 'จุดอ้างอิง';

  const warnVal =
    station?.warningLevel !== null && station?.warningLevel !== undefined && !isNaN(Number(station.warningLevel))
      ? Number(station.warningLevel)
      : (station as any)?.warning_level !== null && (station as any)?.warning_level !== undefined && !isNaN(Number((station as any).warning_level))
      ? Number((station as any).warning_level)
      : null;

  const critVal =
    station?.criticalLevel !== null && station?.criticalLevel !== undefined && !isNaN(Number(station.criticalLevel))
      ? Number(station.criticalLevel)
      : (station as any)?.critical_level !== null && (station as any)?.critical_level !== undefined && !isNaN(Number((station as any).critical_level))
      ? Number((station as any).critical_level)
      : null;

  const hasWarning = warnVal !== null;
  const hasCritical = critVal !== null;

  const data = useMemo(() => {
    return readings.map((r) => {
      let displayTime = '';
      let fullTime = '';
      try {
        const d = new Date(r.timestamp);
        if (!isNaN(d.getTime())) {
          if (timeRange === 'hourly') {
            displayTime = format(d, 'HH:mm');
          } else if (timeRange === 'daily') {
            displayTime = format(d, 'dd/MM HH:mm');
          } else {
            displayTime = format(d, 'dd/MM HH:mm');
          }
          fullTime = `${format(d, 'dd/MM/yyyy · HH:mm:ss')} น.`;
        } else {
          displayTime = r.label || String(r.timestamp);
          fullTime = r.label || String(r.timestamp);
        }
      } catch {
        displayTime = r.label || String(r.timestamp);
        fullTime = r.label || String(r.timestamp);
      }

      return {
        time: displayTime,
        level: r.level,
        fullTime,
        rawDistance: r.rawDistance,
        minLevel: r.minLevel,
        maxLevel: r.maxLevel,
        count: r.count,
      };
    });
  }, [readings, timeRange]);

  // Dynamic YAxis domain that guarantees ReferenceLines are NEVER clipped
  const yDomain = useMemo(() => {
    const validLevels = data
      .map((d) => d.level)
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    let min = validLevels.length > 0 ? Math.min(...validLevels) : -0.2;
    let max = validLevels.length > 0 ? Math.max(...validLevels) : 0.2;

    // Always include reference point (0.00m)
    min = Math.min(min, 0);
    max = Math.max(max, 0);

    // Include warning level
    if (warnVal !== null) {
      min = Math.min(min, warnVal);
      max = Math.max(max, warnVal);
    }

    // Include critical level
    if (critVal !== null) {
      min = Math.min(min, critVal);
      max = Math.max(max, critVal);
    }

    // Add breathing room padding (20% of range, at least 0.15m)
    const span = Math.max(max - min, 0.4);
    const pad = Math.max(span * 0.18, 0.15);

    const calculatedMin = Number((min - pad).toFixed(2));
    const calculatedMax = Number((max + pad).toFixed(2));

    return [calculatedMin, calculatedMax];
  }, [data, warnVal, critVal]);

  return (
    <ResponsiveContainer
      width="100%"
      height={height}
      minWidth="100%"
      minHeight={height}
      initialDimension={{ width: 350, height: height }}
    >
      <ComposedChart data={data} margin={{ top: 20, right: 32, left: 8, bottom: 6 }}>
        <defs>
          <linearGradient id="levelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.01} />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255, 255, 255, 0.07)"
          vertical={false}
        />

        <XAxis
          dataKey="time"
          tick={{ fill: '#64748B', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis
          tick={{ fill: '#64748B', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)} ม.`}
          width={64}
          domain={yDomain}
          allowDataOverflow={false}
        />

        <Tooltip content={<CustomTooltip station={station} />} />

        {/* 0.00m Reference Point line */}
        <ReferenceLine
          y={0}
          stroke="#0284C7"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          ifOverflow="extendDomain"
          label={{
            value: `${refName} (0.00 ม.)`,
            position: 'insideTopRight',
            fill: '#38BDF8',
            fontSize: 11,
            fontWeight: 600,
          }}
        />

        {/* Warning level reference line */}
        {hasWarning && warnVal !== null && (
          <ReferenceLine
            y={warnVal}
            stroke="#F59E0B"
            strokeDasharray="6 4"
            strokeWidth={2}
            ifOverflow="extendDomain"
            label={{
              value: `เกณฑ์เฝ้าระวัง (${warnVal >= 0 ? '+' : ''}${warnVal.toFixed(2)} ม.)`,
              position: 'insideTopRight',
              fill: '#F59E0B',
              fontSize: 11,
              fontWeight: 700,
            }}
          />
        )}

        {/* Critical level reference line */}
        {hasCritical && critVal !== null && (
          <ReferenceLine
            y={critVal}
            stroke="#EF4444"
            strokeDasharray="6 4"
            strokeWidth={2}
            ifOverflow="extendDomain"
            label={{
              value: `เกณฑ์วิกฤต (${critVal >= 0 ? '+' : ''}${critVal.toFixed(2)} ม.)`,
              position: 'insideTopRight',
              fill: '#EF4444',
              fontSize: 11,
              fontWeight: 700,
            }}
          />
        )}

        {/* Area fill */}
        <Area
          type="monotone"
          dataKey="level"
          fill="url(#levelGrad)"
          stroke="none"
          isAnimationActive={true}
        />

        {/* Main line */}
        <Line
          type="monotone"
          dataKey="level"
          stroke="url(#lineGrad)"
          strokeWidth={2.5}
          dot={data.length <= 12 ? { r: 3.5, fill: '#38BDF8', stroke: '#fff', strokeWidth: 1.5 } : false}
          activeDot={{ r: 5, fill: '#38BDF8', stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={true}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

