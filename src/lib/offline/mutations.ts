/**
 * SwoleAI Mutation Queue (Task 4.3)
 *
 * Functions for managing pending mutations in IndexedDB.
 * Mutations are queued locally and synced to the server when online.
 */

import { db, type PendingMutation, type MutationType } from './db';

// =============================================================================
// MUTATION QUEUE OPERATIONS
// =============================================================================

/**
 * Add a mutation to the pending queue
 *
 * @param type - The type of mutation
 * @param payload - The mutation payload data
 * @returns Promise resolving to the mutation ID
 */
export async function enqueueMutation(
  type: MutationType,
  payload: Record<string, unknown>
): Promise<number> {
  const mutation: Omit<PendingMutation, 'id'> = {
    type,
    payload,
    createdAt: new Date(),
    retryCount: 0,
    status: 'pending',
  };

  const id = await db.pendingMutations.add(mutation);
  return id as number;
}

/**
 * Get all pending mutations in order (oldest first)
 *
 * @returns Promise resolving to array of pending mutations
 */
export async function getPendingMutations(): Promise<PendingMutation[]> {
  return db.pendingMutations
    .where('status')
    .equals('pending')
    .sortBy('createdAt');
}

/**
 * Get count of pending mutations
 *
 * @returns Promise resolving to the count
 */
export async function getPendingMutationCount(): Promise<number> {
  return db.pendingMutations.where('status').equals('pending').count();
}

/**
 * Get all failed mutations
 *
 * @returns Promise resolving to array of failed mutations
 */
export async function getFailedMutations(): Promise<PendingMutation[]> {
  return db.pendingMutations
    .where('status')
    .equals('failed')
    .sortBy('createdAt');
}

/**
 * Mark a mutation as processing (being synced)
 *
 * @param id - The mutation ID
 */
export async function markMutationProcessing(id: number): Promise<void> {
  await db.pendingMutations.update(id, { status: 'processing' });
}

/**
 * Mark a mutation as failed
 *
 * @param id - The mutation ID
 * @param error - The error message
 */
export async function markMutationFailed(
  id: number,
  error: string
): Promise<void> {
  const mutation = await db.pendingMutations.get(id);
  if (!mutation) return;

  await db.pendingMutations.update(id, {
    status: 'failed',
    lastError: error,
    retryCount: mutation.retryCount + 1,
  });
}

/**
 * Remove a successfully synced mutation from the queue
 *
 * @param id - The mutation ID
 */
export async function removeMutation(id: number): Promise<void> {
  await db.pendingMutations.delete(id);
}

/**
 * Retry a failed mutation (reset to pending)
 *
 * @param id - The mutation ID
 */
export async function retryMutation(id: number): Promise<void> {
  await db.pendingMutations.update(id, {
    status: 'pending',
    lastError: undefined,
  });
}

/**
 * Clear all mutations (use with caution)
 * Typically used when user logs out or resets local data
 */
export async function clearAllMutations(): Promise<void> {
  await db.pendingMutations.clear();
}

/**
 * Reset any 'processing' mutations back to 'pending'
 * Called on app startup in case app crashed during sync
 */
export async function resetProcessingMutations(): Promise<void> {
  await db.pendingMutations
    .where('status')
    .equals('processing')
    .modify({ status: 'pending' });
}
