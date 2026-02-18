'use client';

/**
 * SetLoggerSheet — Task 5.3 + Task 5.4 + Task 5.6
 *
 * A modal/sheet component for logging and editing sets during a workout.
 *
 * Features (per Design Spec 5.3.2):
 * - Big steppers for weight/reps (gym-first UX)
 * - Optional RPE selector
 * - Flag toggles: warmup / backoff / drop / failure (Task 5.6)
 * - Writes to IndexedDB immediately for instant UI updates
 * - Queues sync mutation for background server sync
 * - Edit mode: update previously logged sets (Task 5.4)
 *
 * Layout:
 * - Exercise name header
 * - Previous sets summary (if any)
 * - Weight stepper (large touch targets)
 * - Reps stepper (large touch targets)
 * - Flag toggles (large touch targets)
 * - Log Set / Update Set button (primary CTA)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  Check,
  Loader2,
  Edit3,
  Flame,
  TrendingDown,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import type { ActiveSessionExercise, ActiveSessionSet } from '@/lib/offline';

// =============================================================================
// TYPES
// =============================================================================

export interface SetLoggerSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback to close the sheet */
  onClose: () => void;
  /** The exercise to log sets for */
  exercise: ActiveSessionExercise;
  /** Callback to log a new set */
  onLogSet: (
    exerciseLocalId: string,
    set: Omit<ActiveSessionSet, 'setIndex' | 'loggedAt'>
  ) => Promise<void>;
  /** Callback to update an existing set (Task 5.4) */
  onUpdateSet?: (
    exerciseLocalId: string,
    setLocalId: string,
    updates: Partial<Omit<ActiveSessionSet, 'localId'>>
  ) => Promise<void>;
  /** Set to edit (if provided, sheet opens in edit mode) (Task 5.4) */
  editingSet?: ActiveSessionSet;
}

interface StepperProps {
  /** Current value */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Label for the stepper */
  label: string;
  /** Step increment for small changes */
  smallStep?: number;
  /** Step increment for large changes */
  largeStep?: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Unit suffix (e.g., "lbs", "reps") */
  unit?: string;
}

// =============================================================================
// SET FLAG TYPES (Task 5.6)
// =============================================================================

export type SetFlagKey = 'warmup' | 'backoff' | 'dropset' | 'failure';

interface SetFlags {
  warmup?: boolean;
  backoff?: boolean;
  dropset?: boolean;
  failure?: boolean;
}

interface FlagToggleConfig {
  key: SetFlagKey;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  activeColor: string;
  activeBg: string;
}

const FLAG_CONFIGS: FlagToggleConfig[] = [
  {
    key: 'warmup',
    label: 'Warmup',
    shortLabel: 'W',
    icon: <Flame className="h-4 w-4" />,
    activeColor: 'text-[var(--color-info)]',
    activeBg: 'bg-[var(--color-info)]/20 border-[var(--color-info)]/50',
  },
  {
    key: 'backoff',
    label: 'Backoff',
    shortLabel: 'B',
    icon: <TrendingDown className="h-4 w-4" />,
    activeColor: 'text-[var(--color-accent-blue)]',
    activeBg: 'bg-[var(--color-accent-blue)]/20 border-[var(--color-accent-blue)]/50',
  },
  {
    key: 'dropset',
    label: 'Drop',
    shortLabel: 'D',
    icon: <Zap className="h-4 w-4" />,
    activeColor: 'text-[var(--color-warning)]',
    activeBg: 'bg-[var(--color-warning)]/20 border-[var(--color-warning)]/50',
  },
  {
    key: 'failure',
    label: 'Failure',
    shortLabel: 'F',
    icon: <AlertTriangle className="h-4 w-4" />,
    activeColor: 'text-[var(--color-error)]',
    activeBg: 'bg-[var(--color-error)]/20 border-[var(--color-error)]/50',
  },
];

// =============================================================================
// FLAG TOGGLES COMPONENT (Task 5.6)
// =============================================================================

/**
 * Flag toggle buttons for set types: warmup, backoff, drop set, failure
 * Designed with large touch targets for gym use
 */
