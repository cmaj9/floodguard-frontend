import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  circle?: boolean;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = '6px',
  circle = false,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`ui-skeleton ${className}`}
      style={{
        width: circle ? height : width,
        height,
        borderRadius: circle ? '50%' : borderRadius,
        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.8s infinite linear',
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 2,
  gap = '8px',
  lastLineWidth = '65%',
  className = '',
}: {
  lines?: number;
  gap?: string;
  lastLineWidth?: string;
  className?: string;
}) {
  return (
    <div
      className={`ui-skeleton-text-group ${className}`}
      style={{ display: 'flex', flexDirection: 'column', gap, width: '100%' }}
      aria-hidden="true"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.875rem"
          width={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
          borderRadius="4px"
        />
      ))}
    </div>
  );
}

export function SkeletonMetric({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bento-card ${className}`}
      style={{
        padding: '1.25rem',
        borderRadius: '12px',
        background: 'var(--card-surface, #0C0E12)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton width="45%" height="14px" />
        <Skeleton circle height="28px" />
      </div>
      <Skeleton width="70%" height="32px" borderRadius="8px" />
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <Skeleton width="30%" height="12px" />
        <Skeleton width="40%" height="12px" />
      </div>
    </div>
  );
}

export function SkeletonCard({
  height = '180px',
  className = '',
}: {
  height?: string | number;
  className?: string;
}) {
  return (
    <div
      className={`bento-card ${className}`}
      style={{
        height,
        padding: '1.25rem',
        borderRadius: '14px',
        background: 'var(--card-surface, #0C0E12)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Skeleton circle height="36px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Skeleton width="40%" height="16px" />
          <Skeleton width="25%" height="12px" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Skeleton width="100%" height="12px" />
        <Skeleton width="80%" height="12px" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="30%" height="14px" />
        <Skeleton width="20%" height="24px" borderRadius="9999px" />
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  className = '',
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={`ui-skeleton-table ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        padding: '1rem',
        background: 'var(--card-surface, #0C0E12)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
      aria-hidden="true"
    >
      {/* Header */}
      <div style={{ display: 'flex', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} height="14px" width={`${100 / cols}%`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: '12px', padding: '8px 0' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height="16px" width={`${100 / cols}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
