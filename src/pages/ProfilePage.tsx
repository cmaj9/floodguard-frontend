import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { MailIcon, PhoneIcon, MapPinIcon, KeyIcon, SaveIcon, CheckIcon, LogOutIcon } from '../components/ui/Icons';

const roleLabel: Record<UserRole, string> = {
  citizen: 'ประชาชนทั่วไป',
  staff: 'เจ้าหน้าที่ส่วนท้องถิ่น',
  admin: 'ผู้ดูแลระบบ',
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    district: user?.district ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name: form.name, phone: form.phone, district: form.district });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page-container">

      <div className="profile-layout-grid">
        {/* Profile summary card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div
            className="user-avatar"
            style={{
              width: 84,
              height: 84,
              fontSize: 32,
              margin: '0 auto 16px',
              overflow: 'hidden',
              borderRadius: '50%',
              border: '2px solid rgba(14, 165, 233, 0.4)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            }}
          >
            {user.pictureUrl ? (
              <img
                src={user.pictureUrl}
                alt={user.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              user.name.slice(0, 1)
            )}
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{user.name}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>{user.email}</p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span
              className={`badge ${
                user.role === 'admin'
                  ? 'badge-role-admin'
                  : user.role === 'staff'
                  ? 'badge-role-staff'
                  : 'badge-role-citizen'
              }`}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              {roleLabel[user.role]}
            </span>

            {user.lineUserId && (
              <span
                className="badge"
                style={{
                  fontSize: 12,
                  padding: '4px 12px',
                  backgroundColor: 'rgba(6, 199, 85, 0.15)',
                  color: '#06C755',
                  borderColor: 'rgba(6, 199, 85, 0.3)',
                }}
              >
                ● เชื่อมต่อ LINE แล้ว
              </span>
            )}
          </div>

          <div className="divider" />

          {/* Account info */}
          <div style={{ textAlign: 'left' }}>
            {[
              { icon: <MailIcon size={16} />, label: 'อีเมล', value: user.email },
              { icon: <PhoneIcon size={16} />, label: 'เบอร์โทร', value: user.phone || '-' },
              { icon: <MapPinIcon size={16} />, label: 'อำเภอ/เขต', value: user.district || '-' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: 13, alignItems: 'center' }}>
                <span style={{ width: 24, flexShrink: 0, color: 'var(--cyan-glow)', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 1 }}>{item.label}</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Optional password setup prompt if not set */}
          {user.role === 'citizen' && !user.isCredentialsSet && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(2, 132, 199, 0.08)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 4 }}>
                เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4 }}>
                คุณเข้าสู่ระบบผ่าน LINE สามารถตั้งค่าอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบแบบปกติได้
              </div>
              <a
                href="/setup-credentials"
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: 12, padding: '6px 12px', textAlign: 'center', display: 'block' }}
              >
                ตั้งค่าอีเมลและรหัสผ่าน
              </a>
            </div>
          )}
        </div>

        {/* Edit form */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>แก้ไขข้อมูลส่วนตัว</h3>

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="label" htmlFor="profile-name">ชื่อ-นามสกุล</label>
              <input
                id="profile-name"
                className="input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="ชื่อ-นามสกุล"
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="profile-email">อีเมล (ไม่สามารถแก้ไขได้)</label>
              <input
                id="profile-email"
                className="input"
                value={user.email}
                disabled
                aria-disabled="true"
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-grid-2col" style={{ display: 'grid', gap: '0 16px' }}>
              <div className="form-group">
                <label className="label" htmlFor="profile-phone">เบอร์โทรศัพท์</label>
                <input
                  id="profile-phone"
                  className="input"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="08XXXXXXXX"
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="profile-district">อำเภอ/เขต</label>
                <input
                  id="profile-district"
                  className="input"
                  value={form.district}
                  onChange={(e) => set('district', e.target.value)}
                  placeholder="เมือง..."
                />
              </div>
            </div>

            <div className="divider" />

            {/* Password section */}
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <KeyIcon size={15} style={{ color: 'var(--cyan-glow)' }} />
              <span>เปลี่ยนรหัสผ่าน</span>
            </h4>
            <div className="form-group">
              <label className="label" htmlFor="profile-current-password">รหัสผ่านปัจจุบัน</label>
              <input id="profile-current-password" className="input" type="password" placeholder="••••••••" />
            </div>
            <div className="form-grid-2col" style={{ display: 'grid', gap: '0 16px' }}>
              <div className="form-group">
                <label className="label" htmlFor="profile-new-password">รหัสผ่านใหม่</label>
                <input id="profile-new-password" className="input" type="password" placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="profile-confirm-password">ยืนยันรหัสผ่านใหม่</label>
                <input id="profile-confirm-password" className="input" type="password" placeholder="••••••••" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setForm({ name: user.name, phone: user.phone, district: user.district })}>
                ยกเลิก
              </button>
              <button id="save-profile" type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {saved ? (
                  <>
                    <CheckIcon size={15} />
                    <span>บันทึกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <SaveIcon size={15} />
                    <span>บันทึกข้อมูล</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Logout Button (Visible only on responsive mobile with BottomBar) */}
      <div className="profile-mobile-logout-wrap">
        <button
          type="button"
          id="profile-mobile-logout-btn"
          className="profile-mobile-logout-btn"
          onClick={() => setShowLogoutModal(true)}
          title="ออกจากระบบ"
        >
          <LogOutIcon size={18} />
          <span>ออกจากระบบ</span>
        </button>
      </div>

      {/* Safety Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowLogoutModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0B1120',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 16,
              padding: 24,
              maxWidth: 380,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444',
                  flexShrink: 0,
                }}
              >
                <LogOutIcon size={22} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                  ยืนยันการออกจากระบบ
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  คุณต้องการออกจากระบบบัญชีของคุณใช่หรือไม่?
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLogoutModal(false)}
                style={{
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleLogout}
                style={{
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <LogOutIcon size={15} />
                <span>ยืนยัน ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
