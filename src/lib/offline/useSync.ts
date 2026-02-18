'use client';

/**
 * SwoleAI Sync Hook (Task 4.3)
 *
 * React hook for managing sync state and triggering sync operations.
 * Provides reactive updates when sync status changes.
 */

import { useState, useEffect, useCallback } from 'react';
import { syncService, type SyncState, type SyncStatus } from './sync';

// =============================================================================
// TYPES
// =============================================================================

export interface UseSyncReturn {
  /** Current sync status */
  status: SyncStatus;
  /** Number of pending mutations */
  pendingCount: number;
  /** Whether the device is online */
  isOnline: boolean;
  /** Last successful sync timestamp */
  lastSyncAt: Date | null;
  /** Last error message if any */
  lastError: string | null;
  /** Full sync state object */
  syncState: SyncState;
  /** Trigger an immediate sync attempt */
  triggerSync: () => Promise<void>;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for accessing sync state and triggering sync operations
 *
 * @returns Object with sync state and control functions
 *
 * @example
 * ```tsx
 * function SyncStatusPill() {
 *   const { status, pendingCount, isOnline, triggerSync } = useSync();
 *
 *   return (
 *     <button onClick={triggerSync}>
 *       {status === 'synced' && '✓ Synced'}
 *       {status === 'pending' && `↻ ${pendingCount} pending`}
 *       {status === 'syncing' && '↻ Syncing...'}
 *       {status === 'offline' && '⚠ Offline'}
 *       {status === 'error' && '✗ Sync Error'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSync(): UseSyncReturn {
  const [syncState, setSyncState] = useState<SyncState>(() =>
    syncService.getState()
  );

  // Initialize sync service and subscribe to updates
  useEffect(() => {
    // Initialize the sync service (idempotent)
    syncService.initialize();

    // Subscribe to state changes
    const unsubscribe = syncService.subscribe((state) => {
      setSyncState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const triggerSync = useCallback(async () => {
    await syncService.triggerSync();
  }, []);

  return {
    status: syncState.status,
    pendingCount: syncState.pendingCount,
    isOnline: syncState.isOnline,
    lastSyncAt: syncState.lastSyncAt,
    lastError: syncState.lastError,
    syncState,
    triggerSync,
  };
}
