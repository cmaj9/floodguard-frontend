import { useRef, useEffect, type ReactNode } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import type { AppNotification } from '../../types';
import {
  XCircleIcon,
  AlertTriangleIcon,
  DropletsIcon,
  XIcon,
  BellIcon,
} from './Icons';

interface NotificationPanelProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

const typeIcon: Record<string, ReactNode> = {
  critical: <XCircleIcon size={18} style={{ color: 'var(--color-critical)' }} />,
  warning: <AlertTriangleIcon size={18} style={{ color: 'var(--color-warning)' }} />,
  info: <DropletsIcon size={18} style={{ color: 'var(--color-primary)' }} />,
};

export default function NotificationPanel({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  /* Close on Escape key (#16) */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  /* Move focus into panel on mount (#16) */
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="notif-panel"
      ref={panelRef}
      role="region"
      aria-label="การแจ้งเตือน"
      tabIndex={-1}
    >
      <div className="notif-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>การแจ้งเตือน</h2>
          {unreadCount > 0 && (
            <span
              style={{
                background: 'var(--color-critical)',
                color: '#fff',
                borderRadius: 'var(--radius-full)',
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 7px',
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unreadCount > 0 && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={onMarkAllRead}
            >
              อ่านทั้งหมด
            </button>
          )}
          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="ปิดแผงการแจ้งเตือน"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <XIcon size={14} />
          </button>
        </div>
      </div>

      <div className="notif-body-scroll">
        {notifications.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <BellIcon size={36} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="empty-state-title">ไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              type="button"
              className={`notif-item notif-${notif.type} ${!notif.read ? 'unread' : ''}`}
              onClick={() => onMarkRead(notif.id)}
              aria-label={`${notif.read ? '' : 'ยังไม่อ่าน — '}${notif.title}: ${notif.message}`}
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12 }}
            >
              <div className="notif-icon" style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>{typeIcon[notif.type]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: notif.read ? 400 : 600,
                    color: 'var(--text-primary)',
                    marginBottom: 3,
                  }}
                >
                  {notif.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {notif.message}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: th })}
                </div>
              </div>
              {!notif.read && (
                <div
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
