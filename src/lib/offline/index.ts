/**
 * SwoleAI Offline Module
 *
 * Exports the Dexie database and types for offline-first workout logging
 */

export { db, SwoleAIDatabase } from './db';
export type {
  ActiveSession,
  ActiveSessionExercise,
  ActiveSessionSet,
  SetEvent,
  PendingMutation,
  MutationType,
} from './db';
