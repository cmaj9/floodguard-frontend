import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  UserIcon,
  LogOutIcon,
  LinkIcon,
  KeyIcon,
  MailIcon,
  InfoIcon,
  XIcon,
} from '../components/ui/Icons';

export type ToastType = 'login' | 'line' | 'profile' | 'logout' | 'email' | 'info';

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

function getToastTheme(type: ToastType) {
  switch (type) {
    case 'line':
      return {
        border: '1px solid rgba(6, 199, 85, 0.4)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
        iconBg: 'rgba(6, 199, 85, 0.2)',
        iconColor: '#22C55E',
        progressColor: '#22C55E',
      };
    case 'profile':
      return {
        border: '1px solid rgba(129, 140, 248, 0.4)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
        iconBg: 'rgba(129, 140, 248, 0.2)',
        iconColor: '#818CF8',
        progressColor: '#818CF8',
      };
    case 'logout':
      return {
        border: '1px solid rgba(148, 163, 184, 0.35)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
        iconBg: 'rgba(148, 163, 184, 0.2)',
        iconColor: '#94A3B8',
        progressColor: '#94A3B8',
      };
    case 'login':
    case 'email':
    case 'info':
    default:
      return {
        border: '1px solid rgba(56, 189, 248, 0.4)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
        iconBg: 'rgba(56, 189, 248, 0.2)',
        iconColor: '#38BDF8',
        progressColor: '#38BDF8',
      };
  }
}

function getToastIcon(type: ToastType, message: string = '') {
  switch (type) {
    case 'login':
      return <UserIcon size={15} />;
    case 'logout':
      return <LogOutIcon size={15} />;
    case 'line':
      return <LinkIcon size={15} />;
    case 'profile':
      if (message.includes('รหัสผ่าน') || message.includes('password')) {
        return <KeyIcon size={15} />;
      }
      return <UserIcon size={15} />;
    case 'email':
      return <MailIcon size={15} />;
    case 'info':
    default:
      return <InfoIcon size={15} />;
  }
}


/**
 * Global helper to queue or fire a toast from anywhere (even non-component / pre-redirect code)
 */
export function setPendingToast(message: string, type: ToastType = 'login') {
  try {
    sessionStorage.setItem('fg_pending_toast', JSON.stringify({ message, type }));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fg:toast', { detail: { message, type } }));
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [currentToast, setCurrentToast] = useState<ToastData | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(true);
    setTimeout(() => {
      setCurrentToast(null);
      setIsClosing(false);
    }, 350);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'login') => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    const newToast: ToastData = { id: Date.now(), message, type };
    setCurrentToast(newToast);

    // Auto dismiss after 5 seconds
    closeTimerRef.current = setTimeout(() => {
      dismissToast();
    }, 5000);
  }, [dismissToast]);

  // Check sessionStorage on mount and on page visibility/focus (preserves toasts across full page redirects)
  useEffect(() => {
    const checkPending = () => {
      try {
        const stored = sessionStorage.getItem('fg_pending_toast');
        if (stored) {
          sessionStorage.removeItem('fg_pending_toast');
          const parsed = JSON.parse(stored);
          if (parsed?.message) {
            showToast(parsed.message, parsed.type || 'login');
          }
        }
      } catch {}
    };

    checkPending();
    window.addEventListener('focus', checkPending);
    return () => window.removeEventListener('focus', checkPending);
  }, [showToast]);

  // Listen to custom DOM event for non-React or global triggers
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type?: ToastType }>;
      if (customEvent.detail?.message) {
        showToast(customEvent.detail.message, customEvent.detail.type || 'login');
      }
    };
    window.addEventListener('fg:toast', handleEvent);
    return () => window.removeEventListener('fg:toast', handleEvent);
  }, [showToast]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current !== null) {
      const currentY = e.touches[0].clientY;
      if (touchStartY.current - currentY > 20) {
        dismissToast();
        touchStartY.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  const theme = currentToast ? getToastTheme(currentToast.type) : null;

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {currentToast && theme && (
        <div
          role="status"
          aria-live="polite"
          onClick={dismissToast}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          title="แตะหรือเลื่อนขึ้นเพื่อปิด"
          style={{
            position: 'fixed',
            top: 18,
            left: '50%',
            transform: isClosing
              ? 'translate(-50%, -160%)'
              : 'translate(-50%, 0)',
            opacity: isClosing ? 0 : 1,
            zIndex: 99999,
            width: 'calc(100% - 32px)',
            maxWidth: 740,
            background: 'rgba(12, 14, 18, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: theme.border,
            boxShadow: theme.boxShadow,
            borderRadius: 9999,
            padding: '10px 18px 10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            cursor: 'pointer',
            transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
            animation: 'slideDownToast 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            touchAction: 'pan-y',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: theme.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.iconColor,
                flexShrink: 0,
              }}
            >
              {getToastIcon(currentToast.type, currentToast.message)}
            </div>

            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#FFFFFF',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentToast.message}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismissToast();
            }}
            aria-label="ปิดแจ้งเตือน"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94A3B8',
              fontSize: 12,
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              padding: 0,
              lineHeight: 1,
            }}
          >
            <XIcon size={12} />
          </button>

          {/* Micro Progress Bar (5s Countdown) */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: theme.progressColor,
              opacity: 0.9,
              transformOrigin: 'left',
              animation: 'toastProgressBar 5s linear forwards',
            }}
          />
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (message: string, type: ToastType = 'login') => {
        setPendingToast(message, type);
      },
      dismissToast: () => {},
    };
  }
  return ctx;
}
