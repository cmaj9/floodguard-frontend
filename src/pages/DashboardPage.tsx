import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import StationSegmentedControl from '../components/dashboard/StationSegmentedControl';
import StationTelemetryHub from '../components/dashboard/StationTelemetryHub';
import StationMap from '../components/map/StationMap';
import StationRecentReadingsCard from '../components/dashboard/StationRecentReadingsCard';
import FloatingActionDock from '../components/dashboard/FloatingActionDock';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import {
  AlertTriangleIcon,
  XCircleIcon,
  RefreshCwIcon,
  ActivityIcon,
  MapIcon,
} from '../components/ui/Icons';
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

export default function DashboardPage() {
  const { user, isGuest } = useAuth();

  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'telemetry' | 'map'>('telemetry');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Load Real Data from API ───────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const stationData = await fetchStations().catch(() => []);

      if (stationData && stationData.length > 0) {
        const mapped = stationData.map(mapStationWithReadingToStation);
        
        // Check if user is a registered citizen who logged in with a real account
        const isRegisteredCitizen =
          Boolean(user) &&
          user?.role === 'citizen' &&
          user?.id !== 'citizen_guest' &&
          !isGuest;

        let filtered = mapped;
        if (isRegisteredCitizen) {
          const userStationIds = user?.stationIds || (user as any)?.station_ids || [];
          // If registered citizen: show ONLY stations they registered for
          filtered = mapped.filter((s) => userStationIds.includes(s.id));
        } else {
          // If unregistered citizen (visitor / guest) OR staff / admin: show ALL stations!
          filtered = mapped;
        }

        setStations(filtered);

        // Automatically select ST-001 or the first station on initial load
        setSelectedStationId((prev) => (prev && filtered.some((s) => s.id === prev) ? prev : filtered[0]?.id || null));
      } else {
        // Fallback demo stations if API returns 0 items
        const fallbackStations: Station[] = [
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
        setStations(fallbackStations);
        setSelectedStationId((prev) => (prev ? prev : fallbackStations[0].id));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อฐานข้อมูลสถานการณ์น้ำได้';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user, isGuest]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 30_000);
    const handleGlobalRefresh = () => {
      loadData();
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('app:refresh', handleGlobalRefresh);
    };
  }, [loadData]);

  const isRegisteredCitizen =
    Boolean(user) &&
    user?.role === 'citizen' &&
    user?.id !== 'citizen_guest' &&
    !isGuest;

  const criticalStations = useMemo(
    () => stations.filter((s) => s.status === 'critical'),
    [stations]
  );

  // The active selected station object
  const selectedStation = useMemo(
    () => stations.find((s) => s.id === selectedStationId) || stations[0] || null,
    [stations, selectedStationId]
  );


  return (
    <div
      className="page-container dashboard-page-container"
      style={{
        maxWidth: 1400,
        margin: '0 auto',
      }}
    >
      {/* ── Registered Citizen Notice if 0 subscribed stations ── */}
      {!isLoading && !loadError && isRegisteredCitizen && stations.length === 0 && (
        <div
          className="bento-card animate-fade-in"
          style={{
            padding: '24px 20px',
            marginBottom: '1.25rem',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '16px',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', marginBottom: 6 }}>
            ยังไม่มีสถานีที่คุณลงทะเบียนติดตามไว้
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
            คุณสามารถเลือกสถานีที่ต้องการรับการแจ้งเตือนได้ในหน้าโปรไฟล์ หรือคลิกเพื่อดูสถานีทั้งหมด
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              const data = await fetchStations().catch(() => []);
              const mapped = data.map(mapStationWithReadingToStation);
              setStations(mapped);
              if (mapped[0]) setSelectedStationId(mapped[0].id);
            }}
          >
            แสดงสถานีทั้งหมดในระบบ
          </button>
        </div>
      )}

      {/* ── 0. CRITICAL ALERT TOAST (If any station exceeds threshold) ── */}
      {criticalStations.length > 0 && (
        <div
          className="bento-card animate-fade-in"
          style={{
            background: 'linear-gradient(90deg, rgba(239,68,68,0.2) 0%, rgba(17,24,39,0.95) 100%)',
            border: '1px solid #EF4444',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
          role="alert"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <XCircleIcon size={24} style={{ color: '#EF4444', flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 700, color: '#EF4444', fontSize: '0.9375rem', marginRight: '0.5rem' }}>
                ประกาศเตือนภัยระดับวิกฤต
              </span>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                พบ {criticalStations.length} จุดตรวจวัดระดับน้ำล้นตลิ่ง ({criticalStations.map((s) => s.name).join(', ')})
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setSelectedStationId(criticalStations[0].id)}
            style={{
              background: '#EF4444',
              color: '#ffffff',
              fontSize: '0.75rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            ดูจุดวิกฤต
          </button>
        </div>
      )}


      {/* ── ERROR STATE WITH RECOVERY ── */}
      {loadError && (
        <div
          className="bento-card"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangleIcon size={24} style={{ color: '#EF4444' }} />
            <div>
              <div style={{ fontWeight: 600, color: '#EF4444', fontSize: '0.875rem' }}>
                เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {loadError} — กำลังแสดงข้อมูลสำรองเพื่อความต่อเนื่องในการใช้งาน
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <RefreshCwIcon size={14} /> ลองเชื่อมต่อใหม่
          </button>
        </div>
      )}

      {/* ── 2. SPACE-EFFICIENT SEGMENTED STATION SWITCHER ── */}
      <StationSegmentedControl
        stations={stations}
        selectedStationId={selectedStation?.id || null}
        onSelectStation={(id) => setSelectedStationId(id)}
      />

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

      {/* ── 3. CENTRAL TELEMETRY CANVAS ── */}
      {selectedStation && (
        <div className={`dashboard-telemetry-container ${mobileTab === 'map' ? 'mobile-hidden' : ''}`}>
          <ErrorBoundary fallbackTitle="เกิดข้อผิดพลาดในการแสดงผลมาตรวัดสถานี">
            <StationTelemetryHub station={selectedStation} />
          </ErrorBoundary>
        </div>
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
              stations={stations}
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

      {/* ── 5. FLOATING COMMAND BAR / ACTION DOCK (Desktop only) ── */}
      <div className="desktop-only-action-dock">
        <FloatingActionDock
          stations={stations}
          selectedStationId={selectedStation?.id || null}
          onSelectStation={(id) => setSelectedStationId(id)}
          onRefresh={loadData}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
