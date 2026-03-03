'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dumbbell,
  Plus,
  X,
  Trophy,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Exercise {
  id: string;
  name: string;
  type: string;
  pattern: string;
  muscleGroups: string[];
}

interface PersonalRecord {
  id: string;
  weight: number;
  reps: number;
  notes: string | null;
  achievedAt: string;
  updatedAt: string;
  exercise: Exercise;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMuscles(groups: string[]): string {
  if (!groups || groups.length === 0) return '';
  return groups
    .slice(0, 3)
    .map((g) => g.replace(/_/g, ' '))
    .join(', ');
}

// ── PR Form ───────────────────────────────────────────────────────────────────

interface PRFormProps {
  exerciseId: string;
  exerciseName: string;
  existing?: PersonalRecord | null;
  onSave: (pr: PersonalRecord) => void;
  onCancel: () => void;
}

function PRForm({ exerciseId, exerciseName, existing, onSave, onCancel }: PRFormProps) {
  const [weight, setWeight] = useState(existing ? String(existing.weight) : '');
  const [reps, setReps] = useState(existing ? String(existing.reps) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [achievedAt, setAchievedAt] = useState(
    existing
      ? new Date(existing.achievedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (!w || w <= 0) { setError('Enter a valid weight.'); return; }
    if (!r || r < 1) { setError('Enter valid reps.'); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/exercises/prs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId,
          weight: w,
          reps: r,
          notes: notes.trim() || null,
          achievedAt: new Date(achievedAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? `Error ${res.status}`);
      }
      const data = (await res.json()) as { pr: PersonalRecord };
      onSave(data.pr);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
      <p className="text-xs font-medium text-[var(--color-text-muted)] mb-3">
        {existing ? 'Update PR' : 'Log PR'} — {exerciseName}
      </p>
      <form onSubmit={handleSubmit} noValidate className="space-y-2.5">
        <div className="flex gap-2">
          {/* Weight */}
          <div className="flex-1">
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">
              Weight (lbs/kg)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="135"
              className="w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm bg-[var(--color-base-700)] border border-[var(--glass-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent-purple)]"
            />
          </div>
          {/* Reps */}
          <div className="w-24">
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">
              Reps
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="5"
              className="w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm bg-[var(--color-base-700)] border border-[var(--glass-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent-purple)]"
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">
            Date achieved
          </label>
          <input
            type="date"
            value={achievedAt}
            onChange={(e) => setAchievedAt(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm bg-[var(--color-base-700)] border border-[var(--glass-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-purple)]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">
            Notes <span className="opacity-60">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. paused reps, belt, competition"
            maxLength={300}
            className="w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm bg-[var(--color-base-700)] border border-[var(--glass-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent-purple)]"
          />
        </div>

        {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}

        <div className="flex gap-2 pt-0.5">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1 text-xs py-1.5 disabled:opacity-60"
          >
            {saving ? 'Saving…' : existing ? 'Update PR' : 'Save PR'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary text-xs py-1.5 px-4">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── PR Card (exercise with its PR) ────────────────────────────────────────────

interface PRCardProps {
  pr: PersonalRecord;
  onUpdated: (pr: PersonalRecord) => void;
  onDeleted: (id: string) => void;
}

function PRCard({ pr, onUpdated, onDeleted }: PRCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const muscles = formatMuscles(pr.exercise.muscleGroups as string[]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/exercises/prs/${pr.id}`, { method: 'DELETE' });
      onDeleted(pr.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <GlassCard className="mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Trophy className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
            <h3 className="font-semibold truncate">{pr.exercise.name}</h3>
          </div>
          {muscles && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 capitalize">{muscles}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--color-accent-purple)]">
              {pr.weight} × {pr.reps} rep{pr.reps !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {formatDate(pr.achievedAt)}
            </span>
          </div>
          {pr.notes && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1 italic">{pr.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => { setEditing((v) => !v); setConfirmDelete(false); }}
            aria-label="Edit PR"
            className="p-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-accent-purple)] hover:bg-[rgba(139,92,246,0.10)] transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => { setConfirmDelete(true); setEditing(false); }}
            disabled={deleting}
            aria-label="Delete PR"
            className="p-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[rgba(239,68,68,0.10)] transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {editing && (
        <PRForm
          exerciseId={pr.exercise.id}
          exerciseName={pr.exercise.name}
          existing={pr}
          onSave={(updated) => { onUpdated(updated); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      )}

      {confirmDelete && !editing && (
        <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2.5">
            Remove PR for <span className="font-semibold text-[var(--color-text-primary)]">{pr.exercise.name}</span>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setConfirmDelete(false); handleDelete(); }}
              disabled={deleting}
              className="btn-primary text-xs py-1.5 px-4 flex-1 disabled:opacity-60 !bg-[var(--color-error)] !border-[var(--color-error)]"
            >
              {deleting ? 'Removing…' : 'Yes, Remove'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-xs py-1.5 px-4">
              Cancel
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ── Add PR Panel ──────────────────────────────────────────────────────────────

interface AddPRPanelProps {
  existingExerciseIds: Set<string>;
  onSaved: (pr: PersonalRecord) => void;
  onCancel: () => void;
  preselected?: Exercise | null;
}

function AddPRPanel({ existingExerciseIds, onSaved, onCancel, preselected }: AddPRPanelProps) {
  const [search, setSearch] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Exercise | null>(preselected ?? null);
  const [showResults, setShowResults] = useState(false);
  const [creatingCustom, setCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customSaving, setCustomSaving] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const fetchExercises = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = q.trim()
        ? `/api/exercises?search=${encodeURIComponent(q.trim())}`
        : '/api/exercises';
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as { exercises: Exercise[] };
      setExercises(data.exercises.filter((e) => !existingExerciseIds.has(e.id)));
    } finally {
      setLoading(false);
    }
  }, [existingExerciseIds]);

  useEffect(() => {
    if (showResults) fetchExercises(search);
  }, [search, showResults, fetchExercises]);

  async function handleCreateCustom() {
    const name = customName.trim() || search.trim();
    if (!name) return;
    setCustomSaving(true);
    setCustomError(null);
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? `Error ${res.status}`);
      }
      const data = (await res.json()) as { exercise: Exercise };
      setSelected(data.exercise);
      setCreatingCustom(false);
      setShowResults(false);
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : 'Could not create exercise');
    } finally {
      setCustomSaving(false);
    }
  }

  return (
    <GlassCard className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Log a Personal Record</h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!selected ? (
        <>
          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCreatingCustom(false); }}
              onFocus={() => setShowResults(true)}
              placeholder="Search exercises…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--color-base-700)] border border-[var(--glass-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent-purple)]"
            />
          </div>

          {showResults && !creatingCustom && (
            <div className="max-h-52 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--color-base-700)]">
              {loading && (
                <p className="text-xs text-[var(--color-text-muted)] px-3 py-2">Loading…</p>
              )}
              {!loading && exercises.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => { setSelected(ex); setShowResults(false); }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-[rgba(139,92,246,0.10)] transition-colors border-b border-[var(--glass-border)] last:border-0"
                >
                  <span className="font-medium">{ex.name}</span>
                  {(ex.muscleGroups as string[]).length > 0 && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)] capitalize">
                      {formatMuscles(ex.muscleGroups as string[])}
                    </span>
                  )}
                </button>
              ))}
              {/* "Add custom" row — always shown at the bottom */}
              {!loading && (
                <button
                  type="button"
                  onClick={() => { setCreatingCustom(true); setCustomName(search.trim()); }}
                  className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 text-[var(--color-accent-purple)] hover:bg-[rgba(139,92,246,0.10)] transition-colors border-t border-[var(--glass-border)]"
                >
                  <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                  {search.trim() ? `Add "${search.trim()}" as custom exercise` : 'Add a custom exercise'}
                </button>
              )}
            </div>
          )}

          {/* Inline custom exercise creation */}
          {creatingCustom && (
            <div className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--color-base-700)] p-3 mt-1">
              <p className="text-xs text-[var(--color-text-muted)] mb-2">New custom exercise</p>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Exercise name"
                autoFocus
                maxLength={100}
                className="w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm bg-[var(--color-base-800)] border border-[var(--glass-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent-purple)] mb-2"
              />
              {customError && <p className="text-xs text-[var(--color-error)] mb-2">{customError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateCustom}
                  disabled={customSaving || !customName.trim()}
                  className="btn-primary flex-1 text-xs py-1.5 disabled:opacity-60"
                >
                  {customSaving ? 'Creating…' : 'Create & Select'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreatingCustom(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{selected.name}</span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] underline"
            >
              change
            </button>
          </div>
          <PRForm
            exerciseId={selected.id}
            exerciseName={selected.name}
            onSave={(pr) => { onSaved(pr); }}
            onCancel={onCancel}
          />
        </div>
      )}
    </GlassCard>
  );
}

// ── Exercise Library section ──────────────────────────────────────────────────

interface ExerciseLibraryProps {
  existingPRIds: Set<string>;
  onLogPR: (exercise: Exercise) => void;
}

function ExerciseLibrary({ existingPRIds, onLogPR }: ExerciseLibraryProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingCustom, setCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customSaving, setCustomSaving] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const fetchExercises = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = q.trim()
        ? `/api/exercises?search=${encodeURIComponent(q.trim())}`
        : '/api/exercises';
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as { exercises: Exercise[] };
      setExercises(data.exercises);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchExercises(search);
  }, [search, open, fetchExercises]);

  async function handleCreateCustom() {
    const name = customName.trim();
    if (!name) return;
    setCustomSaving(true);
    setCustomError(null);
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? `Error ${res.status}`);
      }
      const data = (await res.json()) as { exercise: Exercise };
      setExercises((prev) => [data.exercise, ...prev]);
      setCreatingCustom(false);
      setCustomName('');
      onLogPR(data.exercise);
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : 'Could not create exercise');
    } finally {
      setCustomSaving(false);
    }
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-base-700)] border border-[var(--glass-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <span className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4" />
          Exercise Library
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--color-base-800)] overflow-hidden">
          <div className="p-2 border-b border-[var(--glass-border)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCreatingCustom(false); }}
                placeholder="Search exercises…"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--color-base-700)] border border-[var(--glass-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent-purple)]"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {loading && (
              <p className="text-xs text-[var(--color-text-muted)] px-3 py-3">Loading…</p>
            )}
            {exercises.map((ex) => {
              const hasPR = existingPRIds.has(ex.id);
              return (
                <div
                  key={ex.id}
                  className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--glass-border)] last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    {(ex.muscleGroups as string[]).length > 0 && (
                      <p className="text-xs text-[var(--color-text-muted)] capitalize">
                        {formatMuscles(ex.muscleGroups as string[])}
                      </p>
                    )}
                  </div>
                  {hasPR ? (
                    <span className="flex items-center gap-1 text-xs text-yellow-400 flex-shrink-0 ml-3">
                      <Trophy className="h-3 w-3" />
                      PR logged
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onLogPR(ex)}
                      className="flex-shrink-0 ml-3 text-xs px-2.5 py-1 rounded-[var(--radius-sm)] bg-[rgba(139,92,246,0.15)] text-[var(--color-accent-purple)] hover:bg-[rgba(139,92,246,0.25)] transition-colors"
                    >
                      Log PR
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add custom exercise row */}
            {!loading && !creatingCustom && (
              <button
                type="button"
                onClick={() => { setCreatingCustom(true); setCustomName(search.trim()); }}
                className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 text-[var(--color-accent-purple)] hover:bg-[rgba(139,92,246,0.10)] transition-colors border-t border-[var(--glass-border)]"
              >
                <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                {search.trim() ? `Add "${search.trim()}" as custom exercise` : 'Add a custom exercise'}
              </button>
            )}

            {/* Inline custom create form */}
            {creatingCustom && (
              <div className="p-3 border-t border-[var(--glass-border)]">
                <p className="text-xs text-[var(--color-text-muted)] mb-2">New custom exercise</p>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Exercise name"
                  autoFocus
                  maxLength={100}
                  className="w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm bg-[var(--color-base-700)] border border-[var(--glass-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent-purple)] mb-2"
                />
                {customError && <p className="text-xs text-[var(--color-error)] mb-2">{customError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateCustom}
                    disabled={customSaving || !customName.trim()}
                    className="btn-primary flex-1 text-xs py-1.5 disabled:opacity-60"
                  >
                    {customSaving ? 'Creating…' : 'Create & Log PR'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatingCustom(false)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main WorkoutsTab ──────────────────────────────────────────────────────────

export function WorkoutsTab() {
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [preselectedExercise, setPreselectedExercise] = useState<Exercise | null>(null);

  const fetchPRs = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/exercises/prs');
      if (!res.ok) throw new Error(`Failed to load PRs (${res.status})`);
      const data = (await res.json()) as { prs: PersonalRecord[] };
      setPRs(data.prs ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Could not load records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  function handlePRSaved(pr: PersonalRecord) {
    setPRs((prev) => {
      const idx = prev.findIndex((p) => p.id === pr.id || p.exercise.id === pr.exercise.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = pr;
        return next;
      }
      return [pr, ...prev];
    });
    setShowAddPanel(false);
    setPreselectedExercise(null);
  }

  function handlePRDeleted(id: string) {
    setPRs((prev) => prev.filter((p) => p.id !== id));
  }

  function openAddForExercise(ex: Exercise) {
    setPreselectedExercise(ex);
    setShowAddPanel(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const existingExerciseIds = new Set(prs.map((p) => p.exercise.id));
  const existingPRIds = existingExerciseIds;

  if (loading) {
    return (
      <div className="px-4 py-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-card p-4 animate-pulse h-20 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--color-base-700)' }}
          />
        ))}
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="px-4 py-8 flex flex-col items-center text-center">
        <p className="text-sm text-[var(--color-error)] mb-4">{fetchError}</p>
        <button onClick={fetchPRs} className="btn-secondary text-sm px-4">Retry</button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Add PR panel */}
      {showAddPanel && (
        <AddPRPanel
          existingExerciseIds={existingExerciseIds}
          onSaved={handlePRSaved}
          onCancel={() => { setShowAddPanel(false); setPreselectedExercise(null); }}
          preselected={preselectedExercise}
        />
      )}

      {/* PR list or empty state */}
      {prs.length === 0 && !showAddPanel ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-4">
            <Trophy className="h-8 w-8 text-yellow-400" />
          </div>
          <h2 className="text-lg font-semibold mb-1">No PRs logged yet</h2>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xs mb-6">
            Log your personal bests so the AI can track your progress and offer smarter progression advice.
          </p>
          <button onClick={() => setShowAddPanel(true)} className="btn-primary px-6 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Log a PR
          </button>
        </div>
      ) : (
        <>
          {prs.map((pr) => (
            <PRCard
              key={pr.id}
              pr={pr}
              onUpdated={(updated) => handlePRSaved(updated)}
              onDeleted={handlePRDeleted}
            />
          ))}

          {!showAddPanel && (
            <button
              onClick={() => setShowAddPanel(true)}
              className="btn-secondary w-full text-sm mt-1 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Log Another PR
            </button>
          )}
        </>
      )}

      {/* Exercise library */}
      {!showAddPanel && (
        <div className="mt-4">
          <ExerciseLibrary
            existingPRIds={existingPRIds}
            onLogPR={openAddForExercise}
          />
        </div>
      )}
    </div>
  );
}
