import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useNotifications } from '../context/NotificationContext';
import type { NotificationType } from '../types';
import {
  BellIcon,
  AlertTriangleIcon,
  XCircleIcon,
  DropletsIcon,
  CheckCircleIcon,
  BarChart3Icon,
  CheckIcon,
  SlidersIcon,
} from '../components/ui/Icons';

export default function NotificationHubPage() {
  const navigate = useNavigate();
  const { notifications, markRead, markAllRead } = useNotifications();
  const [filterType, setFilterType] = useState<string>('all');

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const kpis = useMemo(() => {
    const critical = notifications.filter((n) => n.type === 'critical').length;
    const warning = notifications.filter((n) => n.type === 'warning').length;
    const info = notifications.filter((n) => n.type === 'info').length;
    return { critical, warning, info, total: notifications.length };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filterType === 'all') return notifications;
    if (filterType === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  const getSeverityBadge = (type: NotificationType) => {
    switch (type) {
      case 'critical':
        return {
          label: 'วิกฤต',
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.35)',
          color: '#EF4444',
          icon: <XCircleIcon size={14} style={{ color: '#EF4444' }} />,
        };
      case 'warning':
        return {
          label: 'เฝ้าระวัง',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.35)',
          color: '#F59E0B',
          icon: <AlertTriangleIcon size={14} style={{ color: '#F59E0B' }} />,
        };
      default:
        return {
          label: 'ข้อมูลระบบ',
          bg: 'rgba(56, 189, 248, 0.15)',
          border: 'rgba(56, 189, 248, 0.35)',
          color: '#38BDF8',
          icon: <DropletsIcon size={14} style={{ color: '#38BDF8' }} />,
        };
    }
  };

  const getRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: th });
    } catch {
      return timestamp;
    }
  };

  const getFormattedDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'dd/MM/yyyy HH:mm น.');
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px 32px 48px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* ── 1. HEADER SECTION ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
              }}
            >
              <BellIcon size={20} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
              ศูนย์แจ้งเตือนและสรุปเหตุการณ์
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            บันทึกประวัติการเตือนภัย ระดับน้ำวิกฤต และความเคลื่อนไหวสถานการณ์น้ำแบบบูรณาการ
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="tactile-press"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <CheckIcon size={16} style={{ color: '#38BDF8' }} />
            <span>ทำเครื่องหมายว่าอ่านแล้วทั้งหมด ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* ── 2. EXECUTIVE 24H KPI SUMMARY CARDS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '28px',
        }}
      >
        {/* Critical Card */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.04)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderTop: '2px solid #EF4444',
            borderRadius: '12px',
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>เหตุการณ์วิกฤต</span>
            <XCircleIcon size={16} style={{ color: '#EF4444' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="tabular-nums font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>
              {kpis.critical}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 600 }}>รายการ</span>
          </div>
        </div>

        {/* Warning Card */}
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.04)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderTop: '2px solid #F59E0B',
            borderRadius: '12px',
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>เฝ้าระวังระดับน้ำ</span>
            <AlertTriangleIcon size={16} style={{ color: '#F59E0B' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="tabular-nums font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>
              {kpis.warning}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 600 }}>รายการ</span>
          </div>
        </div>

        {/* System & Info Card */}
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.04)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderTop: '2px solid #38BDF8',
            borderRadius: '12px',
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ข้อมูลสถานะระบบ</span>
            <DropletsIcon size={16} style={{ color: '#38BDF8' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="tabular-nums font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>
              {kpis.info}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#38BDF8', fontWeight: 600 }}>รายการ</span>
          </div>
        </div>

        {/* Total Unread Card */}
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.04)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderTop: '2px solid #10B981',
            borderRadius: '12px',
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ยังไม่ได้อ่าน</span>
            <CheckCircleIcon size={16} style={{ color: '#10B981' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="tabular-nums font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>
              {unreadCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>รายการค้างตรวจ</span>
          </div>
        </div>
      </div>

      {/* ── 3. FILTER TABS BAR ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.03)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {[
            { id: 'all', label: `ทั้งหมด (${notifications.length})` },
            { id: 'unread', label: `ยังไม่อ่าน (${unreadCount})` },
            { id: 'critical', label: `วิกฤต (${kpis.critical})` },
            { id: 'warning', label: `เฝ้าระวัง (${kpis.warning})` },
            { id: 'info', label: `ระบบ (${kpis.info})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className="tactile-press"
              style={{
                background: filterType === tab.id ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
                border: filterType === tab.id ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
                color: filterType === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: filterType === tab.id ? 700 : 500,
                fontSize: '0.8125rem',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <SlidersIcon size={14} />
          <span>เรียงตามเหตุการณ์ล่าสุด</span>
        </div>
      </div>

      {/* ── 4. NOTIFICATIONS FEED LIST ── */}
      {filteredNotifications.length === 0 ? (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
            }}
          >
            <CheckCircleIcon size={24} />
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>ไม่มีรายการแจ้งเตือนในหมวดนี้</div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, maxWidth: '360px' }}>
            ระบบและสถานีตรวจวัดทั้งหมดอยู่ในเกณฑ์ปกติ ไม่พบการแจ้งเตือนที่ต้องดำเนินการ
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredNotifications.map((n) => {
            const badge = getSeverityBadge(n.type);
            return (
              <div
                key={n.id}
                style={{
                  background: n.read ? 'rgba(255, 255, 255, 0.02)' : 'rgba(56, 189, 248, 0.04)',
                  border: n.read ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                  transition: 'background 0.2s ease',
                }}
              >
                {/* Left Content */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: '1 1 300px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {badge.icon}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>

                      {n.stationName && (
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#FFFFFF' }}>
                          {n.stationName}
                        </span>
                      )}

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        · {getRelativeTime(n.timestamp)}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.875rem', fontWeight: n.read ? 500 : 600, color: n.read ? '#CBD5E1' : '#FFFFFF' }}>
                      {n.title}
                    </div>

                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      {n.message}
                    </p>

                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      บันทึกเมื่อ {getFormattedDateTime(n.timestamp)}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {n.stationId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/chart?station=${n.stationId}`)}
                      className="tactile-press"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        color: '#38BDF8',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="เปิดกราฟระดับน้ำของสถานีนี้"
                    >
                      <BarChart3Icon size={13} />
                      <span>ดูกราฟ</span>
                    </button>
                  )}

                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="tactile-press"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                      title="ทำเครื่องหมายว่าอ่านแล้ว"
                    >
                      <CheckCircleIcon size={13} />
                      <span>รับทราบ</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
