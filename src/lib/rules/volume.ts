/**
 * Volume Calculation + Balance Warnings — Task 7.5
 *
 * Calculates weekly working sets per muscle group and returns
 * imbalance warnings based on push/pull ratio and quad/hamstring ratio.
 *
 * Acceptance Criteria (Task 7.5):
 * - Returns imbalance warnings consistently.
 */

import type { MuscleGroupVolume, VolumeReport, VolumeWarning } from './types';

// =============================================================================
// RECOMMENDED WEEKLY SETS (minimum viable volume guidance)
// =============================================================================

const VOLUME_TARGETS: Record<string, { min: number; max: number }> = {
  chest: { min: 10, max: 20 },
  back: { min: 10, max: 20 },
  lats: { min: 8, max: 18 },
  shoulders: { min: 8, max: 16 },
  front_delts: { min: 6, max: 12 },
  side_delts: { min: 8, max: 16 },
  rear_delts: { min: 6, max: 14 },
  biceps: { min: 6, max: 14 },
  triceps: { min: 6, max: 14 },
  traps: { min: 6, max: 12 },
  quads: { min: 12, max: 20 },
  hamstrings: { min: 10, max: 16 },
  glutes: { min: 8, max: 16 },
  calves: { min: 8, max: 16 },
  core: { min: 6, max: 16 },
  forearms: { min: 4, max: 10 },
};

const DEFAULT_TARGET = { min: 6, max: 16 };

// =============================================================================
// HELPERS
// =============================================================================

function normalizeMuscle(muscle: string): string {
  return muscle.toLowerCase().replace(/[\s-]/g, '_');
}

function volumeStatus(sets: number, min: number, max: number): 'low' | 'optimal' | 'high' {
  if (sets < min) return 'low';
  if (sets > max) return 'high';
  return 'optimal';
}

// =============================================================================
// SESSION INPUT SHAPE
// =============================================================================

export interface SessionForVolume {
  exercises: {
    muscleGroups: string[];
    sets: {
      flags?: { warmup?: boolean; dropset?: boolean } | null;
    }[];
  }[];
}

// =============================================================================
// MAIN CALCULATION
// =============================================================================

/**
 * Calculates weekly working-set volume per muscle group from a list of sessions.
 *
 * Rules:
 * - Warmup and dropsets are excluded from working-set count.
 * - Each exercise credits all of its muscle groups equally.
 * - Only known muscle groups (VOLUME_TARGETS keys) + any discovered muscles
 *   are included in the report.
 */
export function calculateWeeklyVolume(
  sessions: SessionForVolume[],
  weekStart: Date,
  weekEnd: Date
): VolumeReport {
  const setCounts = new Map<string, number>();

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const workingCount = exercise.sets.filter(
        (s) => !s.flags?.warmup && !s.flags?.dropset
      ).length;

      if (workingCount === 0) continue;

      for (const rawMuscle of exercise.muscleGroups) {
        const muscle = normalizeMuscle(rawMuscle);
        setCounts.set(muscle, (setCounts.get(muscle) ?? 0) + workingCount);
      }
    }
  }

  // Union of known targets + muscles actually encountered in sessions
  const allMuscles = new Set([
    ...Object.keys(VOLUME_TARGETS),
    ...setCounts.keys(),
  ]);

  const muscleGroups: MuscleGroupVolume[] = [];

  for (const muscle of allMuscles) {
    const weeklyWorkingSets = setCounts.get(muscle) ?? 0;
    const target = VOLUME_TARGETS[muscle] ?? DEFAULT_TARGET;
    muscleGroups.push({
      muscleGroup: muscle,
      weeklyWorkingSets,
      recommendedMin: target.min,
      recommendedMax: target.max,
      status: volumeStatus(weeklyWorkingSets, target.min, target.max),
    });
  }

  // Sort: by sets desc, then alphabetically
  muscleGroups.sort((a, b) =>
    b.weeklyWorkingSets !== a.weeklyWorkingSets
      ? b.weeklyWorkingSets - a.weeklyWorkingSets
      : a.muscleGroup.localeCompare(b.muscleGroup)
  );

  const warnings = buildWarnings(setCounts);

  return { weekStart, weekEnd, muscleGroups, warnings };
}

// =============================================================================
// BALANCE WARNINGS
// =============================================================================

function buildWarnings(setCounts: Map<string, number>): VolumeWarning[] {
  const warnings: VolumeWarning[] = [];

  // Push = chest + front_delts + triceps
  const pushSets =
    (setCounts.get('chest') ?? 0) +
    (setCounts.get('front_delts') ?? 0) +
    (setCounts.get('triceps') ?? 0);

  // Pull = back + lats + rear_delts + biceps
  const pullSets =
    (setCounts.get('back') ?? 0) +
    (setCounts.get('lats') ?? 0) +
    (setCounts.get('rear_delts') ?? 0) +
    (setCounts.get('biceps') ?? 0);

  if (pushSets > 0 && pullSets > 0) {
    if (pushSets > pullSets * 1.5) {
      warnings.push({
        type: 'push_pull_imbalance',
        message: `Push volume (${pushSets} sets) significantly exceeds pull volume (${pullSets} sets). Add more rows/pulls to balance.`,
        severity: 'medium',
      });
    } else if (pullSets > pushSets * 1.5) {
      warnings.push({
        type: 'push_pull_imbalance',
        message: `Pull volume (${pullSets} sets) significantly exceeds push volume (${pushSets} sets). Consider adding more pressing movements.`,
        severity: 'low',
      });
    }
  }

  // Quad/hamstring balance
  const quadSets = setCounts.get('quads') ?? 0;
  const hamSets = setCounts.get('hamstrings') ?? 0;

  if (quadSets > 0 && hamSets > 0) {
    if (quadSets > hamSets * 2) {
      warnings.push({
        type: 'quad_ham_imbalance',
        message: `Quad volume (${quadSets} sets) far exceeds hamstring volume (${hamSets} sets). Add hip hinges or leg curls.`,
        severity: 'medium',
      });
    } else if (hamSets > quadSets * 2) {
      warnings.push({
        type: 'quad_ham_imbalance',
        message: `Hamstring volume (${hamSets} sets) far exceeds quad volume (${quadSets} sets). Add squats or lunges.`,
        severity: 'low',
      });
    }
  }

  // Neglected muscle groups (only flag when total weekly volume is substantial)
  const totalSets = Array.from(setCounts.values()).reduce((a, b) => a + b, 0);
  if (totalSets >= 30) {
    for (const [muscle, target] of Object.entries(VOLUME_TARGETS)) {
      if ((setCounts.get(muscle) ?? 0) === 0 && target.min >= 8) {
        warnings.push({
          type: 'neglected_muscle',
          message: `${muscle.replace(/_/g, ' ')} has 0 sets this week (target: ${target.min}–${target.max}).`,
          severity: 'low',
        });
      }
    }
  }

  return warnings;
}
