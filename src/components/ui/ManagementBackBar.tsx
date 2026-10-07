import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from './Icons';
import { useAuth } from '../../context/AuthContext';

interface ManagementBackBarProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  actions?: React.ReactNode;
}

export default function ManagementBackBar({
  title,
  badge,
  badgeColor,
  actions,
}: ManagementBackBarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const defaultBadge =
    badge || (user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'staff' ? 'เจ้าหน้าที่' : 'ประชาชน');
  const defaultBadgeClass =
    badgeColor ||
    (user?.role === 'admin'
      ? 'badge-role-admin'
      : user?.role === 'staff'
      ? 'badge-role-staff'
      : 'badge-role-citizen');

  return (
    <div
      className="management-back-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px 14px',
        padding: '10px 16px',
        marginBottom: '1.25rem',
        background: 'rgba(15, 23, 42, 0.88)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 'calc(var(--topbar-height, 56px) + var(--safe-top, 0px))',
        zIndex: 80,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.28)',
      }}
    >
      {/* Left side: Back to Management Hub + Page Title & Role Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          minWidth: 0,
        }}
      >
        <button
          type="button"
          onClick={() => {
            const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
            navigate(isDesktop ? '/dashboard' : '/management');
          }}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 600,
            color: '#38BDF8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            background: 'rgba(56, 189, 248, 0.08)',
            borderRadius: '999px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
          title="กลับ"
        >
          <ArrowLeftIcon size={14} />
          <span>{typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'แดชบอร์ด' : 'ศูนย์จัดการ'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              color: '#F8FAFC',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </span>
          <span
            className={`badge ${defaultBadgeClass}`}
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
            }}
          >
            {defaultBadge}
          </span>
        </div>
      </div>

      {/* Right side: Action Controls (Buttons, View Toggle, etc.) */}
      {actions && (
        <div
          className="management-back-bar-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
