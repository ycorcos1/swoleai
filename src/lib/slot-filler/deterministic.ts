/**
 * Task 10.1 — Deterministic slot filler (favorites-first)
 *
 * Fills SLOT template exercise slots from the user's favorites, prioritising:
 *   1. PRIMARY favorites that have NOT been used recently
 *   2. PRIMARY favorites that HAVE been used recently
 *   3. BACKUP favorites that have NOT been used recently
 *   4. BACKUP favorites that HAVE been used recently
 *
 * Hard constraints (pattern, equipment) are applied as strict filters.
 * An exercise already assigned to a prior slot in the same run is skipped to
 * prevent duplicates across slots.
 *
 * Acceptance Criteria (Task 10.1):
 *   If favorites exist for a slot they are chosen before non-favorites.
 *   Slots with unfilledCount > 0 indicate exercises that need an AI gap-fill
 *   (Task 10.2).
 */

// =============================================================================
// Input types
// =============================================================================

export interface FavoriteExercise {
  id: string;
  name: string;
  /** ExerciseType enum value string (e.g. "BARBELL", "DUMBBELL") */
  type: string;
  /** MovementPattern enum value string (e.g. "HORIZONTAL_PUSH") */
  pattern: string;
  /** Muscle group strings (e.g. ["chest", "triceps"]) */
  muscleGroups: string[];
}

export interface FavoriteWithPriority {
  exerciseId: string;
  priority: 'PRIMARY' | 'BACKUP';
  exercise: FavoriteExercise;
}

export interface SlotConstraints {
  allowedPatterns?: string[];
  excludedPatterns?: string[];
  allowedTypes?: string[];
  excludedTypes?: string[];
}

export interface SlotInput {
  muscleGroup: string;
  exerciseCount: number;
  patternConstraints: SlotConstraints | null;
  equipmentConstraints: SlotConstraints | null;
  defaultSets: number;
  defaultRepMin: number;
  defaultRepMax: number;
}

// =============================================================================
// Output types
// =============================================================================

export interface FilledExercise {
  exerciseId: string;
  exerciseName: string;
  setsPlanned: number;
  repMin: number;
  repMax: number;
  /** Which tier of favorite this pick came from */
  source: 'favorite_primary' | 'favorite_backup';
}

export interface SlotFillResult {
  slotIndex: number;
  muscleGroup: string;
  exerciseCount: number;
  defaultSets: number;
  defaultRepMin: number;
  defaultRepMax: number;
  /** Exercises sourced from favorites */
  exercises: FilledExercise[];
  /** How many exercises still need to be filled (exerciseCount − exercises.length) */
  unfilledCount: number;
}

// =============================================================================
// Core function
// =============================================================================

/**
 * Fill each slot using the user's favorites, favorites-first.
 *
 * @param slots                  Ordered slot definitions from the SLOT template
 * @param favorites              All user favorites with full exercise details
 * @param recentlyUsedExerciseIds IDs used in recent sessions (soft-avoided)
 * @returns One SlotFillResult per slot, preserving input order
 */
export function fillSlotsFromFavorites(
  slots: SlotInput[],
  favorites: FavoriteWithPriority[],
  recentlyUsedExerciseIds: Set<string>,
): SlotFillResult[] {
  // Track picks across slots so the same exercise isn't assigned twice.
  const assignedIds = new Set<string>();

  return slots.map((slot, slotIndex) => {
    // ── 1. Filter by muscle group ─────────────────────────────────────────
    // exercise.muscleGroups is a JSON string array; slot.muscleGroup must
    // appear in it (case-insensitive match).
    const slotMg = slot.muscleGroup.toLowerCase();
    let candidates = favorites.filter((fav) =>
      fav.exercise.muscleGroups.some((mg) => mg.toLowerCase() === slotMg),
    );

    // ── 2. Apply pattern constraints (hard filters) ───────────────────────
    const pc = slot.patternConstraints;
    if (pc?.allowedPatterns?.length) {
      candidates = candidates.filter((fav) =>
        pc.allowedPatterns!.includes(fav.exercise.pattern),
      );
    }
    if (pc?.excludedPatterns?.length) {
      candidates = candidates.filter(
        (fav) => !pc.excludedPatterns!.includes(fav.exercise.pattern),
      );
    }

    // ── 3. Apply equipment constraints (hard filters) ─────────────────────
    const ec = slot.equipmentConstraints;
    if (ec?.allowedTypes?.length) {
      candidates = candidates.filter((fav) =>
        ec.allowedTypes!.includes(fav.exercise.type),
      );
    }
    if (ec?.excludedTypes?.length) {
      candidates = candidates.filter(
        (fav) => !ec.excludedTypes!.includes(fav.exercise.type),
      );
    }

    // ── 4. Exclude already-assigned exercises ─────────────────────────────
    candidates = candidates.filter((fav) => !assignedIds.has(fav.exerciseId));

    // ── 5. Sort: PRIMARY (not recent) → PRIMARY (recent) → BACKUP (not recent) → BACKUP (recent)
    const tierScore = (fav: FavoriteWithPriority): number => {
      const priorityScore = fav.priority === 'PRIMARY' ? 0 : 2;
      const recencyScore = recentlyUsedExerciseIds.has(fav.exerciseId) ? 1 : 0;
      return priorityScore + recencyScore;
    };
    candidates.sort((a, b) => tierScore(a) - tierScore(b));

    // ── 6. Pick up to exerciseCount ───────────────────────────────────────
    const picked = candidates.slice(0, slot.exerciseCount);
    picked.forEach((fav) => assignedIds.add(fav.exerciseId));

    const exercises: FilledExercise[] = picked.map((fav) => ({
      exerciseId: fav.exerciseId,
      exerciseName: fav.exercise.name,
      setsPlanned: slot.defaultSets,
      repMin: slot.defaultRepMin,
      repMax: slot.defaultRepMax,
      source: fav.priority === 'PRIMARY' ? 'favorite_primary' : 'favorite_backup',
    }));

    return {
      slotIndex,
      muscleGroup: slot.muscleGroup,
      exerciseCount: slot.exerciseCount,
      defaultSets: slot.defaultSets,
      defaultRepMin: slot.defaultRepMin,
      defaultRepMax: slot.defaultRepMax,
      exercises,
      unfilledCount: Math.max(0, slot.exerciseCount - exercises.length),
    };
  });
}
