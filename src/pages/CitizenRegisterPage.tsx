import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setPendingToast } from '../context/ToastContext';
import { fetchStations } from '../services/apiService';
import type { StationWithReading } from '../types';
import {
  AlertTriangleIcon,
  MapPinIcon,
  MapIcon,
  MailIcon,
  KeyIcon,
  UserIcon,
  PhoneIcon,
  EyeIcon,
  EyeOffIcon,
} from '../components/ui/Icons';
import Logo from '../components/ui/Logo';

export default function CitizenRegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');

  // Stations
  const [stations, setStations] = useState<StationWithReading[]>([]);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);

  // State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      try {
        const stList = await fetchStations();
        if (isMounted) {
          setStations(stList);
          const activeIds = stList.filter((s) => s.status === 'active').map((s) => s.station_id);
          setSelectedStationIds(activeIds);
        }
      } catch (err) {
        console.error('Fetch stations error:', err);
        if (isMounted) setErrorMessage('ไม่สามารถโหลดข้อมูลสถานีได้ในขณะนี้');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleStation = (stationId: string) => {
    setSelectedStationIds((prev) =>
      prev.includes(stationId) ? prev.filter((id) => id !== stationId) : [...prev, stationId]
    );
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      const activeIds = stations.filter((s) => s.status === 'active').map((s) => s.station_id);
      setSelectedStationIds(activeIds);
    } else {
      setSelectedStationIds([]);
    }
  };

  // Submit via Email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('กรุณากรอกอีเมล');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        district: district.trim() || undefined,
        stationIds: selectedStationIds,
      });

      if (res.success) {
        setPendingToast('ลงทะเบียนสำเร็จ เข้าสู่ระบบเรียบร้อยแล้ว', 'login');
        navigate('/dashboard', {
          replace: true,
          state: {
            registerSuccess: true,
            registerType: 'email',
            registeredName: name.trim(),
            subscribedStationIds: selectedStationIds,
          },
        });
      } else {
        setErrorMessage(res.error || 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'ลงทะเบียนไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at top, #0f1f3d 0%, #080C14 70%)',
          color: '#F8FAFC',
          gap: 16,
          padding: 20,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(2, 132, 199, 0.2)',
            borderTopColor: '#0284C7',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500 }}>กำลังโหลดข้อมูลระบบ...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #0f1f3d 0%, #080C14 75%)',
        color: '#F8FAFC',
        padding: '24px 16px 56px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Logo size="lg" />
        </div>

        {/* ── Main Registration Card ── */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            backdropFilter: 'blur(16px)',
            padding: '24px 20px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
          }}
        >
          {/* Card Title placed neatly inside the card top */}
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                margin: 0,
                color: '#FFFFFF',
              }}
            >
              ลงทะเบียนรับการแจ้งเตือนระดับน้ำ
            </h1>
          </div>

          {/* Error Notification */}
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 10,
                color: '#F87171',
                fontSize: 13,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              role="alert"
            >
              <AlertTriangleIcon size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleEmailSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
              {/* Name */}
              <div>
                <label
                  htmlFor="reg-name"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#E2E8F0',
                    marginBottom: 6,
                  }}
                >
                  <UserIcon size={14} style={{ color: '#94A3B8' }} />
                  <span>ชื่อ-นามสกุล</span>
                  <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="reg-name"
                  className="input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  required
                  style={{ width: '100%', height: 42, boxSizing: 'border-box' }}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="reg-email"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#E2E8F0',
                    marginBottom: 6,
                  }}
                >
                  <MailIcon size={14} style={{ color: '#94A3B8' }} />
                  <span>อีเมล</span>
                  <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="reg-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{ width: '100%', height: 42, boxSizing: 'border-box' }}
                />
              </div>

              {/* Passwords */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                <div>
                  <label
                    htmlFor="reg-pass"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#E2E8F0',
                      marginBottom: 6,
                    }}
                  >
                    <KeyIcon size={14} style={{ color: '#94A3B8' }} />
                    <span>รหัสผ่าน (6+ ตัวอักษร)</span>
                    <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="reg-pass"
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      required
                      style={{ width: '100%', height: 42, paddingRight: 40, boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: 6,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-confirm-pass"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#E2E8F0',
                      marginBottom: 6,
                    }}
                  >
                    <KeyIcon size={14} style={{ color: '#94A3B8' }} />
                    <span>ยืนยันรหัสผ่าน</span>
                    <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    id="reg-confirm-pass"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    required
                    style={{ width: '100%', height: 42, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Phone & District */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                <div>
                  <label
                    htmlFor="reg-phone"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#E2E8F0',
                      marginBottom: 6,
                    }}
                  >
                    <PhoneIcon size={14} style={{ color: '#94A3B8' }} />
                    <span>เบอร์โทรศัพท์ (ไม่บังคับ)</span>
                  </label>
                  <input
                    id="reg-phone"
                    className="input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    style={{ width: '100%', height: 42, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-district"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#E2E8F0',
                      marginBottom: 6,
                    }}
                  >
                    <MapPinIcon size={14} style={{ color: '#94A3B8' }} />
                    <span>พื้นที่/อำเภอ (ไม่บังคับ)</span>
                  </label>
                  <input
                    id="reg-district"
                    className="input"
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="ระบุอำเภอ/เขตที่อาศัยอยู่"
                    style={{ width: '100%', height: 42, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* Stations Selection */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>
                  <MapIcon size={14} style={{ color: '#38BDF8' }} />
                  <span>สถานีที่ต้องการรับแจ้งเตือน ({selectedStationIds.length}/{stations.length})</span>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38BDF8',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                    }}
                  >
                    เลือกทั้งหมด
                  </button>
                  <span style={{ color: '#475569' }}>|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    ยกเลิกทั้งหมด
                  </button>
                </div>
              </div>

              <div
                style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  padding: 8,
                  background: 'rgba(0, 0, 0, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {stations.map((st) => {
                  const isChecked = selectedStationIds.includes(st.station_id);
                  return (
                    <div
                      key={st.station_id}
                      onClick={() => handleToggleStation(st.station_id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        background: isChecked ? 'rgba(2, 132, 199, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                        border: isChecked ? '1px solid rgba(2, 132, 199, 0.4)' : '1px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ accentColor: '#0284C7', width: 16, height: 16, flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#38BDF8',
                              fontSize: 12,
                              background: 'rgba(56, 189, 248, 0.15)',
                              padding: '2px 6px',
                              borderRadius: 4,
                              marginRight: 8,
                            }}
                          >
                            {st.station_id}
                          </span>
                          <span style={{ color: '#F1F5F9', fontWeight: 500 }}>
                            {st.station_name || (st as any).name || st.location_name}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 8, flexShrink: 0 }}>
                        {st.station_type === 'river' ? 'แม่น้ำ' : st.station_type === 'canal' ? 'คลอง' : 'สถานี'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: 44,
                justifyContent: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {isSubmitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  กำลังบันทึกข้อมูล...
                </span>
              ) : (
                <span>สมัครสมาชิกและเข้าสู่ระบบทันที</span>
              )}
            </button>
          </form>

          {/* Bottom Navigation Links */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <span style={{ color: '#94A3B8' }}>มีบัญชีอยู่แล้ว? </span>
              <Link to="/login" style={{ color: '#38BDF8', fontWeight: 600, textDecoration: 'none' }}>
                เข้าสู่ระบบ
              </Link>
            </div>

            <Link to="/dashboard" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 12 }}>
              ข้ามไปหน้าแดชบอร์ด →
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#64748B' }}>
          © 2025 Water Level Monitoring System · กรมทรัพยากรน้ำ
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
