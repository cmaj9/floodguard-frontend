import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import NotificationPanel from '../ui/NotificationPanel';
import type { AppNotification } from '../../types';
import { BellIcon, RefreshCwIcon } from '../ui/Icons';

const pageTitles: Record<string, string> = {
  '/dashboard': 'แดชบอร์ด',
  '/chart': 'กราฟระดับน้ำ',
  '/users': 'จัดการผู้ใช้',
  '/stations': 'จัดการสถานี',
  '/history': 'ติดตามข้อมูล',
  '/profile': 'โปรไฟล์',
};

interface TopBarProps {
  pathname: string;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export default function TopBar({ pathname, notifications, onMarkRead, onMarkAllRead }: TopBarProps) {
  const { user } = useAuth();
  const [showNotif, setShowNotif] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isStaffOrAdmin = user && (user.role === 'staff' || user.role === 'admin');

  const handleRefresh = () => {
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent('app:refresh'));
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{pageTitles[pathname] ?? 'FloodGuard'}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
          {dateStr} · {timeStr}
        </div>
      </div>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* If logged in as staff/admin, show status badge */}
        {isStaffOrAdmin && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: 12,
            }}
          >
            <span
              className={`badge ${user?.role === 'admin' ? 'badge-role-admin' : 'badge-role-staff'}`}
              style={{ fontSize: 11, padding: '2px 8px' }}
            >
              {user?.role === 'admin' ? 'Admin' : 'เจ้าหน้าที่'}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{user?.name}</span>
          </div>
        )}

        {/* Global Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          title="รีเฟรชข้อมูลทุกระบบ"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 36,
            padding: '0 12px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            cursor: refreshing ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCwIcon size={14} className={refreshing ? 'spin' : ''} />
          <span>รีเฟรช</span>
        </button>

        {/* Notification button */}
        <div style={{ position: 'relative' }}>
          <button
            className="notif-btn"
            onClick={() => setShowNotif((v) => !v)}
            aria-label="การแจ้งเตือน"
          >
            <BellIcon size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotif && (
            <NotificationPanel
              notifications={notifications}
              onMarkRead={(id) => { onMarkRead(id); }}
              onMarkAllRead={() => { onMarkAllRead(); }}
              onClose={() => setShowNotif(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
