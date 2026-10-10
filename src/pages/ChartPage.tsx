import { useState, useEffect, useMemo, Fragment } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WaterLevelChart from '../components/charts/WaterLevelChart';
import type { Station, TimeRange, WaterLevelReading, StationWithReading, Reading } from '../types';
import { fetchStations, fetchReadingsInRange, downloadReadingsCSV } from '../services/apiService';
import {
  AlertTriangleIcon,
  MapPinIcon,
  ThermometerIcon,
  RadioIcon,
  LineChartIcon,
  DropletsIcon,
  BatteryChargingIcon,
  CheckCircleIcon,
  ClockIcon,
  ActivityIcon,
  XIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  WavesIcon,
} from '../components/ui/Icons';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import type { SegmentedOption } from '../components/ui/SegmentedControl';
import { format } from 'date-fns';
import { exportWaterLevelCSV } from '../utils/exportCSV';
import { applyWaterLevelFilter, detectOutages } from '../utils/waterLevelFilter';
import ManagementBackBar from '../components/ui/ManagementBackBar';

const timeRangeOptions: SegmentedOption<TimeRange>[] = [
  { value: 'hourly', label: '24 ชั่วโมง', icon: <ClockIcon size={14} /> },
  { value: 'daily', label: '14 วัน', icon: <ActivityIcon size={14} /> },
  { value: 'weekly', label: '14 สัปดาห์', icon: <LineChartIcon size={14} /> },
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
    firmwareVersion: swr.firmware_version || undefined,
    stationType: swr.station_type || 'สถานีตรวจวัด',
  };
};

/**
 * Outlier Filtering ตาม Datasheet เซนเซอร์ (0 - 600 cm / 0.00 - 6.00 m)
 * และตัดค่าระยะใกล้เกินไปในระยะบอด Blind Zone (< 28 cm)
 */
function filterAndMapReadings(
  readings: Reading[],
  stationId: string,
  timeRange: TimeRange,
  station?: Station
): WaterLevelReading[] {
  if (!readings || !readings.length) return [];

  const sToRef = station?.sensorToRefDistance ?? 2.0;
  const blindZoneLimit =
    station?.blindZoneOffset !== undefined && station?.blindZoneOffset !== null && station.blindZoneOffset > 0
      ? station.blindZoneOffset
      : 0.28;

  const result: WaterLevelReading[] = [];

  readings.forEach((r) => {
    const d = new Date(r.timestamp);
    if (isNaN(d.getTime())) return;

    const rawDist =
      r.raw_distance !== null && r.raw_distance !== undefined && !isNaN(Number(r.raw_distance))
        ? Number(r.raw_distance)
        : null;

    if (rawDist !== null) {
      if (rawDist < blindZoneLimit || rawDist > 6.0) {
        return;
      }
    }

    let calculatedLevel: number;
    if (rawDist !== null) {
      calculatedLevel = Number((sToRef - rawDist).toFixed(3));
    } else if (r.water_level !== null && r.water_level !== undefined && !isNaN(Number(r.water_level))) {
      calculatedLevel = Number(Number(r.water_level).toFixed(3));
    } else {
      return;
    }

    if (calculatedLevel < -6.0 || calculatedLevel > 6.0) {
      return;
    }

    result.push({
      timestamp: r.timestamp,
      level: calculatedLevel,
      stationId,
      minLevel: calculatedLevel,
      maxLevel: calculatedLevel,
      count: 1,
      rawDistance: rawDist,
      temperature: r.temperature != null ? Number(r.temperature) : undefined,
      humidity: r.humidity != null ? Number(r.humidity) : undefined,
      batteryVoltage: r.battery_voltage != null ? Number(r.battery_voltage) : undefined,
      batteryPercent: r.battery_percent != null ? Number(r.battery_percent) : undefined,
      rssi: r.rssi != null ? Number(r.rssi) : undefined,
      snr: r.snr != null ? Number(r.snr) : undefined,
      tiltX: r.tilt_x != null ? Number(r.tilt_x) : undefined,
      tiltY: r.tilt_y != null ? Number(r.tilt_y) : undefined,
      isBlindZone: Boolean(r.is_blind_zone) || (rawDist !== null && rawDist <= blindZoneLimit),
    });
  });

  result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return applyWaterLevelFilter(result, timeRange, station);
}

