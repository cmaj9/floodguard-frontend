import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StationModal from '../components/stations/StationModal';
import StationCalibrationModal from '../components/stations/StationCalibrationModal';
import StationNotificationModal from '../components/stations/StationNotificationModal';
import StationStatusConfirmModal from '../components/stations/StationStatusConfirmModal';
import StationDeleteModal from '../components/stations/StationDeleteModal';
import type { Station, StationWithReading, WaterStatus } from '../types';
import { fetchStations, updateStation, createStation, updateStationCalibration, updateStationStatus, fetchNextStationId, deleteStation } from '../services/apiService';
import StationMap from '../components/map/StationMap';
import { TableIcon, MapIcon, PlusIcon, AlertTriangleIcon, Edit3Icon, Trash2Icon, SlidersIcon, BellIcon, MapPinIcon } from '../components/ui/Icons';
import SegmentedControl from '../components/ui/SegmentedControl';

const statusLabel: Record<WaterStatus, string> = { normal: 'ปกติ', warning: 'เฝ้าระวัง', critical: 'วิกฤต', unknown: 'ไม่มีข้อมูล' };
const statusClass: Record<WaterStatus, string> = { normal: 'badge-normal', warning: 'badge-warning', critical: 'badge-critical', unknown: 'badge-unknown' };

