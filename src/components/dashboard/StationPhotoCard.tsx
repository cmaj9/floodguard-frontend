import { memo } from 'react';
import type { Station } from '../../types';
import { GaugeIcon } from '../ui/Icons';
import { getStationImage, getStationTypeMeta } from '../../utils/stationImages';
import { isStationOnline } from '../../utils/stationStatus';

interface StationPhotoCardProps {
  station: Station;
  isSelected: boolean;
  onSelect: (stationId: string) => void;
}

export const StationPhotoCard = memo(function StationPhotoCard({
  station,
  isSelected,
  onSelect,
}: StationPhotoCardProps) {
  const typeMeta = getStationTypeMeta(station.stationType);
  const imageUrl = station.imageUrl || getStationImage(station);

  const isOnline = isStationOnline(station);
  const battery = station.batteryPercent !== undefined ? Math.max(0, Math.min(100, station.batteryPercent)) : 80;

  const hasReading = Boolean(
    station.lastReadingTime ||
    station.rawDistance !== null && station.rawDistance !== undefined ||
    station.currentLevel !== null && station.currentLevel !== undefined
  );

  // Format water level (retained and viewable even when station is offline)
  const formattedLevel = hasReading && typeof station.currentLevel === 'number'
    ? (station.currentLevel > 0 ? '+' : '') + station.currentLevel.toFixed(2)
    : '-';

  // Value color: use cyan or green for normal, amber for warning, red for critical
  let levelColor = '#38bdf8'; // Sky cyan
  if (station.status === 'critical') {
    levelColor = '#ef4444';
  } else if (station.status === 'warning') {
    levelColor = '#f59e0b';
  } else if (station.currentLevel !== null && station.currentLevel < 0) {
    levelColor = '#38bdf8';
  } else {
    levelColor = '#818cf8';
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(station.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(station.id);
        }
      }}
      aria-label={`เลือกสถานี ${station.name}`}
      aria-pressed={isSelected}
      className={`station-photo-card ${isSelected ? 'selected' : ''}`}
      style={{
        background: 'var(--card-surface, #0C0E12)',
        borderRadius: '1.25rem',
        border: isSelected
          ? '2px solid #0284c7'
          : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isSelected
          ? '0 8px 24px rgba(0,0,0,0.5)'
          : '0 4px 16px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease, box-shadow 0.2s ease',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* ── 1. PHOTO HEADER ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '148px',
          overflow: 'hidden',
          background: '#07090C',
        }}
      >
        <img
          src={imageUrl}
          alt={station.name}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.3s ease',
          }}
          onError={(e) => {
            // Fallback to SVG illustration on network error
            e.currentTarget.src = getStationImage(station);
          }}
        />

        {/* Ambient bottom gradient overlay for smooth transition to card body */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(12, 14, 18, 0.05) 40%, rgba(12, 14, 18, 0.85) 85%, #0C0E12 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top-Left Station Type Badge */}
        <div
          style={{
            position: 'absolute',
            top: '0.625rem',
            left: '0.625rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            background: typeMeta.bg,
            border: `1px solid ${typeMeta.border}`,
            color: typeMeta.color,
            fontSize: '0.6875rem',
            fontWeight: 700,
            backdropFilter: 'blur(8px)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            letterSpacing: '0.02em',
          }}
        >
          <GaugeIcon size={12} />
          <span>{typeMeta.label}</span>
        </div>

        {/* Top-Right Online/Offline Status Badge */}
        <div
          style={{
            position: 'absolute',
            top: '0.625rem',
            right: '0.625rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            background: isOnline ? '#10B981' : '#64748B',
            color: '#ffffff',
            fontSize: '0.6875rem',
            fontWeight: 700,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
            letterSpacing: '0.02em',
          }}
        >
          {isOnline ? (!hasReading ? 'ออนไลน์ (รอข้อมูล)' : 'ออนไลน์') : 'ออฟไลน์'}
        </div>
      </div>

      {/* ── 2. CARD CONTENT ── */}
      <div
        style={{
          padding: '0.875rem 1rem 1rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          gap: '0.75rem',
        }}
      >
        {/* Station Name */}
        <h3
          title={station.name}
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: '#F8FAFC',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {station.name}
        </h3>

        {/* Level and Battery Readout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          {/* Water Level */}
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '0.6875rem',
                color: '#94A3B8',
                marginBottom: '0.125rem',
              }}
            >
              ระดับน้ำ ({station.referencePointName || 'จุดอ้างอิง'})
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.25rem',
              }}
            >
              <span
                style={{
                  fontSize: '1.4375rem',
                  fontWeight: 800,
                  color: levelColor,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formattedLevel}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#94A3B8',
                  fontWeight: 500,
                }}
              >
                m
              </span>
            </div>
          </div>

          {/* Battery Status */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <span
              style={{
                fontSize: '0.625rem',
                color: '#94A3B8',
                marginBottom: '0.15rem',
              }}
            >
              แบตเตอรี่
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: battery > 0 ? '#E2E8F0' : '#64748B',
                marginBottom: '0.25rem',
              }}
            >
              {`${battery}%`}
            </span>
            {/* Battery Mini Progress Bar */}
            <div
              style={{
                width: '46px',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  transform: `scaleX(${battery / 100})`,
                  transformOrigin: 'left',
                  background:
                    battery > 20
                      ? '#10B981'
                      : battery > 0
                      ? '#F59E0B'
                      : '#475569',
                  borderRadius: '9999px',
                  transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default StationPhotoCard;
