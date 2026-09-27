import React, { useEffect, useRef } from 'react';
import { XIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function Modal({ isOpen, onClose, title, subtitle, children, footer, maxWidth = '520px' }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  /* Lock body scroll */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  /* Escape key */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  /* Focus management: save previous focus, move into modal, restore on close */
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      // Move focus to the first focusable element inside the modal
      requestAnimationFrame(() => {
        const el = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE);
        el?.focus();
      });
    } else {
      previouslyFocused.current?.focus();
    }
  }, [isOpen]);

  /* Focus trap */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !contentRef.current) return;
    const focusable = Array.from(contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  if (!isOpen) return null;

  return (
    /* Backdrop — aria-hidden so only Escape / close button dismiss the modal for keyboard users */
    <div className="modal-overlay" onClick={onClose} aria-hidden="true">
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal-content"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="modal-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h3 id="modal-title" className="modal-title">{title}</h3>
            {subtitle && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 400 }}>
                {subtitle}
              </div>
            )}
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="ปิด" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <XIcon size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
