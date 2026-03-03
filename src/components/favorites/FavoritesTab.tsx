'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, Trash2, Plus, Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

// ── Types ──────────────────────────────────────────────────────────────────────

type FavPriority = 'PRIMARY' | 'BACKUP';
type FavIntent = 'progression' | 'hypertrophy' | 'auto';

interface FavoriteExercise {
  id: string;
  name: string;
  type: string;
  pattern: string;
  muscleGroups: string[];
  isCustom: boolean;
}

interface Favorite {
  id: string;
  priority: FavPriority;
  tags: string[];
  createdAt: string;
  exercise: FavoriteExercise;
}

interface Exercise {
  id: string;
  name: string;
  type: string;
  pattern: string;
  muscleGroups: string[];
  isCustom: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MUSCLE_GROUP_OPTIONS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'forearms', 'quads', 'hamstrings', 'glutes', 'calves',
  'abs', 'traps', 'lats', 'rear_delts',
];

// Canonical display groups always shown in the accordion
const CANONICAL_GROUPS = [
  { key: 'chest',     label: 'Chest' },
  { key: 'back',      label: 'Back' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'biceps',    label: 'Biceps' },
  { key: 'triceps',   label: 'Triceps' },
  { key: 'legs',      label: 'Legs' },
  { key: 'abs',       label: 'Abs' },
];

