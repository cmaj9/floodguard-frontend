import { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import type { Station, NotificationSettings } from '../../types';
import {
  fetchNotificationSettings,
  updateNotificationSettings,
  resetStationNotificationSettings,
  fetchLineQuotaStatus,
  type LineQuotaStatus,
} from '../../services/apiService';
import {
  BellIcon,
  DropletsIcon,
  TrendingUpIcon,
  ClockIcon,
  ZapIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  ActivityIcon,
  MapPinIcon,
} from '../ui/Icons';

interface StationNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: Station | null; // null means global system default
  onSaved?: () => void;
}

interface NumberStepperInputProps {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  accentColor?: string;
  ariaLabel: string;
}

function NumberStepperInput({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  accentColor = '#38BDF8',
  ariaLabel,
}: NumberStepperInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localVal, setLocalVal] = useState<string>(String(value));

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(String(value));
    }
  }, [value, isFocused]);

  const handleDecrement = () => {
    const next = Math.max(min, Math.round((value - step) * 1000) / 1000);
    onChange(next);
    setLocalVal(String(next));
  };

  const handleIncrement = () => {
    const next = Math.min(max, Math.round((value + step) * 1000) / 1000);
    onChange(next);
    setLocalVal(String(next));
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localVal);
    if (isNaN(parsed)) {
      setLocalVal(String(value));
    } else {
      const clamped = Math.min(max, Math.max(min, Math.round(parsed * 1000) / 1000));
      onChange(clamped);
      setLocalVal(String(clamped));
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#090E17',
        border: `1px solid ${isFocused ? accentColor : 'rgba(255, 255, 255, 0.12)'}`,
        borderRadius: 8,
        padding: '2px 4px',
        gap: 3,
      }}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          background: 'rgba(255, 255, 255, 0.06)',
          border: 'none',
          color: value <= min ? '#475569' : '#FFFFFF',
          cursor: value <= min ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 700,
        }}
        aria-label={`ลดค่า ${ariaLabel}`}
      >
        -
      </button>

      <input
        type="number"
        value={localVal}
        step={step}
        min={min}
        max={max}
        aria-label={ariaLabel}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onChange={(e) => {
          setLocalVal(e.target.value);
          const num = parseFloat(e.target.value);
          if (!isNaN(num)) onChange(num);
        }}
        className="tabular-nums font-mono"
        style={{
          width: 52,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'center',
          padding: '2px 0',
        }}
      />

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          background: 'rgba(255, 255, 255, 0.06)',
          border: 'none',
          color: value >= max ? '#475569' : '#FFFFFF',
          cursor: value >= max ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 700,
        }}
        aria-label={`เพิ่มค่า ${ariaLabel}`}
      >
        +
      </button>

      <span
        style={{
          padding: '2px 6px',
          borderRadius: 5,
          background: `${accentColor}15`,
          color: accentColor,
          fontSize: 11,
          fontWeight: 700,
          marginLeft: 2,
        }}
      >
        {unit}
      </span>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, cursor: 'pointer', flexShrink: 0 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={ariaLabel}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          position: 'absolute',
          cursor: 'pointer',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: checked ? '#0284C7' : 'rgba(255, 255, 255, 0.12)',
          transition: 'all 0.18s ease',
          borderRadius: 22,
        }}
      >
        <span
          style={{
            position: 'absolute',
            height: 16,
            width: 16,
            left: checked ? 21 : 3,
            bottom: 3,
            backgroundColor: '#FFFFFF',
            transition: 'all 0.18s ease',
            borderRadius: '50%',
          }}
        />
      </span>
    </label>
  );
}

interface ConditionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description?: string;
  enabled: boolean;
  onToggle: (checked: boolean) => void;
  thresholdLabel: string;
  thresholdValue: number;
  onThresholdChange: (val: number) => void;
  thresholdMin: number;
  thresholdMax: number;
  thresholdStep: number;
  thresholdUnit: string;
  thresholdAccent: string;
  cooldownValue: number;
  onCooldownChange: (val: number) => void;
  cooldownMin?: number;
  cooldownMax?: number;
  cooldownStep?: number;
}

function ConditionCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  enabled,
  onToggle,
  thresholdLabel,
  thresholdValue,
  onThresholdChange,
  thresholdMin,
  thresholdMax,
  thresholdStep,
  thresholdUnit,
  thresholdAccent,
  cooldownValue,
  onCooldownChange,
  cooldownMin = 15,
  cooldownMax = 1440,
  cooldownStep = 15,
}: ConditionCardProps) {
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: iconBg,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
              {title}
            </span>
            {description && (
              <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                {description}
              </span>
            )}
          </div>
        </div>

        <ToggleSwitch checked={enabled} onChange={onToggle} ariaLabel={`เปิด/ปิด ${title}`} />
      </div>

      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 8,
          opacity: enabled ? 1 : 0.35,
          pointerEvents: enabled ? 'auto' : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            background: 'rgba(9, 14, 23, 0.6)',
            padding: '6px 10px',
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 11.5, color: '#94A3B8' }}>{thresholdLabel}</span>
          <NumberStepperInput
            value={thresholdValue}
            onChange={onThresholdChange}
            min={thresholdMin}
            max={thresholdMax}
            step={thresholdStep}
            unit={thresholdUnit}
            accentColor={thresholdAccent}
            ariaLabel={thresholdLabel}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            background: 'rgba(9, 14, 23, 0.6)',
            padding: '6px 10px',
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#94A3B8' }}>
            <ClockIcon size={12} style={{ color: '#64748B' }} />
            <span>เตือนซ้ำทุก</span>
          </div>
          <NumberStepperInput
            value={cooldownValue}
            onChange={onCooldownChange}
            min={cooldownMin}
            max={cooldownMax}
            step={cooldownStep}
            unit="นาที"
            accentColor="#0284C7"
            ariaLabel={`ความถี่เตือนซ้ำสำหรับ ${title}`}
          />
        </div>
      </div>
    </div>
  );
}