function FlagToggles({
  flags,
  onToggle,
}: {
  flags: SetFlags;
  onToggle: (key: SetFlagKey) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
        Flags
      </span>
      <div className="flex items-center gap-2">
        {FLAG_CONFIGS.map((config) => {
          const isActive = !!flags[config.key];
          return (
            <button
              key={config.key}
              type="button"
              onClick={() => onToggle(config.key)}
              className={`
                flex flex-col items-center justify-center gap-1 h-14 min-w-[64px] px-3 rounded-xl border transition-all active:scale-95
                ${
                  isActive
                    ? `${config.activeBg} ${config.activeColor}`
                    : 'bg-[var(--color-base-600)] border-transparent text-[var(--color-text-muted)]'
                }
              `}
              aria-label={`${isActive ? 'Remove' : 'Add'} ${config.label} flag`}
              aria-pressed={isActive}
            >
              {config.icon}
              <span className="text-[10px] font-semibold uppercase">
                {config.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// STEPPER COMPONENT
// =============================================================================

/**
 * Big stepper component optimized for gym use
 * Large touch targets for easy use with sweaty fingers
 */
function Stepper({
  value,
  onChange,
  label,
  smallStep = 1,
  largeStep = 5,
  min = 0,
  max = 9999,
  unit,
}: StepperProps) {
  const decrement = useCallback(
    (step: number) => {
      onChange(Math.max(min, value - step));
    },
    [onChange, value, min]
  );

  const increment = useCallback(
    (step: number) => {
      onChange(Math.min(max, value + step));
    },
    [onChange, value, max]
  );

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Label */}
      <span className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
        {label}
      </span>

      {/* Main stepper row */}
      <div className="flex items-center gap-2">
        {/* Large decrement */}
        <button
          type="button"
          onClick={() => decrement(largeStep)}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-base-600)] active:scale-95 transition-transform"
          aria-label={`Decrease ${label} by ${largeStep}`}
        >
          <div className="flex flex-col items-center">
            <Minus className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {largeStep}
            </span>
          </div>
        </button>

        {/* Small decrement */}
        <button
          type="button"
          onClick={() => decrement(smallStep)}
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-base-600)] active:scale-95 transition-transform"
          aria-label={`Decrease ${label} by ${smallStep}`}
        >
          <ChevronDown className="h-6 w-6 text-[var(--color-text-primary)]" />
        </button>

        {/* Value display */}
        <div className="flex flex-col items-center justify-center min-w-[100px] h-20 px-4 rounded-xl bg-[var(--color-base-700)] border border-[var(--glass-border)]">
          <span className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">
            {value}
          </span>
          {unit && (
            <span className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {unit}
            </span>
          )}
        </div>

        {/* Small increment */}
        <button
          type="button"
          onClick={() => increment(smallStep)}
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-base-600)] active:scale-95 transition-transform"
          aria-label={`Increase ${label} by ${smallStep}`}
        >
          <ChevronUp className="h-6 w-6 text-[var(--color-text-primary)]" />
        </button>

        {/* Large increment */}
        <button
          type="button"
          onClick={() => increment(largeStep)}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-base-600)] active:scale-95 transition-transform"
          aria-label={`Increase ${label} by ${largeStep}`}
        >
          <div className="flex flex-col items-center">
            <Plus className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {largeStep}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// SET LOGGER SHEET COMPONENT
// =============================================================================

