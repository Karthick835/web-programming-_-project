import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Modal / Drawer component
 * - Closes on: X button, Escape key, backdrop click (unless dirty)
 * - Locks body scroll while open, restores on close
 * - Traps keyboard focus inside
 * - Returns focus to trigger element on close
 * - Handles max-height with internal scroll for small screens
 *
 * Props:
 *   isOpen        boolean
 *   onClose       () => void
 *   title         string
 *   size          'sm' | 'md' | 'lg' | 'xl' | '2xl' (default 'lg')
 *   isDirty       boolean — when true, backdrop/Escape shows confirmation
 *   children      ReactNode
 *   hideClose     boolean — hide the X button (for non-dismissible uses)
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  size = 'lg',
  isDirty = false,
  children,
  hideClose = false
}) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  }[size] || 'max-w-2xl';

  const attemptClose = useCallback(() => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Close anyway?')) return;
    }
    onClose();
  }, [isDirty, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      // Focus the panel after mount
      requestAnimationFrame(() => {
        panelRef.current?.focus();
      });
    } else {
      document.body.style.overflow = '';
      // Return focus to trigger element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        attemptClose();
      }
      // Focus trap
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, attemptClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === overlayRef.current) attemptClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full ${sizeClass} bg-[#0c0f1c] border border-cyan-500/40 rounded-xl shadow-[0_0_50px_rgba(0,240,255,0.18)] outline-none my-4 flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
            {title && (
              <h2 className="font-heading text-lg font-bold text-white">{title}</h2>
            )}
            {!hideClose && (
              <button
                onClick={attemptClose}
                aria-label="Close dialog"
                className="ml-auto w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            )}
          </div>
        )}

        {/* Body — scrolls internally */}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
