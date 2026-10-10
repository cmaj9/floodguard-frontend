export type UserRole = 'citizen' | 'staff' | 'admin';
export type WaterStatus = 'normal' | 'warning' | 'critical' | 'unknown';
export type TimeRange = 'hourly' | 'daily' | 'weekly';
export type NotificationType = 'info' | 'warning' | 'critical';

/** Maps to the `readings` table in the database */
export interface Reading {
  reading_id: number;
  station_id: string;
  station_name?: string;
  location_name?: string;
  reference_point_name?: string;
  sensor_to_ref_distance?: number;
  warning_level?: number | null;
  critical_level?: number | null;
  water_status?: WaterStatus;
  timestamp: string;
  raw_distance?: number | null;
  water_level: number | null;
  is_blind_zone?: boolean;
  temperature: number | null;
  humidity: number | null;
  battery_voltage: number | null;
  battery_percent: number | null;
  rssi: number | null;
  snr: number | null;
  tilt_x: number | null;
  tilt_y: number | null;
  tilt_offset_x?: number | null;
  tilt_offset_y?: number | null;
  rel_tilt_x?: number | null;
  rel_tilt_y?: number | null;
  relative_total_tilt?: number | null;
  is_pole_tilted?: boolean;
  latitude: number | null;
  longitude: number | null;
}

/** Station with latest reading and derived water_status (from API /api/stations) */
export interface StationWithReading {
  station_id: string;
  station_name: string;
  station_type: string;
  location_name: string;
  latitude: number;
  longitude: number;
  status: string;
  sensor_to_ref_distance?: number;
  reference_point_name?: string;
  blind_zone_offset?: number;
  tilt_compensation_enabled?: boolean;
  warning_level: number | null;
  critical_level: number | null;
  max_level: number | null;
  normal_max: number | null;
  gateway_id?: string;
  gateway_name: string;
  gateway_status: string;
  last_reading_time: string | null;
  raw_distance?: number | null;
  water_level: number | null;
  is_blind_zone?: boolean;
  temperature: number | null;
  humidity: number | null;
  battery_voltage: number | null;
  battery_percent: number | null;
  rssi: number | null;
  snr: number | null;
  tilt_x: number | null;
  tilt_y: number | null;
  tilt_offset_x?: number | null;
  tilt_offset_y?: number | null;
  rel_tilt_x?: number | null;
  rel_tilt_y?: number | null;
  relative_total_tilt?: number | null;
  is_pole_tilted?: boolean;
  water_status: WaterStatus;
  model?: string;
  mcu_id?: string;
  firmware_version?: string;
  install_date?: string;
  ip_address?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  stationIds: string[];
  phone: string;
  district: string;
  lineUserId?: string | null;
  line_user_id?: string | null;
  pictureUrl?: string | null;
  isActive?: boolean;
  isCredentialsSet?: boolean;
  is_credentials_set?: boolean;
  token?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  stationIds: string[];
  station_ids?: string[];
  createdAt: string;
  created_at?: string;
  district: string;
  lineUserId?: string | null;
  line_user_id?: string | null;
  pictureUrl?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  isCredentialsSet?: boolean;
  is_credentials_set?: boolean;
  password?: string;
}

export interface DbAlert {
  alert_id: string;
  station_id: string;
  station_name?: string;
  location_name?: string;
  timestamp: string;
  alert_type: 'water_level' | 'rate_of_rise' | 'offline' | 'online' | 'battery' | 'geofence' | 'tilt';
  value: number | null;
  threshold: number | null;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

export interface Station {
  id: string;
  name: string;
  description: string;
  location: string;
  district: string;
  province: string;
  lat: number;
  lng: number;
  currentLevel: number; // meters (relative to reference point, can be negative or positive)
  sensorToRefDistance?: number;
  referencePointName?: string;
  rawDistance?: number | null;
  isBlindZone?: boolean;
  blindZoneOffset?: number;
  tiltCompensationEnabled?: boolean;
  maxLevel?: number;
  normalMax?: number;
  warningLevel?: number;
  criticalLevel?: number;
  status: WaterStatus;
  operatingStatus?: 'active' | 'offline' | 'maintenance';
  lastUpdated: string;
  isActive: boolean;
  deviceId: string;
  batteryPercent?: number;
  batteryVoltage?: number;
  temperature?: number;
  humidity?: number;
  rssi?: number;
  snr?: number;
  tiltX?: number;
  tiltY?: number;
  tiltOffsetX?: number;
  tiltOffsetY?: number;
  relTiltX?: number;
  relTiltY?: number;
  relativeTotalTilt?: number;
  isPoleTilted?: boolean;
  gatewayName?: string;
  gatewayStatus?: string;
  model?: string;
  firmwareVersion?: string;
  stationType?: string;
  imageUrl?: string;
}

export interface WaterLevelReading {
  timestamp: string;
  level: number;
  stationId: string;
  minLevel?: number;
  maxLevel?: number;
  count?: number;
  label?: string;
  rawDistance?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  batteryVoltage?: number | null;
  batteryPercent?: number | null;
  rssi?: number | null;
  snr?: number | null;
  tiltX?: number | null;
  tiltY?: number | null;
  isBlindZone?: boolean;
}


export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  stationId?: string;
  stationName?: string;
}

export interface NotificationSettings {
  setting_id?: number;
  station_id?: string | null;
  // Condition 1: Water Level Safety Offset
  water_level_enabled: boolean;
  safety_offset: number;
  water_level_cooldown_minutes?: number;
  // Condition 2: Rate of Rise
  rate_of_rise_enabled: boolean;
  rate_of_rise_threshold: number;
  rate_of_rise_cooldown_minutes?: number;
  // Condition 3: Offline Timeout
  offline_timeout_enabled: boolean;
  offline_timeout_minutes: number;
  offline_cooldown_minutes?: number;
  // Condition 4: Battery Low
  battery_low_enabled: boolean;
  battery_low_threshold: number;
  battery_low_cooldown_minutes?: number;
  // Condition 5: Geofence
  geofence_enabled: boolean;
  geofence_radius_meters: number;
  geofence_cooldown_minutes?: number;
  is_custom?: boolean;
  updated_at?: string;
}

export interface SubscriberPreferences {
  line_user_id: string;
  display_name?: string;
  picture_url?: string;
  station_ids: string[];
  is_active?: boolean;
  is_new?: boolean;
}
