import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UserIcon,
  ShieldIcon,
  AlertTriangleIcon,
  KeyIcon,
  MailIcon,
  EyeIcon,
  EyeOffIcon,
} from '../components/ui/Icons';
import Logo from '../components/ui/Logo';
import { loginWithLiff } from '../services/liffService';

export default function LoginPage() {
  const { login, loginAsCitizen } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCitizenAccess = () => {
    loginAsCitizen();
    navigate('/dashboard', { replace: true });
  };

  const handleLineLogin = async () => {
    try {
      await loginWithLiff();
    } catch (err: any) {
      console.warn('LINE Login error:', err);
      handleCitizenAccess();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }
    setLoading(true);
    setError('');
    const res = await login(email.trim(), password);
    setLoading(false);
    if (res.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(res.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="login-bg">
      {/* Background grid accent */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 80px,
              rgba(0,212,255,0.02) 80px,
              rgba(0,212,255,0.02) 81px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 80px,
              rgba(0,212,255,0.02) 80px,
              rgba(0,212,255,0.02) 81px
            )
          `,
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: 460, padding: '0 16px', position: 'relative', zIndex: 1 }}>
        {/* Brand */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <Logo size="xl" />
        </div>

        <div className="login-card" style={{ backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: '9999px',
                background: 'rgba(14, 165, 233, 0.12)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                color: 'var(--color-primary-light, #38bdf8)',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              <ShieldIcon size={14} />
              <span>ระบบตรวจสอบและเตือนภัยน้ำท่วม</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
              เข้าสู่ระบบ
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              สำหรับเจ้าหน้าที่และผู้ดูแลระบบ หรือเข้าชมระดับน้ำในโหมดประชาชน
            </p>
          </div>

          {/* Citizen Fast Access & LINE LIFF (Zero Barrier) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            <button
              type="button"
              id="citizen-direct-entry-btn"
              onClick={handleCitizenAccess}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <UserIcon size={18} />
              <span>เข้าชมระดับน้ำทันที (โหมดประชาชนทั่วไป)</span>
            </button>

            <button
              type="button"
              id="line-liff-login-btn"
              onClick={handleLineLogin}
              className="btn"
              style={{
                width: '100%',
                padding: '11px 16px',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: '#06C755',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
              }}
            >
              <span>เข้าสู่ระบบด้วย LINE (LIFF) รับแจ้งเตือนภัย</span>
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 20px' }}>
            <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              หรือเข้าสู่ระบบด้วยบัญชี
            </span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="label" htmlFor="email" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <MailIcon size={14} style={{ color: 'var(--text-muted)' }} />
                <span>อีเมล</span>
              </label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="example@dwr.go.th หรืออีเมลประชาชน"
                autoComplete="email"
                required
                style={{ height: 42, fontSize: 14 }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="label" htmlFor="password" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <KeyIcon size={14} style={{ color: 'var(--text-muted)' }} />
                <span>รหัสผ่าน</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="กรอกรหัสผ่านของคุณ"
                  autoComplete="current-password"
                  required
                  style={{ height: 42, fontSize: 14, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--color-critical-dim)',
                  border: '1px solid rgba(255,82,82,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-critical)',
                  fontSize: 13,
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                role="alert"
              >
                <AlertTriangleIcon size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg"
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
              disabled={loading}
            >
              {loading ? (
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
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : (
                <>
                  <KeyIcon size={16} />
                  <span>เข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </form>

          {/* Registration link for citizens */}
          <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              ประชาชนทั่วไปต้องการรับการแจ้งเตือน?{' '}
            </span>
            <Link
              to="/register"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-primary-light, #38bdf8)',
                textDecoration: 'none',
              }}
            >
              ลงทะเบียนใหม่
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          © 2025 Water Level Monitoring System · กรมทรัพยากรน้ำ
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
