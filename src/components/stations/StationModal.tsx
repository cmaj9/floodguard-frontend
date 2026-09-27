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
} from '../ui/Icons';

interface StationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Station> & { gateway_id: string }) => void;
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
};

export default function StationModal({ isOpen, onClose, onSave, station }: StationModalProps) {
  const isEdit = !!station;
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gateways, setGateways] = useState<GatewayOption[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [loadingNextId, setLoadingNextId] = useState(false);
  const [saving, setSaving] = useState(false);

  // Unified initial data loading when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (station) {
      // Edit mode: populate existing station data
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
        gatewayId: '',  // not editable in edit mode
        operatingStatus: (station.isActive ? 'active' : 'offline') as 'active' | 'offline',
      });
      setErrors({});
      setSaving(false);
    } else {
      // Create mode: load available gateways and next sequential station ID
      setLoadingGateways(true);
      setLoadingNextId(true);
      setErrors({});
      setSaving(false);

      // Pre-fill sensible default location coordinates (Pathum Thani area)
      setForm({
        ...defaultForm,
        lat: '14.0359',
        lng: '100.7252',
        province: 'ปทุมธานี',
      });

      Promise.allSettled([
        fetchGateways(),
        fetchNextStationId(),
      ]).then(([gwRes, nextIdRes]) => {
        const gws = gwRes.status === 'fulfilled' ? gwRes.value : [];
        const nextId = nextIdRes.status === 'fulfilled' ? nextIdRes.value : 'ST-003';
        setGateways(gws);
        setForm((prev) => ({
          ...prev,
          gatewayId: prev.gatewayId || (gws.length > 0 ? gws[0].gateway_id : 'GW-001'),
          deviceId: prev.deviceId || nextId,
        }));
      }).finally(() => {
        setLoadingGateways(false);
        setLoadingNextId(false);
      });
    }
  }, [isOpen, station]);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'กรุณากรอกชื่อสถานี';
    if (!form.lat || isNaN(Number(form.lat))) e.lat = 'กรุณากรอกละติจูดเป็นตัวเลขทศนิยม';
    if (!form.lng || isNaN(Number(form.lng))) e.lng = 'กรุณากรอกลองจิจูดเป็นตัวเลขทศนิยม';
    if (!form.sensorToRefDistance || isNaN(Number(form.sensorToRefDistance)) || Number(form.sensorToRefDistance) <= 0) {
      e.sensorToRefDistance = 'กรุณากรอกระยะจากเซนเซอร์ถึงจุดอ้างอิงเป็นตัวเลขมากกว่า 0 (เมตร)';
    }
    if (!isEdit && !form.gatewayId && gateways.length === 0) {
      e.gatewayId = 'กรุณาเลือก Gateway';
    }
    setErrors(e);
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
      title={isEdit ? `แก้ไขสถานีตรวจวัด ${station?.name || ''}` : 'ลงทะเบียนเพิ่มสถานีตรวจวัดใหม่'}
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            * จำเป็นต้องระบุ
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '0.5rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, minWidth: 120 }}
            >
              {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'ลงทะเบียนสถานี'}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.25rem 0' }}>

        {/* API Error Banner */}
        {errors._api && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            color: '#EF4444',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}>
            {errors._api}
          </div>
        )}

        {/* ════════ SECTION 1: GENERAL & GPS ════════ */}
        <div
          style={{
            background: 'var(--card-surface)',
            border: '1px solid var(--card-border)',
            borderRadius: '1rem',
            padding: '1.25rem 1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              paddingBottom: '0.625rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <MapPinIcon size={18} style={{ color: 'var(--color-primary-dark)' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
              ข้อมูลทั่วไปและพิกัดสถานี
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem 1.25rem' }}>
            {/* Operating Status */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '0.4rem', display: 'block' }}>
                สถานะการให้บริการของสถานี
              </label>
              <div
                role="radiogroup"
                aria-label="สถานะการให้บริการ"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '9999px',
                  padding: '4px',
                  gap: '4px',
                }}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.operatingStatus === 'active'}
                  onClick={() => setForm((prev) => ({ ...prev, operatingStatus: 'active' }))}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                    borderRadius: '9999px',
                    border: form.operatingStatus === 'active' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid transparent',
                    background: form.operatingStatus === 'active' ? 'rgba(16, 185, 129, 0.22)' : 'transparent',
                    color: form.operatingStatus === 'active' ? '#10B981' : 'var(--text-muted)',
                    fontWeight: form.operatingStatus === 'active' ? 700 : 500,
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.18s ease',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: form.operatingStatus === 'active' ? '#10B981' : 'rgba(148, 163, 184, 0.4)' }} />
                  <span>ออนไลน์ (เปิดให้บริการ)</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.operatingStatus === 'offline'}
                  onClick={() => setForm((prev) => ({ ...prev, operatingStatus: 'offline' }))}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                    borderRadius: '9999px',
                    border: form.operatingStatus === 'offline' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid transparent',
                    background: form.operatingStatus === 'offline' ? 'rgba(245, 158, 11, 0.22)' : 'transparent',
                    color: form.operatingStatus === 'offline' ? '#F59E0B' : 'var(--text-muted)',
                    fontWeight: form.operatingStatus === 'offline' ? 700 : 500,
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.18s ease',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: form.operatingStatus === 'offline' ? '#F59E0B' : 'rgba(148, 163, 184, 0.4)' }} />
                  <span>ออฟไลน์ (ปิดบริการชั่วคราว)</span>
                </button>
              </div>
            </div>

            {/* Station Name */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '0.35rem' }}>
                ชื่อสถานีตรวจวัด *
              </label>
              <input
                className={`input ${errors.name ? 'input-error' : ''}`}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="เช่น สถานีริมคลองรังสิต ประตูน้ำจุฬาลงกรณ์"
                style={{ fontSize: '0.9375rem', padding: '0.65rem 0.875rem' }}
              />
              {errors.name && <div className="error-msg" style={{ marginTop: '0.25rem' }}>{errors.name}</div>}
            </div>

            {/* Station ID */}
            <div>
              <label className="label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '0.35rem' }}>
                รหัสสถานี (Station ID) {!isEdit && '*'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className={`input ${errors.deviceId ? 'input-error' : ''}`}
                  value={loadingNextId && !form.deviceId ? '' : form.deviceId}
                  onChange={(e) => set('deviceId', e.target.value)}
                  placeholder={loadingNextId ? 'กำลังโหลด...' : 'เช่น ST-001'}
                  disabled={isEdit}
                  style={{
                    fontSize: '0.9375rem', padding: '0.65rem 0.875rem',
                    fontFamily: 'monospace',
                    opacity: isEdit ? 0.5 : 1,
                    paddingRight: loadingNextId ? '2.5rem' : '0.875rem',
                  }}
                />
                {loadingNextId && (
                  <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ...
                  </span>
                )}
              </div>
              {isEdit && <div style={{ marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>ไม่สามารถเปลี่ยนรหัสสถานีได้</div>}
              {errors.deviceId && <div className="error-msg" style={{ marginTop: '0.25rem' }}>{errors.deviceId}</div>}
            </div>

            {/* Gateway Dropdown — Create only */}
            {!isEdit && (
              <div>
                <label className="label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <RadioIcon size={14} style={{ color: 'var(--color-primary-dark)' }} />
                  Gateway *
                </label>
                <select
                  className={`input ${errors.gatewayId ? 'input-error' : ''}`}
                  value={form.gatewayId}
                  onChange={(e) => set('gatewayId', e.target.value)}
                  disabled={loadingGateways}
                  style={{ fontSize: '0.9375rem', padding: '0.65rem 0.875rem', cursor: 'pointer' }}
                >
                  {loadingGateways ? (
                    <option>กำลังโหลด...</option>
                  ) : gateways.length === 0 ? (
                    <option value="GW-001">Gateway_01 (GW-001) — ค่าเริ่มต้น</option>
                  ) : (
                    <>
                      <option value="">-- เลือก Gateway --</option>
                      {gateways.map((gw) => (
                        <option key={gw.gateway_id} value={gw.gateway_id}>
                          {gw.gateway_name} ({gw.gateway_id}) {gw.status !== 'active' ? '— offline' : ''}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {errors.gatewayId && <div className="error-msg" style={{ marginTop: '0.25rem' }}>{errors.gatewayId}</div>}
              </div>
            )}

            {/* Location */}
            <div style={{ gridColumn: isEdit ? '1 / 2' : '1 / -1' }}>
              <label className="label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '0.35rem' }}>
                สถานที่ / จุดสังเกต
              </label>
              <input
                className="input"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="เช่น สะพานข้ามคลองหก มทร.ธัญบุรี"
                style={{ fontSize: '0.9375rem', padding: '0.65rem 0.875rem' }}
              />
            </div>

            {/* Province */}
            <div>
              <label className="label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '0.35rem' }}>
                จังหวัด
              </label>
              <input
                className="input"
                value={form.province}
                onChange={(e) => set('province', e.target.value)}
                placeholder="เช่น ปทุมธานี"
                style={{ fontSize: '0.9375rem', padding: '0.65rem 0.875rem' }}
              />
            </div>

            {/* District */}
            <div>
              <label className="label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '0.35rem' }}>
                อำเภอ / เขต
              </label>
              <input
                className="input"
                value={form.district}
                onChange={(e) => set('district', e.target.value)}
                placeholder="เช่น คลองหลวง หรือ ธัญบุรี"
                style={{ fontSize: '0.9375rem', padding: '0.65rem 0.875rem' }}
              />
            </div>

            {/* Latitude */}
            <div>
              <label className="label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '0.35rem' }}>
                ละติจูด (Latitude) *
              </label>
              <input
                className={`input ${errors.lat ? 'input-error' : ''}`}
                value={form.lat}
                onChange={(e) => set('lat', e.target.value)}
                placeholder="เช่น 14.03593"
                type="number"
                step="any"
                style={{ fontSize: '0.9375rem', padding: '0.65rem 0.875rem', fontFamily: 'monospace' }}
              />
              {errors.lat && <div className="error-msg" style={{ marginTop: '0.25rem' }}>{errors.lat}</div>}
            </div>

            {/* Longitude */}
            <div>
              <label className="label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '0.35rem' }}>
                ลองจิจูด (Longitude) *
              </label>
              <input
                className={`input ${errors.lng ? 'input-error' : ''}`}
                value={form.lng}
                onChange={(e) => set('lng', e.target.value)}
                placeholder="เช่น 100.72516"
                type="number"
                step="any"
                style={{ fontSize: '0.9375rem', padding: '0.65rem 0.875rem', fontFamily: 'monospace' }}
              />
              {errors.lng && <div className="error-msg" style={{ marginTop: '0.25rem' }}>{errors.lng}</div>}
            </div>
          </div>
        </div>

        {/* ════════ SECTION 2: REFERENCE POINT CALIBRATION ════════ */}
        <div
          style={{
            background: 'var(--card-surface)',
            border: '1px solid var(--card-border)',
            borderRadius: '1rem',
            padding: '1.25rem 1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '0.75rem', paddingBottom: '0.625rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SlidersIcon size={18} style={{ color: 'var(--color-primary-dark)' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
                จุดอ้างอิงระดับน้ำ
              </h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem 1.25rem' }}>
            <div>
              <label className="label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '0.35rem' }}>
                ชื่อเรียกจุดอ้างอิง
              </label>
              <input
                className="input"
                value={form.referencePointName}
                onChange={(e) => set('referencePointName', e.target.value)}
                placeholder="เช่น ขอบตลิ่ง, สันเขื่อน"
                style={{ fontSize: '0.9375rem', padding: '0.65rem 0.875rem' }}
              />
            </div>

            <div>
              <label className="label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '0.35rem' }}>
                ระยะเซนเซอร์ถึงจุดอ้างอิง (เมตร) *
              </label>
              <input
                className={`input ${errors.sensorToRefDistance ? 'input-error' : ''}`}
                value={form.sensorToRefDistance}
                onChange={(e) => set('sensorToRefDistance', e.target.value)}
                placeholder="เช่น 2.00"
                type="number"
                step="any"
                style={{ fontSize: '0.9375rem', padding: '0.65rem 0.875rem', fontFamily: 'monospace' }}
              />
              {errors.sensorToRefDistance && (
                <div className="error-msg" style={{ marginTop: '0.25rem' }}>{errors.sensorToRefDistance}</div>
              )}
            </div>
          </div>
        </div>

        {/* ════════ SECTION 3: ALERT THRESHOLDS ════════ */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '1rem',
            padding: '1.25rem 1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '1rem', paddingBottom: '0.625rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangleIcon size={18} style={{ color: '#F59E0B' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
                เกณฑ์การแจ้งเตือน
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(ไม่บังคับ)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem 1.25rem' }}>
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '0.75rem',
                padding: '1rem 1.125rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
                <label className="label" style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#F59E0B' }}>
                  ระดับเฝ้าระวัง (เมตร)
                </label>
              </div>
              <input
                className="input"
                value={form.warningLevel}
                onChange={(e) => set('warningLevel', e.target.value)}
                placeholder="-0.50"
                type="number"
                step="any"
                style={{
                  fontSize: '0.9375rem', padding: '0.65rem 0.875rem',
                  fontFamily: 'monospace',
                  background: 'rgba(15, 23, 42, 0.9)',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                }}
              />
            </div>

            <div
              style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '0.75rem',
                padding: '1rem 1.125rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                <label className="label" style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#EF4444' }}>
                  ระดับวิกฤต (เมตร)
                </label>
              </div>
              <input
                className="input"
                value={form.criticalLevel}
                onChange={(e) => set('criticalLevel', e.target.value)}
                placeholder="0.00"
                type="number"
                step="any"
                style={{
                  fontSize: '0.9375rem', padding: '0.65rem 0.875rem',
                  fontFamily: 'monospace',
                  background: 'rgba(15, 23, 42, 0.9)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
              />
            </div>
          </div>
        </div>

        {/* ════════ SECTION 4: DESCRIPTION ════════ */}
        <div>
          <label className="label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '0.35rem' }}>
            คำอธิบายเพิ่มเติม
          </label>
          <textarea
            className="input"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
            rows={2}
            style={{ fontSize: '0.9375rem', padding: '0.65rem 0.875rem', resize: 'vertical' }}
          />
        </div>
      </div>
    </Modal>
  );
}
