import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'secondary',
    size = 'md',
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    type = 'button',
    style,
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading;

  // ── Style mappings aligned with Apple HIG & Cobalt-Cyan Theme ──
  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    xs: {
      padding: '4px 10px',
      fontSize: '0.75rem',
      minHeight: '28px',
      borderRadius: '6px',
      gap: '5px',
    },
    sm: {
      padding: '6px 14px',
      fontSize: '0.8125rem',
      minHeight: '34px',
      borderRadius: '8px',
      gap: '6px',
    },
    md: {
      padding: '8px 18px',
      fontSize: '0.875rem',
      minHeight: '40px',
      borderRadius: '10px',
      gap: '8px',
    },
    lg: {
      padding: '12px 24px',
      fontSize: '0.9375rem',
      minHeight: '48px',
      borderRadius: '12px',
      gap: '10px',
    },
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #2563EB 0%, #0284C7 100%)',
      color: '#FFFFFF',
      border: '1px solid rgba(56, 189, 248, 0.35)',
      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.05)',
      color: 'var(--text-primary)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
      boxShadow: 'none',
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.12)',
      color: '#F87171',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      boxShadow: '0 1px 3px rgba(239, 68, 68, 0.1)',
    },
    success: {
      background: 'rgba(16, 185, 129, 0.12)',
      color: '#34D399',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      boxShadow: '0 1px 3px rgba(16, 185, 129, 0.1)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--color-primary)',
      border: '1px solid var(--color-primary-dim)',
      boxShadow: 'none',
    },
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading}
      className={`ui-btn ui-btn-${variant} ui-btn-${size} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontFamily: 'inherit',
        lineHeight: 1.2,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled && !isLoading ? 0.45 : 1,
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {/* Loading Spinner with accessible announcement */}
      {isLoading ? (
        <>
          <span
            style={{
              width: size === 'xs' || size === 'sm' ? 14 : 16,
              height: size === 'xs' || size === 'sm' ? 14 : 16,
              border: '2px solid rgba(255, 255, 255, 0.25)',
              borderTopColor: variant === 'ghost' || variant === 'danger' ? 'currentColor' : '#FFFFFF',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        <>
          {leftIcon && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}
          {children && <span>{children}</span>}
          {rightIcon && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
});

export default Button;
