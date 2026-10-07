import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart3Icon,
  LineChartIcon,
  ClipboardListIcon,
  SlidersIcon,
  UserIcon,
  KeyIcon,
} from '../ui/Icons';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();

  interface MobileNavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }

  // Canonical 5-Tab Navigation Order (Notification moved to TopBar, Profile far right, Management as Hub)
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
    {
      path: '/management',
      label: 'การจัดการ',
      icon: <SlidersIcon size={20} />,
      isActive: ['/management', '/stations', '/users', '/subscribe'].includes(location.pathname),
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
