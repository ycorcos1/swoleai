'use client';

/**
 * SetLoggerSheet — Task 5.3
 *
 * A modal/sheet component for logging sets during a workout.
 *
 * Features (per Design Spec 5.3.2):
 * - Big steppers for weight/reps (gym-first UX)
 * - Optional RPE selector
 * - Writes to IndexedDB immediately for instant UI updates
 * - Queues sync mutation for background server sync
 *
 * Layout:
 * - Exercise name header
 * - Previous sets summary (if any)
 * - Weight stepper (large touch targets)
 * - Reps stepper (large touch targets)
 * - Log Set button (primary CTA)
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
  /** Callback to log a set */
  onLogSet: (
    exerciseLocalId: string,
    set: Omit<ActiveSessionSet, 'setIndex' | 'loggedAt'>
  ) => Promise<void>;
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
}: SetLoggerSheetProps) {
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [isLogging, setIsLogging] = useState(false);

  // Get the last logged set for this exercise to pre-fill values
  const lastSet = useMemo(() => {
    if (exercise.sets.length === 0) return null;
    return exercise.sets[exercise.sets.length - 1];
  }, [exercise.sets]);

  // Pre-fill from last set when opening
  useEffect(() => {
    if (isOpen && lastSet) {
      setWeight(lastSet.weight);
      setReps(lastSet.reps);
    } else if (isOpen && !lastSet) {
      // Reset to defaults if no previous set
      setWeight(0);
      setReps(0);
    }
  }, [isOpen, lastSet]);

  // Generate unique local ID for the set
  const generateLocalId = useCallback(() => {
    return `set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Handle logging a set
  const handleLogSet = useCallback(async () => {
    if (isLogging) return;

    setIsLogging(true);
    try {
      await onLogSet(exercise.localId, {
        localId: generateLocalId(),
        weight,
        reps,
      });

      // Success - close the sheet
      onClose();
    } catch (error) {
      console.error('Failed to log set:', error);
      // Keep sheet open on error so user can retry
    } finally {
      setIsLogging(false);
    }
  }, [exercise.localId, weight, reps, onLogSet, onClose, generateLocalId, isLogging]);

  // Don't render if not open
  if (!isOpen) return null;

  // Previous sets summary
  const previousSetsSummary = exercise.sets
    .filter((s) => s.weight > 0 || s.reps > 0)
    .map((s) => `${s.weight}×${s.reps}`)
    .join(' / ');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-[var(--color-base-800)] border-t border-[var(--glass-border)] rounded-t-3xl shadow-2xl safe-area-bottom">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-[var(--color-base-500)]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">
                {exercise.exerciseName}
              </h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Set {exercise.sets.length + 1}
                {previousSetsSummary && (
                  <span className="ml-2 tabular-nums">
                    • Previous: {previousSetsSummary}
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
          </div>

          {/* Log Set Button */}
          <div className="px-5 pb-6">
            <button
              onClick={handleLogSet}
              disabled={isLogging || (weight === 0 && reps === 0)}
              className="w-full btn-primary h-14 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLogging ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Log Set
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
