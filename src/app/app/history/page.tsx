'use client';

/**
 * History page — Task 13.3
 *
 * Lists completed workout sessions and allows expanding each to view
 * full exercise/set detail inline.
 *
 * Data: GET /api/history?status=COMPLETED  (list)
 *       GET /api/history/[id]              (detail on expand)
 */

import { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionSummary {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  title: string | null;
  summary: { totalExercises: number; totalSets: number };
  durationMinutes: number | null;
  split: { id: string; name: string } | null;
  template: { id: string; name: string; mode: string } | null;
  exercises: {
    id: string;
    exercise: { id: string; name: string };
    _count: { sets: number };
  }[];
}

interface SetDetail {
  id: string;
  setIndex: number;
  weight: number;
  reps: number;
  rpe: number | null;
  flags: { warmup?: boolean; backoff?: boolean; dropset?: boolean; failure?: boolean } | null;
}

interface ExerciseDetail {
  id: string;
  orderIndex: number;
  exercise: { id: string; name: string; muscleGroups: string[] };
  sets: SetDetail[];
}

interface SessionDetail {
  id: string;
  title: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  notes: string | null;
  split: { name: string } | null;
  template: { name: string; mode: string } | null;
  exercises: ExerciseDetail[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Set flags ─────────────────────────────────────────────────────────────────

const FLAG_LABELS: { key: keyof NonNullable<SetDetail['flags']>; label: string; color: string }[] = [
  { key: 'warmup',  label: 'W', color: 'text-cyan-400 bg-cyan-500/10' },
  { key: 'backoff', label: 'B', color: 'text-blue-400 bg-blue-500/10' },
  { key: 'dropset', label: 'D', color: 'text-amber-400 bg-amber-500/10' },
  { key: 'failure', label: 'F', color: 'text-red-400 bg-red-500/10' },
];

// ── Session Card ──────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: SessionSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleToggle = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (detail) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/history/${session.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDetail(data.session);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [expanded, detail, session.id]);

  const title = session.title ?? session.split?.name ?? session.template?.name ?? 'Freestyle Workout';

  return (
    <div className="rounded-2xl bg-[var(--color-base-700)] border border-[var(--glass-border)] overflow-hidden">
      {/* Summary row */}
      <button
        className="w-full px-4 py-4 text-left hover:bg-[var(--color-base-600)] transition-colors"
        onClick={handleToggle}
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(139,92,246,0.15)' }}
            >
              <Dumbbell className="h-4 w-4 text-[var(--color-accent-purple)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{title}</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {formatDate(session.startedAt)} · {formatTime(session.startedAt)}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--color-text-secondary)]">
                {session.durationMinutes !== null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(session.durationMinutes)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {session.summary.totalSets} sets · {session.summary.totalExercises} exercises
                </span>
              </div>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
          )}
        </div>
      </button>

      {/* Detail section */}
      {expanded && (
        <div className="border-t border-[var(--glass-border)] px-4 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading session…
            </div>
          )}
          {error && (
            <div className="text-sm text-red-400 flex items-center gap-2">
              <span>Failed to load session detail.</span>
              <button
                onClick={() => { setError(false); setDetail(null); handleToggle(); }}
                className="underline"
              >
                Retry
              </button>
            </div>
          )}
          {detail && !loading && (
            <div className="space-y-4">
              {detail.notes && (
                <p className="text-sm text-[var(--color-text-secondary)] italic">
                  &ldquo;{detail.notes}&rdquo;
                </p>
              )}
              {detail.exercises.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">No exercises logged.</p>
              )}
              {detail.exercises.map((ex, idx) => (
                <div key={ex.id}>
                  {/* Exercise header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-semibold">{ex.exercise.name}</p>
                  </div>
                  {/* Sets table */}
                  {ex.sets.length === 0 ? (
                    <p className="pl-7 text-xs text-[var(--color-text-muted)]">No sets logged</p>
                  ) : (
                    <div className="pl-7 space-y-1.5">
                      {ex.sets.map((set) => (
                        <div
                          key={set.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="w-6 text-right text-xs text-[var(--color-text-muted)] tabular-nums">
                            {set.setIndex + 1}
                          </span>
                          <span className="font-medium tabular-nums">
                            {set.weight} × {set.reps}
                          </span>
                          {set.rpe !== null && (
                            <span className="text-xs text-[var(--color-text-muted)]">
                              RPE {set.rpe}
                            </span>
                          )}
                          {set.flags &&
                            FLAG_LABELS.filter((f) => set.flags?.[f.key]).map((f) => (
                              <span
                                key={f.key}
                                className={`text-[9px] font-bold px-1 py-0.5 rounded ${f.color}`}
                              >
                                {f.label}
                              </span>
                            ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const fetchSessions = useCallback(async (currentOffset: number, replace: boolean) => {
    if (currentOffset === 0) setLoading(true);
    else setLoadingMore(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/history?status=COMPLETED&limit=${PAGE_SIZE}&offset=${currentOffset}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const incoming: SessionSummary[] = data.sessions ?? [];
      setSessions((prev) => (replace ? incoming : [...prev, ...incoming]));
      setTotal(data.pagination?.total ?? 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(0, true);
  }, [fetchSessions]);

  function handleLoadMore() {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    fetchSessions(nextOffset, false);
  }

  const hasMore = sessions.length < total;

  return (
    <div className="px-4 py-6 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          {!loading && (
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {total} session{total !== 1 ? 's' : ''} completed
            </p>
          )}
        </div>
        <button
          onClick={() => { setOffset(0); fetchSessions(0, true); }}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--color-base-700)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="Refresh history"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse bg-[var(--color-base-700)]" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <GlassCard className="text-center py-8">
          <p className="text-sm text-red-400 mb-3">Failed to load history.</p>
          <button
            onClick={() => fetchSessions(0, true)}
            className="btn-secondary text-sm"
          >
            Retry
          </button>
        </GlassCard>
      )}

      {/* Empty */}
      {!loading && !error && sessions.length === 0 && (
        <GlassCard className="text-center py-12">
          <Dumbbell className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-4" />
          <h2 className="text-lg font-semibold mb-1">No workouts yet</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Complete a workout to see it here.
          </p>
        </GlassCard>
      )}

      {/* Session list */}
      {!loading && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-base-700)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
