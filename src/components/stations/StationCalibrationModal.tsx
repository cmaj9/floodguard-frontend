import { useState, useEffect, useId } from 'react';
import Modal from '../ui/Modal';
import type { Station } from '../../types';
import { SlidersIcon, AlertTriangleIcon, InfoIcon, CompassIcon } from '../ui/Icons';

interface StationCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: Station | null;
  onSave: (calibration: {
    sensor_to_ref_distance: number;
    reference_point_name: string;
    warning_level: number | null;
    critical_level: number | null;
    blind_zone_offset?: number;
    tilt_offset_x?: number;
    tilt_offset_y?: number;
  }) => Promise<void>;
}

export default function StationCalibrationModal({
  isOpen,
  onClose,
  station,
  onSave,
}: StationCalibrationModalProps) {
  const sensorInputId = useId();
  const refNameInputId = useId();
  const warningInputId = useId();
  const criticalInputId = useId();
  const tiltOffsetXId = useId();
  const tiltOffsetYId = useId();
  const testSliderId = useId();

  // Form State
  const [sensorToRef, setSensorToRef] = useState<string>('2.00');
  const [refName, setRefName] = useState<string>('ขอบตลิ่ง');
  const [warningLevel, setWarningLevel] = useState<string>('-0.50');
  const [criticalLevel, setCriticalLevel] = useState<string>('0.00');
  const [tiltOffsetX, setTiltOffsetX] = useState<string>('0.0');
  const [tiltOffsetY, setTiltOffsetY] = useState<string>('0.0');

  // Interactive Simulator slider: test raw sensor distance (Air Gap)
  const [testRawDistance, setTestRawDistance] = useState<number>(2.50);

  // Status & Validation
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync when station changes
  useEffect(() => {
    if (station) {
      const currentSensorToRef = station.sensorToRefDistance ?? 2.0;
      setSensorToRef(String(currentSensorToRef));
      setRefName(station.referencePointName || 'ขอบตลิ่ง');
      setWarningLevel(station.warningLevel !== null && station.warningLevel !== undefined ? String(station.warningLevel) : '');
      setCriticalLevel(station.criticalLevel !== null && station.criticalLevel !== undefined ? String(station.criticalLevel) : '');
      setTiltOffsetX(station.tiltOffsetX !== undefined && station.tiltOffsetX !== null ? String(station.tiltOffsetX) : '0.0');
      setTiltOffsetY(station.tiltOffsetY !== undefined && station.tiltOffsetY !== null ? String(station.tiltOffsetY) : '0.0');

      // Default test distance to current raw distance or sensorToRef + 0.5
      const currentRaw = station.rawDistance ?? (currentSensorToRef + 0.8);
      setTestRawDistance(Number(currentRaw.toFixed(2)));
      setErrorMsg(null);
    }
  }, [station, isOpen]);

  // Derived math for simulation preview
  const numSensorToRef = Number(sensorToRef) || 2.0;
  const numWarning = warningLevel !== '' && !isNaN(Number(warningLevel)) ? Number(warningLevel) : null;
  const numCritical = criticalLevel !== '' && !isNaN(Number(criticalLevel)) ? Number(criticalLevel) : null;
  const effectiveRefName = refName.trim() !== '' ? refName.trim() : 'จุดอ้างอิง';

  // Relative water level = Reference distance - Sensor measured distance
  const simulatedRelativeLevel = Number((numSensorToRef - testRawDistance).toFixed(3));
  const isBlindZone = testRawDistance <= 0.28;

  let simulatedStatus: 'normal' | 'warning' | 'critical' = 'normal';
  if (numCritical !== null && simulatedRelativeLevel >= numCritical) {
    simulatedStatus = 'critical';
  } else if (numWarning !== null && simulatedRelativeLevel >= numWarning) {
    simulatedStatus = 'warning';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dRef = parseFloat(sensorToRef);
    if (isNaN(dRef) || dRef <= 0) {
      setErrorMsg('กรุณากรอกระยะจากหัวเซนเซอร์ถึงจุดอ้างอิงเป็นตัวเลขที่มากกว่า 0 เมตร');
      return;
    }

    const warn = warningLevel.trim() !== '' && !isNaN(Number(warningLevel)) ? Number(warningLevel) : null;
    const crit = criticalLevel.trim() !== '' && !isNaN(Number(criticalLevel)) ? Number(criticalLevel) : null;

    if (warn !== null && crit !== null && warn > crit) {
      setErrorMsg('เกณฑ์เฝ้าระวังควรมีค่าน้อยกว่าหรือเท่ากับเกณฑ์วิกฤต');
      return;
    }

    const offX = tiltOffsetX.trim() !== '' && !isNaN(Number(tiltOffsetX)) ? Number(tiltOffsetX) : 0;
    const offY = tiltOffsetY.trim() !== '' && !isNaN(Number(tiltOffsetY)) ? Number(tiltOffsetY) : 0;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSave({
        sensor_to_ref_distance: dRef,
        reference_point_name: effectiveRefName,
        warning_level: warn,
        critical_level: crit,
        blind_zone_offset: 0.28,
        tilt_offset_x: offX,
        tilt_offset_y: offY,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !station) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ตั้งค่าจุดอ้างอิง — ${station.name}`}
      maxWidth="760px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {errorMsg && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            <AlertTriangleIcon size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2-Column Grid Layout: Inputs Left, Dynamic Visualization Right */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 1.15fr',
            gap: '1.25rem',
            alignItems: 'start',
          }}
        >
          {/* ── LEFT COLUMN: CALIBRATION INPUTS ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {/* Field 1: Sensor to Reference Point Distance */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor={sensorInputId} className="label" style={{ fontWeight: 600 }}>
                ระยะจากเซนเซอร์ถึงจุดอ้างอิง *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id={sensorInputId}
                  type="number"
                  step="0.01"
                  min="0.3"
                  max="15.0"
                  className="input"
                  value={sensorToRef}
                  onChange={(e) => setSensorToRef(e.target.value)}
                  placeholder="เช่น 2.00"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                  }}
                >
                  ม.
                </span>
              </div>
            </div>

            {/* Field 2: Reference Point Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor={refNameInputId} className="label" style={{ fontWeight: 600 }}>
                ชื่อเรียกจุดอ้างอิง
              </label>
              <input
                id={refNameInputId}
                type="text"
                className="input"
                value={refName}
                onChange={(e) => setRefName(e.target.value)}
                placeholder="เช่น ขอบตลิ่ง, สันเขื่อน"
              />
            </div>

            {/* Threshold Fields: Warning & Critical (Optional) */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '0.75rem',
                padding: '0.75rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <InfoIcon size={14} style={{ color: '#38BDF8' }} />
                <span>เกณฑ์เตือนภัยระดับน้ำ</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor={warningInputId} className="label" style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
                    จุดเฝ้าระวัง (ม.)
                  </label>
                  <input
                    id={warningInputId}
                    type="number"
                    step="0.01"
                    className="input"
                    value={warningLevel}
                    onChange={(e) => setWarningLevel(e.target.value)}
                    placeholder="-0.50 (เว้นได้)"
                    style={{
                      fontSize: '0.875rem',
                      border: '1.5px solid rgba(245, 158, 11, 0.6)',
                      background: 'rgba(245, 158, 11, 0.05)',
                      color: '#FCD34D',
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor={criticalInputId} className="label" style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
                    จุดวิกฤต (ม.)
                  </label>
                  <input
                    id={criticalInputId}
                    type="number"
                    step="0.01"
                    className="input"
                    value={criticalLevel}
                    onChange={(e) => setCriticalLevel(e.target.value)}
                    placeholder="0.00 (เว้นได้)"
                    style={{
                      fontSize: '0.875rem',
                      border: '1.5px solid rgba(239, 68, 68, 0.6)',
                      background: 'rgba(239, 68, 68, 0.05)',
                      color: '#FCA5A5',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Field: Tilt Zero-Reference Offset */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '0.75rem',
                padding: '0.75rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <CompassIcon size={14} style={{ color: '#38BDF8' }} />
                <span>ระนาบตั้งต้นของเสา</span>
              </div>

              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: '0.625rem', lineHeight: 1.4 }}>
                กำหนดมุมติดตั้งจริงเป็นระนาบตรง (0°) เพื่อตรวจจับเสาเอียง (&gt;15°)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor={tiltOffsetXId} className="label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    แกน X อ้างอิง (°)
                  </label>
                  <input
                    id={tiltOffsetXId}
                    type="number"
                    step="0.1"
                    className="input"
                    value={tiltOffsetX}
                    onChange={(e) => setTiltOffsetX(e.target.value)}
                    placeholder="0.0"
                    style={{ fontSize: '0.875rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor={tiltOffsetYId} className="label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    แกน Y อ้างอิง (°)
                  </label>
                  <input
                    id={tiltOffsetYId}
                    type="number"
                    step="0.1"
                    className="input"
                    value={tiltOffsetY}
                    onChange={(e) => setTiltOffsetY(e.target.value)}
                    placeholder="0.0"
                    style={{ fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              {station.tiltX !== undefined && station.tiltX !== null && station.tiltY !== undefined && station.tiltY !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setTiltOffsetX(String(station.tiltX));
                    setTiltOffsetY(String(station.tiltY));
                  }}
                  style={{
                    width: '100%',
                    marginTop: '0.625rem',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#38BDF8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '0.5rem',
                    padding: '0.45rem 0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                  title={`ตั้งค่ามุมปัจจุบัน (X: ${station.tiltX}°, Y: ${station.tiltY}°) เป็นระนาบตรง`}
                >
                  <span>ใช้มุมปัจจุบันของเซนเซอร์ ({station.tiltX}°, {station.tiltY}°)</span>
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: DYNAMIC CROSS-SECTION VISUALIZATION & SIMULATOR ── */}
          <div
            style={{
              background: 'rgba(8, 12, 20, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1rem',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <SlidersIcon size={14} style={{ color: '#38BDF8' }} />
                <span>จำลองการคำนวณ</span>
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  background: isBlindZone
                    ? 'rgba(239, 68, 68, 0.2)'
                    : simulatedStatus === 'critical'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : simulatedStatus === 'warning'
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(16, 185, 129, 0.2)',
                  color: isBlindZone
                    ? '#F87171'
                    : simulatedStatus === 'critical'
                    ? '#F87171'
                    : simulatedStatus === 'warning'
                    ? '#FBBF24'
                    : '#34D399',
                  fontWeight: 600,
                }}
              >
                {isBlindZone ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertTriangleIcon size={12} style={{ color: '#EF4444' }} />
                    <span>Blind Zone</span>
                  </span>
                ) : simulatedStatus === 'critical' ? (
                  'วิกฤต'
                ) : simulatedStatus === 'warning' ? (
                  'เฝ้าระวัง'
                ) : (
                  'ปกติ'
                )}
              </span>
            </div>

            {/* Cross-Section Graphic SVG */}
            <div
              style={{
                position: 'relative',
                height: '190px',
                background: 'linear-gradient(180deg, #090e17 0%, #0d1527 100%)',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 320 190">
                <defs>
                  <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
                  </linearGradient>
                  <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  </pattern>
                </defs>

                {/* Grid Background */}
                <rect width="320" height="190" fill="url(#gridPattern)" />

                {/* Pole Structure */}
                <rect x="25" y="10" width="8" height="170" fill="#475569" rx="2" />
                <rect x="25" y="15" width="45" height="5" fill="#64748B" rx="1" />

                {/* Sensor Head A01NYUB */}
                <rect x="65" y="15" width="22" height="14" fill="#0284C7" rx="3" stroke="#38BDF8" strokeWidth="1.5" />
                <polygon points="76,31 71,37 81,37" fill="#38BDF8" />

                {/* Ultrasonic wave beam (cones) */}
                <path
                  d="M 68 37 L 40 180 L 112 180 Z"
                  fill="rgba(6, 182, 212, 0.06)"
                  stroke="rgba(6, 182, 212, 0.2)"
                  strokeDasharray="3 3"
                />

                {/* Reference Point Line (0.00 m) */}
                {(() => {
                  // Map physical 0.00m relative position to SVG Y coordinate
                  // Sensor is at Y=30. Ground is at Y=180.
                  // Total height range = 150px.
                  const maxDisplayRange = Math.max(numSensorToRef + 1.5, 4.0);
                  const sensorY = 30;
                  const refY = Math.min(165, Math.max(45, sensorY + (numSensorToRef / maxDisplayRange) * 135));
                  const waterY = Math.min(175, Math.max(35, sensorY + (testRawDistance / maxDisplayRange) * 135));

                  return (
                    <>
                      {/* Water Body */}
                      <rect
                        x="40"
                        y={waterY}
                        width="270"
                        height={Math.max(0, 190 - waterY)}
                        fill="url(#waterGrad)"
                        opacity="0.85"
                      />
                      {/* Water Surface Wave Line */}
                      <line
                        x1="40"
                        y1={waterY}
                        x2="310"
                        y2={waterY}
                        stroke="#67E8F9"
                        strokeWidth="2.5"
                      />

                      {/* Reference Line (Bank / Datum = 0.00m) */}
                      <line
                        x1="20"
                        y1={refY}
                        x2="310"
                        y2={refY}
                        stroke="#F59E0B"
                        strokeWidth="1.75"
                        strokeDasharray="4 3"
                      />
                      <rect x="180" y={refY - 18} width="125" height="16" fill="#1E293B" rx="3" stroke="#F59E0B" strokeWidth="1" />
                      <text x="185" y={refY - 6} fill="#FCD34D" fontSize="9.5" fontWeight="bold">
                        {effectiveRefName} (0.00 ม.)
                      </text>

                      {/* Dimension lines: Reference Distance */}
                      <line x1="125" y1={sensorY} x2="125" y2={refY} stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" />
                      <text x="130" y={(sensorY + refY) / 2} fill="#CBD5E1" fontSize="9">
                        {numSensorToRef.toFixed(2)} ม.
                      </text>

                      {/* Dimension lines: Sensor Air Gap */}
                      <line x1="88" y1={sensorY + 10} x2="88" y2={waterY} stroke="#38BDF8" strokeWidth="1.5" />
                      <text x="70" y={(sensorY + waterY) / 2 + 3} fill="#38BDF8" fontSize="9.5" fontWeight="bold">
                        {testRawDistance.toFixed(2)} ม.
                      </text>
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Test Air Gap Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                <label htmlFor={testSliderId} style={{ color: 'var(--text-secondary)' }}>
                  ทดลองปรับระยะผิวน้ำที่วัดได้
                </label>
                <strong style={{ color: '#38BDF8' }}>{testRawDistance.toFixed(2)} เมตร</strong>
              </div>
              <input
                id={testSliderId}
                type="range"
                min="0.25"
                max={Math.max(4.0, numSensorToRef + 1.5).toFixed(2)}
                step="0.05"
                value={testRawDistance}
                onChange={(e) => setTestRawDistance(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Real-time Calculation Result Box */}
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '0.625rem',
                background: simulatedRelativeLevel >= 0
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(16, 185, 129, 0.12)',
                border: `1px solid ${
                  simulatedRelativeLevel >= 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                }`,
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                ระดับน้ำคำนวณจำลอง
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    fontFamily: 'monospace, inherit',
                    color: simulatedRelativeLevel >= 0 ? '#F87171' : '#34D399',
                  }}
                >
                  {simulatedRelativeLevel >= 0 ? `+${simulatedRelativeLevel.toFixed(3)}` : simulatedRelativeLevel.toFixed(3)}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>เมตร (ม.)</span>
              </div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: simulatedRelativeLevel >= 0 ? '#FCA5A5' : '#6EE7B7',
                  marginTop: '0.2rem',
                }}
              >
                {simulatedRelativeLevel < 0
                  ? `ต่ำกว่า${effectiveRefName} ${Math.abs(simulatedRelativeLevel).toFixed(2)} ม. (ปลอดภัย)`
                  : simulatedRelativeLevel === 0
                  ? `เสมอ${effectiveRefName} พอดี`
                  : `สูงกว่า${effectiveRefName} ${simulatedRelativeLevel.toFixed(2)} ม. (น้ำเริ่มล้น)`}
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
