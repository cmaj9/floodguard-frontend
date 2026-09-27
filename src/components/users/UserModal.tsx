import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import type { User, UserRole } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { SaveIcon, PlusIcon, InfoIcon } from "../ui/Icons";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<User>) => void;
  user?: User | null;
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "citizen", label: "ประชาชนทั่วไป" },
  { value: "staff", label: "เจ้าหน้าที่ส่วนท้องถิ่น" },
  { value: "admin", label: "ผู้ดูแลระบบ" },
];

const availableStations = [
  { id: "ST-001", name: "ST-001 (สถานีประตูระบายน้ำคลองหก)" },
  { id: "ST-002", name: "ST-002 (สถานีวัดระดับน้ำคลองหลวง)" },
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
    line_user_id: "",
    station_ids: [] as string[],
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        password: "",
        phone: user.phone || "",
        district: user.district || "",
        role: user.role || "citizen",
        line_user_id: user.line_user_id || user.lineUserId || "",
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
        line_user_id: "",
        station_ids: [],
        is_active: true,
      });
    }
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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "กรุณากรอกชื่อ-นามสกุล";
    if (!form.email.trim() || !form.email.includes("@"))
      e.email = "กรุณากรอกอีเมลที่ถูกต้อง";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const availableRoles =
    currentUser?.role === "admin"
      ? roleOptions
      : roleOptions.filter((r) => r.value === "citizen");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit
          ? "แก้ไขข้อมูลผู้ใช้"
          : "เพิ่มผู้ใช้ใหม่"
      }
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
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
                  password: form.password || undefined,
                  phone: form.phone.trim(),
                  district: form.district.trim(),
                  line_user_id: form.line_user_id.trim() || undefined,
                  lineUserId: form.line_user_id.trim() || undefined,
                  role: form.role,
                  station_ids: form.station_ids,
                  stationIds: form.station_ids,
                  is_active: form.is_active,
                  isActive: form.is_active,
                });
                onClose();
              }
            }}
          >
            {isEdit ? (
              <>
                <SaveIcon size={14} />
                <span>บันทึกการแก้ไข</span>
              </>
            ) : (
              <>
                <PlusIcon size={14} />
                <span>เพิ่มผู้ใช้</span>
              </>
            )}
          </button>
        </>
      }
    >
      {/* Name */}
      <div className="form-group">
        <label className="label">ชื่อ-นามสกุล *</label>
        <input
          className={`input ${errors.name ? "input-error" : ""}`}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="สมชาย ใจดี"
        />
        {errors.name && <div className="error-msg">{errors.name}</div>}
      </div>

      {/* Email & Password */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <div className="form-group">
          <label className="label">อีเมล *</label>
          <input
            className={`input ${errors.email ? "input-error" : ""}`}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="example@email.com"
            type="email"
          />
          {errors.email && <div className="error-msg">{errors.email}</div>}
        </div>
        <div className="form-group">
          <label className="label">
            {isEdit
              ? "เปลี่ยนรหัสผ่าน (เว้นว่างได้)"
              : "รหัสผ่าน (เว้นว่างเพื่อใช้ demo1234)"}
          </label>
          <input
            className="input"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder={isEdit ? "•••••••• (ไม่เปลี่ยน)" : "demo1234"}
            type="password"
          />
        </div>
      </div>

      {/* Phone & District */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <div className="form-group">
          <label className="label">เบอร์โทรศัพท์</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="08XXXXXXXX"
          />
        </div>
        <div className="form-group">
          <label className="label">อำเภอ/เขต</label>
          <input
            className="input"
            value={form.district}
            onChange={(e) => set("district", e.target.value)}
            placeholder="เมือง..."
          />
        </div>
      </div>

      {/* Role & LINE User ID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <div className="form-group">
          <label className="label">บทบาท</label>
          <select
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
        <div className="form-group">
          <label className="label">
            LINE User ID{" "}
            <span style={{ fontSize: 11, color: "var(--color-primary)" }}>
              (สำหรับรับแจ้งเตือน)
            </span>
          </label>
          <input
            className="input"
            value={form.line_user_id}
            onChange={(e) => set("line_user_id", e.target.value)}
            placeholder="U1234567890abcdef..."
          />
        </div>
      </div>

      {/* Station Subscriptions */}
      <div className="form-group">
        <label className="label">สถานีที่รับผิดชอบ/รับการแจ้งเตือน</label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 6,
            maxHeight: 120,
            overflowY: "auto",
            padding: "8px 12px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-surface)",
          }}
        >
          {availableStations.map((st) => (
            <label
              key={st.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={form.station_ids.includes(st.id)}
                onChange={() => toggleStation(st.id)}
              />
              <span>{st.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Active status */}
      <div className="form-group">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
          />
          <span>เปิดใช้งานบัญชีนี้ (Active)</span>
        </label>
      </div>

      {!isEdit && (
        <div
          style={{
            padding: "8px 12px",
            background: "var(--color-info-dim)",
            border: "1px solid rgba(64,196,255,0.2)",
            borderRadius: "var(--radius-sm)",
            fontSize: 12,
            color: "var(--color-info)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <InfoIcon size={16} style={{ flexShrink: 0 }} />
          <span>รหัสผ่านจะได้รับการเข้ารหัสความปลอดภัยด้วย bcrypt</span>
        </div>
      )}
    </Modal>
  );
}
