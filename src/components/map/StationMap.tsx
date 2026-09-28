import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Station } from '../../types';
import {
  MapPinIcon,
  BatteryChargingIcon,
  BatteryLowIcon,
  GlobeIcon,
  LayersIcon,
  CompassIcon,
} from '../ui/Icons';

// Fix default marker icon issue with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function getMarkerColor(station: Station, isSelected: boolean) {
  if (isSelected) return '#2563EB'; // Royal blue
  if (station.status === 'critical') return '#ef4444'; // Red
  if (station.status === 'warning') return '#f59e0b'; // Amber
  if (!station.isActive) return '#64748b'; // Offline slate

  const typeStr = (station.stationType || '').toLowerCase();
  const nameStr = station.name.toLowerCase();

  if (typeStr.includes('static') || typeStr.includes('rs') || nameStr.includes('laser') || nameStr.includes('radar')) {
    return '#0EA5E9'; // Sky blue
  }
  if (typeStr.includes('ลอย') || typeStr.includes('float')) {
    return '#38bdf8'; // Sky
  }
  return '#c084fc'; // Purple
}

function createCustomIcon(station: Station, isSelected: boolean) {
  const color = getMarkerColor(station, isSelected);
  const size = isSelected ? 18 : 14;

  return L.divIcon({
    className: 'custom-station-pin',
    html: `
      <div style="
        position: relative;
        width: ${size + 16}px;
        height: ${size + 16}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${
          isSelected || station.status === 'critical'
            ? `
          <div style="
            position: absolute;
            width: 100%;
            height: 100%;
            background: ${color};
            border-radius: 50%;
            opacity: 0.4;
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
        `
            : ''
        }
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        "></div>
      </div>
    `,
    iconSize: [size + 16, size + 16],
    iconAnchor: [(size + 16) / 2, (size + 16) / 2],
    popupAnchor: [0, -(size + 16) / 2],
  });
}

function MapEffects({
  stations,
  selectedStation,
}: {
  stations: Station[];
  selectedStation?: string | null;
}) {
  const map = useMap();
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      if (selectedStation && selectedStation !== prevSelectedRef.current) {
        prevSelectedRef.current = selectedStation;
        const st = stations.find((s) => s.id === selectedStation);
        if (st && !isNaN(Number(st.lat)) && !isNaN(Number(st.lng))) {
          map.flyTo([Number(st.lat), Number(st.lng)], 14, { animate: true, duration: 1.2 });
        }
      } else if (!selectedStation && stations.length > 0 && !prevSelectedRef.current) {
        const validPoints = stations
          .filter((s) => s && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)) && Number(s.lat) !== 0 && Number(s.lng) !== 0)
          .map((s) => [Number(s.lat), Number(s.lng)] as [number, number]);

        if (validPoints.length > 0) {
          const bounds = L.latLngBounds(validPoints);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
        }
      }
    } catch (e) {
      console.warn('[MapEffects] Leaflet error handled:', e);
    }
  }, [stations, selectedStation, map]);

  return null;
}

function ResetBoundsButton({ stations }: { stations: Station[] }) {
  const map = useMap();

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const validPoints = stations
        .filter((s) => s && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)) && Number(s.lat) !== 0 && Number(s.lng) !== 0)
        .map((s) => [Number(s.lat), Number(s.lng)] as [number, number]);

      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    } catch (e) {
      console.warn('[ResetBoundsButton] Error handled:', e);
    }
  };

  return (
    <button
      type="button"
      onClick={handleReset}
      title="จัดตำแหน่งกึ่งกลางแผนที่"
      aria-label="จัดตำแหน่งกึ่งกลางแผนที่"
      style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        zIndex: 400,
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: '#111827',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#38bdf8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#1E293B';
        e.currentTarget.style.color = '#FFFFFF';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#111827';
        e.currentTarget.style.color = '#38bdf8';
      }}
    >
      <CompassIcon size={18} />
    </button>
  );
}

interface StationMapProps {
  stations: Station[];
  selectedStation?: string | null;
  onSelectStation?: (id: string) => void;
  height?: string;
  showCardHeader?: boolean;
}

