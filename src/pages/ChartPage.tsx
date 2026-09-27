import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import WaterLevelChart from '../components/charts/WaterLevelChart';
import type { Station, TimeRange, WaterLevelReading, StationWithReading, Reading } from '../types';
import { fetchStations, fetchReadingsInRange } from '../services/apiService';
import {
  AlertTriangleIcon,
  MapPinIcon,
  ThermometerIcon,
  RadioIcon,
  LineChartIcon,
  DropletsIcon,
  BatteryChargingIcon,
  CheckCircleIcon,
  DownloadIcon,
  ClockIcon,
  ActivityIcon,
} from '../components/ui/Icons';
import SegmentedControl from '../components/ui/SegmentedControl';
import type { SegmentedOption } from '../components/ui/SegmentedControl';
import { exportWaterLevelCSV } from '../utils/exportCSV';

const timeRangeOptions: SegmentedOption<TimeRange>[] = [
  { value: 'hourly', label: 'รายชั่วโมง', icon: <ClockIcon size={14} /> },
  { value: 'daily', label: 'รายวัน', icon: <ActivityIcon size={14} /> },
  { value: 'weekly', label: 'รายสัปดาห์', icon: <LineChartIcon size={14} /> },
];

const statusLabel: Record<string, string> = {
  normal: 'ปกติ',
  warning: 'เฝ้าระวัง',
  critical: 'วิกฤต',
  unknown: 'ไม่มีข้อมูล',
};

const statusColor: Record<string, string> = {
  normal: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444',
  unknown: 'var(--text-muted)',
};

const mapStationWithReadingToStation = (swr: StationWithReading): Station => {
  let district = '';
  let province = '';
  if (swr.location_name) {
    const parts = swr.location_name.split(' ');
    district = parts[0] ? parts[0].replace(/^[อส]\./, '') : '';
    province = parts[1] ? parts[1].replace(/^[จ]\./, '') : '';
  }

  return {
    id: swr.station_id,
    name: swr.station_name,
    description: `ประเภท ${swr.station_type || 'สถานีตรวจวัด'} · Gateway ${swr.gateway_name || '-'}`,
    location: swr.location_name || '',
    district: district,
    province: province,
    lat: Number(swr.latitude) || 14.03593,
    lng: Number(swr.longitude) || 100.72516,
    currentLevel: swr.sensor_to_ref_distance != null && swr.raw_distance != null
      ? Number((Number(swr.sensor_to_ref_distance) - Number(swr.raw_distance)).toFixed(3))
      : (swr.water_level != null ? Number(swr.water_level) : 0),
    sensorToRefDistance: swr.sensor_to_ref_distance != null ? Number(swr.sensor_to_ref_distance) : 2.0,
    referencePointName: swr.reference_point_name && swr.reference_point_name.trim() !== '' ? swr.reference_point_name.trim() : 'จุดอ้างอิง',
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
    // Sensor readings: return undefined when null so offline guard ("-") displays correctly
    batteryPercent: swr.battery_percent != null ? Number(swr.battery_percent) : undefined,
    batteryVoltage: swr.battery_voltage != null ? Number(swr.battery_voltage) : undefined,
    temperature: swr.temperature != null ? Number(swr.temperature) : undefined,
    humidity: swr.humidity != null ? Number(swr.humidity) : undefined,
    rssi: swr.rssi != null ? Number(swr.rssi) : undefined,
    snr: swr.snr != null ? Number(swr.snr) : undefined,
    tiltX: swr.tilt_x != null ? Number(swr.tilt_x) : undefined,
    tiltY: swr.tilt_y != null ? Number(swr.tilt_y) : undefined,
    gatewayName: swr.gateway_name || 'Gateway_01',
    gatewayStatus: swr.gateway_status || 'online',
    model: swr.model || undefined,
    firmwareVersion: swr.firmware_version || undefined,
    stationType: swr.station_type || 'สถานีตรวจวัด',
  };
};

function getWeekRangeLabel(date: Date): { key: string; label: string; start: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  const label = `${format(monday, 'dd/MM')} - ${format(sunday, 'dd/MM')}`;
  return { key, label, start: monday };
}

