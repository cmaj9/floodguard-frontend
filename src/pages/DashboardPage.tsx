import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StationTelemetryHub from '../components/dashboard/StationTelemetryHub';
import StationMap from '../components/map/StationMap';
import StationRecentReadingsCard from '../components/dashboard/StationRecentReadingsCard';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import {
  AlertTriangleIcon,
  XCircleIcon,
  RefreshCwIcon,
  ActivityIcon,
  MapIcon,
  CheckCircleIcon,
  PhoneIcon,
  RadioIcon,
} from '../components/ui/Icons';
import { Button } from '../components/ui/Button';
import { SkeletonCard, SkeletonMetric } from '../components/ui/Skeleton';
import type { Station, StationWithReading } from '../types';
import { fetchStations } from '../services/apiService';

// ── Data Mapping Helper ─────────────────────────────────────────────
const mapStationWithReadingToStation = (swr: StationWithReading): Station => {
  let district = '';
  let province = '';
  if (swr.location_name) {
    const parts = swr.location_name.split(' ');
    district = parts[0] ? parts[0].replace(/^[อส]\./, '') : '';
    province = parts[1] ? parts[1].replace(/^[จ]\./, '') : '';
  }

  const sType =
    swr.station_type === 'river'
      ? 'แม่น้ำ (River)'
      : swr.station_type === 'canal'
      ? 'คลอง (Canal)'
      : swr.station_type || 'สถานีตรวจวัด';

  const sToRef = swr.sensor_to_ref_distance !== undefined && swr.sensor_to_ref_distance !== null
    ? Number(swr.sensor_to_ref_distance)
    : 2.0;
  const refName = swr.reference_point_name && swr.reference_point_name.trim() !== ''
    ? swr.reference_point_name.trim()
    : 'จุดอ้างอิง';

  return {
    id: swr.station_id,
    name: swr.station_name,
    description: `ประเภท ${sType} · จุดบริการ ${swr.gateway_name || 'ลุ่มน้ำ'}`,
    location: swr.location_name || '',
    district: district,
    province: province,
    lat: Number(swr.latitude) || 14.03593,
    lng: Number(swr.longitude) || 100.72516,
    currentLevel: swr.raw_distance !== null && swr.raw_distance !== undefined
      ? Number((sToRef - Number(swr.raw_distance)).toFixed(3))
      : (swr.water_level !== null ? Number(swr.water_level) : 0),
    sensorToRefDistance: sToRef,
    referencePointName: refName,
    rawDistance: swr.raw_distance !== null && swr.raw_distance !== undefined ? Number(swr.raw_distance) : null,
    isBlindZone: Boolean(swr.is_blind_zone),
    blindZoneOffset: swr.blind_zone_offset !== undefined ? Number(swr.blind_zone_offset) : 0.28,
    tiltCompensationEnabled: swr.tilt_compensation_enabled !== false,
    maxLevel: swr.max_level !== null && swr.max_level !== undefined ? Number(swr.max_level) : undefined,
    normalMax: swr.normal_max !== null && swr.normal_max !== undefined ? Number(swr.normal_max) : undefined,
    warningLevel: swr.warning_level !== null && swr.warning_level !== undefined ? Number(swr.warning_level) : undefined,
    criticalLevel: swr.critical_level !== null && swr.critical_level !== undefined ? Number(swr.critical_level) : undefined,
    status: swr.water_status || 'unknown',
    operatingStatus: (swr.status as 'active' | 'offline' | 'maintenance') || 'active',
    lastUpdated: swr.last_reading_time || new Date().toISOString(),
    isActive: swr.status === 'active',
    deviceId: swr.station_id,
    batteryPercent: swr.battery_percent !== null ? Number(swr.battery_percent) : 100,
    batteryVoltage: swr.battery_voltage !== null ? Number(swr.battery_voltage) : 13.0,
    temperature: swr.temperature !== null ? Number(swr.temperature) : 31.4,
    humidity: swr.humidity !== null ? Number(swr.humidity) : 62.5,
    rssi: swr.rssi !== null ? Number(swr.rssi) : -60,
    snr: swr.snr !== null ? Number(swr.snr) : 14.5,
    tiltX: swr.tilt_x !== null ? Number(swr.tilt_x) : 4.3,
    tiltY: swr.tilt_y !== null ? Number(swr.tilt_y) : -1.1,
    tiltOffsetX: swr.tilt_offset_x != null ? Number(swr.tilt_offset_x) : undefined,
    tiltOffsetY: swr.tilt_offset_y != null ? Number(swr.tilt_offset_y) : undefined,
    relTiltX: swr.rel_tilt_x != null ? Number(swr.rel_tilt_x) : undefined,
    relTiltY: swr.rel_tilt_y != null ? Number(swr.rel_tilt_y) : undefined,
    relativeTotalTilt: swr.relative_total_tilt != null ? Number(swr.relative_total_tilt) : undefined,
    isPoleTilted: swr.is_pole_tilted,
    gatewayName: swr.gateway_name || 'Gateway_01',
    gatewayStatus: swr.gateway_status || 'online',
    model: swr.model || 'Heltec-WiFi-LoRa-32(V3)',
    firmwareVersion: swr.firmware_version || 'v1.2.0',
    stationType: sType,
  };
};

