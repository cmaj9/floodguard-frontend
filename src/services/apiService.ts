/**
 * API Service — connects Frontend to Backend REST API
 * Falls back to mock data if backend is unavailable
 */
import axios from 'axios';
import type { Reading, StationWithReading, User, AuthUser, DbAlert, NotificationSettings, SubscriberPreferences } from '../types';

const DEFAULT_API_URL = 'https://waterwatch-backend-production.up.railway.app';
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.')
);
const BASE_URL = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:3001' : DEFAULT_API_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const directToken = localStorage.getItem('wl_auth_token');
  if (directToken) return directToken;
  try {
    const userStr = localStorage.getItem('wl_auth_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.token) {
        localStorage.setItem('wl_auth_token', user.token);
        return user.token;
      }
    }
  } catch {}
  return null;
};

export const setAuthToken = (token: string | null) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('wl_auth_token', token);
  } else {
    localStorage.removeItem('wl_auth_token');
  }
};

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Promote custom backend error string to error.message if available
    const backendMessage = error.response?.data?.error;
    if (backendMessage && typeof backendMessage === 'string') {
      error.message = backendMessage;
    }

    // Handle 401 Unauthorized on protected routes
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isLoginOrAuth = requestUrl.includes('/api/auth/login') || requestUrl.includes('/api/users/login');

      if (!isLoginOrAuth && typeof window !== 'undefined') {
        console.warn('[apiService] 401 Unauthorized detected for endpoint:', requestUrl);
        setAuthToken(null);
        window.dispatchEvent(
          new CustomEvent('app:unauthorized', {
            detail: {
              message: backendMessage || 'เซสชันการเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
              url: requestUrl,
            },
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

// ── Types ─────────────────────────────────────────────────────────
interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
}

// ── Health ────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string; mqtt: string }> {
  const res = await api.get('/health');
  return res.data;
}

// ── Readings ──────────────────────────────────────────────────────

/**
 * GET /api/readings
 * Latest reading for each station → shown in dashboard table
 */
export async function fetchLatestReadings(): Promise<Reading[]> {
  const res = await api.get<ApiResponse<Reading[]>>('/api/readings');
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to fetch readings');
  return res.data.data;
}

/**
 * GET /api/readings/:stationId
 * Recent readings for one station (paginated)
 */
export async function fetchReadingsByStation(
  stationId: string,
  limit = 100,
  offset = 0
): Promise<Reading[]> {
  const res = await api.get<ApiResponse<Reading[]>>(
    `/api/readings/${stationId}`,
    { params: { limit, offset } }
  );
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to fetch readings');
  return res.data.data;
}

/**
 * GET /api/readings/:stationId/range
 * Readings in time range for charts
 */
export async function fetchReadingsInRange(
  stationId: string,
  start: Date,
  end: Date
): Promise<Reading[]> {
  const res = await api.get<ApiResponse<Reading[]>>(
    `/api/readings/${stationId}/range`,
    {
      params: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    }
  );
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to fetch readings');
  return res.data.data;
}

// ── Reading History (Admin) ────────────────────────────────────────

export interface ReadingsHistoryParams {
  stationId?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

export interface ReadingsHistoryResponse {
  data: Reading[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * GET /api/readings/history
 * All readings from all stations (admin only), supports filter + pagination
 */
export async function fetchReadingsHistory(
  params: ReadingsHistoryParams = {}
): Promise<ReadingsHistoryResponse> {
  const res = await api.get<ApiResponse<Reading[]> & { total: number; limit: number; offset: number }>(
    '/api/readings/history',
    { params }
  );
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to fetch reading history');
  return {
    data: res.data.data,
    total: res.data.total,
    limit: res.data.limit,
    offset: res.data.offset,
  };
}


/**
 * GET /api/readings/export/csv
 * Download raw CSV directly from Backend Database
 */
export async function downloadReadingsCSV(params: {
  stationId?: string;
  timeRange?: string;
  start?: string;
  end?: string;
}): Promise<Blob> {
  const res = await api.get('/api/readings/export/csv', {
    params,
    responseType: 'blob',
  });
  return res.data;
}

// ── Stations ──────────────────────────────────────────────────────

/**
 * GET /api/stations
 * All stations with their latest reading and derived water_status
 */
export async function fetchStations(): Promise<StationWithReading[]> {
  const res = await api.get<ApiResponse<StationWithReading[]>>('/api/stations');
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to fetch stations');
  return res.data.data;
}

/**
 * GET /api/stations/:stationId
 * Single station detail
 */
export async function fetchStation(stationId: string): Promise<StationWithReading> {
  const res = await api.get<ApiResponse<StationWithReading>>(`/api/stations/${stationId}`);
  if (!res.data.success) throw new Error(res.data.error ?? 'Station not found');
  return res.data.data;
}

/**
 * PUT /api/stations/:stationId/calibration
 * Quick update for station physical calibration and reference point
 */
export async function updateStationCalibration(
  stationId: string,
  calibrationData: {
    sensor_to_ref_distance: number;
    reference_point_name?: string;
    warning_level?: number | null;
    critical_level?: number | null;
    blind_zone_offset?: number;
    tilt_compensation_enabled?: boolean;
    tilt_offset_x?: number;
    tilt_offset_y?: number;
  }
): Promise<StationWithReading> {
  const res = await api.put<ApiResponse<StationWithReading>>(
    `/api/stations/${stationId}/calibration`,
    calibrationData
  );
  if (!res.data.success) throw new Error(res.data.error ?? 'บันทึกการตั้งค่าจุดอ้างอิงไม่สำเร็จ');
  return res.data.data;
}

/**
 * PUT /api/stations/:stationId
 * Update full station metadata & calibration
 */
export async function updateStation(
  stationId: string,
  stationData: Partial<StationWithReading>
): Promise<StationWithReading> {
  const res = await api.put<ApiResponse<StationWithReading>>(
    `/api/stations/${stationId}`,
    stationData
  );
  if (!res.data.success) throw new Error(res.data.error ?? 'แก้ไขข้อมูลสถานีไม่สำเร็จ');
  return res.data.data;
}

/**
 * POST /api/stations
 * Create new station
 */
export async function createStation(
  stationData: Partial<StationWithReading>
): Promise<StationWithReading> {
  const res = await api.post<ApiResponse<StationWithReading>>(
    '/api/stations',
    stationData
  );
  if (!res.data.success) throw new Error(res.data.error ?? 'เพิ่มสถานีไม่สำเร็จ');
  return res.data.data;
}

/**
 * DELETE /api/stations/:stationId
 * Delete a station and its associated records
 */
export async function deleteStation(stationId: string): Promise<void> {
  const res = await api.delete<ApiResponse<{ station_id: string }>>(`/api/stations/${stationId}`);
  if (!res.data.success) throw new Error(res.data.error ?? 'ลบสถานีไม่สำเร็จ');
}

/**
 * GET /api/stations/gateways
 * List all gateways for dropdown selection
 */
export interface GatewayOption {
  gateway_id: string;
  gateway_name: string;
  status: string;
  ip_address?: string;
}

export async function fetchGateways(): Promise<GatewayOption[]> {
  const res = await api.get<ApiResponse<GatewayOption[]>>('/api/stations/gateways');
  if (!res.data.success) throw new Error(res.data.error ?? 'ดึงข้อมูล Gateway ไม่สำเร็จ');
  return res.data.data;
}

/**
 * GET /api/stations/next-id
 * Auto-generate the next sequential station ID (e.g. ST-004)
 */
export async function fetchNextStationId(): Promise<string> {
  const res = await api.get<ApiResponse<{ next_id: string }>>('/api/stations/next-id');
  if (!res.data.success) throw new Error(res.data.error ?? 'ดึง Station ID ไม่สำเร็จ');
  return res.data.data.next_id;
}

// ── Auth & Users ──────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Real login using email and bcrypt password check from PostgreSQL
 */
export async function loginApi(email: string, password: string): Promise<AuthUser> {
  const res = await api.post<ApiResponse<AuthUser>>('/api/auth/login', { email, password });
  if (!res.data.success) throw new Error(res.data.error ?? 'เข้าสู่ระบบไม่สำเร็จ');
  return res.data.data;
}

/**
 * POST /api/auth/register
 * Self-registration for citizens using email and password
 */
export async function registerEmailApi(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  district?: string;
  stationIds?: string[];
}): Promise<AuthUser> {
  const res = await api.post<ApiResponse<AuthUser>>('/api/auth/register', data);
  if (!res.data.success) throw new Error(res.data.error ?? 'ลงทะเบียนไม่สำเร็จ');
  return res.data.data;
}

/**
 * GET /api/users
 * Fetch all users from PostgreSQL
 */
export async function fetchUsers(role?: string): Promise<User[]> {
  const res = await api.get<ApiResponse<User[]>>('/api/users', {
    params: role && role !== 'all' ? { role } : {},
  });
  if (!res.data.success) throw new Error(res.data.error ?? 'ดึงข้อมูลผู้ใช้ไม่สำเร็จ');
  return res.data.data;
}

/**
 * POST /api/users
 * Create user in PostgreSQL
 */
export async function createUser(userData: Partial<User>): Promise<User> {
  const res = await api.post<ApiResponse<User>>('/api/users', userData);
  if (!res.data.success) throw new Error(res.data.error ?? 'สร้างผู้ใช้ไม่สำเร็จ');
  return res.data.data;
}

/**
 * PUT /api/users/:id
 * Update user in PostgreSQL
 */
export async function updateUser(id: string, userData: Partial<User>): Promise<User> {
  const res = await api.put<ApiResponse<User>>(`/api/users/${id}`, userData);
  if (!res.data.success) throw new Error(res.data.error ?? 'แก้ไขข้อมูลผู้ใช้ไม่สำเร็จ');
  return res.data.data;
}

/**
 * DELETE /api/users/:id
 * Delete user from PostgreSQL
 */
export async function deleteUser(id: string): Promise<void> {
  const res = await api.delete<ApiResponse<unknown>>(`/api/users/${id}`);
  if (!res.data.success) throw new Error(res.data.error ?? 'ลบผู้ใช้ไม่สำเร็จ');
}

// ── Alerts ────────────────────────────────────────────────────────

/**
 * GET /api/alerts
 * Fetch alerts list with station info
 */
export async function fetchAlerts(params?: {
  limit?: number;
  offset?: number;
  stationId?: string;
  status?: string;
}): Promise<DbAlert[]> {
  const res = await api.get<ApiResponse<DbAlert[]>>('/api/alerts', { params });
  if (!res.data.success) throw new Error(res.data.error ?? 'ดึงข้อมูลการแจ้งเตือนไม่สำเร็จ');
  return res.data.data;
}

/**
 * PATCH /api/alerts/:alertId/acknowledge
 * Mark alert as acknowledged
 */
export async function acknowledgeAlert(alertId: string): Promise<DbAlert> {
  const res = await api.patch<ApiResponse<DbAlert>>(`/api/alerts/${alertId}/acknowledge`);
  if (!res.data.success) throw new Error(res.data.error ?? 'รับทราบการแจ้งเตือนไม่สำเร็จ');
  return res.data.data;
}

// ── Station Status Control ────────────────────────────────────────

/**
 * PATCH /api/stations/:stationId/status
 * Quickly toggle station between 'active', 'offline', 'maintenance'
 */
export async function updateStationStatus(
  stationId: string,
  status: 'active' | 'offline' | 'maintenance'
): Promise<StationWithReading> {
  const res = await api.patch<ApiResponse<StationWithReading>>(
    `/api/stations/${stationId}/status`,
    { status }
  );
  if (!res.data.success) throw new Error(res.data.error ?? 'เปลี่ยนสถานะสถานีไม่สำเร็จ');
  return res.data.data;
}

// ── Notification Settings (LINE & Alerts) ─────────────────────────

/**
 * GET /api/notifications/settings or /api/notifications/settings/:stationId
 * Fetch global or station-specific notification criteria
 */
export async function fetchNotificationSettings(stationId?: string): Promise<NotificationSettings> {
  const url = stationId
    ? `/api/notifications/settings/${stationId}`
    : '/api/notifications/settings';
  const res = await api.get<ApiResponse<NotificationSettings>>(url);
  if (!res.data.success) throw new Error(res.data.error ?? 'ดึงข้อมูลการตั้งค่าแจ้งเตือนไม่สำเร็จ');
  return res.data.data;
}

/**
 * PUT /api/notifications/settings or /api/notifications/settings/:stationId
 * Save global or station-specific notification criteria
 */
export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>,
  stationId?: string
): Promise<NotificationSettings> {
  const url = stationId
    ? `/api/notifications/settings/${stationId}`
    : '/api/notifications/settings';
  const res = await api.put<ApiResponse<NotificationSettings>>(url, settings);
  if (!res.data.success) throw new Error(res.data.error ?? 'บันทึกการตั้งค่าแจ้งเตือนไม่สำเร็จ');
  return res.data.data;
}

/**
 * DELETE /api/notifications/settings/:stationId
 * Reset station-specific settings to inherit global defaults
 */
export async function resetStationNotificationSettings(stationId: string): Promise<void> {
  const res = await api.delete<ApiResponse<unknown>>(`/api/notifications/settings/${stationId}`);
  if (!res.data.success) throw new Error(res.data.error ?? 'รีเซ็ตการตั้งค่าสถานีไม่สำเร็จ');
}

export interface LineQuotaStatus {
  configured: boolean;
  type?: string;
  total?: number;
  used?: number;
  remaining?: number | null;
  isExceeded?: boolean;
}

/**
 * GET /api/notifications/line-quota
 * Fetch LINE Messaging API monthly quota usage and limit
 */
export async function fetchLineQuotaStatus(): Promise<LineQuotaStatus> {
  const res = await api.get<ApiResponse<LineQuotaStatus>>('/api/notifications/line-quota');
  if (!res.data.success) throw new Error(res.data.error ?? 'ดึงข้อมูลโควตา LINE ไม่สำเร็จ');
  return res.data.data;
}

// ── LINE Subscriber Preferences ───────────────────────────────────

/**
 * GET /api/notifications/subscribers/:lineUserId
 * Fetch subscriber station selections and preferences
 */
export async function fetchSubscriberPreferences(lineUserId: string): Promise<SubscriberPreferences> {
  const res = await api.get<ApiResponse<SubscriberPreferences>>(
    `/api/notifications/subscribers/${lineUserId}`
  );
  if (!res.data.success) throw new Error(res.data.error ?? 'ดึงข้อมูลการติดตามไม่สำเร็จ');
  return res.data.data;
}

/**
 * POST /api/notifications/subscribers
 * Save subscriber preferences from the public LINE web subscription page
 */
export async function saveSubscriberPreferences(
  data: Partial<SubscriberPreferences>
): Promise<SubscriberPreferences> {
  const res = await api.post<ApiResponse<SubscriberPreferences>>(
    '/api/notifications/subscribers',
    data
  );
  if (!res.data.success) throw new Error(res.data.error ?? 'บันทึกข้อมูลการติดตามไม่สำเร็จ');
  return res.data.data;
}

/**
 * POST /api/users/citizen-register
 * 1-Tap LIFF Citizen Registration
 */
export async function registerCitizenApi(data: {
  lineUserId: string;
  displayName?: string;
  pictureUrl?: string;
  phone?: string;
  district?: string;
  stationIds?: string[];
}): Promise<AuthUser> {
  const res = await api.post<ApiResponse<AuthUser>>('/api/users/citizen-register', data);
  if (!res.data.success) throw new Error(res.data.error ?? 'ลงทะเบียนไม่สำเร็จ');
  return res.data.data;
}

/**
 * GET /api/users/citizen-status/:lineUserId
 * Check if citizen is registered
 */
export async function checkCitizenStatusApi(
  lineUserId: string
): Promise<{ registered: boolean; data: AuthUser | null }> {
  const res = await api.get<any>(`/api/users/citizen-status/${encodeURIComponent(lineUserId)}`);
  return { registered: !!res.data.registered, data: res.data.data };
}

/**
 * POST /api/users/setup-credentials
 * Setup real email and password for citizen
 */
export async function setupCredentialsApi(data: {
  userId?: string;
  lineUserId?: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const res = await api.post<ApiResponse<AuthUser>>('/api/users/setup-credentials', data);
  if (!res.data.success) throw new Error(res.data.error ?? 'ตั้งค่าอีเมลและรหัสผ่านไม่สำเร็จ');
  return res.data.data;
}

/**
 * POST /api/users/change-password
 * Change password for authenticated user with current password verification
 */
export async function changePasswordApi(data: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await api.post<ApiResponse<{ success: boolean; message: string }>>('/api/users/change-password', data);
  if (!res.data.success) throw new Error(res.data.error ?? 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
  return res.data.data;
}

/**
 * POST /api/users/link-line
 * Link LINE account to currently logged-in user
 */
export async function linkLineApi(data: {
  userId: string;
  lineUserId: string;
  displayName?: string;
  pictureUrl?: string;
}): Promise<AuthUser> {
  const res = await api.post<ApiResponse<AuthUser>>('/api/users/link-line', data);
  if (!res.data.success) throw new Error(res.data.error ?? 'เชื่อมต่อบัญชี LINE ไม่สำเร็จ');
  return res.data.data;
}

export default api;

