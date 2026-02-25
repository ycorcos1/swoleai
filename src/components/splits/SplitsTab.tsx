/**
 * SplitsTab — Task 6.2: Splits UI: list + create
 *             Task 6.3: Splits UI: schedule editor
 *             Task 6.4: Splits UI: activate
 *
 * - Fetches user's splits from GET /api/splits
 * - Renders each split as a glass card
 * - "New Split" button opens an inline create form
 * - Form POSTs to /api/splits, then refreshes the list
 * - "Edit Schedule" opens inline weekday mapping UI per split
 * - PUT /api/splits/:id saves the schedule; reloads on success
 * - "Activate" button (with inline confirmation) POSTs to /api/splits/:id/activate
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, Plus, X, CheckCircle2, CalendarDays, Zap } from 'lucide-react';
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

interface Template {
  id: string;
  name: string;
  mode: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
type WeekdayKey = (typeof WEEKDAYS)[number];

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun',
};

const WEEKDAY_LONG: Record<WeekdayKey, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
};

// ── SplitCard ─────────────────────────────────────────────────────────────────

interface SplitCardProps {
  split: Split;
  onEditSchedule: () => void;
  onActivate: () => void;
  activating: boolean;
}

function SplitCard({ split, onEditSchedule, onActivate, activating }: SplitCardProps) {
  const [confirming, setConfirming] = useState(false);
  const dayCount = split.scheduleDays.filter((d) => !d.isRest).length;
  const restCount = split.scheduleDays.filter((d) => d.isRest).length;

  function handleActivateClick() {
    setConfirming(true);
  }

  function handleConfirm() {
    setConfirming(false);
    onActivate();
  }

  function handleCancel() {
    setConfirming(false);
  }

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
              {WEEKDAYS.map((wd) => {
                const day = split.scheduleDays.find((d) => d.weekday === wd);
                if (!day) return null;
                return (
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
                    {WEEKDAY_LABELS[wd]}
                  </span>
                );
              })}
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

        {/* Action buttons */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {/* Edit schedule button */}
          <button
            type="button"
            onClick={onEditSchedule}
            aria-label={`Edit schedule for ${split.name}`}
            title="Edit schedule"
            className={[
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)]',
              'text-xs font-medium transition-colors',
              'text-[var(--color-text-muted)] hover:text-[var(--color-accent-purple)]',
              'bg-[var(--color-base-600)] hover:bg-[rgba(139,92,246,0.12)]',
              'border border-transparent hover:border-[rgba(139,92,246,0.25)]',
            ].join(' ')}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Schedule
          </button>

          {/* Activate button — only shown for inactive splits */}
          {!split.isActive && (
            <button
              type="button"
              onClick={handleActivateClick}
              disabled={activating}
              aria-label={`Activate split ${split.name}`}
              title="Set as active split"
              className={[
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)]',
                'text-xs font-medium transition-colors',
                'text-[var(--color-accent-purple)] hover:text-white',
                'bg-[rgba(139,92,246,0.12)] hover:bg-[var(--color-accent-purple)]',
                'border border-[rgba(139,92,246,0.3)] hover:border-[var(--color-accent-purple)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              <Zap className="h-3.5 w-3.5" />
              Activate
            </button>
          )}
        </div>
      </div>

      {/* Inline confirmation prompt */}
      {confirming && (
        <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2.5">
            Set <span className="font-semibold text-[var(--color-text-primary)]">{split.name}</span> as your active split? This will deactivate any currently active split.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={activating}
              className="btn-primary text-xs py-1.5 px-4 flex-1 disabled:opacity-60"
            >
              {activating ? 'Activating…' : 'Yes, Activate'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary text-xs py-1.5 px-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ── Schedule Editor ───────────────────────────────────────────────────────────

interface DayState {
  isRest: boolean;
  label: string;
  workoutDayTemplateId: string | null;
}

interface ScheduleEditorProps {
  split: Split;
  onSave: (updatedSplit: Split) => void;
  onCancel: () => void;
}

function ScheduleEditor({ split, onSave, onCancel }: ScheduleEditorProps) {
  // Build initial per-weekday state from existing scheduleDays
  const makeInitialDays = (): Record<WeekdayKey, DayState> => {
    const defaults: Record<WeekdayKey, DayState> = {
      MON: { isRest: true, label: '', workoutDayTemplateId: null },
      TUE: { isRest: true, label: '', workoutDayTemplateId: null },
      WED: { isRest: true, label: '', workoutDayTemplateId: null },
      THU: { isRest: true, label: '', workoutDayTemplateId: null },
      FRI: { isRest: true, label: '', workoutDayTemplateId: null },
      SAT: { isRest: true, label: '', workoutDayTemplateId: null },
      SUN: { isRest: true, label: '', workoutDayTemplateId: null },
    };
    for (const day of split.scheduleDays) {
      const wd = day.weekday as WeekdayKey;
      if (wd in defaults) {
        defaults[wd] = {
          isRest: day.isRest,
          label: day.label ?? '',
          workoutDayTemplateId: day.workoutDayTemplateId,
        };
      }
    }
    return defaults;
  };

  const [days, setDays] = useState<Record<WeekdayKey, DayState>>(makeInitialDays);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available day templates for the template picker
  useEffect(() => {
    fetch('/api/templates')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { templates: Template[] }) =>
        setTemplates(data.templates ?? [])
      )
      .catch(() => setTemplates([]));
  }, []);

  function toggleDay(weekday: WeekdayKey) {
    setDays((prev) => {
      const wasRest = prev[weekday].isRest;
      return {
        ...prev,
        [weekday]: {
          ...prev[weekday],
          isRest: !wasRest,
          // Clear workout-specific data when switching to rest
          workoutDayTemplateId: wasRest ? prev[weekday].workoutDayTemplateId : null,
          label: wasRest ? prev[weekday].label : '',
        },
      };
    });
  }

  function setLabel(weekday: WeekdayKey, label: string) {
    setDays((prev) => ({ ...prev, [weekday]: { ...prev[weekday], label } }));
  }

  function setTemplate(weekday: WeekdayKey, templateId: string | null) {
    setDays((prev) => ({
      ...prev,
      [weekday]: { ...prev[weekday], workoutDayTemplateId: templateId },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const scheduleDays = WEEKDAYS.map((weekday) => ({
      weekday,
      isRest: days[weekday].isRest,
      label: days[weekday].isRest ? null : (days[weekday].label.trim() || null),
      workoutDayTemplateId: days[weekday].isRest
        ? null
        : (days[weekday].workoutDayTemplateId ?? null),
    }));

    try {
      const res = await fetch(`/api/splits/${split.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleDays }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string })?.error ?? `Failed to save (${res.status})`
        );
      }

      const data = (await res.json()) as { split: Split };
      onSave(data.split);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const workoutCount = WEEKDAYS.filter((w) => !days[w].isRest).length;

  return (
    <GlassCard className="mb-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold">{split.name}</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Edit weekly schedule
            {workoutCount > 0
              ? ` · ${workoutCount} workout${workoutCount !== 1 ? 's' : ''}`
              : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel editing"
          className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday rows */}
      <div className="space-y-2 mb-4">
        {WEEKDAYS.map((weekday) => {
          const day = days[weekday];
          const isWorkout = !day.isRest;

          return (
            <div
              key={weekday}
              className="rounded-[var(--radius-md)] overflow-hidden border border-[var(--glass-border)]"
            >
              {/* Day row */}
              <div className="flex items-center gap-3 px-3 py-2.5 bg-[var(--color-base-700)]">
                {/* Day abbreviation */}
                <span className="w-8 text-sm font-medium text-[var(--color-text-secondary)] flex-shrink-0">
                  {WEEKDAY_LABELS[weekday]}
                </span>

                {/* Status label */}
                <span
                  className={[
                    'flex-1 text-sm font-medium select-none',
                    isWorkout
                      ? 'text-[var(--color-accent-purple)]'
                      : 'text-[var(--color-text-muted)]',
                  ].join(' ')}
                >
                  {isWorkout
                    ? (day.label ||
                        templates.find((t) => t.id === day.workoutDayTemplateId)
                          ?.name ||
                        'Workout')
                    : 'Rest'}
                </span>

                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isWorkout}
                  aria-label={`${WEEKDAY_LONG[weekday]}: ${isWorkout ? 'workout' : 'rest'} — tap to toggle`}
                  onClick={() => toggleDay(weekday)}
                  className={[
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full',
                    'border-2 border-transparent transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-purple)]',
                    isWorkout
                      ? 'bg-[var(--color-accent-purple)]'
                      : 'bg-[var(--color-base-500)]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow',
                      'transform transition-transform duration-200',
                      isWorkout ? 'translate-x-5' : 'translate-x-0',
                    ].join(' ')}
                  />
                </button>
              </div>

              {/* Workout details — expanded when not rest */}
              {isWorkout && (
                <div className="px-3 py-3 bg-[rgba(139,92,246,0.05)] space-y-2.5">
                  {/* Template selector (only shown when templates exist) */}
                  {templates.length > 0 && (
                    <div>
                      <label
                        htmlFor={`tmpl-${weekday}`}
                        className="block text-xs text-[var(--color-text-muted)] mb-1"
                      >
                        Day template (optional)
                      </label>
                      <select
                        id={`tmpl-${weekday}`}
                        value={day.workoutDayTemplateId ?? ''}
                        onChange={(e) =>
                          setTemplate(weekday, e.target.value || null)
                        }
                        className={[
                          'w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm',
                          'bg-[var(--color-base-700)] border border-[var(--glass-border)]',
                          'text-[var(--color-text-primary)]',
                          'outline-none focus:border-[var(--color-accent-purple)]',
                        ].join(' ')}
                      >
                        <option value="">No template</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.mode.toLowerCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Custom label */}
                  <div>
                    <label
                      htmlFor={`label-${weekday}`}
                      className="block text-xs text-[var(--color-text-muted)] mb-1"
                    >
                      Custom label (optional)
                    </label>
                    <input
                      id={`label-${weekday}`}
                      type="text"
                      value={day.label}
                      onChange={(e) => setLabel(weekday, e.target.value)}
                      placeholder={
                        day.workoutDayTemplateId
                          ? (templates.find(
                              (t) => t.id === day.workoutDayTemplateId
                            )?.name ?? 'e.g. Push A')
                          : 'e.g. Push A'
                      }
                      maxLength={50}
                      className={[
                        'w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm',
                        'bg-[var(--color-base-700)] border border-[var(--glass-border)]',
                        'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
                        'outline-none focus:border-[var(--color-accent-purple)]',
                      ].join(' ')}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-[var(--color-error)] mb-3">{error}</p>
      )}

      {/* Footer actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex-1 text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Schedule'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary text-sm px-4"
        >
          Cancel
        </button>
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
        throw new Error(
          (data as { error?: string })?.error ?? `Request failed (${res.status})`
        );
      }

      const data = (await res.json()) as { split: Split };
      onSuccess(data.split);
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
  /** ID of the split whose schedule editor is currently open (null = none) */
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  /** ID of the split currently being activated (null = none in flight) */
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  const fetchSplits = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/splits');
      if (!res.ok) throw new Error(`Failed to load splits (${res.status})`);
      const data = (await res.json()) as { splits: Split[] };
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
    // Open the schedule editor immediately after creating so user can map days
    setEditingScheduleId(newSplit.id);
  }

  function handleScheduleSaved(updatedSplit: Split) {
    setSplits((prev) =>
      prev.map((s) => (s.id === updatedSplit.id ? updatedSplit : s))
    );
    setEditingScheduleId(null);
  }

  async function handleActivate(splitId: string) {
    setActivatingId(splitId);
    setActivateError(null);
    try {
      const res = await fetch(`/api/splits/${splitId}/activate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string })?.error ?? `Failed to activate (${res.status})`
        );
      }
      const data = (await res.json()) as { split: Split };
      // Mark activated split as active, all others as inactive
      setSplits((prev) =>
        prev.map((s) =>
          s.id === data.split.id
            ? { ...s, ...data.split, isActive: true }
            : { ...s, isActive: false }
        )
      );
    } catch (err) {
      setActivateError(err instanceof Error ? err.message : 'Could not activate split');
    } finally {
      setActivatingId(null);
    }
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

      {/* Activation error */}
      {activateError && (
        <div className="mb-3 px-3 py-2.5 rounded-[var(--radius-md)] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)]">
          <p className="text-xs text-[var(--color-error)]">{activateError}</p>
        </div>
      )}

      {/* Split list */}
      {splits.length > 0 && (
        <>
          {splits.map((split) =>
            editingScheduleId === split.id ? (
              /* Schedule editor replaces the card while editing */
              <ScheduleEditor
                key={split.id}
                split={split}
                onSave={handleScheduleSaved}
                onCancel={() => setEditingScheduleId(null)}
              />
            ) : (
              <SplitCard
                key={split.id}
                split={split}
                onEditSchedule={() => {
                  setShowForm(false);
                  setEditingScheduleId(split.id);
                }}
                onActivate={() => handleActivate(split.id)}
                activating={activatingId === split.id}
              />
            )
          )}

          {/* Add another split button at the bottom */}
          {!showForm && editingScheduleId === null && (
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
