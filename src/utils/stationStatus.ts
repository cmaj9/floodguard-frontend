import type { Station } from '../types';

/**
 * Checks whether a station is online.
 * Considers:
 * 1. Explicit isOnline flag from backend (if provided)
 * 2. Operating status / manual status ('offline' or 'maintenance' -> false)
 * 3. Real-time client-side timeout check:
 *    If (now - lastUpdated) >= offlineTimeoutMinutes * 60 * 1000, mark as offline immediately.
 *
 * @param station The station object
 * @param now Optional timestamp for testing or synchronization (defaults to Date.now())
 */
export function isStationOnline(
  station: Partial<Station> | null | undefined,
  now: number = Date.now()
): boolean {
  if (!station) return false;

  // If station is explicitly deactivated or offline
  if (station.operatingStatus === 'offline' || station.operatingStatus === 'maintenance') {
    return false;
  }
  if (station.isActive === false && station.operatingStatus !== 'active') {
    return false;
  }

  // If backend already marked isOnline as false
  if (typeof station.isOnline === 'boolean' && !station.isOnline) {
    return false;
  }

  // Real-time client-side elapsed check against station notification threshold
  const lastReadingTime = station.lastUpdated ? new Date(station.lastUpdated).getTime() : 0;
  const statusUpdatedTime = station.statusUpdatedAt ? new Date(station.statusUpdatedAt).getTime() : 0;
  const lastActiveTime = Math.max(
    isNaN(lastReadingTime) ? 0 : lastReadingTime,
    isNaN(statusUpdatedTime) ? 0 : statusUpdatedTime
  );

  if (lastActiveTime > 0) {
    const timeoutMinutes =
      typeof station.offlineTimeoutMinutes === 'number' && station.offlineTimeoutMinutes > 0
        ? station.offlineTimeoutMinutes
        : 30; // fallback to 30 min default

    const elapsedMinutes = (now - lastActiveTime) / (60 * 1000);
    if (elapsedMinutes >= timeoutMinutes) {
      return false;
    }
  }

  return true;
}

/**
 * Get human-readable relative time string in Thai
 */
export function formatRelativeTimeThai(timestampStr: string | null | undefined, now: number = Date.now()): string {
  if (!timestampStr) return 'ไม่ทราบเวลา';
  const t = new Date(timestampStr).getTime();
  if (isNaN(t)) return 'ไม่ทราบเวลา';

  const diffSeconds = Math.max(0, Math.floor((now - t) / 1000));
  if (diffSeconds < 60) {
    return 'เมื่อสักครู่';
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} นาทีที่แล้ว`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    const mins = diffMinutes % 60;
    return mins > 0 ? `${diffHours} ชม. ${mins} นาทีที่แล้ว` : `${diffHours} ชั่วโมงที่แล้ว`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} วันที่แล้ว`;
}
