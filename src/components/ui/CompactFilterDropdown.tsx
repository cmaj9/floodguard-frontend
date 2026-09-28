import { useState, useRef, useEffect, memo } from 'react';
import { ChevronDownIcon, CheckCircleIcon } from './Icons';

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  statusDotColor?: string;
  count?: number | string;
  badge?: string;
}

interface CompactFilterDropdownProps {
  label?: string;
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  id?: string;
  width?: string | number;
}

export const CompactFilterDropdown = memo(function CompactFilterDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'เลือกรายการ...',
  id,
  width = 'auto',
}: CompactFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div
      ref={containerRef}
      id={id}
      className="compact-dropdown-container"
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        gap: '0.25rem',
        width: typeof width === 'number' ? `${width}px` : width,
      }}
    >
      {label && (
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </span>
      )}

      {/* Trigger Capsule Button */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.625rem',
          padding: '0.55rem 1rem',
          borderRadius: '0.75rem',
          background: isOpen ? 'rgba(37, 99, 235, 0.12)' : 'rgba(17, 24, 39, 0.75)',
          border: `1px solid ${isOpen ? 'var(--primary-accent)' : 'rgba(255, 255, 255, 0.12)'}`,
          color: 'var(--text-primary)',
          fontSize: '0.875rem',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 2px rgba(37, 99, 235, 0.3)' : 'none',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
          {selectedOption?.statusDotColor && (
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: selectedOption.statusDotColor,
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: selectedOption ? '#FFFFFF' : 'var(--text-muted)',
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.count !== undefined && (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary)',
              }}
            >
              {selectedOption.count}
            </span>
          )}
        </div>

        <span
          style={{
            display: 'inline-flex',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: isOpen ? 'var(--cyan-glow)' : 'var(--text-secondary)',
            flexShrink: 0,
          }}
        >
          <ChevronDownIcon size={14} />
        </span>
      </button>

      {/* Popover Menu (Solid 100% Opaque Obsidian Background to prevent bleed-through) */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 9999,
            minWidth: '280px',
            maxWidth: '380px',
            background: '#0D1526',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '0.875rem',
            padding: '0.5rem',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.12)',
            animation: 'fadeIn 0.15s ease',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  padding: '0.625rem 0.85rem',
                  borderRadius: '0.625rem',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
                  border: isSelected ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
                  color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#172238';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', overflow: 'hidden' }}>
                  {opt.statusDotColor && (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: opt.statusDotColor,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: isSelected ? 700 : 500 }}>
                      {opt.label}
                    </span>
                    {opt.sublabel && (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  {opt.count !== undefined && (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '9999px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {opt.count}
                    </span>
                  )}
                  {isSelected && (
                    <span style={{ color: 'var(--cyan-glow)', display: 'flex' }}>
                      <CheckCircleIcon size={14} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default CompactFilterDropdown;
