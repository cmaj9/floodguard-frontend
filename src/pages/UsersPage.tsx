import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserTable from '../components/users/UserTable';
import UserModal from '../components/users/UserModal';
import type { User, UserRole } from '../types';
import { fetchUsers, createUser, updateUser, deleteUser } from '../services/apiService';
import { PlusIcon, CheckCircleIcon, AlertTriangleIcon, RefreshCwIcon } from '../components/ui/Icons';
import SegmentedControl from '../components/ui/SegmentedControl';
import ManagementBackBar from '../components/ui/ManagementBackBar';
import { Button } from '../components/ui/Button';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Access control: Only Admin can manage system users (RBAC Rule)
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/management');
    }
  }, [currentUser, navigate]);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<UserRole | 'all'>('all');

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await fetchUsers();
      setUsers(data);
    } catch (err: unknown) {
      console.error('Failed to load users:', err);
      const apiErr = (err as any)?.response?.data?.error;
      setErrorMsg(apiErr || (err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลผู้ใช้จากฐานข้อมูลได้'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    const handleGlobalRefresh = () => {
      loadUsers();
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => {
      window.removeEventListener('app:refresh', handleGlobalRefresh);
    };
  }, [loadUsers]);

  const handleAdd = () => {
    setEditUser(null);
    setModalOpen(true);
  };

  const handleEdit = (u: User) => {
    setEditUser(u);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setErrorMsg('');
      await deleteUser(id);
      setSuccessMsg('ลบผู้ใช้สำเร็จ');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadUsers();
    } catch (err: unknown) {
      console.error('Delete error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถลบผู้ใช้ได้');
    }
  };

  const handleSave = async (data: Partial<User>) => {
    try {
      setErrorMsg('');
      if (editUser) {
        await updateUser(editUser.id, data);
        setSuccessMsg('แก้ไขข้อมูลผู้ใช้สำเร็จ');
      } else {
        await createUser(data);
        setSuccessMsg('เพิ่มผู้ใช้ใหม่ลงในฐานข้อมูลสำเร็จ');
      }
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadUsers();
    } catch (err: unknown) {
      console.error('Save user error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // Filter based on logged-in user role
  const visibleUsers = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.role === 'staff'
      ? users.filter((u) => u.role === 'citizen')
      : users;
  }, [currentUser, users]);

  // Telemetry statistics
  const stats = useMemo(() => {
    const total = visibleUsers.length;
    const citizen = visibleUsers.filter((u) => u.role === 'citizen').length;
    const staff = visibleUsers.filter((u) => u.role === 'staff').length;
    const admin = visibleUsers.filter((u) => u.role === 'admin').length;
    const active = visibleUsers.filter((u) => u.is_active !== undefined ? u.is_active : (u.isActive !== false)).length;
    const suspended = total - active;
    const lineConnected = visibleUsers.filter((u) => Boolean(u.line_user_id || u.lineUserId)).length;

    return { total, citizen, staff, admin, active, suspended, lineConnected };
  }, [visibleUsers]);

  const tabs: { value: UserRole | 'all'; label: string; count: number }[] = useMemo(() => [
    { value: 'all', label: 'ทั้งหมด', count: stats.total },
    { value: 'citizen', label: 'ประชาชน', count: stats.citizen },
    { value: 'staff', label: 'เจ้าหน้าที่', count: stats.staff },
    ...(currentUser?.role === 'admin'
      ? [{ value: 'admin' as UserRole, label: 'ผู้ดูแลระบบ', count: stats.admin }]
      : []),
  ], [currentUser?.role, stats]);

  const filtered = useMemo(() => {
    return activeTab === 'all' ? visibleUsers : visibleUsers.filter((u) => u.role === activeTab);
  }, [activeTab, visibleUsers]);

  if (!currentUser || (currentUser.role !== 'staff' && currentUser.role !== 'admin')) {
    return null;
  }

  return (
    <div className="page-container">
      {/* Sticky Management Back Bar */}
      <ManagementBackBar
        title="จัดการผู้ใช้งานระบบ"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Manual Refresh Button with Tactical Spinning Icon */}
            <button
              id="refresh-users-btn"
              type="button"
              className="btn-3d-dark tactile-press"
              onClick={loadUsers}
              disabled={loading}
              title="รีเฟรชข้อมูลผู้ใช้"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
              }}
            >
              <RefreshCwIcon size={14} className={loading ? 'spin-animate' : ''} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            {/* The Rarity Rule: Pastel Pink 3D Jewel for primary creation only */}
            <Button
              id="add-user-btn"
              variant="jewel-pink"
              className="tactile-press"
              onClick={handleAdd}
              leftIcon={<PlusIcon size={15} />}
              title="เพิ่มผู้ใช้ใหม่"
            >
              เพิ่มผู้ใช้ใหม่
            </Button>
          </div>
        }
      />

      {/* ── FLEET ROSTER TELEMETRY COCKPIT STRIP (DELIGHT AXIS) ── */}
      <div
        style={{
          background: 'var(--card-surface, #0C0E12)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 14,
          padding: '12px 18px',
          margin: '16px 0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Left: Situational Roster Insight */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: stats.suspended > 0 ? '#F59E0B' : '#10B981',
              flexShrink: 0,
            }}
            className="heartbeat-dot"
          />
          <span style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 600 }}>
            {stats.suspended > 0
              ? `ผู้ใช้งานพร้อมปฏิบัติงาน ${stats.active} บัญชี (มีระงับชั่วคราว ${stats.suspended} บัญชี) • เชื่อมต่อ LINE ${stats.lineConnected} บัญชี`
              : `ผู้ใช้งานพร้อมปฏิบัติงาน ${stats.active} จาก ${stats.total} บัญชี • เชื่อมต่อแจ้งเตือน LINE ${stats.lineConnected} บัญชี`}
          </span>
        </div>

        {/* Right: Quick Telemetry Breakdown Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className="tactile-press"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: activeTab === 'all' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'all' ? '#38BDF8' : '#94A3B8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ทั้งหมด <span className="font-mono tabular-nums">{stats.total}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('citizen')}
            className="tactile-press"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: activeTab === 'citizen' ? '1px solid rgba(167, 139, 250, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'citizen' ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'citizen' ? '#C084FC' : '#94A3B8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ประชาชน <span className="font-mono tabular-nums">{stats.citizen}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className="tactile-press"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: activeTab === 'staff' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'staff' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'staff' ? '#38BDF8' : '#94A3B8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            เจ้าหน้าที่ <span className="font-mono tabular-nums">{stats.staff}</span>
          </button>

          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="tactile-press"
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: activeTab === 'admin' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: activeTab === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: activeTab === 'admin' ? '#FBBF24' : '#94A3B8',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ผู้ดูแลระบบ <span className="font-mono tabular-nums">{stats.admin}</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#10B981',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircleIcon size={18} />
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>{successMsg}</span>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMsg && (() => {
        const isAuthErr = errorMsg.includes('401') ||
          errorMsg.includes('เซสชัน') ||
          errorMsg.includes('เข้าสู่ระบบ') ||
          errorMsg.includes('token') ||
          errorMsg.includes('Bearer') ||
          errorMsg.toLowerCase().includes('unauthorized') ||
          errorMsg.toLowerCase().includes('status code 401');

        const displayErrText = isAuthErr
          ? 'เซสชันการเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้งเพื่อความปลอดภัยของข้อมูล'
          : errorMsg;

        return (
          <div
            style={{
              padding: '14px 18px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-md)',
              color: '#FCA5A5',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangleIcon size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>{displayErrText}</span>
            </div>
            {isAuthErr && (
              <Button
                variant="secondary"
                size="sm"
                className="tactile-press"
                onClick={() => {
                  localStorage.removeItem('wl_auth_user');
                  localStorage.removeItem('wl_auth_token');
                  navigate('/login');
                }}
                style={{
                  fontSize: 12.5,
                  padding: '6px 14px',
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                เข้าสู่ระบบใหม่
              </Button>
            )}
          </div>
        );
      })()}

      {/* Segmented Control Role Filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <SegmentedControl
          options={tabs.map((t) => ({
            value: t.value,
            label: t.label,
            badge: t.count,
          }))}
          value={activeTab}
          onChange={(val) => setActiveTab(val as UserRole | 'all')}
          size="md"
          ariaLabel="กรองบทบาทผู้ใช้"
        />
      </div>

      <div
        className="card"
        style={{
          padding: 20,
          minHeight: 'calc(100vh - 320px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card-surface, #0C0E12)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
        }}
      >
        {loading && users.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <span
              style={{
                display: 'inline-block',
                width: 32,
                height: 32,
                border: '3px solid rgba(56, 189, 248, 0.2)',
                borderTopColor: '#38BDF8',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: 14,
              }}
            />
            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
              กำลังโหลดข้อมูลผู้ใช้จากฐานข้อมูล...
            </span>
          </div>
        ) : (
          <UserTable users={filtered} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </div>

      <UserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        user={editUser}
      />
    </div>
  );
}
