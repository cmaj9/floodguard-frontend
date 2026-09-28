import { useState, useEffect } from 'react';
import type { Station, Reading } from '../../types';
import { fetchReadingsByStation } from '../../services/apiService';
import {
  ActivityIcon,
  BatteryChargingIcon,
  BatteryLowIcon,
  ThermometerIcon,
  ClockIcon,
} from '../ui/Icons';

interface StationRecentReadingsCardProps {
  station: Station;
}

function formatReadingTime(timestamp: unknown): string {
  if (!timestamp) return '-';
  try {
    const d = new Date(timestamp as string | number | Date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '-';
  }
}

export default function StationRecentReadingsCard({ station }: StationRecentReadingsCardProps) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Fetch exactly 5 latest readings as requested
    fetchReadingsByStation(station.id, 5)
      .then((data) => {
        if (isMounted) setReadings(data || []);
      })
      .catch(() => {
        if (isMounted) setReadings([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [station.id]);

  const hasWarn = station.warningLevel !== undefined && station.warningLevel !== null && !isNaN(Number(station.warningLevel));
  const hasCrit = station.criticalLevel !== undefined && station.criticalLevel !== null && !isNaN(Number(station.criticalLevel));
  const warningLevel = hasWarn ? Number(station.warningLevel) : null;
  const criticalLevel = hasCrit ? Number(station.criticalLevel) : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: '#111827',
        borderRadius: '1.25rem',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* ── Card Header ── */}
      <div
        className="recent-readings-header"
        style={{
          padding: '0.875rem 1.25rem',
          background: '#111827',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ color: 'var(--cyan-glow)', display: 'flex', alignItems: 'center' }}>
            <ActivityIcon size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#F8FAFC',
                margin: 0,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              ประวัติการตรวจวัด
            </h2>
            <span
              style={{
                fontSize: '0.8125rem',
                color: 'var(--cyan-glow)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              5 รายการล่าสุด
            </span>
          </div>
        </div>

        <span
          style={{
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <ClockIcon size={14} style={{ color: 'var(--sky-highlight)' }} />
          <span>บันทึกทุก 5 นาที</span>
        </span>
      </div>

      {/* ── Table Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="skeleton-box"
                style={{ height: '48px', width: '100%', borderRadius: '0.5rem' }}
              />
            ))}
          </div>
        ) : readings.length > 0 ? (
          <>
            <div className="recent-readings-table-wrap">
              <table
                className="recent-readings-table"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                }}
              >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  fontSize: '0.875rem',
                }}
              >
                <th style={{ padding: '0.85rem 1.125rem', fontWeight: 600 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <ClockIcon size={14} /> เวลาบันทึก
                  </span>
                </th>
                <th style={{ padding: '0.85rem 1.125rem', fontWeight: 600 }}>
                  ระดับน้ำ ({station.referencePointName || 'จุดอ้างอิง'})
                </th>
                <th style={{ padding: '0.85rem 1.125rem', fontWeight: 600 }}>สถานะ</th>
                <th style={{ padding: '0.85rem 1.125rem', fontWeight: 600 }}>แบตเตอรี่</th>
                <th style={{ padding: '0.85rem 1.125rem', fontWeight: 600 }}>อุณหภูมิ</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r, idx) => {
                const lvl = r.water_level !== null ? Number(r.water_level) : null;
                const isCrit = r.water_status === 'critical' || (lvl !== null && hasCrit && lvl >= criticalLevel!);
                const isWarn = !isCrit && (r.water_status === 'warning' || (lvl !== null && hasWarn && lvl >= warningLevel!));

                const statusBg = isCrit
                  ? 'rgba(239, 68, 68, 0.15)'
                  : isWarn
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)';
                const statusBorder = isCrit
                  ? 'rgba(239, 68, 68, 0.35)'
                  : isWarn
                  ? 'rgba(245, 158, 11, 0.35)'
                  : 'rgba(16, 185, 129, 0.35)';
                const statusColor = isCrit ? '#EF4444' : isWarn ? '#F59E0B' : '#10B981';
                const statusText = isCrit ? 'วิกฤต' : isWarn ? 'เฝ้าระวัง' : 'ปกติ';

                const batt = r.battery_percent !== null ? Number(r.battery_percent) : null;
                const battColor =
                  batt === null ? 'var(--text-secondary)' : batt > 50 ? '#10B981' : batt > 20 ? '#F59E0B' : '#EF4444';

                return (
                  <tr
                    key={r.reading_id || idx}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Time */}
                    <td
                      style={{
                        padding: '0.85rem 1.125rem',
                        color: 'var(--text-secondary)',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                      }}
                    >
                      {formatReadingTime(r.timestamp)}
                    </td>

                    {/* Water Level */}
                    <td style={{ padding: '0.85rem 1.125rem' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: 'var(--cyan-glow)',
                          fontFamily: 'monospace',
                          fontSize: '1.0625rem',
                        }}
                      >
                        {lvl !== null ? (lvl > 0 ? '+' : '') + lvl.toFixed(2) : '-'}
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginLeft: 4 }}>
                        ม.
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '0.85rem 1.125rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '9999px',
                          background: statusBg,
                          border: `1px solid ${statusBorder}`,
                          color: statusColor,
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: statusColor,
                          }}
                        />
                        {statusText}
                      </span>
                    </td>

                    {/* Battery */}
                    <td style={{ padding: '0.85rem 1.125rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          color: battColor,
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                        }}
                      >
                        {batt !== null && batt <= 20 ? (
                          <BatteryLowIcon size={15} />
                        ) : (
                          <BatteryChargingIcon size={15} />
                        )}
                        <span>{batt !== null ? `${batt}%` : '-'}</span>
                      </span>
                    </td>

                    {/* Temperature */}
                    <td style={{ padding: '0.85rem 1.125rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#E2E8F0',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        <ThermometerIcon size={14} style={{ color: '#F59E0B' }} />
                        <span>{r.temperature !== null ? `${Number(r.temperature).toFixed(1)}°C` : '-'}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Hybrid Responsive Data Cards (<= 768px) */}
        <div className="recent-readings-cards">
          {readings.map((r, idx) => {
            const lvl = r.water_level !== null ? Number(r.water_level) : null;
            const isCrit = lvl !== null && hasCrit && lvl >= criticalLevel!;
            const isWarn = lvl !== null && !isCrit && hasWarn && lvl >= warningLevel!;

            const statusBorder = isCrit
              ? '#EF4444'
              : isWarn
              ? '#F59E0B'
              : '#10B981';
            const statusText = isCrit ? 'วิกฤต' : isWarn ? 'เฝ้าระวัง' : 'ปกติ';
            const statusBg = isCrit
              ? 'rgba(239, 68, 68, 0.15)'
              : isWarn
              ? 'rgba(245, 158, 11, 0.15)'
              : 'rgba(16, 185, 129, 0.15)';

            const batt = r.battery_percent !== null ? Number(r.battery_percent) : null;
            const battColor =
              batt === null ? 'var(--text-secondary)' : batt > 50 ? '#10B981' : batt > 20 ? '#F59E0B' : '#EF4444';

            return (
              <div
                key={r.reading_id || idx}
                className="reading-mobile-card"
                style={{
                  borderLeft: `3.5px solid ${statusBorder}`,
                }}
              >
                {/* Left: Time & Reference Point */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', width: '74px', minWidth: '74px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <ClockIcon size={11} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 700, color: '#F8FAFC', whiteSpace: 'nowrap' }}>
                      {formatReadingTime(r.timestamp)}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {station.referencePointName || 'ขอบตะลิ่ง'}
                  </span>
                </div>

                {/* Middle: Water Level & Status Badge (Centered) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '1.0625rem', fontWeight: 800, color: 'var(--cyan-glow)', whiteSpace: 'nowrap' }}>
                    {lvl !== null ? (lvl > 0 ? '+' : '') + lvl.toFixed(2) : '-'}
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '2px' }}>
                      ม.
                    </span>
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      background: statusBg,
                      border: `1px solid ${statusBorder}50`,
                      color: statusBorder,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusBorder }} />
                    {statusText}
                  </span>
                </div>

                {/* Right: Battery & Temperature */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', width: '92px', minWidth: '92px', flexShrink: 0 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      color: battColor,
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  >
                    {batt !== null && batt <= 20 ? (
                      <BatteryLowIcon size={12} />
                    ) : (
                      <BatteryChargingIcon size={12} />
                    )}
                    <span>{batt !== null ? `${batt}%` : '-'}</span>
                  </span>
                  {r.temperature !== null && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        color: '#94A3B8',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      <ThermometerIcon size={11} style={{ color: '#F59E0B' }} />
                      <span>{Number(r.temperature).toFixed(1)}°</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    ) : (
          <div
            style={{
              padding: '2.5rem 1.25rem',
              color: 'var(--text-secondary)',
              fontSize: '0.8125rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              margin: 'auto 0',
            }}
          >
            <ActivityIcon size={24} style={{ color: 'var(--text-muted)' }} />
            <span>ยังไม่มีประวัติการส่งสัญญาณล่าสุด</span>
          </div>
        )}
      </div>

      {/* ── Card Footer ── */}
      <div
        style={{
          marginTop: 'auto',
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '6px 14px',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
          flexShrink: 0,
        }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>
          สถานี <strong style={{ color: '#FFFFFF' }}>{station.name}</strong>{' '}
          <span style={{ color: 'var(--sky-highlight)', fontFamily: 'monospace', fontWeight: 700 }}>({station.id})</span>
        </span>
        <span style={{ whiteSpace: 'nowrap' }}>
          เกณฑ์เฝ้าระวัง{' '}
          <strong style={{ color: '#F59E0B' }}>
            {hasWarn && warningLevel !== null ? `${warningLevel >= 0 ? '+' : ''}${warningLevel.toFixed(2)}ม.` : 'ไม่กำหนด'}
          </strong>{' '}
          · วิกฤต{' '}
          <strong style={{ color: '#EF4444' }}>
            {hasCrit && criticalLevel !== null ? `${criticalLevel >= 0 ? '+' : ''}${criticalLevel.toFixed(2)}ม.` : 'ไม่กำหนด'}
          </strong>
        </span>
      </div>
    </div>
  );
}
