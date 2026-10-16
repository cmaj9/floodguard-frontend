import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { format, subHours, subDays } from 'date-fns';
import type { Station, StationWithReading, Reading, TimeRange, WaterStatus } from '../types';
import { isStationOnline, formatRelativeTimeThai } from '../utils/stationStatus';
import {
  fetchStations,
  fetchReadingsInRange,
  updateStation,
  updateStationStatus,
  updateStationCalibration,
} from '../services/apiService';
import StationModal from '../components/stations/StationModal';
import StationCalibrationModal from '../components/stations/StationCalibrationModal';
import StationNotificationModal from '../components/stations/StationNotificationModal';
import StationStatusConfirmModal from '../components/stations/StationStatusConfirmModal';
import SegmentedControl from '../components/ui/SegmentedControl';
import type { SegmentedOption } from '../components/ui/SegmentedControl';
import {
  ArrowLeftIcon,
  MapPinIcon,
  DropletsIcon,
  ThermometerIcon,
  ActivityIcon,
  BatteryChargingIcon,
  SlidersIcon,
  BellIcon,
  Edit3Icon,
  AlertTriangleIcon,
  WavesIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  WifiIcon,
} from '../components/ui/Icons';
import { SkeletonCard } from '../components/ui/Skeleton';

const timeframeOptions: SegmentedOption<TimeRange>[] = [
  { value: 'hourly', label: '24 ชม.' },
  { value: 'daily', label: '7 วัน' },
  { value: 'weekly', label: '30 วัน' },
];

const statusLabel: Record<WaterStatus, string> = {
  normal: 'ออนไลน์',
  warning: 'เฝ้าระวัง',
  critical: 'วิกฤต',
  unknown: 'ไม่มีข้อมูล',
};

const statusClass: Record<WaterStatus, string> = {
  normal: 'badge-normal',
  warning: 'badge-warning',
  critical: 'badge-critical',
  unknown: 'badge-unknown',
};

const mapStationWithReadingToStation = (swr: StationWithReading): Station => {
  let district = '';
  let province = '';
  if (swr.location_name) {
    const parts = swr.location_name.split(' ');
    district = parts[0] ? parts[0].replace(/^[อส]\./, '') : '';
    province = parts[1] ? parts[1].replace(/^[จ]\./, '') : '';
  }

  const sToRef =
    swr.sensor_to_ref_distance !== undefined && swr.sensor_to_ref_distance !== null
      ? Number(swr.sensor_to_ref_distance)
      : 2.0;
  const refName =
    swr.reference_point_name && swr.reference_point_name.trim() !== ''
      ? swr.reference_point_name.trim()
      : 'จุดอ้างอิง';

  return {
    id: swr.station_id,
    name: swr.station_name,
    description: `ประเภท ${swr.station_type || 'สถานีตรวจวัด'} · Gateway ${swr.gateway_name || '-'}`,
    location: swr.location_name || '',
    district,
    province,
    lat: Number(swr.latitude) || 14.03593,
    lng: Number(swr.longitude) || 100.72516,
    currentLevel:
      swr.raw_distance != null
        ? Number((sToRef - Number(swr.raw_distance)).toFixed(3))
        : swr.water_level != null
        ? Number(swr.water_level)
        : null,
    sensorToRefDistance: sToRef,
    referencePointName: refName,
    rawDistance: swr.raw_distance != null ? Number(swr.raw_distance) : null,
    isBlindZone: Boolean(swr.is_blind_zone),
    blindZoneOffset: swr.blind_zone_offset != null ? Number(swr.blind_zone_offset) : 0.28,
    tiltCompensationEnabled: swr.tilt_compensation_enabled !== false,
    maxLevel: swr.max_level != null ? Number(swr.max_level) : undefined,
    normalMax: swr.normal_max != null ? Number(swr.normal_max) : undefined,
    warningLevel: swr.warning_level != null ? Number(swr.warning_level) : undefined,
    criticalLevel: swr.critical_level != null ? Number(swr.critical_level) : undefined,
    status: swr.water_status || 'unknown',
    operatingStatus: (swr.status as 'active' | 'offline' | 'maintenance') || 'active',
    lastReadingTime: swr.last_reading_time || null,
    statusUpdatedAt: swr.status_updated_at || null,
    lastUpdated: swr.last_reading_time || '',
    isActive: swr.status === 'active',
    isOnline: swr.is_online !== undefined ? Boolean(swr.is_online) : swr.status === 'active',
    manualStatus: (swr.manual_status || swr.status || 'active') as 'active' | 'offline' | 'maintenance',
    manualOfflineAt: swr.manual_offline_at || null,
    isManualOffline: swr.is_manual_offline !== undefined ? Boolean(swr.is_manual_offline) : Boolean(swr.manual_offline_at),
    offlineTimeoutMinutes: swr.offline_timeout_minutes != null ? Number(swr.offline_timeout_minutes) : 30,
    minutesSinceLastReading: swr.minutes_since_last_reading != null ? Number(swr.minutes_since_last_reading) : undefined,
    deviceId: swr.station_id,
    batteryPercent: swr.battery_percent != null ? Number(swr.battery_percent) : undefined,
    batteryVoltage: swr.battery_voltage != null ? Number(swr.battery_voltage) : undefined,
    temperature: swr.temperature != null ? Number(swr.temperature) : undefined,
    humidity: swr.humidity != null ? Number(swr.humidity) : undefined,
    rssi: swr.rssi != null ? Number(swr.rssi) : undefined,
    snr: swr.snr != null ? Number(swr.snr) : undefined,
    tiltX: swr.tilt_x != null ? Number(swr.tilt_x) : undefined,
    tiltY: swr.tilt_y != null ? Number(swr.tilt_y) : undefined,
    tiltOffsetX: swr.tilt_offset_x != null ? Number(swr.tilt_offset_x) : undefined,
    tiltOffsetY: swr.tilt_offset_y != null ? Number(swr.tilt_offset_y) : undefined,
    relTiltX: swr.rel_tilt_x != null ? Number(swr.rel_tilt_x) : undefined,
    relTiltY: swr.rel_tilt_y != null ? Number(swr.rel_tilt_y) : undefined,
    relativeTotalTilt: swr.relative_total_tilt != null ? Number(swr.relative_total_tilt) : undefined,
    isPoleTilted: swr.is_pole_tilted,
    gatewayName: swr.gateway_name || 'Gateway_01',
    gatewayStatus: swr.gateway_status || 'online',
    devEui: swr.dev_eui || '',
    payloadId: swr.payload_id != null ? String(swr.payload_id) : '',
    model: swr.model || undefined,
  };
};

// ── Custom Tooltips with Tactical Matte Glass Aesthetic ───────────────────

