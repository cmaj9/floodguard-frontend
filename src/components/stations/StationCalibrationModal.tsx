import { useState, useEffect, useId } from 'react';
import Modal from '../ui/Modal';
import type { Station } from '../../types';
import { SlidersIcon, AlertTriangleIcon, CompassIcon } from '../ui/Icons';

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

  const [sensorToRef, setSensorToRef] = useState<string>('2.00');
  const [refName, setRefName] = useState<string>('ขอบตลิ่ง');
  const [warningLevel, setWarningLevel] = useState<string>('-0.50');
  const [criticalLevel, setCriticalLevel] = useState<string>('0.00');
  const [tiltOffsetX, setTiltOffsetX] = useState<string>('0.0');
  const [tiltOffsetY, setTiltOffsetY] = useState<string>('0.0');

  // Interactive Simulator Slider: Test raw sensor distance (Air Gap)
  const [testRawDistance, setTestRawDistance] = useState<number>(2.50);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (station && isOpen) {
      const currentSensorToRef = station.sensorToRefDistance ?? 2.0;
      setSensorToRef(String(currentSensorToRef));
      setRefName(station.referencePointName || 'ขอบตลิ่ง');
      setWarningLevel(
        station.warningLevel !== null && station.warningLevel !== undefined ? String(station.warningLevel) : ''
      );
      setCriticalLevel(
        station.criticalLevel !== null && station.criticalLevel !== undefined ? String(station.criticalLevel) : ''
      );
      setTiltOffsetX(
        station.tiltOffsetX !== undefined && station.tiltOffsetX !== null ? String(station.tiltOffsetX) : '0.0'
      );
      setTiltOffsetY(
        station.tiltOffsetY !== undefined && station.tiltOffsetY !== null ? String(station.tiltOffsetY) : '0.0'
      );

      const currentRaw = station.rawDistance ?? currentSensorToRef + 0.8;
      setTestRawDistance(Number(currentRaw.toFixed(2)));
      setErrorMsg(null);
    }
  }, [station, isOpen]);

  const numSensorToRef = Number(sensorToRef) || 2.0;
  const numWarning = warningLevel !== '' && !isNaN(Number(warningLevel)) ? Number(warningLevel) : null;
  const numCritical = criticalLevel !== '' && !isNaN(Number(criticalLevel)) ? Number(criticalLevel) : null;
  const effectiveRefName = refName.trim() !== '' ? refName.trim() : 'จุดอ้างอิง';

  // Relative level math: Reference distance - Sensor measured air gap
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
      setErrorMsg('กรุณากรอกระยะมากกว่า 0 เมตร');
      return;
    }

    const warn = warningLevel.trim() !== '' && !isNaN(Number(warningLevel)) ? Number(warningLevel) : null;
    const crit = criticalLevel.trim() !== '' && !isNaN(Number(criticalLevel)) ? Number(criticalLevel) : null;

    if (warn !== null && crit !== null && warn > crit) {
      setErrorMsg('เกณฑ์เฝ้าระวังต้องน้อยกว่าหรือเท่ากับเกณฑ์วิกฤต');
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
      title={`ตั้งค่าจุดอ้างอิงและระนาบเสา · ${station.name}`}
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ padding: '6px 14px' }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ padding: '6px 18px', minWidth: 100 }}
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
              gap: 8,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            <AlertTriangleIcon size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2-Column Responsive Layout: Inputs Left, Tactical Blueprint Vector Right */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: 14,
            alignItems: 'start',
          }}
        >
          {/* ── LEFT COLUMN: INPUTS ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Field 1: Sensor to Reference Point Distance */}
            <div>
              <label htmlFor={sensorInputId} className="label" style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'block' }}>
                ระยะติดตั้งถึงจุดอ้างอิง (ม.) *
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
                  placeholder="2.00"
                  required
                  style={{ paddingRight: '2.5rem', fontFamily: 'monospace', fontSize: 13 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                    fontSize: 12,
                  }}
                >
                  ม.
                </span>
              </div>
            </div>

            {/* Field 2: Reference Point Name */}
            <div>
              <label htmlFor={refNameInputId} className="label" style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4, display: 'block' }}>
                ชื่อเรียกจุดอ้างอิง
              </label>
              <input
                id={refNameInputId}
                type="text"
                className="input"
                value={refName}
                onChange={(e) => setRefName(e.target.value)}
                placeholder="เช่น ขอบตลิ่ง, สันเขื่อน"
                style={{ fontSize: 13 }}
              />
            </div>

            {/* Threshold Fields */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangleIcon size={13} />
                <span>เกณฑ์เตือนภัยระดับน้ำ</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label htmlFor={warningInputId} className="label" style={{ fontSize: 11.5, color: '#FBBF24', fontWeight: 600, marginBottom: 3, display: 'block' }}>
                    จุดเฝ้าระวัง (ม.)
                  </label>
                  <input
                    id={warningInputId}
                    type="number"
                    step="0.01"
                    className="input"
                    value={warningLevel}
                    onChange={(e) => setWarningLevel(e.target.value)}
                    placeholder="-0.50"
                    style={{
                      fontSize: 12.5,
                      fontFamily: 'monospace',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      background: 'rgba(245, 158, 11, 0.05)',
                      color: '#FCD34D',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor={criticalInputId} className="label" style={{ fontSize: 11.5, color: '#F87171', fontWeight: 600, marginBottom: 3, display: 'block' }}>
                    จุดวิกฤต (ม.)
                  </label>
                  <input
                    id={criticalInputId}
                    type="number"
                    step="0.01"
                    className="input"
                    value={criticalLevel}
                    onChange={(e) => setCriticalLevel(e.target.value)}
                    placeholder="0.00"
                    style={{
                      fontSize: 12.5,
                      fontFamily: 'monospace',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      background: 'rgba(239, 68, 68, 0.05)',
                      color: '#FCA5A5',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Tilt Zero-Reference Offset */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CompassIcon size={13} />
                <span>ระนาบตั้งต้นของเสา</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label htmlFor={tiltOffsetXId} className="label" style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 600, marginBottom: 3, display: 'block' }}>
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
                    style={{ fontSize: 12.5, fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label htmlFor={tiltOffsetYId} className="label" style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 600, marginBottom: 3, display: 'block' }}>
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
                    style={{ fontSize: 12.5, fontFamily: 'monospace' }}
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
                    marginTop: 8,
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#38BDF8',
                    fontSize: 11.5,
                    fontWeight: 600,
                    borderRadius: 6,
                    padding: '5px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <span>ใช้มุมปัจจุบัน ({station.tiltX}°, {station.tiltY}°)</span>
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: TACTICAL BLUEPRINT VECTOR SCHEMATIC ── */}
          <div
            style={{
              background: '#090E17',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 5 }}>
                <SlidersIcon size={13} style={{ color: '#38BDF8' }} />
                <span>ผังจำลองระดับน้ำ</span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: '1px 7px',
                  borderRadius: 999,
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
                  fontWeight: 700,
                }}
              >
                {isBlindZone ? 'Blind Zone' : simulatedStatus === 'critical' ? 'วิกฤต' : simulatedStatus === 'warning' ? 'เฝ้าระวัง' : 'ปกติ'}
              </span>
            </div>

            {/* Tactical Blueprint SVG */}
            <div
              style={{
                position: 'relative',
                height: 175,
                background: 'linear-gradient(180deg, #070B12 0%, #0B131F 100%)',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.06)',
                overflow: 'hidden',
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 320 175" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="blueprintWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity="0.95" />
                  </linearGradient>
                </defs>

                {/* Pole Structure */}
                <rect x="25" y="10" width="6" height="155" fill="#334155" rx="2" />
                <rect x="25" y="15" width="40" height="4" fill="#475569" rx="1" />

                {/* Ultrasonic Sensor Head */}
                <rect x="62" y="14" width="22" height="13" fill="#0369A1" rx="2" stroke="#38BDF8" strokeWidth="1.2" />
                <polygon points="73,27 68,32 78,32" fill="#38BDF8" />

                {/* Wave Beam Cone */}
                <path
                  d="M 65 32 L 35 170 L 115 170 Z"
                  fill="rgba(56, 189, 248, 0.05)"
                  stroke="rgba(56, 189, 248, 0.2)"
                  strokeDasharray="2 2"
                />

                {(() => {
                  const maxDisplayRange = Math.max(numSensorToRef + 1.2, 3.8);
                  const sensorY = 27;
                  const refY = Math.min(150, Math.max(45, sensorY + (numSensorToRef / maxDisplayRange) * 125));
                  const waterY = Math.min(160, Math.max(35, sensorY + (testRawDistance / maxDisplayRange) * 125));

                  return (
                    <>
                      {/* Water Body */}
                      <rect
                        x="35"
                        y={waterY}
                        width="280"
                        height={Math.max(0, 175 - waterY)}
                        fill="url(#blueprintWaterGrad)"
                      />
                      {/* Water Surface Line */}
                      <line x1="35" y1={waterY} x2="310" y2={waterY} stroke="#38BDF8" strokeWidth="2" />

                      {/* Reference Datum Line (0.00m) */}
                      <line
                        x1="20"
                        y1={refY}
                        x2="310"
                        y2={refY}
                        stroke="#F59E0B"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                      <rect x="180" y={refY - 16} width="125" height="15" fill="#0F172A" rx="3" stroke="#F59E0B" strokeWidth="1" />
                      <text x="185" y={refY - 5} fill="#FCD34D" fontSize="9" fontWeight="bold">
                        {effectiveRefName} (0.00 ม.)
                      </text>

                      {/* Measured Air Gap indicator */}
                      <line x1="86" y1={sensorY + 5} x2="86" y2={waterY} stroke="#38BDF8" strokeWidth="1.2" />
                      <text x="92" y={(sensorY + waterY) / 2 + 3} fill="#38BDF8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                        {testRawDistance.toFixed(2)} ม.
                      </text>
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Slider: Test Air Gap */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                <label htmlFor={testSliderId} style={{ color: '#94A3B8' }}>
                  ทดสอบปรับระยะผิวน้ำที่วัดได้
                </label>
                <strong className="tabular-nums font-mono" style={{ color: '#38BDF8' }}>{testRawDistance.toFixed(2)} ม.</strong>
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

            {/* Calculation Output Box */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: simulatedRelativeLevel >= 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${simulatedRelativeLevel >= 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
              }}
            >
              <div style={{ fontSize: 11, color: '#94A3B8' }}>ระดับน้ำคำนวณจำลองเทียบจุดอ้างอิง</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <span
                  className="tabular-nums font-mono"
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: simulatedRelativeLevel >= 0 ? '#F87171' : '#34D399',
                  }}
                >
                  {simulatedRelativeLevel >= 0 ? `+${simulatedRelativeLevel.toFixed(3)}` : simulatedRelativeLevel.toFixed(3)}
                </span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>เมตร</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
