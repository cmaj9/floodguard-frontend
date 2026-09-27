import { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import type { Station, NotificationSettings } from '../../types';
import {
  fetchNotificationSettings,
  updateNotificationSettings,
  resetStationNotificationSettings,
} from '../../services/apiService';
import {
  BellIcon,
  DropletsIcon,
  TrendingUpIcon,
  ClockIcon,
  ZapIcon,
  MapPinIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    } else if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.85)',
        border: `1.5px solid ${isFocused ? accentColor : 'rgba(255, 255, 255, 0.14)'}`,
        boxShadow: isFocused ? '0 0 0 2px rgba(2, 132, 199, 0.25)' : 'none',
        borderRadius: 10,
        padding: '3px 4px',
        transition: 'all 0.2s ease',
        gap: 4,
      }}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        style={{
          width: 30,
          height: 30,
          borderRadius: 7,
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: value <= min ? 'var(--text-muted)' : '#FFFFFF',
          cursor: value <= min ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 700,
          lineHeight: 1,
          transition: 'all 0.15s ease',
        }}
        aria-label={`ลดค่า ${ariaLabel}`}
        title={`ลด (${step})`}
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
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          setLocalVal(e.target.value);
          const num = parseFloat(e.target.value);
          if (!isNaN(num)) {
            onChange(num);
          }
        }}
        style={{
          width: 64,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#FFFFFF',
          fontFamily: 'monospace, inherit',
          fontSize: 14,
          fontWeight: 800,
          textAlign: 'center',
          padding: '4px 2px',
        }}
      />

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        style={{
          width: 30,
          height: 30,
          borderRadius: 7,
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: value >= max ? 'var(--text-muted)' : '#FFFFFF',
          cursor: value >= max ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 700,
          lineHeight: 1,
          transition: 'all 0.15s ease',
        }}
        aria-label={`เพิ่มค่า ${ariaLabel}`}
        title={`เพิ่ม (${step})`}
      >
        +
      </button>

      <span
        style={{
          padding: '4px 10px',
          borderRadius: 6,
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}35`,
          color: accentColor,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.02em',
          userSelect: 'none',
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
    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer', flexShrink: 0 }}>
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
          background: checked ? '#0284c7' : 'rgba(148, 163, 184, 0.3)',
          transition: '0.2s',
          borderRadius: 24,
        }}
      >
        <span
          style={{
            position: 'absolute',
            content: '""',
            height: 18,
            width: 18,
            left: checked ? 23 : 3,
            bottom: 3,
            backgroundColor: '#fff',
            transition: '0.2s',
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
  description: string;
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
        padding: '14px 16px',
        borderRadius: 12,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Top Row: Icon + Title + Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {description}
            </div>
          </div>
        </div>

        <ToggleSwitch
          checked={enabled}
          onChange={onToggle}
          ariaLabel={`เปิด/ปิด ${title}`}
        />
      </div>

      {/* Expanded Controls: Threshold & Cooldown Frequency */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 10,
          opacity: enabled ? 1 : 0.35,
          pointerEvents: enabled ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      >
        {/* 1. เกณฑ์ตรวจวัด (Threshold) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            background: 'rgba(0, 0, 0, 0.22)',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {thresholdLabel}
          </div>
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

        {/* 2. ความถี่แจ้งเตือนซ้ำ (Cooldown Frequency) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            background: 'rgba(0, 0, 0, 0.22)',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
            <ClockIcon size={13} style={{ color: 'var(--text-muted)' }} />
            <span>เตือนซ้ำทุก</span>
          </div>
          <NumberStepperInput
            value={cooldownValue}
            onChange={onCooldownChange}
            min={cooldownMin}
            max={cooldownMax}
            step={cooldownStep}
            unit="นาที"
            accentColor="#0284c7"
            ariaLabel={`ความถี่แจ้งเตือนซ้ำสำหรับ ${title}`}
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
      const data = await fetchNotificationSettings(station?.id);
      setSettings(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถโหลดข้อมูลการตั้งค่าแจ้งเตือนได้');
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
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToGlobal = async () => {
    if (!station) return;
    const ok = window.confirm('ต้องการคืนค่าการแจ้งเตือนของสถานีนี้กลับไปใช้ค่าเริ่มต้นส่วนกลางใช่หรือไม่?');
    if (!ok) return;

    setResetting(true);
    setErrorMsg(null);
    try {
      await resetStationNotificationSettings(station.id);
      await loadSettings();
      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'รีเซ็ตการตั้งค่าไม่สำเร็จ');
    } finally {
      setResetting(false);
    }
  };

  const modalTitle = station
    ? `ตั้งค่าการแจ้งเตือน — ${station.name}`
    : 'ตั้งค่าการแจ้งเตือนส่วนกลาง (Global Settings)';

  const modalSubtitle = station
    ? `รหัส ${station.id} · จุดอ้างอิง ${station.referencePointName || 'จุดอ้างอิง'}`
    : 'มีผลกับทุกสถานีที่ไม่ได้กำหนดค่าเฉพาะ';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      maxWidth="720px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
          <div>
            {station && (
              <span
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: settings.is_custom ? 'rgba(56, 189, 248, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                  color: settings.is_custom ? '#38BDF8' : 'var(--text-muted)',
                  border: `1px solid ${settings.is_custom ? 'rgba(56, 189, 248, 0.25)' : 'rgba(148, 163, 184, 0.2)'}`,
                  fontWeight: 600,
                  marginRight: 8,
                }}
              >
                {settings.is_custom ? 'กำหนดค่าเฉพาะสถานี' : 'ใช้ค่าเริ่มต้นส่วนกลาง'}
              </span>
            )}
            {station && settings.is_custom && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetToGlobal}
                disabled={resetting || saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
              >
                <RefreshCwIcon size={13} />
                <span>{resetting ? 'กำลังคืนค่า...' : 'คืนค่าเริ่มต้นส่วนกลาง'}</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving || loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <BellIcon size={14} />
              <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Feedback alerts */}
        {saveSuccess && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <CheckCircleIcon size={16} />
            <span>บันทึกการตั้งค่าเกณฑ์การแจ้งเตือนเรียบร้อยแล้ว</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
            }}
          >
            <AlertTriangleIcon size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

                {/* Concept 3: Category Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            padding: 4,
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'water' ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
              color: activeTab === 'water' ? '#38BDF8' : 'var(--text-secondary)',
              fontWeight: activeTab === 'water' ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <DropletsIcon size={16} />
            <span>ระดับน้ำและอุทกวิทยา</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                background: activeTab === 'water' ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)',
                color: activeTab === 'water' ? '#0F172A' : 'var(--text-muted)',
                fontWeight: 700,
              }}
            >
              2
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'device'}
            onClick={() => setActiveTab('device')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'device' ? 'rgba(168, 85, 247, 0.16)' : 'transparent',
              color: activeTab === 'device' ? '#C084FC' : 'var(--text-secondary)',
              fontWeight: activeTab === 'device' ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <ZapIcon size={16} />
            <span>สุขภาพอุปกรณ์และระบบ</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                background: activeTab === 'device' ? '#C084FC' : 'rgba(255, 255, 255, 0.1)',
                color: activeTab === 'device' ? '#0F172A' : 'var(--text-muted)',
                fontWeight: 700,
              }}
            >
              3
            </span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            กำลังโหลดข้อมูลการตั้งค่า...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeTab === 'water' && (
              <>
                {/* Condition 1: Water Level Safety Offset */}
                <ConditionCard
                  icon={<DropletsIcon size={18} />}
                  iconBg="rgba(56, 189, 248, 0.12)"
                  iconColor="#38BDF8"
                  title="ระดับน้ำใกล้จุดวิกฤต (Safety Offset)"
                  description="เตือนล่วงหน้าก่อนระดับน้ำแตะจุดวิกฤต"
                  enabled={settings.water_level_enabled}
                  onToggle={(checked) => setSettings({ ...settings, water_level_enabled: checked })}
                  thresholdLabel="ระยะเผื่อความปลอดภัย"
                  thresholdValue={settings.safety_offset}
                  onThresholdChange={(val) => setSettings({ ...settings, safety_offset: val })}
                  thresholdMin={0.0}
                  thresholdMax={3.0}
                  thresholdStep={0.05}
                  thresholdUnit="เมตร"
                  thresholdAccent="#38BDF8"
                  cooldownValue={settings.water_level_cooldown_minutes ?? 30}
                  onCooldownChange={(val) => setSettings({ ...settings, water_level_cooldown_minutes: val })}
                  cooldownMin={5}
                  cooldownMax={720}
                  cooldownStep={15}
                />

                {/* Condition 2: Rate of Rise */}
                <ConditionCard
                  icon={<TrendingUpIcon size={18} />}
                  iconBg="rgba(245, 158, 11, 0.12)"
                  iconColor="#F59E0B"
                  title="น้ำเพิ่มขึ้นฉับพลัน (Rate of Rise)"
                  description="เตือนเมื่อน้ำเพิ่มขึ้นรวดเร็วเกินเกณฑ์ใน 1 ชั่วโมง"
                  enabled={settings.rate_of_rise_enabled}
                  onToggle={(checked) => setSettings({ ...settings, rate_of_rise_enabled: checked })}
                  thresholdLabel="เกณฑ์เพิ่มขึ้นฉับพลัน"
                  thresholdValue={settings.rate_of_rise_threshold}
                  onThresholdChange={(val) => setSettings({ ...settings, rate_of_rise_threshold: val })}
                  thresholdMin={0.1}
                  thresholdMax={5.0}
                  thresholdStep={0.05}
                  thresholdUnit="ม./ชม."
                  thresholdAccent="#F59E0B"
                  cooldownValue={settings.rate_of_rise_cooldown_minutes ?? 30}
                  onCooldownChange={(val) => setSettings({ ...settings, rate_of_rise_cooldown_minutes: val })}
                  cooldownMin={5}
                  cooldownMax={720}
                  cooldownStep={15}
                />
              </>
            )}

            {activeTab === 'device' && (
              <>
                {/* Condition 3: Offline Timeout */}
                <ConditionCard
                  icon={<ClockIcon size={18} />}
                  iconBg="rgba(148, 163, 184, 0.12)"
                  iconColor="#94A3B8"
                  title="ขาดการส่งข้อมูลเข้าสู่ระบบ (Offline Timeout)"
                  description="เตือนเมื่ออุปกรณ์หยุดส่งข้อมูลนานเกินกำหนด"
                  enabled={settings.offline_timeout_enabled}
                  onToggle={(checked) => setSettings({ ...settings, offline_timeout_enabled: checked })}
                  thresholdLabel="เกณฑ์เวลาขาดส่งข้อมูล"
                  thresholdValue={settings.offline_timeout_minutes}
                  onThresholdChange={(val) => setSettings({ ...settings, offline_timeout_minutes: val })}
                  thresholdMin={5}
                  thresholdMax={360}
                  thresholdStep={5}
                  thresholdUnit="นาที"
                  thresholdAccent="#94A3B8"
                  cooldownValue={settings.offline_cooldown_minutes ?? 60}
                  onCooldownChange={(val) => setSettings({ ...settings, offline_cooldown_minutes: val })}
                  cooldownMin={15}
                  cooldownMax={1440}
                  cooldownStep={30}
                />

                {/* Condition 4: Battery Low */}
                <ConditionCard
                  icon={<ZapIcon size={18} />}
                  iconBg="rgba(239, 68, 68, 0.12)"
                  iconColor="#EF4444"
                  title="แบตเตอรี่ของอุปกรณ์อยู่ในระดับต่ำ (Battery Low)"
                  description="เตือนเมื่อระดับพลังงานแบตเตอรี่ต่ำกว่าเกณฑ์"
                  enabled={settings.battery_low_enabled}
                  onToggle={(checked) => setSettings({ ...settings, battery_low_enabled: checked })}
                  thresholdLabel="ระดับแบตเตอรี่ที่เริ่มเตือน"
                  thresholdValue={settings.battery_low_threshold}
                  onThresholdChange={(val) => setSettings({ ...settings, battery_low_threshold: val })}
                  thresholdMin={5}
                  thresholdMax={50}
                  thresholdStep={5}
                  thresholdUnit="%"
                  thresholdAccent="#EF4444"
                  cooldownValue={settings.battery_low_cooldown_minutes ?? 120}
                  onCooldownChange={(val) => setSettings({ ...settings, battery_low_cooldown_minutes: val })}
                  cooldownMin={30}
                  cooldownMax={1440}
                  cooldownStep={30}
                />

                {/* Condition 5: Geofence */}
                <ConditionCard
                  icon={<MapPinIcon size={18} />}
                  iconBg="rgba(168, 85, 247, 0.12)"
                  iconColor="#A855F7"
                  title="ตรวจจับการเคลื่อนที่ (Geofence)"
                  description="เตือนเมื่อเสาหรืออุปกรณ์ขยับออกนอกรัศมีพิกัด"
                  enabled={settings.geofence_enabled}
                  onToggle={(checked) => setSettings({ ...settings, geofence_enabled: checked })}
                  thresholdLabel="รัศมีพิกัดที่อนุญาต"
                  thresholdValue={settings.geofence_radius_meters}
                  onThresholdChange={(val) => setSettings({ ...settings, geofence_radius_meters: val })}
                  thresholdMin={20}
                  thresholdMax={2000}
                  thresholdStep={10}
                  thresholdUnit="เมตร"
                  thresholdAccent="#A855F7"
                  cooldownValue={settings.geofence_cooldown_minutes ?? 60}
                  onCooldownChange={(val) => setSettings({ ...settings, geofence_cooldown_minutes: val })}
                  cooldownMin={15}
                  cooldownMax={1440}
                  cooldownStep={30}
                />
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
