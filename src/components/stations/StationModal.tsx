import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import type { Station } from '../../types';
import type { GatewayOption } from '../../services/apiService';
import { fetchGateways, fetchNextStationId, checkChirpstackDevice } from '../../services/apiService';
import {
  MapPinIcon,
  SlidersIcon,
  AlertTriangleIcon,
  RadioIcon,
  CompassIcon,
  CpuIcon,
  CheckCircleIcon,
  InfoIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from '../ui/Icons';

interface StationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Station> & {
    gateway_id: string;
    tilt_offset_x?: number;
    tilt_offset_y?: number;
    dev_eui?: string;
    payload_id?: string;
  }) => void;
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
  devEui: '',
  payloadId: '',
};

export default function StationModal({ isOpen, onClose, onSave, station }: StationModalProps) {
  const isEdit = !!station;
  const [activeTab, setActiveTab] = useState<'general' | 'datum'>('general');
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gateways, setGateways] = useState<GatewayOption[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chirpstackStatus, setChirpstackStatus] = useState<{
    loading: boolean;
    checked: boolean;
    found: boolean | null;
    configured: boolean;
    name?: string;
    lastSeenAt?: string;
    message?: string;
  }>({
    loading: false,
    checked: false,
    found: null,
    configured: true,
  });

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('general');
    setChirpstackStatus({
      loading: false,
      checked: false,
      found: null,
      configured: true,
    });

    if (station) {
      let suggestedPayloadId = station.payloadId || '';
      if (!suggestedPayloadId && (station.id || station.deviceId)) {
        const targetId = station.deviceId || station.id || '';
        const numMatch = targetId.match(/^ST-([0-9]+)$/i);
        if (numMatch) suggestedPayloadId = String(parseInt(numMatch[1], 10));
      }

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
        operatingStatus: ((station.manualStatus || (station.isActive ? 'active' : 'offline')) === 'offline' ? 'offline' : 'active') as 'active' | 'offline',
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
        devEui: station.devEui || '',
        payloadId: suggestedPayloadId,
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
          let autoPayloadId = '';
          const numMatch = nextId.match(/^ST-([0-9]+)$/i);
          if (numMatch) autoPayloadId = String(parseInt(numMatch[1], 10));

          setGateways(gws);
          setForm((prev) => ({
            ...prev,
            gatewayId: prev.gatewayId || (gws.length > 0 ? gws[0].gateway_id : 'GW-001'),
            deviceId: prev.deviceId || nextId,
            payloadId: prev.payloadId || autoPayloadId,
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

  const handleDevEuiChange = (val: string) => {
    // Sanitize to lowercase hex, max 16 chars
    const clean = val.toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 16);
    setField('devEui', clean);
    if (chirpstackStatus.checked) {
      setChirpstackStatus({ loading: false, checked: false, found: null, configured: true });
    }
  };

  const handleVerifyChirpstack = async () => {
    const clean = form.devEui.trim();
    if (!clean || clean.length !== 16) {
      setErrors((prev) => ({ ...prev, devEui: 'กรุณากรอก DevEUI ให้ครบ 16 หลักฐาน 16 ก่อนตรวจสอบ' }));
      return;
    }
    setErrors((prev) => ({ ...prev, devEui: '' }));
    setChirpstackStatus({ loading: true, checked: false, found: null, configured: true });
    try {
      const res = await checkChirpstackDevice(clean);
      setChirpstackStatus({
        loading: false,
        checked: true,
        found: res.found,
        configured: res.configured ?? true,
        name: res.name,
        lastSeenAt: res.lastSeenAt,
        message: res.message,
      });
    } catch (err: any) {
      setChirpstackStatus({
        loading: false,
        checked: true,
        found: false,
        configured: true,
        message: err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อตรวจสอบได้',
      });
    }
  };

  const formatLastSeen = (isoString?: string) => {
    if (!isoString) return 'ยังไม่เคยรับสัญญาณ';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'ไม่ระบุเวลา';
      return d.toLocaleString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
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

    const cleanDev = form.devEui.trim();
    if (cleanDev) {
      if (!/^[0-9a-fA-F]{16}$/.test(cleanDev)) {
        e.devEui = 'DevEUI ต้องเป็นเลขฐาน 16 จำนวน 16 หลัก (เช่น 65bcbb52145372b1)';
      }
    }

    if (!cleanDev && !form.payloadId.trim()) {
      e.devEui = 'กรุณาระบุอย่างน้อย 1 อย่าง: LoRaWAN DevEUI หรือ Payload ID เพื่อผูกกับอุปกรณ์';
    }

    setErrors(e);

    // If error belongs to a specific tab, switch tab automatically
    if (e.name || e.lat || e.lng || e.gatewayId || e.deviceId || e.devEui || e.payloadId) {
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
        devEui: form.devEui.trim().toLowerCase(),
        payloadId: form.payloadId.trim(),
        dev_eui: form.devEui.trim().toLowerCase() || undefined,
        payload_id: form.payloadId.trim() || undefined,
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
            background: 'rgba(255, 255, 255, 0.04)',
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
                  background: 'rgba(255, 255, 255, 0.04)',
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

            {/* ── Hardware & ChirpStack Device Mapping Section ── */}
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.03)',
                border: '1px solid rgba(56, 189, 248, 0.15)',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CpuIcon size={15} style={{ color: '#38BDF8' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>
                    การเชื่อมต่ออุปกรณ์ฮาร์ดแวร์ (ChirpStack LoRaWAN)
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#38BDF8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: 999 }}>
                  จับคู่สถานีอัตโนมัติ
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {/* LoRaWAN DevEUI */}
                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>LoRaWAN DevEUI (16 Hex)</span>
                    <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>มาตรฐาน ChirpStack</span>
                  </label>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                    <input
                      className={`input ${errors.devEui ? 'input-error' : ''}`}
                      value={form.devEui}
                      onChange={(e) => handleDevEuiChange(e.target.value)}
                      placeholder="เช่น 65bcbb52145372b1"
                      maxLength={16}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        padding: '8px 12px',
                        fontFamily: 'monospace',
                        letterSpacing: '0.05em',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyChirpstack}
                      disabled={chirpstackStatus.loading || form.devEui.length !== 16}
                      title="ตรวจสอบกับระบบ ChirpStack LNS"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '0 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        background: 'rgba(56, 189, 248, 0.1)',
                        color: '#38BDF8',
                        cursor: (chirpstackStatus.loading || form.devEui.length !== 16) ? 'not-allowed' : 'pointer',
                        opacity: (chirpstackStatus.loading || form.devEui.length !== 16) ? 0.45 : 1,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {chirpstackStatus.loading ? (
                        <>
                          <RefreshCwIcon size={13} className="animate-spin" />
                          <span>ตรวจ...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheckIcon size={13} />
                          <span>ตรวจกับ LNS</span>
                        </>
                      )}
                    </button>
                  </div>

                  {errors.devEui && <div className="error-msg" style={{ marginTop: 4 }}>{errors.devEui}</div>}

                  {/* Verification Status Card (No emojis, no text overflow) */}
                  {chirpstackStatus.checked && (
                    <div style={{ marginTop: 6 }}>
                      {chirpstackStatus.found === true && (
                        <div
                          style={{
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            borderRadius: 8,
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}
                        >
                          <CheckCircleIcon size={15} style={{ color: '#10B981', flexShrink: 0, marginTop: 2 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#10B981', lineHeight: 1.3 }}>
                              พบอุปกรณ์ในระบบ ChirpStack
                            </div>
                            <div style={{ fontSize: 11, color: '#E2E8F0', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              ชื่ออุปกรณ์: <span style={{ fontFamily: 'monospace', color: '#6EE7B7' }}>{chirpstackStatus.name || form.devEui}</span>
                            </div>
                            {chirpstackStatus.lastSeenAt && (
                              <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 1 }}>
                                สัญญาณล่าสุด: {formatLastSeen(chirpstackStatus.lastSeenAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {chirpstackStatus.found === false && chirpstackStatus.configured && (
                        <div
                          style={{
                            background: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: 8,
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}
                        >
                          <AlertTriangleIcon size={15} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B', lineHeight: 1.3 }}>
                              ไม่พบอุปกรณ์ใน ChirpStack
                            </div>
                            <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2, wordBreak: 'break-word', lineHeight: 1.35 }}>
                              กรุณาตรวจสอบว่าสร้างอุปกรณ์บน ChirpStack Web UI เรียบร้อยแล้ว
                            </div>
                          </div>
                        </div>
                      )}

                      {!chirpstackStatus.configured && (
                        <div
                          style={{
                            background: 'rgba(148, 163, 184, 0.08)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 8,
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}
                        >
                          <InfoIcon size={15} style={{ color: '#94A3B8', flexShrink: 0, marginTop: 2 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', lineHeight: 1.3 }}>
                              เชื่อมต่อข้อมูลผ่าน Webhook
                            </div>
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, wordBreak: 'break-word', lineHeight: 1.35 }}>
                              บันทึก DevEUI นี้ได้ทันที ระบบจะรับและจัดเก็บข้อมูลเมื่อมีสัญญาณเข้าผ่าน Webhook
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                    รหัสประจำตัวอุปกรณ์ 16 หลักจาก ChirpStack
                  </div>
                </div>

                {/* Payload ID */}
                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Payload ID (Byte 0)</span>
                    <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>รหัสในเฟิร์มแวร์</span>
                  </label>
                  <input
                    className="input"
                    value={form.payloadId}
                    onChange={(e) => setField('payloadId', e.target.value)}
                    placeholder="เช่น 1, 2, 3"
                    style={{
                      fontSize: 13,
                      padding: '8px 12px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                    รหัสสถานีที่ระบุในไบต์ที่ 0 ของข้อมูล LoRaWAN
                  </div>
                </div>
              </div>
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
