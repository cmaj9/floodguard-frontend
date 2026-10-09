import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  MailIcon,
  KeyIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
} from "../components/ui/Icons";
import Logo from "../components/ui/Logo";

export default function SetupCredentialsPage() {
  const { user, isGuest, setupCredentials, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedEmail, setSavedEmail] = useState("");

  // Guard: If not logged in, or already has credentials set, redirect
  useEffect(() => {
    if (!isLoading) {
      if (!user || isGuest) {
        navigate("/login", { replace: true });
      } else if (user.role !== "citizen" || user.isCredentialsSet) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, isGuest, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("กรุณากรอกอีเมล");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    if (!password) {
      setError("กรุณากรอกรหัสผ่าน");
      return;
    }

    if (password.length < 6) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      setError("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await setupCredentials(cleanEmail, password);
      if (res.success) {
        setSavedEmail(cleanEmail);
        setIsSuccess(true);
      } else {
        setError(res.error || "เกิดข้อผิดพลาดในการตั้งค่า กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      setError(err?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedToDashboard = () => {
    navigate("/dashboard", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="login-bg" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: "#94A3B8" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid rgba(14, 165, 233, 0.2)",
              borderTopColor: "var(--cyan-glow)",
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ margin: 0, fontSize: 14 }}>กำลังตรวจสอบข้อมูลผู้ใช้งาน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
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
          maxWidth: 440,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Brand Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div
          className="login-card"
          style={{
            background: "linear-gradient(180deg, rgba(17, 24, 39, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            padding: "32px 28px",
            boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04)",
            backdropFilter: "blur(20px)",
          }}
        >
          {isSuccess ? (
            /* Success Confirmation State */
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "#10B981",
                }}
              >
                <CheckCircleIcon size={32} />
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF", margin: "0 0 8px" }}>
                ตั้งค่าบัญชีสำเร็จเรียบร้อย!
              </h2>

              <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 20px", lineHeight: 1.5 }}>
                ท่านสามารถใช้อีเมลและรหัสผ่านนี้เพื่อเข้าสู่ระบบดูระดับน้ำได้จากทุกอุปกรณ์
              </p>

              {/* Credential summary box */}
              <div
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(0, 212, 255, 0.2)",
                  borderRadius: 12,
                  padding: "16px",
                  marginBottom: 24,
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <ShieldCheckIcon size={16} style={{ color: "var(--cyan-glow)" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cyan-glow)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    ข้อมูลสำหรับเข้าสู่ระบบในครั้งต่อไป
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "#F8FAFC", wordBreak: "break-all" }}>
                  <span style={{ color: "#94A3B8" }}>อีเมล: </span>
                  <strong style={{ color: "#38BDF8" }}>{savedEmail}</strong>
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>
                  รหัสผ่าน: ตามที่ท่านได้กำหนดไว้ (กรุณาจดจำรหัสผ่านของท่าน)
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToDashboard}
                className="btn btn-primary"
                style={{
                  width: "100%",
                  height: 46,
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>เข้าสู่แดชบอร์ดดูระดับน้ำ</span>
              </button>
            </div>
          ) : (
            /* Setup Form State */
            <div>
              {/* Linked user badge */}
              {user && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: "rgba(6, 199, 85, 0.1)",
                    border: "1px solid rgba(6, 199, 85, 0.25)",
                    borderRadius: 20,
                    padding: "4px 12px",
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#06C755",
                    }}
                  />
                  <span style={{ fontSize: 12, color: "#4ADE80", fontWeight: 500 }}>
                    เชื่อมต่อกับ LINE: {user.name || "ประชาชนผู้ใช้งาน"}
                  </span>
                </div>
              )}

              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  margin: "0 0 6px",
                  color: "#FFFFFF",
                  letterSpacing: "-0.01em",
                }}
              >
                ตั้งค่าอีเมลและรหัสผ่าน
              </h1>

              <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 24px", lineHeight: 1.5 }}>
                กรุณากำหนดอีเมลและรหัสผ่านของคุณ เพื่อให้สามารถจดจำและเข้าสู่ระบบดูข้อมูลระดับน้ำได้ทุกครั้ง
              </p>

              {/* Error Message */}
              {error && (
                <div
                  role="alert"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    backgroundColor: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 20,
                    color: "#FCA5A5",
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}
                >
                  <AlertTriangleIcon size={18} style={{ flexShrink: 0, marginTop: 1, color: "#EF4444" }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Email Field */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label
                    htmlFor="setup-email"
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
                    <span>อีเมล (สำหรับใช้เข้าสู่ระบบ)</span>
                  </label>
                  <input
                    id="setup-email"
                    className="input login-input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="example@gmail.com"
                    autoComplete="email"
                    required
                    style={{
                      width: "100%",
                      height: 44,
                      fontSize: 14,
                      backgroundColor: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: 10,
                      padding: "0 14px",
                      color: "#FFFFFF",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Password Field */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label
                    htmlFor="setup-password"
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
                    <span>รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="setup-password"
                      className="input login-input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="กำหนดรหัสผ่านอย่างน้อย 6 ตัวอักษร"
                      autoComplete="new-password"
                      required
                      style={{
                        width: "100%",
                        height: 44,
                        fontSize: 14,
                        backgroundColor: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: 10,
                        padding: "0 44px 0 14px",
                        color: "#FFFFFF",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 44,
                        height: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#94A3B8",
                      }}
                    >
                      {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label
                    htmlFor="setup-confirm-password"
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
                    <span>ยืนยันรหัสผ่านอีกครั้ง</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="setup-confirm-password"
                      className="input login-input"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="กรอกรหัสผ่านเดิมซ้ำอีกครั้ง"
                      autoComplete="new-password"
                      required
                      style={{
                        width: "100%",
                        height: 44,
                        fontSize: 14,
                        backgroundColor: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: 10,
                        padding: "0 44px 0 14px",
                        color: "#FFFFFF",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 44,
                        height: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#94A3B8",
                      }}
                    >
                      {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    height: 46,
                    fontSize: 15,
                    fontWeight: 600,
                    borderRadius: 12,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    opacity: isSubmitting ? 0.8 : 1,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          border: "2px solid rgba(255, 255, 255, 0.3)",
                          borderTopColor: "#FFFFFF",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      <span>กำลังบันทึกข้อมูล...</span>
                    </>
                  ) : (
                    <span>บันทึกและเปิดใช้งานบัญชี</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
