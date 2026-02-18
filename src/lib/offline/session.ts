/**
 * SwoleAI Session Persistence (Task 4.2)
 *
 * Functions for saving and restoring active workout session state to IndexedDB.
 * Enables workout continuation after app reload/crash.
 */

import { db, type ActiveSession, type ActiveSessionExercise, type ActiveSessionSet, type UndoAction, type UndoActionPayload } from './db';

// =============================================================================
// SESSION PERSISTENCE FUNCTIONS
// =============================================================================

/**
 * Save the active session state to IndexedDB
 * Overwrites any existing active session (there's only one at a time)
 *
 * @param session - The session state to save
 * @returns Promise resolving when save is complete
 */
export async function saveActiveSession(
  session: Omit<ActiveSession, 'id' | 'updatedAt'>
): Promise<void> {
  const sessionData: ActiveSession = {
    ...session,
    id: 'current',
    updatedAt: new Date(),
  };

  await db.activeSession.put(sessionData);
}

/**
 * Get the current active session from IndexedDB
 *
 * @returns Promise resolving to the active session or undefined if none exists
 */
export async function getActiveSession(): Promise<ActiveSession | undefined> {
  return db.activeSession.get('current');
}

/**
 * Check if there's an active session in IndexedDB
 *
 * @returns Promise resolving to true if an active session exists
 */
export async function hasActiveSession(): Promise<boolean> {
  const count = await db.activeSession.count();
  return count > 0;
}

/**
 * Clear the active session from IndexedDB
 * Called when a workout is completed or abandoned
 *
 * @returns Promise resolving when clear is complete
 */
export async function clearActiveSession(): Promise<void> {
  await db.activeSession.delete('current');
}

/**
 * Update specific fields of the active session
 * Useful for incremental updates during a workout
 *
 * @param updates - Partial session data to update
 * @returns Promise resolving when update is complete
 * @throws Error if no active session exists
 */
export async function updateActiveSession(
  updates: Partial<Omit<ActiveSession, 'id' | 'updatedAt'>>
): Promise<void> {
  const current = await getActiveSession();

  if (!current) {
    throw new Error('No active session to update');
  }

  await db.activeSession.update('current', {
    ...updates,
    updatedAt: new Date(),
  });
}

// =============================================================================
// EXERCISE MANAGEMENT WITHIN SESSION
// =============================================================================

/**
 * Add an exercise to the active session
 *
 * @param exercise - The exercise to add
 * @returns Promise resolving when exercise is added
 * @throws Error if no active session exists
 */
export async function addExerciseToSession(
  exercise: ActiveSessionExercise
): Promise<void> {
  const current = await getActiveSession();

  if (!current) {
    throw new Error('No active session to add exercise to');
  }

  const updatedExercises = [...current.exercises, exercise];

  await db.activeSession.update('current', {
    exercises: updatedExercises,
    updatedAt: new Date(),
  });
}

/**
 * Remove an exercise from the active session
 *
 * @param localId - The local ID of the exercise to remove
 * @returns Promise resolving when exercise is removed
 * @throws Error if no active session exists
 */
export async function removeExerciseFromSession(localId: string): Promise<void> {
  const current = await getActiveSession();

  if (!current) {
    throw new Error('No active session to remove exercise from');
  }

  const updatedExercises = current.exercises.filter((e) => e.localId !== localId);

  // Reindex order
  updatedExercises.forEach((e, idx) => {
    e.orderIndex = idx;
  });

  await db.activeSession.update('current', {
    exercises: updatedExercises,
    updatedAt: new Date(),
  });
}

/**
 * Update an exercise in the active session
 *
 * @param localId - The local ID of the exercise to update
 * @param updates - Partial exercise data to update
 * @returns Promise resolving when exercise is updated
 * @throws Error if no active session exists or exercise not found
 */
export async function updateExerciseInSession(
  localId: string,
  updates: Partial<Omit<ActiveSessionExercise, 'localId'>>
): Promise<void> {
  const current = await getActiveSession();

  if (!current) {
    throw new Error('No active session to update exercise in');
  }

  const exerciseIndex = current.exercises.findIndex((e) => e.localId === localId);

  if (exerciseIndex === -1) {
    throw new Error(`Exercise with localId ${localId} not found`);
  }

  const updatedExercises = [...current.exercises];
  updatedExercises[exerciseIndex] = {
    ...updatedExercises[exerciseIndex],
    ...updates,
  };

  await db.activeSession.update('current', {
    exercises: updatedExercises,
    updatedAt: new Date(),
  });
}

