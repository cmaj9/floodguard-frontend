import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserTable from '../components/users/UserTable';
import UserModal from '../components/users/UserModal';
import type { User, UserRole } from '../types';
import { fetchUsers, createUser, updateUser, deleteUser } from '../services/apiService';
import { PlusIcon, CheckCircleIcon, AlertTriangleIcon } from '../components/ui/Icons';
import SegmentedControl from '../components/ui/SegmentedControl';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Access control
  useEffect(() => {
    if (currentUser && currentUser.role !== 'staff' && currentUser.role !== 'admin') {
      navigate('/dashboard');
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
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลผู้ใช้จากฐานข้อมูลได้');
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

  if (!currentUser || (currentUser.role !== 'staff' && currentUser.role !== 'admin')) {
    return null;
  }

  // Filter based on logged-in user role
  const visibleUsers =
    currentUser.role === 'staff'
      ? users.filter((u) => u.role === 'citizen')
      : users;

  const tabs: { value: UserRole | 'all'; label: string; count: number }[] = [
    { value: 'all', label: 'ทั้งหมด', count: visibleUsers.length },
    { value: 'citizen', label: 'ประชาชน', count: visibleUsers.filter((u) => u.role === 'citizen').length },
    { value: 'staff', label: 'เจ้าหน้าที่', count: visibleUsers.filter((u) => u.role === 'staff').length },
    ...(currentUser.role === 'admin'
      ? [{ value: 'admin' as UserRole, label: 'ผู้ดูแลระบบ', count: visibleUsers.filter((u) => u.role === 'admin').length }]
      : []),
  ];

  const filtered = activeTab === 'all' ? visibleUsers : visibleUsers.filter((u) => u.role === activeTab);

  return (
    <div className="page-container">
      {/* Success Notification Banner */}
      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(76, 175, 80, 0.15)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#4caf50',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircleIcon size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--color-critical-dim)',
            border: '1px solid rgba(255, 82, 82, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-critical)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangleIcon size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Segmented Control Role Filter & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
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

        <button
          id="add-user-btn"
          className="btn btn-primary"
          onClick={handleAdd}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            height: 38,
            padding: '0 16px',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          <PlusIcon size={15} />
          <span>เพิ่มผู้ใช้ใหม่</span>
        </button>
      </div>

      <div className="card" style={{ padding: 20 }}>
        {loading && users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <span
              style={{
                display: 'inline-block',
                width: 24,
                height: 24,
                border: '3px solid rgba(0, 212, 255, 0.2)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginRight: 8,
                verticalAlign: 'middle',
              }}
            />
            กำลังโหลดข้อมูลผู้ใช้...
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
