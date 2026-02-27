/**
 * Shared types for the Rules Engine — Phase 7
 *
 * Contains data-transfer types used by both lib logic and API routes.
 * All pure TypeScript (no Prisma imports) so they work on both client and server.
 */

// =============================================================================
// SUBSTITUTION TYPES (Task 7.1)
// =============================================================================

export interface ExerciseInfo {
  id: string;
  name: string;
  type: string;
  pattern: string;
  muscleGroups: string[];
  equipmentTags: string[];
  jointStressFlags: Record<string, string>;
  isCustom: boolean;
}

export interface SubstitutionConstraints {
  /** Exercise IDs to avoid (user's avoid list + injuries) */
  avoidExerciseIds?: string[];
  /** Exercise IDs recently used (penalized but not excluded) */
  recentlyUsedIds?: string[];
  /** Injury joint keys → severity; HIGH stress excluded, MEDIUM penalized */
  injuryFlags?: Record<string, string>;
  /** Available equipment tags; candidate is excluded if it needs unavailable gear */
  availableEquipmentTags?: string[];
  /** Exclude the source exercise itself */
  excludeExerciseId?: string;
}

export interface SubstitutionCandidate {
  exercise: ExerciseInfo;
  score: number;
  reasons: string[];
}

// =============================================================================
// PROGRESSION TYPES (Task 7.3)
// =============================================================================

export interface SetPerformance {
  weight: number;
  reps: number;
  rpe?: number | null;
  flags?: {
    warmup?: boolean;
    backoff?: boolean;
    dropset?: boolean;
    failure?: boolean;
  } | null;
}

export interface ExposureResult {
  sessionDate: Date;
  sets: SetPerformance[];
}

export interface ProgressionTarget {
  suggestedWeight: number;
  suggestedRepMin: number;
  suggestedRepMax: number;
  engine: string;
  rationale: string;
  isReadyForProgression: boolean;
}

// =============================================================================
// PR DETECTION TYPES (Task 7.4)
// =============================================================================

export type PRType = 'REP_PR' | 'LOAD_PR' | 'E1RM_PR' | 'VOLUME_PR';

export interface PRResult {
  type: PRType;
  exerciseId: string;
  exerciseName: string;
  newValue: number;
  previousBest: number | null;
  label: string;
  unit: string;
}

// =============================================================================
// VOLUME TYPES (Task 7.5)
// =============================================================================

export interface MuscleGroupVolume {
  muscleGroup: string;
  weeklyWorkingSets: number;
  recommendedMin: number;
  recommendedMax: number;
  status: 'low' | 'optimal' | 'high';
}

export interface VolumeWarning {
  type:
    | 'push_pull_imbalance'
    | 'quad_ham_imbalance'
    | 'neglected_muscle'
    | 'overreached_muscle';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface VolumeReport {
  weekStart: Date;
  weekEnd: Date;
  muscleGroups: MuscleGroupVolume[];
  warnings: VolumeWarning[];
}

// =============================================================================
// PLATEAU TYPES (Task 7.6)
// =============================================================================

export interface PlateauCandidate {
  exerciseId: string;
  exerciseName: string;
  exposuresAnalyzed: number;
  lastWeight: number;
  lastReps: number;
  avgRpe: number | null;
  plateauType: 'weight_stalled' | 'reps_stalled' | 'both_stalled';
  severity: 'mild' | 'moderate' | 'severe';
  message: string;
}

// =============================================================================
// DELOAD TYPES (Task 7.7)
// =============================================================================

export interface DeloadAdjustment {
  exerciseId: string;
  exerciseName: string;
  /** Multiplier for current working weight (e.g. 0.7 = 70%) */
  suggestedWeightMultiplier: number;
  /** Multiplier for current rep count (e.g. 0.8 = 80%) */
  suggestedRepsMultiplier: number;
  /** Multiplier for planned set count (e.g. 0.6 = 60%) */
  suggestedSetsMultiplier: number;
  rationale: string;
}

export interface DeloadRecommendation {
  type: 'full_deload' | 'partial_deload' | 'low_energy_day' | 'none';
  trigger: string;
  adjustments: DeloadAdjustment[];
  durationDays: number;
  message: string;
}
