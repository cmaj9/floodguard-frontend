import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircleIcon, AlertTriangleIcon, XCircleIcon, LayersIcon } from '../ui/Icons';

interface CapacityDonutChartProps {
  normalCount: number;
  warningCount: number;
  criticalCount: number;
  isLoading?: boolean;
}

export default function CapacityDonutChart({
  normalCount,
  warningCount,
  criticalCount,
  isLoading,
}: CapacityDonutChartProps) {
  const total = normalCount + warningCount + criticalCount || 1;

  // The Donut Discipline: Maximum 2-3 segments strictly mapped to status tokens
  const data = [
    { name: 'สภาวะปกติ', value: normalCount, color: '#10B981', key: 'normal' },
    { name: 'เกณฑ์เฝ้าระวัง', value: warningCount, color: '#F59E0B', key: 'advisory' },
    { name: 'สภาวะวิกฤต', value: criticalCount, color: '#EF4444', key: 'critical' },
  ].filter((item) => item.value > 0 || (normalCount === 0 && warningCount === 0 && criticalCount === 0));

  // If no data yet, provide fallback 100% normal slice
  const chartData = data.length > 0 ? data : [{ name: 'สภาวะปกติ', value: 1, color: '#10B981', key: 'normal' }];

  const normalPct = Math.round((normalCount / total) * 100);

  return (
    <div className="bento-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="bento-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ color: 'var(--cyan-glow)', display: 'flex', alignItems: 'center' }}>
            <LayersIcon size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              สัดส่วนสถานการณ์น้ำ
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.125rem 0 0 0' }}>
              ความจุและการกระจายตัว 3 ระดับ
            </p>
          </div>
        </div>
      </div>

      {/* Donut Body */}
      <div
        className="bento-card-body"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '1rem',
        }}
      >
        {isLoading ? (
          <div
            className="skeleton-box"
            style={{ width: 160, height: 160, borderRadius: '50%', margin: '1rem 0' }}
          />
        ) : (
          <div style={{ position: 'relative', width: '100%', height: 170 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="rgba(8, 12, 20, 0.6)"
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={`cell-${entry.key}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} จุด (${Math.round((Number(val) / total) * 100)}%)`, name]}
                  contentStyle={{
                    background: 'rgba(12, 14, 18, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Central Metric Callout */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {normalPct}%
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                ระดับปกติ
              </div>
            </div>
          </div>
        )}

        {/* Dual-Coded Legend (Always Icon + Plain-text label) */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginTop: '0.75rem',
          }}
        >
          {/* Normal */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              padding: '0.375rem 0.5rem',
              borderRadius: '0.375rem',
              background: 'rgba(16, 185, 129, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#10B981' }}>
              <CheckCircleIcon size={14} />
              <span style={{ fontWeight: 500 }}>ปกติ (ปลอดภัย)</span>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {normalCount} จุด
            </span>
          </div>

          {/* Warning */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              padding: '0.375rem 0.5rem',
              borderRadius: '0.375rem',
              background: 'rgba(245, 158, 11, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#F59E0B' }}>
              <AlertTriangleIcon size={14} />
              <span style={{ fontWeight: 500 }}>เฝ้าระวัง</span>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {warningCount} จุด
            </span>
          </div>

          {/* Critical */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              padding: '0.375rem 0.5rem',
              borderRadius: '0.375rem',
              background: 'rgba(239, 68, 68, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#EF4444' }}>
              <XCircleIcon size={14} />
              <span style={{ fontWeight: 500 }}>วิกฤต (ล้นตลิ่ง)</span>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {criticalCount} จุด
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
