/**
 * SwoleAI Sync Service (Task 4.3)
 *
 * Background sync service that flushes pending mutations to the server when online.
 * Handles network detection, retry logic, and mutation processing.
 */

import { type PendingMutation, type MutationType } from './db';
import {
  getPendingMutations,
  markMutationProcessing,
  markMutationFailed,
  removeMutation,
  resetProcessingMutations,
} from './mutations';

// =============================================================================
// TYPES
// =============================================================================

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: Date | null;
  lastError: string | null;
  isOnline: boolean;
}

type SyncListener = (state: SyncState) => void;

// =============================================================================
// MUTATION HANDLERS
// =============================================================================

/**
 * API endpoint mapping for each mutation type
 */
const MUTATION_ENDPOINTS: Record<MutationType, string> = {
  START_SESSION: '/api/workouts/start',
  END_SESSION: '/api/workouts/{sessionId}/end',
  LOG_SET: '/api/workouts/{sessionId}/log-set',
  UPDATE_SET: '/api/workouts/{sessionId}/sets/{setId}',
  DELETE_SET: '/api/workouts/{sessionId}/sets/{setId}',
  ADD_EXERCISE: '/api/workouts/{sessionId}/exercises',
  REMOVE_EXERCISE: '/api/workouts/{sessionId}/exercises/{exerciseId}',
  REORDER_EXERCISES: '/api/workouts/{sessionId}/exercises/reorder',
  UPDATE_SESSION_NOTES: '/api/workouts/{sessionId}',
};

/**
 * HTTP method mapping for each mutation type
 */
const MUTATION_METHODS: Record<MutationType, string> = {
  START_SESSION: 'POST',
  END_SESSION: 'POST',
  LOG_SET: 'POST',
  UPDATE_SET: 'PATCH',
  DELETE_SET: 'DELETE',
  ADD_EXERCISE: 'POST',
  REMOVE_EXERCISE: 'DELETE',
  REORDER_EXERCISES: 'POST',
  UPDATE_SESSION_NOTES: 'PATCH',
};

/**
 * Build the URL for a mutation
 */
function buildMutationUrl(
  type: MutationType,
  payload: Record<string, unknown>
): string {
  let url = MUTATION_ENDPOINTS[type];

  // Replace path parameters from payload
  if (payload.sessionId) {
    url = url.replace('{sessionId}', payload.sessionId as string);
  }
  if (payload.setId) {
    url = url.replace('{setId}', payload.setId as string);
  }
  if (payload.exerciseId && url.includes('{exerciseId}')) {
    url = url.replace('{exerciseId}', payload.exerciseId as string);
  }

  return url;
}

/**
 * Execute a single mutation against the server
 *
 * @param mutation - The mutation to execute
 * @returns Promise resolving to true if successful
 * @throws Error if the request fails
 */
async function executeMutation(mutation: PendingMutation): Promise<boolean> {
  const url = buildMutationUrl(mutation.type, mutation.payload);
  const method = MUTATION_METHODS[mutation.type];

  // Build request body (exclude path params from body)
  const body = { ...mutation.payload };
  delete body.sessionId;
  delete body.setId;
  delete body.exerciseId;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: method !== 'DELETE' ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.message || `HTTP ${response.status}`
    );
  }

  return true;
}

// =============================================================================
// SYNC SERVICE CLASS
// =============================================================================

/**
 * Singleton sync service that manages background syncing
 */
class SyncService {
  private state: SyncState = {
    status: 'synced',
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };

  private listeners: Set<SyncListener> = new Set();
  private syncInProgress = false;
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  // Configurable sync parameters
  private readonly SYNC_INTERVAL_MS = 5000; // Check for pending mutations every 5s
  private readonly MAX_RETRIES = 3;

  /**
   * Initialize the sync service
   * Sets up online/offline listeners and starts the sync loop
   */
  initialize(): void {
    if (this.initialized || typeof window === 'undefined') return;

    // Reset any mutations stuck in 'processing' state from previous session
    resetProcessingMutations().catch(console.error);

    // Set up online/offline listeners
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Set initial online state
    this.state.isOnline = navigator.onLine;

    // Start sync loop
    this.scheduleSyncCheck();

    this.initialized = true;
  }

  /**
   * Cleanup the sync service
   */
  destroy(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    this.initialized = false;
  }

  /**
   * Subscribe to sync state changes
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Immediately call listener with current state
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Trigger an immediate sync attempt
   */
  async triggerSync(): Promise<void> {
    if (this.syncInProgress) return;
    await this.processPendingMutations();
  }

  /**
   * Notify when a new mutation is added
   * This allows immediate sync if online
   */
  async notifyMutationAdded(): Promise<void> {
    await this.updatePendingCount();
    if (this.state.isOnline && !this.syncInProgress) {
      // Schedule immediate sync
      this.scheduleSyncCheck(100);
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private handleOnline = (): void => {
    this.updateState({ isOnline: true, status: 'pending' });
    // Trigger immediate sync when coming online
    this.scheduleSyncCheck(100);
  };

  private handleOffline = (): void => {
    this.updateState({ isOnline: false, status: 'offline' });
  };

  private updateState(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener(this.state));
  }

  private async updatePendingCount(): Promise<void> {
    const mutations = await getPendingMutations();
    const pendingCount = mutations.length;

    // Determine status based on pending count and online state
    let status: SyncStatus = this.state.status;
    if (!this.state.isOnline) {
      status = 'offline';
    } else if (pendingCount === 0 && !this.syncInProgress) {
      status = 'synced';
    } else if (pendingCount > 0 && !this.syncInProgress) {
      status = 'pending';
    }

    this.updateState({ pendingCount, status });
  }

  private scheduleSyncCheck(delayMs?: number): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(() => {
      this.processPendingMutations().finally(() => {
        // Schedule next check
        this.scheduleSyncCheck();
      });
    }, delayMs ?? this.SYNC_INTERVAL_MS);
  }

  private async processPendingMutations(): Promise<void> {
    // Don't sync if offline or already syncing
    if (!this.state.isOnline || this.syncInProgress) return;

    const mutations = await getPendingMutations();
    if (mutations.length === 0) {
      this.updateState({ status: 'synced', pendingCount: 0 });
      return;
    }

    this.syncInProgress = true;
    this.updateState({ status: 'syncing' });

    try {
      // Process mutations in order
      for (const mutation of mutations) {
        // Check if still online before each mutation
        if (!navigator.onLine) {
          this.updateState({ isOnline: false, status: 'offline' });
          break;
        }

        try {
          // Mark as processing
          await markMutationProcessing(mutation.id!);

          // Execute the mutation
          await executeMutation(mutation);

          // Success - remove from queue
          await removeMutation(mutation.id!);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error';

          // Check if max retries exceeded
          if (mutation.retryCount >= this.MAX_RETRIES) {
            await markMutationFailed(mutation.id!, errorMessage);
            this.updateState({ lastError: errorMessage, status: 'error' });
          } else {
            // Mark as failed but allow retry
            await markMutationFailed(mutation.id!, errorMessage);
          }

          // For network errors, stop processing and wait
          if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
            break;
          }
        }
      }

      // Update state after processing
      await this.updatePendingCount();
      this.updateState({ lastSyncAt: new Date() });
    } finally {
      this.syncInProgress = false;
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton sync service instance
 * Initialize once when the app loads
 */
export const syncService = new SyncService();
