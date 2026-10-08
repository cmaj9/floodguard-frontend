import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import type { User, UserRole, StationWithReading } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { fetchStations } from "../../services/apiService";
import {
  SaveIcon,
  PlusIcon,
  EyeIcon,
  EyeOffIcon,
  CheckIcon,
  ShieldIcon,
  AlertTriangleIcon,
} from "../ui/Icons";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<User>) => void;
  user?: User | null;
}

const roleOptions: { value: UserRole; label: string; desc: string }[] = [
  { value: "citizen", label: "ประชาชนทั่วไป", desc: "ติดตามสถานการณ์น้ำและรับการแจ้งเตือน" },
  { value: "staff", label: "เจ้าหน้าที่ส่วนท้องถิ่น", desc: "ดูแลและบันทึกข้อมูลสถานีที่ได้รับมอบหมาย" },
  { value: "admin", label: "ผู้ดูแลระบบ", desc: "จัดการระบบ สถานี และผู้ใช้งานทั้งหมด" },
];

export default function UserModal({
  isOpen,
  onClose,
  onSave,
  user,
}: UserModalProps) {
  const { user: currentUser } = useAuth();
  const isEdit = !!user;

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    district: "",
    role: "citizen" as UserRole,
    station_ids: [] as string[],
    is_active: true,
  });

  const [stations, setStations] = useState<StationWithReading[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch real stations from database dynamically
  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      setLoadingStations(true);
      fetchStations()
        .then((data) => {
          if (isMounted) setStations(data || []);
        })
        .catch((err) => {
          console.error("Failed to load stations in UserModal:", err);
        })
        .finally(() => {
          if (isMounted) setLoadingStations(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        password: "",
        phone: user.phone || "",
        district: user.district || "",
        role: user.role || "citizen",
        station_ids: user.station_ids || user.stationIds || [],
        is_active:
          user.is_active !== undefined
            ? user.is_active
            : user.isActive !== false,
      });
    } else {
      setForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        district: "",
        role: "citizen",
        station_ids: [],
        is_active: true,
      });
    }
    setShowPassword(false);
    setErrors({});
  }, [user, isOpen]);

  const set = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const toggleStation = (stId: string) => {
    setForm((prev) => {
      const exists = prev.station_ids.includes(stId);
      const next = exists
        ? prev.station_ids.filter((id) => id !== stId)
        : [...prev.station_ids, stId];
      return { ...prev, station_ids: next };
    });
  };

  const handleSelectAllStations = () => {
    if (form.station_ids.length === stations.length) {
      set("station_ids", []);
    } else {
      set("station_ids", stations.map((s) => s.station_id));
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "กรุณากรอกชื่อ-นามสกุล";
    if (!form.email.trim() || !form.email.includes("@")) {
      e.email = "กรุณากรอกอีเมลที่ถูกต้อง";
    }

    // Password validation: strictly >= 6 characters
    if (!isEdit) {
      if (!form.password.trim()) {
        e.password = "กรุณากำหนดรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)";
      } else if (form.password.trim().length < 6) {
        e.password = `รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร (ปัจจุบันมี ${form.password.trim().length} ตัว)`;
      }
    } else {
      if (form.password && form.password.trim().length > 0 && form.password.trim().length < 6) {
        e.password = `รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร (ปัจจุบันมี ${form.password.trim().length} ตัว)`;
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const availableRoles =
    currentUser?.role === "admin"
      ? roleOptions
      : roleOptions.filter((r) => r.value === "citizen");

  const hasLineConnected = Boolean(user && (user.line_user_id || user.lineUserId));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(14, 165, 233, 0.15)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isEdit ? <ShieldIcon size={18} /> : <PlusIcon size={18} />}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              {isEdit ? "แก้ไขข้อมูลผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {isEdit
                ? `จัดการสิทธิ์และข้อมูลบัญชีของ ${user?.name || ""}`
                : "สร้างบัญชีผู้ใช้งานใหม่ในระบบ FloodGuard"}
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, width: "100%" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => {
              if (validate()) {
                onSave({
                  name: form.name.trim(),
                  email: form.email.trim(),
                  password: form.password ? form.password.trim() : undefined,
                  phone: form.phone.trim(),
                  district: form.district.trim(),
                  line_user_id: user?.line_user_id || user?.lineUserId || undefined,
                  lineUserId: user?.line_user_id || user?.lineUserId || undefined,
                  role: form.role,
                  station_ids: form.role === "staff" ? form.station_ids : [],
                  stationIds: form.role === "staff" ? form.station_ids : [],
                  is_active: form.is_active,
                  isActive: form.is_active,
                });
                onClose();
              }
            }}
          >
            {isEdit ? (
              <>
                <SaveIcon size={15} />
                <span>บันทึกการแก้ไข</span>
              </>
            ) : (
              <>
                <PlusIcon size={15} />
                <span>เพิ่มผู้ใช้</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* SECTION 1: ข้อมูลบัญชีผู้ใช้ */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-primary)",
              marginBottom: 10,
            }}
          >
            ข้อมูลบัญชีผู้ใช้
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="label" htmlFor="user-modal-name">ชื่อ-นามสกุล *</label>
            <input
              id="user-modal-name"
              className={`input ${errors.name ? "input-error" : ""}`}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="เช่น สมชาย ใจดี"
            />
            {errors.name && (
              <div className="error-msg" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                <AlertTriangleIcon size={13} />
                <span>{errors.name}</span>
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0 14px",
            }}
          >
            {/* Email */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="label" htmlFor="user-modal-email">อีเมล *</label>
              <input
                id="user-modal-email"
                className={`input ${errors.email ? "input-error" : ""}`}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="example@email.com"
                type="email"
              />
              {errors.email && (
                <div className="error-msg" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <AlertTriangleIcon size={13} />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            {/* Password with Eye Toggle */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="label" htmlFor="user-modal-password" style={{ marginBottom: 0 }}>
                  {isEdit ? "เปลี่ยนรหัสผ่าน" : "กำหนดรหัสผ่าน *"}
                </label>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {isEdit ? "(เว้นว่างได้)" : "อย่างน้อย 6 ตัวอักษร"}
                </span>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="user-modal-password"
                  className={`input ${errors.password ? "input-error" : ""}`}
                  style={{ paddingRight: 40 }}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder={isEdit ? "•••••••• (ไม่เปลี่ยนรหัสผ่าน)" : "รหัสผ่านอย่างน้อย 6 ตัวอักษร"}
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
              {errors.password && (
                <div className="error-msg" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <AlertTriangleIcon size={13} />
                  <span>{errors.password}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: ข้อมูลติดต่อ */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-primary)",
              marginBottom: 10,
            }}
          >
            ข้อมูลการติดต่อ
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0 14px",
            }}
          >
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="label" htmlFor="user-modal-phone">เบอร์โทรศัพท์</label>
              <input
                id="user-modal-phone"
                className="input"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="08XXXXXXXX"
                type="tel"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="label" htmlFor="user-modal-district">อำเภอ/เขต</label>
              <input
                id="user-modal-district"
                className="input"
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                placeholder="เช่น คลองหลวง, ธัญบุรี"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: บทบาทและสถานะการใช้งาน */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-primary)",
              marginBottom: 10,
            }}
          >
            บทบาทและสถานะ
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginBottom: 14,
            }}
          >
            {/* Role selection */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="user-modal-role">บทบาทในระบบ</label>
              <select
                id="user-modal-role"
                className="select"
                value={form.role}
                onChange={(e) => set("role", e.target.value as UserRole)}
              >
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* LINE Connection Status (Read-only Badge for Edit Mode) */}
            {isEdit && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label" style={{ marginBottom: 6 }}>การเชื่อมต่อ LINE</label>
                <div
                  style={{
                    height: 42,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {hasLineConnected ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#06C755",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "#06C755",
                          boxShadow: "0 0 6px rgba(6, 199, 85, 0.4)",
                        }}
                      />
                      เชื่อมต่อกับบัญชี LINE แล้ว
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "var(--text-muted)",
                        }}
                      />
                      ยังไม่ได้เชื่อมต่อกับ LINE
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active status toggle switch card */}
          <div
            onClick={() => set("is_active", !form.is_active)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: form.is_active
                ? "rgba(14, 165, 233, 0.06)"
                : "rgba(239, 68, 68, 0.05)",
              border: `1px solid ${
                form.is_active ? "rgba(14, 165, 233, 0.25)" : "rgba(239, 68, 68, 0.2)"
              }`,
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                เปิดใช้งานบัญชีนี้ (Active Status)
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                {form.is_active
                  ? "ผู้ใช้งานสามารถเข้าสู่ระบบและได้รับการแจ้งเตือนตามปกติ"
                  : "ระงับการใช้งานชั่วคราว บัญชีนี้จะไม่สามารถเข้าสู่ระบบได้"}
              </div>
            </div>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                border: `2px solid ${
                  form.is_active ? "var(--color-primary)" : "var(--border)"
                }`,
                backgroundColor: form.is_active ? "var(--color-primary)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {form.is_active && <CheckIcon size={14} />}
            </div>
          </div>
        </div>

        {/* SECTION 4: สถานีที่รับผิดชอบ (แสดงเฉพาะเมื่อบทบาทเป็น เจ้าหน้าที่ส่วนท้องถิ่น) */}
        {form.role === "staff" && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--color-primary)",
                  }}
                >
                  สถานีที่รับผิดชอบ
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  เลือกสถานีที่เจ้าหน้าที่รายนี้มีหน้าที่ดูแล ({form.station_ids.length}/{stations.length} สถานี)
                </div>
              </div>
              {stations.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllStations}
                  className="btn btn-secondary"
                  style={{ fontSize: 11, padding: "4px 8px", height: "auto" }}
                >
                  {form.station_ids.length === stations.length ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
                </button>
              )}
            </div>

            {loadingStations ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                กำลังโหลดรายการสถานี...
              </div>
            ) : stations.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12, border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)" }}>
                ไม่พบข้อมูลสถานีในระบบ
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 8,
                  maxHeight: 180,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {stations.map((st) => {
                  const isSelected = form.station_ids.includes(st.station_id);
                  const waterStatus = st.water_status || (st.status === 'active' ? 'normal' : 'normal');
                  return (
                    <div
                      key={st.station_id}
                      onClick={() => toggleStation(st.station_id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: isSelected
                          ? "rgba(14, 165, 233, 0.08)"
                          : "var(--bg-surface)",
                        border: `1px solid ${
                          isSelected ? "var(--color-primary)" : "var(--border)"
                        }`,
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            border: `2px solid ${
                              isSelected ? "var(--color-primary)" : "var(--border)"
                            }`,
                            backgroundColor: isSelected ? "var(--color-primary)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <CheckIcon size={12} />}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                fontFamily: "monospace",
                                padding: "1px 6px",
                                borderRadius: 4,
                                backgroundColor: "rgba(14, 165, 233, 0.15)",
                                color: "var(--color-primary)",
                              }}
                            >
                              {st.station_id}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                              {st.station_name}
                            </span>
                          </div>
                          {st.location_name && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                              {st.location_name}
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={`badge ${
                          waterStatus === "critical"
                            ? "badge-danger"
                            : waterStatus === "warning"
                            ? "badge-warning"
                            : "badge-success"
                        }`}
                        style={{ fontSize: 10, padding: "2px 8px" }}
                      >
                        {waterStatus === "critical"
                          ? "วิกฤต"
                          : waterStatus === "warning"
                          ? "เฝ้าระวัง"
                          : "ปกติ"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
