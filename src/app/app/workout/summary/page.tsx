'use client';

/**
 * Workout Summary Screen (Task 5.10)
 *
 * Shown after the user ends a workout session.
 * Reads the last completed workout snapshot from IndexedDB (`completedWorkout` table).
 *
 * Sections (per Design Spec 5.4):
 * - Header: checkmark badge, session name, completion timestamp
 * - Stats row: duration · total sets · total volume
 * - Exercise breakdown: exercise name + logged sets
 * - Buttons: Generate Next Session Plan (CTA) · Done (→ dashboard)
 */

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, type CompletedWorkoutSummary } from '@/lib/offline/db';
import { GlassCard } from '@/components/ui/GlassCard';
import type { PRResult } from '@/lib/rules/types';
import {
  CheckCircle2,
  Clock,
  Dumbbell,
  TrendingUp,
  Loader2,
  LayoutDashboard,
  Sparkles,
  Trophy,
} from 'lucide-react';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format duration in seconds → "Xh Ym" or "Ym Zs"
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (remainingSeconds > 0 && minutes < 10) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${minutes}m`;
}

/**
 * Format a number as a weight string (e.g. 12345 → "12,345")
 */
function formatVolume(volume: number): string {
  return volume.toLocaleString();
}

/**
 * Format the ended-at date as a readable string
 */
function formatCompletedAt(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatBadge({ icon, label, value }: StatBadgeProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-base-600)]">
        {icon}
      </div>
      <span className="text-lg font-bold tabular-nums">{value}</span>
      <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

interface ExerciseSummaryCardProps {
  name: string;
  sets: CompletedWorkoutSummary['exercises'][number]['sets'];
  exerciseIndex: number;
}

function ExerciseSummaryCard({ name, sets, exerciseIndex }: ExerciseSummaryCardProps) {
  const loggedSets = sets.filter((s) => s.weight > 0 || s.reps > 0);

  // Find best set (highest weight × reps)
  const bestSet =
    loggedSets.length > 0
      ? loggedSets.reduce((best, current) =>
          current.weight * current.reps > (best?.weight ?? 0) * (best?.reps ?? 0)
            ? current
            : best
        , loggedSets[0])
      : null;

  return (
    <div className="glass-card p-4">
      {/* Exercise header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] shrink-0">
          <span className="text-[10px] font-bold text-white">{exerciseIndex + 1}</span>
        </div>
        <h3 className="font-semibold truncate flex-1">{name}</h3>
        {bestSet && (
          <span className="flex items-center gap-1 text-xs text-[var(--color-accent-purple)] shrink-0">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="tabular-nums font-medium">
              {bestSet.weight}×{bestSet.reps}
            </span>
          </span>
        )}
      </div>

      {/* Sets grid */}
      {loggedSets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {sets.map((set, idx) => (
            <div
              key={set.localId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-base-600)]"
            >
              <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
                {idx + 1}
              </span>
              <span className="text-sm font-medium tabular-nums text-[var(--color-text-primary)]">
                {set.weight}×{set.reps}
              </span>
              {/* Flag badges */}
              {set.flags?.warmup && (
                <span className="text-[8px] font-medium uppercase px-1 py-0.5 rounded bg-[var(--color-info)]/20 text-[var(--color-info)]">
                  W
                </span>
              )}
              {set.flags?.backoff && (
                <span className="text-[8px] font-medium uppercase px-1 py-0.5 rounded bg-[var(--color-accent-blue)]/20 text-[var(--color-accent-blue)]">
                  B
                </span>
              )}
              {set.flags?.dropset && (
                <span className="text-[8px] font-medium uppercase px-1 py-0.5 rounded bg-[var(--color-warning)]/20 text-[var(--color-warning)]">
                  D
                </span>
              )}
              {set.flags?.failure && (
                <span className="text-[8px] font-medium uppercase px-1 py-0.5 rounded bg-[var(--color-error)]/20 text-[var(--color-error)]">
                  F
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">No sets logged</p>
      )}
    </div>
  );
}

// =============================================================================
// PR BADGE COMPONENT (Task 7.4)
// =============================================================================

const PR_TYPE_CONFIG: Record<
  PRResult['type'],
  { label: string; color: string; bg: string }
> = {
  LOAD_PR:   { label: 'Load PR',     color: 'text-[var(--color-warning)]',       bg: 'bg-[var(--color-warning)]/10' },
  REP_PR:    { label: 'Rep PR',      color: 'text-[var(--color-accent-purple)]', bg: 'bg-[var(--color-accent-purple)]/10' },
  E1RM_PR:   { label: 'e1RM PR',     color: 'text-[var(--color-success)]',       bg: 'bg-[var(--color-success)]/10' },
  VOLUME_PR: { label: 'Volume PR',   color: 'text-[var(--color-accent-blue)]',   bg: 'bg-[var(--color-accent-blue)]/10' },
};

function PRBadge({ pr }: { pr: PRResult }) {
  const cfg = PR_TYPE_CONFIG[pr.type];
  return (
    <div
      className={`flex flex-col gap-0.5 px-3 py-2 rounded-xl border border-[var(--glass-border)] ${cfg.bg}`}
    >
      <div className="flex items-center gap-1.5">
        <Trophy className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>
      <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate max-w-[140px]">
        {pr.exerciseName}
      </p>
      <p className="text-[11px] text-[var(--color-text-muted)]">
        {pr.newValue} {pr.unit}
        {pr.previousBest !== null && (
          <span className="ml-1">
            (was {pr.previousBest})
          </span>
        )}
      </p>
    </div>
  );
}

// =============================================================================
// EMPTY / ERROR STATES
// =============================================================================

function NoSummaryState() {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <Dumbbell className="h-16 w-16 text-[var(--color-text-muted)] mb-4" />
      <h1 className="text-xl font-bold mb-2">No Workout Found</h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Complete a workout to see your summary here.
      </p>
      <button onClick={() => router.replace('/app/workout/start')} className="btn-primary">
        Start Workout
      </button>
    </div>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function WorkoutSummaryPage() {
  const router = useRouter();

  // Reactive read from IndexedDB — updates automatically if the record changes.
  // useLiveQuery returns `undefined` while the query is still running on first mount,
  // then returns the record (or undefined if none). We use a separate loading flag.
  const rawSummary = useLiveQuery(
    () => db.completedWorkout.get('last'),
    []
  );
  // Cast to typed value: undefined while loading OR no record
  const summary = rawSummary as CompletedWorkoutSummary | undefined;

  // useLiveQuery returns `undefined` initially (loading) AND when no record exists.
  // We track mount state to show a spinner briefly on first render.
  const [hasResolved, setHasResolved] = React.useState(false);
  React.useEffect(() => {
    if (rawSummary !== undefined || hasResolved) {
      setHasResolved(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSummary]);

  // PR detection (Task 7.4) — fetch from server when serverSessionId is available
  const [prs, setPrs] = React.useState<PRResult[]>([]);
  const [prsLoading, setPrsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!summary?.serverSessionId) return;

    let cancelled = false;
    setPrsLoading(true);

    fetch('/api/rules/prs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: summary.serverSessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.prs)) {
          setPrs(data.prs as PRResult[]);
        }
      })
      .catch(() => {
        // Silently ignore — PR display is non-critical
      })
      .finally(() => {
        if (!cancelled) setPrsLoading(false);
      });

    return () => { cancelled = true; };
  }, [summary?.serverSessionId]);

  // Sort exercises by their orderIndex for consistent display
  const sortedExercises = summary?.exercises
    ? [...summary.exercises].sort((a, b) => a.orderIndex - b.orderIndex)
    : [];

  // =============================================================================
  // LOADING STATE (brief — only on initial mount before Dexie resolves)
  // =============================================================================

  if (!hasResolved) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent-purple)]" />
      </div>
    );
  }

  // =============================================================================
  // NO SUMMARY STATE
  // =============================================================================

  if (!summary) {
    return <NoSummaryState />;
  }

  // =============================================================================
  // SUMMARY SCREEN
  // =============================================================================

  return (
    <div className="flex flex-col min-h-full pb-6">
      {/* ── Top completion header ── */}
      <div className="px-4 pt-8 pb-6 text-center">
        {/* Success icon */}
        <div className="flex justify-center mb-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] shadow-[var(--shadow-glow)]">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-1">Workout Complete!</h1>
        <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
          {summary.title || 'Freestyle Workout'}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {formatCompletedAt(summary.endedAt)}
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="px-4 mb-6">
        <GlassCard>
          <div className="flex items-start justify-around gap-2">
            <StatBadge
              icon={<Clock className="h-5 w-5 text-[var(--color-accent-purple)]" />}
              label="Duration"
              value={formatDuration(summary.durationSeconds)}
            />
            <div className="w-px self-stretch bg-[var(--glass-border)]" />
            <StatBadge
              icon={<Dumbbell className="h-5 w-5 text-[var(--color-accent-blue)]" />}
              label="Sets"
              value={String(summary.totalSets)}
            />
            <div className="w-px self-stretch bg-[var(--glass-border)]" />
            <StatBadge
              icon={<TrendingUp className="h-5 w-5 text-[var(--color-success)]" />}
              label="Volume"
              value={`${formatVolume(summary.totalVolume)} lbs`}
            />
          </div>
        </GlassCard>
      </div>

      {/* ── PR Badges (Task 7.4) ── */}
      {(prsLoading || prs.length > 0) && (
        <section className="px-4 mb-6">
          <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[var(--color-warning)]" />
            Personal Records
          </h2>
          {prsLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking records…
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {prs.map((pr, idx) => (
                <PRBadge key={`${pr.type}-${pr.exerciseId}-${idx}`} pr={pr} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Exercise breakdown ── */}
      {sortedExercises.length > 0 && (
        <section className="px-4 mb-6">
          <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
            Exercises
          </h2>
          <div className="space-y-3">
            {sortedExercises.map((exercise, idx) => (
              <ExerciseSummaryCard
                key={exercise.localId}
                name={exercise.exerciseName}
                sets={exercise.sets}
                exerciseIndex={idx}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty workout state ── */}
      {sortedExercises.length === 0 && (
        <div className="px-4 mb-6">
          <GlassCard className="text-center py-8">
            <Dumbbell className="h-10 w-10 mx-auto text-[var(--color-text-muted)] mb-3" />
            <p className="text-[var(--color-text-muted)]">No exercises logged this session.</p>
          </GlassCard>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="px-4 space-y-3 mt-auto">
        {/* Primary CTA — Generate Next Session Plan (placeholder for future AI task) */}
        <button
          onClick={() => router.push('/app/coach')}
          className="btn-primary w-full flex items-center justify-center gap-2"
          aria-label="Generate next session plan with AI coach"
        >
          <Sparkles className="h-5 w-5" />
          Generate Next Session Plan
        </button>

        {/* Secondary — Done → Dashboard */}
        <button
          onClick={() => router.replace('/app/dashboard')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-[0.98] transition-all font-medium text-sm"
          aria-label="Done, go to dashboard"
        >
          <LayoutDashboard className="h-5 w-5" />
          Done
        </button>
      </div>
    </div>
  );
}
