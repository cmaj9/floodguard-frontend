import React from 'react';

export type CardVariant = 'flat' | 'raised' | 'interactive' | 'glass';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: CardVariant;
  padding?: CardPadding;
  header?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  as?: React.ElementType;
}

export function Card({
  variant = 'raised',
  padding = 'md',
  header,
  title,
  subtitle,
  action,
  footer,
  children,
  className = '',
  style,
  as: Component = 'div',
  ...props
}: CardProps) {
  const paddingStyles: Record<CardPadding, string> = {
    none: '0',
    sm: '0.75rem 1rem',
    md: '1.25rem',
    lg: '1.75rem',
  };

  const variantStyles: Record<CardVariant, React.CSSProperties> = {
    flat: {
      background: 'rgba(17, 24, 39, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: 'none',
    },
    raised: {
      background: 'rgba(17, 24, 39, 0.85)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2)',
    },
    interactive: {
      background: 'rgba(17, 24, 39, 0.85)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
      cursor: 'pointer',
      transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease, box-shadow 0.18s ease',
    },
    glass: {
      background: 'rgba(14, 21, 38, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    },
  };

  const hasHeader = Boolean(header || title || action);

  return (
    <Component
      className={`ui-card ui-card-${variant} ${className}`}
      style={{
        borderRadius: '14px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {/* Header Slot */}
      {hasHeader && (
        <div
          className="ui-card-header"
          style={{
            padding: padding === 'none' ? '1rem 1.25rem' : paddingStyles[padding],
            paddingBottom: '0.75rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            borderBottom: children ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
          }}
        >
          {header ? (
            header
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {title && (
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {title}
                </div>
              )}
              {subtitle && (
                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>
          )}

          {action && (
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {action}
            </div>
          )}
        </div>
      )}

      {/* Body Content Slot */}
      {children && (
        <div
          className="ui-card-body"
          style={{
            padding: paddingStyles[padding],
          }}
        >
          {children}
        </div>
      )}

      {/* Footer Slot */}
      {footer && (
        <div
          className="ui-card-footer"
          style={{
            padding: paddingStyles[padding],
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(0, 0, 0, 0.15)',
          }}
        >
          {footer}
        </div>
      )}
    </Component>
  );
}

export default Card;