export default function ChartPage() {
  const { user, isGuest } = useAuth();
  const canExport = !isGuest && (user?.role === 'admin' || user?.role === 'staff');
  const { nodeId } = useParams<{ nodeId?: string }>();
  const [searchParams] = useSearchParams();
  const targetId = nodeId || searchParams.get('station') || '';

  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>(targetId);
  const [timeRange, setTimeRange] = useState<TimeRange>('hourly');

  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationsError, setStationsError] = useState<string | null>(null);

  const [rawReadings, setRawReadings] = useState<Reading[]>([]);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [readingsError, setReadingsError] = useState<string | null>(null);
  const [isExported, setIsExported] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'current_station' | 'all_stations'>('current_station');
  const [exportLoading, setExportLoading] = useState(false);

  const selectedStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId);
  }, [stations, selectedStationId]);

  const readings = useMemo(() => {
    return filterAndMapReadings(rawReadings, selectedStationId, timeRange, selectedStation);
  }, [rawReadings, selectedStationId, timeRange, selectedStation]);

  const detectedOutages = useMemo(() => {
    return detectOutages(readings, timeRange);
  }, [readings, timeRange]);

  const stats = useMemo(() => {
    if (!readings || readings.length === 0) return null;
    const levels = readings
      .map((r) => r.level)
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));
    if (levels.length === 0) return null;

    const current = levels[levels.length - 1];
    const first = levels[0];
    const min = Math.min(...levels);
    const max = Math.max(...levels);
    const delta = max - min;
    const avg = levels.reduce((acc, curr) => acc + curr, 0) / levels.length;
    const netChange = Number((current - first).toFixed(3));

    return {
      current,
      min,
      max,
      delta,
      avg,
      netChange,
      direction: netChange > 0.005 ? ('up' as const) : netChange < -0.005 ? ('down' as const) : ('stable' as const),
      count: readings.length,
    };
  }, [readings]);

  const handleExportCSV = () => {
    if (readingsLoading) return;
    setIsExportModalOpen(true);
  };

  const handleConfirmExport = async () => {
    if (exportScope === 'current_station') {
      if (!selectedStation || readings.length === 0) return;
      exportWaterLevelCSV(readings, selectedStation, timeRange);
      setIsExportModalOpen(false);
      setIsExported(true);
      setTimeout(() => setIsExported(false), 2500);
    } else {
      setExportLoading(true);
      try {
        const blob = await downloadReadingsCSV({ timeRange });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `water_level_all_stations_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setIsExportModalOpen(false);
        setIsExported(true);
        setTimeout(() => setIsExported(false), 2500);
      } catch (err: unknown) {
        console.error('Export all stations CSV failed', err);
      } finally {
        setExportLoading(false);
      }
    }
  };

  // ── Load stations from DB ─────────────────────────────────────
  useEffect(() => {
    const loadStations = async () => {
      setStationsLoading(true);
      setStationsError(null);
      try {
        const data = await fetchStations();
        const mapped = data.map(mapStationWithReadingToStation);
        
        const isRegisteredCitizen =
          Boolean(user) &&
          user?.role === 'citizen' &&
          user?.id !== 'citizen_guest' &&
          !isGuest;
        const isStaff = !isGuest && user?.role === 'staff';

        const rawUserIds = user?.stationIds || (user as any)?.station_ids || [];
        const userStationIds = (Array.isArray(rawUserIds) ? rawUserIds : []).map((id: string) =>
          String(id).trim().toUpperCase()
        );
        const hasUserStations = userStationIds.length > 0;

        const filtered =
          (isRegisteredCitizen || isStaff) && hasUserStations
            ? mapped.filter((s) => userStationIds.includes(s.id.toUpperCase()))
            : mapped;

        const finalStations = filtered.length > 0 ? filtered : mapped;
        setStations(finalStations);

        if (targetId && mapped.some((s) => s.id === targetId)) {
          setSelectedStationId(targetId);
        } else {
          setSelectedStationId((prev) => {
            if (prev && finalStations.some((s) => s.id === prev)) return prev;
            return finalStations.length > 0 ? finalStations[0].id : '';
          });
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
  }, [user, isGuest, targetId]);

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
          start.setHours(start.getHours() - 24);
        } else if (timeRange === 'daily') {
          start.setDate(start.getDate() - 14);
        } else if (timeRange === 'weekly') {
          start.setDate(start.getDate() - 14 * 7);
        }

        const data = await fetchReadingsInRange(selectedStationId, start, end);
        setRawReadings(data);
      } catch (err: any) {
        setReadingsError(err.message || 'ไม่สามารถดึงประวัติระดับน้ำได้');
        setRawReadings([]);
      } finally {
        setReadingsLoading(false);
      }
    };

    loadChartData();
  }, [selectedStationId, timeRange]);

  return (
    <div className="page-container" style={{ maxWidth: 1440, margin: '0 auto', paddingBottom: '4rem' }}>
      {/* ── TOP MANAGEMENT BAR ── */}
      <ManagementBackBar
        title="วิเคราะห์กราฟโทรมาตร"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {selectedStation && (
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
                    background: selectedStation.isActive ? '#10B981' : '#94A3B8',
                    boxShadow: selectedStation.isActive ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
                    display: 'inline-block',
                  }}
                  className={selectedStation.isActive ? 'heartbeat-dot' : ''}
                />
                <span className="tabular-nums font-mono" style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                  {selectedStation.id} · {selectedStation.name}
                </span>
              </div>
            )}
          </div>
        }
      />

      {/* Loading state for stations (Zero-CLS Skeleton) */}
      {stationsLoading && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem', marginBottom: '1.5rem' }}>
          <SkeletonCard height="64px" />
          <div className="chart-main-split">
            <SkeletonCard height="560px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <SkeletonCard height="160px" />
              <SkeletonCard height="160px" />
              <SkeletonCard height="160px" />
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {stationsError && (
        <div
          className="card animate-fade-in"
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#F87171',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: '1.25rem',
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
          className="chart-main-split"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 340px',
            gap: '1.25rem',
            alignItems: 'start',
            marginTop: '1.25rem',
          }}
        >
          {/* ════════ LEFT COLUMN: THE HERO GRAPH ════════ */}
          <div
            className="bento-card animate-fade-in"
            style={{
              background: 'var(--card-surface, #0C0E12)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '1.25rem',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* ── Top: VisionOS Floating Glass Capsule Switcher (Mobile & Tablet <= 1024px only) ── */}
            {stations.length > 1 && (
              <div
                className="chart-mobile-station-bar station-capsule-track-container"
                style={{
                  marginBottom: '1.25rem',
                  paddingBottom: '1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div
                  className="vision-capsule-scroll-wrapper"
                  style={{
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    padding: '2px 2px',
                  }}
                >
                  <div
                    role="tablist"
                    aria-label="เลือกสถานีตรวจวัด"
                    className="vision-glass-dock"
                    style={{
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#15181E',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.09)',
                      borderRadius: '9999px',
                      padding: '4px',
                      boxShadow: 'inset 0 1.5px 3px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    {stations.map((s) => {
                      const isSelected = s.id === selectedStationId;
                      const isOffline = !s.isActive || (s as any).operatingStatus === 'offline';
                      let dotColor = '#10B981';
                      if (isOffline) dotColor = '#94A3B8';
                      else if (s.status === 'critical') dotColor = '#EF4444';
                      else if (s.status === 'warning') dotColor = '#F59E0B';

                      return (
                        <button
                          key={`chart-capsule-${s.id}`}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() => setSelectedStationId(s.id)}
                          className={`vision-capsule-item tactile-press ${isSelected ? 'selected' : ''}`}
                          style={{
                            position: 'relative',
                            zIndex: 2,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 14px',
                            borderRadius: '9999px',
                            fontSize: '0.8125rem',
                            fontWeight: isSelected ? 600 : 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            minHeight: '34px',
                            outline: 'none',
                            border: isSelected ? '1px solid rgba(56, 189, 248, 0.55)' : '1px solid transparent',
                            background: isSelected
                              ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.3) 0%, rgba(14, 165, 233, 0.14) 100%)'
                              : 'transparent',
                            boxShadow: isSelected ? '0 0 16px rgba(2, 132, 199, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.3)' : 'none',
                            color: isSelected ? '#F0F9FF' : '#94A3B8',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        >
                          <span
                            style={{
                              position: 'relative',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '8px',
                              height: '8px',
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && !isOffline && (
                              <span
                                className="sonar-pulse-ring"
                                style={{
                                  position: 'absolute',
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '9999px',
                                  backgroundColor: dotColor,
                                  opacity: 0.75,
                                }}
                              />
                            )}
                            <span
                              style={{
                                position: 'relative',
                                width: '7px',
                                height: '7px',
                                borderRadius: '9999px',
                                backgroundColor: dotColor,
                                boxShadow: !isOffline && isSelected ? `0 0 8px ${dotColor}` : 'none',
                              }}
                            />
                          </span>
                          <span
                            className="tabular-nums font-mono"
                            style={{
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              color: isSelected ? '#38BDF8' : '#CBD5E1',
                            }}
                          >
                            {s.id}
                          </span>
                          <span
                            style={{
                              maxWidth: '140px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {s.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.8125rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '0.375rem',
                      background: 'rgba(56, 189, 248, 0.15)',
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
                    const badgeStatus = isOffline ? 'offline' : (selectedStation.status as any);
                    const badgeLabel = isOffline ? 'ออฟไลน์' : statusLabel[selectedStation.status];
                    return <Badge status={badgeStatus} dot label={badgeLabel} size="sm" />;
                  })()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <MapPinIcon size={13} style={{ color: '#38BDF8' }} />
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
                      Blind Zone (&lt; 0.28 ม.)
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
                {/* ── Chrono-Horizon Time Range Switcher (Pure Minimal Timeline) ── */}
                <div
                  role="tablist"
                  aria-label="ช่วงเวลาของกราฟระดับน้ำ"
                  className="chrono-horizon-dock"
                >
                  {timeRangeOptions.map((opt, idx) => {
                    const isSelected = timeRange === opt.value;
                    return (
                      <Fragment key={opt.value}>
                        {idx > 0 && <span className="chrono-horizon-sep">·</span>}
                        <button
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() => setTimeRange(opt.value)}
                          className={`chrono-horizon-item tactile-press ${isSelected ? 'selected' : ''}`}
                        >
                          <span className="time-marker" />
                          <span>{opt.label}</span>
                        </button>
                      </Fragment>
                    );
                  })}
                </div>

                {/* ── Flight CSV Export Button ── */}
                {canExport && (
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={readingsLoading}
                    className={`csv-flight-button tactile-press ${isExported ? 'success' : ''}`}
                    title={`ส่งออกข้อมูลระดับน้ำเป็นไฟล์ CSV (${timeRange === 'hourly' ? '24 ชั่วโมง' : timeRange === 'daily' ? '14 วัน' : '14 สัปดาห์'})`}
                  >
                    <div className="flight-svg-wrapper">
                      {isExported ? (
                        <CheckCircleIcon size={16} style={{ color: '#ffffff' }} />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 2L11 13" />
                          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                        </svg>
                      )}
                    </div>
                    <span className="flight-text">
                      {isExported ? 'ดาวน์โหลดสำเร็จ' : 'ส่งออก CSV'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Quick Glance Metrics Strip (Giant Telemetry Mono) ── */}
            {stats && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.625rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div className="tactile-stat-pill">
                  <span className="stat-label">ระดับล่าสุด</span>
                  <span
                    className="stat-val tabular-nums font-mono"
                    style={{ color: stats.current > 0 ? '#EF4444' : '#38BDF8', fontWeight: 900 }}
                  >
                    {stats.current >= 0 ? `+${stats.current.toFixed(2)}` : stats.current.toFixed(2)} ม.
                  </span>
                </div>
                <div className="tactile-stat-pill">
                  <span className="stat-label">ระดับสูงสุด</span>
                  <span
                    className="stat-val tabular-nums font-mono"
                    style={{ color: '#F87171', fontWeight: 800 }}
                  >
                    {stats.max >= 0 ? `+${stats.max.toFixed(2)}` : stats.max.toFixed(2)} ม.
                  </span>
                </div>
                <div className="tactile-stat-pill">
                  <span className="stat-label">ระดับต่ำสุด</span>
                  <span
                    className="stat-val tabular-nums font-mono"
                    style={{ color: '#34D399', fontWeight: 800 }}
                  >
                    {stats.min >= 0 ? `+${stats.min.toFixed(2)}` : stats.min.toFixed(2)} ม.
                  </span>
                </div>
                <div className="tactile-stat-pill">
                  <span className="stat-label">ช่วงแกว่งตัว</span>
                  <span className="stat-val tabular-nums font-mono" style={{ color: '#E2E8F0', fontWeight: 800 }}>
                    {stats.delta.toFixed(2)} ม.
                  </span>
                </div>
                <div className="tactile-stat-pill">
                  <span className="stat-label">แนวโน้มสุทธิ</span>
                  <span
                    className="stat-val tabular-nums font-mono"
                    style={{
                      color:
                        stats.direction === 'up'
                          ? '#EF4444'
                          : stats.direction === 'down'
                          ? '#10B981'
                          : '#94A3B8',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    {stats.direction === 'up' ? (
                      <TrendingUpIcon size={14} />
                    ) : stats.direction === 'down' ? (
                      <TrendingDownIcon size={14} />
                    ) : (
                      <MinusIcon size={14} />
                    )}
                    <span>{stats.netChange > 0 ? `+${stats.netChange}` : stats.netChange} ม.</span>
                  </span>
                </div>
                <div className="tactile-stat-pill">
                  <span className="stat-label">จุดตรวจวัด</span>
                  <span className="stat-val tabular-nums font-mono" style={{ color: '#94A3B8', fontWeight: 700 }}>
                    {stats.count} บันทึก
                  </span>
                </div>
              </div>
            )}

            {/* Chart Area */}
            {readingsLoading ? (
              <div style={{ height: 480, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                <SkeletonCard height="460px" />
              </div>
            ) : readingsError ? (
              <div
                style={{
                  height: 480,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444',
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
                          className="tactile-press"
                          style={{
                            color: '#38BDF8',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontWeight: 600,
                            padding: 0,
                          }}
                        >
                          "14 วัน"
                        </button>{' '}
                        เพื่อดูข้อมูลย้อนหลังที่มีในระบบ
                      </>
                    ) : (
                      'ลองปรับเปลี่ยนช่วงเวลาการแสดงผล หรือเลือกสถานีอื่น'
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', minWidth: 0, height: 480, position: 'relative' }}>
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
                  <div style={{ width: 24, height: 3, background: 'linear-gradient(90deg, #0284C7, #38BDF8)', borderRadius: 2 }} />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>ระดับน้ำจริง</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                  <div style={{ width: 20, height: 2, borderTop: '2px solid rgba(56, 189, 248, 0.8)' }} />
                  <span style={{ color: '#38BDF8' }}>
                    {selectedStation.referencePointName || 'จุดอ้างอิง'} (0.00 ม.)
                  </span>
                </div>
                {/* Warning Level */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                  <div style={{ width: 22, height: 2, borderTop: '2px dashed #F59E0B' }} />
                  <span style={{ color: '#F59E0B', fontWeight: 600 }}>
                    เกณฑ์เฝ้าระวัง ({((selectedStation.warningLevel ?? (selectedStation as any).warning_level ?? -0.5) >= 0 ? '+' : '')}{Number(selectedStation.warningLevel ?? (selectedStation as any).warning_level ?? -0.5).toFixed(2)} ม.)
                  </span>
                </div>
                {/* Critical Level */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                  <div style={{ width: 22, height: 2, borderTop: '2px dashed #EF4444' }} />
                  <span style={{ color: '#EF4444', fontWeight: 600 }}>
                    เกณฑ์วิกฤต ({((selectedStation.criticalLevel ?? (selectedStation as any).critical_level ?? 0.0) >= 0 ? '+' : '')}{Number(selectedStation.criticalLevel ?? (selectedStation as any).critical_level ?? 0.0).toFixed(2)} ม.)
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

            {/* ════════ OUTAGE TIMELINE CARD (IF GAPS DETECTED) ════════ */}
            {detectedOutages.length > 0 && (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '0.75rem',
                  background: 'var(--card-surface, #0C0E12)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#F59E0B',
                      }}
                    >
                      <AlertTriangleIcon size={14} />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F1F5F9' }}>
                      ประวัติช่วงเวลาโหนดออฟไลน์ ({detectedOutages.length} ครั้งในช่วงเวลานี้)
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#FBBF24',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    ตัดเส้นกราฟตามเวลาจริง
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {detectedOutages.map((outage) => {
                    const startD = new Date(outage.startTime);
                    const endD = new Date(outage.endTime);
                    const isBatt = outage.reason === 'battery_depleted';

                    return (
                      <div
                        key={outage.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                          padding: '0.625rem 0.875rem',
                          borderRadius: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: isBatt ? '#EF4444' : '#F59E0B',
                            }}
                          />
                          <span style={{ color: '#E2E8F0', fontWeight: 600, fontFamily: 'monospace' }}>
                            {format(startD, 'dd/MM HH:mm')} - {format(endD, 'HH:mm น.')}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            (ออฟไลน์ {outage.formattedDuration})
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {isBatt ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#F87171' }}>
                              <BatteryChargingIcon size={14} />
                              <span>{outage.reasonText}</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94A3B8' }}>
                              <RadioIcon size={14} />
                              <span>{outage.reasonText}</span>
                            </div>
                          )}

                          {outage.endBattery?.percent != null && outage.endBattery.percent > 20 && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: '#10B981',
                                background: 'rgba(16, 185, 129, 0.12)',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '0.25rem',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                              }}
                            >
                              ชาร์จฟื้นตัว {outage.endBattery.percent}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ════════ RIGHT COLUMN: STATION SELECTOR WITH LIVE MINI-METRICS (Desktop > 1024px only) ════════ */}
          <div className="chart-desktop-station-column" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
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
                <RadioIcon size={16} style={{ color: '#38BDF8' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF' }}>
                  สถานีตรวจวัด ({stations.length})
                </span>
              </div>
            </div>

            {/* List of Interactive Station Cards */}
            {stations.map((s) => {
              const isSelected = s.id === selectedStationId;
              const sColor = statusColor[s.status] || '#10B981';

              const battPct = s.batteryPercent ?? 100;
              const battColor = battPct > 50 ? '#10B981' : battPct > 20 ? '#F59E0B' : '#EF4444';

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStationId(s.id)}
                  className="tactile-press"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '1rem 1.125rem',
                    borderRadius: '1rem',
                    border: isSelected
                      ? '2px solid #0284C7'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.2) 0%, #15181E 100%)'
                      : 'var(--card-surface, #0C0E12)',
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
                      e.currentTarget.style.background = '#15181E';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.background = 'var(--card-surface, #0C0E12)';
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
                        background: '#0284C7',
                      }}
                    />
                  )}

                  {/* Station Code & Active Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
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
                        className="tabular-nums font-mono"
                        style={{
                          fontWeight: 800,
                          fontSize: '0.8125rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '0.375rem',
                          background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#38BDF8' : 'var(--text-primary)',
                        }}
                      >
                        {s.id}
                      </span>
                    </div>

                    {isSelected && (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          background: 'rgba(56, 189, 248, 0.15)',
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

                  {/* Station Name & Location */}
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
                      background: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <DropletsIcon size={14} style={{ color: isSelected ? '#38BDF8' : 'var(--text-secondary)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ระดับน้ำ</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                      <strong
                        className="tabular-nums font-mono"
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 800,
                          color: isSelected ? '#38BDF8' : s.currentLevel > 0 ? '#EF4444' : '#10B981',
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
                      <span className="tabular-nums font-mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: battColor }}>
                        {battPct}%
                      </span>
                      <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, Math.max(0, battPct))}%`, height: '100%', background: battColor, borderRadius: 2 }} />
                      </div>
                    </div>

                    {/* Temp */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <ThermometerIcon size={11} style={{ color: '#F97316' }} /> อุณหภูมิ
                      </span>
                      <span className="tabular-nums font-mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F97316' }}>
                        {s.temperature !== undefined ? `${s.temperature.toFixed(1)}°` : '—'}
                      </span>
                    </div>

                    {/* Humidity */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <DropletsIcon size={11} style={{ color: '#06B6D4' }} /> ความชื้น
                      </span>
                      <span className="tabular-nums font-mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#06B6D4' }}>
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
        <div className="empty-state card" style={{ textAlign: 'center', padding: '50px 20px', marginTop: '1.5rem', background: 'var(--card-surface, #0C0E12)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16 }}>
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <WavesIcon size={48} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="empty-state-title" style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>ไม่มีสถานีที่ลงทะเบียน</p>
          <p className="empty-state-desc" style={{ fontSize: 13, color: 'var(--text-muted)' }}>ติดต่อเจ้าหน้าที่เพื่อขอเพิ่มสถานีติดตาม</p>
        </div>
      )}

      {/* ══ TACTICAL EXPORT SCOPE MODAL ══ */}
      {isExportModalOpen && (
        <div className="export-modal-backdrop" onClick={() => !exportLoading && setIsExportModalOpen(false)}>
          <div className="export-modal-panel" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                ส่งออก CSV
              </h3>
              <button
                type="button"
                className="btn btn-ghost tactile-press"
                style={{ padding: 4, color: 'var(--text-muted)' }}
                onClick={() => !exportLoading && setIsExportModalOpen(false)}
                disabled={exportLoading}
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Body: Options */}
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Option 1: Selected Station */}
              <label
                htmlFor="export-current-station"
                className={`export-option-card tactile-press ${exportScope === 'current_station' ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <input
                  id="export-current-station"
                  type="radio"
                  name="exportChartScope"
                  checked={exportScope === 'current_station'}
                  onChange={() => setExportScope('current_station')}
                />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    เฉพาะสถานีนี้ ({selectedStation?.name || selectedStationId})
                  </span>
                  <span className="tabular-nums font-mono" style={{ color: '#38BDF8', fontSize: 12 }}>
                    {readings.length} จุดตรวจวัด
                  </span>
                </div>
              </label>

              {/* Option 2: All Stations */}
              <label
                htmlFor="export-all-stations"
                className={`export-option-card tactile-press ${exportScope === 'all_stations' ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <input
                  id="export-all-stations"
                  type="radio"
                  name="exportChartScope"
                  checked={exportScope === 'all_stations'}
                  onChange={() => setExportScope('all_stations')}
                />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    ทุกสถานีในระบบ
                  </span>
                  <span className="tabular-nums font-mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {stations.length} สถานี
                  </span>
                </div>
              </label>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 18px', background: 'var(--card-surface, #0C0E12)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm tactile-press"
                onClick={() => setIsExportModalOpen(false)}
                disabled={exportLoading}
                style={{ fontSize: 12 }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm tactile-press"
                onClick={handleConfirmExport}
                disabled={exportLoading || (exportScope === 'current_station' && readings.length === 0)}
                style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {exportLoading ? (
                  <>
                    <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    <span>กำลังเตรียมข้อมูล...</span>
                  </>
                ) : (
                  <span>ดาวน์โหลด CSV</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
