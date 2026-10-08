import { useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import type { User, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SearchIcon, MapPinIcon, Edit3Icon, Trash2Icon, MessageSquareIcon } from '../ui/Icons';

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

const roleLabel: Record<UserRole, string> = {
  citizen: 'ประชาชนทั่วไป',
  staff: 'เจ้าหน้าที่',
  admin: 'ผู้ดูแลระบบ',
};
const roleClass: Record<UserRole, string> = {
  citizen: 'badge-role-citizen',
  staff: 'badge-role-staff',
  admin: 'badge-role-admin',
};

export default function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    const lineId = u.line_user_id || u.lineUserId || '';
    return (
      u.name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      u.district.toLowerCase().includes(s) ||
      lineId.toLowerCase().includes(s)
    );
  });

  return (
    <div>
      {/* Search Bar */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div className="search-wrap">
          <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}><SearchIcon size={16} /></span>
          <label htmlFor="user-search" className="visually-hidden">ค้นหาผู้ใช้</label>
          <input
            id="user-search"
            className="input search-input"
            placeholder="ค้นหาชื่อ, อีเมล, LINE ID, อำเภอ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 300 }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ชื่อ-นามสกุล</th>
              <th>อีเมล</th>
              <th>เบอร์โทร</th>
              <th>บทบาท</th>
              <th>LINE ID</th>
              <th>สถานีที่ติดตาม</th>
              <th>สถานะ</th>
              <th>วันที่สมัคร</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  ไม่พบข้อมูลผู้ใช้ในระบบ
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const lineId = u.line_user_id || u.lineUserId;
                const stations = u.station_ids || u.stationIds || [];
                const isActive = u.is_active !== undefined ? u.is_active : (u.isActive !== false);

                return (
                  <tr key={u.id} style={{ opacity: isActive ? 1 : 0.6 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          className="user-avatar"
                          style={{ width: 32, height: 32, fontSize: 12 }}
                        >
                          {u.name.slice(0, 1)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.name}</div>
                          {u.district && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                              <MapPinIcon size={11} />
                              <span>{u.district}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.phone || '-'}</td>
                    <td>
                      <span className={`badge ${roleClass[u.role]}`}>
                        {roleLabel[u.role]}
                      </span>
                    </td>
                    <td>
                      {lineId ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            background: 'rgba(6, 199, 85, 0.15)',
                            color: '#06c755',
                            border: '1px solid rgba(6, 199, 85, 0.3)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 11,
                            fontWeight: 500,
                            maxWidth: 130,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={`LINE User ID: ${lineId}`}
                        >
                          <MessageSquareIcon size={12} />
                          <span>{lineId.slice(0, 10)}...</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      {stations.length > 0 ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {stations.map((st) => (
                            <span
                              key={st}
                              style={{
                                padding: '2px 6px',
                                background: 'var(--color-primary-dim)',
                                color: 'var(--color-primary)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 11,
                                fontWeight: 500,
                              }}
                            >
                              {st}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>ทั้งหมด/ไม่มี</span>
                      )}
                    </td>
                    <td>
                      <span
                        aria-label={isActive ? 'สถานะ ปกติ' : 'สถานะ ระงับ'}
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 11,
                          fontWeight: 600,
                          background: isActive ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 82, 82, 0.15)',
                          color: isActive ? '#4caf50' : '#ff5252',
                          border: `1px solid ${isActive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 82, 82, 0.3)'}`,
                        }}
                      >
                        {isActive ? '● ปกติ' : '○ ระงับ'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {u.createdAt || u.created_at
                        ? format(new Date(u.createdAt || u.created_at!), 'dd MMM yyyy', { locale: th })
                        : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => onEdit(u)}
                          disabled={u.id === currentUser?.id}
                          title="แก้ไขข้อมูลผู้ใช้"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Edit3Icon size={13} />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setUserToDelete(u)}
                          disabled={u.id === currentUser?.id}
                          title={u.id === currentUser?.id ? 'ไม่สามารถลบบัญชีของตนเองได้' : 'ลบผู้ใช้'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: u.id === currentUser?.id ? 'var(--text-muted)' : 'var(--color-danger)',
                          }}
                        >
                          <Trash2Icon size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        แสดง {filtered.length} จาก {users.length} รายการ
      </div>

      {/* Pop-up ยืนยันการลบผู้ใช้ */}
      {userToDelete && (
        <div
          className="modal-overlay"
          onClick={() => setUserToDelete(null)}
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
              padding: '24px 28px',
              maxWidth: 400,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444',
                  flexShrink: 0,
                }}
              >
                <Trash2Icon size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                ยืนยันการลบผู้ใช้
              </h3>
            </div>

            {/* Hero Card: Prominent Role Badge + Large 20px User Name */}
            <div
              style={{
                padding: '16px 18px',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span
                  className={`badge ${roleClass[userToDelete.role]}`}
                  style={{ fontSize: 11, padding: '2px 8px' }}
                >
                  {roleLabel[userToDelete.role]}
                </span>
                {userToDelete.email && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {userToDelete.email}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                }}
              >
                {userToDelete.name}
              </div>
            </div>

            {/* Button Layout: Cancel Left, Danger Confirm Right */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setUserToDelete(null)}
                style={{
                  padding: '9px 20px',
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
                onClick={() => {
                  onDelete(userToDelete.id);
                  setUserToDelete(null);
                }}
                style={{
                  padding: '9px 20px',
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
                <Trash2Icon size={15} />
                <span>ยืนยันลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
