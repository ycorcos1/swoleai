'use client';

/**
 * SwoleAI Active Session Hook (Task 4.2)
 *
 * React hook for managing active workout session state with IndexedDB persistence.
 * Automatically restores session state on app reload.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  type ActiveSession,
  type ActiveSessionExercise,
  type ActiveSessionSet,
} from './db';
import {
  saveActiveSession,
  getActiveSession,
  clearActiveSession,
  addExerciseToSession,
  removeExerciseFromSession,
  updateExerciseInSession,
  reorderExercisesInSession,
  addSetToExercise,
  updateSetInExercise,
  removeSetFromExercise,
  // Undo stack functions (Task 5.5)
  pushUndoAction,
  hasUndoActions,
  executeUndo,
  clearUndoStack,
} from './session';
import { enqueueMutation } from './mutations';
import { syncService } from './sync';
import type { UndoAction } from './db';

// =============================================================================
// TYPES
// =============================================================================

export interface UseActiveSessionReturn {
  /** Current active session (undefined if no session, null if loading) */
  session: ActiveSession | undefined | null;
  /** Whether the session is being loaded from IndexedDB */
  isLoading: boolean;
  /** Error if session operations failed */
  error: Error | null;
  /** Start a new workout session */
  startSession: (options: StartSessionOptions) => Promise<void>;
  /** End the current workout session */
  endSession: () => Promise<void>;
  /** Add an exercise to the current session */
  addExercise: (exercise: Omit<ActiveSessionExercise, 'orderIndex' | 'sets'>) => Promise<void>;
  /** Remove an exercise from the current session */
  removeExercise: (localId: string) => Promise<void>;
  /** Update an exercise in the current session */
  updateExercise: (
    localId: string,
    updates: Partial<Omit<ActiveSessionExercise, 'localId'>>
  ) => Promise<void>;
  /** Log a set for an exercise */
  logSet: (exerciseLocalId: string, set: Omit<ActiveSessionSet, 'setIndex' | 'loggedAt'>) => Promise<void>;
  /** Update a logged set */
  updateSet: (
    exerciseLocalId: string,
    setLocalId: string,
    updates: Partial<Omit<ActiveSessionSet, 'localId'>>
  ) => Promise<void>;
  /** Remove a logged set */
  removeSet: (exerciseLocalId: string, setLocalId: string) => Promise<void>;
  /** Update session notes or constraint flags */
  updateSessionMeta: (updates: {
    notes?: string;
    title?: string;
    constraintFlags?: ActiveSession['constraintFlags'];
  }) => Promise<void>;
  // =============================================================================
  // REORDER SUPPORT (Task 5.9)
  // =============================================================================
  /** Reorder exercises by providing new array of localIds in desired order */
  reorderExercises: (orderedLocalIds: string[]) => Promise<void>;
  // =============================================================================
  // UNDO SUPPORT (Task 5.5)
  // =============================================================================
  /** Whether there are actions that can be undone */
  canUndo: boolean;
  /** Undo the last logged set action */
  undoLastAction: () => Promise<UndoAction | undefined>;
}

