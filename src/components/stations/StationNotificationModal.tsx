import { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import type { Station, NotificationSettings, DbAlert } from '../../types';
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
  ActivityIcon,
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

interface CockpitMetricColumnProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  accentColor?: string;
  align?: 'left' | 'right';
  ariaLabel: string;
}

function formatMetricVal(val: number, step: number): string {
  if (step < 0.1) {
    return (Math.round(val * 100) / 100).toFixed(2);
  }
  if (step < 1) {
    return (Math.round(val * 10) / 10).toFixed(1);
  }
  return String(Math.round(val));
}

function CockpitMetricColumn({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  accentColor = 'var(--color-cyan, #38BDF8)',
  align = 'left',
  ariaLabel,
}: CockpitMetricColumnProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localVal, setLocalVal] = useState<string>(formatMetricVal(value, step));

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(formatMetricVal(value, step));
    }
  }, [value, step, isFocused]);

  const handleDecrement = () => {
    const precision = step < 0.1 ? 100 : step < 1 ? 10 : 1;
    const next = Math.max(min, Math.round((value - step) * precision) / precision);
    onChange(next);
    setLocalVal(formatMetricVal(next, step));
  };

  const handleIncrement = () => {
    const precision = step < 0.1 ? 100 : step < 1 ? 10 : 1;
    const next = Math.min(max, Math.round((value + step) * precision) / precision);
    onChange(next);
    setLocalVal(formatMetricVal(next, step));
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localVal);
    if (isNaN(parsed)) {
      setLocalVal(formatMetricVal(value, step));
    } else {
      const precision = step < 0.1 ? 100 : step < 1 ? 10 : 1;
      const clamped = Math.min(max, Math.max(min, Math.round(parsed * precision) / precision));
      onChange(clamped);
      setLocalVal(formatMetricVal(clamped, step));
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'right' ? 'flex-end' : 'flex-start',
        gap: 3,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted, #64748B)',
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </span>

      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={localVal}
          onChange={(e) => {
            setLocalVal(e.target.value);
            const p = parseFloat(e.target.value);
            if (!isNaN(p)) onChange(p);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          aria-label={ariaLabel}
          className="tabular-nums font-mono"
          style={{
            width: step < 0.1 ? '68px' : step < 1 ? '58px' : '54px',
            background: isFocused ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            border: 'none',
            borderBottom: isFocused ? `1.5px solid ${accentColor}` : '1.5px solid transparent',
            borderRadius: 4,
            color: accentColor,
            fontSize: 20,
            fontWeight: 800,
            textAlign: align === 'right' ? 'right' : 'left',
            padding: '1px 2px',
            outline: 'none',
            lineHeight: 1.2,
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary, #94A3B8)',
          }}
        >
          {unit}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="tactile-press"
          aria-label={`ลดค่า ${ariaLabel}`}
          style={{
            width: 32,
            height: 28,
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: value <= min ? 'var(--text-muted, #475569)' : 'var(--text-primary, #F8FAFC)',
            cursor: value <= min ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1,
            padding: 0,
            transition: 'all 0.12s ease',
          }}
        >
          -
        </button>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="tactile-press"
          aria-label={`เพิ่มค่า ${ariaLabel}`}
          style={{
            width: 32,
            height: 28,
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: value >= max ? 'var(--text-muted, #475569)' : 'var(--text-primary, #F8FAFC)',
            cursor: value >= max ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1,
            padding: 0,
            transition: 'all 0.12s ease',
          }}
        >
          +
        </button>
      </div>
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
    <label
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 44,
        height: 24,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
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
          borderRadius: 24,
        }}
      >
        <span
          style={{
            position: 'absolute',
            height: 18,
            width: 18,
            left: checked ? 23 : 3,
            bottom: 3,
            backgroundColor: '#FFFFFF',
            transition: 'all 0.18s ease',
            borderRadius: '50%',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          }}
        />
      </span>
    </label>
  );
}

interface BoldCockpitTileProps {
  id: string;
  name: string;
  code: string;
  dotColor: string;
  enabled: boolean;
  onToggle: (checked: boolean) => void;
  // Param 1 (Threshold)
  param1Label: string;
  val1: number;
  onVal1Change: (val: number) => void;
  min1: number;
  max1: number;
  step1: number;
  unit1: string;
  accent1?: string;
  // Param 2 (Cooldown)
  param2Label: string;
  val2: number;
  onVal2Change: (val: number) => void;
  min2?: number;
  max2?: number;
  step2?: number;
  unit2?: string;
}

