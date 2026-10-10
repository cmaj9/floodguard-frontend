import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Station } from '../../types';
import { RefreshCwIcon, MapIcon, BarChart3Icon } from '../ui/Icons';

interface FloatingActionDockProps {
  stations: Station[];
  selectedStationId: string | null;
  onSelectStation: (id: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

/**
 * Floating Command Bar / Action Dock (User Idea #3 & Dashboard Concept)
 * Sleek, space-efficient floating pill dock that provides instant high-frequency interactions
 */
export const FloatingActionDock = memo(function FloatingActionDock({
  stations,
  selectedStationId,
  onSelectStation,
  onRefresh,
  isLoading,
}: FloatingActionDockProps) {
  const navigate = useNavigate();

  const handleScrollToMap = () => {
    const mapElement = document.querySelector('.map-container') || document.querySelector('#map-section');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div
      role="toolbar"
      aria-label="แถบคำสั่งด่วน"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'rgba(12, 14, 18, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '9999px',
        padding: '0.35rem 0.5rem',
        boxShadow:
          '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        maxWidth: '94vw',
      }}
    >
      {/* ── Quick Station Switcher Tabs ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.2rem',
          paddingRight: '0.375rem',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {stations.map((st) => {
          const isSelected = selectedStationId === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectStation(st.id)}
              title={`สลับไปสถานี ${st.name}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '9999px',
                background: isSelected
                  ? 'rgba(37, 99, 235, 0.4)'
                  : 'transparent',
                border: isSelected
                  ? '1px solid #38BDF8'
                  : '1px solid transparent',
                color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: st.status === 'critical' ? '#EF4444' : '#10B981',
                }}
              />
              <span style={{ fontFamily: 'monospace' }}>{st.id}</span>
            </button>
          );
        })}
      </div>

      {/* ── Quick Action 1: Refresh ── */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        title="รีเฟรชข้อมูลสดทันที"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.35rem 0.65rem',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: 'var(--text-primary)',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <RefreshCwIcon size={13} className={isLoading ? 'spin' : ''} />
        <span>รีเฟรช</span>
      </button>

      {/* ── Quick Action 2: Scroll to Map ── */}
      <button
        type="button"
        onClick={handleScrollToMap}
        title="เลื่อนดูแผนที่ภูมิศาสตร์"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.35rem 0.65rem',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: 'var(--text-primary)',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <MapIcon size={13} />
        <span>แผนที่</span>
      </button>

      {/* ── Quick Action 3: Analytics Chart ── */}
      <button
        type="button"
        onClick={() => navigate('/chart')}
        title="ดูกราฟประวัติเต็มระบบ"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          background: '#2563EB',
          border: '1px solid #3B82F6',
          color: '#FFFFFF',
          fontSize: '0.75rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)',
          transition: 'all 0.15s ease',
        }}
      >
        <BarChart3Icon size={13} />
        <span>วิเคราะห์กราฟ</span>
      </button>
    </div>
  );
});

export default FloatingActionDock;
