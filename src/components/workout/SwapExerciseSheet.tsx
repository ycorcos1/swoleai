'use client';

/**
 * SwapExerciseSheet — Task 7.2
 *
 * A bottom sheet that shows ranked substitution candidates for a given exercise,
 * powered by the deterministic substitution engine (Task 7.1).
 *
 * Features:
 * - Calls GET /api/rules/substitutions?exerciseId= on open
 * - Displays candidates ordered by score with match reasons
 * - Score pill color: green ≥130, yellow ≥80, gray otherwise
 * - Selecting a candidate calls onSwap(newExerciseId, newExerciseName)
 */

import { useState, useEffect, useCallback } from 'react';
import { X, ArrowLeftRight, Dumbbell, Loader2, CheckCircle2 } from 'lucide-react';
import type { SubstitutionCandidate, ExerciseInfo } from '@/lib/rules/types';

// =============================================================================
// TYPES
// =============================================================================

export interface SwapExerciseSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback to close the sheet */
  onClose: () => void;
  /** The exercise being replaced */
  targetExerciseId: string;
  targetExerciseName: string;
  /**
   * Callback fired when the user selects a substitute.
   * Returns true if the swap succeeded, false if it should keep the sheet open.
   */
  onSwap: (newExerciseId: string, newExerciseName: string) => Promise<void>;
}

// =============================================================================
// SCORE PILL
// =============================================================================

function ScorePill({ score }: { score: number }) {
  const colorClass =
    score >= 130
      ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
      : score >= 80
      ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
      : 'bg-[var(--color-base-600)] text-[var(--color-text-muted)]';

  return (
    <span
      className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${colorClass}`}
    >
      {score}
    </span>
  );
}

// =============================================================================
// CANDIDATE ROW
// =============================================================================

interface CandidateRowProps {
  candidate: SubstitutionCandidate;
  isSwapping: boolean;
  onSelect: (candidate: SubstitutionCandidate) => void;
}

function CandidateRow({ candidate, isSwapping, onSelect }: CandidateRowProps) {
  const { exercise, score, reasons } = candidate;

  return (
    <button
      type="button"
      onClick={() => onSelect(candidate)}
      disabled={isSwapping}
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.99]
        ${isSwapping
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-[var(--color-base-700)] active:bg-[var(--color-base-600)]'
        }
      `}
      aria-label={`Swap to ${exercise.name}`}
    >
      {/* Icon */}
      <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-base-600)]">
        <Dumbbell className="h-5 w-5 text-[var(--color-text-muted)]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-[var(--color-text-primary)] truncate">
          {exercise.name}
        </p>
        {reasons.length > 0 && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
            {reasons.filter((r) => !r.includes('Recently used')).slice(0, 2).join(' · ')}
          </p>
        )}
      </div>

      {/* Score */}
      <ScorePill score={score} />
    </button>
  );
}

// =============================================================================
// SECTION HEADER
// =============================================================================

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="sticky top-0 px-4 py-2 bg-[var(--color-base-800)] border-b border-[var(--glass-border)] z-10">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </span>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SwapExerciseSheet({
  isOpen,
  onClose,
  targetExerciseId,
  targetExerciseName,
  onSwap,
}: SwapExerciseSheetProps) {
  const [candidates, setCandidates] = useState<SubstitutionCandidate[]>([]);
  const [target, setTarget] = useState<ExerciseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch substitution candidates when sheet opens
  useEffect(() => {
    if (!isOpen || !targetExerciseId) return;

    setIsLoading(true);
    setError(null);
    setCandidates([]);

    fetch(`/api/rules/substitutions?exerciseId=${encodeURIComponent(targetExerciseId)}&limit=15`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load substitutions');
        return r.json();
      })
      .then((data) => {
        setCandidates(data.candidates ?? []);
        setTarget(data.target ?? null);
      })
      .catch(() => {
        setError('Could not load substitute exercises. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, targetExerciseId]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setSwappingId(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    async (candidate: SubstitutionCandidate) => {
      if (swappingId) return;

      setSwappingId(candidate.exercise.id);
      try {
        await onSwap(candidate.exercise.id, candidate.exercise.name);
        onClose();
      } catch {
        setError('Swap failed. Please try again.');
      } finally {
        setSwappingId(null);
      }
    },
    [swappingId, onSwap, onClose]
  );

  if (!isOpen) return null;

  // Partition into strong matches (score ≥ 80) and other matches
  const strongMatches = candidates.filter((c) => c.score >= 80);
  const otherMatches = candidates.filter((c) => c.score < 80);

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
        <div
          className="bg-[var(--color-base-800)] border-t border-[var(--glass-border)] rounded-t-3xl shadow-2xl safe-area-bottom"
          style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-[var(--color-base-500)]" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between px-5 pb-3 flex-shrink-0 gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-[var(--color-accent-purple)] shrink-0" />
                Swap Exercise
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5 truncate">
                Replacing: <span className="text-[var(--color-text-secondary)] font-medium">{targetExerciseName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-[var(--color-text-secondary)]" />
            </button>
          </div>

          {/* Score legend */}
          {!isLoading && candidates.length > 0 && (
            <div className="px-5 pb-2 flex-shrink-0 flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-success)]" />
                Best match
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-warning)]" />
                Good match
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-base-500)]" />
                Partial match
              </span>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent-purple)]" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                <p className="text-sm text-[var(--color-error)]">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setIsLoading(true);
                    fetch(
                      `/api/rules/substitutions?exerciseId=${encodeURIComponent(targetExerciseId)}&limit=15`
                    )
                      .then((r) => r.json())
                      .then((d) => {
                        setCandidates(d.candidates ?? []);
                        setTarget(d.target ?? null);
                      })
                      .catch(() => setError('Could not load substitutions.'))
                      .finally(() => setIsLoading(false));
                  }}
                  className="text-sm text-[var(--color-accent-purple)] underline"
                >
                  Try again
                </button>
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-[var(--color-text-muted)] mb-3" />
                <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  No substitutes found
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Try adjusting your equipment or constraint settings.
                </p>
              </div>
            ) : (
              <>
                {/* Strong matches */}
                {strongMatches.length > 0 && (
                  <section>
                    <SectionHeader label="Best Matches" />
                    {strongMatches.map((c) => (
                      <CandidateRow
                        key={c.exercise.id}
                        candidate={c}
                        isSwapping={swappingId !== null}
                        onSelect={handleSelect}
                      />
                    ))}
                  </section>
                )}

                {/* Other matches */}
                {otherMatches.length > 0 && (
                  <section>
                    <SectionHeader
                      label={strongMatches.length > 0 ? 'Other Options' : 'Substitutes'}
                    />
                    {otherMatches.map((c) => (
                      <CandidateRow
                        key={c.exercise.id}
                        candidate={c}
                        isSwapping={swappingId !== null}
                        onSelect={handleSelect}
                      />
                    ))}
                  </section>
                )}

                {/* Target info footer */}
                {target && (
                  <div className="px-4 py-3 border-t border-[var(--glass-border)] mt-2">
                    <p className="text-[11px] text-[var(--color-text-muted)] text-center">
                      Matching for: {target.pattern.replace(/_/g, ' ').toLowerCase()} ·{' '}
                      {(target.muscleGroups as string[]).slice(0, 2).join(', ')}
                    </p>
                  </div>
                )}

                <div className="h-6" />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
