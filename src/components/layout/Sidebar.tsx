import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
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
  SlidersIcon,
} from "../ui/Icons";
import Logo from "../ui/Logo";
import type { ReactNode } from "react";

interface NavItem {
  path: string;
  icon: ReactNode;
  label: string;
  roles: UserRole[];
  requireAuth?: boolean;
}

const navItems: NavItem[] = [
  {
    path: "/dashboard",
    icon: <BarChart3Icon size={24} />,
    label: "แดชบอร์ด",
    roles: ["citizen", "staff", "admin"],
  },
  {
    path: "/chart",
    icon: <LineChartIcon size={24} />,
    label: "กราฟระดับน้ำ",
    roles: ["citizen", "staff", "admin"],
  },
  {
    path: "/history",
    icon: <ClipboardListIcon size={24} />,
    label: "ประวัติข้อมูล",
    roles: ["citizen", "staff", "admin"],
  },
  {
    path: "/management",
    icon: <SlidersIcon size={24} />,
    label: "ศูนย์จัดการระบบ",
    roles: ["citizen", "staff", "admin"],
  },
  {
    path: "/stations",
    icon: <Building2Icon size={24} />,
    label: "จัดการสถานี",
    roles: ["staff", "admin"],
    requireAuth: true,
  },
  {
    path: "/users",
    icon: <UsersIcon size={24} />,
    label: "จัดการผู้ใช้",
    roles: ["admin"],
    requireAuth: true,
  },
  {
    path: "/profile",
    icon: <UserIcon size={24} />,
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
const roleColor: Record<UserRole, string> = {
  citizen: "badge-role-citizen",
  staff: "badge-role-staff",
  admin: "badge-role-admin",
};

export default function Sidebar() {
  const { user, isGuest, logout, loginAsCitizen } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) return null;

  const filtered = navItems.filter((item) => {
    if (!item.roles.includes(user.role)) return false;
    if (item.requireAuth && isGuest) return false;
    return true;
  });

  const initials = isGuest ? "ป" : user.name ? user.name.slice(0, 1) : "U";

  const handleLogout = () => {
    logout();
    loginAsCitizen();
    setShowLogoutConfirm(false);
    navigate("/dashboard", { replace: true });
  };

  return (
    <>
      <aside className="sidebar">
        {/* Brand */}
        <div
          className="sidebar-logo"
          style={{ cursor: "pointer", padding: "16px 20px" }}
          onClick={() => navigate("/dashboard")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/dashboard")}
        >
          <Logo size="md" />
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-labelledby="sidebar-main-nav-label">
          <div id="sidebar-main-nav-label" className="sidebar-section-label">
            เมนูหลัก
          </div>
          {filtered.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
              aria-current={
                location.pathname === item.path ? "page" : undefined
              }
              title={item.label}
            >
              <span
                className="nav-icon"
                style={{ display: "flex", alignItems: "center" }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Login Action: Placed above one's Account */}
        {(!user || user.role === "citizen" || isGuest) && (
          <div style={{ padding: "0 14px 10px" }}>
            <button
              type="button"
              id="sidebar-staff-login-btn"
              onClick={() => navigate("/login")}
              className={`nav-item ${location.pathname === "/login" ? "active" : ""}`}
              style={{
                marginBottom: 0,
              }}
              title="เข้าสู่ระบบ"
            >
              <span
                className="nav-icon"
                style={{ display: "flex", alignItems: "center" }}
              >
                <KeyIcon size={24} />
              </span>
              <span>เข้าสู่ระบบ</span>
            </button>
          </div>
        )}

        {/* User info & Auth button */}
        <div className="sidebar-user">
          <div
            className="user-avatar"
            style={{
              background: isGuest ? "rgba(2, 132, 199, 0.2)" : undefined,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {isGuest ? "ประชาชนทั่วไป" : user.name}
            </div>
            <span
              className={`badge ${isGuest ? "badge-role-citizen" : roleColor[user.role]}`}
              style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px" }}
            >
              {isGuest ? "โหมดประชาชน" : roleLabel[user.role]}
            </span>
          </div>

          {/* Show logout button only if the citizen is registered or staff/admin */}
          {!isGuest && (
            <button
              className="btn-icon"
              title="ออกจากระบบ"
              onClick={() => setShowLogoutConfirm(true)}
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                cursor: "pointer",
              }}
              aria-label="ออกจากระบบ"
            >
              <LogOutIcon size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
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
              background: "#0F172A",
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

            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
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
