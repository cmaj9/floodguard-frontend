import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { UserRole } from '../types';
import { updateUser, changePasswordApi, setupCredentialsApi, linkLineApi } from '../services/apiService';
import { getLiffProfile, loginWithLiff } from '../services/liffService';
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
  RefreshCwIcon,
  LinkIcon,
} from '../components/ui/Icons';

const roleLabel: Record<UserRole, string> = {
  citizen: 'ประชาชนทั่วไป',
  staff: 'เจ้าหน้าที่ส่วนท้องถิ่น',
  admin: 'ผู้ดูแลระบบ',
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateProfile, logout } = useAuth();
  const { showToast } = useToast();

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



  // ── Case 1: Email Setup Modal State (for LINE user who hasn't set email) ──
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalForm, setEmailModalForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showModalPass, setShowModalPass] = useState(false);
  const [emailModalError, setEmailModalError] = useState('');
  const [emailModalSaving, setEmailModalSaving] = useState(false);

  const handleOpenEmailModal = () => {
    setEmailModalForm({ email: '', password: '', confirmPassword: '' });
    setEmailModalError('');
    setShowEmailModal(true);
  };

  const handleCloseEmailModal = () => {
    setShowEmailModal(false);
    setEmailModalError('');
  };

  const handleSubmitEmailSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleanMail = emailModalForm.email.trim().toLowerCase();
    if (!cleanMail) {
      setEmailModalError('กรุณากรอกอีเมล');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanMail)) {
      setEmailModalError('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }
    if (!emailModalForm.password || emailModalForm.password.length < 6) {
      setEmailModalError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (emailModalForm.password !== emailModalForm.confirmPassword) {
      setEmailModalError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setEmailModalSaving(true);
    setEmailModalError('');
    try {
      const updated = await setupCredentialsApi({
        userId: user.id,
        lineUserId: user.lineUserId || undefined,
        email: cleanMail,
        password: emailModalForm.password,
      });

      localStorage.setItem('wl_auth_user', JSON.stringify(updated));
      updateProfile(updated);
      setShowEmailModal(false);
      showToast(`ตั้งค่าอีเมล ${cleanMail} และรหัสผ่านเรียบร้อยแล้ว`, 'profile');
    } catch (err: any) {
      console.warn('Setup email error:', err);
      setEmailModalError(err?.message || 'บันทึกการตั้งค่าอีเมลไม่สำเร็จ');
    } finally {
      setEmailModalSaving(false);
    }
  };

  // ── Case 2: LINE Linking State & Handler (for Email user who hasn't linked LINE) ──
  const [isLinkingLine, setIsLinkingLine] = useState(false);

  // Auto-detect return from LINE OAuth redirect
  useEffect(() => {
    let isMounted = true;
    async function checkPendingLineLink() {
      if (searchParams.get('link_line') === 'true' && user && !user.lineUserId) {
        setIsLinkingLine(true);
        try {
          const liffProf = await getLiffProfile();
          if (liffProf?.userId && isMounted) {
            const updated = await linkLineApi({
              userId: user.id,
              lineUserId: liffProf.userId,
              displayName: liffProf.displayName,
              pictureUrl: liffProf.pictureUrl,
            });
            localStorage.setItem('wl_auth_user', JSON.stringify(updated));
            updateProfile(updated);
            showToast('เชื่อมต่อบัญชี LINE สำเร็จแล้ว ระบบจะส่งการแจ้งเตือนเตือนภัยน้ำผ่าน LINE', 'line');
          }
        } catch (err: any) {
          console.warn('Auto link LINE error:', err);
          if (isMounted) setProfileError(err?.message || 'เชื่อมต่อบัญชี LINE ไม่สำเร็จ');
        } finally {
          if (isMounted) {
            setIsLinkingLine(false);
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('link_line');
            setSearchParams(nextParams, { replace: true });
          }
        }
      }
    }
    checkPendingLineLink();
    return () => {
      isMounted = false;
    };
  }, [searchParams, user, updateProfile, setSearchParams]);

  const handleConnectLineClick = async () => {
    if (!user) return;
    setIsLinkingLine(true);
    setProfileError('');
    try {
      const liffProf = await getLiffProfile();
      if (liffProf?.userId) {
        // LIFF already authenticated, link directly
        const updated = await linkLineApi({
          userId: user.id,
          lineUserId: liffProf.userId,
          displayName: liffProf.displayName,
          pictureUrl: liffProf.pictureUrl,
        });
        localStorage.setItem('wl_auth_user', JSON.stringify(updated));
        updateProfile(updated);
        showToast('ผูกบัญชี LINE เรียบร้อยแล้ว ระบบจะส่งการแจ้งเตือนเตือนภัยน้ำผ่าน LINE', 'line');
        setIsLinkingLine(false);
      } else {
        // Redirect to LINE Login with link_line flag
        await loginWithLiff('/profile?link_line=true');
      }
    } catch (err: any) {
      console.warn('Connect LINE error:', err);
      setProfileError(err?.message || 'ไม่สามารถเชื่อมต่อ LINE ได้ในขณะนี้');
      setIsLinkingLine(false);
    }
  };

  if (!user) return null;

  // Condition Checks
  const isLineUserWithoutEmail = Boolean(
    user.lineUserId &&
      (!user.isCredentialsSet ||
        user.email?.endsWith('@waterwatch.local') ||
        user.email?.endsWith('@floodguard.local'))
  );

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
      // Save directly to database
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
      showToast('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว', 'profile');
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
      showToast('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว', 'profile');
    } catch (err) {
      console.error('Failed to change password:', err);
      setPassGeneralError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    } finally {
      setPassSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      <div className="profile-layout-grid">
        {/* ── Left Side: Profile Summary Card ── */}
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

          {/* Row 1: Role Badge (Centered) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <span
              className={`badge ${
                user.role === 'admin'
                  ? 'badge-role-admin'
                  : user.role === 'staff'
                  ? 'badge-role-staff'
                  : 'badge-role-citizen'
              }`}
              style={{ fontSize: 12, padding: '4px 14px' }}
            >
              {roleLabel[user.role]}
            </span>
          </div>

          {/* Row 2: Status & Action Badges (LINE & Mail in the same row) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
          >
            {/* LINE Channel */}
            {user.lineUserId ? (
              <span
                className="badge"
                style={{
                  fontSize: 12,
                  padding: '4px 12px',
                  backgroundColor: 'rgba(6, 199, 85, 0.15)',
                  color: '#06C755',
                  border: 'none',
                }}
              >
                ● เชื่อมต่อ LINE แล้ว
              </span>
            ) : (
              <button
                type="button"
                onClick={handleConnectLineClick}
                disabled={isLinkingLine}
                className="btn-outline-action-line"
                title="กดเพื่อเชื่อมต่อบัญชี LINE"
              >
                {isLinkingLine ? (
                  <>
                    <RefreshCwIcon size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                    <span>กำลังเชื่อมต่อ...</span>
                  </>
                ) : (
                  <>
                    <LinkIcon size={13} />
                    <span>เชื่อมต่อ LINE</span>
                  </>
                )}
              </button>
            )}

            {/* Mail Channel */}
            {!isLineUserWithoutEmail ? (
              <span
                className="badge"
                style={{
                  fontSize: 12,
                  padding: '4px 12px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38BDF8',
                  border: 'none',
                }}
              >
                ● ตั้งค่า Mail แล้ว
              </span>
            ) : (
              <button
                type="button"
                onClick={handleOpenEmailModal}
                className="btn-outline-action-mail"
                title="กดเพื่อตั้งค่าอีเมลและรหัสผ่านสำหรับเข้าสู่ระบบ"
              >
                <LinkIcon size={13} />
                <span>ตั้งค่า Mail</span>
              </button>
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

          {/* Mobile-only Logout in Profile Summary Card (Hidden on Desktop because Desktop has Sidebar Slide Menu) */}
          <div className="profile-logout-mobile-only">
            <div className="divider" style={{ margin: '16px 0' }} />
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: '#EF4444',
                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease, border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.16)';
                e.currentTarget.style.borderColor = '#EF4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
              }}
            >
              <LogOutIcon size={16} />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>

        {/* ── Right Side Forms: Personal Profile + Password Change ── */}
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
                    placeholder="ระบุอำเภอ/เขตที่อาศัยอยู่"
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
                      right: 10,
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
                  >
                    {showCurrentPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
                {passErrors.currentPassword && (
                  <span style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4, display: 'block' }}>
                    {passErrors.currentPassword}
                  </span>
                )}
              </div>

              {/* New Password + Confirm Password */}
              <div className="form-grid-2col" style={{ display: 'grid', gap: '0 16px' }}>
                <div className="form-group">
                  <label className="label" htmlFor="profile-new-password">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร) *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="profile-new-password"
                      className={`input ${passErrors.newPassword ? 'input-error' : ''}`}
                      style={{ paddingRight: 40 }}
                      type={showNewPassword ? 'text' : 'password'}
                      value={passForm.newPassword}
                      onChange={(e) => setPassField('newPassword', e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: 10,
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
                    >
                      {showNewPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                  {passErrors.newPassword && (
                    <span style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4, display: 'block' }}>
                      {passErrors.newPassword}
                    </span>
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
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: 10,
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
                    >
                      {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                  {passErrors.confirmPassword && (
                    <span style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4, display: 'block' }}>
                      {passErrors.confirmPassword}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPassErrors({});
                    setPassGeneralError('');
                  }}
                >
                  ล้างข้อมูล
                </button>
                <button
                  id="change-password-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={passSaving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <KeyIcon size={15} />
                  <span>{passSaving ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}</span>
                </button>
              </div>
            </form>
          </div>


        </div>
      </div>

      {/* ── Minimal Email Setup Modal ── */}
      {showEmailModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={handleCloseEmailModal}
        >
          <div
            className="card"
            style={{
              maxWidth: 420,
              width: '100%',
              background: '#0F172A',
              border: '1px solid rgba(2, 132, 199, 0.4)',
              borderRadius: 16,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              padding: '24px 20px',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(2, 132, 199, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38BDF8',
                  }}
                >
                  <MailIcon size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#FFFFFF' }}>ตั้งค่าอีเมลเข้าสู่ระบบ</h3>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>สำหรับเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEmailModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: 18,
                  cursor: 'pointer',
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {emailModalError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171',
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                <AlertTriangleIcon size={15} style={{ flexShrink: 0 }} />
                <span>{emailModalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitEmailSetup}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label" htmlFor="setup-email" style={{ fontSize: 12, marginBottom: 4 }}>
                  อีเมล *
                </label>
                <input
                  id="setup-email"
                  className="input"
                  type="email"
                  value={emailModalForm.email}
                  onChange={(e) => setEmailModalForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  required
                  style={{ height: 40 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label" htmlFor="setup-pass" style={{ fontSize: 12, marginBottom: 4 }}>
                  รหัสผ่าน (6 ตัวขึ้นไป) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="setup-pass"
                    className="input"
                    type={showModalPass ? 'text' : 'password'}
                    value={emailModalForm.password}
                    onChange={(e) => setEmailModalForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    required
                    style={{ height: 40, paddingRight: 36 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPass((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                  >
                    {showModalPass ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="label" htmlFor="setup-confirm-pass" style={{ fontSize: 12, marginBottom: 4 }}>
                  ยืนยันรหัสผ่าน *
                </label>
                <input
                  id="setup-confirm-pass"
                  className="input"
                  type={showModalPass ? 'text' : 'password'}
                  value={emailModalForm.confirmPassword}
                  onChange={(e) => setEmailModalForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="กรอกรหัสผ่านซ้ำ"
                  required
                  style={{ height: 40 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseEmailModal}
                  style={{ padding: '10px', fontSize: 13, justifyContent: 'center' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={emailModalSaving}
                  className="btn btn-primary"
                  style={{ padding: '10px', fontSize: 13, fontWeight: 600, justifyContent: 'center' }}
                >
                  {emailModalSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout confirmation modal */}
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

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
