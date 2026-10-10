import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2Icon,
  UsersIcon,
  ClipboardListIcon,
  BellIcon,
  UserIcon,
  LogOutIcon,
  KeyIcon,
  ArrowRightIcon,
  ShieldIcon,
} from '../components/ui/Icons';

export default function ManagementHubPage() {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const role = user?.role || 'citizen';
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
  const isCitizen = !isGuest && role === 'citizen';

  const roleLabel = isAdmin
    ? 'ผู้ดูแลระบบ (Admin)'
    : isStaff
    ? 'เจ้าหน้าที่ส่วนท้องถิ่น (Local Staff)'
    : isGuest
    ? 'ผู้เยี่ยมชม (Guest)'
    : 'ประชาชนทั่วไป (Citizen)';
  const roleBadgeClass = isAdmin
    ? 'badge-role-admin'
    : isStaff
    ? 'badge-role-staff'
    : 'badge-role-citizen';

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    navigate('/login', { replace: true });
  };

  return (
    <div
      className="page-container"
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '1.25rem 1rem 6rem 1rem',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. HEADER SECTION (Role-Aware & Visual-First) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '16px 20px',
          background: 'var(--card-surface, #0C0E12)',
          border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldIcon size={22} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 'clamp(1.1rem, 3.5vw, 1.35rem)',
                fontWeight: 800,
                color: '#F8FAFC',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              ศูนย์จัดการระบบ
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span className={`badge ${roleBadgeClass}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                {roleLabel}
              </span>
              {!isGuest && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {user?.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Live system status beacon */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: 11,
              color: '#34D399',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
              }}
              className="heartbeat-dot"
            />
            <span>ระบบพร้อมปฏิบัติการ</span>
          </div>

          {/* Quick Back to Dashboard Button */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn btn-secondary btn-sm tactile-press"
            style={{
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>ดูแดชบอร์ดหลัก</span>
            <ArrowRightIcon size={14} />
          </button>
        </div>
      </div>

      {/* ── 2. ACTION TILES GRID (Categorized Colors, No Glowing Blurs) ── */}
      <div
        className="management-tiles-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {/* TILE 1: STATIONS MANAGEMENT (Staff & Admin) */}
        {(isAdmin || isStaff) && (
          <div
            onClick={() => navigate('/stations')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/stations');
              }
            }}
            role="button"
            tabIndex={0}
            className="management-tile tile-cyan tactile-press"
            style={{
              padding: '1.25rem',
              background: 'var(--card-surface, #0C0E12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 16,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 140,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(14, 165, 233, 0.12)',
                    color: '#0EA5E9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Building2Icon size={20} />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(14, 165, 233, 0.12)',
                    color: '#38BDF8',
                    border: '1px solid rgba(14, 165, 233, 0.25)',
                  }}
                >
                  {isAdmin ? 'เพิ่ม/ลบ/แก้ไข' : 'พารามิเตอร์ & คาลิเบรต'}
                </span>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}>
                จัดการสถานีตรวจวัด
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {isAdmin ? 'จัดการทุกสถานีในระบบ, เกณฑ์เตือนภัย, Presets' : 'สถานีในพื้นที่รับผิดชอบ, เกณฑ์วิกฤต, คาลิเบรต'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, color: '#38BDF8', fontSize: 13, fontWeight: 600 }}>
              <span>เข้าสู่หน้าจัดการสถานี</span>
              <span className="tile-arrow" style={{ marginLeft: 6 }}>
                <ArrowRightIcon size={14} />
              </span>
            </div>
          </div>
        )}

        {/* TILE 2: USER MANAGEMENT (Admin Only per 4.3) */}
        {isAdmin && (
          <div
            onClick={() => navigate('/users')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/users');
              }
            }}
            role="button"
            tabIndex={0}
            className="management-tile tile-blue tactile-press"
            style={{
              padding: '1.25rem',
              background: 'var(--card-surface, #0C0E12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 16,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 140,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: '#3B82F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UsersIcon size={20} />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: '#60A5FA',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                  }}
                >
                  ผู้ดูแลระบบ
                </span>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}>
                จัดการผู้ใช้งานระบบ
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                จัดการบัญชีเจ้าหน้าที่ส่วนท้องถิ่นและประชาชน, สิทธิ์เข้าถึง
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, color: '#60A5FA', fontSize: 13, fontWeight: 600 }}>
              <span>เข้าสู่หน้าจัดการผู้ใช้</span>
              <span className="tile-arrow" style={{ marginLeft: 6 }}>
                <ArrowRightIcon size={14} />
              </span>
            </div>
          </div>
        )}

        {/* TILE 3: DATA HISTORY & CSV EXPORT (Staff & Admin per 3.3, 4.4) */}
        {(isAdmin || isStaff) && (
          <div
            onClick={() => navigate('/history')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/history');
              }
            }}
            role="button"
            tabIndex={0}
            className="management-tile tile-emerald tactile-press"
            style={{
              padding: '1.25rem',
              background: 'var(--card-surface, #0C0E12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 16,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 140,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ClipboardListIcon size={20} />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#34D399',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  ส่งออก CSV ได้
                </span>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}>
                ประวัติและส่งออกข้อมูล
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                บันทึกการวัดระดับน้ำย้อนหลัง, สถิติเซนเซอร์, ส่งออกไฟล์ CSV
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, color: '#34D399', fontSize: 13, fontWeight: 600 }}>
              <span>ดูประวัติและดาวน์โหลด CSV</span>
              <span className="tile-arrow" style={{ marginLeft: 6 }}>
                <ArrowRightIcon size={14} />
              </span>
            </div>
          </div>
        )}

        {/* TILE 4: LINE ALERTS SUBSCRIPTION (All users) */}
        <div
          onClick={() => navigate('/subscribe')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/subscribe');
            }
          }}
          role="button"
          tabIndex={0}
          className="management-tile tile-violet tactile-press"
          style={{
            padding: '1.25rem',
            background: 'var(--card-surface, #0C0E12)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: 16,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 140,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(139, 92, 246, 0.12)',
                  color: '#8B5CF6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BellIcon size={20} />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(139, 92, 246, 0.12)',
                  color: '#A78BFA',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                }}
              >
                LINE OA ฟรี
              </span>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}>
              สมัครรับแจ้งเตือนน้ำท่วม
            </h2>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              รับการแจ้งเตือนทันทีเมื่อระดับน้ำเข้าสู่เกณฑ์เฝ้าระวังและวิกฤต
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, color: '#A78BFA', fontSize: 13, fontWeight: 600 }}>
            <span>ตั้งค่ารับแจ้งเตือน LINE</span>
            <span className="tile-arrow" style={{ marginLeft: 6 }}>
              <ArrowRightIcon size={14} />
            </span>
          </div>
        </div>

        {/* TILE 5: CITIZEN REGISTRATION (Citizens / Guests & Admin) */}
        {(isAdmin || isGuest || isCitizen) && (
          <div
            onClick={() => navigate('/register')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/register');
              }
            }}
            role="button"
            tabIndex={0}
            className="management-tile tile-amber tactile-press"
            style={{
              padding: '1.25rem',
              background: 'var(--card-surface, #0C0E12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 16,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 140,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserIcon size={20} />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#FBBF24',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                  }}
                >
                  บริการประชาชน
                </span>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}>
                ลงทะเบียนบัญชีประชาชน
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                สร้างบัญชีประชาชนใหม่เพื่อติดตามสถานีประจำพื้นที่และรับข้อมูลฉุกเฉิน
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, color: '#FBBF24', fontSize: 13, fontWeight: 600 }}>
              <span>ไปยังหน้าลงทะเบียน</span>
              <span className="tile-arrow" style={{ marginLeft: 6 }}>
                <ArrowRightIcon size={14} />
              </span>
            </div>
          </div>
        )}

        {/* TILE 6: PROFILE & ACCOUNT (All authenticated users per 2.4, 3.10, 4.6) */}
        {!isGuest && (
          <div
            onClick={() => navigate('/profile')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/profile');
              }
            }}
            role="button"
            tabIndex={0}
            className="management-tile tile-slate tactile-press"
            style={{
              padding: '1.25rem',
              background: 'var(--card-surface, #0C0E12)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: 16,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 140,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(148, 163, 184, 0.12)',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserIcon size={20} />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(148, 163, 184, 0.12)',
                    color: '#CBD5E1',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  ข้อมูลส่วนตัว
                </span>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}>
                แก้ไขข้อมูลบัญชีของตนเอง
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                อัปเดตเบอร์โทรศัพท์, อำเภอ/เขตที่อยู่, และเปลี่ยนรหัสผ่าน
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, color: '#CBD5E1', fontSize: 13, fontWeight: 600 }}>
              <span>แก้ไขโปรไฟล์</span>
              <span className="tile-arrow" style={{ marginLeft: 6 }}>
                <ArrowRightIcon size={14} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. CITIZEN DUAL-VIEW: GUEST LOGIN PROMPT ── */}
      {(isGuest || isCitizen) && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'var(--card-surface, #0C0E12)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: '1.5rem',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <KeyIcon size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>
                สำหรับเจ้าหน้าที่ส่วนท้องถิ่นและผู้ดูแลระบบ
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                เข้าสู่ระบบด้วยบัญชีเจ้าหน้าที่เพื่อเข้าถึงการตั้งค่าพารามิเตอร์สถานีและผู้ใช้งาน
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="btn btn-primary btn-sm tactile-press"
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <KeyIcon size={14} />
            <span>เข้าสู่ระบบเจ้าหน้าที่</span>
          </button>
        </div>
      )}

      {/* ── 4. LOGOUT SECTION (For Logged In Users) ── */}
      {!isGuest && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {showLogoutConfirm ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '8px 16px',
                borderRadius: 12,
              }}
            >
              <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 600 }}>
                ยืนยันการออกจากระบบ?
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-sm tactile-press"
                style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '5px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ออกจากระบบ
              </button>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="btn btn-secondary btn-sm tactile-press"
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8 }}
              >
                ยกเลิก
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="btn btn-ghost btn-sm tactile-press"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--text-muted)',
                fontSize: 13,
                padding: '6px 14px',
                borderRadius: 8,
              }}
            >
              <LogOutIcon size={15} />
              <span>ออกจากระบบ</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
