import { useState, useEffect } from "react";
import NotificationPanel from "../ui/NotificationPanel";
import type { AppNotification } from "../../types";
import { BellIcon, RefreshCwIcon, MaximizeIcon, MinimizeIcon } from "../ui/Icons";

const pageTitles: Record<string, string> = {
  "/dashboard": "แดชบอร์ด",
  "/chart": "กราฟระดับน้ำ",
  "/users": "จัดการผู้ใช้",
  "/stations": "จัดการสถานี",
  "/history": "ติดตามข้อมูล",
  "/profile": "โปรไฟล์",
};

interface TopBarProps {
  pathname: string;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export default function TopBar({
  pathname,
  notifications,
  onMarkRead,
  onMarkAllRead,
}: TopBarProps) {
  const [showNotif, setShowNotif] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent("app:refresh"));
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const now = new Date();
  const timeStr = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">
          {pageTitles[pathname] ?? "FloodGuard"}
        </div>
        <div className="topbar-datetime" style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
          <span className="topbar-date-full">{dateStr} · </span>
          <span className="topbar-time-live">{timeStr} น.</span>
        </div>
      </div>

      <div
        className="topbar-actions"
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        {/* Fullscreen Kiosk Mode (Desktop & TV Wall only) */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="btn btn-secondary btn-sm desktop-fullscreen-btn"
          title={isFullscreen ? "ออกจากโหมดเต็มจอ" : "โหมดเต็มจอ (สำหรับจอทีวี / War Room)"}
          aria-label={isFullscreen ? "ออกจากโหมดเต็มจอ" : "เต็มจอ"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            padding: 0,
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          {isFullscreen ? <MinimizeIcon size={16} /> : <MaximizeIcon size={16} />}
        </button>

        {/* Global Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-secondary btn-sm topbar-refresh-btn"
          title="รีเฟรชข้อมูลทุกระบบ"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 36,
            fontSize: 13,
            fontWeight: 600,
            borderRadius: "var(--radius-sm)",
            cursor: refreshing ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCwIcon size={14} className={refreshing ? "spin" : ""} />
          <span className="topbar-refresh-text">รีเฟรช</span>
        </button>

        {/* Notification button */}
        <div style={{ position: "relative" }}>
          <button
            className="notif-btn"
            onClick={() => setShowNotif((v) => !v)}
            aria-label="การแจ้งเตือน"
          >
            <BellIcon size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge">
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