export interface StartSessionOptions {
  /** Optional split ID the session is based on */
  splitId?: string;
  /** Optional template ID the session is based on */
  templateId?: string;
  /** Session title */
  title?: string;
  /** Initial exercises to add */
  initialExercises?: Omit<ActiveSessionExercise, 'orderIndex' | 'sets'>[];
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for managing active workout session with IndexedDB persistence
 *
 * Features:
 * - Automatically restores session state on mount (app reload)
 * - Provides reactive updates via Dexie's useLiveQuery
 * - Handles all session CRUD operations
 *
 * @returns Object with session state and mutation functions
 */
export function useActiveSession(): UseActiveSessionReturn {
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  // Track whether undo actions are available (Task 5.5)
  const [canUndo, setCanUndo] = useState(false);

  // Use Dexie's live query for reactive updates
  // This will automatically update when the session changes in IndexedDB
  const session = useLiveQuery(
    () => db.activeSession.get('current'),
    [],
    null // Initial value while loading
  );

  const isLoading = session === null;

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // =============================================================================
  // SESSION OPERATIONS
  // =============================================================================

  const startSession = useCallback(
    async (options: StartSessionOptions): Promise<void> => {
      try {
        setError(null);

        // Check if there's already an active session
        const existing = await getActiveSession();
        if (existing) {
          throw new Error('A workout session is already active');
        }

        const initialExercises: ActiveSessionExercise[] = (options.initialExercises || []).map(
          (e, idx) => ({
            ...e,
            orderIndex: idx,
            sets: [],
          })
        );

        const startedAt = new Date();

        await saveActiveSession({
          startedAt,
          splitId: options.splitId,
          templateId: options.templateId,
          title: options.title,
          exercises: initialExercises,
        });

        // Enqueue mutation for server sync
        await enqueueMutation('START_SESSION', {
          splitId: options.splitId,
          templateId: options.templateId,
          title: options.title,
          startedAt: startedAt.toISOString(),
        });
        await syncService.notifyMutationAdded();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to start session');
        if (mountedRef.current) {
          setError(error);
        }
        throw error;
      }
    },
    []
  );

  const endSession = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      // Get the session before clearing to get server ID
      const current = await getActiveSession();
      const serverSessionId = current?.serverSessionId;

      await clearActiveSession();
      
      // Clear undo stack when session ends (Task 5.5)
      clearUndoStack();
      if (mountedRef.current) {
        setCanUndo(false);
      }

      // Enqueue mutation for server sync (only if we have a server session ID)
      if (serverSessionId) {
        await enqueueMutation('END_SESSION', {
          sessionId: serverSessionId,
          status: 'COMPLETED',
        });
        await syncService.notifyMutationAdded();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to end session');
      if (mountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  // =============================================================================
  // EXERCISE OPERATIONS
  // =============================================================================

  const addExercise = useCallback(
    async (exercise: Omit<ActiveSessionExercise, 'orderIndex' | 'sets'>): Promise<void> => {
      try {
        setError(null);
        const current = await getActiveSession();
        const orderIndex = current?.exercises.length ?? 0;

        await addExerciseToSession({
          ...exercise,
          orderIndex,
          sets: [],
        });

        // Enqueue mutation for server sync (only if we have a server session ID)
        if (current?.serverSessionId) {
          await enqueueMutation('ADD_EXERCISE', {
            sessionId: current.serverSessionId,
            exerciseId: exercise.exerciseId,
            localId: exercise.localId,
          });
          await syncService.notifyMutationAdded();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add exercise');
        if (mountedRef.current) {
          setError(error);
        }
        throw error;
      }
    },
    []
  );

  const removeExercise = useCallback(async (localId: string): Promise<void> => {
    try {
      setError(null);
      const current = await getActiveSession();

      await removeExerciseFromSession(localId);

      // Enqueue mutation for server sync (only if we have a server session ID)
      if (current?.serverSessionId) {
        await enqueueMutation('REMOVE_EXERCISE', {
          sessionId: current.serverSessionId,
          localId,
        });
        await syncService.notifyMutationAdded();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove exercise');
      if (mountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  const updateExercise = useCallback(
    async (
      localId: string,
      updates: Partial<Omit<ActiveSessionExercise, 'localId'>>
    ): Promise<void> => {
      try {
        setError(null);
        await updateExerciseInSession(localId, updates);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update exercise');
        if (mountedRef.current) {
          setError(error);
        }
        throw error;
      }
    },
    []
  );

  // =============================================================================
  // EXERCISE REORDER (Task 5.9)
  // =============================================================================

  const reorderExercises = useCallback(
    async (orderedLocalIds: string[]): Promise<void> => {
      try {
        setError(null);
        await reorderExercisesInSession(orderedLocalIds);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to reorder exercises');
        if (mountedRef.current) {
          setError(error);
        }
        throw error;
      }
    },
    []
  );

  // =============================================================================
  // SET OPERATIONS
  // =============================================================================

  const logSet = useCallback(
    async (
      exerciseLocalId: string,
      set: Omit<ActiveSessionSet, 'setIndex' | 'loggedAt'>
    ): Promise<void> => {
      try {
        setError(null);
        const current = await getActiveSession();
        const exercise = current?.exercises.find((e) => e.localId === exerciseLocalId);
        const setIndex = exercise?.sets.length ?? 0;
        const loggedAt = new Date();

        await addSetToExercise(exerciseLocalId, {
          ...set,
          setIndex,
          loggedAt,
        });

        // Push undo action (Task 5.5)
        pushUndoAction({
          type: 'LOG_SET',
          exerciseLocalId,
          setLocalId: set.localId,
        });
        if (mountedRef.current) {
          setCanUndo(hasUndoActions());
        }

        // Enqueue mutation for server sync (only if we have a server session ID)
        if (current?.serverSessionId && exercise) {
          await enqueueMutation('LOG_SET', {
            sessionId: current.serverSessionId,
            exerciseId: exercise.exerciseId,
            localSetId: set.localId,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe,
            flags: set.flags,
            notes: set.notes,
          });
          await syncService.notifyMutationAdded();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to log set');
        if (mountedRef.current) {
          setError(error);
        }
        throw error;
      }
    },
    []
  );

  const updateSet = useCallback(
    async (
      exerciseLocalId: string,
      setLocalId: string,
      updates: Partial<Omit<ActiveSessionSet, 'localId'>>
    ): Promise<void> => {
      try {
        setError(null);
        const current = await getActiveSession();

        // Find the current set to save previous values for undo (Task 5.5)
        const exercise = current?.exercises.find((e) => e.localId === exerciseLocalId);
        const setToUpdate = exercise?.sets.find((s) => s.localId === setLocalId);
        
        if (setToUpdate) {
          // Push undo action with previous values before updating
          pushUndoAction({
            type: 'UPDATE_SET',
            exerciseLocalId,
            setLocalId,
            previousValues: {
              weight: setToUpdate.weight,
              reps: setToUpdate.reps,
              rpe: setToUpdate.rpe,
              flags: setToUpdate.flags,
              notes: setToUpdate.notes,
            },
          });
          if (mountedRef.current) {
            setCanUndo(hasUndoActions());
          }
        }

        await updateSetInExercise(exerciseLocalId, setLocalId, updates);

        // Enqueue mutation for server sync (only if we have a server session ID)
        if (current?.serverSessionId) {
          await enqueueMutation('UPDATE_SET', {
            sessionId: current.serverSessionId,
            localSetId: setLocalId,
            ...updates,
          });
          await syncService.notifyMutationAdded();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update set');
        if (mountedRef.current) {
          setError(error);
        }
        throw error;
      }
    },
    []
  );

  const removeSet = useCallback(
    async (exerciseLocalId: string, setLocalId: string): Promise<void> => {
      try {
        setError(null);
        const current = await getActiveSession();

        // Find the set to save for undo before deleting (Task 5.5)
        const exercise = current?.exercises.find((e) => e.localId === exerciseLocalId);
        const setToDelete = exercise?.sets.find((s) => s.localId === setLocalId);
        
        if (setToDelete) {
          // Push undo action with the full deleted set data
          pushUndoAction({
            type: 'DELETE_SET',
            exerciseLocalId,
            deletedSet: { ...setToDelete },
          });
          if (mountedRef.current) {
            setCanUndo(hasUndoActions());
          }
        }

        await removeSetFromExercise(exerciseLocalId, setLocalId);

        // Enqueue mutation for server sync (only if we have a server session ID)
        if (current?.serverSessionId) {
          await enqueueMutation('DELETE_SET', {
            sessionId: current.serverSessionId,
            localSetId: setLocalId,
          });
          await syncService.notifyMutationAdded();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to remove set');
        if (mountedRef.current) {
          setError(error);
        }
        throw error;
      }
    },
    []
  );

  // =============================================================================
  // SESSION META OPERATIONS
  // =============================================================================

  const updateSessionMeta = useCallback(
    async (updates: {
      notes?: string;
      title?: string;
      constraintFlags?: ActiveSession['constraintFlags'];
    }): Promise<void> => {
      try {
        setError(null);
        const current = await getActiveSession();

        if (!current) {
          throw new Error('No active session to update');
        }

        await db.activeSession.update('current', {
          ...updates,
          updatedAt: new Date(),
        });

        // Enqueue mutation for server sync (only if we have a server session ID)
        if (current.serverSessionId) {
          await enqueueMutation('UPDATE_SESSION_NOTES', {
            sessionId: current.serverSessionId,
            ...updates,
          });
          await syncService.notifyMutationAdded();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update session');
        if (mountedRef.current) {
          setError(error);
        }
        throw error;
      }
    },
    []
  );

  // =============================================================================
  // UNDO OPERATIONS (Task 5.5)
  // =============================================================================

  /**
   * Undo the last logged set action
   * 
   * Supports undoing:
   * - LOG_SET: Removes the set that was logged
   * - UPDATE_SET: Restores previous values
   * - DELETE_SET: Re-adds the deleted set
   * 
   * @returns The undone action, or undefined if nothing to undo
   */
  const undoLastAction = useCallback(async (): Promise<UndoAction | undefined> => {
    try {
      setError(null);
      
      const undoneAction = await executeUndo();
      
      // Update canUndo state after the undo
      if (mountedRef.current) {
        setCanUndo(hasUndoActions());
      }
      
      return undoneAction;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to undo');
      if (mountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, []);

  return {
    session,
    isLoading,
    error,
    startSession,
    endSession,
    addExercise,
    removeExercise,
    updateExercise,
    // Reorder support (Task 5.9)
    reorderExercises,
    logSet,
    updateSet,
    removeSet,
    updateSessionMeta,
    // Undo support (Task 5.5)
    canUndo,
    undoLastAction,
  };
}
