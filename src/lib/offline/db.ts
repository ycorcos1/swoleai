/**
 * SwoleAI Offline Database (Dexie IndexedDB)
 *
 * Task 4.1 — Add IndexedDB schema (Dexie)
 *
 * Tables:
 * - activeSession: Stores the currently active workout session state
 * - setEvents: Append-only log of set events during a workout
 * - pendingMutations: Queue of mutations waiting to sync to server
 *
 * This local-first approach enables:
 * - Instant UI updates during workouts (no network latency)
 * - Workout continuation after app reload/crash
 * - Offline support with background sync when network returns
 */

import Dexie, { type EntityTable } from 'dexie';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Active session state stored locally
 * Mirrors key fields from server's WorkoutSession for offline continuity
 */
export interface ActiveSession {
  /** Local ID - always 'current' since only one active session at a time */
  id: 'current';
  /** Server session ID (if session has been synced to server) */
  serverSessionId?: string;
  /** Timestamp when session was started */
  startedAt: Date;
  /** Optional split ID the session is based on */
  splitId?: string;
  /** Optional template ID the session is based on */
  templateId?: string;
  /** Session title (auto-generated or user-set) */
  title?: string;
  /** Session notes */
  notes?: string;
  /** Constraint flags (pain, equipment crowded, low energy) */
  constraintFlags?: {
    pain?: string[];
    equipmentCrowded?: boolean;
    lowEnergy?: boolean;
  };
  /** Current exercises in the session with their state */
  exercises: ActiveSessionExercise[];
  /** Last updated timestamp for conflict detection */
  updatedAt: Date;
}

/**
 * Exercise state within an active session
 */
export interface ActiveSessionExercise {
  /** Local exercise entry ID (UUID) */
  localId: string;
  /** Server exercise ID from exercises table */
  exerciseId: string;
  /** Exercise name (cached for offline display) */
  exerciseName: string;
  /** Order within the session */
  orderIndex: number;
  /** Notes for this exercise */
  notes?: string;
  /** Sets logged for this exercise */
  sets: ActiveSessionSet[];
}

/**
 * Set state within an active session exercise
 */
export interface ActiveSessionSet {
  /** Local set ID (UUID) */
  localId: string;
  /** Set index within the exercise */
  setIndex: number;
  /** Weight used */
  weight: number;
  /** Reps performed */
  reps: number;
  /** RPE (1-10) */
  rpe?: number;
  /** Set flags */
  flags?: {
    warmup?: boolean;
    backoff?: boolean;
    dropset?: boolean;
    failure?: boolean;
  };
  /** Notes for this set */
  notes?: string;
  /** Timestamp when set was logged */
  loggedAt: Date;
}

/**
 * Set event (append-only log entry)
 * Used for event sourcing - can reconstruct session state from events
 */
export interface SetEvent {
  /** Auto-incremented local ID */
  id?: number;
  /** Server session ID (if known) */
  serverSessionId?: string;
  /** Local exercise ID this event belongs to */
  localExerciseId: string;
  /** Event type */
  eventType: 'SET_LOGGED' | 'SET_UPDATED' | 'SET_DELETED';
  /** Set data at time of event */
  payload: {
    localSetId: string;
    setIndex: number;
    weight: number;
    reps: number;
    rpe?: number;
    flags?: {
      warmup?: boolean;
      backoff?: boolean;
      dropset?: boolean;
      failure?: boolean;
    };
    notes?: string;
  };
  /** Timestamp of event */
  timestamp: Date;
  /** Whether this event has been synced to server */
  synced: boolean;
}

/**
 * Pending mutation types
 */
export type MutationType =
  | 'START_SESSION'
  | 'END_SESSION'
  | 'LOG_SET'
  | 'UPDATE_SET'
  | 'DELETE_SET'
  | 'ADD_EXERCISE'
  | 'REMOVE_EXERCISE'
  | 'REORDER_EXERCISES'
  | 'UPDATE_SESSION_NOTES';

// =============================================================================
// UNDO STACK TYPES (Task 5.5)
// =============================================================================

/**
 * Undo action types - actions that can be undone
 */
export type UndoActionType = 'LOG_SET' | 'UPDATE_SET' | 'DELETE_SET';

/**
 * Undo action payload for LOG_SET - to undo, we need to remove the set
 */
export interface UndoLogSetPayload {
  type: 'LOG_SET';
  exerciseLocalId: string;
  setLocalId: string;
}

/**
 * Undo action payload for UPDATE_SET - to undo, we restore previous values
 */