function BoldCockpitTile({
  name,
  code,
  dotColor,
  enabled,
  onToggle,
  param1Label,
  val1,
  onVal1Change,
  min1,
  max1,
  step1,
  unit1,
  accent1 = 'var(--color-cyan, #38BDF8)',
  param2Label,
  val2,
  onVal2Change,
  min2 = 15,
  max2 = 1440,
  step2 = 15,
  unit2 = 'นาที',
}: BoldCockpitTileProps) {
  return (
    <div
      style={{
        background: enabled ? '#10141E' : 'rgba(15, 20, 30, 0.5)',
        border: `1px solid ${enabled ? 'rgba(56, 189, 248, 0.28)' : 'rgba(255, 255, 255, 0.07)'}`,
        borderRadius: 12,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 14,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: dotColor,
                boxShadow: enabled ? `0 0 8px ${dotColor}` : 'none',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--text-primary, #F8FAFC)',
                lineHeight: 1.3,
              }}
            >
              {name}
            </span>
          </div>
          <span
            className="font-mono tabular-nums"
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: 'var(--text-muted, #64748B)',
              letterSpacing: '0.04em',
              paddingLeft: 16,
            }}
          >
            {code}
          </span>
        </div>

        <ToggleSwitch
          checked={enabled}
          onChange={onToggle}
          ariaLabel={`เปิดหรือปิด ${name}`}
        />
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          opacity: enabled ? 1 : 0.35,
          pointerEvents: enabled ? 'auto' : 'none',
          transition: 'opacity 0.15s ease',
        }}
      >
        <CockpitMetricColumn
          label={param1Label}
          value={val1}
          onChange={onVal1Change}
          min={min1}
          max={max1}
          step={step1}
          unit={unit1}
          accentColor={accent1}
          align="left"
          ariaLabel={`${param1Label} สำหรับ ${name}`}
        />

        <CockpitMetricColumn
          label={param2Label}
          value={val2}
          onChange={onVal2Change}
          min={min2}
          max={max2}
          step={step2}
          unit={unit2}
          accentColor="var(--text-primary, #F8FAFC)"
          align="right"
          ariaLabel={`${param2Label} สำหรับ ${name}`}
        />
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
  const [triggeredAlerts, setTriggeredAlerts] = useState<DbAlert[]>([]);
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
    setTriggeredAlerts([]);
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
    setTriggeredAlerts([]);
    try {
      const res = await updateNotificationSettings(settings, station?.id);
      setSettings(res.settings);
      setSaveSuccess(true);
      if (onSaved) onSaved();

      if (res.triggeredAlerts && res.triggeredAlerts.length > 0) {
        setTriggeredAlerts(res.triggeredAlerts);
      } else {
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 1200);
      }
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
    setTriggeredAlerts([]);
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

  const modalTitle = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span>ตั้งค่าการแจ้งเตือน</span>
      {station && (
        <>
          <span style={{ color: 'var(--text-muted, #475569)' }}>·</span>
          <span style={{ color: 'var(--color-cyan, #38BDF8)', fontWeight: 600 }}>{station.name}</span>
        </>
      )}
    </span>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="720px"
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div>
            {station && settings.is_custom && (
              <button
                type="button"
                className="btn btn-secondary tactile-press"
                onClick={handleResetToGlobal}
                disabled={resetting || saving}
                style={{
                  minHeight: 40,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '0 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  lineHeight: 1,
                }}
              >
                <RefreshCwIcon size={13} className={resetting ? 'animate-spin' : ''} />
                <span>{resetting ? 'กำลังคืนค่า...' : 'คืนค่าส่วนกลาง'}</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary tactile-press"
              onClick={onClose}
              disabled={saving}
              style={{
                minHeight: 40,
                padding: '0 18px',
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              {triggeredAlerts.length > 0 ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
            </button>
            <button
              type="button"
              className="btn btn-primary tactile-press"
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                minHeight: 40,
                padding: '0 20px',
                fontSize: 13,
                fontWeight: 700,
                minWidth: 120,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                lineHeight: 1,
              }}
            >
              <BellIcon size={14} />
              <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Triggered Alerts Banner (Immediate Dispatch Confirmation) */}
        {triggeredAlerts.length > 0 && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-critical, #EF4444)' }}>
              <AlertTriangleIcon size={18} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                ตรงตามเกณฑ์ใหม่ ระบบส่งการแจ้งเตือนทันที {triggeredAlerts.length} รายการ
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
              ตรวจพบค่าตรวจวัดล่าสุดเข้าเงื่อนไขวิกฤตตามเกณฑ์ใหม่ จึงได้บันทึกลงประวัติการเตือนภัยและส่งข้อความพุชเข้า LINE OA เรียบร้อยแล้ว
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {triggeredAlerts.map((a, idx) => (
                <div
                  key={a.alert_id || a.id || idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#FCA5A5',
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  <span className="font-mono">{a.alert_type}</span>
                  {a.message && <span style={{ opacity: 0.85 }}>({a.message})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Save Success Banner */}
        {saveSuccess && triggeredAlerts.length === 0 && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--color-normal, #10B981)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.45,
            }}
          >
            <CheckCircleIcon size={16} />
            <span>บันทึกการตั้งค่าเกณฑ์การแจ้งเตือนเรียบร้อยแล้ว</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-critical, #EF4444)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.45,
            }}
          >
            <AlertTriangleIcon size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* LINE Quota Alert Banner when Exceeded */}
        {lineQuota?.isExceeded && (
          <div
            style={{
              padding: '12px 14px',
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
                width: 28,
                height: 28,
                borderRadius: 7,
                background: 'rgba(239, 68, 68, 0.2)',
                color: 'var(--color-critical, #EF4444)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <AlertTriangleIcon size={15} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-critical, #EF4444)', lineHeight: 1.35 }}>
                  โควตาส่งข้อความ LINE OA ประจำเดือนเต็มแล้ว
                </span>
                <span
                  className="tabular-nums font-mono"
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#FCA5A5',
                    fontWeight: 700,
                  }}
                >
                  {lineQuota.used}/{lineQuota.total} ข้อความ
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary, #94A3B8)', marginTop: 3, lineHeight: 1.45 }}>
                ระบบไม่สามารถส่งข้อความพุชเข้า LINE ได้เนื่องจากแพ็กเกจฟรีเต็ม 300 ข้อความ กรุณาอัปเกรดบน LINE Official Account Manager
              </span>
            </div>
          </div>
        )}

        {/* Clean Sub-Bar: Underline Tabs + Minimal Quota */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: 0,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 20,
            }}
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'water'}
              onClick={() => setActiveTab('water')}
              className="tactile-press"
              style={{
                position: 'relative',
                padding: '8px 0 10px',
                border: 'none',
                background: 'transparent',
                color: activeTab === 'water' ? 'var(--text-primary, #F8FAFC)' : 'var(--text-secondary, #94A3B8)',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: activeTab === 'water' ? 700 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'color 0.15s ease',
              }}
            >
              <DropletsIcon size={14} style={{ color: activeTab === 'water' ? 'var(--color-cyan, #38BDF8)' : 'currentColor' }} />
              <span>ระดับน้ำและอุทกวิทยา</span>
              {activeTab === 'water' && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: 'var(--color-cyan, #38BDF8)',
                    borderRadius: 2,
                  }}
                />
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'device'}
              onClick={() => setActiveTab('device')}
              className="tactile-press"
              style={{
                position: 'relative',
                padding: '8px 0 10px',
                border: 'none',
                background: 'transparent',
                color: activeTab === 'device' ? 'var(--text-primary, #F8FAFC)' : 'var(--text-secondary, #94A3B8)',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: activeTab === 'device' ? 700 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'color 0.15s ease',
              }}
            >
              <ActivityIcon size={14} style={{ color: activeTab === 'device' ? '#C084FC' : 'currentColor' }} />
              <span>อุปกรณ์และระบบเครือข่าย</span>
              {activeTab === 'device' && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: '#C084FC',
                    borderRadius: 2,
                  }}
                />
              )}
            </button>
          </div>

          {/* Minimal Quota Indicator */}
          {lineQuota && !lineQuota.isExceeded && typeof lineQuota.total === 'number' && lineQuota.total > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                color: 'var(--text-muted, #64748B)',
                paddingBottom: 4,
              }}
            >
              <span>โควตา LINE OA</span>
              <span
                className="tabular-nums font-mono"
                style={{
                  fontWeight: 700,
                  color: 'var(--color-cyan, #38BDF8)',
                }}
              >
                {lineQuota.used}/{lineQuota.total}
              </span>
            </div>
          )}
        </div>

        {/* Tab 1 Content: ระดับน้ำและอุทกวิทยา (Hydrology & Water Level) */}
        {activeTab === 'water' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {/* Tile 1: ระดับน้ำแตะเกณฑ์วิกฤต */}
            <BoldCockpitTile
              id="water-level"
              name="ระดับน้ำแตะเกณฑ์วิกฤต"
              code="CRITICAL WATER"
              dotColor="#38BDF8"
              enabled={settings.water_level_enabled}
              onToggle={(checked) => setSettings((prev) => ({ ...prev, water_level_enabled: checked }))}
              param1Label="ระยะชดเชย"
              val1={settings.safety_offset}
              onVal1Change={(val) => setSettings((prev) => ({ ...prev, safety_offset: val }))}
              min1={-2.0}
              max1={2.0}
              step1={0.05}
              unit1="ม."
              accent1="#38BDF8"
              param2Label="เตือนซ้ำ"
              val2={settings.water_level_cooldown_minutes ?? 30}
              onVal2Change={(val) => setSettings((prev) => ({ ...prev, water_level_cooldown_minutes: val }))}
              min2={15}
              max2={1440}
              step2={15}
              unit2="นาที"
            />

            {/* Tile 2: อัตราน้ำเพิ่มขึ้นฉับพลัน */}
            <BoldCockpitTile
              id="rate-of-rise"
              name="อัตราน้ำเพิ่มขึ้นฉับพลัน"
              code="RATE OF RISE"
              dotColor="#F59E0B"
              enabled={settings.rate_of_rise_enabled}
              onToggle={(checked) => setSettings((prev) => ({ ...prev, rate_of_rise_enabled: checked }))}
              param1Label="อัตราเพิ่มขึ้น"
              val1={settings.rate_of_rise_threshold}
              onVal1Change={(val) => setSettings((prev) => ({ ...prev, rate_of_rise_threshold: val }))}
              min1={0.05}
              max1={2.0}
              step1={0.05}
              unit1="ม./ชม."
              accent1="#F59E0B"
              param2Label="เตือนซ้ำ"
              val2={settings.rate_of_rise_cooldown_minutes ?? 30}
              onVal2Change={(val) => setSettings((prev) => ({ ...prev, rate_of_rise_cooldown_minutes: val }))}
              min2={15}
              max2={1440}
              step2={15}
              unit2="นาที"
            />
          </div>
        )}

        {/* Tab 2 Content: อุปกรณ์และระบบเครือข่าย (Hardware & Network Health) */}
        {activeTab === 'device' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {/* Tile 3: ขาดการติดต่อเกินกำหนด */}
            <BoldCockpitTile
              id="offline-timeout"
              name="ขาดการติดต่อเกินกำหนด"
              code="OFFLINE TIMEOUT"
              dotColor="#EF4444"
              enabled={settings.offline_timeout_enabled}
              onToggle={(checked) => setSettings((prev) => ({ ...prev, offline_timeout_enabled: checked }))}
              param1Label="ขาดหายเกิน"
              val1={settings.offline_timeout_minutes}
              onVal1Change={(val) => setSettings((prev) => ({ ...prev, offline_timeout_minutes: val }))}
              min1={5}
              max1={720}
              step1={5}
              unit1="นาที"
              accent1="#EF4444"
              param2Label="เตือนซ้ำ"
              val2={settings.offline_cooldown_minutes ?? 60}
              onVal2Change={(val) => setSettings((prev) => ({ ...prev, offline_cooldown_minutes: val }))}
              min2={15}
              max2={1440}
              step2={15}
              unit2="นาที"
            />

            {/* Tile 4: ระดับแบตเตอรี่ต่ำ */}
            <BoldCockpitTile
              id="battery-low"
              name="ระดับแบตเตอรี่ต่ำ"
              code="BATTERY LOW"
              dotColor="#F59E0B"
              enabled={settings.battery_low_enabled}
              onToggle={(checked) => setSettings((prev) => ({ ...prev, battery_low_enabled: checked }))}
              param1Label="ต่ำกว่า"
              val1={settings.battery_low_threshold}
              onVal1Change={(val) => setSettings((prev) => ({ ...prev, battery_low_threshold: val }))}
              min1={5}
              max1={50}
              step1={5}
              unit1="%"
              accent1="#F59E0B"
              param2Label="เตือนซ้ำ"
              val2={settings.battery_low_cooldown_minutes ?? 120}
              onVal2Change={(val) => setSettings((prev) => ({ ...prev, battery_low_cooldown_minutes: val }))}
              min2={30}
              max2={1440}
              step2={30}
              unit2="นาที"
            />

            {/* Tile 5: ตรวจจับการเคลื่อนที่ */}
            <BoldCockpitTile
              id="geofence"
              name="ตรวจจับการเคลื่อนที่"
              code="GEOFENCE DRIFT"
              dotColor="#A855F7"
              enabled={settings.geofence_enabled}
              onToggle={(checked) => setSettings((prev) => ({ ...prev, geofence_enabled: checked }))}
              param1Label="รัศมีเกิน"
              val1={settings.geofence_radius_meters}
              onVal1Change={(val) => setSettings((prev) => ({ ...prev, geofence_radius_meters: val }))}
              min1={10}
              max1={1000}
              step1={10}
              unit1="ม."
              accent1="#A855F7"
              param2Label="เตือนซ้ำ"
              val2={settings.geofence_cooldown_minutes ?? 60}
              onVal2Change={(val) => setSettings((prev) => ({ ...prev, geofence_cooldown_minutes: val }))}
              min2={15}
              max2={1440}
              step2={15}
              unit2="นาที"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
