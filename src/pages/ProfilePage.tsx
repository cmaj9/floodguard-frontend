import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { updateUser, changePasswordApi } from '../services/apiService';
import {
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  KeyIcon,
  SaveIcon,
  CheckIcon,
  LogOutIcon,
  EyeIcon,
  EyeOffIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from '../components/ui/Icons';

const roleLabel: Record<UserRole, string> = {
  citizen: 'ประชาชนทั่วไป',
  staff: 'เจ้าหน้าที่ส่วนท้องถิ่น',
  admin: 'ผู้ดูแลระบบ',
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuth();

  // Profile info state
  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    district: user?.district ?? '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password change state
  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passErrors, setPassErrors] = useState<Record<string, string>>({});
  const [passSaving, setPassSaving] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  const [passGeneralError, setPassGeneralError] = useState('');

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const setProfileField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setProfileSaved(false);
    setProfileError('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setProfileError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    try {
      setProfileSaving(true);
      setProfileError('');
      // Save directly to PostgreSQL database
      await updateUser(user.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        district: form.district.trim(),
      });
      // Update local AuthContext state
      updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        district: form.district.trim(),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setProfileError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setProfileSaving(false);
    }
  };

  const setPassField = (field: string, value: string) => {
    setPassForm((prev) => ({ ...prev, [field]: value }));
    setPassErrors((prev) => ({ ...prev, [field]: '' }));
    setPassSuccess('');
    setPassGeneralError('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!passForm.currentPassword.trim()) {
      errs.currentPassword = 'กรุณากรอกรหัสผ่านปัจจุบัน';
    }
    if (!passForm.newPassword.trim()) {
      errs.newPassword = 'กรุณากรอกรหัสผ่านใหม่';
    } else if (passForm.newPassword.trim().length < 6) {
      errs.newPassword = `รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร (ปัจจุบันมี ${passForm.newPassword.trim().length} ตัว)`;
    }
    if (!passForm.confirmPassword.trim()) {
      errs.confirmPassword = 'กรุณายืนยันรหัสผ่านใหม่';
    } else if (passForm.newPassword.trim() !== passForm.confirmPassword.trim()) {
      errs.confirmPassword = 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน';
    }

    if (Object.keys(errs).length > 0) {
      setPassErrors(errs);
      return;
    }

    try {
      setPassSaving(true);
      setPassGeneralError('');
      setPassSuccess('');

      const res = await changePasswordApi({
        userId: user.id,
        currentPassword: passForm.currentPassword.trim(),
        newPassword: passForm.newPassword.trim(),
      });

      setPassSuccess(res.message || 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว');
      setPassForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setPassSuccess(''), 5000);
    } catch (err) {
      console.error('Failed to change password:', err);
      setPassGeneralError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    } finally {
      setPassSaving(false);
    }
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

          {/* Optional password setup prompt if citizen has not set password */}
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

        {/* Right side forms: Personal Profile + Password Change */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Form 1: Edit Profile Card */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>แก้ไขข้อมูลส่วนตัว</h3>

            {profileError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--color-danger)',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <AlertTriangleIcon size={16} />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label className="label" htmlFor="profile-name">ชื่อ-นามสกุล *</label>
                <input
                  id="profile-name"
                  className="input"
                  value={form.name}
                  onChange={(e) => setProfileField('name', e.target.value)}
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
                    onChange={(e) => setProfileField('phone', e.target.value)}
                    placeholder="08XXXXXXXX"
                  />
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="profile-district">อำเภอ/เขต</label>
                  <input
                    id="profile-district"
                    className="input"
                    value={form.district}
                    onChange={(e) => setProfileField('district', e.target.value)}
                    placeholder="เมือง..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setForm({ name: user.name, phone: user.phone || '', district: user.district || '' })}
                >
                  ยกเลิก
                </button>
                <button
                  id="save-profile"
                  type="submit"
                  className="btn btn-primary"
                  disabled={profileSaving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {profileSaved ? (
                    <>
                      <CheckIcon size={15} />
                      <span>บันทึกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <SaveIcon size={15} />
                      <span>{profileSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัว'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Change Password Card */}
          <div className="card">
            <h4
              style={{
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 6,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <KeyIcon size={18} style={{ color: 'var(--cyan-glow)' }} />
              <span>เปลี่ยนรหัสผ่าน</span>
            </h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
              กรอกรหัสผ่านปัจจุบันเพื่อยืนยันตัวตน จากนั้นกำหนดรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
            </p>

            {passSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: 'var(--color-success)',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <CheckCircleIcon size={16} />
                <span>{passSuccess}</span>
              </div>
            )}

            {passGeneralError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--color-danger)',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <AlertTriangleIcon size={16} />
                <span>{passGeneralError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              {/* Current Password */}
              <div className="form-group">
                <label className="label" htmlFor="profile-current-password">รหัสผ่านปัจจุบัน *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="profile-current-password"
                    className={`input ${passErrors.currentPassword ? 'input-error' : ''}`}
                    style={{ paddingRight: 40 }}
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passForm.currentPassword}
                    onChange={(e) => setPassField('currentPassword', e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={showCurrentPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    aria-label={showCurrentPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    {showCurrentPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
                {passErrors.currentPassword && (
                  <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <AlertTriangleIcon size={13} />
                    <span>{passErrors.currentPassword}</span>
                  </div>
                )}
              </div>

              {/* New Password & Confirm Password */}
              <div className="form-grid-2col" style={{ display: 'grid', gap: '0 16px' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="label" htmlFor="profile-new-password" style={{ marginBottom: 0 }}>
                      รหัสผ่านใหม่ *
                    </label>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>อย่างน้อย 6 ตัวอักษร</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="profile-new-password"
                      className={`input ${passErrors.newPassword ? 'input-error' : ''}`}
                      style={{ paddingRight: 40 }}
                      type={showNewPassword ? 'text' : 'password'}
                      value={passForm.newPassword}
                      onChange={(e) => setPassField('newPassword', e.target.value)}
                      placeholder="กำหนดรหัสผ่านใหม่"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={showNewPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      aria-label={showNewPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    >
                      {showNewPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                  {passErrors.newPassword && (
                    <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <AlertTriangleIcon size={13} />
                      <span>{passErrors.newPassword}</span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="label" htmlFor="profile-confirm-password">ยืนยันรหัสผ่านใหม่ *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="profile-confirm-password"
                      className={`input ${passErrors.confirmPassword ? 'input-error' : ''}`}
                      style={{ paddingRight: 40 }}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passForm.confirmPassword}
                      onChange={(e) => setPassField('confirmPassword', e.target.value)}
                      placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    >
                      {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                  {passErrors.confirmPassword && (
                    <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <AlertTriangleIcon size={13} />
                      <span>{passErrors.confirmPassword}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passSaving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <KeyIcon size={15} />
                  <span>{passSaving ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}</span>
                </button>
              </div>
            </form>
          </div>
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
