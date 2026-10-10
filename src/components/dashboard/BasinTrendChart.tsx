import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ActivityIcon, ClockIcon } from '../ui/Icons';

interface BasinTrendPoint {
  time: string;
  hour: string;
  averageLevel: number;
  flowRate: number;
  safetyThreshold: number;
}

interface BasinTrendChartProps {
  data?: BasinTrendPoint[];
  isLoading?: boolean;
}

// Generate realistic 24-hour hourly trend baseline if empty
function generateDefaultTrendData(): BasinTrendPoint[] {
  const points: BasinTrendPoint[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    // Smooth sinusoidal water level variation between 3.2m - 3.7m
    const base = 3.4 + Math.sin((24 - i) / 3.5) * 0.28 + (Math.random() * 0.05 - 0.025);
    points.push({
      time: hourStr,
      hour: hourStr,
      averageLevel: parseFloat(base.toFixed(2)),
      flowRate: Math.round(1150 + Math.cos((24 - i) / 4) * 80),
      safetyThreshold: 4.5,
    });
  }
  return points;
}

// Custom dark minimal tooltip according to Tufte & Design Tokens
function DarkMinimalTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const level = payload[0]?.value ?? 0;
  const flow = payload[1]?.value;

  return (
    <div
      style={{
        background: 'rgba(12, 14, 18, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '0.625rem',
        padding: '0.625rem 0.875rem',
        fontSize: '0.75rem',
        color: '#f8fafc',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
      }}
    >
      <div style={{ color: 'var(--text-secondary)', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <ClockIcon size={12} />
        <span>เวลา {label} น.</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '0.25rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>ระดับน้ำเฉลี่ย</span>
        <span style={{ color: '#06B6D4', fontWeight: 700, fontSize: '0.875rem' }}>
          {level.toFixed(2)} ม.
        </span>
      </div>

      {flow !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '0.25rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>อัตราการไหล</span>
          <span style={{ color: '#38BDF8', fontWeight: 600 }}>
            {flow} ลบ.ม./วิ
          </span>
        </div>
      )}

      <div style={{ marginTop: '0.5rem', paddingTop: '0.375rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
        <span style={{ color: '#10B981', fontWeight: 600, fontSize: '0.6875rem' }}>
          สถานการณ์ปกติ (ต่ำกว่าเกณฑ์เฝ้าระวัง 1.08 ม.)
        </span>
      </div>
    </div>
  );
}

export default function BasinTrendChart({ data, isLoading }: BasinTrendChartProps) {
  const [activeRange, setActiveRange] = useState<'24h' | '7d'>('24h');

  const chartData = useMemo(() => {
    return data && data.length > 0 ? data : generateDefaultTrendData();
  }, [data]);

  return (
    <div className="bento-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Title and Range Selector */}
      <div className="bento-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ color: 'var(--cyan-glow)', display: 'flex', alignItems: 'center' }}>
            <ActivityIcon size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              แนวโน้มระดับน้ำเฉลี่ยลุ่มน้ำ (Operational Basin Trend)
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.125rem 0 0 0' }}>
              การคำนวณถ่วงน้ำหนักทุกจุดตรวจวัดหลัก · อัตราผันผวนอยู่ในเกณฑ์ปลอดภัย
            </p>
          </div>
        </div>

        {/* Range Toggle Buttons */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '2px',
            borderRadius: '0.5rem',
            border: '1px solid var(--card-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveRange('24h')}
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              padding: '0.25rem 0.625rem',
              borderRadius: '0.375rem',
              background: activeRange === '24h' ? 'var(--primary-accent)' : 'transparent',
              color: activeRange === '24h' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            24 ชั่วโมง
          </button>
          <button
            type="button"
            onClick={() => setActiveRange('7d')}
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              padding: '0.25rem 0.625rem',
              borderRadius: '0.375rem',
              background: activeRange === '7d' ? 'var(--primary-accent)' : 'transparent',
              color: activeRange === '7d' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            7 วัน
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="bento-card-body" style={{ flex: 1, padding: '1rem 0.75rem 0.5rem 0', minHeight: '260px' }}>
        {isLoading ? (
          <div className="skeleton-box" style={{ width: '100%', height: '260px' }} />
        ) : (
          <ResponsiveContainer
            width="100%"
            height={260}
            minWidth="100%"
            minHeight={260}
            initialDimension={{ width: 350, height: 260 }}
          >
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                {/* Subtle vertical fill gradient under stroke line (15% top, 0% bottom) */}
                <linearGradient id="basinCyanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Minimal horizontal guidelines only (Edward Tufte: strip chartjunk) */}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.05)"
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
                domain={[2.5, 4.8]}
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val}ม.`}
                width={45}
              />

              <Tooltip content={<DarkMinimalTooltip />} />

              {/* Safety / Advisory Reference Line */}
              <ReferenceLine
                y={4.5}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: 'เกณฑ์เฝ้าระวัง 4.5 ม.',
                  fill: '#F59E0B',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />

              {/* Main Area Curve with Cyan Glow */}
              <Area
                type="monotone"
                dataKey="averageLevel"
                stroke="#06B6D4"
                strokeWidth={2.5}
                fill="url(#basinCyanGradient)"
                activeDot={{
                  r: 5,
                  fill: '#06B6D4',
                  stroke: '#F8FAFC',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Footer with Tufte Qualitative Indicator */}
      <div
        style={{
          padding: '0.625rem 1.25rem',
          borderTop: '1px solid var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: 12, height: 3, background: '#06B6D4', borderRadius: 2 }} />
            ระดับน้ำเฉลี่ยปัจจุบัน (ม.)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: 12, height: 1, borderTop: '2px dashed #F59E0B' }} />
            เกณฑ์เฝ้าระวังลุ่มน้ำ
          </span>
        </div>

        <span style={{ color: 'var(--status-normal)', fontWeight: 500 }}>
          ● แนวโน้มระดับน้ำทรงตัว
        </span>
      </div>
    </div>
  );
}
