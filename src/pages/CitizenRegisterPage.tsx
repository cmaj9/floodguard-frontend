import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchStations, registerCitizenApi } from '../services/apiService';
import { getLiffProfile, closeLiffWindow, isInLineClient, loginWithLiff } from '../services/liffService';
import type { StationWithReading } from '../types';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'email' | 'line'>('email');

  // Form Fields - Email
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('อำเภอเมืองเชียงใหม่');

  // Form Fields - LINE
  const urlUid = searchParams.get('uid') || '';
  const [lineUserId, setLineUserId] = useState<string>(urlUid);
  const [lineDisplayName, setLineDisplayName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Stations
  const [stations, setStations] = useState<StationWithReading[]>([]);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);

  // State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inLine, setInLine] = useState<boolean>(false);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const isLine = isInLineClient();
      setInLine(isLine);
      if (isLine) {
        setActiveTab('line');
      }

      // Try to fetch profile from LIFF
      try {
        const liffProfile = await getLiffProfile();
        if (liffProfile) {
          if (liffProfile.userId) setLineUserId(liffProfile.userId);
          if (liffProfile.displayName) {
            setLineDisplayName(liffProfile.displayName);
            setName((prev) => prev || liffProfile.displayName || '');
          }
          if (liffProfile.pictureUrl) setAvatarUrl(liffProfile.pictureUrl);
          setActiveTab('line');
        }
      } catch (err) {
        console.warn('LIFF Profile fetch warning:', err);
      }

      // Fetch active stations
      try {
        const stList = await fetchStations();
        setStations(stList);
        const activeIds = stList.filter((s) => s.status === 'active').map((s) => s.station_id);
        setSelectedStationIds(activeIds);
      } catch (err: any) {
        console.error('Fetch stations error:', err);
        setErrorMessage('ไม่สามารถโหลดข้อมูลสถานีได้ในขณะนี้');
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [urlUid]);

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

  const handleConnectLine = async () => {
    try {
      await loginWithLiff('/register');
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถเชื่อมต่อ LINE LIFF ได้');
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
        setSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(res.error || 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'ลงทะเบียนไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit via LINE LIFF
  const handleLineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineUserId.trim()) {
      setErrorMessage('ไม่พบรหัสผู้ใช้ LINE (LINE User ID) กรุณากดปุ่ม "เข้าสู่ระบบด้วย LINE" ด้านล่าง');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const registeredUser = await registerCitizenApi({
        lineUserId: lineUserId.trim(),
        displayName: lineDisplayName.trim() || name.trim() || undefined,
        phone: phone.trim() || undefined,
        district: district.trim() || undefined,
        stationIds: selectedStationIds,
      });

      localStorage.setItem('wl_auth_user', JSON.stringify(registeredUser));
      updateProfile(registeredUser);

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(err.message || 'บันทึกข้อมูลการลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleClose = () => {
    if (inLine) {
      closeLiffWindow();
    } else {
      navigate('/dashboard', { replace: true });
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
          background: '#080C14',
          color: '#F8FAFC',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid rgba(2, 132, 199, 0.2)',
            borderTopColor: '#0284C7',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div style={{ fontSize: 14, color: '#94A3B8' }}>กำลังโหลดข้อมูลระบบ...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #0f1f3d 0%, #080C14 70%)',
        color: '#F8FAFC',
        padding: '32px 16px 80px',
      }}
    >
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        {/* Brand */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Logo size="lg" />
        </div>

        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 50,
              height: 50,
              borderRadius: 14,
              background: 'rgba(2, 132, 199, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38BDF8',
              marginBottom: 12,
            }}
          >
            <ShieldCheckIcon size={26} />
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#38BDF8',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Citizen Registration
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
              color: '#FFFFFF',
            }}
          >
            ลงทะเบียนรับการแจ้งเตือนประชาชน
          </h1>
          <p
            style={{
              fontSize: 13,
              color: '#94A3B8',
              margin: 0,
              lineHeight: 1.5,
              maxWidth: 440,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            ลงทะเบียนเพื่อรับการแจ้งเตือนระดับน้ำวิกฤตรายสถานี และเข้าถึงฟังก์ชันติดตามสถานการณ์
          </p>
        </div>

        {/* Success Modal / Banner */}
        {success && (
          <div
            style={{
              marginBottom: 24,
              padding: '24px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10B981',
                  flexShrink: 0,
                }}
              >
                <CheckCircleIcon size={24} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#10B981' }}>
                  ลงทะเบียนประชาชนสำเร็จเรียบร้อยแล้ว
                </div>
                <div style={{ fontSize: 13, color: '#CBD5E1', marginTop: 3 }}>
                  ระบบได้บันทึกการตั้งค่าการแจ้งเตือนสถานีของคุณเรียบร้อยแล้ว
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleGoToDashboard}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px', fontSize: 14, fontWeight: 600, justifyContent: 'center' }}
              >
                เข้าสู่แดชบอร์ดระดับน้ำ
              </button>
              {inLine && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-secondary"
                  style={{ padding: '12px 18px', fontSize: 14, fontWeight: 600 }}
                >
                  ปิดหน้านี้
                </button>
              )}
            </div>
          </div>
        )}

        {!success && (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              backdropFilter: 'blur(16px)',
              padding: '24px 20px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* Tabs for Registration Mode */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                background: 'rgba(0, 0, 0, 0.25)',
                padding: 4,
                borderRadius: 10,
                marginBottom: 24,
              }}
            >
              <button
                type="button"
                onClick={() => { setActiveTab('email'); setErrorMessage(null); }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'email' ? 'var(--color-primary, #0284C7)' : 'transparent',
                  color: activeTab === 'email' ? '#FFFFFF' : 'var(--text-muted, #94A3B8)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <MailIcon size={16} />
                <span>สมัครด้วยอีเมล</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('line'); setErrorMessage(null); }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'line' ? '#06C755' : 'transparent',
                  color: activeTab === 'line' ? '#FFFFFF' : 'var(--text-muted, #94A3B8)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>สมัครผ่าน LINE (LIFF)</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 10,
                  color: '#F87171',
                  fontSize: 13,
                  marginBottom: 20,
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

            {/* TAB 1: EMAIL REGISTRATION */}
            {activeTab === 'email' && (
              <form onSubmit={handleEmailSubmit}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="label" htmlFor="reg-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserIcon size={14} style={{ color: 'var(--text-muted)' }} />
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
                    style={{ height: 42 }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="label" htmlFor="reg-email" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MailIcon size={14} style={{ color: 'var(--text-muted)' }} />
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
                    style={{ height: 42 }}
                  />
                </div>

                <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="label" htmlFor="reg-pass" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <KeyIcon size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>รหัสผ่าน</span>
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
                        style={{ height: 42, paddingRight: 38 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: 6,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                      >
                        {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label" htmlFor="reg-confirm-pass" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <KeyIcon size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>ยืนยันรหัสผ่าน</span>
                      <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      id="reg-confirm-pass"
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านซ้ำ"
                      required
                      style={{ height: 42 }}
                    />
                  </div>
                </div>

                <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div className="form-group">
                    <label className="label" htmlFor="reg-phone" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <PhoneIcon size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>เบอร์โทรศัพท์ (ไม่บังคับ)</span>
                    </label>
                    <input
                      id="reg-phone"
                      className="input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08X-XXX-XXXX"
                      style={{ height: 42 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label" htmlFor="reg-district" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPinIcon size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>พื้นที่/อำเภอ (ไม่บังคับ)</span>
                    </label>
                    <input
                      id="reg-district"
                      className="input"
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="เช่น อ.เมืองเชียงใหม่"
                      style={{ height: 42 }}
                    />
                  </div>
                </div>

                {/* Stations Selection */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label className="label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapIcon size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>เลือกสถานีที่ต้องการรับการแจ้งเตือน</span>
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleSelectAll(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38BDF8',
                          fontSize: 12,
                          cursor: 'pointer',
                          padding: 0,
                          fontWeight: 500,
                        }}
                      >
                        เลือกทั้งหมด
                      </button>
                      <span style={{ color: '#475569', fontSize: 12 }}>|</span>
                      <button
                        type="button"
                        onClick={() => handleSelectAll(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          fontSize: 12,
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
                      maxHeight: 180,
                      overflowY: 'auto',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {stations.map((st) => {
                      const isChecked = selectedStationIds.includes(st.station_id);
                      return (
                        <label
                          key={st.station_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '6px 8px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                            background: isChecked ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStation(st.station_id)}
                            style={{ accentColor: '#0284C7', width: 16, height: 16 }}
                          />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, color: '#F1F5F9' }}>{st.station_id}</span>
                            <span style={{ color: '#94A3B8', marginLeft: 8 }}>
                              {st.station_name || (st as any).name || st.location_name}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-lg"
                  style={{
                    width: '100%',
                    height: 44,
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 600,
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
            )}

            {/* TAB 2: LINE LIFF REGISTRATION */}
            {activeTab === 'line' && (
              <form onSubmit={handleLineSubmit}>
                {lineUserId ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 16px',
                      background: 'rgba(6, 199, 85, 0.1)',
                      border: '1px solid rgba(6, 199, 85, 0.3)',
                      borderRadius: 12,
                      marginBottom: 18,
                    }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #06C755' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: '#06C755',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFF',
                          fontWeight: 700,
                        }}
                      >
                        LINE
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
                        {lineDisplayName || 'ผู้ใช้งาน LINE'}
                      </div>
                      <div style={{ fontSize: 12, color: '#86EFAC' }}>เชื่อมต่อบัญชี LINE เรียบร้อยแล้ว</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 20, textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 14 }}>
                      ยังไม่ได้เชื่อมต่อกับ LINE กรุณากดปุ่มเพื่อเข้าสู่ระบบด้วย LINE
                    </p>
                    <button
                      type="button"
                      onClick={handleConnectLine}
                      className="btn"
                      style={{
                        backgroundColor: '#06C755',
                        color: '#FFF',
                        width: '100%',
                        padding: '12px',
                        fontSize: 14,
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      เชื่อมต่อบัญชี LINE
                    </button>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="label" htmlFor="line-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserIcon size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>ชื่อที่ใช้แสดง</span>
                  </label>
                  <input
                    id="line-name"
                    className="input"
                    type="text"
                    value={lineDisplayName || name}
                    onChange={(e) => setLineDisplayName(e.target.value)}
                    placeholder="ชื่อประชาชน"
                    style={{ height: 42 }}
                  />
                </div>

                <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div className="form-group">
                    <label className="label" htmlFor="line-phone" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <PhoneIcon size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>เบอร์โทรศัพท์ (ไม่บังคับ)</span>
                    </label>
                    <input
                      id="line-phone"
                      className="input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08X-XXX-XXXX"
                      style={{ height: 42 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label" htmlFor="line-district" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPinIcon size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>พื้นที่/อำเภอ</span>
                    </label>
                    <input
                      id="line-district"
                      className="input"
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="เช่น อ.เมืองเชียงใหม่"
                      style={{ height: 42 }}
                    />
                  </div>
                </div>

                {/* Stations Selection */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label className="label" style={{ margin: 0 }}>เลือกสถานีที่ต้องการรับการแจ้งเตือน</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleSelectAll(true)}
                        style={{ background: 'none', border: 'none', color: '#38BDF8', fontSize: 12, cursor: 'pointer' }}
                      >
                        เลือกทั้งหมด
                      </button>
                      <span style={{ color: '#475569', fontSize: 12 }}>|</span>
                      <button
                        type="button"
                        onClick={() => handleSelectAll(false)}
                        style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 12, cursor: 'pointer' }}
                      >
                        ยกเลิกทั้งหมด
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: 180,
                      overflowY: 'auto',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {stations.map((st) => {
                      const isChecked = selectedStationIds.includes(st.station_id);
                      return (
                        <label
                          key={st.station_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '6px 8px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                            background: isChecked ? 'rgba(6, 199, 85, 0.12)' : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStation(st.station_id)}
                            style={{ accentColor: '#06C755', width: 16, height: 16 }}
                          />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, color: '#F1F5F9' }}>{st.station_id}</span>
                            <span style={{ color: '#94A3B8', marginLeft: 8 }}>
                              {st.station_name || (st as any).name || st.location_name}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !lineUserId}
                  className="btn"
                  style={{
                    backgroundColor: lineUserId ? '#06C755' : 'rgba(255,255,255,0.1)',
                    color: '#FFF',
                    width: '100%',
                    height: 44,
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: 'none',
                    cursor: lineUserId ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
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
                    <span>ยืนยันการลงทะเบียนรับแจ้งเตือนผ่าน LINE</span>
                  )}
                </button>
              </form>
            )}

            {/* Bottom Links */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 16,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>มีบัญชีอยู่แล้ว? </span>
                <Link to="/login" style={{ color: '#38BDF8', fontWeight: 600, textDecoration: 'none' }}>
                  เข้าสู่ระบบ
                </Link>
              </div>

              <Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 12 }}>
                ข้ามไปหน้าแดชบอร์ด →
              </Link>
            </div>
          </div>
        )}

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
