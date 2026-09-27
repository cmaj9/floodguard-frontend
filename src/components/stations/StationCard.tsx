import type { Station, WaterStatus } from '../../types';
import {
  MapPinIcon,
  AlertTriangleIcon,
  XCircleIcon,
  BatteryChargingIcon,
  BatteryLowIcon,
  ThermometerIcon,
  DropletsIcon,
} from '../ui/Icons';

const statusColors: Record<WaterStatus, { bg: string; border: string; text: string; fill: string }> = {
  normal: { bg: 'var(--color-normal-dim)', border: 'rgba(16,185,129,0.25)', text: 'var(--color-normal)', fill: 'var(--color-normal)' },
  warning: { bg: 'var(--color-warning-dim)', border: 'rgba(245,158,11,0.3)', text: 'var(--color-warning)', fill: 'var(--color-warning)' },
  critical: { bg: 'var(--color-critical-dim)', border: 'rgba(239,68,68,0.35)', text: 'var(--color-critical)', fill: 'var(--color-critical)' },
  unknown: { bg: 'var(--bg-surface)', border: 'var(--border)', text: 'var(--text-muted)', fill: 'var(--border)' },
};
const statusLabel: Record<WaterStatus, string> = {
  normal: 'ปกติ',
  warning: 'เฝ้าระวัง',
  critical: 'วิกฤต',
  unknown: 'ไม่ทราบสถานะ',
};

interface StationCardProps {
  station: Station;
  selected?: boolean;
  onClick?: () => void;
}

export default function StationCard({ station, selected, onClick }: StationCardProps) {
  const isOffline = !station.isActive || (station as any).operatingStatus === 'offline';
  const colors = statusColors[station.status];
  const maxLvl = station.maxLevel || 10;
  const pct = isOffline ? 0 : Math.max(0, Math.min(100, (station.currentLevel / maxLvl) * 100));
  const hasWarn = station.warningLevel !== undefined && station.warningLevel !== null;
  const hasCrit = station.criticalLevel !== undefined && station.criticalLevel !== null;
  const warningPct = hasWarn ? Math.max(0, Math.min(100, (station.warningLevel! / maxLvl) * 100)) : null;
  const criticalPct = hasCrit ? Math.max(0, Math.min(100, (station.criticalLevel! / maxLvl) * 100)) : null;

  return (
    <div
      className={`stat-card status-${station.status}`}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        border: selected ? '2px solid #38BDF8' : `1px solid ${colors.border}`,
        position: 'relative',
        overflow: 'hidden',
        animationDelay: '0.05s',
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {station.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPinIcon size={12} />
            <span>{station.lat.toFixed(4)}, {station.lng.toFixed(4)}</span>
          </div>
        </div>
        <span
          className={`badge ${isOffline ? 'badge-unknown' : `badge-${station.status}`}`}
          style={{ flexShrink: 0, fontSize: 11 }}
        >
          <span className="badge-dot" />
          {isOffline ? 'ออฟไลน์' : statusLabel[station.status]}
        </span>
      </div>

      {/* Level value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0' }}>
        <span className="stat-value" style={{ color: isOffline ? 'var(--text-muted)' : colors.text, fontSize: 32 }}>
          {isOffline ? '-' : (station.currentLevel > 0 ? '+' : '') + station.currentLevel.toFixed(2)}
        </span>
        {!isOffline && <span className="stat-unit">ม.</span>}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          เทียบ {station.referencePointName || 'จุดอ้างอิง'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="water-bar-wrap">
        <div className="water-bar-track" style={{ position: 'relative' }}>
          <div
            className="water-bar-fill"
            style={{
              width: `${pct}%`,
              background: isOffline ? '#475569' : colors.fill,
            }}
          />
          {/* Warning line */}
          {hasWarn && warningPct !== null && (
            <div
              className="water-bar-warning-line"
              role="img"
              aria-label={`เส้นเฝ้าระวัง ${station.warningLevel} ม.`}
              style={{ left: `${warningPct}%`, position: 'absolute', top: -3, bottom: -3, width: 2, background: 'var(--color-warning)' }}
              title={`เฝ้าระวัง ${station.warningLevel} ม.`}
            />
          )}
          {/* Critical line */}
          {hasCrit && criticalPct !== null && (
            <div
              role="img"
              aria-label={`เส้นวิกฤต ${station.criticalLevel} ม.`}
              style={{ left: `${criticalPct}%`, position: 'absolute', top: -3, bottom: -3, width: 2, background: 'var(--color-critical)' }}
              title={`วิกฤต ${station.criticalLevel} ม.`}
            />
          )}
        </div>
        <div className="water-bar-labels" style={{ marginTop: 4 }}>
          <span>0</span>
          {hasWarn && (
            <span style={{ color: 'var(--color-warning)', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <AlertTriangleIcon size={10} />
              <span>{station.warningLevel}ม.</span>
            </span>
          )}
          {hasCrit && (
            <span style={{ color: 'var(--color-critical)', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <XCircleIcon size={10} />
              <span>{station.criticalLevel}ม.</span>
            </span>
          )}
        </div>
      </div>

      {/* Hardware Sensors */}
      {(station.batteryPercent !== undefined || station.temperature !== undefined) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(0,212,255,0.05)' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {station.batteryPercent !== undefined && (
              <span
                title={`แรงดัน ${station.batteryVoltage}V`}
                style={{
                  color: station.batteryPercent <= 20 ? 'var(--color-critical)' : 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                {station.batteryPercent > 20 ? <BatteryChargingIcon size={13} style={{ color: station.batteryPercent > 50 ? '#10B981' : '#F59E0B' }} /> : <BatteryLowIcon size={13} style={{ color: '#EF4444' }} />}
                <span>{station.batteryPercent}%</span>
                <span style={{ width: 22, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', display: 'inline-block', marginLeft: 2 }}>
                  <span style={{ display: 'block', width: `${Math.min(100, Math.max(0, station.batteryPercent))}%`, height: '100%', background: station.batteryPercent > 50 ? '#10B981' : station.batteryPercent > 20 ? '#F59E0B' : '#EF4444', borderRadius: 2 }} />
                </span>
              </span>
            )}
            {station.temperature !== undefined && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <ThermometerIcon size={13} />
                <span>{station.temperature}°C</span>
              </span>
            )}
            {station.humidity !== undefined && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <DropletsIcon size={13} />
                <span>{station.humidity}%</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        <span>{station.deviceId} {!station.isActive && '· ออฟไลน์'}</span>
        <span>{station.province}</span>
      </div>
    </div>
  );
}
