import { useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import type { User, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SearchIcon, MapPinIcon, Edit3Icon, Trash2Icon, AlertTriangleIcon, MessageSquareIcon } from '../ui/Icons';

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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      onDelete(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 4000);
    }
  };

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
                          className={`btn btn-sm ${deleteConfirm === u.id ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={() => handleDelete(u.id)}
                          disabled={u.id === currentUser?.id}
                          title={deleteConfirm === u.id ? 'คลิกอีกครั้งเพื่อยืนยันลบออกจาก DB' : 'ลบ'}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          {deleteConfirm === u.id ? (
                            <>
                              <AlertTriangleIcon size={13} />
                              <span>ยืนยันลบ</span>
                            </>
                          ) : (
                            <Trash2Icon size={13} />
                          )}
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
    </div>
  );
}
