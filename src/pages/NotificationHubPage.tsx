import { useState, useMemo, useEffect, useRef } from 'react';
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
  SearchIcon,
  XIcon,
  BatteryChargingIcon,
  CompassIcon,
  MapPinIcon,
  RadioIcon,
} from '../components/ui/Icons';

export default function NotificationHubPage() {
  const navigate = useNavigate();
  const { notifications, markRead, markAllRead } = useNotifications();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const kpis = useMemo(() => {
    const critical = notifications.filter((n) => n.type === 'critical').length;
    const warning = notifications.filter((n) => n.type === 'warning').length;
    const info = notifications.filter((n) => n.type === 'info').length;
    return { critical, warning, info, total: notifications.length };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    let result = notifications;
    if (filterType === 'unread') {
      result = result.filter((n) => !n.read);
    } else if (filterType !== 'all') {
      result = result.filter((n) => n.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.message && n.message.toLowerCase().includes(q)) ||
          (n.stationName && n.stationName.toLowerCase().includes(q)) ||
          (n.stationId && n.stationId.toLowerCase().includes(q))
      );
    }
    return result;
  }, [notifications, filterType, searchQuery]);

  // Screen Reader Live Region Announcement
  const prevCountRef = useRef(notifications.length);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      const newItems = notifications.length - prevCountRef.current;
      setLiveAnnouncement(`มีการแจ้งเตือนใหม่เพิ่มขึ้น ${newItems} รายการ`);
    }
    prevCountRef.current = notifications.length;
  }, [notifications.length]);

  const handleCardClick = (id: string, read: boolean) => {
    if (!read) {
      markRead(id);
    }
  };

  const getContextualAction = (n: typeof notifications[0]) => {
    if (!n.stationId) return null;

    const t = `${n.title} ${n.message}`.toLowerCase();
    const alertType = n.alertType;

    // 1. Battery alert -> Station detail page & battery chart
    if (alertType === 'battery' || t.includes('battery') || t.includes('แบตเตอรี่') || t.includes('พลังงาน')) {
      return {
        label: 'ดูกราฟแบตเตอรี่',
        path: `/stations/${n.stationId}#battery-chart`,
        icon: <BatteryChargingIcon size={14} style={{ color: 'var(--color-warning, #F59E0B)' }} />,
        ariaLabel: `เปิดดูกราฟพลังงานและแบตเตอรี่ของสถานี ${n.stationName || n.stationId}`,
        style: {
          background: 'rgba(245, 158, 11, 0.1)',
          borderColor: 'rgba(245, 158, 11, 0.28)',
          color: 'var(--color-warning, #F59E0B)',
        },
      };
    }

    // 2. Tilt / Gyro alert -> History / Telemetry page
    if (alertType === 'tilt' || t.includes('tilt') || t.includes('เอียง') || t.includes('ทุ่น')) {
      return {
        label: 'ตรวจความเอียงเสา',
        path: `/history?station=${n.stationId}`,
        icon: <CompassIcon size={14} style={{ color: 'var(--accent-indigo, #818CF8)' }} />,
        ariaLabel: `ตรวจสอบบันทึกความเอียงของเสาสถานี ${n.stationName || n.stationId}`,
        style: {
          background: 'rgba(129, 140, 248, 0.1)',
          borderColor: 'rgba(129, 140, 248, 0.28)',
          color: 'var(--accent-indigo, #818CF8)',
        },
      };
    }

    // 3. Geofence movement / drift alert -> History page with GPS telemetry
    if (alertType === 'geofence' || t.includes('geofence') || t.includes('พิกัด') || t.includes('เคลื่อนที่')) {
      return {
        label: 'ตรวจพิกัดและระยะขยับ',
        path: `/history?station=${n.stationId}`,
        icon: <MapPinIcon size={14} style={{ color: 'var(--accent-cyan, #38BDF8)' }} />,
        ariaLabel: `ตรวจสอบพิกัด GPS และระยะขยับตัวของสถานี ${n.stationName || n.stationId}`,
        style: {
          background: 'rgba(56, 189, 248, 0.1)',
          borderColor: 'rgba(56, 189, 248, 0.28)',
          color: 'var(--accent-cyan, #38BDF8)',
        },
      };
    }

    // 4. Offline / Online connection alert -> Station detail page
    if (alertType === 'offline' || alertType === 'online' || t.includes('offline') || t.includes('online') || t.includes('ขาดการติดต่อ')) {
      return {
        label: 'ตรวจสถานะสถานี',
        path: `/stations/${n.stationId}`,
        icon: <RadioIcon size={14} style={{ color: 'var(--color-critical, #EF4444)' }} />,
        ariaLabel: `ตรวจสอบสถานะการเชื่อมต่อของสถานี ${n.stationName || n.stationId}`,
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.28)',
          color: 'var(--color-critical, #EF4444)',
        },
      };
    }

    // 5. Default Water Level / Rate of rise -> Chart page
    return {
      label: 'ดูกราฟระดับน้ำ',
      path: `/chart?station=${n.stationId}`,
      icon: <BarChart3Icon size={14} style={{ color: 'var(--accent-cyan, #38BDF8)' }} />,
      ariaLabel: `เปิดดูกราฟระดับน้ำของสถานี ${n.stationName || n.stationId}`,
      style: {
        background: 'rgba(56, 189, 248, 0.1)',
        borderColor: 'rgba(56, 189, 248, 0.28)',
        color: 'var(--accent-cyan, #38BDF8)',
      },
    };
  };

  const getSeverityBadge = (type: NotificationType) => {
    switch (type) {
      case 'critical':
        return {
          label: 'วิกฤต',
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.35)',
          color: 'var(--color-critical, #EF4444)',
          icon: <XCircleIcon size={14} style={{ color: 'var(--color-critical, #EF4444)' }} />,
        };
      case 'warning':
        return {
          label: 'เฝ้าระวัง',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.35)',
          color: 'var(--color-warning, #F59E0B)',
          icon: <AlertTriangleIcon size={14} style={{ color: 'var(--color-warning, #F59E0B)' }} />,
        };
      default:
        return {
          label: 'ข้อมูลระบบ',
          bg: 'rgba(56, 189, 248, 0.15)',
          border: 'rgba(56, 189, 248, 0.35)',
          color: 'var(--accent-cyan, #38BDF8)',
          icon: <DropletsIcon size={14} style={{ color: 'var(--accent-cyan, #38BDF8)' }} />,
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
      {/* Screen Reader Live Region for Polling Status */}
      <div aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* ── 1. HEADER SECTION ── */}
      <header
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
                color: 'var(--color-critical, #EF4444)',
              }}
            >
              <BellIcon size={20} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary, #FFFFFF)', letterSpacing: '-0.02em', margin: 0 }}>
              ศูนย์แจ้งเตือนและสรุปเหตุการณ์
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #94A3B8)', margin: 0 }}>
            บันทึกประวัติการเตือนภัย ระดับน้ำวิกฤต และความเคลื่อนไหวสถานการณ์น้ำแบบบูรณาการ
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="tactile-press"
            aria-label={`ทำเครื่องหมายว่าอ่านแล้วทั้งหมด ${unreadCount} รายการ`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              minHeight: '40px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--text-primary, #FFFFFF)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <CheckIcon size={16} style={{ color: 'var(--accent-cyan, #38BDF8)' }} />
            <span>ทำเครื่องหมายว่าอ่านแล้วทั้งหมด ({unreadCount})</span>
          </button>
        )}
      </header>

      {/* ── 2. EXECUTIVE 24H KPI SUMMARY CARDS (INTERACTIVE FILTERS) ── */}
      <section
        aria-label="สรุปสถิติเหตุการณ์เตือนภัย"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {/* Critical Filter Card */}
        <button
          type="button"
          role="button"
          aria-pressed={filterType === 'critical'}
          onClick={() => setFilterType(filterType === 'critical' ? 'all' : 'critical')}
          className={`notif-hub-kpi type-critical ${filterType === 'critical' ? 'active' : ''}`}
          title="คลิกเพื่อกรองเฉพาะเหตุการณ์วิกฤต"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', width: '100%' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)' }}>เหตุการณ์วิกฤต</span>
            <XCircleIcon size={16} style={{ color: 'var(--color-critical, #EF4444)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="tabular-nums font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary, #FFFFFF)' }}>
              {kpis.critical}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-critical, #EF4444)', fontWeight: 600 }}>รายการ</span>
          </div>
        </button>

        {/* Warning Filter Card */}
        <button
          type="button"
          role="button"
          aria-pressed={filterType === 'warning'}
          onClick={() => setFilterType(filterType === 'warning' ? 'all' : 'warning')}
          className={`notif-hub-kpi type-warning ${filterType === 'warning' ? 'active' : ''}`}
          title="คลิกเพื่อกรองเฉพาะเหตุการณ์เฝ้าระวัง"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', width: '100%' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)' }}>เฝ้าระวังระดับน้ำ</span>
            <AlertTriangleIcon size={16} style={{ color: 'var(--color-warning, #F59E0B)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="tabular-nums font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary, #FFFFFF)' }}>
              {kpis.warning}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-warning, #F59E0B)', fontWeight: 600 }}>รายการ</span>
          </div>
        </button>

        {/* Info Filter Card */}
        <button
          type="button"
          role="button"
          aria-pressed={filterType === 'info'}
          onClick={() => setFilterType(filterType === 'info' ? 'all' : 'info')}
          className={`notif-hub-kpi type-info ${filterType === 'info' ? 'active' : ''}`}
          title="คลิกเพื่อกรองเฉพาะข้อมูลสถานะระบบ"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', width: '100%' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)' }}>ข้อมูลสถานะระบบ</span>
            <DropletsIcon size={16} style={{ color: 'var(--accent-cyan, #38BDF8)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="tabular-nums font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary, #FFFFFF)' }}>
              {kpis.info}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan, #38BDF8)', fontWeight: 600 }}>รายการ</span>
          </div>
        </button>

        {/* Unread Filter Card */}
        <button
          type="button"
          role="button"
          aria-pressed={filterType === 'unread'}
          onClick={() => setFilterType(filterType === 'unread' ? 'all' : 'unread')}
          className={`notif-hub-kpi type-unread ${filterType === 'unread' ? 'active' : ''}`}
          title="คลิกเพื่อกรองเฉพาะรายการที่ยังไม่ได้อ่าน"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', width: '100%' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)' }}>ยังไม่ได้อ่าน</span>
            <CheckCircleIcon size={16} style={{ color: 'var(--color-normal, #10B981)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="tabular-nums font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary, #FFFFFF)' }}>
              {unreadCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-normal, #10B981)', fontWeight: 600 }}>รายการค้างตรวจ</span>
          </div>
        </button>
      </section>

      {/* ── 3. FILTER TABS & SEARCH BAR ── */}
      <nav
        aria-label="ตัวกรองและค้นหารายการแจ้งเตือน"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '14px',
        }}
      >
        {/* Horizontal Scrollable Tabs */}
        <div role="tablist" aria-label="หมวดหมู่การแจ้งเตือน" className="notif-hub-tabs-track">
          {[
            { id: 'all', label: 'ทั้งหมด', count: notifications.length },
            { id: 'unread', label: 'ยังไม่อ่าน', count: unreadCount },
            { id: 'critical', label: 'วิกฤต', count: kpis.critical },
            { id: 'warning', label: 'เฝ้าระวัง', count: kpis.warning },
            { id: 'info', label: 'ระบบ', count: kpis.info },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filterType === tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`notif-hub-tab-btn ${filterType === tab.id ? 'active' : ''}`}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.75rem',
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: filterType === tab.id ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Station / Message Search Input */}
        <div className="notif-hub-search-wrap">
          <div style={{ position: 'absolute', left: 10, pointerEvents: 'none', color: 'var(--text-muted, #8E9FB5)' }}>
            <SearchIcon size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อสถานี หรือข้อความ..."
            aria-label="ค้นหาชื่อสถานี หรือข้อความเตือนภัย"
            className="notif-hub-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="ล้างคำค้นหา"
              style={{
                position: 'absolute',
                right: 8,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #8E9FB5)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
              }}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
      </nav>

      {/* ── 4. NOTIFICATIONS FEED LIST ── */}
      {filteredNotifications.length === 0 ? (
        <section
          aria-label="ไม่พบรายการแจ้งเตือน"
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
              color: 'var(--color-normal, #10B981)',
            }}
          >
            <CheckCircleIcon size={24} />
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #FFFFFF)' }}>
            {searchQuery ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ไม่มีรายการแจ้งเตือนในหมวดนี้'}
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted, #94A3B8)', margin: 0, maxWidth: '380px' }}>
            {searchQuery
              ? `ไม่พบผลลัพธ์สำหรับ "${searchQuery}" ลองตรวจสอบคำค้นหา หรือล้างตัวกรอง`
              : 'ระบบและสถานีตรวจวัดทั้งหมดอยู่ในเกณฑ์ปกติ ไม่พบการแจ้งเตือนที่ต้องดำเนินการ'}
          </p>

          {(filterType !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setSearchQuery('');
              }}
              className="tactile-press"
              style={{
                marginTop: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: 'var(--accent-cyan, #38BDF8)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '38px',
              }}
            >
              <span>ล้างตัวกรองและแสดงทั้งหมด</span>
            </button>
          )}
        </section>
      ) : (
        <ul className="notif-feed-list" role="list" aria-label="รายการแจ้งเตือนเตือนภัย">
          {filteredNotifications.map((n, idx) => {
            const badge = getSeverityBadge(n.type);
            return (
              <li
                key={n.id}
                role="article"
                tabIndex={!n.read ? 0 : undefined}
                onClick={() => handleCardClick(n.id, n.read)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !n.read) {
                    e.preventDefault();
                    handleCardClick(n.id, n.read);
                  }
                }}
                aria-label={`การแจ้งเตือนระดับ ${badge.label} ${n.stationName || ''} ${n.title} ${!n.read ? '- คลิกที่การ์ดเพื่อรับทราบ' : '- รับทราบแล้ว'}`}
                className={`notif-hub-card card-${n.type} ${!n.read ? 'card-unread' : 'card-read'}`}
                title={!n.read ? 'คลิกที่การ์ดเพื่อรับทราบการแจ้งเตือน' : undefined}
                style={{ animationDelay: `${Math.min(idx * 30, 150)}ms` }}
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
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary, #FFFFFF)' }}>
                          {n.stationName}
                        </span>
                      )}

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94A3B8)' }}>
                        · {getRelativeTime(n.timestamp)}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.875rem', fontWeight: n.read ? 500 : 600, color: n.read ? 'var(--text-secondary, #94A3B8)' : 'var(--text-primary, #FFFFFF)' }}>
                      {n.title}
                    </div>

                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
                      {n.message}
                    </p>

                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted, #94A3B8)', marginTop: '2px' }}>
                      บันทึกเมื่อ {getFormattedDateTime(n.timestamp)}
                    </div>
                  </div>
                </div>

                {/* Right Action: Contextual Alert Navigation without acknowledgement badge */}
                {(() => {
                  const action = getContextualAction(n);
                  if (!action) return null;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(action.path);
                        }}
                        className="notif-action-btn tactile-press"
                        style={action.style}
                        aria-label={action.ariaLabel}
                        title={action.label}
                      >
                        {action.icon}
                        <span>{action.label}</span>
                      </button>
                    </div>
                  );
                })()}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