export function SetLoggerSheet({
  isOpen,
  onClose,
  exercise,
  onLogSet,
  onUpdateSet,
  editingSet,
}: SetLoggerSheetProps) {
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [flags, setFlags] = useState<SetFlags>({});
  const [isLogging, setIsLogging] = useState(false);

  // Determine if we're in edit mode (Task 5.4)
  const isEditMode = !!editingSet;

  // Get the last logged set for this exercise to pre-fill values (for new sets only)
  const lastSet = useMemo(() => {
    if (exercise.sets.length === 0) return null;
    return exercise.sets[exercise.sets.length - 1];
  }, [exercise.sets]);

  // Pre-fill values when opening
  // In edit mode: use the editing set's values
  // In new set mode: use the last set's values (or defaults)
  useEffect(() => {
    if (isOpen) {
      if (editingSet) {
        // Edit mode: pre-fill with the set being edited
        setWeight(editingSet.weight);
        setReps(editingSet.reps);
        setFlags(editingSet.flags ?? {});
      } else if (lastSet) {
        // New set mode: pre-fill from last set
        setWeight(lastSet.weight);
        setReps(lastSet.reps);
        // Don't carry flags from last set — flags are per-set intent
        setFlags({});
      } else {
        // No previous set - reset to defaults
        setWeight(0);
        setReps(0);
        setFlags({});
      }
    }
  }, [isOpen, lastSet, editingSet]);

  // Toggle a flag on or off (Task 5.6)
  const handleToggleFlag = useCallback((key: SetFlagKey) => {
    setFlags((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Generate unique local ID for the set
  const generateLocalId = useCallback(() => {
    return `set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Clean flags object: remove false values so we only store true flags
  const cleanFlags = useCallback((f: SetFlags): SetFlags | undefined => {
    const cleaned: SetFlags = {};
    let hasAny = false;
    if (f.warmup) { cleaned.warmup = true; hasAny = true; }
    if (f.backoff) { cleaned.backoff = true; hasAny = true; }
    if (f.dropset) { cleaned.dropset = true; hasAny = true; }
    if (f.failure) { cleaned.failure = true; hasAny = true; }
    return hasAny ? cleaned : undefined;
  }, []);

  // Handle logging a new set
  const handleLogSet = useCallback(async () => {
    if (isLogging) return;

    setIsLogging(true);
    try {
      await onLogSet(exercise.localId, {
        localId: generateLocalId(),
        weight,
        reps,
        flags: cleanFlags(flags),
      });

      // Success - close the sheet
      onClose();
    } catch (error) {
      console.error('Failed to log set:', error);
      // Keep sheet open on error so user can retry
    } finally {
      setIsLogging(false);
    }
  }, [exercise.localId, weight, reps, flags, onLogSet, onClose, generateLocalId, isLogging, cleanFlags]);

  // Handle updating an existing set (Task 5.4)
  const handleUpdateSet = useCallback(async () => {
    if (isLogging || !editingSet || !onUpdateSet) return;

    setIsLogging(true);
    try {
      await onUpdateSet(exercise.localId, editingSet.localId, {
        weight,
        reps,
        flags: cleanFlags(flags),
      });

      // Success - close the sheet
      onClose();
    } catch (error) {
      console.error('Failed to update set:', error);
      // Keep sheet open on error so user can retry
    } finally {
      setIsLogging(false);
    }
  }, [exercise.localId, editingSet, weight, reps, flags, onUpdateSet, onClose, isLogging, cleanFlags]);

  // Combined submit handler
  const handleSubmit = useCallback(() => {
    if (isEditMode) {
      handleUpdateSet();
    } else {
      handleLogSet();
    }
  }, [isEditMode, handleUpdateSet, handleLogSet]);

  // Don't render if not open
  if (!isOpen) return null;

  // Previous sets summary (exclude the set being edited in edit mode)
  const previousSetsSummary = exercise.sets
    .filter((s) => s.weight > 0 || s.reps > 0)
    .filter((s) => !editingSet || s.localId !== editingSet.localId)
    .map((s) => `${s.weight}×${s.reps}`)
    .join(' / ');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[60] animate-in slide-in-from-bottom duration-300">
        <div className="bg-[var(--color-base-800)] border-t border-[var(--glass-border)] rounded-t-3xl shadow-2xl safe-area-bottom">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-[var(--color-base-500)]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold truncate">
                  {exercise.exerciseName}
                </h2>
                {isEditMode && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)]">
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                {isEditMode ? (
                  <>Set {(editingSet?.setIndex ?? 0) + 1}</>
                ) : (
                  <>Set {exercise.sets.length + 1}</>
                )}
                {previousSetsSummary && (
                  <span className="ml-2 tabular-nums">
                    • {isEditMode ? 'Other sets' : 'Previous'}: {previousSetsSummary}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-[var(--color-text-secondary)]" />
            </button>
          </div>

          {/* Steppers */}
          <div className="px-5 pb-6 space-y-6">
            {/* Weight Stepper */}
            <Stepper
              value={weight}
              onChange={setWeight}
              label="Weight"
              smallStep={2.5}
              largeStep={10}
              min={0}
              max={9999}
              unit="lbs"
            />

            {/* Reps Stepper */}
            <Stepper
              value={reps}
              onChange={setReps}
              label="Reps"
              smallStep={1}
              largeStep={5}
              min={0}
              max={999}
            />

            {/* Flag Toggles (Task 5.6) */}
            <FlagToggles flags={flags} onToggle={handleToggleFlag} />
          </div>

          {/* Log/Update Set Button */}
          <div className="px-5 pb-6">
            <button
              onClick={handleSubmit}
              disabled={isLogging || (weight === 0 && reps === 0)}
              className="w-full btn-primary h-14 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLogging ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Logging...'}
                </>
              ) : (
                <>
                  {isEditMode ? (
                    <>
                      <Edit3 className="h-5 w-5" />
                      Update Set
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Log Set
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
