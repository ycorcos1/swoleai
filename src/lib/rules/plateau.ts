/**
 * Plateau Detection (Deterministic) — Task 7.6
 *
 * Flags exercises where weight AND reps have stalled across the last N sessions,
 * optionally gated by high perceived effort (RPE).
 *
 * Plateau criteria:
 *  1. No increase in top-set weight over the last N exposures.
 *  2. No increase in best reps at that top weight.
 *  3. Average RPE ≥ effortThreshold (if RPE data is present).
 *
 * Severity:
 *  - mild     : 2–2 exposures stalled (early signal)
 *  - moderate : 3 exposures stalled
 *  - severe   : ≥4 exposures stalled AND high effort
 *
 * Acceptance Criteria (Task 7.6):
 * - Plateau candidates returned for a user.
 */

import type { ExposureResult, PlateauCandidate } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_WINDOW = 4;          // Exposures to evaluate
const DEFAULT_EFFORT_THRESHOLD = 7.5;  // RPE threshold for "working hard"

// =============================================================================
// SINGLE-EXERCISE DETECTION
// =============================================================================

/**
 * Analyses one exercise's recent exposure history and returns a
 * PlateauCandidate if stalled, or null if progress is being made.
 */
export function detectExercisePlateau(
  exerciseId: string,
  exerciseName: string,
  exposures: ExposureResult[],
  options: {
    windowSize?: number;
    effortThreshold?: number;
  } = {}
): PlateauCandidate | null {
  const {
    windowSize = DEFAULT_WINDOW,
    effortThreshold = DEFAULT_EFFORT_THRESHOLD,
  } = options;

  if (exposures.length < 2) return null;

  // Take last N exposures sorted oldest → newest
  const window = [...exposures]
    .sort((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime())
    .slice(-windowSize);

  if (window.length < 2) return null;

  // Per-exposure: compute top-set weight and best reps at that weight
  const snapshots = window.map((exp) => {
    const ws = exp.sets.filter(
      (s) => !s.flags?.warmup && !s.flags?.dropset && s.weight > 0 && s.reps > 0
    );
    if (ws.length === 0) return { weight: 0, reps: 0 };

    const topWeight = Math.max(...ws.map((s) => s.weight));
    const bestRepsAtTop = Math.max(
      ...ws.filter((s) => s.weight === topWeight).map((s) => s.reps)
    );
    return { weight: topWeight, reps: bestRepsAtTop };
  });

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];

  const weightStalled = last.weight <= first.weight;
  const repsStalled = last.reps <= first.reps;

  // Both metrics must show no improvement to call it a plateau
  if (!weightStalled && !repsStalled) return null;

  // Determine plateau type
  let plateauType: PlateauCandidate['plateauType'];
  if (weightStalled && repsStalled) {
    plateauType = 'both_stalled';
  } else if (weightStalled) {
    plateauType = 'weight_stalled';
  } else {
    plateauType = 'reps_stalled';
  }

  // Average RPE across the window
  const allRPEs: number[] = [];
  for (const exp of window) {
    for (const s of exp.sets) {
      if (s.rpe != null && s.rpe > 0) allRPEs.push(s.rpe);
    }
  }
  const avgRpe =
    allRPEs.length > 0
      ? allRPEs.reduce((sum, r) => sum + r, 0) / allRPEs.length
      : null;

  // Severity: escalates with window length and effort
  const highEffort = avgRpe === null || avgRpe >= effortThreshold;
  let severity: PlateauCandidate['severity'];
  if (window.length >= windowSize && highEffort) {
    severity = 'severe';
  } else if (window.length >= 3) {
    severity = 'moderate';
  } else {
    severity = 'mild';
  }

  return {
    exerciseId,
    exerciseName,
    exposuresAnalyzed: window.length,
    lastWeight: last.weight,
    lastReps: last.reps,
    avgRpe,
    plateauType,
    severity,
    message: buildMessage(exerciseName, window.length, weightStalled, repsStalled, avgRpe),
  };
}

function buildMessage(
  name: string,
  exposures: number,
  weightStalled: boolean,
  repsStalled: boolean,
  avgRpe: number | null
): string {
  const what =
    weightStalled && repsStalled
      ? 'weight and reps both stalled'
      : weightStalled
      ? 'weight stalled'
      : 'reps stalled';

  const effortNote =
    avgRpe !== null && avgRpe >= DEFAULT_EFFORT_THRESHOLD
      ? ` with high effort (avg RPE ${avgRpe.toFixed(1)})`
      : '';

  return `${name}: ${what} over ${exposures} sessions${effortNote}.`;
}

// =============================================================================
// BATCH DETECTION
// =============================================================================

export interface ExerciseWithExposures {
  id: string;
  name: string;
  exposures: ExposureResult[];
}

/**
 * Runs plateau detection across multiple exercises.
 * Returns all plateau candidates sorted by severity (severe first).
 *
 * Acceptance Criteria: Plateau candidates returned for a user.
 */
export function detectPlateaus(
  exercises: ExerciseWithExposures[],
  options: { windowSize?: number; effortThreshold?: number } = {}
): PlateauCandidate[] {
  const results: PlateauCandidate[] = [];

  for (const ex of exercises) {
    const candidate = detectExercisePlateau(ex.id, ex.name, ex.exposures, options);
    if (candidate) results.push(candidate);
  }

  const severityOrder: Record<PlateauCandidate['severity'], number> = {
    severe: 0,
    moderate: 1,
    mild: 2,
  };

  results.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return results;
}
