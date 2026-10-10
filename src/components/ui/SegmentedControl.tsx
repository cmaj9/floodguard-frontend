import React, { useRef, useEffect, useState, memo } from 'react';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (val: T) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  className = '',
  id,
  ariaLabel = 'Segmented Control',
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  // Calculate sliding pill highlight position
  useEffect(() => {
    if (!containerRef.current) return;
    const activeBtn = containerRef.current.querySelector<HTMLButtonElement>(`[data-value="${value}"]`);
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        opacity: 1,
      });
    }
  }, [value, options]);

  // Handle keyboard arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (index + 1) % options.length;
      onChange(options[nextIdx].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (index - 1 + options.length) % options.length;
      onChange(options[prevIdx].value);
    }
  };

  const padY = size === 'sm' ? '0.35rem' : size === 'lg' ? '0.65rem' : '0.45rem';
  const padX = size === 'sm' ? '0.75rem' : size === 'lg' ? '1.25rem' : '0.95rem';
  const fontSize = size === 'sm' ? '0.8125rem' : size === 'lg' ? '0.9375rem' : '0.875rem';

  return (
    <div
      ref={containerRef}
      id={id}
      role="tablist"
      aria-label={ariaLabel}
      className={`segmented-pill-track ${className}`}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : 'auto',
        position: 'relative',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '9999px',
        padding: '3px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Sliding Pill Highlight */}
      <div
        style={{
          position: 'absolute',
          top: '3px',
          bottom: '3px',
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          background: '#1F242C',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '9999px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.45)',
          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: indicatorStyle.opacity,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {options.map((opt, idx) => {
        const isActive = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            data-value={opt.value}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            style={{
              flex: fullWidth ? 1 : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: `${padY} ${padX}`,
              borderRadius: '9999px',
              border: 'none',
              background: 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: fontSize,
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              position: 'relative',
              zIndex: 1,
              transition: 'color 0.15s ease',
              outline: 'none',
            }}
          >
            {opt.icon && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: isActive ? '#FFFFFF' : 'var(--cyan-glow)',
                  opacity: isActive ? 1 : 0.75,
                }}
              >
                {opt.icon}
              </span>
            )}
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px',
                  background: isActive
                    ? 'rgba(255, 255, 255, 0.22)'
                    : opt.badgeColor
                    ? `${opt.badgeColor}25`
                    : 'rgba(255, 255, 255, 0.08)',
                  color: isActive ? '#FFFFFF' : opt.badgeColor || 'var(--text-secondary)',
                  lineHeight: 1.2,
                }}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default memo(SegmentedControl) as typeof SegmentedControl;
