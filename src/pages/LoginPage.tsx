import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  UserIcon,
  AlertTriangleIcon,
  KeyIcon,
  MailIcon,
  EyeIcon,
  EyeOffIcon,
} from "../components/ui/Icons";
import Logo from "../components/ui/Logo";
import { loginWithLiff } from "../services/liffService";

export default function LoginPage() {
  const { user, isGuest, login, loginAsCitizen, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);

  // Auto-redirect if already authenticated (including LINE Citizen)
  useEffect(() => {
    if (!isLoading && user && !isGuest && !loading) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isGuest, isLoading, loading, navigate]);

  const handleCitizenAccess = () => {
    loginAsCitizen();
    navigate("/dashboard", { replace: true });
  };

  const handleLineLogin = async () => {
    setError("");
    setLineLoading(true);
    try {
      await loginWithLiff('/dashboard');
    } catch (err: any) {
      console.warn("LINE Login error:", err);
      setError(
        err?.message ||
          "ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาตรวจสอบสถานะ Channel ใน LINE Developers ว่าเป็น Published"
      );
      setLineLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    setLoading(true);
    setError("");
    const res = await login(email.trim(), password);
    setLoading(false);
    if (res.success) {
      navigate("/dashboard", {
        replace: true,
        state: { loginSuccess: true, loginType: "email" },
      });
    } else {
      setError(res.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
  };

  const isLineCallback = typeof window !== "undefined" && window.location.search.includes("code=");

  if (isLineCallback && isLoading) {
    return (
      <div className="login-bg" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          className="login-card"
          style={{
            background: "linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 20,
            padding: "36px 28px",
            textAlign: "center",
            maxWidth: 400,
            width: "90%",
            boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.6)",
          }}
        >
          <Logo size="lg" />
          <div style={{ marginTop: 24, marginBottom: 16 }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: "3px solid rgba(6, 199, 85, 0.2)",
                borderTopColor: "#06C755",
                borderRadius: "50%",
                margin: "0 auto",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", margin: "0 0 6px" }}>
            กำลังเข้าสู่ระบบผ่าน LINE...
          </h2>
          <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>
            กรุณารอสักครู่ ระบบกำลังยืนยันตัวตนและนำท่านเข้าสู่แดชบอร์ด
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-bg">
      {/* Background ambient water lines */}
      <div
        style={{
          position: "absolute",
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
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 430,
          padding: "24px 16px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Brand Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <Logo size="xl" />
        </div>

        {/* Main Card */}
        <div
          className="login-card"
          style={{
            background: "linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 20,
            padding: "32px 28px",
            boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                margin: 0,
                color: "#FFFFFF",
                letterSpacing: "-0.01em",
              }}
            >
              เข้าสู่ระบบ
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label
                className="label"
                htmlFor="email"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#E2E8F0",
                }}
              >
                <MailIcon size={14} style={{ color: "#94A3B8" }} />
                <span>อีเมล</span>
              </label>
              <input
                id="email"
                className="input login-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="name@example.com"
                autoComplete="email"
                required
                style={{
                  height: 44,
                  fontSize: 14,
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#FFFFFF",
                  borderRadius: 10,
                  padding: "0 14px",
                }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label
                className="label"
                htmlFor="password"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#E2E8F0",
                }}
              >
                <KeyIcon size={14} style={{ color: "#94A3B8" }} />
                <span>รหัสผ่าน</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  className="input login-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="กรอกรหัสผ่านของคุณ"
                  autoComplete="current-password"
                  required
                  style={{
                    height: 44,
                    fontSize: 14,
                    paddingRight: 42,
                    backgroundColor: "rgba(15, 23, 42, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#FFFFFF",
                    borderRadius: 10,
                    paddingLeft: 14,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#94A3B8",
                    cursor: "pointer",
                    padding: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                  }}
                  title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  borderRadius: 8,
                  color: "#F87171",
                  fontSize: 13,
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
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
              className="btn btn-primary"
              style={{
                width: "100%",
                height: 44,
                justifyContent: "center",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 600,
                fontSize: 14,
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
              }}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
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

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "24px 0 18px",
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              หรือสำหรับประชาชนทั่วไป
            </span>
            <div
              style={{
                flex: 1,
                height: 1,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
              }}
            />
          </div>

          {/* Fast Citizen Entry & LINE Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            <button
              type="button"
              id="citizen-direct-entry-btn"
              onClick={handleCitizenAccess}
              className="btn btn-secondary"
              style={{
                width: "100%",
                height: 42,
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#E2E8F0",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <UserIcon size={16} style={{ color: "#38BDF8" }} />
              <span>เข้าชมระดับน้ำทันที (โหมดประชาชน)</span>
            </button>

            <button
              type="button"
              id="line-liff-login-btn"
              onClick={handleLineLogin}
              disabled={lineLoading || loading}
              aria-busy={lineLoading}
              className="btn"
              style={{
                width: "100%",
                height: 42,
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: "#06C755",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                cursor: lineLoading || loading ? "not-allowed" : "pointer",
                opacity: lineLoading || loading ? 0.75 : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              {lineLoading ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span>กำลังเชื่อมต่อ LINE...</span>
                </>
              ) : (
                <span>เข้าสู่ระบบด้วย LINE (LIFF)</span>
              )}
            </button>
          </div>

          {/* Registration link */}
          <div
            style={{
              paddingTop: 16,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "#94A3B8" }}>
              ยังไม่มีบัญชีประชาชน?{" "}
            </span>
            <Link
              to="/register"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#38BDF8",
                textDecoration: "none",
              }}
            >
              ลงทะเบียนใหม่
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <p
          style={{
            textAlign: "center",
            marginTop: 22,
            fontSize: 12,
            color: "#64748B",
          }}
        >
          © 2025 Water Level Monitoring System · กรมทรัพยากรน้ำ
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-input:-webkit-autofill,
        .login-input:-webkit-autofill:hover, 
        .login-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 1000px #0f172a inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}
