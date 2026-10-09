import React, { forwardRef, useId } from 'react';
import { AlertTriangleIcon, CheckCircleIcon, XCircleIcon } from './Icons';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isSuccess?: boolean;
  onClear?: () => void;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    isSuccess = false,
    onClear,
    fullWidth = true,
    className = '',
    id: customId,
    disabled,
    style,
    value,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = customId || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  return (
    <div
      className={`ui-input-group ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: '6px',
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      {/* Accessible Label */}
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: error ? '#F87171' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            userSelect: 'none',
          }}
        >
          <span>{label}</span>
          {props.required && (
            <span style={{ color: '#EF4444', fontSize: '0.75rem' }} aria-hidden="true">
              * จำเป็น
            </span>
          )}
        </label>
      )}

      {/* Input Frame with tactile focus and icons */}
      <div
        className="ui-input-wrapper"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {leftIcon && (
          <span
            style={{
              position: 'absolute',
              left: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: error ? '#F87171' : 'var(--text-muted)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`ui-input ${error ? 'ui-input-error' : ''}`}
          style={{
            width: '100%',
            height: '42px',
            paddingLeft: leftIcon ? '40px' : '14px',
            paddingRight: onClear && hasValue ? '68px' : rightIcon || isSuccess || error ? '40px' : '14px',
            fontSize: '16px', // Strict iOS Safari rule to prevent auto-zoom on mobile focus
            fontFamily: 'inherit',
            color: 'var(--text-primary)',
            background: 'rgba(15, 23, 42, 0.75)',
            border: `1px solid ${error ? '#EF4444' : 'rgba(255, 255, 255, 0.12)'}`,
            borderRadius: '8px',
            outline: 'none',
            boxShadow: error
              ? '0 0 0 2px rgba(239, 68, 68, 0.2)'
              : '0 1px 2px rgba(0, 0, 0, 0.2)',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
            opacity: disabled ? 0.45 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            ...style,
          }}
          {...props}
        />

        {/* Right Actions: Clear, Success check, or Error icon */}
        <div
          style={{
            position: 'absolute',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 1,
          }}
        >
          {onClear && hasValue && !disabled && (
            <button
              type="button"
              onClick={onClear}
              aria-label="ล้างข้อความ"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'color 0.12s ease',
              }}
            >
              <XCircleIcon size={16} />
            </button>
          )}

          {error ? (
            <span style={{ color: '#EF4444', display: 'flex' }} aria-hidden="true">
              <AlertTriangleIcon size={16} />
            </span>
          ) : isSuccess ? (
            <span style={{ color: '#10B981', display: 'flex' }} aria-hidden="true">
              <CheckCircleIcon size={16} />
            </span>
          ) : (
            rightIcon && (
              <span style={{ color: 'var(--text-muted)', display: 'flex' }} aria-hidden="true">
                {rightIcon}
              </span>
            )
          )}
        </div>
      </div>

      {/* Helper text / Error message */}
      {error ? (
        <span
          id={errorId}
          role="alert"
          style={{
            fontSize: '0.75rem',
            color: '#F87171',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 500,
          }}
        >
          {error}
        </span>
      ) : hint ? (
        <span
          id={hintId}
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontWeight: 400,
          }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
});

export default Input;
