import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import type { User, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SearchIcon, MapPinIcon, Edit3Icon, Trash2Icon, MessageSquareIcon, XIcon } from '../ui/Icons';

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

  // Close delete modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && userToDelete) {
        setUserToDelete(null);
      }
    };
    if (userToDelete) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [userToDelete]);

  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    const lineId = u.line_user_id || u.lineUserId || '';
    return (
      u.name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.district && u.district.toLowerCase().includes(s)) ||
      lineId.toLowerCase().includes(s)
    );
  });

  return (
    <div>
      {/* Search & Telemetry Count Dock */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div className="search-wrap" style={{ position: 'relative', maxWidth: 360, width: '100%' }}>
          <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}>
            <SearchIcon size={16} />
          </span>
          <label htmlFor="user-search" className="visually-hidden">ค้นหาผู้ใช้</label>
          <input
            id="user-search"
            className="input search-input"
            placeholder="ค้นหาชื่อ, อีเมล, LINE ID, อำเภอ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingRight: search ? 36 : 14 }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="tactile-press"
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
              title="ล้างคำค้นหา"
              aria-label="ล้างคำค้นหา"
            >
              <XIcon size={12} />
            </button>
          )}
        </div>

        {/* Live Filter Count Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>แสดงผล</span>
          <span
            className="font-mono tabular-nums"
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#F1F5F9',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {filtered.length} / {users.length}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>บัญชี</span>
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
              <th>สถานีที่ดูแล</th>
              <th>สถานะ</th>
              <th>วันที่สมัคร</th>
              <th style={{ textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <SearchIcon size={22} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {search ? `ไม่พบบัญชีผู้ใช้ที่ตรงกับ "${search}"` : 'ไม่พบข้อมูลผู้ใช้ในระบบ'}
                    </div>
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="btn btn-sm btn-secondary tactile-press"
                        style={{ marginTop: 4 }}
                      >
                        ล้างคำค้นหา
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const lineId = u.line_user_id || u.lineUserId;
                const stations = u.station_ids || u.stationIds || [];
                const isActive = u.is_active !== undefined ? u.is_active : (u.isActive !== false);

                return (
                  <tr key={u.id} style={{ opacity: isActive ? 1 : 0.65 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          className="user-avatar"
                          style={{
                            width: 32,
                            height: 32,
                            fontSize: 12,
                            flexShrink: 0,
                            borderRadius: 8,
                          }}
                        >
                          {u.name.slice(0, 1)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{u.name}</div>
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
                    <td>
                      {u.phone ? (
                        <span className="font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                          {u.phone}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${roleClass[u.role]}`} style={{ fontWeight: 600 }}>
                        {roleLabel[u.role]}
                      </span>
                    </td>
                    <td>
                      {lineId ? (
                        <span
                          className="font-mono"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 8px',
                            background: 'rgba(6, 199, 85, 0.12)',
                            color: '#06C755',
                            border: '1px solid rgba(6, 199, 85, 0.3)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 11,
                            fontWeight: 600,
                            maxWidth: 135,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={`LINE User ID (${lineId})`}
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
                              className="font-mono"
                              style={{
                                padding: '2px 7px',
                                background: 'rgba(56, 189, 248, 0.12)',
                                color: '#38BDF8',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
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
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 9px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 11,
                          fontWeight: 600,
                          background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: isActive ? '#10B981' : '#EF4444',
                          border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: isActive ? '#10B981' : '#EF4444',
                            flexShrink: 0,
                          }}
                        />
                        <span>{isActive ? 'ปกติ' : 'ระงับ'}</span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }} className="font-mono tabular-nums">
                      {u.createdAt || u.created_at
                        ? format(new Date(u.createdAt || u.created_at!), 'dd MMM yyyy', { locale: th })
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary tactile-press"
                          onClick={() => onEdit(u)}
                          disabled={u.id === currentUser?.id}
                          title="แก้ไขข้อมูลผู้ใช้"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Edit3Icon size={13} />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary tactile-press"
                          onClick={() => setUserToDelete(u)}
                          disabled={u.id === currentUser?.id}
                          title={u.id === currentUser?.id ? 'ไม่สามารถลบบัญชีของตนเองได้' : 'ลบผู้ใช้'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: u.id === currentUser?.id ? 'var(--text-muted)' : '#EF4444',
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

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          แสดง <span className="font-mono tabular-nums">{filtered.length}</span> จากทั้งหมด <span className="font-mono tabular-nums">{users.length}</span> บัญชี
        </span>
      </div>

      {/* Pop-up ยืนยันการลบผู้ใช้ */}
      {userToDelete && (
        <div
          className="modal-overlay"
          onClick={() => setUserToDelete(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card-surface, #0C0E12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 16,
              padding: '24px 28px',
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.7), 0 0 20px rgba(239, 68, 68, 0.1)',
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
              <h3 id="delete-user-modal-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
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
                  style={{ fontSize: 11, padding: '2px 8px', fontWeight: 600 }}
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
                className="btn btn-secondary tactile-press"
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
                className="btn tactile-press"
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
