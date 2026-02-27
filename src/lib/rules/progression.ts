/**
 * Progression Engines — Task 7.3
 *
 * Deterministic logic for computing next-session targets based on
 * last performance. Supports all ProgressionEngine values from the schema.
 *
 * Engines implemented:
 *  - DOUBLE_PROGRESSION  (primary)
 *  - STRAIGHT_SETS
 *  - TOP_SET_BACKOFF
 *  - RPE_BASED           (uses straight-sets logic as deterministic fallback)
 *  - NONE                (returns last weight, no change)
 *
 * Acceptance Criteria (Task 7.3):
 * - Next targets can be computed from last performance.
 */

import type { ExposureResult, ProgressionTarget, SetPerformance } from './types';

// =============================================================================
// HELPERS
// =============================================================================

/** Epley e1RM estimate: weight × (1 + reps/30) */
export function estimateE1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Extracts only working sets (excludes warmup and dropset). */
function workingSets(sets: SetPerformance[]): SetPerformance[] {
  return sets.filter((s) => !s.flags?.warmup && !s.flags?.dropset);
}

/** Round a weight to the nearest increment (default 5 lbs). */
function roundToIncrement(weight: number, increment: number): number {
  return Math.round(weight / increment) * increment;
}

// =============================================================================
// DOUBLE PROGRESSION (Task 7.3 — primary engine)
// =============================================================================

/**
 * Double Progression:
 * - If ALL working sets hit repMax → increase weight by increment.
 * - Otherwise → maintain weight, keep working toward repMax.
 */
export function computeDoubleProgression(
  lastExposure: ExposureResult,
  repMin: number,
  repMax: number,
  weightIncrement = 5
): ProgressionTarget {
  const ws = workingSets(lastExposure.sets);

  if (ws.length === 0) {
    return {
      suggestedWeight: 0,
      suggestedRepMin: repMin,
      suggestedRepMax: repMax,
      engine: 'DOUBLE_PROGRESSION',
      rationale: 'No working sets in last session',
      isReadyForProgression: false,
    };
  }

  const lastWeight = ws[ws.length - 1].weight;
  const allHitRepMax = ws.every((s) => s.reps >= repMax);

  if (allHitRepMax) {
    return {
      suggestedWeight: lastWeight + weightIncrement,
      suggestedRepMin: repMin,
      suggestedRepMax: repMax,
      engine: 'DOUBLE_PROGRESSION',
      rationale: `All ${ws.length} sets hit ${repMax} reps — add ${weightIncrement}`,
      isReadyForProgression: true,
    };
  }

  const avgReps = ws.reduce((sum, s) => sum + s.reps, 0) / ws.length;

  return {
    suggestedWeight: lastWeight,
    suggestedRepMin: repMin,
    suggestedRepMax: repMax,
    engine: 'DOUBLE_PROGRESSION',
    rationale: `Averaged ${avgReps.toFixed(1)} reps — work up to ${repMax} before increasing`,
    isReadyForProgression: false,
  };
}

// =============================================================================
// STRAIGHT SETS
// =============================================================================

/**
 * Straight Sets:
 * - All working sets hit plannedReps → increase weight.
 * - Otherwise → hold weight.
 */
export function computeStraightSets(
  lastExposure: ExposureResult,
  plannedReps: number,
  weightIncrement = 5
): ProgressionTarget {
  const ws = workingSets(lastExposure.sets);

  if (ws.length === 0) {
    return {
      suggestedWeight: 0,
      suggestedRepMin: plannedReps,
      suggestedRepMax: plannedReps,
      engine: 'STRAIGHT_SETS',
      rationale: 'No working sets in last session',
      isReadyForProgression: false,
    };
  }

  const lastWeight = ws[ws.length - 1].weight;
  const allHitTarget = ws.every((s) => s.reps >= plannedReps);

  return {
    suggestedWeight: allHitTarget ? lastWeight + weightIncrement : lastWeight,
    suggestedRepMin: plannedReps,
    suggestedRepMax: plannedReps,
    engine: 'STRAIGHT_SETS',
    rationale: allHitTarget
      ? `All sets hit ${plannedReps} reps — add ${weightIncrement}`
      : `Work up to ${plannedReps} reps per set`,
    isReadyForProgression: allHitTarget,
  };
}

// =============================================================================
// TOP SET + BACKOFF
// =============================================================================

/**
 * Top Set + Backoff:
 * - Top set hit target reps → increase top set weight.
 * - Backoff weight = 85% of new top set weight (rounded to nearest 5).
 */
export function computeTopSetBackoff(
  lastExposure: ExposureResult,
  plannedReps: number,
  backoffPct = 0.85,
  weightIncrement = 5
): ProgressionTarget {
  const ws = workingSets(lastExposure.sets);

  if (ws.length === 0) {
    return {
      suggestedWeight: 0,
      suggestedRepMin: plannedReps,
      suggestedRepMax: plannedReps,
      engine: 'TOP_SET_BACKOFF',
      rationale: 'No working sets in last session',
      isReadyForProgression: false,
    };
  }

  const topSet = ws.reduce((best, s) => (s.weight > best.weight ? s : best), ws[0]);
  const topHitTarget = topSet.reps >= plannedReps;
  const newTopWeight = topHitTarget ? topSet.weight + weightIncrement : topSet.weight;
  const backoffWeight = roundToIncrement(newTopWeight * backoffPct, 5);

  return {
    suggestedWeight: newTopWeight,
    suggestedRepMin: plannedReps,
    suggestedRepMax: plannedReps,
    engine: 'TOP_SET_BACKOFF',
    rationale: topHitTarget
      ? `Top set hit ${plannedReps} reps → new top: ${newTopWeight}, backoff: ${backoffWeight}`
      : `Hit ${plannedReps} reps on top set to earn weight increase`,
    isReadyForProgression: topHitTarget,
  };
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Dispatches to the correct progression engine and returns the next target.
 *
 * @param engine   - ProgressionEngine enum value
 * @param lastExposure - Sets from the most recent session for this exercise
 * @param repMin   - Lower bound of target rep range
 * @param repMax   - Upper bound of target rep range
 * @param weightIncrement - Plate increment (default 5 lbs)
 */
export function computeProgressionTarget(
  engine: string,
  lastExposure: ExposureResult,
  repMin: number,
  repMax: number,
  weightIncrement = 5
): ProgressionTarget {
  switch (engine) {
    case 'DOUBLE_PROGRESSION':
      return computeDoubleProgression(lastExposure, repMin, repMax, weightIncrement);
    case 'STRAIGHT_SETS':
      return computeStraightSets(lastExposure, repMax, weightIncrement);
    case 'TOP_SET_BACKOFF':
      return computeTopSetBackoff(lastExposure, repMax, 0.85, weightIncrement);
    case 'RPE_BASED':
      // Deterministic fallback: treat as straight sets using repMax
      return computeStraightSets(lastExposure, repMax, weightIncrement);
    case 'NONE':
      return {
        suggestedWeight: lastExposure.sets[0]?.weight ?? 0,
        suggestedRepMin: repMin,
        suggestedRepMax: repMax,
        engine: 'NONE',
        rationale: 'Manual control — no auto-progression applied',
        isReadyForProgression: false,
      };
    default:
      return computeDoubleProgression(lastExposure, repMin, repMax, weightIncrement);
  }
}
