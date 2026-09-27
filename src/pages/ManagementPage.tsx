import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2Icon,
  UsersIcon,
  ClipboardListIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  BarChart3Icon,
  LogOutIcon,
} from '../components/ui/Icons';

export default function ManagementPage() {
  const navigate = useNavigate();
  const { user, logout, loginAsCitizen } = useAuth();

  const handleLogout = () => {
    logout();
    loginAsCitizen();
    navigate('/dashboard', { replace: true });
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="page-container management-hub-container">
      {/* ── Page Header ── */}
      <div className="management-hero-banner">
        <div className="management-badge">
          <ShieldCheckIcon size={16} />
          <span>{isAdmin ? 'สิทธิ์ผู้ดูแลระบบ (Admin)' : 'สิทธิ์เจ้าหน้าที่ (Staff)'}</span>
        </div>
        <h1 className="management-title">ศูนย์จัดการระบบ FloodGuard</h1>
        <p className="management-subtitle">
          เลือกหมวดหมู่ที่ต้องการจัดการเพื่อแก้ไขข้อมูลสถานีตรวจวัด ผู้ใช้งาน หรือติดตามประวัติระบบ
        </p>
      </div>

      {/* ── Management Action Cards Grid ── */}
      <div className="management-cards-grid">
        {/* Card 1: Manage Stations */}
        <button
          type="button"
          className="management-action-card"
          onClick={() => navigate('/stations')}
        >
          <div className="card-icon-wrapper station-theme">
            <Building2Icon size={28} />
          </div>
          <div className="card-info-content">
            <div className="card-title-row">
              <h3>จัดการสถานีตรวจวัด</h3>
              <span className="card-tag">สถานี & เซนเซอร์</span>
            </div>
            <p className="card-description">
              เพิ่มสถานีใหม่ ปรับจูนระยะติดตั้ง (Sensor Calibration) กำหนดค่าเกณฑ์เฝ้าระวัง และเปิด/ปิดสถานี
            </p>
          </div>
          <div className="card-arrow-icon">
            <ChevronRightIcon size={24} />
          </div>
        </button>

        {/* Card 2: Manage Users */}
        <button
          type="button"
          className="management-action-card"
          onClick={() => navigate('/users')}
        >
          <div className="card-icon-wrapper user-theme">
            <UsersIcon size={28} />
          </div>
          <div className="card-info-content">
            <div className="card-title-row">
              <h3>จัดการผู้ใช้งาน</h3>
              <span className="card-tag">สมาชิก & สิทธิ์</span>
            </div>
            <p className="card-description">
              ตรวจสอบรายชื่อประชาชนผู้ลงทะเบียน จัดการสิทธิ์เจ้าหน้าที่ (Staff) และผู้ดูแลระบบ (Admin)
            </p>
          </div>
          <div className="card-arrow-icon">
            <ChevronRightIcon size={24} />
          </div>
        </button>

        {/* Card 3: Sensor Data History (Admin & Staff) */}
        <button
          type="button"
          className="management-action-card"
          onClick={() => navigate('/history')}
        >
          <div className="card-icon-wrapper history-theme">
            <ClipboardListIcon size={28} />
          </div>
          <div className="card-info-content">
            <div className="card-title-row">
              <h3>ประวัติข้อมูลเซนเซอร์</h3>
              <span className="card-tag">Telemetry Log</span>
            </div>
            <p className="card-description">
              ตรวจสอบบันทึก telemetry ย้อนหลัง กรองข้อมูลตามช่วงเวลา และส่งออกรายงาน CSV
            </p>
          </div>
          <div className="card-arrow-icon">
            <ChevronRightIcon size={24} />
          </div>
        </button>
      </div>

      {/* ── Quick Access & Navigation Shortcuts ── */}
      <div className="management-footer-actions">
        <button
          type="button"
          className="btn btn-secondary management-back-btn"
          onClick={() => navigate('/dashboard')}
        >
          <BarChart3Icon size={18} />
          <span>กลับสู่แดชบอร์ด</span>
        </button>

        <button
          type="button"
          className="btn btn-danger-outline management-logout-btn"
          onClick={handleLogout}
        >
          <LogOutIcon size={18} />
          <span>ออกจากระบบเจ้าหน้าที่</span>
        </button>
      </div>
    </div>
  );
}
