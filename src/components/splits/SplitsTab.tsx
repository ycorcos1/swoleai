/**
 * SplitsTab — Task 6.2: Splits UI: list + create
 *
 * - Fetches user's splits from GET /api/splits
 * - Renders each split as a glass card
 * - "New Split" button opens an inline create form
 * - Form POSTs to /api/splits, then refreshes the list
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, Plus, X, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Split {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  scheduleDays: ScheduleDay[];
}

interface ScheduleDay {
  id: string;
  weekday: string;
  isRest: boolean;
  label: string | null;
  workoutDayTemplateId: string | null;
  workoutDayTemplate: { id: string; name: string; mode: string } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS: Record<string, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun',
};

function SplitCard({ split }: { split: Split }) {
  const dayCount = split.scheduleDays.filter((d) => !d.isRest).length;
  const restCount = split.scheduleDays.filter((d) => d.isRest).length;

  return (
    <GlassCard className="mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{split.name}</h3>
            {split.isActive && (
              <span className="status-pill status-pill--success flex-shrink-0">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </span>
            )}
          </div>

          {split.scheduleDays.length > 0 ? (
            <div className="flex gap-1 mt-2 flex-wrap">
              {split.scheduleDays.map((day) => (
                <span
                  key={day.id}
                  title={
                    day.isRest
                      ? 'Rest'
                      : day.workoutDayTemplate?.name ?? day.label ?? 'Workout'
                  }
                  className={[
                    'inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-medium',
                    day.isRest
                      ? 'bg-[var(--color-base-600)] text-[var(--color-text-muted)]'
                      : 'bg-[rgba(139,92,246,0.15)] text-[var(--color-accent-purple)]',
                  ].join(' ')}
                >
                  {WEEKDAY_LABELS[day.weekday] ?? day.weekday.slice(0, 3)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              No schedule set
            </p>
          )}

          {split.scheduleDays.length > 0 && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
              {dayCount} workout{dayCount !== 1 ? 's' : ''}
              {restCount > 0 ? `, ${restCount} rest` : ''}
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

// ── Create Split Form ─────────────────────────────────────────────────────────

interface CreateSplitFormProps {
  onSuccess: (split: Split) => void;
  onCancel: () => void;
}

function CreateSplitForm({ onSuccess, onCancel }: CreateSplitFormProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Split name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/splits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      onSuccess(data.split as Split);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassCard className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">New Split</h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label
            htmlFor="split-name"
            className="block text-sm font-medium mb-1.5"
          >
            Split name
          </label>
          <input
            id="split-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 4-Day Upper / Lower"
            maxLength={100}
            autoFocus
            className={[
              'w-full rounded-[var(--radius-md)] px-3 py-2.5 text-sm',
              'bg-[var(--color-base-700)] border transition-colors',
              'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
              error
                ? 'border-[var(--color-error)]'
                : 'border-[var(--glass-border)] focus:border-[var(--color-accent-purple)]',
              'outline-none',
            ].join(' ')}
          />
          {error && (
            <p className="mt-1.5 text-xs text-[var(--color-error)]">{error}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1 text-sm disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create Split'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary text-sm px-4"
          >
            Cancel
          </button>
        </div>
      </form>
    </GlassCard>
  );
}

// ── Main SplitsTab ────────────────────────────────────────────────────────────

export function SplitsTab() {
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchSplits = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/splits');
      if (!res.ok) throw new Error(`Failed to load splits (${res.status})`);
      const data = await res.json();
      setSplits(data.splits ?? []);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Could not load splits'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSplits();
  }, [fetchSplits]);

  function handleCreated(newSplit: Split) {
    setSplits((prev) => [newSplit, ...prev]);
    setShowForm(false);
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-4 py-4 space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="glass-card p-4 animate-pulse h-20 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--color-base-700)' }}
          />
        ))}
      </div>
    );
  }

  // ── Fetch error ──────────────────────────────────────────────────────────

  if (fetchError) {
    return (
      <div className="px-4 py-8 flex flex-col items-center text-center">
        <p className="text-sm text-[var(--color-error)] mb-4">{fetchError}</p>
        <button onClick={fetchSplits} className="btn-secondary text-sm px-4">
          Retry
        </button>
      </div>
    );
  }

  // ── Content ──────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-4">
      {/* Create form (inline, shown above list) */}
      {showForm && (
        <CreateSplitForm
          onSuccess={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Empty state — only shown when no splits and form is hidden */}
      {!showForm && splits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-4">
            <LayoutGrid className="h-8 w-8 text-[var(--color-accent-purple)]" />
          </div>
          <h2 className="text-lg font-semibold mb-1">No splits yet</h2>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xs mb-6">
            A split maps your workout days to the week. Create one to get
            scheduled workouts on your dashboard.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary px-6"
          >
            <Plus className="h-4 w-4" />
            Create Split
          </button>
        </div>
      )}

      {/* Split list */}
      {splits.length > 0 && (
        <>
          {splits.map((split) => (
            <SplitCard key={split.id} split={split} />
          ))}

          {/* Add another split button at the bottom */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-secondary w-full text-sm mt-1"
            >
              <Plus className="h-4 w-4" />
              New Split
            </button>
          )}
        </>
      )}
    </div>
  );
}
