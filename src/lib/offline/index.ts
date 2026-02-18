/**
 * SwoleAI Offline Module
 *
 * Exports the Dexie database, types, and session management utilities
 * for offline-first workout logging
 */

// Database exports
export { db, SwoleAIDatabase } from './db';
export type {
  ActiveSession,
  ActiveSessionExercise,
  ActiveSessionSet,
  SetEvent,
  PendingMutation,
  MutationType,
  // Undo types (Task 5.5)
  UndoActionType,
  UndoLogSetPayload,
  UndoUpdateSetPayload,
  UndoDeleteSetPayload,
  UndoActionPayload,
  UndoAction,
} from './db';

// Session persistence functions (Task 4.2)
export {
  saveActiveSession,
  getActiveSession,
  hasActiveSession,
  clearActiveSession,
  updateActiveSession,
  addExerciseToSession,
  removeExerciseFromSession,
  updateExerciseInSession,
  addSetToExercise,
  updateSetInExercise,
  removeSetFromExercise,
  // Undo stack functions (Task 5.5)
  pushUndoAction,
  popUndoAction,
  peekUndoAction,
  hasUndoActions,
  getUndoStackLength,
  clearUndoStack,
  executeUndo,
} from './session';

// Session React hook (Task 4.2)
export { useActiveSession } from './useActiveSession';
export type { UseActiveSessionReturn, StartSessionOptions } from './useActiveSession';

// Session context provider (Task 4.2)
export { ActiveSessionProvider, useActiveSessionContext } from './ActiveSessionProvider';

// Mutation queue functions (Task 4.3)
export {
  enqueueMutation,
  getPendingMutations,
  getPendingMutationCount,
  getFailedMutations,
  markMutationProcessing,
  markMutationFailed,
  removeMutation,
  retryMutation,
  clearAllMutations,
  resetProcessingMutations,
} from './mutations';

// Sync service and hook (Task 4.3)
export { syncService } from './sync';
export type { SyncStatus, SyncState } from './sync';
export { useSync } from './useSync';
export type { UseSyncReturn } from './useSync';
