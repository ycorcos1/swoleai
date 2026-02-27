/**
 * Deload / Low-Energy Day Rules — Task 7.7
 *
 * Deterministic rules that propose a deload protocol based on:
 *  - Plateau severity (from Task 7.6)
 *  - Session constraint flags (low energy, pain)
 *
 * Protocols:
 *  full_deload     - ≥2 severe plateaus → 60% weight, 60% sets, 1 week
 *  partial_deload  - 1 severe OR ≥2 moderate → 80% weight, 80% sets, 1 week
 *  low_energy_day  - lowEnergy flag set, no plateau → 85% weight, 75% sets, 1 day
 *  none            - no signals detected
 *
 * Acceptance Criteria (Task 7.7):
 * - Returns proposed deload adjustments deterministically.
 */

import type { PlateauCandidate, DeloadAdjustment, DeloadRecommendation } from './types';

// =============================================================================
// ADJUSTMENT BUILDERS
// =============================================================================

function buildAdjustment(
  exerciseId: string,
  exerciseName: string,
  weightMult: number,
  repsMult: number,
  setsMult: number,
  rationale: string
): DeloadAdjustment {
  return {
    exerciseId,
    exerciseName,
    suggestedWeightMultiplier: weightMult,
    suggestedRepsMultiplier: repsMult,
    suggestedSetsMultiplier: setsMult,
    rationale,
  };
}

function toFullDeload(candidate: PlateauCandidate): DeloadAdjustment {
  return buildAdjustment(
    candidate.exerciseId,
    candidate.exerciseName,
    0.6,
    0.8,
    0.6,
    `Full deload: use 60% of working weight for 1 week to dissipate fatigue`
  );
}

function toPartialDeload(candidate: PlateauCandidate): DeloadAdjustment {
  return buildAdjustment(
    candidate.exerciseId,
    candidate.exerciseName,
    0.8,
    0.9,
    0.8,
    `Partial deload: use 80% of working weight to recover while maintaining frequency`
  );
}

// =============================================================================
// LOW-ENERGY DAY ADJUSTMENTS
// =============================================================================

export interface ExerciseRef {
  exerciseId: string;
  exerciseName: string;
}

/**
 * Produces low-energy day adjustments for a list of exercises.
 * Reduces intensity by ~15% while maintaining movement patterns.
 */
export function buildLowEnergyAdjustments(exercises: ExerciseRef[]): DeloadAdjustment[] {
  return exercises.map((ex) =>
    buildAdjustment(
      ex.exerciseId,
      ex.exerciseName,
      0.85,
      0.9,
      0.75,
      'Low energy day: reduce intensity ~15%, prioritise technique over load'
    )
  );
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Recommends a deload protocol based on plateau analysis + session context.
 *
 * Inputs:
 *  plateauCandidates — from detectPlateaus()
 *  sessionContext    — current session flags (lowEnergy, pain, exercises list)
 *
 * Returns a DeloadRecommendation with:
 *  - type (full_deload | partial_deload | low_energy_day | none)
 *  - adjustments per affected exercise
 *  - plain-English message
 */
export function recommendDeload(
  plateauCandidates: PlateauCandidate[],
  sessionContext: {
    lowEnergy?: boolean;
    painFlags?: string[];
    exercises?: ExerciseRef[];
  } = {}
): DeloadRecommendation {
  const severe = plateauCandidates.filter((p) => p.severity === 'severe');
  const moderate = plateauCandidates.filter((p) => p.severity === 'moderate');

  // ── Full deload: ≥2 severe, OR 1 severe + ≥2 moderate ────────────────────
  if (severe.length >= 2 || (severe.length >= 1 && moderate.length >= 2)) {
    const affected = [...severe, ...moderate];
    return {
      type: 'full_deload',
      trigger: `${severe.length} severe plateau(s) detected`,
      adjustments: affected.map(toFullDeload),
      durationDays: 7,
      message:
        `Full deload week recommended. ${affected.length} exercise(s) show significant stalling. ` +
        `Reduce working weight to 60%, sets to 60%, for 1 week, then resume normal progression.`,
    };
  }

  // ── Partial deload: 1 severe, OR ≥2 moderate ─────────────────────────────
  if (severe.length >= 1 || moderate.length >= 2) {
    const affected = [...severe, ...moderate];
    return {
      type: 'partial_deload',
      trigger: `${affected.length} plateau(s) detected (${severe.length} severe, ${moderate.length} moderate)`,
      adjustments: affected.map(toPartialDeload),
      durationDays: 7,
      message:
        `Partial deload recommended for ${affected.length} exercise(s). ` +
        `Use 80% of working weight for 1 week to recover without losing fitness.`,
    };
  }

  // ── Low-energy day: user flagged low energy ────────────────────────────────
  if (sessionContext.lowEnergy) {
    const exercises = sessionContext.exercises ?? [];
    return {
      type: 'low_energy_day',
      trigger: 'Low-energy flag set for this session',
      adjustments: buildLowEnergyAdjustments(exercises),
      durationDays: 1,
      message:
        'Low-energy day detected. Reduce loads by ~15% and focus on technique. ' +
        'Resume normal weights in the next session.',
    };
  }

  // ── No intervention needed ────────────────────────────────────────────────
  return {
    type: 'none',
    trigger: 'No significant fatigue or plateau signals',
    adjustments: [],
    durationDays: 0,
    message: 'No deload needed — training is progressing normally.',
  };
}
