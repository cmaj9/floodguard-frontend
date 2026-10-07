import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppNotification, DbAlert } from '../types';
import { fetchAlerts, acknowledgeAlert } from '../services/apiService';
import { mockNotifications } from '../data/mockData';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

function mapAlertToNotification(a: DbAlert): AppNotification {
  let title = 'แจ้งเตือนระบบน้ำ';
  let type: 'info' | 'warning' | 'critical' = 'warning';

  switch (a.alert_type) {
    case 'water_level':
      title = 'ระดับน้ำเกินเกณฑ์ความปลอดภัย';
      type = 'critical';
      break;
    case 'rate_of_rise':
      title = 'ระดับน้ำเพิ่มขึ้นเร็วผิดปกติ';
      type = 'critical';
      break;
    case 'offline':
      title = 'สถานีขาดการติดต่อ';
      type = 'warning';
      break;
    case 'online':
      title = 'สถานีกลับมาออนไลน์ตามปกติ';
      type = 'info';
      break;
    case 'battery':
      title = 'แบตเตอรี่สถานีต่ำ';
      type = 'warning';
      break;
    case 'geofence':
      title = 'สถานีเคลื่อนที่ออกนอกพิกัด';
      type = 'critical';
      break;
    case 'tilt':
      title = 'ทุ่นหรือเสาสถานีเอียงผิดปกติ';
      type = 'warning';
      break;
  }

  return {
    id: a.alert_id,
    title: `${title} - ${a.station_name || a.station_id}`,
    message: a.message,
    type,
    timestamp: a.timestamp,
    read: a.status === 'acknowledged' || a.status === 'resolved',
    stationId: a.station_id,
    stationName: a.station_name,
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadAlerts = useCallback(async () => {
    try {
      const dbAlerts = await fetchAlerts({ limit: 40 });
      if (dbAlerts && dbAlerts.length > 0) {
        setNotifications(dbAlerts.map(mapAlertToNotification));
      } else {
        // If DB has no alerts yet, keep empty or minimal mock notifications
        setNotifications([]);
      }
    } catch (err) {
      console.warn('[NotificationContext] Failed to load alerts from DB, using fallback:', err);
      setNotifications((prev) => (prev.length > 0 ? prev : mockNotifications));
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    // Poll alerts every 20 seconds
    const interval = setInterval(loadAlerts, 20000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const markRead = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      await acknowledgeAlert(id);
    } catch (err) {
      console.warn(`[NotificationContext] Failed to acknowledge alert ${id}:`, err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    for (const notif of unread) {
      try {
        await acknowledgeAlert(notif.id);
      } catch (err) {
        console.warn(`[NotificationContext] Error marking all read for ${notif.id}:`, err);
      }
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markRead,
        markAllRead,
        refreshAlerts: loadAlerts,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