export default function StationNotificationModal({
  isOpen,
  onClose,
  station,
  onSaved,
}: StationNotificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'water' | 'device'>('water');
  const [lineQuota, setLineQuota] = useState<LineQuotaStatus | null>(null);

  const [settings, setSettings] = useState<NotificationSettings>({
    water_level_enabled: true,
    safety_offset: 0.0,
    water_level_cooldown_minutes: 30,
    rate_of_rise_enabled: true,
    rate_of_rise_threshold: 0.3,
    rate_of_rise_cooldown_minutes: 30,
    offline_timeout_enabled: true,
    offline_timeout_minutes: 30,
    offline_cooldown_minutes: 60,
    battery_low_enabled: true,
    battery_low_threshold: 20,
    battery_low_cooldown_minutes: 120,
    geofence_enabled: true,
    geofence_radius_meters: 100,
    geofence_cooldown_minutes: 60,
    is_custom: false,
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setSaveSuccess(false);
    try {
      const [data, quotaData] = await Promise.allSettled([
        fetchNotificationSettings(station?.id),
        fetchLineQuotaStatus(),
      ]);
      if (data.status === 'fulfilled') {
        setSettings(data.value);
      } else {
        throw new Error(data.reason?.message || 'ไม่สามารถโหลดข้อมูลการตั้งค่าได้');
      }
      if (quotaData.status === 'fulfilled') {
        setLineQuota(quotaData.value);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถโหลดข้อมูลการตั้งค่าได้');
    } finally {
      setLoading(false);
    }
  }, [station?.id]);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);
    try {
      const updated = await updateNotificationSettings(settings, station?.id);
      setSettings(updated);
      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToGlobal = async () => {
    if (!station) return;
    const ok = window.confirm('ต้องการคืนค่าการแจ้งเตือนกลับเป็นค่าเริ่มต้นส่วนกลาง?');
    if (!ok) return;

    setResetting(true);
    setErrorMsg(null);
    try {
      await resetStationNotificationSettings(station.id);
      await loadSettings();
      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'รีเซ็ตไม่สำเร็จ');
    } finally {
      setResetting(false);
    }
  };

  const modalTitle = station
    ? `ตั้งค่าการแจ้งเตือน · ${station.name}`
    : 'ตั้งค่าการแจ้งเตือนส่วนกลาง';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="680px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 10 }}>
          <div>
            {station && settings.is_custom && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetToGlobal}
                disabled={resetting || saving}
                style={{ fontSize: 11.5, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <RefreshCwIcon size={12} />
                <span>{resetting ? 'กำลังคืนค่า...' : 'คืนค่าส่วนกลาง'}</span>
              </button>
            )}
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
              disabled={saving || loading}
              style={{ padding: '6px 18px', minWidth: 100, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <BellIcon size={14} />
              <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {saveSuccess && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <CheckCircleIcon size={15} />
            <span>บันทึกการตั้งค่าเกณฑ์การแจ้งเตือนเรียบร้อยแล้ว</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
            }}
          >
            <AlertTriangleIcon size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* LINE Quota Alert Banner */}
        {lineQuota?.isExceeded && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <AlertTriangleIcon size={14} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#F87171' }}>
                  โควตาส่งข้อความ LINE OA ประจำเดือนเต็มแล้ว
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 9999,
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#FCA5A5',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                  }}
                >
                  {lineQuota.used}/{lineQuota.total} ข้อความ
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, lineHeight: 1.4 }}>
                ระบบไม่สามารถส่งการแจ้งเตือนพุชเข้า LINE ได้เนื่องจากแพ็กเกจฟรีเต็ม 300 ข้อความ กรุณาอัปเกรดบน LINE Official Account Manager หรือรอรีเซ็ตวันแรกของเดือนถัดไป
              </span>
            </div>
          </div>
        )}

        {lineQuota && !lineQuota.isExceeded && typeof lineQuota.total === 'number' && lineQuota.total > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: 11.5,
              color: '#94A3B8',
            }}
          >
            <span>โควตาส่งข้อความ LINE OA ประจำเดือน</span>
            <span style={{ color: '#38BDF8', fontWeight: 600, fontFamily: 'monospace' }}>
              ใช้ไป {lineQuota.used}/{lineQuota.total} · คงเหลือ {lineQuota.remaining}
            </span>
          </div>
        )}

        {/* Category Tabs */}
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
            aria-selected={activeTab === 'water'}
            onClick={() => setActiveTab('water')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'water' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'water' ? '#38BDF8' : '#94A3B8',
              fontWeight: activeTab === 'water' ? 700 : 500,
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            <DropletsIcon size={14} />
            <span>ระดับน้ำและอุทกวิทยา</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'device'}
            onClick={() => setActiveTab('device')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'device' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              color: activeTab === 'device' ? '#C084FC' : '#94A3B8',
              fontWeight: activeTab === 'device' ? 700 : 500,
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            <ActivityIcon size={14} />
            <span>อุปกรณ์และระบบเครือข่าย</span>
          </button>
        </div>

        {/* Tab Content: Water Level */}
        {activeTab === 'water' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ConditionCard
              icon={<DropletsIcon size={16} />}
              iconBg="rgba(14, 165, 233, 0.12)"
              iconColor="#0EA5E9"
              title="ระดับน้ำแตะเกณฑ์เฝ้าระวังหรือวิกฤต"
              description="เตือนเมื่อระดับน้ำแตะหรือเกินเกณฑ์ของสถานี"
              enabled={settings.water_level_enabled}
              onToggle={(checked) => setSettings((prev) => ({ ...prev, water_level_enabled: checked }))}
              thresholdLabel="ระยะชดเชยความปลอดภัย"
              thresholdValue={settings.safety_offset}
              onThresholdChange={(val) => setSettings((prev) => ({ ...prev, safety_offset: val }))}
              thresholdMin={-2.0}
              thresholdMax={2.0}
              thresholdStep={0.05}
              thresholdUnit="ม."
              thresholdAccent="#0EA5E9"
              cooldownValue={settings.water_level_cooldown_minutes ?? 30}
              onCooldownChange={(val) => setSettings((prev) => ({ ...prev, water_level_cooldown_minutes: val }))}
            />

            <ConditionCard
              icon={<TrendingUpIcon size={16} />}
              iconBg="rgba(245, 158, 11, 0.12)"
              iconColor="#F59E0B"
              title="อัตราการเพิ่มขึ้นฉับพลัน (Rate of Rise)"
              description="เตือนเมื่อระดับน้ำเพิ่มขึ้นรวดเร็วผิดปกติ"
              enabled={settings.rate_of_rise_enabled}
              onToggle={(checked) => setSettings((prev) => ({ ...prev, rate_of_rise_enabled: checked }))}
              thresholdLabel="น้ำเพิ่มขึ้นเกินกว่า"
              thresholdValue={settings.rate_of_rise_threshold}
              onThresholdChange={(val) => setSettings((prev) => ({ ...prev, rate_of_rise_threshold: val }))}
              thresholdMin={0.05}
              thresholdMax={2.0}
              thresholdStep={0.05}
              thresholdUnit="ม./ชม."
              thresholdAccent="#F59E0B"
              cooldownValue={settings.rate_of_rise_cooldown_minutes ?? 30}
              onCooldownChange={(val) => setSettings((prev) => ({ ...prev, rate_of_rise_cooldown_minutes: val }))}
            />
          </div>
        )}

        {/* Tab Content: Device Health */}
        {activeTab === 'device' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ConditionCard
              icon={<ClockIcon size={16} />}
              iconBg="rgba(239, 68, 68, 0.12)"
              iconColor="#EF4444"
              title="ขาดการติดต่อเกินเวลาที่กำหนด (Offline Timeout)"
              description="เตือนเมื่อสถานีหยุดส่งสัญญาณเข้าสู่ระบบ"
              enabled={settings.offline_timeout_enabled}
              onToggle={(checked) => setSettings((prev) => ({ ...prev, offline_timeout_enabled: checked }))}
              thresholdLabel="หยุดส่งสัญญาณเกิน"
              thresholdValue={settings.offline_timeout_minutes}
              onThresholdChange={(val) => setSettings((prev) => ({ ...prev, offline_timeout_minutes: val }))}
              thresholdMin={5}
              thresholdMax={720}
              thresholdStep={5}
              thresholdUnit="นาที"
              thresholdAccent="#EF4444"
              cooldownValue={settings.offline_cooldown_minutes ?? 60}
              onCooldownChange={(val) => setSettings((prev) => ({ ...prev, offline_cooldown_minutes: val }))}
            />

            <ConditionCard
              icon={<ZapIcon size={16} />}
              iconBg="rgba(245, 158, 11, 0.12)"
              iconColor="#F59E0B"
              title="ระดับแบตเตอรี่ต่ำ (Battery Low)"
              description="เตือนเมื่อพลังงานสำรองของสถานีใกล้หมด"
              enabled={settings.battery_low_enabled}
              onToggle={(checked) => setSettings((prev) => ({ ...prev, battery_low_enabled: checked }))}
              thresholdLabel="แบตเตอรี่ต่ำกว่า"
              thresholdValue={settings.battery_low_threshold}
              onThresholdChange={(val) => setSettings((prev) => ({ ...prev, battery_low_threshold: val }))}
              thresholdMin={5}
              thresholdMax={50}
              thresholdStep={5}
              thresholdUnit="%"
              thresholdAccent="#F59E0B"
              cooldownValue={settings.battery_low_cooldown_minutes ?? 120}
              onCooldownChange={(val) => setSettings((prev) => ({ ...prev, battery_low_cooldown_minutes: val }))}
              cooldownMin={30}
              cooldownStep={30}
            />

            <ConditionCard
              icon={<MapPinIcon size={16} />}
              iconBg="rgba(168, 85, 247, 0.12)"
              iconColor="#A855F7"
              title="ตรวจจับการเคลื่อนที่ (Geofence)"
              description="เตือนเมื่อเสาหรืออุปกรณ์ขยับออกนอกรัศมีพิกัด"
              enabled={settings.geofence_enabled}
              onToggle={(checked) => setSettings((prev) => ({ ...prev, geofence_enabled: checked }))}
              thresholdLabel="ขยับออกนอกรัศมีเกิน"
              thresholdValue={settings.geofence_radius_meters}
              onThresholdChange={(val) => setSettings((prev) => ({ ...prev, geofence_radius_meters: val }))}
              thresholdMin={10}
              thresholdMax={1000}
              thresholdStep={10}
              thresholdUnit="ม."
              thresholdAccent="#A855F7"
              cooldownValue={settings.geofence_cooldown_minutes ?? 60}
              onCooldownChange={(val) => setSettings((prev) => ({ ...prev, geofence_cooldown_minutes: val }))}
              cooldownMin={15}
              cooldownStep={15}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
