import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StationModal from '../components/stations/StationModal';
import StationCalibrationModal from '../components/stations/StationCalibrationModal';
import StationNotificationModal from '../components/stations/StationNotificationModal';
import StationDeleteModal from '../components/stations/StationDeleteModal';
import type { Station, StationWithReading, WaterStatus } from '../types';
import {
  fetchStations,
  updateStation,
  createStation,
  updateStationCalibration,
  updateStationStatus,
  fetchNextStationId,
  deleteStation,
} from '../services/apiService';
import StationMap from '../components/map/StationMap';
import {
  LayoutGridIcon,
  MapIcon,
  PlusIcon,
  AlertTriangleIcon,
  Edit3Icon,
  Trash2Icon,
  SlidersIcon,
  BellIcon,
  MapPinIcon,
  RadioIcon,
  CompassIcon,
  BatteryChargingIcon,
  BatteryLowIcon,
  DropletsIcon,
} from '../components/ui/Icons';
import SegmentedControl from '../components/ui/SegmentedControl';
import ManagementBackBar from '../components/ui/ManagementBackBar';

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
    firmwareVersion: swr.firmware_version || undefined,
    stationType: swr.station_type || 'สถานีตรวจวัด',
  };
};

export default function StationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});

  // General Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editStation, setEditStation] = useState<Station | null>(null);

  // Calibration Modal State
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);
  const [calibratingStation, setCalibratingStation] = useState<Station | null>(null);

  // Notification Modal State
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [notifyingStation, setNotifyingStation] = useState<Station | null>(null);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingStation, setDeletingStation] = useState<Station | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'map'>('grid');

  // Direct Inline Status Toggle (Optimistic Update)
  const handleToggleOperatingStatus = async (station: Station, newStatus: 'active' | 'offline') => {
    if (statusUpdating[station.id]) return;
    const isTargetActive = newStatus === 'active';
    if (station.isActive === isTargetActive) return;

    // Optimistic update
    setStations((prev) =>
      prev.map((s) =>
        s.id === station.id ? { ...s, isActive: isTargetActive, operatingStatus: newStatus } : s
      )
    );
    setStatusUpdating((prev) => ({ ...prev, [station.id]: true }));

    try {
      await updateStationStatus(station.id, newStatus);
    } catch (err: any) {
      // Revert on failure
      setStations((prev) =>
        prev.map((s) =>
          s.id === station.id ? { ...s, isActive: station.isActive, operatingStatus: station.operatingStatus } : s
        )
      );
      alert(err.message || 'ไม่สามารถเปลี่ยนสถานะการให้บริการได้');
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [station.id]: false }));
    }
  };

  const loadStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStations();
      const mapped = data.map(mapStationWithReadingToStation);
      setStations(mapped);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถดึงข้อมูลสถานีได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'staff') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'staff') {
      loadStations();
      const handleGlobalRefresh = () => {
        loadStations();
      };
      window.addEventListener('app:refresh', handleGlobalRefresh);
      return () => {
        window.removeEventListener('app:refresh', handleGlobalRefresh);
      };
    }
  }, [user, loadStations]);

  if (user?.role !== 'admin' && user?.role !== 'staff') {
    return null;
  }

  const handleAdd = () => {
    setEditStation(null);
    setModalOpen(true);
  };

  const handleEdit = (s: Station) => {
    setEditStation(s);
    setModalOpen(true);
  };

  const handleCalibrate = (s: Station) => {
    setCalibratingStation(s);
    setCalibrationModalOpen(true);
  };

  const handleRequestDelete = (s: Station) => {
    setDeletingStation(s);
    setDeleteModalOpen(true);
  };

  const handleExecuteDelete = async (stationId: string) => {
    await deleteStation(stationId);
    setStations((prev) => prev.filter((s) => s.id !== stationId));
    window.dispatchEvent(new Event('app:refresh'));
    await loadStations();
  };

  const handleSave = async (data: Partial<Station> & { gateway_id?: string }) => {
    const targetStatus = data.operatingStatus || (data.isActive ? 'active' : 'offline');
    if (editStation) {
      await updateStation(editStation.id, {
        station_name: data.name,
        location_name: data.location,
        latitude: data.lat,
        longitude: data.lng,
        sensor_to_ref_distance: data.sensorToRefDistance,
        reference_point_name: data.referencePointName || 'จุดอ้างอิง',
        warning_level: data.warningLevel,
        critical_level: data.criticalLevel,
        max_level: data.maxLevel,
        tilt_offset_x: (data as any).tilt_offset_x ?? (data.tiltOffsetX != null ? Number(data.tiltOffsetX) : 0),
        tilt_offset_y: (data as any).tilt_offset_y ?? (data.tiltOffsetY != null ? Number(data.tiltOffsetY) : 0),
        status: targetStatus,
      });
      await updateStationStatus(editStation.id, targetStatus);
    } else {
      let stationId = data.deviceId?.trim();
      if (!stationId) {
        try {
          stationId = await fetchNextStationId();
        } catch {
          stationId = `ST-${Date.now().toString().slice(-4)}`;
        }
      }
      await createStation({
        station_id: stationId,
        gateway_id: data.gateway_id || 'GW-001',
        station_name: data.name,
        location_name: data.location,
        latitude: data.lat,
        longitude: data.lng,
        sensor_to_ref_distance: data.sensorToRefDistance || 2.0,
        reference_point_name: data.referencePointName || 'จุดอ้างอิง',
        warning_level: data.warningLevel,
        critical_level: data.criticalLevel,
        max_level: data.maxLevel || null,
        tilt_offset_x: (data as any).tilt_offset_x ?? (data.tiltOffsetX != null ? Number(data.tiltOffsetX) : 0),
        tilt_offset_y: (data as any).tilt_offset_y ?? (data.tiltOffsetY != null ? Number(data.tiltOffsetY) : 0),
        status: targetStatus,
      });
      window.dispatchEvent(new Event('app:refresh'));
    }
    await loadStations();
  };

  const handleSaveCalibration = async (calibrationData: any) => {
    if (!calibratingStation) return;
    await updateStationCalibration(calibratingStation.id, calibrationData);
    await loadStations();
  };

  return (
    <div className="page-container" style={{ maxWidth: 1440, margin: '0 auto', paddingBottom: '6rem' }}>
      {/* ── TOP MANAGEMENT BAR ── */}
      <ManagementBackBar
        title="จัดการสถานีตรวจวัด"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* View toggle (การ์ดสถานี / แผนที่) */}
            <SegmentedControl
              options={[
                { value: 'grid', label: 'การ์ดสถานี', icon: <LayoutGridIcon size={14} /> },
                { value: 'map', label: 'แผนที่', icon: <MapIcon size={14} /> },
              ]}
              value={view}
              onChange={(val) => setView(val as 'grid' | 'map')}
              size="sm"
              ariaLabel="สลับมุมมองสถานี"
            />

            {/* Global notification settings */}
            <button
              id="global-notification-btn"
              type="button"
              onClick={() => {
                setNotifyingStation(null);
                setNotificationModalOpen(true);
              }}
              style={{
                color: '#FFFFFF',
                backgroundColor: '#222222',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                height: 38,
                padding: '0 14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#333333')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#222222')}
              title="ตั้งค่าเกณฑ์การแจ้งเตือนส่วนกลาง"
            >
              <BellIcon size={15} />
              <span>เกณฑ์แจ้งเตือนส่วนกลาง</span>
            </button>

            {/* Add station button (Admin only) */}
            {isAdmin && (
              <button
                id="add-station-btn"
                type="button"
                onClick={handleAdd}
                style={{
                  color: '#FFFFFF',
                  backgroundColor: '#0284C7',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  height: 38,
                  padding: '0 16px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0369A1')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0284C7')}
              >
                <PlusIcon size={15} />
                <span>เพิ่มสถานี</span>
              </button>
            )}
          </div>
        }
      />

      {loading && (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: '#94A3B8' }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid rgba(56, 189, 248, 0.2)',
              borderTopColor: '#38BDF8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 14px',
            }}
          />
          <div style={{ fontSize: 13, fontFamily: 'monospace' }}>กำลังโหลดข้อมูลสถานี...</div>
        </div>
      )}

      {error && (
        <div
          style={{
            margin: '0 0 24px 0',
            padding: '14px 18px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 10,
            color: '#F87171',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertTriangleIcon size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* ── MAIN CONTENT (NO DUPLICATION) ── */}
      {!loading && !error && (
        <>
          {view === 'grid' ? (
            /* ─────────────────────────────────────────────────────────────
               TACTICAL STATION COCKPIT GRID
               1 col on mobile, 2 cols on tablet/laptop, 3 cols on wide screens
               ───────────────────────────────────────────────────────────── */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))',
                gap: 18,
              }}
            >
              {stations.map((s) => {
                const refName = s.referencePointName || 'จุดอ้างอิง';
                const level = s.currentLevel;
                const levelFormatted = level >= 0 ? `+${level.toFixed(2)}` : level.toFixed(2);
                const isUpdating = statusUpdating[s.id];

                // Progress math for water level gauge
                const maxRange = Math.max(Math.abs(s.sensorToRefDistance || 2.0), 3.0);
                const gaugePct = Math.max(
                  0,
                  Math.min(100, (((level + maxRange / 2) / maxRange) * 100))
                );

                const warnLevel = s.warningLevel ?? -0.5;
                const critLevel = s.criticalLevel ?? 0.0;
                const warnPct = Math.max(0, Math.min(100, (((warnLevel + maxRange / 2) / maxRange) * 100)));
                const critPct = Math.max(0, Math.min(100, (((critLevel + maxRange / 2) / maxRange) * 100)));

                return (
                  <div
                    key={s.id}
                    style={{
                      background: 'linear-gradient(180deg, #0F172A 0%, #0B131B 100%)',
                      border: s.isActive ? '1px solid rgba(56, 189, 248, 0.18)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 16,
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    }}
                  >
                    {/* Top Corner Decorative Station Accent Bar */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: !s.isActive
                          ? '#475569'
                          : s.status === 'critical'
                          ? '#EF4444'
                          : s.status === 'warning'
                          ? '#F59E0B'
                          : '#0EA5E9',
                      }}
                    />

                    {/* ── 1. STATION HEADER ── */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            className="tabular-nums font-mono"
                            style={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: s.isActive ? 'rgba(56, 189, 248, 0.12)' : 'rgba(148, 163, 184, 0.1)',
                              border: s.isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)',
                              color: s.isActive ? '#38BDF8' : '#94A3B8',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {s.deviceId}
                          </span>
                          <h2
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              color: '#F8FAFC',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {s.name}
                          </h2>
                        </div>

                        {/* Location Subtext */}
                        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <MapPinIcon size={13} style={{ color: '#64748B', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.location || `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`}
                          </span>
                        </div>
                      </div>

                      {/* Station Water Status Badge */}
                      <div style={{ flexShrink: 0 }}>
                        {s.isActive ? (
                          <span className={`badge ${statusClass[s.status]}`} style={{ fontSize: 11.5, padding: '3px 10px' }}>
                            <span className="badge-dot" style={{ width: 6, height: 6 }} />
                            {statusLabel[s.status]}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 9px',
                              borderRadius: 6,
                              background: 'rgba(148, 163, 184, 0.1)',
                              border: '1px solid rgba(148, 163, 184, 0.2)',
                              color: '#94A3B8',
                              fontSize: 11.5,
                              fontWeight: 500,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748B' }} />
                            <span>ออฟไลน์</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── 2. WATER LEVEL GAUGE & METRIC COCKPIT ── */}
                    <div
                      style={{
                        background: '#090E17',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 12,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      {/* Readout Header */}
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>ระดับน้ำเทียบ{refName}</div>
                          {s.isActive ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                              <span
                                className="tabular-nums font-mono"
                                style={{
                                  fontSize: 26,
                                  fontWeight: 800,
                                  color: level >= 0 ? '#F87171' : '#34D399',
                                  letterSpacing: '-0.02em',
                                }}
                              >
                                {levelFormatted}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8' }}>เมตร</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#64748B', marginTop: 2 }}>-</div>
                          )}
                        </div>

                        {/* Reference Datum Chip */}
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              color: '#38BDF8',
                              fontWeight: 700,
                            }}
                          >
                            {refName}
                          </span>
                          <div className="tabular-nums font-mono" style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                            ระยะติดตั้ง {s.sensorToRefDistance?.toFixed(2) ?? '2.00'} ม.
                          </div>
                        </div>
                      </div>

                      {/* Visual Water Depth Progress Track */}
                      <div style={{ position: 'relative', marginTop: 4 }}>
                        <div
                          style={{
                            height: 10,
                            borderRadius: 999,
                            background: '#1E293B',
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: s.isActive ? `${gaugePct}%` : '0%',
                              background:
                                s.status === 'critical'
                                  ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                                  : s.status === 'warning'
                                  ? 'linear-gradient(90deg, #10B981, #F59E0B)'
                                  : 'linear-gradient(90deg, #0284C7, #38BDF8)',
                              transition: 'width 0.4s ease',
                              borderRadius: 999,
                            }}
                          />
                        </div>

                        {/* Warning Marker Line */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${warnPct}%`,
                            top: -2,
                            bottom: -2,
                            width: 2,
                            background: '#F59E0B',
                            borderRadius: 1,
                          }}
                          title={`เกณฑ์เฝ้าระวัง ${warnLevel.toFixed(2)} ม.`}
                        />

                        {/* Critical Marker Line */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${critPct}%`,
                            top: -2,
                            bottom: -2,
                            width: 2,
                            background: '#EF4444',
                            borderRadius: 1,
                          }}
                          title={`เกณฑ์วิกฤต ${critLevel.toFixed(2)} ม.`}
                        />
                      </div>
                    </div>

                    {/* ── 3. FOUR HARDWARE TELEMETRY PODS ── */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 8,
                      }}
                    >
                      {/* Pod 1: Ultrasonic Distance */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: 10,
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ fontSize: 10.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          <DropletsIcon size={12} style={{ color: '#38BDF8' }} />
                          <span>ระยะเซนเซอร์วัดได้</span>
                        </div>
                        {s.isActive && s.rawDistance !== null && s.rawDistance !== undefined ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="tabular-nums font-mono" style={{ fontSize: 13.5, fontWeight: 700, color: '#F1F5F9' }}>
                              {s.rawDistance.toFixed(3)}
                            </span>
                            <span style={{ fontSize: 11, color: '#64748B' }}>ม.</span>
                            {s.isBlindZone && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  color: '#EF4444',
                                  padding: '1px 4px',
                                  borderRadius: 4,
                                  background: 'rgba(239, 68, 68, 0.15)',
                                }}
                              >
                                Blind
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, color: '#64748B' }}>-</span>
                        )}
                      </div>

                      {/* Pod 2: Pole Tilt (ADXL345) */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: 10,
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ fontSize: 10.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          <CompassIcon size={12} style={{ color: '#38BDF8' }} />
                          <span>ความเอียงเสา</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="tabular-nums font-mono" style={{ fontSize: 13.5, fontWeight: 700, color: s.isPoleTilted ? '#EF4444' : '#F1F5F9' }}>
                            {s.relativeTotalTilt != null ? `${s.relativeTotalTilt.toFixed(1)}°` : '0.0°'}
                          </span>
                          {s.isPoleTilted && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#EF4444' }}>เอียง</span>
                          )}
                        </div>
                      </div>

                      {/* Pod 3: Battery Level */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: 10,
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ fontSize: 10.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          {s.batteryPercent != null && s.batteryPercent < 20 ? (
                            <BatteryLowIcon size={12} style={{ color: '#EF4444' }} />
                          ) : (
                            <BatteryChargingIcon size={12} style={{ color: '#10B981' }} />
                          )}
                          <span>แบตเตอรี่</span>
                        </div>
                        <div className="tabular-nums font-mono" style={{ fontSize: 13.5, fontWeight: 700, color: '#F1F5F9' }}>
                          {s.batteryPercent != null ? `${s.batteryPercent}%` : '100%'}
                        </div>
                      </div>

                      {/* Pod 4: Gateway & LoRa Signal */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: 10,
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ fontSize: 10.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          <RadioIcon size={12} style={{ color: '#A855F7' }} />
                          <span>เกตเวย์</span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#CBD5E1',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {s.gatewayName || 'Gateway_01'}
                        </div>
                      </div>
                    </div>

                    {/* ── 4. TACTICAL CONTROL DOCK (SPLIT DOCK: SWITCH + 36PX BUTTONS) ── */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                        paddingTop: 12,
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      {/* Left: Prominent 36px Operating Status Switch */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: '#090E17',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 999,
                          padding: 3,
                          gap: 3,
                          height: 36,
                          boxSizing: 'border-box',
                        }}
                      >
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggleOperatingStatus(s, 'active')}
                          style={{
                            height: 28,
                            padding: '0 12px',
                            borderRadius: 999,
                            border: 'none',
                            background: s.isActive ? 'rgba(16, 185, 129, 0.22)' : 'transparent',
                            color: s.isActive ? '#10B981' : '#64748B',
                            fontSize: 12,
                            fontWeight: s.isActive ? 700 : 500,
                            cursor: isUpdating ? 'wait' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            transition: 'all 0.15s ease',
                          }}
                          title="เปิดให้บริการออนไลน์"
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.isActive ? '#10B981' : '#475569' }} />
                          <span>ออนไลน์</span>
                        </button>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggleOperatingStatus(s, 'offline')}
                          style={{
                            height: 28,
                            padding: '0 12px',
                            borderRadius: 999,
                            border: 'none',
                            background: !s.isActive ? 'rgba(245, 158, 11, 0.22)' : 'transparent',
                            color: !s.isActive ? '#F59E0B' : '#64748B',
                            fontSize: 12,
                            fontWeight: !s.isActive ? 700 : 500,
                            cursor: isUpdating ? 'wait' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            transition: 'all 0.15s ease',
                          }}
                          title="ปิดบริการชั่วคราว"
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: !s.isActive ? '#F59E0B' : '#475569' }} />
                          <span>ออฟไลน์</span>
                        </button>
                      </div>

                      {/* Right: Tactile 36px Action Buttons */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {/* Button 1: จุดอ้างอิง */}
                        <button
                          type="button"
                          onClick={() => handleCalibrate(s)}
                          style={{
                            height: 36,
                            padding: '0 12px',
                            fontSize: 12.5,
                            fontWeight: 600,
                            borderRadius: 8,
                            background: '#1E293B',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#38BDF8',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
                          title="ตั้งค่าจุดอ้างอิงและระนาบเสา"
                        >
                          <SlidersIcon size={14} />
                          <span>จุดอ้างอิง</span>
                        </button>

                        {/* Button 2: เตือนภัย */}
                        <button
                          type="button"
                          onClick={() => {
                            setNotifyingStation(s);
                            setNotificationModalOpen(true);
                          }}
                          style={{
                            height: 36,
                            padding: '0 12px',
                            fontSize: 12.5,
                            fontWeight: 600,
                            borderRadius: 8,
                            background: '#1E293B',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#E2E8F0',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
                          title="ตั้งค่าเกณฑ์การแจ้งเตือนสำหรับสถานีนี้"
                        >
                          <BellIcon size={14} />
                          <span>เตือนภัย</span>
                        </button>

                        {/* Button 3: แก้ไขข้อมูล */}
                        <button
                          type="button"
                          onClick={() => handleEdit(s)}
                          style={{
                            height: 36,
                            width: 36,
                            padding: 0,
                            borderRadius: 8,
                            background: '#1E293B',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
                          aria-label={`แก้ไขสถานี ${s.name}`}
                          title="แก้ไขข้อมูลสถานี"
                        >
                          <Edit3Icon size={15} />
                        </button>

                        {/* Button 4: ลบสถานี (Admin only) */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRequestDelete(s)}
                            style={{
                              height: 36,
                              width: 36,
                              padding: 0,
                              borderRadius: 8,
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              color: '#EF4444',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)')}
                            aria-label={`ลบสถานี ${s.name}`}
                            title="ลบสถานี"
                          >
                            <Trash2Icon size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               MAP VIEW
               ───────────────────────────────────────────────────────────── */
            <div
              className="card"
              style={{
                padding: 0,
                overflow: 'hidden',
                background: '#0B131B',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
              }}
            >
              <StationMap
                stations={stations}
                selectedStation={selectedId}
                onSelectStation={setSelectedId}
                height="620px"
              />
            </div>
          )}
        </>
      )}

      {/* General Station Edit / Add Modal */}
      <StationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        station={editStation}
      />

      {/* Dedicated Physical Reference Point Calibration Modal */}
      <StationCalibrationModal
        isOpen={calibrationModalOpen}
        onClose={() => setCalibrationModalOpen(false)}
        station={calibratingStation}
        onSave={handleSaveCalibration}
      />

      {/* Dedicated Notification Settings Modal for Station or Global */}
      <StationNotificationModal
        isOpen={notificationModalOpen}
        onClose={() => setNotificationModalOpen(false)}
        station={notifyingStation}
      />

      {/* Dedicated Delete Confirmation Modal */}
      <StationDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingStation(null);
        }}
        station={deletingStation}
        onConfirm={handleExecuteDelete}
      />
    </div>
  );
}
