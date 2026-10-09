import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import type { Station } from '../../types';
import type { GatewayOption } from '../../services/apiService';
import { fetchGateways, fetchNextStationId } from '../../services/apiService';
import {
  MapPinIcon,
  SlidersIcon,
  AlertTriangleIcon,
  RadioIcon,
  CompassIcon,
} from '../ui/Icons';

interface StationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Station> & { gateway_id: string; tilt_offset_x?: number; tilt_offset_y?: number }) => void;
  station?: Station | null;
}

const defaultForm = {
  name: '',
  description: '',
  location: '',
  district: '',
  province: '',
  lat: '',
  lng: '',
  sensorToRefDistance: '2.00',
  referencePointName: 'จุดอ้างอิง',
  warningLevel: '',
  criticalLevel: '',
  deviceId: '',
  gatewayId: '',
  operatingStatus: 'active' as 'active' | 'offline',
  tiltOffsetX: '0.0',
  tiltOffsetY: '0.0',
};

export default function StationModal({ isOpen, onClose, onSave, station }: StationModalProps) {
  const isEdit = !!station;
  const [activeTab, setActiveTab] = useState<'general' | 'datum'>('general');
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gateways, setGateways] = useState<GatewayOption[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('general');

    if (station) {
      setForm({
        name: station.name,
        description: station.description || '',
        location: station.location || '',
        district: station.district || '',
        province: station.province || '',
        lat: String(station.lat ?? ''),
        lng: String(station.lng ?? ''),
        sensorToRefDistance: String(station.sensorToRefDistance ?? 2.0),
        referencePointName: station.referencePointName || 'จุดอ้างอิง',
        warningLevel: station.warningLevel != null ? String(station.warningLevel) : '',
        criticalLevel: station.criticalLevel != null ? String(station.criticalLevel) : '',
        deviceId: station.deviceId || station.id || '',
        gatewayId: '',
        operatingStatus: (station.isActive ? 'active' : 'offline') as 'active' | 'offline',
        tiltOffsetX:
          station.tiltOffsetX != null
            ? String(station.tiltOffsetX)
            : (station as any).tilt_offset_x != null
            ? String((station as any).tilt_offset_x)
            : '0.0',
        tiltOffsetY:
          station.tiltOffsetY != null
            ? String(station.tiltOffsetY)
            : (station as any).tilt_offset_y != null
            ? String((station as any).tilt_offset_y)
            : '0.0',
      });
      setErrors({});
      setSaving(false);
    } else {
      setLoadingGateways(true);
      setErrors({});
      setSaving(false);

      setForm({
        ...defaultForm,
        lat: '14.0359',
        lng: '100.7252',
        province: 'ปทุมธานี',
      });

      Promise.allSettled([fetchGateways(), fetchNextStationId()])
        .then(([gwRes, nextIdRes]) => {
          const gws = gwRes.status === 'fulfilled' ? gwRes.value : [];
          const nextId = nextIdRes.status === 'fulfilled' ? nextIdRes.value : 'ST-003';
          setGateways(gws);
          setForm((prev) => ({
            ...prev,
            gatewayId: prev.gatewayId || (gws.length > 0 ? gws[0].gateway_id : 'GW-001'),
            deviceId: prev.deviceId || nextId,
          }));
        })
        .finally(() => {
          setLoadingGateways(false);
        });
    }
  }, [isOpen, station]);

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'กรุณาระบุชื่อสถานี';
    if (!form.lat || isNaN(Number(form.lat))) e.lat = 'กรุณากรอกละติจูดเป็นตัวเลข';
    if (!form.lng || isNaN(Number(form.lng))) e.lng = 'กรุณากรอกลองจิจูดเป็นตัวเลข';
    if (!form.sensorToRefDistance || isNaN(Number(form.sensorToRefDistance)) || Number(form.sensorToRefDistance) <= 0) {
      e.sensorToRefDistance = 'กรุณากรอกระยะมากกว่า 0 เมตร';
    }
    if (!isEdit && !form.gatewayId && gateways.length === 0) {
      e.gatewayId = 'กรุณาเลือก Gateway';
    }
    setErrors(e);

    // If error belongs to a specific tab, switch tab automatically
    if (e.name || e.lat || e.lng || e.gatewayId || e.deviceId) {
      setActiveTab('general');
    } else if (e.sensorToRefDistance) {
      setActiveTab('datum');
    }

    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const refName = form.referencePointName.trim() !== '' ? form.referencePointName.trim() : 'จุดอ้างอิง';
    const effectiveGatewayId = form.gatewayId || (gateways.length > 0 ? gateways[0].gateway_id : 'GW-001');

    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim(),
        location: form.location.trim() || `${form.district.trim()} ${form.province.trim()}`.trim(),
        district: form.district.trim(),
        province: form.province.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        sensorToRefDistance: Number(form.sensorToRefDistance),
        referencePointName: refName,
        warningLevel: form.warningLevel.trim() !== '' && !isNaN(Number(form.warningLevel)) ? Number(form.warningLevel) : undefined,
        criticalLevel: form.criticalLevel.trim() !== '' && !isNaN(Number(form.criticalLevel)) ? Number(form.criticalLevel) : undefined,
        tiltOffsetX: form.tiltOffsetX.trim() !== '' && !isNaN(Number(form.tiltOffsetX)) ? Number(form.tiltOffsetX) : 0,
        tiltOffsetY: form.tiltOffsetY.trim() !== '' && !isNaN(Number(form.tiltOffsetY)) ? Number(form.tiltOffsetY) : 0,
        tilt_offset_x: form.tiltOffsetX.trim() !== '' && !isNaN(Number(form.tiltOffsetX)) ? Number(form.tiltOffsetX) : 0,
        tilt_offset_y: form.tiltOffsetY.trim() !== '' && !isNaN(Number(form.tiltOffsetY)) ? Number(form.tiltOffsetY) : 0,
        deviceId: form.deviceId.trim(),
        gateway_id: effectiveGatewayId,
        isActive: form.operatingStatus === 'active',
        operatingStatus: form.operatingStatus,
        status: 'normal',
      });
      onClose();
    } catch (err: any) {
      setErrors({ _api: err.message || 'บันทึกไม่สำเร็จ' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `แก้ไขสถานี ${station?.name || ''}` : 'ลงทะเบียนสถานีใหม่'}
      maxWidth="680px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            <span>ช่องที่มีเครื่องหมาย * ต้องระบุ</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={saving}
              style={{ padding: '6px 14px' }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '6px 18px', minWidth: 100 }}
            >
              {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'ลงทะเบียนสถานี'}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* API Error Banner */}
        {errors._api && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#F87171',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangleIcon size={16} />
            <span>{errors._api}</span>
          </div>
        )}

        {/* ── 2-Segmented VisionOS Tabs ── */}
        <div
          style={{
            display: 'flex',
            background: '#090E17',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            padding: 3,
            gap: 4,
          }}
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'general' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'general' ? '#38BDF8' : '#94A3B8',
              fontWeight: activeTab === 'general' ? 700 : 500,
              fontSize: 12.5,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <MapPinIcon size={14} />
            <span>1. ข้อมูลทั่วไปและพิกัด</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'datum'}
            onClick={() => setActiveTab('datum')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'datum' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'datum' ? '#38BDF8' : '#94A3B8',
              fontWeight: activeTab === 'datum' ? 700 : 500,
              fontSize: 12.5,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <SlidersIcon size={14} />
            <span>2. จุดอ้างอิงและเกณฑ์เตือนภัย</span>
          </button>
        </div>

        {/* ── TAB 1: GENERAL & GPS ── */}
        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Operating Status Switch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>
                สถานะการให้บริการ
              </span>
              <div
                style={{
                  display: 'inline-flex',
                  background: '#090E17',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 999,
                  padding: 2,
                  gap: 2,
                }}
              >
                <button
                  type="button"
                  onClick={() => setField('operatingStatus', 'active')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    border: 'none',
                    background: form.operatingStatus === 'active' ? 'rgba(16, 185, 129, 0.22)' : 'transparent',
                    color: form.operatingStatus === 'active' ? '#10B981' : '#64748B',
                    fontSize: 12,
                    fontWeight: form.operatingStatus === 'active' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: form.operatingStatus === 'active' ? '#10B981' : '#475569' }} />
                  <span>ออนไลน์</span>
                </button>
                <button
                  type="button"
                  onClick={() => setField('operatingStatus', 'offline')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    border: 'none',
                    background: form.operatingStatus === 'offline' ? 'rgba(245, 158, 11, 0.22)' : 'transparent',
                    color: form.operatingStatus === 'offline' ? '#F59E0B' : '#64748B',
                    fontSize: 12,
                    fontWeight: form.operatingStatus === 'offline' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: form.operatingStatus === 'offline' ? '#F59E0B' : '#475569' }} />
                  <span>ออฟไลน์</span>
                </button>
              </div>
            </div>

            {/* Station Name */}
            <div>
              <label className="label" style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'block' }}>
                ชื่อสถานีตรวจวัด *
              </label>
              <input
                className={`input ${errors.name ? 'input-error' : ''}`}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="เช่น สถานีริมคลองรังสิต ประตูน้ำจุฬาลงกรณ์"
                style={{ fontSize: 13, padding: '8px 12px' }}
              />
              {errors.name && <div className="error-msg" style={{ marginTop: 4 }}>{errors.name}</div>}
            </div>

            {/* Station ID & Gateway Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label className="label" style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'block' }}>
                  รหัสสถานี (Station ID) {!isEdit && '*'}
                </label>
                <input
                  className={`input ${errors.deviceId ? 'input-error' : ''}`}
                  value={form.deviceId}
                  onChange={(e) => setField('deviceId', e.target.value)}
                  placeholder="เช่น ST-001"
                  disabled={isEdit}
                  style={{
                    fontSize: 13,
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    opacity: isEdit ? 0.6 : 1,
                  }}
                />
                {errors.deviceId && <div className="error-msg" style={{ marginTop: 4 }}>{errors.deviceId}</div>}
              </div>

              {!isEdit ? (
                <div>
                  <label className="label" style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RadioIcon size={13} style={{ color: '#38BDF8' }} />
                    <span>เกตเวย์ (Gateway) *</span>
                  </label>
                  <select
                    className={`input ${errors.gatewayId ? 'input-error' : ''}`}
                    value={form.gatewayId}
                    onChange={(e) => setField('gatewayId', e.target.value)}
                    disabled={loadingGateways}
                    style={{ fontSize: 13, padding: '8px 12px' }}
                  >
                    {gateways.length === 0 ? (
                      <option value="GW-001">Gateway_01 (GW-001)</option>
                    ) : (
                      gateways.map((gw) => (
                        <option key={gw.gateway_id} value={gw.gateway_id}>
                          {gw.gateway_name} ({gw.gateway_id})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label" style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'block' }}>
                    สถานที่ / จุดสังเกต
                  </label>
                  <input
                    className="input"
                    value={form.location}
                    onChange={(e) => setField('location', e.target.value)}
                    placeholder="เช่น สะพานข้ามคลองหก"
                    style={{ fontSize: 13, padding: '8px 12px' }}
                  />
                </div>
              )}
            </div>

            {/* Coordinates: Latitude & Longitude */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label" style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'block' }}>
                  ละติจูด (Latitude) *
                </label>
                <input
                  className={`input ${errors.lat ? 'input-error' : ''}`}
                  value={form.lat}
                  onChange={(e) => setField('lat', e.target.value)}
                  placeholder="เช่น 14.0359"
                  type="number"
                  step="any"
                  style={{ fontSize: 13, padding: '8px 12px', fontFamily: 'monospace' }}
                />
                {errors.lat && <div className="error-msg" style={{ marginTop: 4 }}>{errors.lat}</div>}
              </div>

              <div>
                <label className="label" style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'block' }}>
                  ลองจิจูด (Longitude) *
                </label>
                <input
                  className={`input ${errors.lng ? 'input-error' : ''}`}
                  value={form.lng}
                  onChange={(e) => setField('lng', e.target.value)}
                  placeholder="เช่น 100.7252"
                  type="number"
                  step="any"
                  style={{ fontSize: 13, padding: '8px 12px', fontFamily: 'monospace' }}
                />
                {errors.lng && <div className="error-msg" style={{ marginTop: 4 }}>{errors.lng}</div>}
              </div>
            </div>

            {/* District & Province */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label" style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'block' }}>
                  อำเภอ / เขต
                </label>
                <input
                  className="input"
                  value={form.district}
                  onChange={(e) => setField('district', e.target.value)}
                  placeholder="เช่น คลองหลวง"
                  style={{ fontSize: 13, padding: '8px 12px' }}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'block' }}>
                  จังหวัด
                </label>
                <input
                  className="input"
                  value={form.province}
                  onChange={(e) => setField('province', e.target.value)}
                  placeholder="เช่น ปทุมธานี"
                  style={{ fontSize: 13, padding: '8px 12px' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: REFERENCE POINT & ALERT THRESHOLDS ── */}
        {activeTab === 'datum' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Reference Point Setup */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 10,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                <SlidersIcon size={14} />
                <span>จุดอ้างอิงระดับน้ำ (Datum)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'block' }}>
                    ชื่อเรียกจุดอ้างอิง
                  </label>
                  <input
                    className="input"
                    value={form.referencePointName}
                    onChange={(e) => setField('referencePointName', e.target.value)}
                    placeholder="เช่น ขอบตลิ่ง, สันเขื่อน"
                    style={{ fontSize: 13, padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'block' }}>
                    ระยะติดตั้งถึงจุดอ้างอิง (ม.) *
                  </label>
                  <input
                    className={`input ${errors.sensorToRefDistance ? 'input-error' : ''}`}
                    value={form.sensorToRefDistance}
                    onChange={(e) => setField('sensorToRefDistance', e.target.value)}
                    placeholder="เช่น 2.00"
                    type="number"
                    step="any"
                    style={{ fontSize: 13, padding: '8px 12px', fontFamily: 'monospace' }}
                  />
                  {errors.sensorToRefDistance && (
                    <div className="error-msg" style={{ marginTop: 4 }}>{errors.sensorToRefDistance}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Alert Thresholds */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 10,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangleIcon size={14} />
                <span>เกณฑ์เตือนภัยระดับน้ำ</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#FBBF24', marginBottom: 4, display: 'block' }}>
                    ระดับเฝ้าระวัง (ม.)
                  </label>
                  <input
                    className="input"
                    value={form.warningLevel}
                    onChange={(e) => setField('warningLevel', e.target.value)}
                    placeholder="-0.50"
                    type="number"
                    step="any"
                    style={{ fontSize: 13, padding: '8px 12px', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#F87171', marginBottom: 4, display: 'block' }}>
                    ระดับวิกฤต (ม.)
                  </label>
                  <input
                    className="input"
                    value={form.criticalLevel}
                    onChange={(e) => setField('criticalLevel', e.target.value)}
                    placeholder="0.00"
                    type="number"
                    step="any"
                    style={{ fontSize: 13, padding: '8px 12px', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </div>

            {/* Pole Tilt Zero-Reference Offset */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 10,
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CompassIcon size={14} />
                  <span>ระนาบตั้งต้นของเสา (ตรวจจับเสาเอียง &gt;15°)</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label" style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 4, display: 'block' }}>
                    แกน X อ้างอิง (°)
                  </label>
                  <input
                    className="input"
                    value={form.tiltOffsetX}
                    onChange={(e) => setField('tiltOffsetX', e.target.value)}
                    placeholder="0.0"
                    type="number"
                    step="0.1"
                    style={{ fontSize: 13, padding: '8px 12px', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 4, display: 'block' }}>
                    แกน Y อ้างอิง (°)
                  </label>
                  <input
                    className="input"
                    value={form.tiltOffsetY}
                    onChange={(e) => setField('tiltOffsetY', e.target.value)}
                    placeholder="0.0"
                    type="number"
                    step="0.1"
                    style={{ fontSize: 13, padding: '8px 12px', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {station && (station.tiltX != null || (station as any).tilt_x != null) && (
                <button
                  type="button"
                  onClick={() => {
                    const curX = station.tiltX ?? (station as any).tilt_x;
                    const curY = station.tiltY ?? (station as any).tilt_y;
                    if (curX != null && curY != null) {
                      setField('tiltOffsetX', String(curX));
                      setField('tiltOffsetY', String(curY));
                    }
                  }}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#38BDF8',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span>ใช้มุมปัจจุบันของเซนเซอร์ ({station.tiltX ?? (station as any).tilt_x}°, {station.tiltY ?? (station as any).tilt_y}°)</span>
                </button>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'block' }}>
                หมายเหตุเพิ่มเติม
              </label>
              <textarea
                className="input"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                rows={2}
                style={{ fontSize: 13, padding: '8px 12px', resize: 'vertical' }}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