// Maps exercise muscleGroup values → canonical group key
const MUSCLE_TO_CANONICAL: Record<string, string> = {
  chest: 'chest',
  back: 'back', lats: 'back', traps: 'back',
  shoulders: 'shoulders', rear_delts: 'shoulders',
  biceps: 'biceps', forearms: 'biceps',
  triceps: 'triceps',
  quads: 'legs', hamstrings: 'legs', glutes: 'legs', calves: 'legs',
  abs: 'abs',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatLabel(s: string): string {
  return s
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function primaryMuscle(groups: string[]): string {
  if (groups.length === 0) return 'other';
  const canonical = MUSCLE_TO_CANONICAL[groups[0].toLowerCase()];
  return canonical ?? groups[0];
}

function groupByMuscle(favorites: Favorite[]): [string, Favorite[]][] {
  const map = new Map<string, Favorite[]>();
  for (const fav of favorites) {
    const key = primaryMuscle(fav.exercise.muscleGroups as string[]);
    const bucket = map.get(key) ?? [];
    bucket.push(fav);
    map.set(key, bucket);
  }
  return [...map.entries()].sort(([a], [b]) => {
    if (a === 'other') return 1;
    if (b === 'other') return -1;
    return a.localeCompare(b);
  });
}

/** Extract coaching intent from tags array */
function getIntent(tags: string[]): FavIntent {
  if (tags.includes('progression')) return 'progression';
  if (tags.includes('hypertrophy')) return 'hypertrophy';
  return 'auto';
}

/** Replace any existing intent tag with the new one */
function setIntentInTags(tags: string[], intent: FavIntent): string[] {
  const stripped = tags.filter((t) => t !== 'progression' && t !== 'hypertrophy');
  if (intent === 'auto') return stripped;
  return [...stripped, intent];
}

// ── Intent toggle ──────────────────────────────────────────────────────────────

const INTENT_OPTIONS: { value: FavIntent; label: string }[] = [
  { value: 'progression', label: 'Progress' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'auto',        label: 'Auto' },
];

interface IntentToggleProps {
  intent: FavIntent;
  busy: boolean;
  onChange: (intent: FavIntent) => void;
}

function IntentToggle({ intent, busy, onChange }: IntentToggleProps) {
  return (
    <div
      className="flex rounded-[var(--radius-sm)] overflow-hidden border border-[var(--glass-border)] text-[10px] font-semibold flex-shrink-0"
      role="group"
      aria-label="Coaching intent"
    >
      {INTENT_OPTIONS.map((opt, i) => {
        const isActive = intent === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={busy || isActive}
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={[
              'px-2 py-1 transition-colors',
              i > 0 ? 'border-l border-[var(--glass-border)]' : '',
              isActive
                ? opt.value === 'progression'
                  ? 'bg-[rgba(139,92,246,0.25)] text-[var(--color-accent-purple)] cursor-default'
                  : opt.value === 'hypertrophy'
                  ? 'bg-[rgba(59,130,246,0.20)] text-[var(--color-accent-blue)] cursor-default'
                  : 'bg-[var(--color-base-600)] text-[var(--color-text-secondary)] cursor-default'
                : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] disabled:opacity-40',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── FavoriteRow ────────────────────────────────────────────────────────────────

interface FavoriteRowProps {
  favorite: Favorite;
  busy: boolean;
  onTogglePriority: (fav: Favorite) => void;
  onChangeIntent: (fav: Favorite, intent: FavIntent) => void;
  onRemove: (fav: Favorite) => void;
  onAssignMuscle: (fav: Favorite, muscle: string) => void;
}

function FavoriteRow({ favorite, busy, onTogglePriority, onChangeIntent, onRemove, onAssignMuscle }: FavoriteRowProps) {
  const isPrimary = favorite.priority === 'PRIMARY';
  const intent = getIntent(favorite.tags);
  const muscles = favorite.exercise.muscleGroups as string[];
  const hasNoMuscle = muscles.length === 0;

  return (
    <div className="py-2.5 border-b border-[var(--glass-border)] last:border-0">
      {/* Top row: name + remove */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{favorite.exercise.name}</p>
          {muscles.length > 0 && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 capitalize">
              {muscles.slice(0, 2).map(g => g.replace(/_/g, ' ')).join(', ')}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onRemove(favorite)}
          aria-label={`Remove ${favorite.exercise.name} from favorites`}
          className="flex-shrink-0 p-1.5 rounded-[var(--radius-sm)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[rgba(239,68,68,0.10)] disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Muscle group picker — shown when exercise has no muscle group */}
      {hasNoMuscle && (
        <div className="mb-2">
          <p className="text-xs text-[var(--color-text-muted)] mb-1.5">Assign a muscle group:</p>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUP_OPTIONS.map((mg) => (
              <button
                key={mg}
                type="button"
                disabled={busy}
                onClick={() => onAssignMuscle(favorite, mg)}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-base-600)] text-[var(--color-text-muted)] hover:bg-[rgba(139,92,246,0.20)] hover:text-[var(--color-accent-purple)] border border-[var(--glass-border)] hover:border-[rgba(139,92,246,0.4)] transition-colors capitalize"
              >
                {mg.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom row: priority toggle + intent toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Priority toggle */}
        <div
          className="flex rounded-[var(--radius-sm)] overflow-hidden border border-[var(--glass-border)] text-[10px] font-semibold flex-shrink-0"
          role="group"
          aria-label={`Priority for ${favorite.exercise.name}`}
        >
          <button
            type="button"
            disabled={busy || isPrimary}
            onClick={() => onTogglePriority(favorite)}
            aria-pressed={isPrimary}
            className={[
              'px-2.5 py-1 transition-colors',
              isPrimary
                ? 'bg-[rgba(139,92,246,0.25)] text-[var(--color-accent-purple)] cursor-default'
                : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] disabled:opacity-40',
            ].join(' ')}
          >
            Primary
          </button>
          <button
            type="button"
            disabled={busy || !isPrimary}
            onClick={() => onTogglePriority(favorite)}
            aria-pressed={!isPrimary}
            className={[
              'px-2.5 py-1 border-l border-[var(--glass-border)] transition-colors',
              !isPrimary
                ? 'bg-[rgba(59,130,246,0.20)] text-[var(--color-accent-blue)] cursor-default'
                : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] disabled:opacity-40',
            ].join(' ')}
          >
            Backup
          </button>
        </div>

        {/* Intent toggle */}
        <IntentToggle
          intent={intent}
          busy={busy}
          onChange={(newIntent) => onChangeIntent(favorite, newIntent)}
        />
      </div>
    </div>
  );
}

// ── Add Exercise Panel ─────────────────────────────────────────────────────────

interface AddExercisePanelProps {
  existingExerciseIds: Set<string>;
  onAdded: (favorite: Favorite) => void;
  onCancel: () => void;
}

function AddExercisePanel({ existingExerciseIds, onAdded, onCancel }: AddExercisePanelProps) {
  const [search, setSearch] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
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

  async function handleAdd(exercise: Exercise) {
    setAdding(exercise.id);
    try {
      const res = await fetch(`/api/favorites/${exercise.id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to add');
      const data = (await res.json()) as { favorite?: Favorite; favorited: boolean };
      if (data.favorited && data.favorite) {
        onAdded({ ...data.favorite, exercise });
      }
    } finally {
      setAdding(null);
    }
  }

  async function handleCreateCustom() {
    const name = customName.trim();
    if (!name) return;
    setCustomSaving(true);
    setCustomError(null);
    try {
      const exRes = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!exRes.ok) {
        const d = await exRes.json().catch(() => ({}));
        throw new Error((d as { error?: string })?.error ?? `Error ${exRes.status}`);
      }
      const exData = (await exRes.json()) as { exercise: Exercise };
      await handleAdd(exData.exercise);
      setCreatingCustom(false);
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : 'Could not create exercise');
    } finally {
      setCustomSaving(false);
    }
  }

  return (
    <GlassCard className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Add Exercise to Favorites</h3>
        <button type="button" onClick={onCancel} className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

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
        <div className="max-h-56 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--color-base-700)]">
          {loading && <p className="text-xs text-[var(--color-text-muted)] px-3 py-2">Loading…</p>}
          {!loading && exercises.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between px-3 py-2 border-b border-[var(--glass-border)] last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{ex.name}</p>
                {(ex.muscleGroups as string[]).length > 0 && (
                  <p className="text-xs text-[var(--color-text-muted)] capitalize">
                    {(ex.muscleGroups as string[]).slice(0, 2).map(g => g.replace(/_/g, ' ')).join(', ')}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={adding === ex.id}
                onClick={() => handleAdd(ex)}
                className="flex-shrink-0 ml-3 text-xs px-2.5 py-1 rounded-[var(--radius-sm)] bg-[rgba(139,92,246,0.15)] text-[var(--color-accent-purple)] hover:bg-[rgba(139,92,246,0.25)] transition-colors disabled:opacity-50"
              >
                {adding === ex.id ? 'Adding…' : '+ Add'}
              </button>
            </div>
          ))}
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
            <button type="button" onClick={handleCreateCustom} disabled={customSaving || !customName.trim()} className="btn-primary flex-1 text-xs py-1.5 disabled:opacity-60">
              {customSaving ? 'Creating…' : 'Create & Add'}
            </button>
            <button type="button" onClick={() => setCreatingCustom(false)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ── FavoritesTab ───────────────────────────────────────────────────────────────

export function FavoritesTab() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/favorites');
      if (!res.ok) throw new Error(`Failed to load favorites (${res.status})`);
      const data = (await res.json()) as { favorites: Favorite[] };
      const favs = data.favorites ?? [];
      setFavorites(favs);
      // Auto-open groups that have favorites
      const populated = new Set(favs.map((f) => primaryMuscle(f.exercise.muscleGroups)));
      setOpenGroups(populated);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Could not load favorites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  async function handleTogglePriority(fav: Favorite) {
    const newPriority: FavPriority = fav.priority === 'PRIMARY' ? 'BACKUP' : 'PRIMARY';
    setBusyId(fav.id);
    try {
      const res = await fetch(`/api/favorites/${fav.exercise.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) throw new Error('Priority update failed');
      setFavorites((prev) => prev.map((f) => f.id === fav.id ? { ...f, priority: newPriority } : f));
    } catch {
      // leave unchanged
    } finally {
      setBusyId(null);
    }
  }

  async function handleChangeIntent(fav: Favorite, intent: FavIntent) {
    const newTags = setIntentInTags(fav.tags, intent);
    setBusyId(fav.id);
    try {
      const res = await fetch(`/api/favorites/${fav.exercise.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });
      if (!res.ok) throw new Error('Intent update failed');
      setFavorites((prev) => prev.map((f) => f.id === fav.id ? { ...f, tags: newTags } : f));
    } catch {
      // leave unchanged
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(fav: Favorite) {
    setBusyId(fav.id);
    try {
      const res = await fetch(`/api/favorites/${fav.exercise.id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Remove failed');
      setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
    } catch {
      // leave unchanged
    } finally {
      setBusyId(null);
    }
  }

  async function handleAssignMuscle(fav: Favorite, muscle: string) {
    setBusyId(fav.id);
    try {
      const res = await fetch(`/api/exercises/${fav.exercise.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muscleGroups: [muscle] }),
      });
      if (!res.ok) throw new Error('Muscle update failed');
      const canonical = MUSCLE_TO_CANONICAL[muscle] ?? muscle;
      setFavorites((prev) =>
        prev.map((f) =>
          f.id === fav.id
            ? { ...f, exercise: { ...f.exercise, muscleGroups: [muscle] } }
            : f
        )
      );
      setOpenGroups((prev) => new Set([...prev, canonical]));
    } catch {
      // leave unchanged
    } finally {
      setBusyId(null);
    }
  }

  function handleAdded(favorite: Favorite) {
    setFavorites((prev) => [favorite, ...prev]);
    // Open the group this exercise belongs to
    const key = primaryMuscle(favorite.exercise.muscleGroups);
    setOpenGroups((prev) => new Set([...prev, key]));
    setShowAdd(false);
  }

  if (loading) {
    return (
      <div className="px-4 py-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse h-16 rounded-[var(--radius-lg)]" style={{ background: 'var(--color-base-700)' }} />
        ))}
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="px-4 py-8 flex flex-col items-center text-center">
        <p className="text-sm text-[var(--color-error)] mb-4">{fetchError}</p>
        <button onClick={fetchFavorites} className="btn-secondary text-sm px-4">Retry</button>
      </div>
    );
  }

  const existingExerciseIds = new Set(favorites.map((f) => f.exercise.id));

  // Build a map: canonical group key → favorites in that group
  const groupMap: Record<string, Favorite[]> = {};
  for (const fav of favorites) {
    const key = primaryMuscle(fav.exercise.muscleGroups);
    if (!groupMap[key]) groupMap[key] = [];
    groupMap[key].push(fav);
  }
  // Collect any groups not in CANONICAL_GROUPS (e.g. "other")
  const canonicalKeys = new Set(CANONICAL_GROUPS.map((g) => g.key));
  const extraGroups = Object.keys(groupMap)
    .filter((k) => !canonicalKeys.has(k))
    .map((k) => ({ key: k, label: formatLabel(k) }));

  const allGroups = [...CANONICAL_GROUPS, ...extraGroups];

  return (
    <div className="px-4 py-4">
      {/* Intent legend */}
      <div className="mb-4 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-base-700)] border border-[var(--glass-border)]">
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          <span className="text-[var(--color-accent-purple)] font-medium">Progress</span> — AI applies progressive overload.{' '}
          <span className="text-[var(--color-accent-blue)] font-medium">Hypertrophy</span> — AI focuses on rep range & muscle connection.{' '}
          <span className="text-[var(--color-text-secondary)] font-medium">Auto</span> — AI decides based on your goal.
        </p>
      </div>

      {/* Add exercise panel */}
      {showAdd && (
        <AddExercisePanel
          existingExerciseIds={existingExerciseIds}
          onAdded={handleAdded}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Accordion groups */}
      <div className="space-y-2">
        {allGroups.map(({ key, label }) => {
          const favs = groupMap[key] ?? [];
          const isOpen = openGroups.has(key);
          return (
            <div key={key} className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--color-base-700)] overflow-hidden">
              {/* Header row */}
              <button
                type="button"
                onClick={() => toggleGroup(key)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{label}</span>
                  {favs.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(139,92,246,0.20)] text-[var(--color-accent-purple)]">
                      {favs.length}
                    </span>
                  )}
                </div>
                {isOpen
                  ? <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
                  : <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
                }
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="border-t border-[var(--glass-border)] px-4 pb-3">
                  {favs.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)] py-3">
                      No favorites yet for {label.toLowerCase()}.
                    </p>
                  ) : (
                    <div>
                      {favs.map((fav) => (
                        <FavoriteRow
                          key={fav.id}
                          favorite={fav}
                          busy={busyId === fav.id}
                          onTogglePriority={handleTogglePriority}
                          onChangeIntent={handleChangeIntent}
                          onRemove={handleRemove}
                          onAssignMuscle={handleAssignMuscle}
                        />
                      ))}
                    </div>
                  )}
                  {!showAdd && (
                    <button
                      type="button"
                      onClick={() => setShowAdd(true)}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-[var(--color-accent-purple)] py-2 rounded-[var(--radius-sm)] border border-dashed border-[rgba(139,92,246,0.35)] hover:bg-[rgba(139,92,246,0.08)] transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add {label} exercise
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
