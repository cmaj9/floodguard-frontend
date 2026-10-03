import { useState, useEffect } from "react";
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

export default function TopBar({
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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    // Update every 30 seconds — accurate enough for HH:MM display
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="topbar-logo-area">
          <Logo size="sm" showSubtitle={false} />
          <div className="topbar-datetime" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, fontWeight: 500 }}>
            <span className="topbar-date-full">{dateStr} · </span>
            <span className="topbar-time-live">{timeStr} น.</span>
          </div>
        </div>
      </div>

      <div
        className="topbar-actions"
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        {/* Global Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="topbar-action-btn"
          title="รีเฟรชข้อมูลทุกระบบ"
          aria-label="รีเฟรชข้อมูล"
        >
          <RefreshCwIcon size={14} className={refreshing ? "spin" : ""} />
        </button>

        {/* Notification button */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="topbar-action-btn"
            onClick={() => setShowNotif((v) => !v)}
            aria-label="การแจ้งเตือน"
          >
            <BellIcon size={14} />
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
