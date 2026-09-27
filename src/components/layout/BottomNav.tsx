import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  BarChart3Icon,
  LineChartIcon,
  BellIcon,
  UserIcon,
  MenuIcon,
  Building2Icon,
  UsersIcon,
  ClipboardListIcon,
  LogOutIcon,
  XCircleIcon,
  KeyIcon,
} from '../ui/Icons';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest, logout, loginAsCitizen } = useAuth();
  const { notifications, markAllRead } = useNotifications();
  const [showStaffDrawer, setShowStaffDrawer] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isStaffOrAdmin = user && (user.role === 'staff' || user.role === 'admin');

  // Close drawers on route change
  useEffect(() => {
    setShowStaffDrawer(false);
    setShowNotifDrawer(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    loginAsCitizen();
    setShowStaffDrawer(false);
    navigate('/dashboard', { replace: true });
  };

  interface MobileNavItem {
    id?: string;
    path?: string;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    isActive: boolean;
    onClick: () => void;
  }

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
      id: 'notif',
      label: 'แจ้งเตือน',
      icon: <BellIcon size={20} />,
      badge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : undefined,
      isActive: showNotifDrawer,
      onClick: () => {
        setShowStaffDrawer(false);
        setShowNotifDrawer((prev) => !prev);
      },
    },
    {
      path: isGuest ? '/login' : '/profile',
      label: isGuest ? 'เข้าสู่ระบบ' : 'โปรไฟล์',
      icon: isGuest ? <KeyIcon size={20} /> : <UserIcon size={20} />,
      isActive: location.pathname === (isGuest ? '/login' : '/profile'),
      onClick: () => navigate(isGuest ? '/login' : '/profile'),
    },
  ];

  // If staff/admin, add 5th tab: "เมนูจัดการ"
  if (isStaffOrAdmin) {
    navItems.push({
      id: 'staff-menu',
      label: 'จัดการ',
      icon: <MenuIcon size={20} />,
      isActive: showStaffDrawer || ['/stations', '/users', '/history'].includes(location.pathname),
      onClick: () => {
        setShowNotifDrawer(false);
        setShowStaffDrawer((prev) => !prev);
      },
    });
  }

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
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
                {item.badge && <span className="mobile-nav-badge">{item.badge}</span>}
              </div>
              <span className="mobile-nav-label">{item.label}</span>
              {item.isActive && <span className="mobile-nav-indicator" />}
            </button>
          ))}
        </div>
      </nav>

      {/* Staff Management Bottom Sheet Drawer */}
      {showStaffDrawer && (
        <div
          className="bottom-sheet-backdrop"
          onClick={() => setShowStaffDrawer(false)}
        >
          <div
            className="bottom-sheet-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-drawer-title"
          >
            <div className="bottom-sheet-handle" />
            
            <div className="bottom-sheet-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(56, 189, 248, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38BDF8',
                  }}
                >
                  <MenuIcon size={20} />
                </div>
                <div>
                  <h3 id="staff-drawer-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                    เมนูการจัดการระบบ
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94A3B8' }}>
                    สิทธิ์การใช้งาน: {user?.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'เจ้าหน้าที่ (Staff)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowStaffDrawer(false)}
                aria-label="ปิดเมนู"
                style={{ width: 36, height: 36, borderRadius: 10 }}
              >
                <XCircleIcon size={20} />
              </button>
            </div>

            <div className="bottom-sheet-list">
              <button
                type="button"
                className={`bottom-sheet-item ${location.pathname === '/stations' ? 'active' : ''}`}
                onClick={() => {
                  navigate('/stations');
                  setShowStaffDrawer(false);
                }}
              >
                <div className="item-icon"><Building2Icon size={20} /></div>
                <div className="item-text">
                  <div className="item-title">จัดการสถานีตรวจวัด</div>
                  <div className="item-desc">เพิ่ม แก้ไข ค่าเกณฑ์เฝ้าระวัง และลบสถานี</div>
                </div>
              </button>

              <button
                type="button"
                className={`bottom-sheet-item ${location.pathname === '/users' ? 'active' : ''}`}
                onClick={() => {
                  navigate('/users');
                  setShowStaffDrawer(false);
                }}
              >
                <div className="item-icon"><UsersIcon size={20} /></div>
                <div className="item-text">
                  <div className="item-title">จัดการผู้ใช้งาน</div>
                  <div className="item-desc">รายชื่อประชาชน สิทธิ์เจ้าหน้าที่ และผู้ดูแลระบบ</div>
                </div>
              </button>

              {user?.role === 'admin' && (
                <button
                  type="button"
                  className={`bottom-sheet-item ${location.pathname === '/history' ? 'active' : ''}`}
                  onClick={() => {
                    navigate('/history');
                    setShowStaffDrawer(false);
                  }}
                >
                  <div className="item-icon"><ClipboardListIcon size={20} /></div>
                  <div className="item-text">
                    <div className="item-title">ประวัติข้อมูลเซนเซอร์</div>
                    <div className="item-desc">บันทึก telemetry ย้อนหลัง และ log ระบบ</div>
                  </div>
                </button>
              )}

              <div style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '8px 0' }} />

              <button
                type="button"
                className="bottom-sheet-item danger"
                onClick={handleLogout}
              >
                <div className="item-icon danger"><LogOutIcon size={20} /></div>
                <div className="item-text">
                  <div className="item-title" style={{ color: '#EF4444' }}>ออกจากระบบ</div>
                  <div className="item-desc">สลับกลับไปใช้งานในโหมดประชาชนทั่วไป</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Bottom Sheet Drawer */}
      {showNotifDrawer && (
        <div
          className="bottom-sheet-backdrop"
          onClick={() => setShowNotifDrawer(false)}
        >
          <div
            className="bottom-sheet-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-drawer-title"
          >
            <div className="bottom-sheet-handle" />

            <div className="bottom-sheet-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(234, 179, 8, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#EAB308',
                  }}
                >
                  <BellIcon size={20} />
                </div>
                <div>
                  <h3 id="notif-drawer-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                    การแจ้งเตือน
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94A3B8' }}>
                    {unreadCount > 0 ? `มี ${unreadCount} รายการที่ยังไม่ได้อ่าน` : 'ไม่มีรายการแจ้งเตือนใหม่'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={markAllRead}
                    style={{ fontSize: 11, padding: '4px 8px' }}
                  >
                    อ่านทั้งหมด
                  </button>
                )}
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setShowNotifDrawer(false)}
                  aria-label="ปิดแจ้งเตือน"
                  style={{ width: 36, height: 36, borderRadius: 10 }}
                >
                  <XCircleIcon size={20} />
                </button>
              </div>
            </div>

            <div className="bottom-sheet-list notif-scroll">
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B' }}>
                  <BellIcon size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>ไม่มีการแจ้งเตือนในขณะนี้</p>
                </div>
              ) : (
                notifications.slice(0, 8).map((notif) => (
                  <div
                    key={notif.id}
                    className={`notif-mobile-card ${notif.read ? 'read' : 'unread'}`}
                  >
                    <div className="notif-mobile-title">{notif.title}</div>
                    <div className="notif-mobile-msg">{notif.message}</div>
                    <div className="notif-mobile-time">{notif.timestamp}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
