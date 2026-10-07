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
    <div className="management-back-bar">
      {/* Left side: Mobile back button + Page Title & Role Badge */}
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
          onClick={() => navigate('/management')}
          className="management-back-btn"
          title="กลับไปยังศูนย์จัดการ"
        >
          <ArrowLeftIcon size={14} />
          <span>ศูนย์จัดการ</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <h2 className="management-title-text" style={{ margin: 0 }}>
            {title}
          </h2>
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
        <div className="management-back-bar-actions">
          {actions}
        </div>
      )}
    </div>
  );
}