function WaterTooltip({ active, payload, waterUnit = 'm' }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const isCm = waterUnit === 'cm';
  const formattedVal =
    data.waterLevel != null
      ? isCm
        ? `${Number(data.waterLevel) * 100 >= 0 ? '+' : ''}${(Number(data.waterLevel) * 100).toFixed(1)}`
        : `${Number(data.waterLevel) >= 0 ? '+' : ''}${Number(data.waterLevel).toFixed(3)}`
      : '-';
  const unitText = isCm ? 'ซม.' : 'เมตร';
  const formattedDist =
    data.rawDistance != null
      ? isCm
        ? `${(Number(data.rawDistance) * 100).toFixed(1)} ซม.`
        : `${Number(data.rawDistance).toFixed(3)} ม.`
      : null;

  return (
    <div
      style={{
        background: 'var(--card-surface, #15181E)',
        border: '1px solid rgba(56, 189, 248, 0.28)',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 12,
        lineHeight: 1.4,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        minWidth: 190,
      }}
    >
      <div className="tabular-nums font-mono" style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: 11, marginBottom: 6, fontWeight: 500 }}>
        {data.fullTime}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          className="tabular-nums font-mono"
          style={{
            color: 'var(--color-cyan, #38BDF8)',
            fontWeight: 800,
            fontSize: 20,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {formattedVal}
        </span>
        <span style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: 12 }}>{unitText}</span>
      </div>
      {formattedDist != null && (
        <div style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: 11.5, marginTop: 4 }}>
          ระยะเซนเซอร์ <span className="tabular-nums font-mono" style={{ color: 'var(--text-primary, #F8FAFC)', fontWeight: 600 }}>{formattedDist}</span>
        </div>
      )}
    </div>
  );
}

function EnvironmentTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div
      style={{
        background: 'var(--card-surface, #15181E)',
        border: '1px solid var(--card-border, rgba(255, 255, 255, 0.12))',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 12,
        lineHeight: 1.4,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        minWidth: 190,
      }}
    >
      <div className="tabular-nums font-mono" style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: 11, marginBottom: 8, fontWeight: 500 }}>
        {data.fullTime}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#F97316', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ThermometerIcon size={13} />
            <span>อุณหภูมิ</span>
          </span>
          <span className="tabular-nums font-mono" style={{ color: 'var(--text-primary, #F8FAFC)', fontWeight: 700 }}>
            {data.temperature != null ? `${data.temperature.toFixed(1)} °C` : '-'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--color-cyan, #38BDF8)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ActivityIcon size={13} />
            <span>ความชื้น</span>
          </span>
          <span className="tabular-nums font-mono" style={{ color: 'var(--text-primary, #F8FAFC)', fontWeight: 700 }}>
            {data.humidity != null ? `${data.humidity.toFixed(1)} %RH` : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}

function BatteryTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div
      style={{
        background: 'var(--card-surface, #15181E)',
        border: '1px solid rgba(16, 185, 129, 0.28)',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 12,
        lineHeight: 1.4,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        minWidth: 190,
      }}
    >
      <div className="tabular-nums font-mono" style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: 11, marginBottom: 8, fontWeight: 500 }}>
        {data.fullTime}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--color-normal, #10B981)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <BatteryChargingIcon size={13} />
            <span>แบตเตอรี่</span>
          </span>
          <span className="tabular-nums font-mono" style={{ color: 'var(--text-primary, #F8FAFC)', fontWeight: 700 }}>
            {data.batteryPercent != null ? `${data.batteryPercent}%` : '-'}
          </span>
        </div>
        {data.batteryVoltage != null && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--text-secondary, #94A3B8)' }}>แรงดันไฟฟ้า</span>
            <span className="tabular-nums font-mono" style={{ color: 'var(--text-secondary, #CBD5E1)', fontWeight: 600 }}>
              {data.batteryVoltage.toFixed(2)} V
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────

import { useAuth } from '../context/AuthContext';

export default function StationDetailPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'staff';

  const [station, setStation] = useState<Station | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('hourly');
  const [loading, setLoading] = useState(true);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Water level display unit: 'm' (meters, default) or 'cm' (centimeters)
  const [waterUnit, setWaterUnit] = useState<'m' | 'cm'>('m');

  // Real-time time tick for accurate offline timeout calculation
  const [timeTick, setTimeTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [statusConfirmModalOpen, setStatusConfirmModalOpen] = useState(false);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<'active' | 'offline'>('offline');

  // Load Station Identity
  const loadStation = useCallback(async () => {
    if (!stationId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStations();
      const match = data.find((s) => s.station_id === stationId);
      if (!match) {
        setError(`ไม่พบข้อมูลสถานีรหัส ${stationId}`);
        return;
      }
      setStation(mapStationWithReadingToStation(match));
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถดึงข้อมูลสถานีได้');
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  // Load Readings in Timeframe
  const loadReadings = useCallback(async () => {
    if (!stationId) return;
    try {
      setLoadingReadings(true);
      const now = new Date();
      let start: Date;
      if (timeRange === 'hourly') {
        start = subHours(now, 24);
      } else if (timeRange === 'daily') {
        start = subDays(now, 7);
      } else {
        start = subDays(now, 30);
      }

      const rows = await fetchReadingsInRange(stationId, start, now);
      setReadings(rows);
    } catch (err: any) {
      console.error('[StationDetailPage] Readings error:', err);
    } finally {
      setLoadingReadings(false);
    }
  }, [stationId, timeRange]);

  useEffect(() => {
    loadStation();
  }, [loadStation]);

  // Auto-refresh telemetry in the background every 30 seconds
  useEffect(() => {
    loadReadings();
    const timer = setInterval(() => {
      loadReadings();
    }, 30000);
    return () => clearInterval(timer);
  }, [loadReadings]);

  // Global App Refresh Listener from TopBar
  useEffect(() => {
    const handleGlobalRefresh = () => {
      loadStation();
      loadReadings();
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => {
      window.removeEventListener('app:refresh', handleGlobalRefresh);
    };
  }, [loadStation, loadReadings]);

  // Scroll to hash section if present (e.g. #battery-chart)
  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        const timer = setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [stationId]);

  // Trigger Confirmation Modal for Operating Status Change
  const handleRequestStatusToggle = (newStatus: 'active' | 'offline') => {
    if (!station) return;
    const isTargetActive = newStatus === 'active';
    const isManualActive = (station.manualStatus || station.operatingStatus) === 'active';
    if (isManualActive === isTargetActive) return;
    setStatusConfirmTarget(newStatus);
    setStatusConfirmModalOpen(true);
  };

  // Execute Operating Status Change after Confirmation
  const handleExecuteStatusToggle = async () => {
    if (!station || statusUpdating) return;
    const targetStatus = statusConfirmTarget;
    const isTargetActive = targetStatus === 'active';
    const prevActive = station.isActive;
    const prevStatus = station.operatingStatus;
    const prevManual = station.manualStatus;
    const prevOnline = station.isOnline;

    setStation((prev) =>
      prev
        ? {
            ...prev,
            isActive: isTargetActive,
            operatingStatus: targetStatus,
            manualStatus: targetStatus,
            isOnline:
              isTargetActive &&
              (prev.minutesSinceLastReading == null ||
                prev.minutesSinceLastReading < (prev.offlineTimeoutMinutes || 30)),
          }
        : null
    );
    setStatusUpdating(true);

    try {
      await updateStationStatus(station.id, targetStatus);
      window.dispatchEvent(new Event('app:refresh'));
    } catch (err: any) {
      setStation((prev) =>
        prev
          ? {
              ...prev,
              isActive: prevActive,
              operatingStatus: prevStatus,
              manualStatus: prevManual,
              isOnline: prevOnline,
            }
          : null
      );
      alert(err.message || 'ไม่สามารถเปลี่ยนสถานะการให้บริการได้');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Format Chart Data with smart deduplication for clean time labels
  const chartData = useMemo(() => {
    if (!readings || readings.length === 0) return [];

    // Filter out duplicate readings within the same minute to eliminate repeating X-axis timestamps
    const seenMinutes = new Set<string>();
    const deduplicatedReadings: Reading[] = [];

    for (let i = 0; i < readings.length; i++) {
      const r = readings[i];
      const d = new Date(r.timestamp);
      // Group by date and minute
      const minuteKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
      if (!seenMinutes.has(minuteKey)) {
        seenMinutes.add(minuteKey);
        deduplicatedReadings.push(r);
      } else {
        // Keep the latest reading for this minute
        deduplicatedReadings[deduplicatedReadings.length - 1] = r;
      }
    }

    const sToRef = station?.sensorToRefDistance ?? 2.0;

    return deduplicatedReadings.map((r) => {
      const date = new Date(r.timestamp);
      let timeLabel = '';
      let fullTime = '';
      try {
        if (timeRange === 'hourly') {
          timeLabel = format(date, 'HH:mm');
          fullTime = format(date, 'd MMM yyyy HH:mm');
        } else if (timeRange === 'daily') {
          timeLabel = format(date, 'd MMM HH:mm');
          fullTime = format(date, 'd MMM yyyy HH:mm');
        } else {
          timeLabel = format(date, 'd MMM');
          fullTime = format(date, 'd MMM yyyy HH:mm');
        }
      } catch {
        timeLabel = r.timestamp;
        fullTime = r.timestamp;
      }

      let calculatedWaterLevel = r.water_level != null ? Number(r.water_level) : null;
      if (calculatedWaterLevel == null && r.raw_distance != null) {
        calculatedWaterLevel = Number((sToRef - Number(r.raw_distance)).toFixed(3));
      }

      return {
        timestamp: r.timestamp,
        timeLabel,
        fullTime,
        waterLevel: calculatedWaterLevel,
        rawDistance: r.raw_distance != null ? Number(r.raw_distance) : null,
        temperature: r.temperature != null ? Number(r.temperature) : null,
        humidity: r.humidity != null ? Number(r.humidity) : null,
        batteryPercent: r.battery_percent != null ? Number(r.battery_percent) : null,
        batteryVoltage: r.battery_voltage != null ? Number(r.battery_voltage) : null,
      };
    });
  }, [readings, timeRange, station]);

  // Aggregate Metrics for Summaries
  const metrics = useMemo(() => {
    const validWater = chartData.map((d) => d.waterLevel).filter((v): v is number => v !== null);
    const validTemp = chartData.map((d) => d.temperature).filter((v): v is number => v !== null);
    const validHumidity = chartData.map((d) => d.humidity).filter((v): v is number => v !== null);
    const validBattery = chartData.map((d) => d.batteryPercent).filter((v): v is number => v !== null);

    return {
      waterMax: validWater.length ? Math.max(...validWater) : null,
      waterMin: validWater.length ? Math.min(...validWater) : null,
      waterAvg: validWater.length ? validWater.reduce((a, b) => a + b, 0) / validWater.length : null,
      tempMax: validTemp.length ? Math.max(...validTemp) : null,
      tempMin: validTemp.length ? Math.min(...validTemp) : null,
      tempAvg: validTemp.length ? validTemp.reduce((a, b) => a + b, 0) / validTemp.length : null,
      humidityAvg: validHumidity.length ? validHumidity.reduce((a, b) => a + b, 0) / validHumidity.length : null,
      batteryMin: validBattery.length ? Math.min(...validBattery) : null,
      count: chartData.length,
    };
  }, [chartData]);

  // Water Level Net Delta (Delight & Intelligence)
  const waterDelta = useMemo(() => {
    const valid = chartData.map((d) => d.waterLevel).filter((v): v is number => v !== null);
    if (valid.length < 2) return null;
    const first = valid[0];
    const last = valid[valid.length - 1];
    const diff = Number((last - first).toFixed(3));
    return {
      delta: diff,
      direction: diff > 0.005 ? ('up' as const) : diff < -0.005 ? ('down' as const) : ('stable' as const),
    };
  }, [chartData]);

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: 1440, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="page-container" style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 24px' }}>
        <button
          type="button"
          onClick={() => navigate('/stations')}
          className="tactile-press"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 999,
            background: '#15181E',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#94A3B8',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          <ArrowLeftIcon size={15} />
          <span>กลับหน้ารายการสถานี</span>
        </button>
        <div
          style={{
            padding: 24,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 14,
            color: '#F87171',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <AlertTriangleIcon size={22} />
          <div>{error || 'ไม่พบสถานีที่ต้องการตรวจสอบ'}</div>
        </div>
      </div>
    );
  }

  const refName = station.referencePointName || 'จุดอ้างอิง';
  const warnLevel = station.warningLevel ?? -0.5;
  const critLevel = station.criticalLevel ?? 0.0;
  const sensorToRef = station.sensorToRefDistance ?? 2.0;
  const hasReading = Boolean(
    station.lastReadingTime ||
    station.rawDistance !== null && station.rawDistance !== undefined ||
    station.currentLevel !== null && station.currentLevel !== undefined
  );
  const rawDist = station.rawDistance ?? (hasReading && station.currentLevel !== null ? Number((sensorToRef - station.currentLevel).toFixed(3)) : null);
  const waterLevel = hasReading ? station.currentLevel : null;

  // Water unit formatting helpers
  const unitShort = waterUnit === 'cm' ? 'ซม.' : 'ม.';

  const formatLevel = (valInMeters: number | null | undefined): string => {
    if (valInMeters === null || valInMeters === undefined) return '-';
    if (waterUnit === 'cm') {
      const cmVal = valInMeters * 100;
      const sign = cmVal >= 0 ? '+' : '';
      return `${sign}${cmVal.toFixed(1)}`;
    }
    const sign = valInMeters >= 0 ? '+' : '';
    return `${sign}${valInMeters.toFixed(3)}`;
  };

  const formatDistanceVal = (valInMeters: number | null | undefined): string => {
    if (valInMeters === null || valInMeters === undefined) return '-';
    if (waterUnit === 'cm') {
      return `${(valInMeters * 100).toFixed(1)} ซม.`;
    }
    return `${valInMeters.toFixed(2)} ม.`;
  };

  const formatThresholdVal = (valInMeters: number | null | undefined): string => {
    if (valInMeters === null || valInMeters === undefined) return 'ไม่กำหนด';
    if (waterUnit === 'cm') {
      const cmVal = valInMeters * 100;
      const sign = cmVal >= 0 ? '+' : '';
      return `${sign}${cmVal.toFixed(1)} ซม.`;
    }
    const sign = valInMeters >= 0 ? '+' : '';
    return `${sign}${valInMeters.toFixed(2)} ม.`;
  };

  // Hydro-Tactical Water Gauge Percentage Calculations - pins to datum (0.00m) if no reading
  const minExpected = -Math.max(1.5, sensorToRef * 0.85);
  const maxExpected = Math.max(0.8, critLevel + 0.6);
  const span = maxExpected - minExpected;
  const effectiveLevelForGauge = hasReading && waterLevel !== null ? waterLevel : 0;
  const currentRatio = Math.max(0.04, Math.min(0.98, (effectiveLevelForGauge - minExpected) / (span || 1)));
  const gaugePercent = Math.round(currentRatio * 100);
  const datumPercent = Math.max(12, Math.min(88, Math.round(((0 - minExpected) / (span || 1)) * 100)));
  const warnPercent = Math.max(15, Math.min(94, Math.round(((warnLevel - minExpected) / (span || 1)) * 100)));
  const critPercent = Math.max(18, Math.min(96, Math.round(((critLevel - minExpected) / (span || 1)) * 100)));

  // LoRa Signal Strength (dBm)
  const rssi = station.rssi;

  const isOnline = isStationOnline(station, timeTick);
  const isManualActive = (station.manualStatus || station.operatingStatus) === 'active';

  return (
    <div
      className="page-container"
      style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: '20px 24px 56px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* ── BREADCRUMB / TOP NAVIGATION ── */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/stations')}
          className="tactile-press"
          aria-label="กลับหน้ารายการสถานี"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 16px',
            minHeight: 40,
            borderRadius: 999,
            background: 'var(--card-surface, #15181E)',
            border: '1px solid var(--card-border, rgba(255, 255, 255, 0.12))',
            color: 'var(--text-secondary, #94A3B8)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary, #F8FAFC)';
            e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary, #94A3B8)';
            e.currentTarget.style.borderColor = 'var(--card-border, rgba(255, 255, 255, 0.12))';
          }}
        >
          <ArrowLeftIcon size={14} />
          <span>กลับหน้ารายการ</span>
        </button>
      </div>

      {/* ── 1. STATION COCKPIT HERO HEADER ── */}
      <div
        style={{
          background: 'var(--card-surface, #0C0E12)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 18,
          padding: '22px 24px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          {/* Identity Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                className="tabular-nums font-mono"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: isOnline ? 'rgba(56, 189, 248, 0.12)' : 'rgba(148, 163, 184, 0.1)',
                  border: isOnline ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)',
                  color: isOnline ? 'var(--color-cyan, #38BDF8)' : 'var(--text-secondary, #94A3B8)',
                  letterSpacing: '0.04em',
                }}
              >
                {station.deviceId}
              </span>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--text-primary, #F8FAFC)',
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {station.name}
              </h1>
              <span
                className={`badge ${isOnline ? (!hasReading ? 'badge-normal' : statusClass[station.status]) : 'badge-unknown'}`}
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  border: !isOnline && isStaff && station.isManualOffline ? '1px solid rgba(245, 158, 11, 0.45)' : undefined,
                  color: !isOnline && isStaff && station.isManualOffline ? '#F59E0B' : undefined,
                  background: !isOnline && isStaff && station.isManualOffline ? 'rgba(245, 158, 11, 0.12)' : undefined,
                }}
              >
                <span className="badge-dot" style={{ width: 6, height: 6, background: !isOnline && isStaff && station.isManualOffline ? '#F59E0B' : undefined }} />
                {isOnline
                  ? (!hasReading ? 'ออนไลน์ (รอข้อมูล)' : statusLabel[station.status])
                  : !hasReading
                  ? 'ออฟไลน์ (ไม่มีข้อมูล)'
                  : isStaff && station.isManualOffline
                  ? 'ออฟไลน์ (โหมดทดสอบ: ค่าสดเฉพาะเจ้าหน้าที่)'
                  : 'ออฟไลน์'}
              </span>

              {!station.devEui && isStaff && (
                <span
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#F59E0B',
                    fontWeight: 600,
                  }}
                  title="สถานีนี้ยังไม่ได้ผูกกับ LoRaWAN DevEUI ของ ChirpStack"
                >
                  ยังไม่ได้ผูก DevEUI
                </span>
              )}
            </div>

            {/* Staff Test Mode Info Banner */}
            {!isOnline && isStaff && station.isManualOffline && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.28)',
                  borderRadius: 8,
                  padding: '7px 12px',
                  marginTop: 8,
                  fontSize: 12,
                  color: '#FBBF24',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ fontWeight: 600, color: '#F59E0B', flexShrink: 0 }}>โหมดทดสอบสถานีออฟไลน์:</span>
                <span>กำลังแสดงค่าสดเฉพาะเจ้าหน้าที่/ผู้ดูแลระบบ (ประชาชนจะเห็นเฉพาะค่าบันทึกก่อนออฟไลน์ และระบบระงับการแจ้งเตือนประชาชนชั่วคราว)</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary, #94A3B8)', fontSize: 12.5, marginTop: 6, flexWrap: 'wrap' }}>
              <MapPinIcon size={13} style={{ color: 'var(--text-muted, #8B9EB7)', flexShrink: 0 }} />
              <span>{station.location || 'จุดติดตั้ง'}</span>
              <span style={{ color: 'var(--text-muted, #475569)' }}>·</span>
              <span className="tabular-nums font-mono" style={{ color: 'var(--text-muted, #8B9EB7)' }}>
                {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
              </span>
              <span style={{ color: 'var(--text-muted, #475569)' }}>·</span>
              <span style={{ color: 'var(--text-muted, #8B9EB7)' }}>
                เกตเวย์ {station.gatewayName || 'Gateway_01'}
              </span>
              {station.devEui && (
                <>
                  <span style={{ color: 'var(--text-muted, #475569)' }}>·</span>
                  <span className="font-mono" style={{ color: 'var(--text-muted, #8B9EB7)' }} title="LoRaWAN DevEUI">
                    DevEUI: {station.devEui}
                  </span>
                </>
              )}
              {station.payloadId && (
                <>
                  <span style={{ color: 'var(--text-muted, #475569)' }}>·</span>
                  <span className="font-mono" style={{ color: 'var(--text-muted, #8B9EB7)' }} title="Payload ID (Byte 0)">
                    ID: {station.payloadId}
                  </span>
                </>
              )}
              <span style={{ color: 'var(--text-muted, #475569)' }}>·</span>
              <span style={{ color: 'var(--text-muted, #8B9EB7)' }}>
                {formatRelativeTimeThai(station.lastUpdated, timeTick)}
              </span>
            </div>
          </div>

          {/* Quick Management Actions with Tactile Feedback */}
          <div className="station-detail-actions">
            {/* Status Switch (Segmented Switch) */}
            <div className="status-switch-bar" role="group" aria-label={`สถานะให้บริการ ${station.name}`}>
              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => handleRequestStatusToggle('active')}
                className={`status-switch-btn tactile-press ${isManualActive ? 'active-online' : ''}`}
                aria-pressed={isManualActive}
                title="เปิดให้บริการออนไลน์"
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isManualActive ? 'var(--color-normal, #10B981)' : 'var(--text-muted, #475569)' }} />
                <span>ออนไลน์</span>
              </button>

              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => handleRequestStatusToggle('offline')}
                className={`status-switch-btn tactile-press ${!isManualActive ? 'active-offline' : ''}`}
                aria-pressed={!isManualActive}
                title="ปิดบริการชั่วคราว"
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: !isManualActive ? 'var(--color-warning, #F59E0B)' : 'var(--text-muted, #475569)' }} />
                <span>ออฟไลน์</span>
              </button>
            </div>

            {/* Quick Management Actions: Compact Text Badges */}
            <div className="badge-action-cluster">
              {/* Modals Triggers */}
              <button
                type="button"
                onClick={() => setCalibrationModalOpen(true)}
                className="btn-badge-action calibrate tactile-press"
                aria-label={`ตั้งค่าจุดอ้างอิงสถานี ${station.name}`}
                title="ตั้งค่าจุดอ้างอิงและระนาบเสา"
              >
                <SlidersIcon size={14} />
                <span>จุดอ้างอิง</span>
              </button>

              <button
                type="button"
                onClick={() => setNotificationModalOpen(true)}
                className="btn-badge-action alert tactile-press"
                aria-label={`ตั้งค่าเกณฑ์เตือนภัยสถานี ${station.name}`}
                title="ตั้งค่าเกณฑ์เตือนภัยสถานีนี้"
              >
                <BellIcon size={14} />
                <span>เตือนภัย</span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="btn-badge-action tactile-press"
                aria-label={`แก้ไขข้อมูลสถานี ${station.name}`}
                title="แก้ไขข้อมูลสถานี"
              >
                <Edit3Icon size={14} />
                <span>แก้ไข</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. PRIMARY TELEMETRY BENTO COCKPIT (HERO ASYMMETRIC GRID) ── */}
      <div className="station-bento-hero">
        {/* ── POD 1: MASTER HYDRO-TELEMETRY POD ── */}
        <div
          style={{
            background: 'var(--card-surface, #0C0E12)',
            border: '1px solid rgba(56, 189, 248, 0.28)',
            borderRadius: 16,
            padding: '20px 22px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {/* Header Strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WavesIcon size={18} style={{ color: 'var(--color-cyan, #38BDF8)' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #F8FAFC)' }}>
                ระดับน้ำเทียบ{refName}
              </span>
            </div>

            {/* Ultrasonic Hardware State Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {station.isBlindZone ? (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: 'var(--color-critical, #F87171)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontWeight: 600,
                  }}
                >
                  ระยะบอดเซนเซอร์
                </span>
              ) : station.isPoleTilted ? (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: 'var(--color-warning, #F59E0B)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontWeight: 600,
                  }}
                >
                  ชดเชยเสาเอียง ({station.relativeTotalTilt?.toFixed(1) ?? '0.0'}°)
                </span>
              ) : !hasReading ? (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: isOnline ? 'rgba(56, 189, 248, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                    color: isOnline ? 'var(--color-cyan, #38BDF8)' : 'var(--text-muted, #94A3B8)',
                    border: isOnline ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(148, 163, 184, 0.25)',
                    fontWeight: 600,
                  }}
                >
                  {isOnline ? 'พร้อมรับข้อมูล' : 'ยังไม่มีข้อมูล'}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--color-normal, #10B981)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    fontWeight: 600,
                  }}
                >
                  เซนเซอร์ทำงานปกติ
                </span>
              )}
            </div>
          </div>

          {/* Hero Telemetry Readout (Giant Telemetry Mono 48px) with Interactive Unit Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span
              key={waterUnit}
              className="tabular-nums font-mono unit-swap-active"
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: !isOnline || !hasReading || waterLevel === null
                  ? 'var(--text-muted, #94A3B8)'
                  : station.status === 'critical'
                  ? 'var(--color-critical, #EF4444)'
                  : station.status === 'warning'
                  ? 'var(--color-warning, #F59E0B)'
                  : 'var(--color-normal, #10B981)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              {formatLevel(waterLevel)}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Interactive Unit Pill (Balanced Cockpit Badge) */}
                <button
                  type="button"
                  onClick={() => setWaterUnit((prev) => (prev === 'm' ? 'cm' : 'm'))}
                  title="คลิกเพื่อสลับหน่วยวัด (เมตร ⇄ เซนติเมตร)"
                  aria-label={`หน่วยวัดปัจจุบัน ${waterUnit === 'cm' ? 'เซนติเมตร' : 'เมตร'} คลิกเพื่อสลับ`}
                  className="tactile-press"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: 7,
                    padding: '4px 10px',
                    minHeight: 30,
                    color: 'var(--text-secondary, #94A3B8)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-cyan, #38BDF8)';
                    e.currentTarget.style.color = 'var(--color-cyan, #38BDF8)';
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.14)';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(56, 189, 248, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                    e.currentTarget.style.color = 'var(--text-secondary, #94A3B8)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span key={waterUnit} className="unit-fade-active">
                    {unitShort}
                  </span>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      opacity: 0.85,
                      transform: waterUnit === 'cm' ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <path d="M7 16V4m0 0L3 8m4-4l4 4m6-4v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted, #64748B)', lineHeight: 1.3 }}>
                {refName && refName !== 'จุดอ้างอิง' ? `เทียบ${refName}` : 'เทียบจุดอ้างอิง'}
              </span>
            </div>
          </div>

          {/* Graduated Water Gauge with Accessible Progressbar */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: 'var(--text-secondary, #94A3B8)',
                marginBottom: 6,
                lineHeight: 1.4,
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-primary, #F8FAFC)' }}>ระดับน้ำเทียบเกณฑ์เตือนภัย</span>
              <span style={{ color: 'var(--text-secondary, #94A3B8)' }}>
                ระยะตรวจวัดจริง <span key={waterUnit} className="tabular-nums font-mono unit-fade-active" style={{ color: 'var(--text-primary, #F8FAFC)', fontWeight: 600 }}>{formatDistanceVal(rawDist)}</span>
              </span>
            </div>

            {/* Gauge Track */}
            <div
              role="progressbar"
              aria-label={`ระดับน้ำ${refName && refName !== 'จุดอ้างอิง' ? `เทียบ${refName}` : 'เทียบจุดอ้างอิง'}`}
              aria-valuenow={effectiveLevelForGauge}
              aria-valuemin={minExpected}
              aria-valuemax={maxExpected}
              aria-valuetext={hasReading && waterLevel !== null ? `${formatLevel(waterLevel)} ${unitShort}` : 'ไม่มีข้อมูล (ระดับอ้างอิง)'}
              style={{
                position: 'relative',
                height: 24,
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--card-border, rgba(255, 255, 255, 0.1))',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)',
              }}
              title={hasReading && waterLevel !== null ? `ระดับน้ำ${refName && refName !== 'จุดอ้างอิง' ? `เทียบ${refName}` : 'เทียบจุดอ้างอิง'} ${formatLevel(waterLevel)} ${unitShort} | ระยะตรวจวัดจริง ${formatDistanceVal(rawDist)}` : `ระดับน้ำเทียบ${refName}: ไม่มีข้อมูล (คงระดับที่จุดอ้างอิง)`}
            >
              {/* Fluid Fill Bar */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  transform: `scaleX(${gaugePercent / 100})`,
                  transformOrigin: 'left',
                  background:
                    station.status === 'critical'
                      ? 'linear-gradient(90deg, var(--color-warning, #F59E0B) 0%, var(--color-critical, #EF4444) 100%)'
                      : station.status === 'warning'
                      ? 'linear-gradient(90deg, #0284C7 0%, var(--color-warning, #F59E0B) 100%)'
                      : 'linear-gradient(90deg, #0284C7 0%, var(--color-cyan, #38BDF8) 60%, var(--color-normal, #10B981) 100%)',
                  borderRadius: 6,
                  transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: station.status === 'critical' ? '0 0 14px rgba(239, 68, 68, 0.6)' : 'none',
                }}
              />

              {/* Datum Marker (0.00m) */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${datumPercent}%`,
                  width: 2,
                  background: 'rgba(255, 255, 255, 0.75)',
                  zIndex: 2,
                }}
              />

              {/* Warning Marker */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${warnPercent}%`,
                  width: 2,
                  background: 'var(--color-warning, #F59E0B)',
                  zIndex: 2,
                }}
              />

              {/* Critical Marker */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${critPercent}%`,
                  width: 2,
                  background: 'var(--color-critical, #EF4444)',
                  zIndex: 2,
                }}
              />
            </div>

            {/* Gauge Legends */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--text-secondary, #94A3B8)',
                marginTop: 6,
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              <span>ระดับต่ำ</span>
              <span style={{ color: 'var(--text-secondary, #CBD5E1)' }}>
                <span key={waterUnit} className="tabular-nums font-mono unit-fade-active">{waterUnit === 'cm' ? '0.0' : '0.00'}</span> {unitShort} ({refName})
              </span>
              <span style={{ color: 'var(--color-warning, #F59E0B)' }}>
                เฝ้าระวัง <span key={waterUnit} className="tabular-nums font-mono unit-fade-active">{formatThresholdVal(warnLevel)}</span>
              </span>
              <span style={{ color: 'var(--color-critical, #EF4444)' }}>
                วิกฤต <span key={waterUnit} className="tabular-nums font-mono unit-fade-active">{formatThresholdVal(critLevel)}</span>
              </span>
            </div>
          </div>

          {/* Physical Calibration Diagnostic Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 8,
              paddingTop: 10,
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            <div>
              <div style={{ color: 'var(--text-muted, #64748B)', fontSize: 11, fontWeight: 500 }}>ระยะติดตั้งเซนเซอร์</div>
              <div style={{ color: 'var(--text-primary, #F8FAFC)', fontWeight: 600, marginTop: 2 }}>
                <span key={waterUnit} className="tabular-nums font-mono unit-fade-active">{formatDistanceVal(sensorToRef)}</span>
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted, #64748B)', fontSize: 11, fontWeight: 500 }}>ระยะตรวจวัดจริง</div>
              <div style={{ color: 'var(--color-cyan, #38BDF8)', fontWeight: 600, marginTop: 2 }}>
                <span key={waterUnit} className="tabular-nums font-mono unit-fade-active">{formatDistanceVal(rawDist)}</span>
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted, #64748B)', fontSize: 11, fontWeight: 500 }}>ชดเชยระนาบเสา</div>
              <div style={{ color: station.tiltCompensationEnabled ? 'var(--color-normal, #10B981)' : 'var(--text-muted, #64748B)', fontWeight: 600, marginTop: 2 }}>
                {station.tiltCompensationEnabled ? 'เปิดใช้งาน' : 'ปิดการชดเชย'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted, #64748B)', fontSize: 11, fontWeight: 500 }}>ระยะบอดเซนเซอร์</div>
              <div style={{ color: 'var(--text-primary, #F8FAFC)', fontWeight: 600, marginTop: 2 }}>
                <span key={waterUnit} className="tabular-nums font-mono unit-fade-active">{formatDistanceVal(station.blindZoneOffset ?? 0.28)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── POD 2 & 3: ATMOSPHERE & HARDWARE COCKPIT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Atmosphere Pod (Temperature & Humidity) */}
          <div
            style={{
              background: 'var(--card-surface, #0C0E12)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
              flex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', lineHeight: 1.35 }}>
                สภาพแวดล้อมรอบสถานี
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Temp Pod */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F97316', fontSize: 12, fontWeight: 600 }}>
                  <ThermometerIcon size={14} />
                  <span>อุณหภูมิ</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <span
                    className="tabular-nums font-mono"
                    style={{ fontSize: 26, fontWeight: 800, color: '#F97316', lineHeight: 1 }}
                  >
                    {station.temperature != null ? station.temperature.toFixed(1) : '-'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #94A3B8)' }}>°C</span>
                </div>
              </div>

              {/* Humidity Pod */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-cyan, #38BDF8)', fontSize: 12, fontWeight: 600 }}>
                  <DropletsIcon size={14} />
                  <span>ความชื้น</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <span
                    className="tabular-nums font-mono"
                    style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-cyan, #38BDF8)', lineHeight: 1 }}
                  >
                    {station.humidity != null ? station.humidity.toFixed(1) : '-'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #94A3B8)' }}>%RH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hardware & LoRaWAN Pod */}
          <div
            style={{
              background: 'var(--card-surface, #0C0E12)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
              flex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', lineHeight: 1.35 }}>
                พลังงานและการสื่อสาร
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted, #64748B)' }}>{station.model || 'Heltec V3'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Battery Pod */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${
                    station.batteryPercent == null
                      ? 'rgba(255, 255, 255, 0.1)'
                      : station.batteryPercent < 20
                      ? 'rgba(239, 68, 68, 0.35)'
                      : 'rgba(16, 185, 129, 0.25)'
                  }`,
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: station.batteryPercent == null ? 'var(--text-secondary, #94A3B8)' : station.batteryPercent < 20 ? 'var(--color-critical, #EF4444)' : 'var(--color-normal, #10B981)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <BatteryChargingIcon size={14} />
                  <span>แบตเตอรี่</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <span
                    className="tabular-nums font-mono"
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: station.batteryPercent == null ? 'var(--text-secondary, #94A3B8)' : station.batteryPercent < 20 ? 'var(--color-critical, #EF4444)' : 'var(--color-normal, #10B981)',
                      lineHeight: 1,
                    }}
                  >
                    {station.batteryPercent != null ? `${station.batteryPercent}%` : '-'}
                  </span>
                  {station.batteryVoltage != null && (
                    <span className="tabular-nums font-mono" style={{ fontSize: 12, color: 'var(--text-secondary, #94A3B8)' }}>
                      ({station.batteryVoltage.toFixed(2)}V)
                    </span>
                  )}
                </div>
              </div>

              {/* LoRa Signal Pod */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(192, 132, 252, 0.25)',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#C084FC', fontSize: 12, fontWeight: 600 }}>
                  <WifiIcon size={14} />
                  <span>สัญญาณ LoRa</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span
                    className="tabular-nums font-mono"
                    style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary, #F8FAFC)', lineHeight: 1 }}
                  >
                    {rssi != null ? rssi : '-'}
                  </span>
                  {rssi != null && <span style={{ fontSize: 12, color: 'var(--text-secondary, #94A3B8)' }}>dBm</span>}
                  {station.snr != null && (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary, #94A3B8)' }}>
                      SNR <span className="tabular-nums font-mono">{station.snr}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. TIMEFRAME SELECTOR TRACK (VisionOS Pill Dock) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '8px 0 2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0, lineHeight: 1.35 }}>
            ประวัติการตรวจวัด
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-secondary, #94A3B8)' }}>
            (<span className="tabular-nums font-mono">{metrics.count}</span> รายการ)
          </span>
        </div>

        {/* Cockpit Minimal Pill Selector via SegmentedControl */}
        <SegmentedControl
          options={timeframeOptions}
          value={timeRange}
          onChange={(val) => setTimeRange(val)}
          size="sm"
          accentColor="cyan"
          ariaLabel="เลือกช่วงเวลากราฟ"
        />
      </div>

      {/* ── 4. COCKPIT CHARTS BENTO SECTION ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* ── CARD 1: MASTER WATER LEVEL TELEMETRY (WIDE HERO) ── */}
        <div
          style={{
            background: 'var(--card-surface, #0C0E12)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 18,
            padding: '22px 24px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Card Header & Metric Strip */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DropletsIcon size={17} style={{ color: 'var(--color-cyan, #38BDF8)' }} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0, lineHeight: 1.35 }}>
                  กราฟระดับน้ำ{refName && refName !== 'จุดอ้างอิง' ? `เทียบ${refName}` : 'เทียบจุดอ้างอิง'}
                </h3>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #94A3B8)', marginTop: 3, lineHeight: 1.4 }}>
                ระยะติดตั้งถึงจุดอ้างอิง <span key={waterUnit} className="tabular-nums font-mono unit-fade-active">{formatDistanceVal(sensorToRef)}</span>
              </div>
            </div>

            {/* Metric Strip with Delta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ color: 'var(--text-muted, #64748B)', fontSize: 11.5 }}>สูงสุด</span>
                <span key={waterUnit} className="tabular-nums font-mono unit-fade-active" style={{ color: '#F87171', fontWeight: 700 }}>
                  {metrics.waterMax != null ? (waterUnit === 'cm' ? (metrics.waterMax * 100).toFixed(1) : metrics.waterMax.toFixed(2)) : '-'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #64748B)' }}>{unitShort}</span>
              </div>
              <div style={{ fontSize: 12, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ color: 'var(--text-muted, #64748B)', fontSize: 11.5 }}>ต่ำสุด</span>
                <span key={waterUnit} className="tabular-nums font-mono unit-fade-active" style={{ color: '#34D399', fontWeight: 700 }}>
                  {metrics.waterMin != null ? (waterUnit === 'cm' ? (metrics.waterMin * 100).toFixed(1) : metrics.waterMin.toFixed(2)) : '-'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #64748B)' }}>{unitShort}</span>
              </div>
              <div style={{ fontSize: 12, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ color: 'var(--text-muted, #64748B)', fontSize: 11.5 }}>เฉลี่ย</span>
                <span key={waterUnit} className="tabular-nums font-mono unit-fade-active" style={{ color: 'var(--color-cyan, #38BDF8)', fontWeight: 700 }}>
                  {metrics.waterAvg != null ? (waterUnit === 'cm' ? (metrics.waterAvg * 100).toFixed(1) : metrics.waterAvg.toFixed(2)) : '-'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #64748B)' }}>{unitShort}</span>
              </div>
              {waterDelta && (
                <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'var(--text-muted, #64748B)', fontSize: 11.5 }}>แนวโน้ม</span>
                  <span
                    style={{
                      color:
                        waterDelta.direction === 'up'
                          ? 'var(--color-critical, #EF4444)'
                          : waterDelta.direction === 'down'
                          ? 'var(--color-normal, #10B981)'
                          : 'var(--text-secondary, #94A3B8)',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    {waterDelta.direction === 'up' ? (
                      <TrendingUpIcon size={13} />
                    ) : waterDelta.direction === 'down' ? (
                      <TrendingDownIcon size={13} />
                    ) : (
                      <MinusIcon size={13} />
                    )}
                    <span key={waterUnit} className="tabular-nums font-mono unit-fade-active">
                      {waterUnit === 'cm'
                        ? `${waterDelta.delta > 0 ? '+' : ''}${(waterDelta.delta * 100).toFixed(1)}`
                        : `${waterDelta.delta > 0 ? '+' : ''}${waterDelta.delta}`}
                    </span>
                    <span style={{ fontSize: 11 }}>{unitShort}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Chart Display */}
          <div style={{ height: 320, width: '100%', position: 'relative' }}>
            {loadingReadings ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary, #94A3B8)' }}>
                กำลังโหลดข้อมูลประวัติระดับน้ำ...
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary, #94A3B8)', fontSize: 13 }}>
                ไม่มีบันทึกข้อมูลระดับน้ำในช่วงเวลานี้
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 12, bottom: 6 }}>
                  <defs>
                    <linearGradient id="waterGradientDetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis
                    dataKey="timeLabel"
                    minTickGap={70}
                    interval="preserveStartEnd"
                    tick={{ fill: 'var(--text-secondary, #94A3B8)', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    width={54}
                    domain={['auto', 'auto']}
                    tick={{ fill: 'var(--text-secondary, #94A3B8)', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                    tickLine={false}
                    tickFormatter={(v) => (waterUnit === 'cm' ? `${(Number(v) * 100).toFixed(0)}cm` : `${Number(v).toFixed(2)}m`)}
                  />
                  <Tooltip content={<WaterTooltip waterUnit={waterUnit} />} />
                  <ReferenceLine
                    y={0}
                    stroke="var(--text-secondary, #94A3B8)"
                    strokeDasharray="3 3"
                    label={{
                      value: `จุดอ้างอิง 0.00 ${unitShort}`,
                      fill: 'var(--text-secondary, #94A3B8)',
                      fontSize: 11,
                      position: 'insideTopLeft',
                    }}
                  />
                  {station.warningLevel != null && (
                    <ReferenceLine
                      y={warnLevel}
                      stroke="var(--color-warning, #F59E0B)"
                      strokeDasharray="4 4"
                      label={{
                        value: `เฝ้าระวัง ${waterUnit === 'cm' ? (warnLevel * 100).toFixed(1) : warnLevel.toFixed(2)} ${unitShort}`,
                        fill: 'var(--color-warning, #F59E0B)',
                        fontSize: 11,
                        position: 'insideTopLeft',
                      }}
                    />
                  )}
                  {station.criticalLevel != null && (
                    <ReferenceLine
                      y={critLevel}
                      stroke="var(--color-critical, #EF4444)"
                      strokeDasharray="4 4"
                      label={{
                        value: `วิกฤต ${waterUnit === 'cm' ? (critLevel * 100).toFixed(1) : critLevel.toFixed(2)} ${unitShort}`,
                        fill: 'var(--color-critical, #EF4444)',
                        fontSize: 11,
                        position: 'insideTopLeft',
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="waterLevel"
                    stroke="#38BDF8"
                    strokeWidth={2.5}
                    fill="url(#waterGradientDetail)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#38BDF8', stroke: '#0C0E12', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── CARD 2: ENVIRONMENT TELEMETRY (TEMPERATURE & HUMIDITY) ── */}
        <div
          style={{
            background: 'var(--card-surface, #0C0E12)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 18,
            padding: '22px 24px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Card Header & Balanced Metric Pills */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThermometerIcon size={17} style={{ color: '#F97316' }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0, lineHeight: 1.35 }}>
                กราฟสภาพแวดล้อม
              </h3>
            </div>

            {/* Metric Strip with Distinct Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  background: 'rgba(249, 115, 22, 0.08)',
                  padding: '3px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(249, 115, 22, 0.22)',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316' }} />
                <span style={{ color: 'var(--text-secondary, #94A3B8)' }}>อุณหภูมิเฉลี่ย</span>
                <span className="tabular-nums font-mono" style={{ color: '#F97316', fontWeight: 700 }}>
                  {metrics.tempAvg != null ? metrics.tempAvg.toFixed(1) : '-'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary, #94A3B8)' }}>°C</span>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  background: 'rgba(56, 189, 248, 0.08)',
                  padding: '3px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(56, 189, 248, 0.22)',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-cyan, #38BDF8)' }} />
                <span style={{ color: 'var(--text-secondary, #94A3B8)' }}>ความชื้นเฉลี่ย</span>
                <span className="tabular-nums font-mono" style={{ color: 'var(--color-cyan, #38BDF8)', fontWeight: 700 }}>
                  {metrics.humidityAvg != null ? metrics.humidityAvg.toFixed(1) : '-'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary, #94A3B8)' }}>%RH</span>
              </div>
            </div>
          </div>

          {/* Chart Display */}
          <div style={{ height: 320, width: '100%', position: 'relative' }}>
            {loadingReadings ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary, #94A3B8)', fontSize: 13 }}>
                กำลังโหลดข้อมูลสภาพแวดล้อม...
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary, #94A3B8)', fontSize: 13 }}>
                ไม่มีบันทึกข้อมูลสภาพแวดล้อมในช่วงเวลานี้
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 16, right: 20, left: 10, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis
                    dataKey="timeLabel"
                    minTickGap={70}
                    interval="preserveStartEnd"
                    tick={{ fill: 'var(--text-secondary, #94A3B8)', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    width={46}
                    domain={['auto', 'auto']}
                    tick={{ fill: '#F97316', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(249, 115, 22, 0.2)' }}
                    tickLine={false}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}°C`}
                  />
                  <YAxis
                    yAxisId="right"
                    width={46}
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fill: 'var(--color-cyan, #38BDF8)', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(56, 189, 248, 0.2)' }}
                    tickLine={false}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                  />
                  <Tooltip content={<EnvironmentTooltip />} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="temperature"
                    stroke="#F97316"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#F97316' }}
                    name="อุณหภูมิ (°C)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="humidity"
                    stroke="var(--color-cyan, #38BDF8)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--color-cyan, #38BDF8)' }}
                    name="ความชื้น (%RH)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── CARD 3: POWER & BATTERY TELEMETRY ── */}
        <div
          id="battery-chart"
          style={{
            background: 'var(--card-surface, #0C0E12)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 18,
            padding: '22px 24px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Card Header & Balanced Metric Pills */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BatteryChargingIcon size={17} style={{ color: 'var(--color-normal, #10B981)' }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0, lineHeight: 1.35 }}>
                กราฟสถานะพลังงาน
              </h3>
            </div>

            {/* Metric Strip with Distinct Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  background: 'rgba(16, 185, 129, 0.08)',
                  padding: '3px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(16, 185, 129, 0.22)',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-normal, #10B981)' }} />
                <span style={{ color: 'var(--text-secondary, #94A3B8)' }}>ล่าสุด</span>
                <span className="tabular-nums font-mono" style={{ color: 'var(--color-normal, #10B981)', fontWeight: 700 }}>
                  {station.batteryPercent != null ? `${station.batteryPercent}%` : '100%'}
                </span>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '3px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <span style={{ color: 'var(--text-muted, #64748B)' }}>ต่ำสุด</span>
                <span
                  className="tabular-nums font-mono"
                  style={{
                    color: metrics.batteryMin != null && metrics.batteryMin < 20 ? 'var(--color-critical, #EF4444)' : 'var(--text-primary, #F8FAFC)',
                    fontWeight: 700,
                  }}
                >
                  {metrics.batteryMin != null ? `${metrics.batteryMin}%` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Chart Display */}
          <div style={{ height: 320, width: '100%', position: 'relative' }}>
            {loadingReadings ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary, #94A3B8)' }}>
                กำลังโหลดข้อมูลพลังงาน...
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary, #94A3B8)', fontSize: 13 }}>
                ไม่มีบันทึกข้อมูลพลังงานในช่วงเวลานี้
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 10, bottom: 6 }}>
                  <defs>
                    <linearGradient id="batteryGradientDetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis
                    dataKey="timeLabel"
                    minTickGap={70}
                    interval="preserveStartEnd"
                    tick={{ fill: 'var(--text-secondary, #94A3B8)', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    width={48}
                    domain={[0, 100]}
                    tick={{ fill: 'var(--text-secondary, #94A3B8)', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                    tickLine={false}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                  />
                  <Tooltip content={<BatteryTooltip />} />
                  <ReferenceLine y={20} stroke="var(--color-critical, #EF4444)" strokeDasharray="3 3" label={{ value: 'เกณฑ์แบตเตอรี่ต่ำ (20%)', fill: 'var(--color-critical, #EF4444)', fontSize: 11, position: 'insideTopLeft' }} />
                  <Area
                    type="monotone"
                    dataKey="batteryPercent"
                    stroke="var(--color-normal, #10B981)"
                    strokeWidth={2}
                    fill="url(#batteryGradientDetail)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#10B981' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS INTEGRATION ── */}
      {calibrationModalOpen && (
        <StationCalibrationModal
          station={station}
          isOpen={calibrationModalOpen}
          onClose={() => setCalibrationModalOpen(false)}
          onSave={async (updated) => {
            await updateStationCalibration(station.id, {
              sensor_to_ref_distance: updated.sensor_to_ref_distance,
              reference_point_name: updated.reference_point_name,
              warning_level: updated.warning_level,
              critical_level: updated.critical_level,
              blind_zone_offset: updated.blind_zone_offset,
              tilt_offset_x: updated.tilt_offset_x,
              tilt_offset_y: updated.tilt_offset_y,
            });
            await loadStation();
            await loadReadings();
            window.dispatchEvent(new Event('app:refresh'));
          }}
        />
      )}

      {notificationModalOpen && (
        <StationNotificationModal
          station={station}
          isOpen={notificationModalOpen}
          onClose={() => setNotificationModalOpen(false)}
          onSaved={async () => {
            await loadStation();
            await loadReadings();
            window.dispatchEvent(new Event('app:refresh'));
          }}
        />
      )}

      {editModalOpen && (
        <StationModal
          station={station}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={async (data) => {
            await updateStation(station.id, {
              station_name: data.name,
              location_name: data.location,
              latitude: data.lat,
              longitude: data.lng,
              status: data.operatingStatus || (data.isActive ? 'active' : 'offline'),
              gateway_id: data.gateway_id,
              dev_eui: data.dev_eui ?? data.devEui,
              payload_id: data.payload_id ?? data.payloadId,
            });
            await loadStation();
            await loadReadings();
            window.dispatchEvent(new Event('app:refresh'));
          }}
        />
      )}

      {/* Dedicated Operating Status Change Confirmation Modal */}
      {statusConfirmModalOpen && (
        <StationStatusConfirmModal
          isOpen={statusConfirmModalOpen}
          onClose={() => setStatusConfirmModalOpen(false)}
          station={station}
          targetStatus={statusConfirmTarget}
          onConfirm={handleExecuteStatusToggle}
        />
      )}
    </div>
  );
}
