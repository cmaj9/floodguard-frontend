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
  RadioIcon,
  SlidersIcon,
  BellIcon,
  Edit3Icon,
  ClockIcon,
  LineChartIcon,
  AlertTriangleIcon,
  WavesIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  WifiIcon,
} from '../components/ui/Icons';
import { SkeletonCard } from '../components/ui/Skeleton';

const timeframeOptions: SegmentedOption<TimeRange>[] = [
  { value: 'hourly', label: '24 ชั่วโมง', icon: <ClockIcon size={13} /> },
  { value: 'daily', label: '7 วัน', icon: <ActivityIcon size={13} /> },
  { value: 'weekly', label: '30 วัน', icon: <LineChartIcon size={13} /> },
];

const statusLabel: Record<WaterStatus, string> = {
  normal: 'ปกติ',
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
        : 0,
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
    lastUpdated: swr.last_reading_time || new Date().toISOString(),
    isActive: swr.status === 'active',
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
    model: swr.model || undefined,
  };
};

// ── Custom Tooltips with Tactical Matte Glass Aesthetic ───────────────────

function WaterTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div
      style={{
        background: '#15181E',
        border: '1px solid rgba(56, 189, 248, 0.28)',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 12.5,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        minWidth: 190,
      }}
    >
      <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 6, fontWeight: 500 }}>
        {data.fullTime}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          className="tabular-nums font-mono"
          style={{
            color: '#38BDF8',
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: '-0.02em',
          }}
        >
          {data.waterLevel != null ? (data.waterLevel >= 0 ? `+${data.waterLevel.toFixed(3)}` : data.waterLevel.toFixed(3)) : '-'}
        </span>
        <span style={{ color: '#94A3B8', fontSize: 11.5 }}>เมตร</span>
      </div>
      {data.rawDistance != null && (
        <div style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>
          ระยะเซนเซอร์วัดได้ <span className="tabular-nums font-mono" style={{ color: '#CBD5E1' }}>{data.rawDistance.toFixed(3)} ม.</span>
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
        background: '#15181E',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 12.5,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        minWidth: 190,
      }}
    >
      <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 8, fontWeight: 500 }}>
        {data.fullTime}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#F97316', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ThermometerIcon size={13} />
            <span>อุณหภูมิ</span>
          </span>
          <span className="tabular-nums font-mono" style={{ color: '#F8FAFC', fontWeight: 700 }}>
            {data.temperature != null ? `${data.temperature.toFixed(1)} °C` : '-'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#06B6D4', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ActivityIcon size={13} />
            <span>ความชื้น</span>
          </span>
          <span className="tabular-nums font-mono" style={{ color: '#F8FAFC', fontWeight: 700 }}>
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
        background: '#15181E',
        border: '1px solid rgba(16, 185, 129, 0.28)',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 12.5,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        minWidth: 190,
      }}
    >
      <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 8, fontWeight: 500 }}>
        {data.fullTime}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
            <BatteryChargingIcon size={13} />
            <span>ระดับแบตเตอรี่</span>
          </span>
          <span className="tabular-nums font-mono" style={{ color: '#F8FAFC', fontWeight: 700 }}>
            {data.batteryPercent != null ? `${data.batteryPercent}%` : '-'}
          </span>
        </div>
        {data.batteryVoltage != null && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#64748B' }}>แรงดันไฟฟ้า</span>
            <span className="tabular-nums font-mono" style={{ color: '#CBD5E1', fontWeight: 600 }}>
              {data.batteryVoltage.toFixed(2)} V
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────

export default function StationDetailPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();

  const [station, setStation] = useState<Station | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('hourly');
  const [loading, setLoading] = useState(true);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Auto-refresh countdown (Delight axis)
  const [countdown, setCountdown] = useState(30);

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

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  // Auto-refresh timer countdown (30s)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadReadings();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loadReadings]);

  // Manual Force Refresh
  const handleForceRefresh = async () => {
    setCountdown(30);
    await loadStation();
    await loadReadings();
  };

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

  // Trigger Confirmation Modal for Operating Status Change
  const handleRequestStatusToggle = (newStatus: 'active' | 'offline') => {
    if (!station) return;
    const isTargetActive = newStatus === 'active';
    if (station.isActive === isTargetActive) return;
    setStatusConfirmTarget(newStatus);
    setStatusConfirmModalOpen(true);
  };

  // Execute Operating Status Change after Confirmation
  const handleExecuteStatusToggle = async () => {
    if (!station || statusUpdating) return;
    const targetStatus = statusConfirmTarget;
    const prevActive = station.isActive;
    const prevStatus = station.operatingStatus;

    setStation((prev) =>
      prev ? { ...prev, isActive: targetStatus === 'active', operatingStatus: targetStatus } : null
    );
    setStatusUpdating(true);

    try {
      await updateStationStatus(station.id, targetStatus);
      window.dispatchEvent(new Event('app:refresh'));
    } catch (err: any) {
      setStation((prev) =>
        prev ? { ...prev, isActive: prevActive, operatingStatus: prevStatus } : null
      );
      alert(err.message || 'ไม่สามารถเปลี่ยนสถานะการให้บริการได้');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Format Chart Data
  const chartData = useMemo(() => {
    return readings.map((r) => {
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

      const sToRef = station?.sensorToRefDistance ?? 2.0;
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

  // Tactical Situational Intelligence Briefing
  const situationalInsight = useMemo(() => {
    if (!station) return { text: '', dotColor: '#94A3B8' };
    if (!station.isActive) {
      return {
        text: `สถานี ${station.name} อยู่ในสถานะออฟไลน์ การบันทึกและส่งข้อมูล telemetry ถูกระงับชั่วคราว`,
        dotColor: '#94A3B8',
      };
    }
    const curr = station.currentLevel;
    const crit = station.criticalLevel ?? 0.0;
    const warn = station.warningLevel ?? -0.5;
    const rName = station.referencePointName || 'จุดอ้างอิง';

    if (curr >= crit) {
      return {
        text: `สภาวะวิกฤต ระดับน้ำเกินเกณฑ์วิกฤต +${(curr - crit).toFixed(2)} ม. เสี่ยงน้ำท่วมล้น${rName} ขอให้เฝ้าระวังสูงสุด`,
        dotColor: '#EF4444',
      };
    }
    if (curr >= warn) {
      const diff = (crit - curr).toFixed(2);
      return {
        text: `ระดับน้ำอยู่ในเกณฑ์เฝ้าระวังพิเศษ ต่ำกว่าระดับวิกฤต ${diff} ม. แนะนำติดตามแนวโน้มอัตราการเพิ่มอย่างใกล้ชิด`,
        dotColor: '#F59E0B',
      };
    }
    if (curr > 0) {
      return {
        text: `ระดับน้ำสูงกว่าระดับ${rName} +${curr.toFixed(2)} ม. เริ่มส่งผลกระทบต่อพื้นที่ลุ่มต่ำริมฝั่ง`,
        dotColor: '#EF4444',
      };
    }
    const margin = Math.abs(curr).toFixed(2);
    return {
      text: `สถานการณ์ปกติ ระดับน้ำต่ำกว่าระดับ${rName} ${margin} ม. ปลอดภัย สภาพการไหลคล่องตัวและเซนเซอร์ทำงานปกติ`,
      dotColor: '#10B981',
    };
  }, [station]);

  if (loading) {
    return (
      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '24px 16px' }}>
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
      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '32px 16px' }}>
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
  const rawDist = station.rawDistance ?? Number((sensorToRef - station.currentLevel).toFixed(3));
  const waterLevel = station.currentLevel;

  // Hydro-Tactical Water Gauge Percentage Calculations
  const minExpected = -Math.max(1.5, sensorToRef * 0.85);
  const maxExpected = Math.max(0.8, critLevel + 0.6);
  const span = maxExpected - minExpected;
  const currentRatio = Math.max(0.04, Math.min(0.98, (waterLevel - minExpected) / (span || 1)));
  const gaugePercent = Math.round(currentRatio * 100);
  const datumPercent = Math.max(12, Math.min(88, Math.round(((0 - minExpected) / (span || 1)) * 100)));
  const warnPercent = Math.max(15, Math.min(94, Math.round(((warnLevel - minExpected) / (span || 1)) * 100)));
  const critPercent = Math.max(18, Math.min(96, Math.round(((critLevel - minExpected) / (span || 1)) * 100)));

  // LoRa Signal Strength Rating
  const rssi = station.rssi ?? -72;
  let signalRating = 'สัญญาณดีเยี่ยม';
  let signalColor = '#10B981';
  if (rssi < -90) {
    signalRating = 'สัญญาณอ่อน';
    signalColor = '#EF4444';
  } else if (rssi < -75) {
    signalRating = 'สัญญาณปานกลาง';
    signalColor = '#F59E0B';
  }

  return (
    <div
      style={{
        maxWidth: 1340,
        margin: '0 auto',
        padding: '20px 16px 56px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* ── BREADCRUMB / TOP NAVIGATION & LIVE BEACON ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#F8FAFC';
            e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94A3B8';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          }}
        >
          <ArrowLeftIcon size={14} />
          <span>กลับหน้ารายการสถานี</span>
        </button>

        {/* Live IoT Telemetry Beacon & Force Ping */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: station.isActive ? '#10B981' : '#94A3B8',
                boxShadow: station.isActive ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
                display: 'inline-block',
              }}
              className={station.isActive ? 'heartbeat-dot' : ''}
            />
            <span className="tabular-nums font-mono" style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
              {loadingReadings ? 'กำลังอัปเดต Telemetry...' : `ซิงค์สด IoT · รีเฟรชใน ${countdown} วิ`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleForceRefresh}
            disabled={loadingReadings}
            className="tactile-press"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              background: '#15181E',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#38BDF8',
              fontSize: 12,
              fontWeight: 600,
              cursor: loadingReadings ? 'wait' : 'pointer',
            }}
            title="บังคับดึงข้อมูล Telemetry ล่าสุดจากเซนเซอร์"
          >
            <RefreshCwIcon size={12} className={loadingReadings ? 'animate-spin' : ''} />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>
      </div>

      {/* ── 1. STATION COCKPIT HERO HEADER ── */}
      <div
        style={{
          background: 'var(--card-surface, #0C0E12)',
          border: '1px solid rgba(56, 189, 248, 0.22)',
          borderRadius: 18,
          padding: '20px 22px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
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
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: station.isActive ? 'rgba(56, 189, 248, 0.14)' : 'rgba(148, 163, 184, 0.1)',
                  border: station.isActive ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(148, 163, 184, 0.2)',
                  color: station.isActive ? '#38BDF8' : '#94A3B8',
                  letterSpacing: '0.04em',
                }}
              >
                {station.deviceId}
              </span>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#F8FAFC',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {station.name}
              </h1>
              <span className={`badge ${statusClass[station.status]}`} style={{ fontSize: 12, padding: '3px 10px' }}>
                <span className="badge-dot" style={{ width: 6, height: 6 }} />
                {statusLabel[station.status]}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 13, marginTop: 6, flexWrap: 'wrap' }}>
              <MapPinIcon size={14} style={{ color: '#64748B' }} />
              <span>{station.location || `${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}`}</span>
              <span style={{ color: '#475569' }}>·</span>
              <span className="tabular-nums font-mono" style={{ color: '#64748B' }}>
                พิกัด {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
              </span>
              <span style={{ color: '#475569' }}>·</span>
              <span style={{ color: '#64748B' }}>
                เกตเวย์ {station.gatewayName || 'Gateway_01'}
              </span>
            </div>
          </div>

          {/* Quick Management Actions with Tactile Feedback */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            {/* Status Switch (6px Segmented Switch) */}
            <div className="status-switch-bar">
              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => handleRequestStatusToggle('active')}
                className={`status-switch-btn tactile-press ${station.isActive ? 'active-online' : ''}`}
                title="เปิดให้บริการออนไลน์"
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: station.isActive ? '#10B981' : '#475569' }} />
                <span>ออนไลน์</span>
              </button>

              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => handleRequestStatusToggle('offline')}
                className={`status-switch-btn tactile-press ${!station.isActive ? 'active-offline' : ''}`}
                title="ปิดบริการชั่วคราว"
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: !station.isActive ? '#F59E0B' : '#475569' }} />
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
                title="ตั้งค่าจุดอ้างอิงและระนาบเสา"
              >
                <SlidersIcon size={13} />
                <span>จุดอ้างอิง</span>
              </button>

              <button
                type="button"
                onClick={() => setNotificationModalOpen(true)}
                className="btn-badge-action alert tactile-press"
                title="ตั้งค่าเกณฑ์เตือนภัยสถานีนี้"
              >
                <BellIcon size={13} />
                <span>เตือนภัย</span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="btn-badge-action tactile-press"
                title="แก้ไขข้อมูลสถานี"
              >
                <Edit3Icon size={13} />
                <span>แก้ไข</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── TACTICAL SITUATIONAL INTELLIGENCE BRIEFING BANNER ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 10,
            flexWrap: 'wrap',
            gap: '8px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: situationalInsight.dotColor,
                flexShrink: 0,
              }}
              className="heartbeat-dot"
            />
            <span style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 600 }}>
              {situationalInsight.text}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RadioIcon size={12} style={{ color: signalColor }} />
              <span>{signalRating} ({rssi} dBm)</span>
            </span>
            <span style={{ color: '#475569' }}>·</span>
            <span style={{ fontSize: 11.5, color: '#94A3B8' }}>
              อัปเดตล่าสุด {format(new Date(station.lastUpdated), 'HH:mm:ss น.')}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. PRIMARY TELEMETRY BENTO COCKPIT (HERO ASYMMETRIC GRID) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── POD 1: MASTER HYDRO-TELEMETRY POD (7 COLS ON LG) ── */}
        <div
          className="lg:col-span-7"
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
              <WavesIcon size={18} style={{ color: '#38BDF8' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>
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
                    color: '#F87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontWeight: 600,
                  }}
                >
                  อยู่ในระยะบอดเซนเซอร์ (&lt; 0.28 ม.)
                </span>
              ) : station.isPoleTilted ? (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#F59E0B',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontWeight: 600,
                  }}
                >
                  ชดเชยเสาเอียง ({station.relativeTotalTilt?.toFixed(1) ?? '0.0'}°)
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    fontWeight: 600,
                  }}
                >
                  ระนาบเสาและระยะเซนเซอร์ปกติ
                </span>
              )}
            </div>
          </div>

          {/* Hero Telemetry Readout (Giant Telemetry Mono - 48px) */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span
              className="tabular-nums font-mono"
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color:
                  station.status === 'critical'
                    ? '#EF4444'
                    : station.status === 'warning'
                    ? '#F59E0B'
                    : '#10B981',
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              {station.isActive
                ? waterLevel >= 0
                  ? `+${waterLevel.toFixed(3)}`
                  : waterLevel.toFixed(3)
                : '-'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 18, color: '#F8FAFC', fontWeight: 700 }}>
                เมตร (ม.)
              </span>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>
                เทียบระดับ{refName} (0.00 ม.)
              </span>
            </div>
          </div>

          {/* Hydro-Tactical Graduated Water Gauge */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11.5,
                color: '#94A3B8',
                marginBottom: 6,
              }}
            >
              <span>มาตรวัดระดับน้ำทางชลศาสตร์ (Hydro-Tactical Gauge)</span>
              <span className="tabular-nums font-mono">
                ระยะแอร์แก็ปเซนเซอร์ {rawDist.toFixed(2)} ม.
              </span>
            </div>

            {/* Gauge Track */}
            <div
              style={{
                position: 'relative',
                height: 24,
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)',
              }}
              title={`ระดับน้ำเทียบ${refName} ${waterLevel >= 0 ? '+' : ''}${waterLevel.toFixed(3)} ม. | ระยะเซนเซอร์ ${rawDist.toFixed(2)} ม.`}
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
                      ? 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)'
                      : station.status === 'warning'
                      ? 'linear-gradient(90deg, #0284C7 0%, #F59E0B 100%)'
                      : 'linear-gradient(90deg, #0284C7 0%, #38BDF8 60%, #10B981 100%)',
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
                  background: '#F59E0B',
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
                  background: '#EF4444',
                  zIndex: 2,
                }}
              />
            </div>

            {/* Gauge Legends */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10.5,
                color: '#64748B',
                marginTop: 6,
              }}
            >
              <span>ระดับต่ำ</span>
              <span style={{ color: '#CBD5E1' }}>0.00 ม. ({refName})</span>
              <span style={{ color: '#F59E0B' }}>เฝ้าระวัง {warnLevel.toFixed(2)} ม.</span>
              <span style={{ color: '#EF4444' }}>วิกฤต {critLevel.toFixed(2)} ม.</span>
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
              fontSize: 11.5,
            }}
          >
            <div>
              <div style={{ color: '#64748B' }}>ระยะติดตั้งเซนเซอร์</div>
              <div className="tabular-nums font-mono" style={{ color: '#F8FAFC', fontWeight: 600 }}>
                {sensorToRef.toFixed(2)} ม.
              </div>
            </div>
            <div>
              <div style={{ color: '#64748B' }}>ระยะแอร์แก็ป Air-Gap</div>
              <div className="tabular-nums font-mono" style={{ color: '#38BDF8', fontWeight: 600 }}>
                {rawDist.toFixed(2)} ม.
              </div>
            </div>
            <div>
              <div style={{ color: '#64748B' }}>การชดเชยเสาเอียง</div>
              <div style={{ color: station.tiltCompensationEnabled ? '#10B981' : '#64748B', fontWeight: 600 }}>
                {station.tiltCompensationEnabled ? 'เปิดใช้งาน' : 'ปิดการชดเชย'}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748B' }}>ขอบเขตระยะบอด</div>
              <div className="tabular-nums font-mono" style={{ color: '#F8FAFC', fontWeight: 600 }}>
                {station.blindZoneOffset ?? 0.28} ม.
              </div>
            </div>
          </div>
        </div>

        {/* ── POD 2 & 3: ATMOSPHERE & HARDWARE COCKPIT (5 COLS ON LG) ── */}
        <div className="lg:col-span-5 flex flex-col gap-4">
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
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                สภาพแวดล้อมรอบสถานี
              </span>
              <span style={{ fontSize: 11, color: '#64748B' }}>เซนเซอร์อุตุนิยมวิทยา</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Temp Pod */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(249, 115, 22, 0.15)',
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
                    style={{ fontSize: 26, fontWeight: 800, color: '#F97316' }}
                  >
                    {station.temperature != null ? station.temperature.toFixed(1) : '-'}
                  </span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>°C</span>
                </div>
              </div>

              {/* Humidity Pod */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(6, 182, 212, 0.15)',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#06B6D4', fontSize: 12, fontWeight: 600 }}>
                  <DropletsIcon size={14} />
                  <span>ความชื้นสัมพัทธ์</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <span
                    className="tabular-nums font-mono"
                    style={{ fontSize: 26, fontWeight: 800, color: '#06B6D4' }}
                  >
                    {station.humidity != null ? station.humidity.toFixed(1) : '-'}
                  </span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>%RH</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>ความดันบรรยากาศปกติ</span>
              <span>เซนเซอร์ SHT30 / AHT20</span>
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
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                พลังงานและการสื่อสาร LoRaWAN
              </span>
              <span style={{ fontSize: 11, color: '#64748B' }}>รุ่น {station.model || 'Heltec V3'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Battery Pod */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${
                    station.batteryPercent != null && station.batteryPercent < 20
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(16, 185, 129, 0.15)'
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
                    color: station.batteryPercent != null && station.batteryPercent < 20 ? '#EF4444' : '#10B981',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <BatteryChargingIcon size={14} />
                  <span>ระดับแบตเตอรี่</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <span
                    className="tabular-nums font-mono"
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: station.batteryPercent != null && station.batteryPercent < 20 ? '#EF4444' : '#10B981',
                    }}
                  >
                    {station.batteryPercent != null ? `${station.batteryPercent}%` : '100%'}
                  </span>
                  {station.batteryVoltage != null && (
                    <span className="tabular-nums font-mono" style={{ fontSize: 11.5, color: '#94A3B8' }}>
                      ({station.batteryVoltage.toFixed(2)}V)
                    </span>
                  )}
                </div>
              </div>

              {/* LoRa Signal Pod */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(168, 85, 247, 0.15)',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A855F7', fontSize: 12, fontWeight: 600 }}>
                  <WifiIcon size={14} />
                  <span>ลิงก์สัญญาณ LoRa</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span
                    className="tabular-nums font-mono"
                    style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC' }}
                  >
                    {rssi}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#94A3B8' }}>dBm</span>
                  <span className="tabular-nums font-mono" style={{ fontSize: 11, color: '#64748B' }}>
                    SNR {station.snr ?? 14.5}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RadioIcon size={12} style={{ color: '#A855F7', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                เชื่อมต่อ {station.gatewayName || 'Gateway_01'} · โซลาร์เซลล์ประจำสถานี
              </span>
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
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
            กราฟประวัติเซนเซอร์ตามช่วงเวลา
          </h2>
          <span style={{ fontSize: 12, color: '#64748B' }}>
            ({metrics.count} รายการข้อมูล)
          </span>
        </div>

        {/* VisionOS Pill Selector via SegmentedControl */}
        <SegmentedControl
          options={timeframeOptions}
          value={timeRange}
          onChange={(val) => setTimeRange(val)}
          size="sm"
          ariaLabel="เลือกช่วงเวลากราฟ"
        />
      </div>

      {/* ── 4. COCKPIT CHARTS BENTO SECTION ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ── CARD 1: MASTER WATER LEVEL TELEMETRY (WIDE HERO) ── */}
        <div
          style={{
            background: 'var(--card-surface, #0C0E12)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: '20px 22px',
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
                <DropletsIcon size={18} style={{ color: '#38BDF8' }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                  กราฟระดับน้ำเทียบ{refName}
                </h3>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                ระดับน้ำที่คำนวณจากระยะเซนเซอร์อัลตราโซนิกหักลบจุดอ้างอิง ({sensorToRef.toFixed(2)} ม.)
              </div>
            </div>

            {/* Metric Strip with Delta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>สูงสุด </span>
                <span className="tabular-nums font-mono" style={{ color: '#F87171', fontWeight: 700 }}>
                  {metrics.waterMax != null ? `${metrics.waterMax.toFixed(2)} ม.` : '-'}
                </span>
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>ต่ำสุด </span>
                <span className="tabular-nums font-mono" style={{ color: '#34D399', fontWeight: 700 }}>
                  {metrics.waterMin != null ? `${metrics.waterMin.toFixed(2)} ม.` : '-'}
                </span>
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>เฉลี่ย </span>
                <span className="tabular-nums font-mono" style={{ color: '#38BDF8', fontWeight: 700 }}>
                  {metrics.waterAvg != null ? `${metrics.waterAvg.toFixed(2)} ม.` : '-'}
                </span>
              </div>
              {waterDelta && (
                <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#64748B' }}>การเปลี่ยนแปลง </span>
                  <span
                    className="tabular-nums font-mono"
                    style={{
                      color:
                        waterDelta.direction === 'up'
                          ? '#EF4444'
                          : waterDelta.direction === 'down'
                          ? '#10B981'
                          : '#94A3B8',
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
                    <span>{waterDelta.delta > 0 ? `+${waterDelta.delta}` : waterDelta.delta} ม.</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Chart Display */}
          <div style={{ height: 340, width: '100%', position: 'relative' }}>
            {loadingReadings ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                กำลังโหลดข้อมูลประวัติระดับน้ำ...
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 13 }}>
                ไม่มีบันทึกข้อมูลระดับน้ำในช่วงเวลานี้
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="waterGradientDetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis
                    dataKey="timeLabel"
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                    tickLine={false}
                    tickFormatter={(v) => `${Number(v).toFixed(2)}m`}
                  />
                  <Tooltip content={<WaterTooltip />} />
                  <ReferenceLine y={0} stroke="#64748B" strokeDasharray="3 3" label={{ value: 'จุดอ้างอิง 0.00 ม.', fill: '#64748B', fontSize: 11, position: 'insideTopLeft' }} />
                  {station.warningLevel != null && (
                    <ReferenceLine y={warnLevel} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: `เฝ้าระวัง ${warnLevel.toFixed(2)} ม.`, fill: '#F59E0B', fontSize: 11, position: 'insideTopLeft' }} />
                  )}
                  {station.criticalLevel != null && (
                    <ReferenceLine y={critLevel} stroke="#EF4444" strokeDasharray="4 4" label={{ value: `วิกฤต ${critLevel.toFixed(2)} ม.`, fill: '#EF4444', fontSize: 11, position: 'insideTopLeft' }} />
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

        {/* ── SECONDARY TELEMETRY GRID (ENVIRONMENT + BATTERY SIDE-BY-SIDE ON LG) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── CARD 2: ENVIRONMENT TELEMETRY (TEMPERATURE & HUMIDITY) ── */}
          <div
            style={{
              background: 'var(--card-surface, #0C0E12)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '20px 22px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Card Header & Stats */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ThermometerIcon size={18} style={{ color: '#F97316' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                    กราฟสภาพแวดล้อม
                  </h3>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  อุณหภูมิ (°C สีส้ม) และความชื้นสัมพัทธ์ (%RH สีฟ้า)
                </div>
              </div>

              {/* Metric Strip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: '#64748B' }}>อุณหภูมิเฉลี่ย </span>
                  <span className="tabular-nums font-mono" style={{ color: '#F97316', fontWeight: 700 }}>
                    {metrics.tempAvg != null ? `${metrics.tempAvg.toFixed(1)} °C` : '-'}
                  </span>
                </div>
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: '#64748B' }}>ความชื้นเฉลี่ย </span>
                  <span className="tabular-nums font-mono" style={{ color: '#06B6D4', fontWeight: 700 }}>
                    {metrics.humidityAvg != null ? `${metrics.humidityAvg.toFixed(1)} %RH` : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Chart Display */}
            <div style={{ height: 270, width: '100%', position: 'relative' }}>
              {loadingReadings ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                  กำลังโหลดข้อมูลสภาพแวดล้อม...
                </div>
              ) : chartData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 13 }}>
                  ไม่มีบันทึกข้อมูลสภาพแวดล้อมในช่วงเวลานี้
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                    <XAxis
                      dataKey="timeLabel"
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={['auto', 'auto']}
                      tick={{ fill: '#F97316', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(249, 115, 22, 0.2)' }}
                      tickLine={false}
                      tickFormatter={(v) => `${Number(v).toFixed(0)}°C`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fill: '#06B6D4', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(6, 182, 212, 0.2)' }}
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
                      stroke="#06B6D4"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#06B6D4' }}
                      name="ความชื้น (%RH)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── CARD 3: POWER & BATTERY TELEMETRY ── */}
          <div
            style={{
              background: 'var(--card-surface, #0C0E12)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '20px 22px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Card Header & Stats */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BatteryChargingIcon size={18} style={{ color: '#10B981' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                    กราฟสถานะพลังงาน
                  </h3>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  ประจุแบตเตอรี่ลิเธียมไอออนและระบบชาร์จโซลาร์เซลล์
                </div>
              </div>

              {/* Metric Strip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: '#64748B' }}>แบตเตอรี่ล่าสุด </span>
                  <span className="tabular-nums font-mono" style={{ color: '#10B981', fontWeight: 700 }}>
                    {station.batteryPercent != null ? `${station.batteryPercent}%` : '100%'}
                  </span>
                </div>
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: '#64748B' }}>ต่ำสุดในช่วง </span>
                  <span className="tabular-nums font-mono" style={{ color: metrics.batteryMin != null && metrics.batteryMin < 20 ? '#EF4444' : '#F8FAFC', fontWeight: 700 }}>
                    {metrics.batteryMin != null ? `${metrics.batteryMin}%` : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Chart Display */}
            <div style={{ height: 270, width: '100%', position: 'relative' }}>
              {loadingReadings ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                  กำลังโหลดข้อมูลพลังงาน...
                </div>
              ) : chartData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 13 }}>
                  ไม่มีบันทึกข้อมูลพลังงานในช่วงเวลานี้
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="batteryGradientDetail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                    <XAxis
                      dataKey="timeLabel"
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                      tickLine={false}
                      tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                    />
                    <Tooltip content={<BatteryTooltip />} />
                    <ReferenceLine y={20} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'เกณฑ์แบตเตอรี่ต่ำ (20%)', fill: '#EF4444', fontSize: 11, position: 'insideTopLeft' }} />
                    <Area
                      type="monotone"
                      dataKey="batteryPercent"
                      stroke="#10B981"
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
