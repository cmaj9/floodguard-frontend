import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import type { UserRole } from "../../types";
import {
  BarChart3Icon,
  LineChartIcon,
  UsersIcon,
  Building2Icon,
  ClipboardListIcon,
  UserIcon,
  LogOutIcon,
  KeyIcon,
  AlertTriangleIcon,
  BellIcon,
  ChevronLeftIcon,
} from "../ui/Icons";
import type { ReactNode } from "react";

interface NavItem {
  path: string;
  icon: ReactNode;
  label: string;
  roles: UserRole[];
  requireAuth?: boolean;
  showBadge?: boolean;
}

const mainNavItems: NavItem[] = [
  {
    path: "/dashboard",
    icon: <BarChart3Icon size={20} />,
    label: "แดชบอร์ด",
    roles: ["citizen", "staff", "admin"],
  },
  {
    path: "/chart",
    icon: <LineChartIcon size={20} />,
    label: "กราฟระดับน้ำ",
    roles: ["citizen", "staff", "admin"],
  },
  {
    path: "/history",
    icon: <ClipboardListIcon size={20} />,
    label: "ประวัติข้อมูล",
    roles: ["citizen", "staff", "admin"],
  },
  {
    path: "/notifications",
    icon: <BellIcon size={20} />,
    label: "การแจ้งเตือน",
    roles: ["citizen", "staff", "admin"],
    showBadge: true,
  },
];

const managementNavItems: NavItem[] = [
  {
    path: "/stations",
    icon: <Building2Icon size={20} />,
    label: "จัดการสถานี",
    roles: ["staff", "admin"],
    requireAuth: true,
  },
  {
    path: "/users",
    icon: <UsersIcon size={20} />,
    label: "จัดการผู้ใช้",
    roles: ["admin"],
    requireAuth: true,
  },
  {
    path: "/profile",
    icon: <UserIcon size={20} />,
    label: "โปรไฟล์",
    roles: ["citizen", "staff", "admin"],
    requireAuth: true,
  },
];

const roleLabel: Record<UserRole, string> = {
  citizen: "ประชาชนทั่วไป",
  staff: "เจ้าหน้าที่",
  admin: "ผู้ดูแลระบบ",
};

