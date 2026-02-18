'use client';

/**
 * ConfirmModal — Reusable confirmation modal
 *
 * Replaces browser's native window.confirm() with a styled modal
 * that matches the PulsePlan design system.
 *
 * Features:
 * - Glass card styling with backdrop blur
 * - Mobile-friendly with large touch targets
 * - Customizable title, message, and button labels
 * - Keyboard accessible (Escape to close)
 * - Focus trap within modal
 */

import { useEffect, useCallback, useRef } from 'react';
import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type ModalVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close (cancel action) */
  onClose: () => void;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Modal title */
  title: string;
  /** Modal message/description */
  message?: string;
  /** Confirm button label (default: "Confirm") */
  confirmLabel?: string;
  /** Cancel button label (default: "Cancel") */
  cancelLabel?: string;
  /** Modal variant affects styling (default: "warning") */
  variant?: ModalVariant;
  /** Whether confirm action is loading/in progress */
  isLoading?: boolean;
}

// =============================================================================
// VARIANT CONFIG
// =============================================================================

const VARIANT_CONFIG = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-[var(--color-error)]/20',
    iconColor: 'text-[var(--color-error)]',
    confirmBg: 'bg-[var(--color-error)] hover:bg-[var(--color-error)]/90',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-[var(--color-warning)]/20',
    iconColor: 'text-[var(--color-warning)]',
    confirmBg: 'bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90',
  },
  info: {
    icon: Info,
    iconBg: 'bg-[var(--color-info)]/20',
    iconColor: 'text-[var(--color-info)]',
    confirmBg: 'bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-blue)]',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-[var(--color-success)]/20',
    iconColor: 'text-[var(--color-success)]',
    confirmBg: 'bg-[var(--color-success)] hover:bg-[var(--color-success)]/90',
  },
} as const;

// =============================================================================
// COMPONENT
// =============================================================================

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  isLoading = false,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading]
  );

  // Focus management and keyboard handling
  useEffect(() => {
    if (isOpen) {
      // Focus the confirm button when modal opens
      confirmButtonRef.current?.focus();
      // Add escape key listener
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className="relative w-full max-w-sm glass-card p-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close button (X) */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-base-600)] transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${config.iconBg} mb-4`}
        >
          <Icon className={`h-7 w-7 ${config.iconColor}`} />
        </div>

        {/* Title */}
        <h2
          id="modal-title"
          className="text-lg font-bold text-center mb-2"
        >
          {title}
        </h2>

        {/* Message */}
        {message && (
          <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
            {message}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          {/* Cancel */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 btn-secondary disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          {/* Confirm */}
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 font-semibold text-white py-3 px-4 rounded-xl transition-all min-h-[44px] disabled:opacity-50 ${config.confirmBg}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Loading...</span>
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
