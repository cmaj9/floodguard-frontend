import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  BarChart3Icon,
  LineChartIcon,
  ClipboardListIcon,
  SlidersIcon,
  UserIcon,
  KeyIcon,
  BellIcon,
} from '../ui/Icons';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { notifications } = useNotifications();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isCitizen = !user || user.role === 'citizen';

  interface MobileNavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }

  // Canonical 5-Tab Navigation Order (Citizens get Notifications directly; Staff/Admin get Management Hub)
  const navItems: MobileNavItem[] = [
    {
      path: '/dashboard',
      label: 'แดชบอร์ด',
      icon: <BarChart3Icon size={20} />,
      isActive: location.pathname === '/dashboard',
      onClick: () => navigate('/dashboard'),
    },
    {
      path: '/chart',
      label: 'กราฟน้ำ',
      icon: <LineChartIcon size={20} />,
      isActive: location.pathname === '/chart',
      onClick: () => navigate('/chart'),
    },
    {
      path: '/history',
      label: 'ประวัติข้อมูล',
      icon: <ClipboardListIcon size={20} />,
      isActive: location.pathname === '/history',
      onClick: () => navigate('/history'),
    },
    isCitizen
      ? {
          path: '/notifications',
          label: 'การแจ้งเตือน',
          icon: (
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <BellIcon size={20} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 999,
                    background: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    border: '1.5px solid #0C0E12',
                    lineHeight: 1,
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          ),
          isActive: ['/notifications', '/management/notifications'].includes(location.pathname),
          onClick: () => navigate('/notifications'),
        }
      : {
          path: '/management',
          label: 'การจัดการ',
          icon: (
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <SlidersIcon size={20} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -4,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#EF4444',
                    border: '1.5px solid #0C0E12',
                  }}
                />
              )}
            </div>
          ),
          isActive: ['/management', '/stations', '/users', '/subscribe', '/notifications'].includes(location.pathname),
          onClick: () => navigate('/management'),
        },
    {
      path: isGuest ? '/login' : '/profile',
      label: isGuest ? 'เข้าสู่ระบบ' : 'โปรไฟล์',
      icon: isGuest ? (
        <KeyIcon size={20} />
      ) : user?.pictureUrl ? (
        <img
          src={user.pictureUrl}
          alt={user.name}
          style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <UserIcon size={20} />
      ),
      isActive: location.pathname === (isGuest ? '/login' : '/profile'),
      onClick: () => navigate(isGuest ? '/login' : '/profile'),
    },
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="เมนูหลักสำหรับมือถือ"
      role="navigation"
    >
      <div className="mobile-bottom-nav-inner">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`mobile-nav-btn ${item.isActive ? 'active' : ''}`}
            onClick={item.onClick}
            aria-current={item.isActive ? 'page' : undefined}
          >
            <div className="mobile-nav-icon-wrap">
              {item.icon}
            </div>
            <span className="mobile-nav-label">{item.label}</span>
            {item.isActive && <span className="mobile-nav-indicator" />}
          </button>
        ))}
      </div>
    </nav>
  );
}
