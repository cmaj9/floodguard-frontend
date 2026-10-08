import { useState } from "react";
import NotificationPanel from "../ui/NotificationPanel";
import type { AppNotification } from "../../types";
import { BellIcon, RefreshCwIcon } from "../ui/Icons";
import Logo from "../ui/Logo";

interface TopBarProps {
  pathname?: string;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const routeTitles: Record<string, string> = {
  "/dashboard": "แดชบอร์ด",
  "/chart": "กราฟระดับน้ำ",
  "/history": "ประวัติข้อมูล",
  "/stations": "จัดการสถานี",
  "/users": "จัดการผู้ใช้",
  "/profile": "ข้อมูลโปรไฟล์",
  "/management": "ศูนย์การจัดการ",
  "/login": "เข้าสู่ระบบ",
};

const getPageTitle = (pathname?: string): string => {
  if (!pathname || pathname === "/") return "แดชบอร์ด";
  if (routeTitles[pathname]) return routeTitles[pathname];
  const matched = Object.keys(routeTitles).find(
    (key) => key !== "/" && pathname.startsWith(key)
  );
  if (matched) return routeTitles[matched];
  if (pathname.startsWith("/nodes/")) return "ข้อมูลสถานี";
  return "แดชบอร์ด";
};

export default function TopBar({
  pathname,
  notifications,
  onMarkRead,
  onMarkAllRead,
}: TopBarProps) {
  const [showNotif, setShowNotif] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent("app:refresh"));
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="topbar">
      {/* Left: Desktop Dynamic Page Title (Mindtrip style) / Mobile Brand */}
      <div className="topbar-left-zone">
        <h1 className="topbar-page-title">{pageTitle}</h1>
        <div className="topbar-mobile-brand">
          <Logo size="sm" showSubtitle={false} />
          <span className="topbar-mobile-separator" aria-hidden="true">
            /
          </span>
          <span className="topbar-mobile-title">{pageTitle}</span>
        </div>
      </div>

      {/* Right: Minimal Ghost Action Buttons */}
      <div className="topbar-actions">
        {/* Global Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="topbar-action-btn"
          title="รีเฟรชข้อมูลทุกระบบ"
          aria-label="รีเฟรชข้อมูลทุกระบบ"
        >
          <RefreshCwIcon size={15} className={refreshing ? "spin" : ""} />
        </button>

        {/* Notification button */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="topbar-action-btn"
            onClick={() => setShowNotif((v) => !v)}
            aria-label="การแจ้งเตือน"
            title="การแจ้งเตือน"
          >
            <BellIcon size={15} />
            {unreadCount > 0 && (
              <span
                className="notif-badge"
                aria-label={`มีการแจ้งเตือนที่ยังไม่ได้อ่าน ${unreadCount} รายการ`}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <NotificationPanel
              notifications={notifications}
              onMarkRead={(id) => {
                onMarkRead(id);
              }}
              onMarkAllRead={() => {
                onMarkAllRead();
              }}
              onClose={() => setShowNotif(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}