// =============================================================================
// SET MANAGEMENT WITHIN EXERCISE
// =============================================================================

/**
 * Add a set to an exercise in the active session
 *
 * @param exerciseLocalId - The local ID of the exercise
 * @param set - The set to add
 * @returns Promise resolving when set is added
 * @throws Error if no active session exists or exercise not found
 */
export async function addSetToExercise(
  exerciseLocalId: string,
  set: ActiveSessionSet
): Promise<void> {
  const current = await getActiveSession();

  if (!current) {
    throw new Error('No active session to add set to');
  }

  const exerciseIndex = current.exercises.findIndex(
    (e) => e.localId === exerciseLocalId
  );

  if (exerciseIndex === -1) {
    throw new Error(`Exercise with localId ${exerciseLocalId} not found`);
  }

  const updatedExercises = [...current.exercises];
  updatedExercises[exerciseIndex] = {
    ...updatedExercises[exerciseIndex],
    sets: [...updatedExercises[exerciseIndex].sets, set],
  };

  await db.activeSession.update('current', {
    exercises: updatedExercises,
    updatedAt: new Date(),
  });
}

/**
 * Update a set in an exercise in the active session
 *
 * @param exerciseLocalId - The local ID of the exercise
 * @param setLocalId - The local ID of the set
 * @param updates - Partial set data to update
 * @returns Promise resolving when set is updated
 * @throws Error if no active session, exercise, or set not found
 */
export async function updateSetInExercise(
  exerciseLocalId: string,
  setLocalId: string,
  updates: Partial<Omit<ActiveSessionSet, 'localId'>>
): Promise<void> {
  const current = await getActiveSession();

  if (!current) {
    throw new Error('No active session to update set in');
  }

  const exerciseIndex = current.exercises.findIndex(
    (e) => e.localId === exerciseLocalId
  );

  if (exerciseIndex === -1) {
    throw new Error(`Exercise with localId ${exerciseLocalId} not found`);
  }

  const setIndex = current.exercises[exerciseIndex].sets.findIndex(
    (s) => s.localId === setLocalId
  );

  if (setIndex === -1) {
    throw new Error(`Set with localId ${setLocalId} not found`);
  }

  const updatedExercises = [...current.exercises];
  const updatedSets = [...updatedExercises[exerciseIndex].sets];
  updatedSets[setIndex] = {
    ...updatedSets[setIndex],
    ...updates,
  };
  updatedExercises[exerciseIndex] = {
    ...updatedExercises[exerciseIndex],
    sets: updatedSets,
  };

  await db.activeSession.update('current', {
    exercises: updatedExercises,
    updatedAt: new Date(),
  });
}

/**
 * Remove a set from an exercise in the active session
 *
 * @param exerciseLocalId - The local ID of the exercise
 * @param setLocalId - The local ID of the set to remove
 * @returns Promise resolving when set is removed
 * @throws Error if no active session or exercise not found
 */
export async function removeSetFromExercise(
  exerciseLocalId: string,
  setLocalId: string
): Promise<void> {
  const current = await getActiveSession();

  if (!current) {
    throw new Error('No active session to remove set from');
  }

  const exerciseIndex = current.exercises.findIndex(
    (e) => e.localId === exerciseLocalId
  );

  if (exerciseIndex === -1) {
    throw new Error(`Exercise with localId ${exerciseLocalId} not found`);
  }

  const updatedExercises = [...current.exercises];
  const updatedSets = updatedExercises[exerciseIndex].sets.filter(
    (s) => s.localId !== setLocalId
  );

  // Reindex set indices
  updatedSets.forEach((s, idx) => {
    s.setIndex = idx;
  });

  updatedExercises[exerciseIndex] = {
    ...updatedExercises[exerciseIndex],
    sets: updatedSets,
  };

  await db.activeSession.update('current', {
    exercises: updatedExercises,
    updatedAt: new Date(),
  });
}

// =============================================================================
// UNDO STACK MANAGEMENT (Task 5.5)
// =============================================================================

