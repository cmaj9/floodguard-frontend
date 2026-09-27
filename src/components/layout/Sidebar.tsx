import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import {
  BarChart3Icon,
  LineChartIcon,
  UsersIcon,
  Building2Icon,
  ClipboardListIcon,
  UserIcon,
  LogOutIcon,
  KeyIcon,
} from '../ui/Icons';
import Logo from '../ui/Logo';
import type { ReactNode } from 'react';

interface NavItem {
  path: string;
  icon: ReactNode;
  label: string;
  roles: UserRole[];
  requireAuth?: boolean;
}

const navItems: NavItem[] = [
  { path: '/dashboard', icon: <BarChart3Icon size={24} />, label: 'แดชบอร์ด', roles: ['citizen', 'staff', 'admin'] },
  { path: '/chart', icon: <LineChartIcon size={24} />, label: 'กราฟระดับน้ำ', roles: ['citizen', 'staff', 'admin'] },
  { path: '/users', icon: <UsersIcon size={24} />, label: 'จัดการผู้ใช้', roles: ['staff', 'admin'], requireAuth: true },
  { path: '/stations', icon: <Building2Icon size={24} />, label: 'จัดการสถานี', roles: ['staff', 'admin'], requireAuth: true },
  { path: '/history', icon: <ClipboardListIcon size={24} />, label: 'ประวัติข้อมูล', roles: ['admin'], requireAuth: true },
  { path: '/profile', icon: <UserIcon size={24} />, label: 'โปรไฟล์', roles: ['citizen', 'staff', 'admin'], requireAuth: true },
];

const roleLabel: Record<UserRole, string> = {
  citizen: 'ประชาชนทั่วไป',
  staff: 'เจ้าหน้าที่',
  admin: 'ผู้ดูแลระบบ',
};
const roleColor: Record<UserRole, string> = {
  citizen: 'badge-role-citizen',
  staff: 'badge-role-staff',
  admin: 'badge-role-admin',
};

export default function Sidebar() {
  const { user, isGuest, logout, loginAsCitizen } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const filtered = navItems.filter((item) => {
    if (!item.roles.includes(user.role)) return false;
    if (item.requireAuth && isGuest) return false;
    return true;
  });

  const initials = isGuest ? 'ป' : (user.name ? user.name.slice(0, 1) : 'U');

  const handleLogout = () => {
    logout();
    loginAsCitizen();
    navigate('/dashboard', { replace: true });
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div
        className="sidebar-logo"
        style={{ cursor: 'pointer', padding: '16px 20px' }}
        onClick={() => navigate('/dashboard')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard')}
      >
        <Logo size="md" />
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-labelledby="sidebar-main-nav-label">
        <div id="sidebar-main-nav-label" className="sidebar-section-label">เมนูหลัก</div>
        {filtered.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-current={location.pathname === item.path ? 'page' : undefined}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User info & Auth button */}
      <div className="sidebar-user">
        <div className="user-avatar" style={{ background: isGuest ? 'rgba(2, 132, 199, 0.2)' : undefined }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {isGuest ? 'ประชาชนทั่วไป' : user.name}
          </div>
          <span
            className={`badge ${isGuest ? 'badge-role-citizen' : roleColor[user.role]}`}
            style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px' }}
          >
            {isGuest ? 'โหมดประชาชน' : roleLabel[user.role]}
          </span>
        </div>

        {isGuest ? (
          <button
            className="btn-icon"
            title="เข้าสู่ระบบสำหรับเจ้าหน้าที่"
            onClick={() => navigate('/login')}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              background: 'rgba(2, 132, 199, 0.15)',
              color: '#38BDF8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
            aria-label="เข้าสู่ระบบสำหรับเจ้าหน้าที่"
          >
            <KeyIcon size={16} />
          </button>
        ) : (
          <button
            className="btn-icon"
            title="ออกจากระบบ"
            onClick={handleLogout}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
            }}
            aria-label="ออกจากระบบ"
          >
            <LogOutIcon size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