function aggregateReadings(
  readings: Reading[],
  timeRange: TimeRange,
  stationId: string,
  sToRef?: number
): WaterLevelReading[] {
  if (!readings.length) return [];

  const groups: Record<string, { items: Reading[]; timestamp: string; label?: string }> = {};

  readings.forEach((r) => {
    const d = new Date(r.timestamp);
    if (isNaN(d.getTime())) return;

    let groupKey = '';
    let groupTime = '';
    let groupLabel: string | undefined = undefined;

    if (timeRange === 'hourly') {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      groupKey = `${yr}-${mo}-${da} ${hr}:00`;
      const hourDate = new Date(d);
      hourDate.setMinutes(0, 0, 0);
      groupTime = hourDate.toISOString();
    } else if (timeRange === 'daily') {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      groupKey = `${yr}-${mo}-${da}`;
      const dayDate = new Date(d);
      dayDate.setHours(0, 0, 0, 0);
      groupTime = dayDate.toISOString();
    } else {
      const { key, label, start } = getWeekRangeLabel(d);
      groupKey = key;
      groupTime = start.toISOString();
      groupLabel = label;
    }

    if (!groups[groupKey]) {
      groups[groupKey] = { items: [], timestamp: groupTime, label: groupLabel };
    }
    groups[groupKey].items.push(r);
  });

  const groupKeys = Object.keys(groups).sort();
  return groupKeys.map((key) => {
    const group = groups[key];
    const items = group.items;
    const count = items.length;

    const levels = items.map((r) => {
      if (sToRef !== undefined && r.raw_distance !== null && r.raw_distance !== undefined) {
        return Number((sToRef - Number(r.raw_distance)).toFixed(3));
      }
      return r.water_level !== null && r.water_level !== undefined ? Number(r.water_level) : 0;
    });

    const sumLevel = levels.reduce((a, b) => a + b, 0);
    const avgLevel = Number((sumLevel / count).toFixed(3));
    const minLevel = Number(Math.min(...levels).toFixed(3));
    const maxLevel = Number(Math.max(...levels).toFixed(3));

    const calcAvg = (getter: (r: Reading) => number | null | undefined, decimals = 2) => {
      const valid = items.map(getter).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
      if (!valid.length) return null;
      return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(decimals));
    };

    const avgRawDistance = calcAvg((r) => r.raw_distance, 3);
    const avgTemperature = calcAvg((r) => r.temperature, 1);
    const avgHumidity = calcAvg((r) => r.humidity, 1);
    const avgBatteryVoltage = calcAvg((r) => r.battery_voltage, 2);
    const avgBatteryPercent = calcAvg((r) => r.battery_percent, 0);
    const avgRssi = calcAvg((r) => r.rssi, 0);
    const avgSnr = calcAvg((r) => r.snr, 1);
    const avgTiltX = calcAvg((r) => r.tilt_x, 2);
    const avgTiltY = calcAvg((r) => r.tilt_y, 2);
    const isBlindZone = items.some((r) => Boolean(r.is_blind_zone));

    return {
      timestamp: group.timestamp,
      level: avgLevel,
      stationId,
      minLevel,
      maxLevel,
      count,
      label: group.label,
      rawDistance: avgRawDistance,
      temperature: avgTemperature,
      humidity: avgHumidity,
      batteryVoltage: avgBatteryVoltage,
      batteryPercent: avgBatteryPercent,
      rssi: avgRssi,
      snr: avgSnr,
      tiltX: avgTiltX,
      tiltY: avgTiltY,
      isBlindZone,
    };
  });
}

