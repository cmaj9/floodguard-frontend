import { memo } from 'react';
import type { Station } from '../../types';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  MapPinIcon,
} from '../ui/Icons';

interface StationSelectorCardsProps {
  stations: Station[];
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
}

export const StationSelectorCards = memo(function StationSelectorCards({
  stations,
  selectedStationId,
  onSelectStation,
}: StationSelectorCardsProps) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>

      {/* ── Bento Station Cards Grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {stations.map((station) => {
          const isSelected = selectedStationId === station.id;
          const isOnline = station.isActive;

          // Status colors & labels (Dual-Coding)
          let statusLabel = 'ปกติ (ปลอดภัย)';
          let statusColor = 'var(--status-normal)';
          let statusBg = 'var(--status-normal-dim)';
          let StatusIcon = CheckCircleIcon;

          if (station.status === 'critical') {
            statusLabel = 'วิกฤต (ล้นตลิ่ง)';
            statusColor = 'var(--status-critical)';
            statusBg = 'var(--status-critical-dim)';
            StatusIcon = XCircleIcon;
          } else if (station.status === 'warning') {
            statusLabel = 'เฝ้าระวังพิเศษ';
            statusColor = 'var(--status-advisory)';
            statusBg = 'var(--status-advisory-dim)';
            StatusIcon = AlertTriangleIcon;
          } else if (!isOnline) {
            statusLabel = 'ออฟไลน์';
            statusColor = 'var(--text-muted)';
            statusBg = 'rgba(100, 116, 139, 0.12)';
            StatusIcon = AlertTriangleIcon;
          }

          const formattedLevel =
            !isOnline
              ? '-'
              : typeof station.currentLevel === 'number'
              ? (station.currentLevel > 0 ? '+' : '') + station.currentLevel.toFixed(2)
              : '0.00';

          return (
            <div
              key={station.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectStation(station.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectStation(station.id);
                }
              }}
              aria-label={`เลือกสถานี ${station.id} ${station.name}`}
              aria-pressed={isSelected}
              style={{
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(37, 99, 235, 0.15) 100%)'
                  : 'var(--card-surface)',
                borderRadius: '1rem',
                border: isSelected
                  ? '2px solid #0284c7'
                  : '1px solid var(--card-border-subtle)',
                boxShadow: isSelected
                  ? '0 4px 16px rgba(0, 0, 0, 0.4)'
                  : '0 2px 8px rgba(0, 0, 0, 0.3)',
                padding: '1rem 1.125rem',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                userSelect: 'none',
                position: 'relative',
              }}
            >
              {/* Card Header: Station ID pill + Live Online Beacon */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontFamily: 'monospace, inherit',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: isSelected ? '#38BDF8' : 'var(--text-primary)',
                      background: isSelected
                        ? 'rgba(2, 132, 199, 0.15)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isSelected ? '#0284c7' : 'var(--card-border)'}`,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '0.375rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {station.id}
                  </span>

                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--text-secondary)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '0.25rem',
                    }}
                  >
                    {station.stationType || 'สถานีวัดน้ำ'}
                  </span>
                </div>

                {/* Pulsing Beacon Dot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: isOnline ? '#10B981' : '#64748B',
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: isOnline ? '#10B981' : '#94A3B8',
                      fontWeight: 600,
                    }}
                  >
                    {isOnline ? 'เชื่อมต่อสด' : 'ออฟไลน์'}
                  </span>
                </div>
              </div>

              {/* Station Name & Location */}
              <div>
                <h3
                  title={station.name}
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                    margin: '0 0 0.25rem 0',
                    lineHeight: 1.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {station.name}
                </h3>

                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <MapPinIcon size={12} style={{ color: 'var(--cyan-glow)', flexShrink: 0 }} />
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {station.location || `${station.district || ''} ${station.province || ''}`}
                  </span>
                </div>
              </div>

              {/* Bottom Row: Current Water Level & Qualitative Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--text-secondary)',
                      display: 'block',
                      marginBottom: '0.125rem',
                    }}
                  >
                    ระดับน้ำ ({station.referencePointName || 'จุดอ้างอิง'})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    <span
                      style={{
                        fontSize: '1.375rem',
                        fontWeight: 800,
                        fontFamily: 'monospace, inherit',
                        color: isSelected ? '#38BDF8' : 'var(--text-primary)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {formattedLevel}
                    </span>
                    {isOnline && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ม.</span>}
                  </div>
                </div>

                {/* Qualitative Context Badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '9999px',
                    background: statusBg,
                    border: `1px solid ${statusColor}40`,
                    color: statusColor,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                  }}
                >
                  <StatusIcon size={12} />
                  <span>{statusLabel}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default StationSelectorCards;