export default function StationMap({
  stations,
  selectedStation,
  onSelectStation,
  height = '100%',
  showCardHeader = true,
}: StationMapProps) {
  // Default center around Ayutthaya / Chao Phraya basin
  const defaultCenter: [number, number] = [14.42, 100.388];

  const [mapLayer, setMapLayer] = useState<'dark' | 'satellite'>('dark');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: height,
        width: '100%',
        background: '#111827',
        borderRadius: '1.25rem',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* ── Optional Map Header (Matching Reference Screenshot "แผนที่ภูมิศาสตร์") ── */}
      {showCardHeader && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            background: '#111827',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          {/* Left Title with Globe Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ color: '#38BDF8', display: 'flex', alignItems: 'center' }}>
              <GlobeIcon size={18} />
            </div>
            <h2
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: '#F8FAFC',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              แผนที่จุดตรวจวัด
            </h2>
          </div>

          {/* Right Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setMapLayer('dark')}
              title="สลับเป็นแผนที่ดาร์กโหมด (Dark Gray)"
              aria-label="สลับเป็นแผนที่ดาร์กโหมด"
              style={{
                background: mapLayer === 'dark' ? '#2563EB' : 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${mapLayer === 'dark' ? '#2563EB' : 'rgba(255, 255, 255, 0.1)'}`,
                color: mapLayer === 'dark' ? '#FFFFFF' : '#94A3B8',
                padding: '0.35rem 0.65rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <LayersIcon size={14} />
              <span>แผนที่มืด</span>
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('satellite')}
              title="สลับเป็นภาพถ่ายดาวเทียม"
              aria-label="สลับเป็นภาพถ่ายดาวเทียม"
              style={{
                background: mapLayer === 'satellite' ? '#2563EB' : 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${mapLayer === 'satellite' ? '#2563EB' : 'rgba(255, 255, 255, 0.1)'}`,
                color: mapLayer === 'satellite' ? '#FFFFFF' : '#94A3B8',
                padding: '0.35rem 0.65rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <GlobeIcon size={14} />
              <span>ดาวเทียม</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Map Container Canvas ── */}
      <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: '380px' }}>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: '100%', width: '100%', background: '#080C14' }}
          zoomControl={true}
        >
          {mapLayer === 'dark' ? (
            <>
              {/* Esri World Dark Gray Base (100% Free, No API Key Required, Clean Dark GIS) */}
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; <a href="https://www.esri.com/">Esri</a> &copy; OpenStreetMap'
                maxZoom={16}
              />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                maxZoom={16}
              />
            </>
          ) : (
            /* Esri World Imagery (High-res satellite, 100% Free, No API Key) */
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Earthstar Geographics'
              maxZoom={18}
            />
          )}

          <MapEffects stations={stations} selectedStation={selectedStation} />
          <ResetBoundsButton stations={stations} />

          {stations
            .filter((s) => s && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)) && Number(s.lat) !== 0 && Number(s.lng) !== 0)
            .map((station) => {
              const isSelected = selectedStation === station.id;
              return (
                <Marker
                  key={station.id}
                  position={[Number(station.lat), Number(station.lng)]}
                icon={createCustomIcon(station, isSelected)}
                eventHandlers={{
                  click: () => onSelectStation?.(station.id),
                }}
              >
                <Popup>
                  <div style={{ minWidth: 200, fontFamily: 'inherit', color: '#0F172A' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#0F172A' }}>
                      {station.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#64748B',
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <MapPinIcon size={12} />
                      <span>
                        {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>ระดับน้ำเทียบ{station.referencePointName || 'จุดอ้างอิง'}</span>
                      <strong style={{ color: !station.isActive || station.operatingStatus === 'offline' ? '#64748B' : station.currentLevel > 0 ? '#EF4444' : '#0369A1' }}>
                        {!station.isActive || station.operatingStatus === 'offline'
                          ? '-'
                          : `${station.currentLevel > 0 ? '+' : ''}${station.currentLevel.toFixed(2)} ม.`}
                      </strong>
                    </div>
                    {station.rawDistance !== undefined && station.rawDistance !== null && station.isActive && station.operatingStatus !== 'offline' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 4 }}>
                        <span>ระยะเซนเซอร์วัดได้</span>
                        <span>{Number(station.rawDistance).toFixed(2)} ม.</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>สถานะ</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            !station.isActive || station.operatingStatus === 'offline'
                              ? '#64748B'
                              : station.status === 'critical'
                              ? '#EF4444'
                              : station.status === 'warning'
                              ? '#F59E0B'
                              : '#10B981',
                        }}
                      >
                        {!station.isActive || station.operatingStatus === 'offline'
                          ? 'ออฟไลน์'
                          : station.status === 'critical'
                          ? 'วิกฤต'
                          : station.status === 'warning'
                          ? 'เฝ้าระวัง'
                          : 'ปกติ'}
                      </span>
                    </div>
                    {station.batteryPercent !== undefined && (
                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 6,
                          borderTop: '1px solid #E2E8F0',
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          color: '#475569',
                        }}
                      >
                        {station.batteryPercent > 20 ? <BatteryChargingIcon size={12} /> : <BatteryLowIcon size={12} />}
                        <span>แบตเตอรี่ {station.batteryPercent}%</span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
