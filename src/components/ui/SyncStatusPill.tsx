'use client';

/**
 * SwoleAI Sync Status Pill (Task 4.4)
 *
 * Global sync indicator showing:
 * - synced: green checkmark, all changes synced
 * - pending: amber spinner, changes waiting to sync
 * - syncing: amber spinner with pulse, actively syncing
 * - offline: gray cloud-off, device offline
 * - error: red x, sync failed with retry option
 *
 * Positioned in the app header per design spec section 2.3
 */

import { useSync } from '@/lib/offline';
import {
  Check,
  CloudOff,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface SyncStatusPillProps {
  /** Optional className for additional styling */
  className?: string;
  /** Whether to show the pending count badge */
  showCount?: boolean;
}

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

const STATUS_CONFIG = {
  synced: {
    icon: Check,
    label: 'Synced',
    className: 'status-pill--success',
    animate: false,
  },
  pending: {
    icon: RefreshCw,
    label: 'Pending',
    className: 'status-pill--warning',
    animate: false,
  },
  syncing: {
    icon: Loader2,
    label: 'Syncing',
    className: 'status-pill--warning',
    animate: true,
  },
  offline: {
    icon: CloudOff,
    label: 'Offline',
    className: 'status-pill--offline',
    animate: false,
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    className: 'status-pill--error',
    animate: false,
  },
} as const;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SyncStatusPill — Global sync status indicator
 *
 * Shows the current sync state with appropriate icon and color.
 * Clickable when in error state to retry sync.
 *
 * @example
 * ```tsx
 * // In header
 * <SyncStatusPill showCount />
 *
 * // Minimal version
 * <SyncStatusPill />
 * ```
 */
export function SyncStatusPill({
  className = '',
  showCount = true,
}: SyncStatusPillProps) {
  const { status, pendingCount, triggerSync } = useSync();

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  // Determine display label
  const displayLabel =
    status === 'pending' && pendingCount > 0 && showCount
      ? `${pendingCount} pending`
      : status === 'syncing' && pendingCount > 0 && showCount
        ? `Syncing ${pendingCount}`
        : config.label;

  // Handle click for error state retry
  const handleClick = async () => {
    if (status === 'error') {
      await triggerSync();
    }
  };

  const isClickable = status === 'error';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isClickable}
      className={`
        sync-status-pill
        status-pill
        ${config.className}
        ${isClickable ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}
        ${className}
      `}
      aria-label={`Sync status: ${displayLabel}`}
      title={isClickable ? 'Click to retry sync' : undefined}
    >
      <Icon
        className={`h-3.5 w-3.5 ${config.animate ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </button>
  );
}