const mapStationWithReadingToStation = (swr: StationWithReading): Station => {
  let district = '';
  let province = '';
  if (swr.location_name) {
    const parts = swr.location_name.split(' ');
    district = parts[0] ? parts[0].replace(/^[อส]\./, '') : '';
    province = parts[1] ? parts[1].replace(/^[จ]\./, '') : '';
  }

  const sToRef = swr.sensor_to_ref_distance !== undefined && swr.sensor_to_ref_distance !== null
    ? Number(swr.sensor_to_ref_distance)
    : 2.0;
  const refName = swr.reference_point_name && swr.reference_point_name.trim() !== ''
    ? swr.reference_point_name.trim()
    : 'จุดอ้างอิง';

  return {
    id: swr.station_id,
    name: swr.station_name,
    description: `ประเภท ${swr.station_type || 'สถานีตรวจวัด'} · Gateway ${swr.gateway_name || '-'}`,
    location: swr.location_name || '',
    district: district,
    province: province,
    lat: Number(swr.latitude) || 14.03593,
    lng: Number(swr.longitude) || 100.72516,
    currentLevel: swr.raw_distance != null
      ? Number((sToRef - Number(swr.raw_distance)).toFixed(3))
      : (swr.water_level != null ? Number(swr.water_level) : 0),
    sensorToRefDistance: sToRef,
    referencePointName: refName,
    rawDistance: swr.raw_distance != null ? Number(swr.raw_distance) : null,
    isBlindZone: Boolean(swr.is_blind_zone),
    blindZoneOffset: swr.blind_zone_offset != null ? Number(swr.blind_zone_offset) : 0.28,
    tiltCompensationEnabled: swr.tilt_compensation_enabled !== false,
    // Use undefined for unset thresholds so chart/component can detect absence correctly
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

  // Notification Modal State (In-station configuration)
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [notifyingStation, setNotifyingStation] = useState<Station | null>(null);

  // Status Confirmation Modal State (with detailed explanation)
  const [statusConfirmModalOpen, setStatusConfirmModalOpen] = useState(false);
  const [statusTargetStation, setStatusTargetStation] = useState<Station | null>(null);
  const [statusTargetType, setStatusTargetType] = useState<'active' | 'offline'>('offline');

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingStation, setDeletingStation] = useState<Station | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'map'>('table');

  const handleRequestStatusChange = (station: Station, targetStatus: 'active' | 'offline') => {
    if (station.isActive === (targetStatus === 'active')) return;
    setStatusTargetStation(station);
    setStatusTargetType(targetStatus);
    setStatusConfirmModalOpen(true);
  };

  const handleExecuteStatusChange = async () => {
    if (!statusTargetStation) return;
    await handleSetStatus(statusTargetStation, statusTargetType);
  };

  const handleSetStatus = async (station: Station, newStatus: 'active' | 'offline') => {
    if (statusUpdating[station.id]) return;
    const isTargetActive = newStatus === 'active';
    if (station.isActive === isTargetActive) return;

    // Optimistic update
    setStations((prev) =>
      prev.map((s) => (s.id === station.id ? { ...s, isActive: isTargetActive, operatingStatus: newStatus } : s))
    );
    setStatusUpdating((prev) => ({ ...prev, [station.id]: true }));
    try {
      await updateStationStatus(station.id, newStatus);
    } catch (err: any) {
      // Revert on failure
      setStations((prev) =>
        prev.map((s) => (s.id === station.id ? { ...s, isActive: station.isActive, operatingStatus: station.operatingStatus } : s))
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

  const handleAdd = () => { setEditStation(null); setModalOpen(true); };
  const handleEdit = (s: Station) => { setEditStation(s); setModalOpen(true); };
  const handleCalibrate = (s: Station) => { setCalibratingStation(s); setCalibrationModalOpen(true); };

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
    try {
      const targetStatus = data.operatingStatus || (data.isActive ? 'active' : 'offline');
      if (editStation) {
        // Edit: update metadata
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
          status: targetStatus,
        });
        await updateStationStatus(editStation.id, targetStatus);
      } else {
        // Create: requires gateway_id
        let stationId = data.deviceId?.trim();
        if (!stationId) {
          try {
            stationId = await fetchNextStationId();
          } catch (_) {
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
          status: targetStatus,
        });
        // Broadcast refresh to all pages
        window.dispatchEvent(new Event('app:refresh'));
      }
      await loadStations();
    } catch (err: any) {
      // Re-throw so StationModal can catch and display in-modal error
      throw err;
    }
  };

  const handleSaveCalibration = async (calibrationData: any) => {
    if (!calibratingStation) return;
    await updateStationCalibration(calibratingStation.id, calibrationData);
    await loadStations();
  };

  return (
    <div className="page-container">
      {/* View switcher and Actions Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        {/* View toggle (Pattern 1) */}
        <SegmentedControl
          options={[
            { value: 'table', label: 'ตาราง', icon: <TableIcon size={14} /> },
            { value: 'map', label: 'แผนที่', icon: <MapIcon size={14} /> },
          ]}
          value={view}
          onChange={(val) => setView(val as 'table' | 'map')}
          size="sm"
          ariaLabel="สลับมุมมองสถานี"
        />

        <button
          id="global-notification-btn"
          className="btn btn-secondary"
          onClick={() => { setNotifyingStation(null); setNotificationModalOpen(true); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 15px', fontSize: 13.5, fontWeight: 600 }}
          title="ตั้งค่าเกณฑ์การแจ้งเตือนส่วนกลางของระบบ"
        >
          <BellIcon size={15} />
          <span>เกณฑ์แจ้งเตือนส่วนกลาง</span>
        </button>

        <button
          id="add-station-btn"
          className="btn btn-primary"
          onClick={handleAdd}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', fontSize: 13.5, fontWeight: 600 }}
        >
          <PlusIcon size={15} />
          <span>เพิ่มสถานี</span>
        </button>
      </div>

      {loading && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div
            style={{
              width: 32, height: 32,
              border: '3px solid rgba(0,212,255,0.15)',
              borderTopColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <div style={{ fontSize: 13 }}>กำลังโหลดข้อมูลสถานี...</div>
        </div>
      )}

      {error && (
        <div
          style={{
            margin: '0 0 20px 0',
            padding: '12px 16px',
            background: 'rgba(255,70,70,0.08)',
            border: '1px solid rgba(255,70,70,0.25)',
            borderRadius: 8,
            color: 'var(--color-critical)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertTriangleIcon size={18} />
          <div>
            <strong>เกิดข้อผิดพลาด</strong> {error}
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {view === 'table' ? (
            <>
              {/* Desktop Table View (>= 769px) */}
              <div className="desktop-table-view card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap" style={{ borderRadius: 'var(--radius-lg)', border: 'none' }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ fontSize: 12, fontWeight: 700, padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>ชื่อสถานี</th>
                      <th style={{ fontSize: 12, fontWeight: 700, padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>จุดอ้างอิงระดับน้ำ</th>
                      <th style={{ fontSize: 12, fontWeight: 700, padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>ระยะเซนเซอร์วัดได้</th>
                      <th style={{ fontSize: 12, fontWeight: 700, padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>ระดับน้ำเทียบจุดอ้างอิง</th>
                      <th style={{ fontSize: 12, fontWeight: 700, padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>สถานะ</th>
                      <th style={{ fontSize: 12, fontWeight: 700, padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>อุปกรณ์</th>
                      <th style={{ fontSize: 12, fontWeight: 700, padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>ใช้งาน</th>
                      <th style={{ fontSize: 12, fontWeight: 700, padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stations.map((s) => {
                      const refName = s.referencePointName || 'จุดอ้างอิง';
                      const level = s.currentLevel;
                      const levelFormatted = level >= 0 ? `+${level.toFixed(2)}` : level.toFixed(2);
                      const relativeSubtext = level < 0
                        ? `ต่ำกว่า${refName} ${Math.abs(level).toFixed(2)} ม.`
                        : level === 0
                        ? `เสมอ${refName}`
                        : `สูงกว่า${refName} ${level.toFixed(2)} ม.`;

                      return (
                        <tr key={s.id}>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap' }}>{s.location}</div>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: 'fit-content',
                                  padding: '2px 8px',
                                  borderRadius: 5,
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  color: '#38BDF8',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {refName}
                              </span>
                              <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                ระยะติดตั้ง <strong style={{ color: 'var(--text-primary)' }}>{s.sensorToRefDistance?.toFixed(2) ?? '2.00'} ม.</strong>
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            {s.isActive && s.rawDistance !== null && s.rawDistance !== undefined ? (
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                                  {s.rawDistance.toFixed(3)}
                                </span>{' '}
                                ม.
                                {s.isBlindZone && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 3,
                                      fontSize: 10.5,
                                      color: '#EF4444',
                                      fontWeight: 700,
                                      marginLeft: 5,
                                      padding: '1px 5px',
                                      borderRadius: 4,
                                      background: 'rgba(239, 68, 68, 0.12)',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    <AlertTriangleIcon size={11} style={{ color: '#EF4444' }} />
                                    <span>Blind Zone</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            {s.isActive ? (
                              <div style={{ whiteSpace: 'nowrap' }}>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    fontSize: 15.5,
                                    color: level >= 0 ? '#F87171' : '#34D399',
                                    fontFamily: 'monospace, inherit',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {levelFormatted}{' '}
                                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    ม.
                                  </span>
                                </div>
                                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap' }}>
                                  {relativeSubtext}
                                </div>
                              </div>
                            ) : (
                              <div style={{ whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-muted)' }}>-</span>
                                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>ปิดให้บริการชั่วคราว</div>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            {s.isActive ? (
                              <span className={`badge ${statusClass[s.status]}`} style={{ fontSize: 12, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                                <span className="badge-dot" style={{ width: 6.5, height: 6.5 }} />
                                {statusLabel[s.status]}
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '3px 10px',
                                  borderRadius: 5,
                                  background: 'rgba(148, 163, 184, 0.12)',
                                  border: '1px solid rgba(148, 163, 184, 0.25)',
                                  color: 'var(--text-muted)',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span style={{ width: 6.5, height: 6.5, borderRadius: '50%', background: '#94A3B8' }} />
                                <span>หยุดให้บริการ</span>
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12.5, fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {s.deviceId}
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <div
                              role="radiogroup"
                              aria-label={`สถานะการให้บริการของสถานี ${s.name}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                background: 'rgba(15, 23, 42, 0.85)',
                                border: '1px solid rgba(255, 255, 255, 0.14)',
                                borderRadius: '9999px',
                                padding: '3px',
                                gap: '3px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {/* Option ออนไลน์ */}
                              <button
                                type="button"
                                role="radio"
                                aria-checked={s.isActive}
                                disabled={statusUpdating[s.id]}
                                onClick={() => handleRequestStatusChange(s, 'active')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '4px 10px',
                                  borderRadius: '9999px',
                                  border: s.isActive
                                    ? '1px solid rgba(16, 185, 129, 0.5)'
                                    : '1px solid transparent',
                                  background: s.isActive
                                    ? 'rgba(16, 185, 129, 0.22)'
                                    : 'transparent',
                                  color: s.isActive ? '#10B981' : 'var(--text-muted)',
                                  fontWeight: s.isActive ? 700 : 500,
                                  fontSize: 12,
                                  cursor: s.isActive ? 'default' : (statusUpdating[s.id] ? 'wait' : 'pointer'),
                                  transition: 'all 0.18s ease',
                                  whiteSpace: 'nowrap',
                                }}
                                title="ตั้งค่าเป็น ออนไลน์ (เปิดให้บริการ)"
                              >
                                <span
                                  style={{
                                    width: 6.5,
                                    height: 6.5,
                                    borderRadius: '50%',
                                    background: s.isActive ? '#10B981' : 'rgba(148, 163, 184, 0.4)',
                                  }}
                                />
                                <span style={{ whiteSpace: 'nowrap' }}>ออนไลน์</span>
                              </button>

                              {/* Option ออฟไลน์ */}
                              <button
                                type="button"
                                role="radio"
                                aria-checked={!s.isActive}
                                disabled={statusUpdating[s.id]}
                                onClick={() => handleRequestStatusChange(s, 'offline')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '4px 10px',
                                  borderRadius: '9999px',
                                  border: !s.isActive
                                    ? '1px solid rgba(245, 158, 11, 0.5)'
                                    : '1px solid transparent',
                                  background: !s.isActive
                                    ? 'rgba(245, 158, 11, 0.22)'
                                    : 'transparent',
                                  color: !s.isActive ? '#F59E0B' : 'var(--text-muted)',
                                  fontWeight: !s.isActive ? 700 : 500,
                                  fontSize: 12,
                                  cursor: !s.isActive ? 'default' : (statusUpdating[s.id] ? 'wait' : 'pointer'),
                                  transition: 'all 0.18s ease',
                                  whiteSpace: 'nowrap',
                                }}
                                title="ตั้งค่าเป็น ออฟไลน์ (ปิดบริการชั่วคราว)"
                              >
                                <span
                                  style={{
                                    width: 6.5,
                                    height: 6.5,
                                    borderRadius: '50%',
                                    background: !s.isActive ? '#F59E0B' : 'rgba(148, 163, 184, 0.4)',
                                  }}
                                />
                                <span style={{ whiteSpace: 'nowrap' }}>ออฟไลน์</span>
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center', whiteSpace: 'nowrap' }}>
                              <button
                                className="btn btn-primary"
                                onClick={() => handleCalibrate(s)}
                                title="ตั้งค่าจุดอ้างอิงและระดับตลิ่ง"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  height: 32,
                                  padding: '0 10px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  borderRadius: 6,
                                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <SlidersIcon size={13} />
                                <span>จุดอ้างอิง</span>
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={() => { setNotifyingStation(s); setNotificationModalOpen(true); }}
                                title="ตั้งค่าการแจ้งเตือนสำหรับสถานีนี้"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  height: 32,
                                  padding: '0 10px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  borderRadius: 6,
                                  border: '1px solid rgba(255, 255, 255, 0.14)',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  color: 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <BellIcon size={13} />
                                <span>แจ้งเตือน</span>
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleEdit(s)}
                                title="แก้ไขข้อมูลสถานี"
                                style={{
                                  width: 32,
                                  height: 32,
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: 6,
                                  border: '1px solid rgba(255, 255, 255, 0.14)',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  color: 'var(--text-secondary)',
                                  flexShrink: 0,
                                }}
                                aria-label={`แก้ไขสถานี ${s.name}`}
                              >
                                <Edit3Icon size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleRequestDelete(s)}
                                title="ลบสถานี"
                                style={{
                                  height: 32,
                                  minWidth: 32,
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: 6,
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  color: '#EF4444',
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  flexShrink: 0,
                                  cursor: 'pointer',
                                }}
                                aria-label={`ลบสถานี ${s.name}`}
                              >
                                <Trash2Icon size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card List View (<= 768px) */}
            <div className="mobile-cards-view">
              {stations.map((s) => {
                const refName = s.referencePointName || 'จุดอ้างอิง';
                const level = s.currentLevel;
                const levelFormatted = level >= 0 ? `+${level.toFixed(2)}` : level.toFixed(2);
                const relativeSubtext = level < 0
                  ? `ต่ำกว่า${refName} ${Math.abs(level).toFixed(2)} ม.`
                  : level === 0
                  ? `เสมอ${refName}`
                  : `สูงกว่า${refName} ${level.toFixed(2)} ม.`;

                return (
                  <div key={s.id} className="mobile-station-card">
                    {/* Header: ID + Name + Status */}
                    <div className="m-card-header">
                      <div className="m-card-title-group">
                        <span className="station-code-pill">{s.id}</span>
                        <span className="station-name-text">{s.name}</span>
                      </div>
                      <span className={`badge ${s.isActive ? statusClass[s.status] : 'badge-unknown'}`}>
                        <span className="badge-dot" />
                        {s.isActive ? statusLabel[s.status] : 'ปิดบริการ'}
                      </span>
                    </div>

                    {/* Location & Type info */}
                    <div className="m-card-subrow">
                      <div className="m-location-pill">
                        <MapPinIcon size={12} />
                        <span>{s.location || `${s.district} · ${s.province}`}</span>
                      </div>
                      <span className="m-station-type-tag">{s.stationType}</span>
                    </div>

                    {/* 2x2 Metric Grid */}
                    <div className="m-metrics-grid">
                      <div className="m-metric-item">
                        <span className="m-metric-label">ระดับน้ำจริงเทียบ{refName}</span>
                        <span className={`m-metric-val ${level >= 0 ? 'level-danger' : 'level-safe'}`}>
                          {s.isActive ? `${levelFormatted} ม.` : '-'}
                        </span>
                        <span className="m-metric-sub">{s.isActive ? relativeSubtext : 'ปิดให้บริการ'}</span>
                      </div>
                      <div className="m-metric-item">
                        <span className="m-metric-label">จุดอ้างอิง ({refName})</span>
                        <span className="m-metric-val text-sky">
                          {s.sensorToRefDistance?.toFixed(2) ?? '2.00'} ม.
                        </span>
                        <span className="m-metric-sub">ระยะติดตั้งถึงจุดอ้างอิง</span>
                      </div>
                      <div className="m-metric-item">
                        <span className="m-metric-label">ระยะเซนเซอร์วัดได้</span>
                        <span className="m-metric-val">
                          {s.isActive && s.rawDistance !== null && s.rawDistance !== undefined
                            ? `${s.rawDistance.toFixed(3)} ม.`
                            : '-'}
                        </span>
                        {s.isBlindZone && <span className="m-blind-zone-tag">Blind Zone</span>}
                      </div>
                      <div className="m-metric-item">
                        <span className="m-metric-label">อุปกรณ์ / Gateway</span>
                        <span className="m-metric-val font-mono">{s.deviceId}</span>
                        <span className="m-metric-sub">{s.gatewayName || 'Gateway'}</span>
                      </div>
                    </div>

                    {/* Status Toggle Bar */}
                    <div className="m-status-bar">
                      <span className="m-status-title">สถานะบริการ:</span>
                      <div className="m-toggle-pill-wrap">
                        <button
                          type="button"
                          className={`m-status-toggle-btn ${s.isActive ? 'active-online' : ''}`}
                          onClick={() => handleRequestStatusChange(s, 'active')}
                          disabled={statusUpdating[s.id]}
                        >
                          <span className="dot" />
                          <span>ออนไลน์</span>
                        </button>
                        <button
                          type="button"
                          className={`m-status-toggle-btn ${!s.isActive ? 'active-offline' : ''}`}
                          onClick={() => handleRequestStatusChange(s, 'offline')}
                          disabled={statusUpdating[s.id]}
                        >
                          <span className="dot" />
                          <span>ออฟไลน์</span>
                        </button>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="m-card-actions">
                      <button
                        type="button"
                        className="btn btn-secondary m-action-btn"
                        onClick={() => handleCalibrate(s)}
                      >
                        <SlidersIcon size={14} />
                        <span>จุดอ้างอิง</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary m-action-btn"
                        onClick={() => { setNotifyingStation(s); setNotificationModalOpen(true); }}
                      >
                        <BellIcon size={14} />
                        <span>แจ้งเตือน</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary m-action-btn"
                        onClick={() => handleEdit(s)}
                        aria-label={`แก้ไขสถานี ${s.name}`}
                      >
                        <Edit3Icon size={14} />
                        <span>แก้ไข</span>
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          className="btn btn-danger-outline m-action-btn"
                          onClick={() => handleRequestDelete(s)}
                          aria-label={`ลบสถานี ${s.name}`}
                        >
                          <Trash2Icon size={14} />
                          <span>ลบ</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <StationMap
                stations={stations}
                selectedStation={selectedId}
                onSelectStation={setSelectedId}
                height="560px"
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

      {/* Dedicated Status Change Confirmation Modal with Details */}
      <StationStatusConfirmModal
        isOpen={statusConfirmModalOpen}
        onClose={() => setStatusConfirmModalOpen(false)}
        station={statusTargetStation}
        targetStatus={statusTargetType}
        onConfirm={handleExecuteStatusChange}
      />

      {/* Dedicated Delete Confirmation Modal with Name-Confirmation Safety */}
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