export default function ChartPage() {
  const { user } = useAuth();
  const { nodeId } = useParams<{ nodeId?: string }>();
  const [searchParams] = useSearchParams();
  const targetId = nodeId || searchParams.get('station') || '';

  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>(targetId);
  const [timeRange, setTimeRange] = useState<TimeRange>('hourly');

  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationsError, setStationsError] = useState<string | null>(null);

  const [readings, setReadings] = useState<WaterLevelReading[]>([]);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [readingsError, setReadingsError] = useState<string | null>(null);
  const [isExported, setIsExported] = useState(false);

  const handleExportCSV = () => {
    if (!selectedStation || readings.length === 0 || readingsLoading) return;
    exportWaterLevelCSV(readings, selectedStation, timeRange);
    setIsExported(true);
    setTimeout(() => setIsExported(false), 2500);
  };

  // ── Load stations from DB ─────────────────────────────────────
  useEffect(() => {
    const loadStations = async () => {
      setStationsLoading(true);
      setStationsError(null);
      try {
        const data = await fetchStations();
        const mapped = data.map(mapStationWithReadingToStation);
        // Citizens see only their stations
        const filtered =
          user?.role === 'citizen'
            ? mapped.filter((s) => user.stationIds?.includes(s.id))
            : mapped;
        setStations(filtered);

        // Target station from URL / deep-link
        if (targetId && mapped.some((s) => s.id === targetId)) {
          setSelectedStationId(targetId);
        } else if (filtered.length > 0 && !selectedStationId) {
          setSelectedStationId(filtered[0].id);
        }
      } catch (err: any) {
        setStationsError(err.message || 'ไม่สามารถดึงข้อมูลสถานีได้');
      } finally {
        setStationsLoading(false);
      }
    };
    loadStations();
    window.addEventListener('app:refresh', loadStations);
    return () => {
      window.removeEventListener('app:refresh', loadStations);
    };
  }, [user, targetId]);

  // ── Load chart data (readings) from DB ─────────────────────────
  useEffect(() => {
    if (!selectedStationId) return;

    const loadChartData = async () => {
      setReadingsLoading(true);
      setReadingsError(null);
      try {
        const end = new Date();
        const start = new Date();
        if (timeRange === 'hourly') {
          // 1 วัน (24 ชั่วโมงย้อนหลัง)
          start.setHours(start.getHours() - 24);
        } else if (timeRange === 'daily') {
          // 2 สัปดาห์ย้อนหลัง (14 วัน)
          start.setDate(start.getDate() - 14);
        } else if (timeRange === 'weekly') {
          // 14 สัปดาห์ย้อนหลัง (14 * 7 วัน)
          start.setDate(start.getDate() - 14 * 7);
        }

        const data = await fetchReadingsInRange(selectedStationId, start, end);
        const currStation = stations.find((s) => s.id === selectedStationId);
        const sToRef = currStation?.sensorToRefDistance;
        const aggregated = aggregateReadings(data, timeRange, selectedStationId, sToRef);
        setReadings(aggregated);
      } catch (err: any) {
        setReadingsError(err.message || 'ไม่สามารถดึงประวัติระดับน้ำได้');
        setReadings([]);
      } finally {
        setReadingsLoading(false);
      }
    };

    loadChartData();
  }, [selectedStationId, timeRange]);

  const selectedStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId);
  }, [stations, selectedStationId]);

  return (
    <div className="page-container" style={{ paddingBottom: '3rem' }}>

      {/* Loading state for stations */}
      {stationsLoading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid rgba(6, 182, 212, 0.2)',
              borderTopColor: 'var(--primary-accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>กำลังโหลดรายชื่อสถานี...</div>
        </div>
      )}

      {/* Error state */}
      {stationsError && (
        <div
          className="card"
          style={{
            color: 'var(--color-critical)',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: '1.5rem',
          }}
        >
          <AlertTriangleIcon size={18} />
          <span><strong>เกิดข้อผิดพลาดในการโหลดรายชื่อสถานี</strong> {stationsError}</span>
        </div>
      )}

      {/* ── Main Layout: Hero Graph (Left) + Station Selector with Mini-Metrics (Right) ── */}
      {!stationsLoading && !stationsError && selectedStation && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 340px',
            gap: '1.25rem',
            alignItems: 'start',
          }}
        >
          {/* ════════ LEFT COLUMN: THE HERO GRAPH ════════ */}
          <div
            className="bento-card"
            style={{
              background: 'linear-gradient(135deg, #111827 0%, #0F172A 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '1.25rem',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
            }}
          >
            {/* Chart Header Toolbar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.25rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {/* Left: Active Station Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.8125rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '0.375rem',
                      background: 'rgba(37, 99, 235, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38BDF8',
                    }}
                  >
                    {selectedStation.id}
                  </span>
                  <h2
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      margin: 0,
                    }}
                  >
                    {selectedStation.name}
                  </h2>
                  {(() => {
                    const isOffline = !selectedStation.isActive || (selectedStation as any).operatingStatus === 'offline';
                    return (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          background: isOffline ? 'rgba(100, 116, 139, 0.15)' : `${statusColor[selectedStation.status]}20`,
                          border: `1px solid ${isOffline ? 'rgba(100, 116, 139, 0.3)' : `${statusColor[selectedStation.status]}40`}`,
                          color: isOffline ? '#94A3B8' : statusColor[selectedStation.status],
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isOffline ? '#64748B' : statusColor[selectedStation.status],
                          }}
                        />
                        {isOffline ? 'ออฟไลน์' : statusLabel[selectedStation.status]}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <MapPinIcon size={13} style={{ color: 'var(--sky-highlight)' }} />
                  <span>{selectedStation.location || `${selectedStation.district} · ${selectedStation.province}`}</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                  {(() => {
                    const isOffline = !selectedStation.isActive || (selectedStation as any).operatingStatus === 'offline';
                    return (
                      <span>
                        ระดับน้ำ ({selectedStation.referencePointName || 'จุดอ้างอิง'}){' '}
                        <strong
                          style={{
                            color: isOffline ? '#64748B' : selectedStation.currentLevel > 0 ? '#EF4444' : '#38BDF8',
                            fontFamily: 'monospace',
                          }}
                        >
                          {isOffline
                            ? '-'
                            : `${(selectedStation.currentLevel > 0 ? '+' : '') + selectedStation.currentLevel.toFixed(2)} ม.`}
                        </strong>
                      </span>
                    );
                  })()}
                  {!(!selectedStation.isActive || (selectedStation as any).operatingStatus === 'offline') &&
                    selectedStation.rawDistance !== undefined &&
                    selectedStation.rawDistance !== null && (
                    <>
                      <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        ระยะเซนเซอร์วัดได้{' '}
                        <strong style={{ color: '#E2E8F0', fontFamily: 'monospace' }}>
                          {selectedStation.rawDistance.toFixed(2)} ม.
                        </strong>
                      </span>
                    </>
                  )}
                  {selectedStation.isBlindZone && (
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '0.25rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#EF4444',
                        fontWeight: 700,
                        fontSize: '0.6875rem',
                      }}
                    >
                      Blind Zone (≤0.28m)
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Time Range Segmented Switcher & Prominent Export CSV Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* Time Range Selector */}
                <SegmentedControl
                  options={timeRangeOptions}
                  value={timeRange}
                  onChange={(val) => setTimeRange(val as TimeRange)}
                  size="md"
                  ariaLabel="ช่วงเวลาของกราฟระดับน้ำ"
                />

                {/* Export CSV Button (Matching standard button style, no glow) */}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportCSV}
                  disabled={readings.length === 0 || readingsLoading}
                  title={
                    readings.length === 0
                      ? 'ไม่มีข้อมูลระดับน้ำสำหรับส่งออก'
                      : `ส่งออกข้อมูลระดับน้ำ ${selectedStation?.name || ''} เป็นไฟล์ CSV (${timeRange === 'hourly' ? '1 วัน (รายชั่วโมง)' : timeRange === 'daily' ? '2 สัปดาห์ (เฉลี่ยรายวัน)' : '14 สัปดาห์ (เฉลี่ยรายสัปดาห์)'})`
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    borderRadius: '0.5rem',
                    boxShadow: 'none',
                  }}
                >
                  {isExported ? (
                    <>
                      <CheckCircleIcon size={14} style={{ color: '#10B981' }} />
                      <span style={{ color: '#10B981' }}>ดาวน์โหลดสำเร็จ</span>
                    </>
                  ) : (
                    <>
                      <DownloadIcon size={14} />
                      <span>ส่งออก CSV</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Chart Area */}
            {readingsLoading ? (
              <div
                style={{
                  height: 480,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: '3px solid rgba(6, 182, 212, 0.15)',
                    borderTopColor: 'var(--primary-accent)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginBottom: 10,
                  }}
                />
                <span style={{ fontSize: '0.875rem' }}>กำลังดึงข้อมูลประวัติระดับน้ำ...</span>
              </div>
            ) : readingsError ? (
              <div
                style={{
                  height: 480,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-critical)',
                  fontSize: '0.875rem',
                  gap: 8,
                }}
              >
                <AlertTriangleIcon size={18} />
                <span>{readingsError}</span>
              </div>
            ) : readings.length === 0 ? (
              <div
                style={{
                  height: 480,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  gap: 12,
                  textAlign: 'center',
                  padding: '0 20px',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LineChartIcon size={28} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                </div>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>
                    {timeRange === 'hourly'
                      ? 'ยังไม่มีการส่งข้อมูลในรอบ 24 ชั่วโมงล่าสุด'
                      : timeRange === 'daily'
                      ? 'ไม่มีข้อมูลระดับน้ำในช่วง 14 วันที่ผ่านมา'
                      : 'ไม่มีข้อมูลระดับน้ำในช่วงเวลาที่เลือก'}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {timeRange === 'hourly' ? (
                      <>
                        โหนดเซนเซอร์ยังไม่ได้ส่งค่าเข้ามาในวันนี้ ท่านสามารถคลิกเลือกมุมมอง{' '}
                        <button
                          type="button"
                          onClick={() => setTimeRange('daily')}
                          style={{
                            color: 'var(--primary-accent)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontWeight: 600,
                            padding: 0,
                          }}
                        >
                          "รายวัน"
                        </button>{' '}
                        เพื่อดูข้อมูลย้อนหลังที่มีในระบบได้ครับ
                      </>
                    ) : (
                      'ลองปรับเปลี่ยนช่วงเวลาการแสดงผล หรือเลือกสถานีอื่น'
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', height: 480 }}>
                <WaterLevelChart
                  readings={readings}
                  station={selectedStation}
                  timeRange={timeRange}
                  height={480}
                />
              </div>
            )}

            {/* Threshold & Reference Summary Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {/* Legend */}
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                  <div style={{ width: 24, height: 3, background: 'linear-gradient(90deg, #7c5cfc, #06B6D4)', borderRadius: 2 }} />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>ระดับน้ำจริง</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                  <div style={{ width: 20, height: 2, borderTop: '2px solid rgba(255, 255, 255, 0.4)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>
                    {selectedStation.referencePointName || 'จุดอ้างอิง'} (0.00 ม.)
                  </span>
                </div>
                {/* Warning Level */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                  <div style={{ width: 22, height: 2, borderTop: '2px dashed #F59E0B' }} />
                  <span style={{ color: '#F59E0B', fontWeight: 600 }}>
                    เกณฑ์เฝ้าระวัง ({((selectedStation.warningLevel ?? (selectedStation as any).warning_level ?? 0.3) >= 0 ? '+' : '')}{Number(selectedStation.warningLevel ?? (selectedStation as any).warning_level ?? 0.3).toFixed(2)} ม.)
                  </span>
                </div>
                {/* Critical Level */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                  <div style={{ width: 22, height: 2, borderTop: '2px dashed #EF4444' }} />
                  <span style={{ color: '#EF4444', fontWeight: 600 }}>
                    เกณฑ์วิกฤต ({((selectedStation.criticalLevel ?? (selectedStation as any).critical_level ?? 0.6) >= 0 ? '+' : '')}{Number(selectedStation.criticalLevel ?? (selectedStation as any).critical_level ?? 0.6).toFixed(2)} ม.)
                  </span>
                </div>
              </div>

              {/* Threshold Micro-Pills */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  จุดอ้างอิง <strong style={{ color: '#38BDF8' }}>{selectedStation.referencePointName || 'จุดอ้างอิง'}</strong>
                  {selectedStation.sensorToRefDistance !== undefined && ` (ระยะติดตั้ง ${selectedStation.sensorToRefDistance.toFixed(2)} ม.)`}
                </span>
              </div>
            </div>
          </div>

          {/* ════════ RIGHT COLUMN: STATION SELECTOR WITH LIVE MINI-METRICS ════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {/* Header of Selector Column */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.25rem 0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RadioIcon size={16} style={{ color: 'var(--sky-highlight)' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF' }}>
                  สถานีตรวจวัด ({stations.length})
                </span>
              </div>
            </div>

            {/* List of Interactive Station Cards */}
            {stations.map((s) => {
              const isSelected = s.id === selectedStationId;
              const sColor = statusColor[s.status] || '#10B981';

              // Battery color
              const battPct = s.batteryPercent ?? 100;
              const battColor = battPct > 50 ? '#10B981' : battPct > 20 ? '#F59E0B' : '#EF4444';

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStationId(s.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '1rem 1.125rem',
                    borderRadius: '1rem',
                    border: isSelected
                      ? '2px solid var(--primary-accent)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : 'rgba(15, 23, 42, 0.75)',
                    boxShadow: isSelected
                      ? '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                      : '0 4px 12px rgba(0, 0, 0, 0.25)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    outline: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.45)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.background = 'rgba(30, 41, 59, 0.85)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
                    }
                  }}
                >
                  {/* Top indicator line for active card */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: '#2563EB',
                      }}
                    />
                  )}

                  {/* Station Code & Active Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {/* Status beacon dot */}
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: sColor,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.8125rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '0.375rem',
                          background: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#38BDF8' : 'var(--text-primary)',
                        }}
                      >
                        {s.id}
                      </span>
                    </div>

                    {/* Active badge */}
                    {isSelected && (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          background: 'rgba(37, 99, 235, 0.2)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          color: '#38BDF8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <CheckCircleIcon size={11} />
                        <span>กำลังดูกราฟ</span>
                      </span>
                    )}
                  </div>

                  {/* Station Name & District */}
                  <div>
                    <h3
                      style={{
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        color: isSelected ? '#FFFFFF' : '#E2E8F0',
                        margin: '0 0 0.15rem 0',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.name}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.district ? `${s.district} · ${s.province}` : s.location}
                    </div>
                  </div>

                  {/* Live Water Level Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '0.625rem',
                      background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                      border: isSelected ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <DropletsIcon size={14} style={{ color: isSelected ? '#38BDF8' : 'var(--text-secondary)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ระดับน้ำ</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                      <strong
                        style={{
                          fontSize: '0.875rem',
                          color: isSelected ? '#38BDF8' : s.currentLevel > 0 ? '#EF4444' : '#FFFFFF',
                          fontFamily: 'monospace',
                        }}
                      >
                        {(s.currentLevel > 0 ? '+' : '') + s.currentLevel.toFixed(2)}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        ม.
                      </span>
                    </div>
                  </div>

                  {/* Mini-Metrics Row (Battery, Temp, Humidity) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.5rem',
                      paddingTop: '0.35rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    {/* Battery */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <BatteryChargingIcon size={11} style={{ color: battColor }} /> แบต
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: battColor, fontFamily: 'monospace' }}>
                        {battPct}%
                      </span>
                      <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, Math.max(0, battPct))}%`, height: '100%', background: battColor, borderRadius: 2 }} />
                      </div>
                    </div>

                    {/* Temp */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <ThermometerIcon size={11} style={{ color: '#F59E0B' }} /> อุณหภูมิ
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B', fontFamily: 'monospace' }}>
                        {s.temperature !== undefined ? `${s.temperature.toFixed(1)}°` : '—'}
                      </span>
                    </div>

                    {/* Humidity */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <DropletsIcon size={11} style={{ color: '#38BDF8' }} /> ความชื้น
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', fontFamily: 'monospace' }}>
                        {s.humidity !== undefined ? `${s.humidity.toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stations.length === 0 && !stationsLoading && (
        <div className="empty-state card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <LineChartIcon size={48} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="empty-state-title" style={{ fontSize: 16, fontWeight: 700 }}>ไม่มีสถานีที่ลงทะเบียน</p>
          <p className="empty-state-desc" style={{ fontSize: 13, color: 'var(--text-muted)' }}>ติดต่อเจ้าหน้าที่เพื่อขอเพิ่มสถานีติดตาม</p>
        </div>
      )}
    </div>
  );
}