export default function Sidebar() {
  const { user, isGuest, logout } = useAuth();
  const { notifications } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("floodguard_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Sync collapsed state to document body class so main content margin adapts smoothly
  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
    try {
      localStorage.setItem("floodguard_sidebar_collapsed", String(isCollapsed));
    } catch {}
  }, [isCollapsed]);

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filterItems = (items: NavItem[]) =>
    items.filter((item) => {
      if (!item.roles.includes(user.role)) return false;
      if (item.requireAuth && isGuest) return false;
      return true;
    });

  const filteredMainMenu = filterItems(mainNavItems);
  const filteredManagementMenu = filterItems(managementNavItems);

  const initials = isGuest ? "ป" : user.name ? user.name.slice(0, 1) : "U";

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    navigate("/login", { replace: true });
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <>
      <aside className={`kretya-sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <div>
          {/* 1. macOS Window Traffic Dots */}
          <div className="mac-window-dots">
            <button
              type="button"
              className="dot-traffic dot-red"
              onClick={toggleCollapse}
              title={isCollapsed ? "ขยายแถบเมนู (Expand)" : "ย่อแถบเมนู (Collapse)"}
              aria-label="ย่อขยายแถบเมนู"
            />
            <div className="dot-traffic dot-yellow" />
            <div className="dot-traffic dot-green" />
          </div>

          {/* 2. Logo & Collapse Trigger Zone */}
          <div className="sidebar-logo-zone">
            <div
              className="sidebar-logo-icon"
              onClick={() => {
                if (isCollapsed) {
                  toggleCollapse();
                } else {
                  navigate("/dashboard");
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate("/dashboard")}
              title={isCollapsed ? "คลิกเพื่อขยายเมนู (Expand)" : "ไปที่หน้าแดชบอร์ดหลัก"}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 36 36"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="FloodGuard Kinetic Vortex Logo"
              >
                <path d="M18 4V18L6 25" />
                <path d="M32 17L18 18L18 32" />
                <path d="M7 11L18 18L29 27" />
              </svg>
            </div>

            {!isCollapsed && (
              <div
                className="sidebar-brand-name"
                onClick={() => navigate("/dashboard")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && navigate("/dashboard")}
                title="FloodGuard Cockpit"
              >
                FloodGuard
              </div>
            )}

            {!isCollapsed && (
              <button
                type="button"
                className="sidebar-toggle-chevron-btn"
                onClick={toggleCollapse}
                title="ย่อแถบเมนู (Collapse)"
                aria-label="ย่อแถบเมนู"
              >
                <ChevronLeftIcon size={14} />
              </button>
            )}
          </div>

          {/* 3. Navigation Sections (Scrollable) */}
          <div className="sidebar-nav-scroll">
            {/* Section 1: เมนูหลัก */}
            <div className="nav-section-wrap">
              <div className="nav-section-label">เมนูหลัก</div>
              <div className="nav-section-divider" aria-hidden="true" />
              <div className="nav-list">
                {filteredMainMenu.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      className={`nav-link ${isActive ? "active" : ""}`}
                      onClick={() => navigate(item.path)}
                      aria-current={isActive ? "page" : undefined}
                      title={isCollapsed ? undefined : item.label}
                    >
                      <div className="nav-link-left">
                        <div className="nav-icon-wrap">{item.icon}</div>
                        <span className="nav-label-text">{item.label}</span>
                      </div>

                      {item.showBadge && unreadCount > 0 && (
                        <span className="nav-count-badge">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}

                      {/* Tooltip for Collapsed Rail mode */}
                      <div className="nav-tooltip-pill">
                        {item.label}
                        {item.showBadge && unreadCount > 0 && ` (${unreadCount})`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: การจัดการ */}
            {filteredManagementMenu.length > 0 && (
              <div className="nav-section-wrap">
                <div className="nav-section-label">การจัดการ</div>
                <div className="nav-section-divider" aria-hidden="true" />
                <div className="nav-list">
                  {filteredManagementMenu.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        type="button"
                        className={`nav-link ${isActive ? "active" : ""}`}
                        onClick={() => navigate(item.path)}
                        aria-current={isActive ? "page" : undefined}
                        title={isCollapsed ? undefined : item.label}
                      >
                        <div className="nav-link-left">
                          <div className="nav-icon-wrap">{item.icon}</div>
                          <span className="nav-label-text">{item.label}</span>
                        </div>

                        {/* Tooltip for Collapsed Rail mode */}
                        <div className="nav-tooltip-pill">{item.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Bottom Zone: Original Auth Action & User Profile Card */}
        <div className="sidebar-bottom-zone">
          {/* Auth Action: Shows "เข้าสู่ระบบ" when Guest, and "ออกจากระบบ" when Logged In */}
          <div className="sidebar-auth-action-wrap">
            {isGuest ? (
              <button
                type="button"
                id="sidebar-staff-login-btn"
                onClick={() => navigate("/login")}
                className={`nav-link staff-login-btn ${location.pathname === "/login" ? "active" : ""}`}
                title="เข้าสู่ระบบ"
              >
                <div className="nav-link-left">
                  <div className="nav-icon-wrap">
                    <KeyIcon size={18} />
                  </div>
                  <span className="nav-label-text">เข้าสู่ระบบ</span>
                </div>
                <div className="nav-tooltip-pill">เข้าสู่ระบบ</div>
              </button>
            ) : (
              <button
                type="button"
                id="sidebar-logout-btn"
                onClick={() => setShowLogoutConfirm(true)}
                className="nav-link logout-btn"
                title="ออกจากระบบ"
              >
                <div className="nav-link-left">
                  <div className="nav-icon-wrap">
                    <LogOutIcon size={20} />
                  </div>
                  <span className="nav-label-text">ออกจากระบบ</span>
                </div>
                <div className="nav-tooltip-pill">ออกจากระบบ</div>
              </button>
            )}
          </div>

          {/* User Profile Card */}
          <div
            className="sidebar-user-row"
            onClick={() => {
              if (!isGuest) navigate("/profile");
            }}
            role={!isGuest ? "button" : undefined}
            tabIndex={!isGuest ? 0 : undefined}
            title={!isGuest ? "คลิกเพื่อดูและจัดการโปรไฟล์" : undefined}
          >
            <div className="user-profile-left">
              <div className="user-avatar-circle">
                {!isGuest && user.pictureUrl ? (
                  <img
                    src={user.pictureUrl}
                    alt={user.name}
                    style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="user-details-box">
                <div className="user-name-tag">
                  {isGuest ? "ประชาชนทั่วไป" : user.name}
                </div>
                <div className="user-sub-tag">
                  {isGuest ? "โหมดประชาชน" : roleLabel[user.role]}
                </div>
              </div>
            </div>
            <div className="nav-tooltip-pill">
              {isGuest ? "โหมดประชาชน" : `${user.name} (${roleLabel[user.role]})`}
            </div>
          </div>
        </div>
      </aside>

      {/* 5. Preserved Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            style={{
              background: "#0C0E12",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 16,
              padding: "24px 22px",
              maxWidth: 380,
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
              animation: "scaleUp 0.2s ease",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(239, 68, 68, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#EF4444",
                  flexShrink: 0,
                }}
              >
                <AlertTriangleIcon size={22} />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#F8FAFC",
                    lineHeight: 1.4,
                  }}
                >
                  คุณต้องการออกจากระบบหรือไม่?
                </h3>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: "9px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#F1F5F9",
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleLogout}
                style={{
                  padding: "9px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  backgroundColor: "#EF4444",
                  color: "#FFFFFF",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <LogOutIcon size={15} />
                <span>ยืนยัน ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