export interface UndoUpdateSetPayload {
  type: 'UPDATE_SET';
  exerciseLocalId: string;
  setLocalId: string;
  previousValues: {
    weight: number;
    reps: number;
    rpe?: number;
    flags?: ActiveSessionSet['flags'];
    notes?: string;
  };
}

/**
 * Undo action payload for DELETE_SET - to undo, we restore the deleted set
 */
export interface UndoDeleteSetPayload {
  type: 'DELETE_SET';
  exerciseLocalId: string;
  deletedSet: ActiveSessionSet;
}

/**
 * Union type for all undo payloads
 */
export type UndoActionPayload =
  | UndoLogSetPayload
  | UndoUpdateSetPayload
  | UndoDeleteSetPayload;

/**
 * Undo action stored in the undo stack
 */
export interface UndoAction {
  /** Unique ID for the action */
  id: string;
  /** Timestamp when action was performed */
  timestamp: Date;
  /** The undo payload containing data needed to reverse the action */
  payload: UndoActionPayload;
}

// =============================================================================
// COMPLETED WORKOUT SUMMARY (Task 5.10)
// =============================================================================

/**
 * Snapshot of a completed workout session, stored after ending a workout.
 * Enables the summary screen to display stats after the active session is cleared.
 * Only the most recent completed workout is kept (id = 'last').
 */
export interface CompletedWorkoutSummary {
  /** Fixed key — only the most recent completed workout is stored */
  id: 'last';
  /** Session title */
  title?: string;
  /** When the workout started */
  startedAt: Date;
  /** When the workout ended */
  endedAt: Date;
  /** Duration in seconds */
  durationSeconds: number;
  /** All exercises with their sets at time of completion */
  exercises: ActiveSessionExercise[];
  /** Pre-computed stats */
  totalSets: number;
  /** Total volume = sum of (weight × reps) for all sets */
  totalVolume: number;
}

/**
 * Pending mutation for sync queue
 * Operations are processed in order when online
 */
export interface PendingMutation {
  /** Auto-incremented local ID */
  id?: number;
  /** Mutation type */
  type: MutationType;
  /** Mutation payload (varies by type) */
  payload: Record<string, unknown>;
  /** Timestamp when mutation was created */
  createdAt: Date;
  /** Number of sync attempts */
  retryCount: number;
  /** Last error message if sync failed */
  lastError?: string;
  /** Status of the mutation */
  status: 'pending' | 'processing' | 'failed';
}

// =============================================================================
// DATABASE CLASS
// =============================================================================

/**
 * SwoleAI Dexie Database
 * Extends Dexie with typed tables for offline workout logging
 */
export class SwoleAIDatabase extends Dexie {
  /**
   * Active session table
   * Primary key: id (always 'current')
   */
  activeSession!: EntityTable<ActiveSession, 'id'>;

  /**
   * Set events table (append-only log)
   * Primary key: id (auto-incremented)
   * Indexed: serverSessionId, synced, timestamp
   */
  setEvents!: EntityTable<SetEvent, 'id'>;

  /**
   * Pending mutations queue
   * Primary key: id (auto-incremented)
   * Indexed: status, createdAt
   */
  pendingMutations!: EntityTable<PendingMutation, 'id'>;

  /**
   * Last completed workout summary (Task 5.10)
   * Primary key: id (always 'last' — single record)
   */
  completedWorkout!: EntityTable<CompletedWorkoutSummary, 'id'>;

  constructor() {
    super('SwoleAI');

    // Schema version 1: Initial offline store
    this.version(1).stores({
      // activeSession: only one record with id='current'
      activeSession: 'id',
      // setEvents: auto-increment id, indexed by serverSessionId and synced status
      setEvents: '++id, serverSessionId, synced, timestamp, localExerciseId',
      // pendingMutations: auto-increment id, indexed by status and createdAt for ordered processing
      pendingMutations: '++id, status, createdAt, type',
    });

    // Schema version 2: Add completedWorkout table (Task 5.10)
    this.version(2).stores({
      activeSession: 'id',
      setEvents: '++id, serverSessionId, synced, timestamp, localExerciseId',
      pendingMutations: '++id, status, createdAt, type',
      completedWorkout: 'id',
    });
  }
}

// =============================================================================
// DATABASE INSTANCE
// =============================================================================

/**
 * Singleton database instance
 * Use this throughout the app for all IndexedDB operations
 */
export const db = new SwoleAIDatabase();
