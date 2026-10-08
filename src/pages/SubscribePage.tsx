import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { StationWithReading, UserRole, AuthUser } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  fetchStations,
  fetchSubscriberPreferences,
  saveSubscriberPreferences,
  checkCitizenStatusApi,
} from '../services/apiService';
import {
  getLiffProfile,
  isInLineClient,
  closeLiffWindow,
  loginWithLiff,
} from '../services/liffService';
import {
  BellIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  MapPinIcon,
  MapIcon,
  UserIcon,
  ShieldIcon,
  ArrowRightIcon,
  RefreshCwIcon,
} from '../components/ui/Icons';

const TIMEOUT_MS = 8000;

export default function SubscribePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateProfile } = useAuth();

  const [initialUid] = useState(searchParams.get('uid') || '');
  const [lineUserId, setLineUserId] = useState<string>(initialUid);
  const [displayName, setDisplayName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [inLine, setInLine] = useState<boolean>(false);
  const [stations, setStations] = useState<StationWithReading[]>([]);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);

  // Page Lifecycle States: 'loading' | 'timeout' | 'ready'
  const [pageState, setPageState] = useState<'loading' | 'timeout' | 'ready'>('loading');
  const [retryCount, setRetryCount] = useState<number>(0);

  // Role detection state for RBAC experience
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userData, setUserData] = useState<AuthUser | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load available stations and existing subscriber preferences
  useEffect(() => {
    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function initData() {
      setPageState('loading');
      setErrorMessage(null);
      const isClient = isInLineClient();
      setInLine(isClient);

      // Start 8-second timeout timer
      timer = setTimeout(() => {
        if (!isCancelled) {
          console.warn('[SubscribePage] Timeout waiting for LINE User ID (8s)');
          setPageState((curr) => (curr === 'loading' ? 'timeout' : curr));
        }
      }, TIMEOUT_MS);

      try {
        const stationPromise = fetchStations().catch((err) => {
          console.error('[SubscribePage] Failed to fetch stations:', err);
          return [] as StationWithReading[];
        });

        let activeUid = initialUid;

        // Auto-fetch LINE profile if not provided in URL
        if (!activeUid) {
          try {
            const profile = await getLiffProfile();
            if (profile?.userId) {
              activeUid = profile.userId;
              if (profile.displayName) setDisplayName(profile.displayName);
              if (profile.pictureUrl) setAvatarUrl(profile.pictureUrl);
              setInLine(true);
            }
          } catch (liffErr) {
            console.warn('[SubscribePage] LIFF Profile error:', liffErr);
          }
        } else {
          setInLine(true);
        }

        // Fallback: check localStorage for previously authenticated user with line_user_id
        if (!activeUid) {
          const savedAuth = localStorage.getItem('wl_auth_user');
          if (savedAuth) {
            try {
              const parsed = JSON.parse(savedAuth);
              if (parsed?.line_user_id) {
                activeUid = parsed.line_user_id;
                if (parsed.name && !displayName) setDisplayName(parsed.name);
              }
            } catch {}
          }
        }

        if (isCancelled) return;

        // If we still could not resolve activeUid, trigger timeout state
        if (!activeUid) {
          if (timer) clearTimeout(timer);
          setPageState('timeout');
          return;
        }

        // Active LINE User ID acquired successfully!
        if (timer) clearTimeout(timer);
        setLineUserId(activeUid);

        // 1. Check user role from backend database
        try {
          const statusRes = await checkCitizenStatusApi(activeUid);
          if (statusRes.registered && statusRes.data) {
            const matchedUser = statusRes.data;
            setUserRole(matchedUser.role);
            setUserData(matchedUser);
            if (matchedUser.name && !displayName) setDisplayName(matchedUser.name);
            localStorage.setItem('wl_auth_user', JSON.stringify(matchedUser));
            if (updateProfile) updateProfile(matchedUser);
          } else {
            setUserRole('citizen');
          }
        } catch (statusErr) {
          console.warn('[SubscribePage] Role check failed, defaulting to citizen:', statusErr);
          setUserRole('citizen');
        }

        // 2. Load station list & user subscriptions
        const stationList = await stationPromise;
        setStations(stationList);

        try {
          const prefs = await fetchSubscriberPreferences(activeUid);
          if (prefs) {
            if (prefs.display_name && !displayName) setDisplayName(prefs.display_name);
            if (Array.isArray(prefs.station_ids) && prefs.station_ids.length > 0) {
              setSelectedStationIds(prefs.station_ids);
            } else {
              setSelectedStationIds(
                stationList.filter((s) => s.status === 'active').map((s) => s.station_id)
              );
            }
          }
        } catch {
          setSelectedStationIds(
            stationList.filter((s) => s.status === 'active').map((s) => s.station_id)
          );
        }

        if (!isCancelled) {
          setPageState('ready');
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[SubscribePage] Init error:', err);
          setErrorMessage(err.message || 'ไม่สามารถโหลดข้อมูลได้');
          setPageState('timeout');
        }
      }
    }

    initData();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [initialUid, updateProfile, retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const handleToggleStation = (stationId: string) => {
    setSelectedStationIds((prev) =>
      prev.includes(stationId)
        ? prev.filter((id) => id !== stationId)
        : [...prev, stationId]
    );
  };

  const handleSelectAll = () => {
    const allActiveIds = stations.filter((s) => s.status === 'active').map((s) => s.station_id);
    setSelectedStationIds(allActiveIds);
  };

  const handleDeselectAll = () => {
    setSelectedStationIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'admin' || userRole === 'staff') {
      return;
    }
    if (!lineUserId.trim()) {
      setErrorMessage('กรุณาระบุ LINE User ID เพื่อผูกกับระบบการแจ้งเตือน');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSavedSuccess(false);

    try {
      await saveSubscriberPreferences({
        line_user_id: lineUserId.trim(),
        display_name: displayName.trim() || undefined,
        station_ids: selectedStationIds,
      });

      // Save to localStorage so Dashboard remembers across visits
      localStorage.setItem('subscribed_station_ids', JSON.stringify(selectedStationIds));

      const chosenNames = stations
        .filter((s) => selectedStationIds.includes(s.station_id))
        .map((s) => s.station_name || s.station_id);

      navigate('/dashboard', {
        replace: true,
        state: {
          justSubscribed: true,
          subscribedStationIds: selectedStationIds,
          subscribedStationNames: chosenNames,
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'บันทึกข้อมูลการติดตามไม่สำเร็จ');
      setSubmitting(false);
    }
  };

  // ─── STATE 1: LOADING ───────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at top, #0d1a33 0%, #080C14 70%)',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '3px solid rgba(56, 189, 248, 0.2)',
            borderTopColor: '#38BDF8',
            animation: 'spin 0.8s linear infinite',
            marginBottom: 20,
          }}
        />
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#FFFFFF' }}>
          กำลังดึงข้อมูลบัญชี LINE
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 300, lineHeight: 1.5 }}>
          กรุณารอสักครู่ ระบบกำลังยืนยันตัวตนและตรวจสอบสิทธิ์การใช้งาน...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── STATE 2: TIMEOUT / FAILED ──────────────────────────────────
  if (pageState === 'timeout') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at top, #0d1a33 0%, #080C14 70%)',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EF4444',
            marginBottom: 18,
          }}
        >
          <AlertTriangleIcon size={26} />
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#FFFFFF' }}>
          ไม่สามารถดึงข้อมูลบัญชี LINE ได้
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px', maxWidth: 320, lineHeight: 1.5 }}>
          การเชื่อมต่อใช้เวลานานเกินกำหนด หรือไม่ได้เปิดผ่านแอปพลิเคชัน LINE
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
          <button
            type="button"
            onClick={handleRetry}
            style={{
              width: '100%',
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 10,
              border: 'none',
              background: '#0284C7',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            }}
          >
            <RefreshCwIcon size={16} />
            <span>ลองใหม่อีกครั้ง</span>
          </button>

          <button
            type="button"
            onClick={() => closeLiffWindow()}
            style={{
              width: '100%',
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            ปิดหน้าต่าง LINE
          </button>

          {!inLine && (
            <button
              type="button"
              onClick={() => loginWithLiff('/subscribe')}
              style={{
                width: '100%',
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 10,
                border: '1px solid rgba(6, 199, 85, 0.4)',
                background: 'rgba(6, 199, 85, 0.15)',
                color: '#4ADE80',
                cursor: 'pointer',
                marginTop: 4,
              }}
            >
              เข้าสู่ระบบด้วย LINE (Web Login)
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── STATE 3: ADMIN / STAFF ROLE LOCK SCREEN ─────────────────────
  if (userRole === 'admin' || userRole === 'staff') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at top, #0d1a33 0%, #080C14 70%)',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            background: '#0F172A',
            border:
              userRole === 'admin'
                ? '1px solid rgba(168, 85, 247, 0.35)'
                : '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: 16,
            padding: 24,
            boxShadow:
              '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            textAlign: 'center',
          }}
        >
          {/* Icon Header */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                userRole === 'admin'
                  ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(99, 102, 241, 0.2) 100%)'
                  : 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(2, 132, 199, 0.2) 100%)',
              border:
                userRole === 'admin'
                  ? '1px solid rgba(168, 85, 247, 0.4)'
                  : '1px solid rgba(56, 189, 248, 0.4)',
              color: userRole === 'admin' ? '#C084FC' : '#38BDF8',
            }}
          >
            {userRole === 'admin' ? <ShieldIcon size={28} /> : <MapPinIcon size={28} />}
          </div>

          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 6px 0',
              letterSpacing: '-0.01em',
            }}
          >
            {userRole === 'admin' ? 'พบสิทธิ์ผู้ดูแลระบบ' : 'พบสิทธิ์เจ้าหน้าที่ส่วนท้องถิ่น'}
          </h3>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              margin: '0 0 16px 0',
              lineHeight: 1.5,
            }}
          >
            {userRole === 'admin'
              ? 'บัญชี LINE ของท่านเชื่อมต่อกับสิทธิ์ผู้ดูแลระบบ FloodGuard'
              : 'บัญชี LINE ของท่านเชื่อมต่อกับสิทธิ์เจ้าหน้าที่ส่วนท้องถิ่น'}
          </p>

          {/* User Profile Card */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userData?.name || displayName}
                style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  flexShrink: 0,
                }}
              >
                <UserIcon size={20} />
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {userData?.name || displayName || 'ผู้ใช้งาน'}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {userData?.email || 'เชื่อมต่อผ่าน LINE'}
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                background:
                  userRole === 'admin'
                    ? 'rgba(168, 85, 247, 0.2)'
                    : 'rgba(56, 189, 248, 0.2)',
                color: userRole === 'admin' ? '#D8B4FE' : '#7DD3FC',
                border:
                  userRole === 'admin'
                    ? '1px solid rgba(168, 85, 247, 0.4)'
                    : '1px solid rgba(56, 189, 248, 0.4)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {userRole === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}
            </span>
          </div>

          {/* Action Buttons: Only Go to Management / Stations & Close LINE Window */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                if (userRole === 'admin') {
                  navigate('/management');
                } else {
                  navigate('/stations');
                }
              }}
              style={{
                width: '100%',
                padding: '12px 18px',
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                border: 'none',
                color: '#FFFFFF',
                background:
                  userRole === 'admin'
                    ? 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)'
                    : 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                boxShadow:
                  userRole === 'admin'
                    ? '0 4px 14px rgba(124, 58, 237, 0.35)'
                    : '0 4px 14px rgba(2, 132, 199, 0.35)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span>
                {userRole === 'admin'
                  ? 'ไปยังหน้าจัดการระบบ (Management)'
                  : 'ไปยังหน้าสถานีตรวจวัด (Stations)'}
              </span>
              <ArrowRightIcon size={16} />
            </button>

            <button
              type="button"
              onClick={() => closeLiffWindow()}
              style={{
                width: '100%',
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span>ปิดหน้าต่าง LINE</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STATE 4: CITIZEN SUBSCRIPTION PAGE ─────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #0d1a33 0%, #080C14 70%)',
        color: 'var(--text-primary)',
        padding: '24px 16px calc(32px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        width: '100%',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
        {/* Compact Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#38BDF8',
              marginBottom: 12,
            }}
          >
            <BellIcon size={22} />
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
              color: '#FFFFFF',
            }}
          >
            เลือกสถานีแจ้งเตือนผ่าน LINE
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            รับการแจ้งเตือนระดับน้ำและสถานการณ์น้ำท่วมเรียลไทม์
          </p>
        </div>

        {/* Success Banner */}
        {savedSuccess && (
          <div
            style={{
              marginBottom: 16,
              padding: '14px 16px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircleIcon size={20} style={{ color: '#10B981', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981' }}>
                  บันทึกการตั้งค่าการติดตามเรียบร้อยแล้ว
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  ระบบจะส่งข้อความแจ้งเตือนผ่านทาง LINE อัตโนมัติเมื่อมีเหตุการณ์น้ำ
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/dashboard')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
              >
                <MapIcon size={14} />
                <span>เปิดดูแดชบอร์ด</span>
              </button>
              {inLine && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => closeLiffWindow()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  <span>กลับสู่ LINE Chat</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
            }}
          >
            <AlertTriangleIcon size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Clean User Profile Capsule (NO debug input box) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(17, 24, 39, 0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              marginBottom: 16,
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName || 'LINE User'}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: '2px solid rgba(56, 189, 248, 0.4)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'rgba(56, 189, 248, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38BDF8',
                    flexShrink: 0,
                  }}
                >
                  <UserIcon size={18} />
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {displayName || 'ผู้ใช้งาน LINE'}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 2,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#10B981',
                      display: 'inline-block',
                    }}
                  />
                  <span>เชื่อมต่อ LINE แล้ว</span>
                </div>
              </div>
            </div>
          </div>

          {/* Station Selection Card */}
          <div
            style={{
              background: 'rgba(17, 24, 39, 0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: '16px',
              marginBottom: 20,
            }}
          >
            {/* Header: Title + Select All / Clear */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
                  สถานีเฝ้าระวัง
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38BDF8',
                  }}
                >
                  {selectedStationIds.length}/{stations.length}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  ยกเลิก
                </button>
              </div>
            </div>

            {/* Station List */}
            {stations.length === 0 ? (
              <div
                style={{
                  padding: '24px 0',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                }}
              >
                กำลังโหลดข้อมูลสถานี...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stations.map((st) => {
                  const isChecked = selectedStationIds.includes(st.station_id);
                  const isOffline = st.status !== 'active';

                  return (
                    <div
                      key={st.station_id}
                      onClick={() => handleToggleStation(st.station_id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: isChecked
                          ? 'rgba(56, 189, 248, 0.08)'
                          : 'rgba(255, 255, 255, 0.02)',
                        border: isChecked
                          ? '1px solid rgba(56, 189, 248, 0.35)'
                          : '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        {/* Custom Checkbox */}
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            border: isChecked
                              ? '2px solid #38BDF8'
                              : '2px solid rgba(255, 255, 255, 0.25)',
                            background: isChecked ? '#38BDF8' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#080C14',
                            flexShrink: 0,
                          }}
                        >
                          {isChecked && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#080C14" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>

                        {/* Station Name & Location */}
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 14,
                              color: '#FFFFFF',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {st.station_name || st.station_id}
                          </div>
                          {st.location_name && (
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                marginTop: 2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              <MapPinIcon size={11} style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {st.location_name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div style={{ flexShrink: 0 }}>
                        {isOffline ? (
                          <span
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'rgba(148, 163, 184, 0.12)',
                              color: 'var(--text-muted)',
                              border: '1px solid rgba(148, 163, 184, 0.2)',
                            }}
                          >
                            ปิดปรับปรุง
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#10B981',
                                display: 'inline-block',
                              }}
                            />
                            <span style={{ fontSize: 11, color: '#10B981', fontWeight: 500 }}>
                              พร้อมใช้งาน
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky CTA Bottom Bar */}
          <div
            style={{
              position: 'sticky',
              bottom: 12,
              zIndex: 10,
              width: '100%',
            }}
          >
            <button
              type="submit"
              disabled={submitting || selectedStationIds.length === 0}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '13px 20px',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: selectedStationIds.length === 0 ? undefined : '#0284C7',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                cursor: selectedStationIds.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <BellIcon size={16} />
              <span>
                {submitting
                  ? 'กำลังบันทึก...'
                  : `บันทึกการติดตาม (${selectedStationIds.length} สถานี)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
