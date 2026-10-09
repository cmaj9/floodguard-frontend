import React from 'react';
import type { WaterStatus, UserRole } from '../../types';
import { CheckCircleIcon, AlertTriangleIcon, XCircleIcon, ShieldIcon, UserIcon, Building2Icon } from './Icons';

export type BadgeStatusType = WaterStatus | 'offline' | UserRole | 'info' | 'default';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatusType;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  count?: number | string;
  dot?: boolean;
  size?: 'sm' | 'md';
  isInteractive?: boolean;
  active?: boolean;
}

export function Badge({
  status = 'default',
  label,
  icon,
  count,
  dot = false,
  size = 'md',
  isInteractive = false,
  active = false,
  className = '',
  style,
  children,
  ...props
}: BadgeProps) {
  // Status definitions mapping to unified Cobalt, Emerald, Amber, and Crimson palettes
  const configMap: Record<
    string,
    { label: string; bg: string; text: string; border: string; dotColor: string; defaultIcon?: React.ReactNode }
  > = {
    normal: {
      label: 'ปกติ',
      bg: 'rgba(16, 185, 129, 0.12)',
      text: '#34D399',
      border: 'rgba(16, 185, 129, 0.28)',
      dotColor: '#10B981',
      defaultIcon: <CheckCircleIcon size={12} />,
    },
    warning: {
      label: 'เฝ้าระวัง',
      bg: 'rgba(245, 158, 11, 0.12)',
      text: '#FBBF24',
      border: 'rgba(245, 158, 11, 0.28)',
      dotColor: '#F59E0B',
      defaultIcon: <AlertTriangleIcon size={12} />,
    },
    critical: {
      label: 'วิกฤต',
      bg: 'rgba(239, 68, 68, 0.14)',
      text: '#F87171',
      border: 'rgba(239, 68, 68, 0.32)',
      dotColor: '#EF4444',
      defaultIcon: <XCircleIcon size={12} />,
    },
    offline: {
      label: 'ออฟไลน์',
      bg: 'rgba(100, 116, 139, 0.14)',
      text: '#94A3B8',
      border: 'rgba(100, 116, 139, 0.25)',
      dotColor: '#64748B',
    },
    unknown: {
      label: 'ไม่มีข้อมูล',
      bg: 'rgba(100, 116, 139, 0.12)',
      text: '#94A3B8',
      border: 'rgba(100, 116, 139, 0.22)',
      dotColor: '#64748B',
    },
    citizen: {
      label: 'ประชาชน',
      bg: 'rgba(14, 165, 233, 0.12)',
      text: '#38BDF8',
      border: 'rgba(14, 165, 233, 0.25)',
      dotColor: '#0EA5E9',
      defaultIcon: <UserIcon size={12} />,
    },
    staff: {
      label: 'เจ้าหน้าที่',
      bg: 'rgba(37, 99, 235, 0.14)',
      text: '#60A5FA',
      border: 'rgba(37, 99, 235, 0.3)',
      dotColor: '#2563EB',
      defaultIcon: <Building2Icon size={12} />,
    },
    admin: {
      label: 'ผู้ดูแลระบบ',
      bg: 'rgba(168, 85, 247, 0.14)',
      text: '#C084FC',
      border: 'rgba(168, 85, 247, 0.3)',
      dotColor: '#A855F7',
      defaultIcon: <ShieldIcon size={12} />,
    },
    info: {
      label: 'ข้อมูล',
      bg: 'rgba(56, 189, 248, 0.12)',
      text: '#38BDF8',
      border: 'rgba(56, 189, 248, 0.25)',
      dotColor: '#38BDF8',
    },
    default: {
      label: '',
      bg: 'rgba(255, 255, 255, 0.06)',
      text: 'var(--text-secondary)',
      border: 'rgba(255, 255, 255, 0.12)',
      dotColor: 'var(--text-muted)',
    },
  };

  const cfg = configMap[status] || configMap.default;
  const content = label || children || cfg.label;
  const renderedIcon = icon !== undefined ? icon : cfg.defaultIcon;

  return (
    <span
      className={`ui-badge ui-badge-${status} ${size === 'sm' ? 'ui-badge-sm' : ''} ${
        isInteractive ? 'ui-badge-interactive' : ''
      } ${active ? 'ui-badge-active' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '4px' : '6px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: '9999px',
        fontSize: size === 'sm' ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        fontFamily: 'inherit',
        lineHeight: 1.2,
        background: active ? 'linear-gradient(135deg, #2563EB 0%, #0284C7 100%)' : cfg.bg,
        color: active ? '#FFFFFF' : cfg.text,
        border: `1px solid ${active ? 'rgba(56, 189, 248, 0.5)' : cfg.border}`,
        cursor: isInteractive ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        boxShadow: active ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
        transition: 'all 0.15s ease',
        ...style,
      }}
      {...props}
    >
      {dot && (
        <span
          style={{
            width: size === 'sm' ? '6px' : '7px',
            height: size === 'sm' ? '6px' : '7px',
            borderRadius: '50%',
            background: active ? '#FFFFFF' : cfg.dotColor,
            flexShrink: 0,
            animation: status === 'critical' ? 'pulseDot 1.4s infinite' : 'none',
          }}
          aria-hidden="true"
        />
      )}

      {renderedIcon && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: active ? '#FFFFFF' : cfg.text,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {renderedIcon}
        </span>
      )}

      {content && <span>{content}</span>}

      {count !== undefined && (
        <span
          style={{
            fontSize: size === 'sm' ? '0.625rem' : '0.6875rem',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            padding: '1px 5px',
            borderRadius: '9999px',
            background: active ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
            color: active ? '#FFFFFF' : cfg.text,
            marginLeft: '2px',
          }}
        >
          {count}
        </span>
      )}
    </span>
  );
}

export default Badge;