// ── Fallback Demo Stations ──────────────────────────────────────────
const FALLBACK_STATIONS: Station[] = [
  {
    id: 'ST-001',
    name: 'สถาบันวิทยสิริเมธี (ริมแม่น้ำ)',
    description: 'ประเภท แม่น้ำ (River) · จุดตรวจวัดหลัก',
    location: 'ต.คลองหก อ.คลองหลวง จ.ปทุมธานี',
    district: 'คลองหลวง',
    province: 'ปทุมธานี',
    lat: 14.03593,
    lng: 100.72516,
    currentLevel: 1.569,
    maxLevel: 7.0,
    normalMax: 3.0,
    warningLevel: 4.5,
    criticalLevel: 5.5,
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    isActive: true,
    deviceId: 'ST-001',
    batteryPercent: 100,
    batteryVoltage: 13.0,
    temperature: 31.4,
    humidity: 62.5,
    rssi: -60,
    snr: 14.5,
    tiltX: 4.3,
    tiltY: -1.1,
    gatewayName: 'Gateway_01',
    gatewayStatus: 'online',
    model: 'Heltec-WiFi-LoRa-32(V3)',
    firmwareVersion: 'v1.2.0',
    stationType: 'แม่น้ำ (River)',
  },
  {
    id: 'ST-002',
    name: 'สถานีคลองรังสิต (ประตูระบายน้ำ)',
    description: 'ประเภท คลอง (Canal) · ประตูระบายน้ำคลองรังสิต',
    location: 'ต.รังสิต อ.ธัญบุรี จ.ปทุมธานี',
    district: 'ธัญบุรี',
    province: 'ปทุมธานี',
    lat: 14.0208,
    lng: 100.7594,
    currentLevel: 1.15,
    maxLevel: 4.5,
    normalMax: 2.0,
    warningLevel: 3.0,
    criticalLevel: 3.8,
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    isActive: true,
    deviceId: 'ST-002',
    batteryPercent: 92,
    batteryVoltage: 12.8,
    temperature: 32.0,
    humidity: 60.2,
    rssi: -68,
    snr: 13.2,
    tiltX: 2.1,
    tiltY: 0.5,
    gatewayName: 'Gateway_01',
    gatewayStatus: 'online',
    model: 'Heltec-WiFi-LoRa-32(V3)',
    firmwareVersion: 'v1.2.0',
    stationType: 'คลอง (Canal)',
  },
];

