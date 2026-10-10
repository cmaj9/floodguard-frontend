import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StationModal from '../components/stations/StationModal';
import StationCalibrationModal from '../components/stations/StationCalibrationModal';
import StationNotificationModal from '../components/stations/StationNotificationModal';
import StationDeleteModal from '../components/stations/StationDeleteModal';
import StationStatusConfirmModal from '../components/stations/StationStatusConfirmModal';
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
  ExternalLinkIcon,
  SearchIcon,
  XIcon,
  WavesIcon,
} from '../components/ui/Icons';
import ManagementBackBar from '../components/ui/ManagementBackBar';
import { Button } from '../components/ui/Button';

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

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical' | 'offline'>('all');
  const [sortBy, setSortBy] = useState<'id' | 'level' | 'updated'>('id');

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

  // Status Change Confirmation Modal State
  const [statusConfirmModalOpen, setStatusConfirmModalOpen] = useState(false);
  const [statusConfirmStation, setStatusConfirmStation] = useState<Station | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<'active' | 'offline'>('offline');

  // Trigger Confirmation Modal for Operating Status Change
  const handleRequestStatusToggle = (station: Station, newStatus: 'active' | 'offline') => {
    const isTargetActive = newStatus === 'active';
    if (station.isActive === isTargetActive) return;
    setStatusConfirmStation(station);
    setStatusConfirmTarget(newStatus);
    setStatusConfirmModalOpen(true);
  };

  // Execute Status Toggle after Confirmation
  const handleExecuteStatusToggle = async () => {
    if (!statusConfirmStation) return;
    const stationId = statusConfirmStation.id;
    const targetStatus = statusConfirmTarget;
    const isTargetActive = targetStatus === 'active';

    setStatusUpdating((prev) => ({ ...prev, [stationId]: true }));
    try {
      await updateStationStatus(stationId, targetStatus);
      setStations((prev) =>
        prev.map((s) =>
          s.id === stationId ? { ...s, isActive: isTargetActive, operatingStatus: targetStatus } : s
        )
      );
      window.dispatchEvent(new Event('app:refresh'));
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถเปลี่ยนสถานะการให้บริการได้');
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [stationId]: false }));
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

  // Fleet Statistics for Briefing & Delight
  const stats = useMemo(() => {
    const total = stations.length;
    const active = stations.filter((s) => s.isActive).length;
    const offline = total - active;
    const normal = stations.filter((s) => s.isActive && s.status === 'normal').length;
    const warning = stations.filter((s) => s.isActive && s.status === 'warning').length;
    const critical = stations.filter((s) => s.isActive && s.status === 'critical').length;
    return { total, active, offline, normal, warning, critical };
  }, [stations]);

  // Filtered & Sorted Stations List
  const filteredStations = useMemo(() => {
    return stations
      .filter((s) => {
        // Status filter
        if (filterStatus === 'offline') {
          if (s.isActive) return false;
        } else if (filterStatus !== 'all') {
          if (!s.isActive || s.status !== filterStatus) return false;
        }

        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          s.id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (s.location && s.location.toLowerCase().includes(q)) ||
          (s.gatewayName && s.gatewayName.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'level') {
          return (b.currentLevel ?? -999) - (a.currentLevel ?? -999);
        }
        if (sortBy === 'updated') {
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        }
        return a.id.localeCompare(b.id);
      });
  }, [stations, filterStatus, searchQuery, sortBy]);

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
            <div className="btn-3d-toggle-group" role="tablist" aria-label="สลับมุมมองสถานี">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'grid'}
                className={`btn-3d-toggle tactile-press ${view === 'grid' ? 'active' : ''}`}
                onClick={() => setView('grid')}
                title="มุมมองการ์ดสถานี"
              >
                <LayoutGridIcon size={14} />
                <span>การ์ดสถานี</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'map'}
                className={`btn-3d-toggle tactile-press ${view === 'map' ? 'active' : ''}`}
                onClick={() => setView('map')}
                title="มุมมองแผนที่"
              >
                <MapIcon size={14} />
                <span>แผนที่</span>
              </button>
            </div>

            {/* Global notification settings */}
            <button
              id="global-notification-btn"
              type="button"
              className="btn-3d-dark tactile-press"
              onClick={() => {
                setNotifyingStation(null);
                setNotificationModalOpen(true);
              }}
              title="ตั้งค่าเกณฑ์การแจ้งเตือนส่วนกลาง"
            >
              <BellIcon size={15} />
              <span>เกณฑ์แจ้งเตือนส่วนกลาง</span>
            </button>

            {/* Add station button (Admin only) · The Rarity Rule (Pastel Pink Jewel) */}
            {isAdmin && (
              <Button
                id="add-station-btn"
                variant="jewel-pink"
                className="tactile-press"
                onClick={handleAdd}
                leftIcon={<PlusIcon size={15} />}
                title="เพิ่มสถานีตรวจวัดใหม่"
              >
                เพิ่มสถานี
              </Button>
            )}
          </div>
        }
      />

      {/* ── 1. FLEET SITUATIONAL TELEMETRY COCKPIT STRIP (DELIGHT AXIS) ── */}
      <div
        style={{
          background: 'var(--card-surface, #0C0E12)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 14,
          padding: '14px 18px',
          margin: '16px 0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Left: Summary Insight */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: stats.critical > 0 ? '#EF4444' : stats.warning > 0 ? '#F59E0B' : '#10B981',
              flexShrink: 0,
            }}
            className="heartbeat-dot"
          />
          <span style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 600 }}>
            {stats.critical > 0
              ? `ตรวจพบ ${stats.critical} สถานีในเกณฑ์วิกฤต โปรดติดตามสถานการณ์อย่างใกล้ชิด`
              : stats.warning > 0
              ? `มี ${stats.warning} สถานีอยู่ในเกณฑ์เฝ้าระวัง อัตราการไหลของน้ำยังปกติ`
              : `สถานีตรวจวัดทั้งหมด ${stats.total} สถานี พร้อมใช้งานและออนไลน์ ${stats.active} สถานี`}
          </span>
        </div>

        {/* Right: Quick Telemetry Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className="tactile-press"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: filterStatus === 'all' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: filterStatus === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: filterStatus === 'all' ? '#38BDF8' : '#94A3B8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ทั้งหมด {stats.total}
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('normal')}
            className="tactile-press"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: filterStatus === 'normal' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: filterStatus === 'normal' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: filterStatus === 'normal' ? '#10B981' : '#94A3B8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            <span>ปกติ {stats.normal}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('warning')}
            className="tactile-press"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: filterStatus === 'warning' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: filterStatus === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: filterStatus === 'warning' ? '#F59E0B' : '#94A3B8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
            <span>เฝ้าระวัง {stats.warning}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('critical')}
            className="tactile-press"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: filterStatus === 'critical' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: filterStatus === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: filterStatus === 'critical' ? '#EF4444' : '#94A3B8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
            <span>วิกฤต {stats.critical}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('offline')}
            className="tactile-press"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: filterStatus === 'offline' ? '1px solid rgba(148, 163, 184, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: filterStatus === 'offline' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: filterStatus === 'offline' ? '#CBD5E1' : '#64748B',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748B' }} />
            <span>ออฟไลน์ {stats.offline}</span>
          </button>
        </div>
      </div>

      {/* ── 2. SEARCH & CONTROLS DOCK ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* Search input with Tactical Glass */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 440 }}>
          <SearchIcon
            size={15}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748B',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามรหัส, ชื่อสถานี, ตำแหน่ง หรือเกตเวย์..."
            className="input"
            style={{
              paddingLeft: 36,
              paddingRight: searchQuery ? 36 : 14,
              height: 38,
              fontSize: 13,
              background: '#0C0E12',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 10,
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="tactile-press"
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="ล้างคำค้นหา"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        {/* Sort selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>เรียงลำดับ</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input"
            style={{
              height: 38,
              padding: '0 12px',
              fontSize: 12.5,
              background: '#0C0E12',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 10,
              color: '#F8FAFC',
              cursor: 'pointer',
            }}
          >
            <option value="id">ตามรหัสสถานี (ST-01, ST-02)</option>
            <option value="level">ระดับน้ำสูงสุดก่อน</option>
            <option value="updated">อัปเดตล่าสุด</option>
          </select>
        </div>
      </div>

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

      {/* ── 3. MAIN CONTENT (GRID VS MAP) ── */}
      {!loading && !error && (
        <>
          {view === 'grid' ? (
            filteredStations.length === 0 ? (
              /* Empty Search / Filter State */
              <div
                style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  background: 'var(--card-surface, #0C0E12)',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: 16,
                }}
              >
                <WavesIcon size={36} style={{ color: '#64748B', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                  ไม่พบสถานีที่ตรงกับเงื่อนไขการค้นหา
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                  ลองปรับเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะเป็น "ทั้งหมด"
                </div>
                {(searchQuery || filterStatus !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                    }}
                    className="btn btn-secondary btn-sm tactile-press"
                    style={{ marginTop: 16 }}
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                )}
              </div>
            ) : (
              /* ── TACTICAL STATION COCKPIT GRID ── */
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))',
                  gap: 18,
                }}
              >
                {filteredStations.map((s) => {
                  const refName = s.referencePointName || 'จุดอ้างอิง';
                  const level = s.currentLevel;
                  const isUpdating = statusUpdating[s.id];

                  // Progress math for water level gauge
                  const sToRef = s.sensorToRefDistance ?? 2.0;
                  const warnLevel = s.warningLevel ?? -0.5;
                  const critLevel = s.criticalLevel ?? 0.0;
                  const rawDist = s.rawDistance ?? Number((sToRef - level).toFixed(3));

                  const minExpected = -Math.max(1.5, sToRef * 0.85);
                  const maxExpected = Math.max(0.8, critLevel + 0.6);
                  const span = maxExpected - minExpected;
                  const currentRatio = Math.max(0.04, Math.min(0.98, (level - minExpected) / (span || 1)));
                  const gaugePct = Math.round(currentRatio * 100);
                  const datumPct = Math.max(12, Math.min(88, Math.round(((0 - minExpected) / (span || 1)) * 100)));
                  const warnPct = Math.max(15, Math.min(94, Math.round(((warnLevel - minExpected) / (span || 1)) * 100)));
                  const critPct = Math.max(18, Math.min(96, Math.round(((critLevel - minExpected) / (span || 1)) * 100)));

                  return (
                    <div
                      key={s.id}
                      className="tactical-station-card"
                      onClick={() => navigate(`/stations/${s.id}`)}
                      title="คลิกเพื่อดูข้อมูลเชิงลึกและกราฟเซนเซอร์"
                      style={{
                        background: 'var(--card-surface, #0C0E12)',
                        border: s.isActive ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 16,
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Top Accent Strip */}
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

                      {/* ── CARD HEADER ── */}
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
                            <ExternalLinkIcon
                              size={14}
                              className="station-card-explore-icon"
                              style={{ color: '#64748B', flexShrink: 0 }}
                            />
                          </div>

                          {/* Location Subtext */}
                          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <MapPinIcon size={13} style={{ color: '#64748B', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.location || `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
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

                      {/* ── WATER LEVEL COCKPIT POD (32PX MONO + GAUGE) ── */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
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
                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
                              ระดับน้ำเทียบ{refName}
                            </div>
                            {s.isActive ? (
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                                <span
                                  className="tabular-nums font-mono"
                                  style={{
                                    fontSize: 32,
                                    fontWeight: 900,
                                    color:
                                      s.status === 'critical'
                                        ? '#EF4444'
                                        : s.status === 'warning'
                                        ? '#F59E0B'
                                        : '#10B981',
                                    letterSpacing: '-0.03em',
                                    lineHeight: 1,
                                  }}
                                >
                                  {level >= 0 ? `+${level.toFixed(2)}` : level.toFixed(2)}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8' }}>เมตร</span>
                              </div>
                            ) : (
                              <div style={{ fontSize: 24, fontWeight: 700, color: '#64748B', marginTop: 2 }}>-</div>
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
                              ระยะติดตั้ง {sToRef.toFixed(2)} ม.
                            </div>
                          </div>
                        </div>

                        {/* Hydro-Tactical Water Depth Gauge */}
                        <div style={{ position: 'relative', marginTop: 2 }}>
                          <div
                            style={{
                              height: 12,
                              borderRadius: 999,
                              background: 'rgba(255, 255, 255, 0.08)',
                              overflow: 'hidden',
                              position: 'relative',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: '100%',
                                transform: `scaleX(${s.isActive ? gaugePct / 100 : 0})`,
                                transformOrigin: 'left',
                                background:
                                  s.status === 'critical'
                                    ? 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)'
                                    : s.status === 'warning'
                                    ? 'linear-gradient(90deg, #0284C7 0%, #F59E0B 100%)'
                                    : 'linear-gradient(90deg, #0284C7 0%, #38BDF8 60%, #10B981 100%)',
                                transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                                borderRadius: 999,
                              }}
                            />
                          </div>

                          {/* Datum Marker (0.00m) */}
                          <div
                            style={{
                              position: 'absolute',
                              left: `${datumPct}%`,
                              top: -2,
                              bottom: -2,
                              width: 2,
                              background: 'rgba(255, 255, 255, 0.8)',
                              borderRadius: 1,
                              zIndex: 2,
                            }}
                            title={`จุดอ้างอิง 0.00 ม. (${refName})`}
                          />

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
                              zIndex: 2,
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
                              zIndex: 2,
                            }}
                            title={`เกณฑ์วิกฤต ${critLevel.toFixed(2)} ม.`}
                          />
                        </div>
                      </div>

                      {/* ── 4 HARDWARE TELEMETRY PODS ── */}
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
                          {s.isActive ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span className="tabular-nums font-mono" style={{ fontSize: 13.5, fontWeight: 700, color: '#F1F5F9' }}>
                                {rawDist.toFixed(3)}
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
                          <div className="tabular-nums font-mono" style={{ fontSize: 13.5, fontWeight: 700, color: s.batteryPercent != null && s.batteryPercent < 20 ? '#EF4444' : '#F1F5F9' }}>
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

                      {/* ── TACTICAL CONTROL DOCK (SWITCH + ACTION BUTTONS) ── */}
                      <div
                        onClick={(e) => e.stopPropagation()}
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
                        {/* Operating Status Switch */}
                        {/* Status Switch (6px Segmented Switch) */}
                        <div className="status-switch-bar">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleRequestStatusToggle(s, 'active')}
                            className={`status-switch-btn tactile-press ${s.isActive ? 'active-online' : ''}`}
                            title="เปิดให้บริการออนไลน์"
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.isActive ? '#10B981' : '#475569' }} />
                            <span>ออนไลน์</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleRequestStatusToggle(s, 'offline')}
                            className={`status-switch-btn tactile-press ${!s.isActive ? 'active-offline' : ''}`}
                            title="ปิดบริการชั่วคราว"
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: !s.isActive ? '#F59E0B' : '#475569' }} />
                            <span>ออฟไลน์</span>
                          </button>
                        </div>

                        {/* Action Buttons: Compact Text Badges */}
                        <div className="badge-action-cluster">
                          {/* จุดอ้างอิง */}
                          <button
                            type="button"
                            onClick={() => handleCalibrate(s)}
                            className="btn-badge-action calibrate tactile-press"
                            title="ตั้งค่าจุดอ้างอิงและระนาบเสา"
                          >
                            <SlidersIcon size={13} />
                            <span>จุดอ้างอิง</span>
                          </button>

                          {/* เตือนภัย */}
                          <button
                            type="button"
                            onClick={() => {
                              setNotifyingStation(s);
                              setNotificationModalOpen(true);
                            }}
                            className="btn-badge-action alert tactile-press"
                            title="ตั้งค่าเกณฑ์การแจ้งเตือนสำหรับสถานีนี้"
                          >
                            <BellIcon size={13} />
                            <span>เตือนภัย</span>
                          </button>

                          {/* แก้ไขข้อมูล */}
                          <button
                            type="button"
                            onClick={() => handleEdit(s)}
                            className="btn-badge-action tactile-press"
                            aria-label={`แก้ไขสถานี ${s.name}`}
                            title="แก้ไขข้อมูลสถานี"
                          >
                            <Edit3Icon size={13} />
                            <span>แก้ไข</span>
                          </button>

                          {/* ลบสถานี (Admin only) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRequestDelete(s)}
                              className="btn-badge-action danger tactile-press"
                              aria-label={`ลบสถานี ${s.name}`}
                              title="ลบสถานี"
                            >
                              <Trash2Icon size={13} />
                              <span>ลบ</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* ── MAP VIEW ── */
            <div
              className="card"
              style={{
                padding: 0,
                overflow: 'hidden',
                background: 'var(--card-surface, #0C0E12)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
              }}
            >
              <StationMap
                stations={filteredStations}
                selectedStation={selectedId}
                onSelectStation={setSelectedId}
                height="640px"
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

      {/* Dedicated Operating Status Change Confirmation Modal */}
      {statusConfirmModalOpen && (
        <StationStatusConfirmModal
          isOpen={statusConfirmModalOpen}
          onClose={() => {
            setStatusConfirmModalOpen(false);
            setStatusConfirmStation(null);
          }}
          station={statusConfirmStation}
          targetStatus={statusConfirmTarget}
          onConfirm={handleExecuteStatusToggle}
        />
      )}
    </div>
  );
}
