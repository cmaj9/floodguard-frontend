import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchStations, registerCitizenApi, checkCitizenStatusApi } from '../services/apiService';
import { getLiffProfile, isInLineClient, loginWithLiff } from '../services/liffService';
import type { StationWithReading, AuthUser } from '../types';
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
  ShieldCheckIcon,
  RefreshCwIcon,
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
  const [district, setDistrict] = useState('');

  // Form Fields - LINE
  const urlUid = searchParams.get('uid') || '';
  const [lineUserId, setLineUserId] = useState<string>(urlUid);
  const [lineDisplayName, setLineDisplayName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Elevated account detection (Admin / Staff)
  const [elevatedAccount, setElevatedAccount] = useState<AuthUser | null>(null);

  // Stations
  const [stations, setStations] = useState<StationWithReading[]>([]);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);

  // State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCheckingLine, setIsCheckingLine] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      const isLine = isInLineClient();

      if (isLine || urlUid) {
        if (isMounted) setActiveTab('line');
      }

      // 1. Fetch active stations
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
      }

      // 2. Resolve LINE Profile & check registration status
      try {
        setIsCheckingLine(true);
        let uid = urlUid;
        let dName = '';
        let pic: string | null = null;

        const liffProfile = await getLiffProfile();
        if (liffProfile) {
          if (liffProfile.userId) uid = liffProfile.userId;
          if (liffProfile.displayName) dName = liffProfile.displayName;
          if (liffProfile.pictureUrl) pic = liffProfile.pictureUrl;
        }

        if (uid && isMounted) {
          setLineUserId(uid);
          if (dName) {
            setLineDisplayName(dName);
            setName((prev) => prev || dName);
          }
          if (pic) setAvatarUrl(pic);
          setActiveTab('line');

          // Check if this LINE user already exists in DB
          try {
            const statusCheck = await checkCitizenStatusApi(uid);
            if (statusCheck?.registered && statusCheck.data) {
              const existingUser = statusCheck.data;
              if (existingUser.role === 'citizen') {
                // Citizen already registered -> Auto login & immediately navigate to dashboard
                localStorage.setItem('wl_auth_user', JSON.stringify(existingUser));
                updateProfile(existingUser);
                navigate('/dashboard', {
                  replace: true,
                  state: {
                    registerSuccess: true,
                    alreadyLoggedIn: true,
                    registerType: 'line',
                    registeredName: existingUser.name || dName || 'ผู้ใช้ LINE',
                    subscribedStationIds: existingUser.stationIds || [],
                  },
                });
                return;
              } else {
                // Admin or Staff role -> display elevated role notice
                setElevatedAccount(existingUser);
              }
            }
          } catch (statusErr) {
            console.warn('Citizen status check warning:', statusErr);
          }
        }
      } catch (liffErr) {
        console.warn('LIFF init warning:', liffErr);
      } finally {
        if (isMounted) {
          setIsCheckingLine(false);
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [urlUid, navigate, updateProfile]);

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
        // Registration success -> Navigate immediately to dashboard with slide-in toast notification
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

  // Submit via LINE LIFF
  const handleLineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineUserId.trim()) {
      setErrorMessage('ไม่พบรหัสผู้ใช้ LINE (LINE User ID) กรุณากดปุ่ม "เชื่อมต่อบัญชี LINE"');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const finalName = lineDisplayName.trim() || name.trim() || 'ผู้ใช้ LINE';
      const registeredUser = await registerCitizenApi({
        lineUserId: lineUserId.trim(),
        displayName: finalName,
        phone: phone.trim() || undefined,
        district: district.trim() || undefined,
        stationIds: selectedStationIds,
      });

      localStorage.setItem('wl_auth_user', JSON.stringify(registeredUser));
      updateProfile(registeredUser);

      // Registration success -> Navigate immediately to dashboard with slide-in toast notification
      navigate('/dashboard', {
        replace: true,
        state: {
          registerSuccess: true,
          registerType: 'line',
          registeredName: finalName,
          subscribedStationIds: selectedStationIds,
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'บันทึกข้อมูลการลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
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
        <div style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500 }}>กำลังตรวจสอบข้อมูลระบบและสถานะ...</div>
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
        padding: '28px 16px 64px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 540, margin: '0 auto', width: '100%' }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, textAlign: 'center' }}>
          <Logo size="lg" />
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '16px 0 6px 0',
              color: '#FFFFFF',
            }}
          >
            ลงทะเบียนรับการแจ้งเตือนระดับน้ำ
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            เลือกสถานีที่สนใจเพื่อรับการเตือนภัยวิกฤตน้ำแบบเรียลไทม์
          </p>
        </div>

        {/* ── Elevated Role Warning Card (Admin / Staff already logged in via LINE) ── */}
        {elevatedAccount ? (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: 16,
              backdropFilter: 'blur(16px)',
              padding: '24px 20px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F59E0B',
                  flexShrink: 0,
                }}
              >
                <ShieldCheckIcon size={24} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FDE68A' }}>
                  บัญชีนี้มีสิทธิ์ระดับ {elevatedAccount.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'เจ้าหน้าที่ (Staff)'}
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                  คุณ {elevatedAccount.name} ({elevatedAccount.email})
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              บัญชี LINE นี้ถูกผูกไว้กับสิทธิ์การจัดการระบบเรียบร้อยแล้ว ไม่จำเป็นต้องลงทะเบียนประชาชนใหม่
              ท่านสามารถเข้าใช้งานส่วนงานบริหารหรือดูแดชบอร์ดระดับน้ำได้ทันที
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => navigate('/management', { replace: true })}
                className="btn btn-primary"
                style={{
                  padding: '12px',
                  fontSize: 13,
                  fontWeight: 600,
                  justifyContent: 'center',
                  background: '#F59E0B',
                  borderColor: '#D97706',
                  color: '#000',
                }}
              >
                ไปที่หน้าจัดการระบบ
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard', { replace: true })}
                className="btn btn-secondary"
                style={{ padding: '12px', fontSize: 13, fontWeight: 600, justifyContent: 'center' }}
              >
                ไปที่แดชบอร์ด
              </button>
            </div>
          </div>
        ) : (
          /* ── Main Registration Container ── */
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              backdropFilter: 'blur(16px)',
              padding: '22px 18px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
            }}
          >
            {/* Tabs for Registration Mode */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                background: 'rgba(0, 0, 0, 0.3)',
                padding: 4,
                borderRadius: 10,
                marginBottom: 20,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab('email');
                  setErrorMessage(null);
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'email' ? '#0284C7' : 'transparent',
                  color: activeTab === 'email' ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <MailIcon size={15} />
                <span>สมัครด้วยอีเมล</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('line');
                  setErrorMessage(null);
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'line' ? '#06C755' : 'transparent',
                  color: activeTab === 'line' ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>สมัครผ่าน LINE</span>
              </button>
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

            {/* ═══════════════════════════════════════════════
                TAB 1: EMAIL REGISTRATION
            ═══════════════════════════════════════════════ */}
            {activeTab === 'email' && (
              <form onSubmit={handleEmailSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
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
            )}

            {/* ═══════════════════════════════════════════════
                TAB 2: LINE LIFF REGISTRATION
            ═══════════════════════════════════════════════ */}
            {activeTab === 'line' && (
              <form onSubmit={handleLineSubmit}>
                {lineUserId ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      background: 'rgba(6, 199, 85, 0.12)',
                      border: '1px solid rgba(6, 199, 85, 0.35)',
                      borderRadius: 12,
                      marginBottom: 18,
                    }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #06C755', flexShrink: 0 }}
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
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        LINE
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lineDisplayName || 'ผู้ใช้งาน LINE'}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: 'rgba(6, 199, 85, 0.25)',
                            color: '#4ADE80',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          เชื่อมต่อแล้ว
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, fontFamily: 'monospace' }}>
                        ID: {lineUserId.slice(0, 10)}...
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: '18px 16px',
                      background: 'rgba(6, 199, 85, 0.08)',
                      border: '1px dashed rgba(6, 199, 85, 0.3)',
                      borderRadius: 12,
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ fontSize: 13, color: '#CBD5E1', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                      เชื่อมต่อกับบัญชี LINE ของคุณ เพื่อรับการแจ้งเตือนระดับน้ำวิกฤตผ่าน LINE ได้อย่างสะดวกรวดเร็ว
                    </p>
                    <button
                      type="button"
                      onClick={handleConnectLine}
                      disabled={isCheckingLine}
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      {isCheckingLine ? (
                        <>
                          <RefreshCwIcon size={16} />
                          <span>กำลังตรวจสอบสถานะ LINE...</span>
                        </>
                      ) : (
                        <span>เชื่อมต่อบัญชี LINE</span>
                      )}
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                  <div>
                    <label
                      htmlFor="line-name"
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
                      <span>ชื่อที่ใช้แสดง</span>
                    </label>
                    <input
                      id="line-name"
                      className="input"
                      type="text"
                      value={lineDisplayName || name}
                      onChange={(e) => setLineDisplayName(e.target.value)}
                      placeholder="ชื่อประชาชน"
                      style={{ width: '100%', height: 42, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    <div>
                      <label
                        htmlFor="line-phone"
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
                        id="line-phone"
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
                        htmlFor="line-district"
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
                        id="line-district"
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
                      <MapIcon size={14} style={{ color: '#06C755' }} />
                      <span>สถานีที่ต้องการรับแจ้งเตือน ({selectedStationIds.length}/{stations.length})</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                      <button
                        type="button"
                        onClick={() => handleSelectAll(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#4ADE80',
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
                            background: isChecked ? 'rgba(6, 199, 85, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                            border: isChecked ? '1px solid rgba(6, 199, 85, 0.4)' : '1px solid transparent',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              style={{ accentColor: '#06C755', width: 16, height: 16, flexShrink: 0 }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: '#4ADE80',
                                  fontSize: 12,
                                  background: 'rgba(6, 199, 85, 0.15)',
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

                <button
                  type="submit"
                  disabled={isSubmitting || !lineUserId}
                  className="btn"
                  style={{
                    backgroundColor: lineUserId ? '#06C755' : 'rgba(255, 255, 255, 0.12)',
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

            {/* Bottom Navigation Links */}
            <div
              style={{
                marginTop: 22,
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