export default function DashboardPage() {
  const { user, isGuest } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();

  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'telemetry' | 'map'>('telemetry');
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState<boolean>(false);

  // ── TanStack Query: Auto-refreshes every 30s silently without skeleton flash ──
  const {
    data: stations = FALLBACK_STATIONS,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery<Station[]>({
    queryKey: ['stations'],
    queryFn: async () => {
      const stationData = await fetchStations().catch(() => []);
      if (stationData && stationData.length > 0) {
        return stationData.map(mapStationWithReadingToStation);
      }
      return FALLBACK_STATIONS;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const loadError = queryError instanceof Error ? queryError.message : null;

  // ── 1. Role & User Assigned Stations Derivation ──
  const userRole = user?.role || (isGuest ? 'guest' : 'citizen');
  const isRegisteredCitizen = !isGuest && user?.id !== 'citizen_guest' && userRole === 'citizen';
  const isStaff = !isGuest && userRole === 'staff';
  const isAdmin = !isGuest && userRole === 'admin';

  // Extract user station IDs safely from AuthContext, navigation state, or localStorage
  const userStationIds: string[] = useMemo<string[]>(() => {
    // Priority 1: Direct from user profile in AuthContext
    const rawIds = user?.stationIds ?? (user as any)?.station_ids;
    if (Array.isArray(rawIds) && rawIds.length > 0) {
      return rawIds.map((id: string) => String(id).trim()).filter(Boolean);
    }
    if (typeof rawIds === 'string' && rawIds.trim()) {
      return rawIds.split(',').map((id: string) => id.trim()).filter(Boolean);
    }
    // Priority 2: From navigation state (e.g. redirected from subscription/registration)
    if (location.state?.subscribedStationIds && Array.isArray(location.state.subscribedStationIds) && location.state.subscribedStationIds.length > 0) {
      return location.state.subscribedStationIds.map((id: string) => String(id).trim()).filter(Boolean);
    }
    // Priority 3: Fallback to localStorage
    try {
      const saved = localStorage.getItem('subscribed_station_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((id: string) => String(id).trim()).filter(Boolean);
        }
      }
    } catch {}
    return [];
  }, [user, location.state]);



  const [showSubscribedBanner, setShowSubscribedBanner] = useState<boolean>(
    Boolean(location.state?.justSubscribed)
  );

  // ── Sync incoming navigation toast state with global ToastProvider ──
  useEffect(() => {
    if (location.state?.registerSuccess) {
      const regType = (location.state.registerType as 'email' | 'line') || 'email';
      showToast(
        regType === 'line'
          ? 'ลงทะเบียนผ่าน LINE สำเร็จ เข้าสู่ระบบเรียบร้อยแล้ว'
          : 'ลงทะเบียนสำเร็จ เข้าสู่ระบบเรียบร้อยแล้ว',
        regType === 'line' ? 'line' : 'login'
      );
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    } else if (location.state?.loginSuccess) {
      const logType = (location.state.loginType as 'email' | 'line') || 'email';
      showToast(
        logType === 'line'
          ? 'เข้าสู่ระบบสำเร็จผ่าน LINE เรียบร้อยแล้ว'
          : 'เข้าสู่ระบบสำเร็จ ยินดีต้อนรับสู่ระบบ FloodGuard',
        logType === 'line' ? 'line' : 'login'
      );
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    } else if (location.state?.alreadyLoggedIn) {
      showToast('เข้าสู่ระบบสำเร็จผ่าน LINE เรียบร้อยแล้ว', 'line');
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    }
  }, [location.state, showToast]);

  // ── Global Refresh Listener & Synchronizer ───────────────────────
  useEffect(() => {
    const handleGlobalRefresh = () => {
      refetch();
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => {
      window.removeEventListener('app:refresh', handleGlobalRefresh);
    };
  }, [refetch]);

  // ── Auto-Select Initial Station ───────────────────────────────────
  useEffect(() => {
    if (stations && stations.length > 0) {
      setSelectedStationId((prev) => {
        if (prev && stations.some((s) => s.id === prev)) return prev;
        if (userStationIds.length > 0) {
          const upperUser = userStationIds.map((id: string) => id.toUpperCase());
          const matched = stations.find((s) => upperUser.includes(s.id.toUpperCase()));
          if (matched) return matched.id;
        }
        if (location.state?.subscribedStationIds?.[0]) return location.state.subscribedStationIds[0];
        return stations[0]?.id || null;
      });
    }
  }, [stations, userStationIds, location.state]);

  // ── Subscribed / Assigned Station Names ──
  const subscribedNames = useMemo(() => {
    if (location.state?.subscribedStationNames && Array.isArray(location.state.subscribedStationNames)) {
      return location.state.subscribedStationNames;
    }
    const upperUser = userStationIds.map((id: string) => id.toUpperCase());
    return stations
      .filter((s) => upperUser.includes(s.id.toUpperCase()))
      .map((s) => s.name || s.id);
  }, [location.state, stations, userStationIds]);

  // ── Displayed Stations (Strict Role-Based) ──
  // Admin & Guests: See all stations
  // Citizen & Staff: See strictly only their registered / assigned stations
  const displayedStations = useMemo(() => {
    if (isAdmin || isGuest) {
      return stations;
    }
    if (isRegisteredCitizen || isStaff) {
      if (userStationIds.length > 0) {
        const upperIds = userStationIds.map((id: string) => id.toUpperCase());
        const filtered = stations.filter((s) => upperIds.includes(s.id.toUpperCase()));
        return filtered;
      }
      return [];
    }
    return stations;
  }, [stations, isAdmin, isGuest, isRegisteredCitizen, isStaff, userStationIds]);

  // Ensure selected station remains valid within displayed stations
  useEffect(() => {
    if (displayedStations.length > 0) {
      const isValid = displayedStations.some((s) => s.id === selectedStationId);
      if (!isValid) {
        setSelectedStationId(displayedStations[0].id);
      }
    }
  }, [displayedStations, selectedStationId]);

  const criticalStations = useMemo(
    () => displayedStations.filter((s) => s.status === 'critical'),
    [displayedStations]
  );

  // The active selected station object
  const selectedStation = useMemo(
    () => displayedStations.find((s) => s.id === selectedStationId) || displayedStations[0] || null,
    [displayedStations, selectedStationId]
  );

  return (
    <div
      className="page-container dashboard-page-container"
      style={{
        maxWidth: 1400,
        margin: '0 auto',
      }}
    >


      {/* ── Subscribed Confirmation Banner (Sonar Green) ── */}
      {showSubscribedBanner && (
        <div
          className="bento-card animate-fade-in"
          style={{
            marginBottom: '1.25rem',
            padding: '14px 18px',
            background: 'linear-gradient(135deg, var(--sonar-green-dim) 0%, rgba(12, 14, 18, 0.98) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--sonar-green-dim)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--sonar-green)',
                flexShrink: 0,
              }}
            >
              <CheckCircleIcon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--sonar-green)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>บันทึกสำเร็จ</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>กำลังติดตาม</span>
                <span
                  style={{
                    color: '#FFFFFF',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                  }}
                >
                  {subscribedNames.length > 0 ? subscribedNames.join(', ') : 'ทุกสถานี'}
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                กำลังแสดงเฉพาะสถานีที่คุณลงทะเบียนติดตาม ({displayedStations.length} สถานี)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSubscribedBanner(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="ปิดแถบแจ้งเตือน"
          >
            <XCircleIcon size={16} />
          </button>
        </div>
      )}

      {/* ── 0. CRITICAL ALERT TOAST (Beacon Red + Emergency Broadcast) ── */}
      {criticalStations.length > 0 && (
        <div
          className="bento-card animate-fade-in"
          style={{
            background: 'linear-gradient(90deg, var(--beacon-red-dim) 0%, rgba(12, 14, 18, 0.98) 100%)',
            border: '1px solid rgba(220, 38, 38, 0.45)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
          role="alert"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 260 }}>
            <XCircleIcon size={22} style={{ color: 'var(--beacon-red)', flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 700, color: 'var(--beacon-red)', fontSize: '0.9375rem', marginRight: '0.5rem' }}>
                ประกาศเตือนภัยระดับวิกฤต
              </span>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                พบ {criticalStations.length} จุดตรวจวัดระดับน้ำล้นตลิ่ง ({criticalStations.map((s) => s.name).join(', ')})
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <a
              href="tel:1784"
              className="btn btn-secondary btn-sm"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '6px 12px',
              }}
              title="โทรสายด่วนนิรภัย ปภ. 1784 (โทรฟรี 24 ชม.)"
            >
              <PhoneIcon size={14} style={{ color: '#F87171' }} />
              <span>สายด่วน 1784</span>
            </a>

            {(isAdmin || isStaff) && (
              <button
                type="button"
                className="btn-radar-beacon tactile-press"
                onClick={() => setShowBroadcastConfirm(true)}
                title="ส่งข้อความแจ้งเตือนด่วนผ่าน LINE OA ไปยังประชาชนที่ติดตามสถานีในพื้นที่วิกฤต"
              >
                <div className="radar-pulse-dot" />
                <span>ยิงแจ้งเตือนด่วน LINE OA</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-danger btn-sm tactile-press"
              onClick={() => setSelectedStationId(criticalStations[0].id)}
              style={{ borderRadius: 8, fontWeight: 700 }}
            >
              ดูจุดวิกฤต
            </button>
          </div>
        </div>
      )}

      {/* Emergency Broadcast Confirmation Modal */}
      {showBroadcastConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => !isBroadcasting && setShowBroadcastConfirm(false)}
        >
          <div
            style={{
              background: '#0C0E12',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 16,
              maxWidth: 420,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <RadioIcon size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  ยืนยันการยิงแจ้งเตือนฉุกเฉิน
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Emergency Broadcast via LINE Official Account
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
              ระบบจะส่งข้อความแจ้งเตือนระดับวิกฤตและคำแนะนำการอพยพทันทีไปยัง LINE OA ของประชาชนทุกคนที่ลงทะเบียนติดตามสถานีในพื้นที่วิกฤต ({criticalStations.map((s) => s.name).join(', ')})
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                variant="secondary"
                size="sm"
                disabled={isBroadcasting}
                onClick={() => setShowBroadcastConfirm(false)}
              >
                ยกเลิก
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={isBroadcasting}
                onClick={() => {
                  setIsBroadcasting(true);
                  setTimeout(() => {
                    setIsBroadcasting(false);
                    setShowBroadcastConfirm(false);
                    showToast('ส่งสัญญาณแจ้งเตือนภัยฉุกเฉินระดับวิกฤตไปยัง LINE OA ของประชาชนเรียบร้อยแล้ว', 'line');
                  }, 800);
                }}
                leftIcon={isBroadcasting ? <RefreshCwIcon size={14} className="animate-spin" /> : <RadioIcon size={14} />}
              >
                {isBroadcasting ? 'กำลังส่งสัญญาณ...' : 'ยืนยันส่งข้อความด่วน'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── ERROR STATE WITH RECOVERY ── */}
      {loadError && (
        <div
          className="bento-card"
          style={{
            background: 'var(--beacon-red-dim)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangleIcon size={22} style={{ color: 'var(--beacon-red)', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--beacon-red)', fontSize: '0.875rem' }}>
                เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {loadError} — กำลังแสดงข้อมูลสำรองเพื่อความต่อเนื่องในการใช้งาน
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCwIcon size={14} />}
          >
            ลองเชื่อมต่อใหม่
          </Button>
        </div>
      )}

      {/* Empty State when Citizen/Staff has no registered stations */}
      {displayedStations.length === 0 && !isLoading && (
        <div
          className="bento-card animate-fade-in"
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            marginBottom: '1rem',
            background: 'var(--card-surface)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
          }}
        >
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {isRegisteredCitizen
              ? 'คุณยังไม่มีสถานีที่ลงทะเบียนติดตาม'
              : 'ยังไม่มีสถานีที่ได้รับมอบหมาย'}
          </div>
        </div>
      )}

      {/* ── MOBILE VIEW TOGGLE BAR (Visible on Mobile only <= 768px) ── */}
      <div className="mobile-view-toggle-wrap">
        <div className="mobile-view-toggle-bar">
          <button
            type="button"
            className={`view-toggle-pill ${mobileTab === 'telemetry' ? 'active' : ''}`}
            onClick={() => setMobileTab('telemetry')}
          >
            <ActivityIcon size={16} />
            <span>ข้อมูลระดับน้ำ & เซนเซอร์</span>
          </button>
          <button
            type="button"
            className={`view-toggle-pill ${mobileTab === 'map' ? 'active' : ''}`}
            onClick={() => setMobileTab('map')}
          >
            <MapIcon size={16} />
            <span>แผนที่สถานี (GIS)</span>
          </button>
        </div>
      </div>

      {/* ── 2. CENTRAL TELEMETRY CANVAS (With Zero-CLS Skeleton Loading) ── */}
      {isLoading ? (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
          <SkeletonCard height="220px" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <SkeletonMetric />
            <SkeletonMetric />
            <SkeletonMetric />
            <SkeletonMetric />
          </div>
        </div>
      ) : (
        selectedStation && (
          <div className={`dashboard-telemetry-container ${mobileTab === 'map' ? 'mobile-hidden' : ''}`}>
            <ErrorBoundary fallbackTitle="เกิดข้อผิดพลาดในการแสดงผลมาตรวัดสถานี">
              <StationTelemetryHub
                station={selectedStation}
                stations={displayedStations}
                onSelectStation={(id) => setSelectedStationId(id)}
                onRefresh={() => refetch()}
                isRefreshing={isFetching}
              />
            </ErrorBoundary>
          </div>
        )
      )}

      {/* ── 4. LOWER CANVAS: GIS MAP + RECENT READINGS ── */}
      <div
        id="map-section"
        className={`dashboard-map-grid ${mobileTab === 'telemetry' ? 'mobile-map-hidden' : ''}`}
      >
        {/* Left: GIS Map */}
        <div
          className={`dashboard-map-wrapper ${mobileTab === 'telemetry' ? 'mobile-hidden' : ''}`}
        >
          <ErrorBoundary fallbackTitle="เกิดข้อผิดพลาดในการโหลดแผนที่สถานี">
            <StationMap
              stations={displayedStations}
              selectedStation={selectedStation?.id || null}
              onSelectStation={(id) => setSelectedStationId(id)}
              height="100%"
              showCardHeader={true}
            />
          </ErrorBoundary>
        </div>

        {/* Right: Recent Readings (5 latest, compact) */}
        {selectedStation && (
          <div
            className={`dashboard-readings-wrapper ${mobileTab === 'map' ? 'mobile-hidden' : ''}`}
          >
            <ErrorBoundary fallbackTitle="เกิดข้อผิดพลาดในการแสดงประวัติล่าสุด">
              <StationRecentReadingsCard station={selectedStation} />
            </ErrorBoundary>
          </div>
        )}
      </div>



    </div>
  );
}