/**
 * Maximum number of undo actions to keep in the stack
 * Keep it small to minimize memory usage during workouts
 */
const MAX_UNDO_STACK_SIZE = 10;

/**
 * In-memory undo stack for the current session
 * We use in-memory storage because:
 * 1. Undo actions are transient (only for current session)
 * 2. Fast access for UI responsiveness
 * 3. Cleared when session ends
 */
let undoStack: UndoAction[] = [];

/**
 * Generate a unique ID for an undo action
 */
function generateUndoId(): string {
  return `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Push an action to the undo stack
 *
 * @param payload - The undo action payload
 */
export function pushUndoAction(payload: UndoActionPayload): void {
  const action: UndoAction = {
    id: generateUndoId(),
    timestamp: new Date(),
    payload,
  };

  undoStack.push(action);

  // Trim stack if it exceeds max size
  if (undoStack.length > MAX_UNDO_STACK_SIZE) {
    undoStack = undoStack.slice(-MAX_UNDO_STACK_SIZE);
  }
}

/**
 * Pop the last action from the undo stack
 *
 * @returns The last undo action or undefined if stack is empty
 */
export function popUndoAction(): UndoAction | undefined {
  return undoStack.pop();
}

/**
 * Peek at the last action without removing it
 *
 * @returns The last undo action or undefined if stack is empty
 */
export function peekUndoAction(): UndoAction | undefined {
  return undoStack.length > 0 ? undoStack[undoStack.length - 1] : undefined;
}

/**
 * Check if there are any actions to undo
 *
 * @returns True if the undo stack is not empty
 */
export function hasUndoActions(): boolean {
  return undoStack.length > 0;
}

/**
 * Get the current undo stack length
 *
 * @returns The number of actions in the undo stack
 */
export function getUndoStackLength(): number {
  return undoStack.length;
}

/**
 * Clear the entire undo stack
 * Called when session ends or is abandoned
 */
export function clearUndoStack(): void {
  undoStack = [];
}

/**
 * Execute an undo action - reverses the last logged set action
 *
 * This function:
 * 1. Pops the last action from the undo stack
 * 2. Reverses the action by modifying the active session
 * 3. Does NOT enqueue a sync mutation (handled by caller if needed)
 *
 * @returns Promise resolving to the undone action, or undefined if stack was empty
 * @throws Error if the undo operation fails
 */
export async function executeUndo(): Promise<UndoAction | undefined> {
  const action = popUndoAction();
  if (!action) {
    return undefined;
  }

  const current = await getActiveSession();
  if (!current) {
    throw new Error('No active session to undo in');
  }

  const { payload } = action;

  switch (payload.type) {
    case 'LOG_SET': {
      // Undo LOG_SET: Remove the set that was logged
      await removeSetFromExercise(payload.exerciseLocalId, payload.setLocalId);
      break;
    }

    case 'UPDATE_SET': {
      // Undo UPDATE_SET: Restore previous values
      await updateSetInExercise(
        payload.exerciseLocalId,
        payload.setLocalId,
        payload.previousValues
      );
      break;
    }

    case 'DELETE_SET': {
      // Undo DELETE_SET: Re-add the deleted set
      // We need to insert it at the correct position (using original setIndex)
      const exerciseIndex = current.exercises.findIndex(
        (e) => e.localId === payload.exerciseLocalId
      );

      if (exerciseIndex === -1) {
        throw new Error(`Exercise with localId ${payload.exerciseLocalId} not found for undo`);
      }

      const updatedExercises = [...current.exercises];
      const currentSets = [...updatedExercises[exerciseIndex].sets];
      
      // Insert the deleted set back at its original position
      const insertIndex = Math.min(payload.deletedSet.setIndex, currentSets.length);
      currentSets.splice(insertIndex, 0, payload.deletedSet);
      
      // Reindex all sets
      currentSets.forEach((s, idx) => {
        s.setIndex = idx;
      });

      updatedExercises[exerciseIndex] = {
        ...updatedExercises[exerciseIndex],
        sets: currentSets,
      };

      await db.activeSession.update('current', {
        exercises: updatedExercises,
        updatedAt: new Date(),
      });
      break;
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustiveCheck: never = payload;
      throw new Error(`Unknown undo action type: ${(_exhaustiveCheck as UndoActionPayload).type}`);
    }
  }

  return action;
}
