/**
 * Substitution Candidate Selector — Task 7.1
 *
 * Deterministic scoring function that ranks replacement exercises for a given
 * target exercise based on pattern, muscle group, and equipment similarity,
 * while respecting user constraints (avoid list, injury flags, equipment).
 *
 * Scoring rubric:
 *   +100  exact movement pattern match
 *   +50   pattern in same functional category (push/pull/hinge/leg)
 *   +10   per overlapping muscle group
 *   +20   same exercise type (equipment category)
 *   -50   recently used (penalized, not excluded)
 *
 * Exclusions (never returned):
 *   - source exercise itself
 *   - in avoidExerciseIds list
 *   - requires equipment not in availableEquipmentTags
 *   - HIGH joint stress on an injured joint
 */

import type {
  ExerciseInfo,
  SubstitutionConstraints,
  SubstitutionCandidate,
} from './types';

// =============================================================================
// PATTERN CATEGORY HELPERS
// =============================================================================

const PUSH_PATTERNS = new Set([
  'HORIZONTAL_PUSH',
  'VERTICAL_PUSH',
]);

const PULL_PATTERNS = new Set([
  'HORIZONTAL_PULL',
  'VERTICAL_PULL',
]);

const LEG_PATTERNS = new Set(['SQUAT', 'LUNGE', 'HIP_HINGE']);

function samePatternCategory(a: string, b: string): boolean {
  if (PUSH_PATTERNS.has(a) && PUSH_PATTERNS.has(b)) return true;
  if (PULL_PATTERNS.has(a) && PULL_PATTERNS.has(b)) return true;
  if (LEG_PATTERNS.has(a) && LEG_PATTERNS.has(b)) return true;
  return false;
}

// =============================================================================
// SCORING FUNCTION
// =============================================================================

/**
 * Scores a single candidate exercise against a target.
 * Returns null if the candidate should be excluded entirely.
 */
export function scoreSubstitutionCandidate(
  target: ExerciseInfo,
  candidate: ExerciseInfo,
  constraints: SubstitutionConstraints = {}
): { score: number; reasons: string[] } | null {
  const {
    avoidExerciseIds = [],
    recentlyUsedIds = [],
    injuryFlags = {},
    availableEquipmentTags,
    excludeExerciseId,
  } = constraints;

  // Always exclude the source exercise
  if (candidate.id === excludeExerciseId || candidate.id === target.id) {
    return null;
  }

  // Exclude if in avoid list
  if (avoidExerciseIds.includes(candidate.id)) return null;

  // Exclude if required equipment is unavailable
  if (availableEquipmentTags && availableEquipmentTags.length > 0) {
    const requiresUnavailableGear = candidate.equipmentTags.some(
      (tag) => !availableEquipmentTags.includes(tag)
    );
    if (requiresUnavailableGear) return null;
  }

  // Exclude if candidate has HIGH joint stress on an injured joint
  for (const [joint, injurySeverity] of Object.entries(injuryFlags)) {
    if (injurySeverity && candidate.jointStressFlags[joint] === 'high') {
      return null;
    }
  }

  let score = 0;
  const reasons: string[] = [];

  // +100 exact pattern match, +50 same category
  if (candidate.pattern === target.pattern) {
    score += 100;
    reasons.push('Same movement pattern');
  } else if (samePatternCategory(candidate.pattern, target.pattern)) {
    score += 50;
    reasons.push('Similar movement category');
  }

  // +10 per overlapping muscle group
  const targetMuscles = new Set(target.muscleGroups);
  const overlapping = candidate.muscleGroups.filter((m) => targetMuscles.has(m));
  if (overlapping.length > 0) {
    score += overlapping.length * 10;
    const display = overlapping.slice(0, 2).map((m) => m.replace(/_/g, ' ')).join(', ');
    reasons.push(`Targets ${display}${overlapping.length > 2 ? ' +more' : ''}`);
  }

  // +20 same equipment type
  if (candidate.type === target.type) {
    score += 20;
    reasons.push('Same equipment type');
  }

  // -50 recently used (de-prioritize, don't exclude)
  if (recentlyUsedIds.includes(candidate.id)) {
    score -= 50;
    reasons.push('Recently used');
  }

  // Require at least some relevance (positive score)
  if (score <= 0) return null;

  return { score, reasons };
}

// =============================================================================
// RANKING FUNCTION
// =============================================================================

/**
 * Ranks all candidate exercises for substituting the target.
 * Returns candidates ordered by score descending, up to `limit`.
 *
 * Acceptance Criteria (Task 7.1):
 * - Given an exercise + constraints, returns ordered candidates.
 */
export function rankSubstitutionCandidates(
  target: ExerciseInfo,
  candidates: ExerciseInfo[],
  constraints: SubstitutionConstraints = {},
  limit = 10
): SubstitutionCandidate[] {
  const scored: SubstitutionCandidate[] = [];

  for (const candidate of candidates) {
    const result = scoreSubstitutionCandidate(target, candidate, constraints);
    if (result !== null) {
      scored.push({ exercise: candidate, ...result });
    }
  }

  // Sort by score descending; alphabetical for ties
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.exercise.name.localeCompare(b.exercise.name);
  });

  return scored.slice(0, limit);
}
