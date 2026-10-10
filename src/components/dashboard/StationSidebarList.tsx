import { useState, useMemo, memo } from 'react';
import type { Station } from '../../types';
import { SearchIcon, GaugeIcon, ArrowRightIcon } from '../ui/Icons';

interface StationSidebarListProps {
  stations: Station[];
  selectedStation: string | null;
  onSelectStation: (stationId: string) => void;
}

type FilterCategory = 'ทั้งหมด' | 'ลอยน้ำ' | 'คงที่' | 'Static RS';

export const StationSidebarList = memo(function StationSidebarList({
  stations,
  selectedStation,
  onSelectStation,
}: StationSidebarListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ทั้งหมด');

  // Filter stations by text and category
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      // 1. Text Search
      const matchesQuery =
        searchQuery.trim() === '' ||
        station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.deviceId.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesQuery) return false;

      // 2. Category Filter
      if (activeFilter === 'ทั้งหมด') return true;

      const typeStr = (station.stationType || '').toLowerCase();
      const nameStr = station.name.toLowerCase();

      if (activeFilter === 'Static RS') {
        return (
          typeStr.includes('static') ||
          typeStr.includes('rs') ||
          nameStr.includes('laser') ||
          nameStr.includes('radar')
        );
      }

      if (activeFilter === 'ลอยน้ำ') {
        return (
          typeStr.includes('ลอย') ||
          typeStr.includes('float') ||
          typeStr.includes('buoy') ||
          nameStr.includes('ลอย')
        );
      }

      if (activeFilter === 'คงที่') {
        // Fixed stations (not floating and not static rs)
        return (
          !typeStr.includes('static') &&
          !typeStr.includes('rs') &&
          !typeStr.includes('ลอย') &&
          !nameStr.includes('laser') &&
          !nameStr.includes('radar') &&
          !nameStr.includes('ลอย')
        );
      }

      return true;
    });
  }, [stations, searchQuery, activeFilter]);

  // Group stations into categories for structured display
  const groupedSections = useMemo(() => {
    const floating: Station[] = [];
    const fixed: Station[] = [];
    const staticRs: Station[] = [];

    filteredStations.forEach((station) => {
      const typeStr = (station.stationType || '').toLowerCase();
      const nameStr = station.name.toLowerCase();

      if (
        typeStr.includes('static') ||
        typeStr.includes('rs') ||
        nameStr.includes('laser') ||
        nameStr.includes('radar')
      ) {
        staticRs.push(station);
      } else if (
        typeStr.includes('ลอย') ||
        typeStr.includes('float') ||
        typeStr.includes('buoy') ||
        nameStr.includes('ลอย')
      ) {
        floating.push(station);
      } else {
        fixed.push(station);
      }
    });

    return [
      { title: 'สถานีลอยน้ำ', items: floating, color: '#38bdf8' },
      { title: 'สถานีคงที่', items: fixed, color: '#c084fc' },
      { title: 'สถานี STATIC RS', items: staticRs, color: '#22d3ee' },
    ];
  }, [filteredStations]);

  return (
    <div
      style={{
        background: 'var(--card-surface, #0C0E12)',
        borderRadius: '1.25rem',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '480px',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* ── Search & Filter Controls ── */}
      <div
        style={{
          padding: '1.25rem 1.25rem 0.875rem 1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
        }}
      >
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%' }}>
          <div
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <SearchIcon size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาสถานี..."
            style={{
              width: '100%',
              padding: '0.625rem 1rem 0.625rem 2.5rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.625rem',
              color: '#F8FAFC',
              fontSize: '0.875rem',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--cyan-glow)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
          />
        </div>

        {/* Filter Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            flexWrap: 'wrap',
          }}
        >
          {(['ทั้งหมด', 'ลอยน้ำ', 'คงที่', 'Static RS'] as FilterCategory[]).map((category) => {
            const isActive = activeFilter === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveFilter(category)}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: '9999px',
                  background: isActive ? '#2563EB' : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  border: `1px solid ${isActive ? '#2563EB' : 'rgba(255, 255, 255, 0.08)'}`,
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable Station Groups ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {filteredStations.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: '#64748B',
              fontSize: '0.875rem',
            }}
          >
            ไม่พบสถานีที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          groupedSections.map((group) => {
            // If active filter is set to a specific category, only show that category or non-empty groups
            if (activeFilter !== 'ทั้งหมด') {
              if (activeFilter === 'ลอยน้ำ' && group.title !== 'สถานีลอยน้ำ') return null;
              if (activeFilter === 'คงที่' && group.title !== 'สถานีคงที่') return null;
              if (activeFilter === 'Static RS' && group.title !== 'สถานี STATIC RS') return null;
            }

            return (
              <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {/* Category Header */}
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#64748B',
                    letterSpacing: '0.02em',
                  }}
                >
                  {group.title}
                </div>

                {/* Group items (or empty indicator) */}
                {group.items.length === 0 ? (
                  <div
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      color: '#475569',
                      fontStyle: 'italic',
                    }}
                  >
                    ไม่มีสถานีในหมวดหมู่นี้
                  </div>
                ) : (
                  group.items.map((station) => {
                    const isSelected = selectedStation === station.id;
                    const formattedLevel =
                      typeof station.currentLevel === 'number'
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
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 0.875rem',
                          borderRadius: '0.75rem',
                          background: isSelected
                            ? 'rgba(37, 99, 235, 0.16)'
                            : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected
                            ? '1px solid var(--cyan-glow)'
                            : '1px solid rgba(255, 255, 255, 0.06)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          gap: '0.75rem',
                        }}
                      >
                        {/* Left: Gauge Icon in Circle */}
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: `1px solid ${group.color}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: group.color,
                            flexShrink: 0,
                          }}
                        >
                          <GaugeIcon size={18} />
                        </div>

                        {/* Middle: Station Name & GPS Coordinates */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: isSelected ? '#FFFFFF' : '#F1F5F9',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {station.name}
                          </div>
                          <div
                            style={{
                              fontSize: '0.6875rem',
                              color: '#64748B',
                              marginTop: '0.125rem',
                            }}
                          >
                            {station.lat.toFixed(3)}, {station.lng.toFixed(3)}
                          </div>
                        </div>

                        {/* Right: Water Level & Navigation Chevron */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                color:
                                  station.currentLevel < 0
                                    ? '#22D3EE'
                                    : station.status === 'critical'
                                    ? '#EF4444'
                                    : '#E2E8F0',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formattedLevel} m
                            </div>
                            {!station.isActive && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '0.25rem',
                                  background: '#EF4444',
                                  color: '#FFFFFF',
                                  fontSize: '0.625rem',
                                  fontWeight: 600,
                                  marginTop: '0.15rem',
                                }}
                              >
                                ออฟไลน์
                              </span>
                            )}
                          </div>

                          {/* Arrow Chevron Button */}
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '0.375rem',
                              background: isSelected
                                ? 'var(--cyan-glow)'
                                : 'rgba(255, 255, 255, 0.05)',
                              color: isSelected ? '#000000' : '#94A3B8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ArrowRightIcon size={14} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default StationSidebarList;
