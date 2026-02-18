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
} from './session';

// Session React hook (Task 4.2)
export { useActiveSession } from './useActiveSession';
export type { UseActiveSessionReturn, StartSessionOptions } from './useActiveSession';

// Session context provider (Task 4.2)
export { ActiveSessionProvider, useActiveSessionContext } from './ActiveSessionProvider';
