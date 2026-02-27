/**
 * PR Detection Logic — Task 7.4
 *
 * Detects personal records from a session's sets for one or more exercises,
 * compared against that user's all-time historical best values.
 *
 * PR types detected:
 *   REP_PR    — More reps at a given load than ever before
 *   LOAD_PR   — Heaviest weight ever lifted for this exercise
 *   E1RM_PR   — Estimated 1RM (Epley formula) beats all-time best
 *   VOLUME_PR — Session total volume (weight × reps) for this exercise
 *
 * Acceptance Criteria (Task 7.4):
 * - Summary page can show PR badges.
 */

import type { SetPerformance, PRResult } from './types';

// =============================================================================
// E1RM FORMULA
// =============================================================================

/**
 * Epley formula: e1RM = weight × (1 + reps / 30)
 * Widely used in powerlifting and strength training.
 */
export function computeE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// =============================================================================
// HISTORY SHAPE
// =============================================================================

/**
 * Pre-aggregated historical bests for a single exercise.
 * Build this from all prior sessions before calling detectPRs.
 */
export interface ExerciseHistory {
  /** Map of weight → best reps ever achieved at that exact weight */
  bestRepsByLoad: Map<number, number>;
  /** All-time best e1RM across all sessions */
  bestE1RM: number;
  /** Best single-session total volume (kg×reps or lbs×reps) */
  bestSessionVolume: number;
  /** All-time heaviest weight lifted for any rep count */
  bestLoad: number;
}

/** Build an empty history (used as baseline for first-ever attempt) */
export function emptyHistory(): ExerciseHistory {
  return {
    bestRepsByLoad: new Map(),
    bestE1RM: 0,
    bestSessionVolume: 0,
    bestLoad: 0,
  };
}

/**
 * Builds an ExerciseHistory from a list of historical set arrays.
 * Each element represents one session's sets for this exercise.
 */
export function buildHistory(historicalSessions: SetPerformance[][]): ExerciseHistory {
  const history = emptyHistory();

  for (const sessionSets of historicalSessions) {
    const ws = sessionSets.filter((s) => !s.flags?.warmup && !s.flags?.dropset);

    let sessionVolume = 0;

    for (const set of ws) {
      if (set.weight <= 0 || set.reps <= 0) continue;

      // Best reps at this load
      const prev = history.bestRepsByLoad.get(set.weight) ?? 0;
      if (set.reps > prev) history.bestRepsByLoad.set(set.weight, set.reps);

      // Best load
      if (set.weight > history.bestLoad) history.bestLoad = set.weight;

      // e1RM
      const e1rm = computeE1RM(set.weight, set.reps);
      if (e1rm > history.bestE1RM) history.bestE1RM = e1rm;

      // Volume accumulation
      sessionVolume += set.weight * set.reps;
    }

    if (sessionVolume > history.bestSessionVolume) {
      history.bestSessionVolume = sessionVolume;
    }
  }

  return history;
}

// =============================================================================
// PR DETECTION
// =============================================================================

/**
 * Detects PRs for one exercise from the current session's sets,
 * compared against the provided historical bests.
 *
 * Working sets only (warmup and dropsets excluded from PR comparison).
 */
export function detectPRs(
  exerciseId: string,
  exerciseName: string,
  sessionSets: SetPerformance[],
  history: ExerciseHistory
): PRResult[] {
  const prs: PRResult[] = [];
  const ws = sessionSets.filter((s) => !s.flags?.warmup && !s.flags?.dropset);

  if (ws.length === 0) return prs;

  // --- 1. REP_PR — more reps at a given load --------------------------------
  const bestRepsByLoadInSession = new Map<number, number>();
  for (const s of ws) {
    if (s.weight <= 0 || s.reps <= 0) continue;
    const prev = bestRepsByLoadInSession.get(s.weight) ?? 0;
    if (s.reps > prev) bestRepsByLoadInSession.set(s.weight, s.reps);
  }

  for (const [weight, reps] of bestRepsByLoadInSession) {
    const historicalBest = history.bestRepsByLoad.get(weight) ?? null;
    if (historicalBest === null || reps > historicalBest) {
      prs.push({
        type: 'REP_PR',
        exerciseId,
        exerciseName,
        newValue: reps,
        previousBest: historicalBest,
        label: `Rep PR @ ${weight} lbs`,
        unit: 'reps',
      });
    }
  }

  // --- 2. LOAD_PR — heaviest weight ever ------------------------------------
  const sessionMaxLoad = Math.max(...ws.map((s) => s.weight).filter((w) => w > 0));
  if (sessionMaxLoad > 0 && sessionMaxLoad > history.bestLoad) {
    prs.push({
      type: 'LOAD_PR',
      exerciseId,
      exerciseName,
      newValue: sessionMaxLoad,
      previousBest: history.bestLoad > 0 ? history.bestLoad : null,
      label: 'Load PR',
      unit: 'lbs',
    });
  }

  // --- 3. E1RM_PR — estimated 1RM -------------------------------------------
  const sessionBestE1RM = Math.max(
    ...ws
      .filter((s) => s.weight > 0 && s.reps > 0)
      .map((s) => computeE1RM(s.weight, s.reps))
  );

  if (sessionBestE1RM > 0 && sessionBestE1RM > history.bestE1RM) {
    prs.push({
      type: 'E1RM_PR',
      exerciseId,
      exerciseName,
      newValue: Math.round(sessionBestE1RM * 10) / 10,
      previousBest: history.bestE1RM > 0 ? Math.round(history.bestE1RM * 10) / 10 : null,
      label: 'Estimated 1RM PR',
      unit: 'lbs',
    });
  }

  // --- 4. VOLUME_PR — total session volume ----------------------------------
  const sessionVolume = ws
    .filter((s) => s.weight > 0 && s.reps > 0)
    .reduce((sum, s) => sum + s.weight * s.reps, 0);

  if (sessionVolume > 0 && sessionVolume > history.bestSessionVolume) {
    prs.push({
      type: 'VOLUME_PR',
      exerciseId,
      exerciseName,
      newValue: Math.round(sessionVolume),
      previousBest: history.bestSessionVolume > 0 ? Math.round(history.bestSessionVolume) : null,
      label: 'Volume PR',
      unit: 'lbs×reps',
    });
  }

  return prs;
}

// =============================================================================
// BATCH DETECTION
// =============================================================================

export interface ExerciseSessionData {
  exerciseId: string;
  exerciseName: string;
  sessionSets: SetPerformance[];
  historicalSessions: SetPerformance[][];
}

/**
 * Detects PRs across multiple exercises in a session batch.
 * Compares each exercise's session sets against its full history.
 */
export function detectAllPRs(exercises: ExerciseSessionData[]): PRResult[] {
  const allPRs: PRResult[] = [];

  for (const ex of exercises) {
    const history = buildHistory(ex.historicalSessions);
    const prs = detectPRs(ex.exerciseId, ex.exerciseName, ex.sessionSets, history);
    allPRs.push(...prs);
  }

  return allPRs;
}
