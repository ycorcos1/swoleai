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
  addSetToExercise,
  updateSetInExercise,
  removeSetFromExercise,
} from './session';
import { enqueueMutation } from './mutations';
import { syncService } from './sync';

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

  return {
    session,
    isLoading,
    error,
    startSession,
    endSession,
    addExercise,
    removeExercise,
    updateExercise,
    logSet,
    updateSet,
    removeSet,
    updateSessionMeta,
  };
}
