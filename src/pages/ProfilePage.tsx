import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { MailIcon, PhoneIcon, MapPinIcon, KeyIcon, SaveIcon, CheckIcon } from '../components/ui/Icons';

const roleLabel: Record<UserRole, string> = {
  citizen: 'ประชาชนทั่วไป',
  staff: 'เจ้าหน้าที่ส่วนท้องถิ่น',
  admin: 'ผู้ดูแลระบบ',
};

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    district: user?.district ?? '',
  });
  const [saved, setSaved] = useState(false);

  if (!user) return null;

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

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start', maxWidth: 900 }}>
        {/* Profile summary card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div
            className="user-avatar"
            style={{
              width: 80,
              height: 80,
              fontSize: 32,
              margin: '0 auto 16px',
            }}
          >
            {user.name.slice(0, 1)}
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{user.name}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>{user.email}</p>

          <span
            className={`badge ${
              user.role === 'admin'
                ? 'badge-role-admin'
                : user.role === 'staff'
                ? 'badge-role-staff'
                : 'badge-role-citizen'
            }`}
            style={{ fontSize: 13, padding: '5px 14px' }}
          >
            {roleLabel[user.role]}
          </span>

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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
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
    </div>
  );
}
