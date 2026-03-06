'use client';

/**
 * AddExerciseSheet — Task 5.8 / Task B.3
 *
 * A bottom sheet for searching and adding exercises mid-workout.
 *
 * Features:
 * - Search input (client-side filter over fetched exercise list)
 * - Favorites pinned to the top (fetched from /api/favorites)
 * - All other exercises listed below
 * - Per-row loading indicator while exercise is being added
 * - Instant add: exercise appears in workout immediately (IndexedDB write)
 * - "Create custom exercise" inline form (Task B.3)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Search, Star, Dumbbell, Loader2, Plus, ChevronDown } from 'lucide-react';
import type { ActiveSessionExercise } from '@/lib/offline';

// =============================================================================
// TYPES
// =============================================================================

interface Exercise {
  id: string;
  name: string;
  type: string;
  pattern: string;
  muscleGroups: string[];
  isCustom: boolean;
}

interface FavoriteItem {
  id: string;
  priority: string;
  exercise: Exercise;
}

export interface AddExerciseSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback to close the sheet */
  onClose: () => void;
  /**
   * Callback to add an exercise to the active session.
   * Receives the exercise data needed by useActiveSession.addExercise.
   */
  onAddExercise: (
    exercise: Omit<ActiveSessionExercise, 'orderIndex' | 'sets'>
  ) => Promise<void>;
  /** IDs of exercises already in the session (to show "added" state) */
  currentExerciseIds?: string[];
}

// =============================================================================
// HELPERS
// =============================================================================

/** Generate a local ID for the new exercise entry (mirrors SetLoggerSheet pattern) */
function generateLocalId(): string {
  return `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Format muscleGroups for display (up to 2, then "+N more") */
function formatMuscleGroups(groups: string[]): string {
  if (!groups || groups.length === 0) return '';
  const display = groups.slice(0, 2).map((g) => g.replace(/_/g, ' '));
  if (groups.length > 2) {
    return `${display.join(', ')} +${groups.length - 2}`;
  }
  return display.join(', ');
}

// =============================================================================
// EXERCISE ROW COMPONENT
// =============================================================================

interface ExerciseRowProps {
  exercise: Exercise;
  isFavorite?: boolean;
  isAdded?: boolean;
  isAdding?: boolean;
  onSelect: (exercise: Exercise) => void;
}

function ExerciseRow({
  exercise,
  isFavorite,
  isAdded,
  isAdding,
  onSelect,
}: ExerciseRowProps) {
  const muscleGroupStr = formatMuscleGroups(exercise.muscleGroups as string[]);

  return (
    <button
      type="button"
      onClick={() => onSelect(exercise)}
      disabled={isAdding || isAdded}
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.99]
        ${isAdded
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-[var(--color-base-700)] active:bg-[var(--color-base-600)]'
        }
      `}
      aria-label={`Add ${exercise.name} to workout`}
    >
      {/* Icon */}
      <div
        className={`
          flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl
          ${isFavorite
            ? 'bg-[var(--color-warning)]/20'
            : 'bg-[var(--color-base-600)]'
          }
        `}
      >
        {isFavorite ? (
          <Star className="h-5 w-5 text-[var(--color-warning)] fill-[var(--color-warning)]" />
        ) : (
          <Dumbbell className="h-5 w-5 text-[var(--color-text-muted)]" />
        )}
      </div>

      {/* Exercise info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-[var(--color-text-primary)] truncate">
          {exercise.name}
        </p>
        {muscleGroupStr && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate capitalize">
            {muscleGroupStr}
          </p>
        )}
      </div>

      {/* Right-side indicator */}
      <div className="flex-shrink-0">
        {isAdding ? (
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent-purple)]" />
        ) : isAdded ? (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[var(--color-base-600)] text-[var(--color-text-muted)]">
            Added
          </span>
        ) : (
          <Plus className="h-5 w-5 text-[var(--color-text-muted)]" />
        )}
      </div>
    </button>
  );
}

// =============================================================================
// SECTION HEADER COMPONENT
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
// CREATE CUSTOM EXERCISE FORM
// =============================================================================

const EXERCISE_TYPES = [
  { value: 'BARBELL', label: 'Barbell' },
  { value: 'DUMBBELL', label: 'Dumbbell' },
  { value: 'CABLE', label: 'Cable' },
  { value: 'MACHINE', label: 'Machine' },
  { value: 'BODYWEIGHT', label: 'Bodyweight' },
  { value: 'OTHER', label: 'Other' },
];

const MUSCLE_GROUPS = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'quads', label: 'Quads' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'calves', label: 'Calves' },
  { value: 'core', label: 'Core' },
  { value: 'other', label: 'Other' },
];

interface CreateExerciseFormProps {
  initialName?: string;
  onCreated: (exercise: Exercise) => void;
  onCancel: () => void;
}

function CreateExerciseForm({ initialName = '', onCreated, onCancel }: CreateExerciseFormProps) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState('OTHER');
  const [muscleGroup, setMuscleGroup] = useState('other');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 50);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          muscleGroups: [muscleGroup],
          equipmentTags: [],
          jointStressFlags: {},
        }),
      });
      const data = await res.json() as { exercise?: Exercise; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to create exercise');
        return;
      }
      if (data.exercise) onCreated(data.exercise);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 flex flex-col gap-3 border-t border-[var(--glass-border)]">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Create custom exercise</p>

      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name"
        maxLength={100}
        className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-base-700)] border border-[var(--glass-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-purple)]/50"
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full appearance-none px-3 py-2.5 rounded-xl bg-[var(--color-base-700)] border border-[var(--glass-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-purple)]/50 pr-8"
          >
            {EXERCISE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value)}
            className="w-full appearance-none px-3 py-2.5 rounded-xl bg-[var(--color-base-700)] border border-[var(--glass-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-purple)]/50 pr-8"
          >
            {MUSCLE_GROUPS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none" />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-[var(--color-base-600)] text-sm font-medium text-[var(--color-text-secondary)] hover:opacity-90 transition-opacity"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent-purple)] text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {saving ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  );
}

// =============================================================================
// CREATE EXERCISE BUTTON
// =============================================================================

function CreateExerciseButton({ query, onClick }: { query: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-base-700)] transition-colors"
    >
      <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-purple)]/20">
        <Plus className="h-5 w-5 text-[var(--color-accent-purple)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-[var(--color-accent-purple)]">
          {query ? `Create "${query}"` : 'Create custom exercise'}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">Add an exercise not in the list</p>
      </div>
    </button>
  );
}

// =============================================================================
// ADD EXERCISE SHEET COMPONENT
// =============================================================================

export function AddExerciseSheet({
  isOpen,
  onClose,
  onAddExercise,
  currentExerciseIds = [],
}: AddExerciseSheetProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch exercises + favorites when the sheet opens
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setShowCreateForm(false);
      return;
    }

    setIsLoading(true);

    Promise.all([
      fetch('/api/exercises').then((r) => r.json()),
      fetch('/api/favorites').then((r) => r.json()),
    ])
      .then(([exercisesData, favoritesData]) => {
        setExercises((exercisesData as { exercises?: Exercise[] }).exercises ?? []);
        setFavorites((favoritesData as { favorites?: FavoriteItem[] }).favorites ?? []);
      })
      .catch((err) => {
        console.error('Failed to fetch exercises/favorites:', err);
      })
      .finally(() => {
        setIsLoading(false);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      });
  }, [isOpen]);

  // Derive favorite exercise IDs for quick lookup
  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.exercise.id)),
    [favorites]
  );

  // Current session exercise IDs set for "already added" display
  const currentIds = useMemo(
    () => new Set(currentExerciseIds),
    [currentExerciseIds]
  );

  // Filter helpers
  const normalizedQuery = query.toLowerCase().trim();

  const matchesQuery = useCallback(
    (exercise: Exercise): boolean => {
      if (!normalizedQuery) return true;
      return exercise.name.toLowerCase().includes(normalizedQuery);
    },
    [normalizedQuery]
  );

  // Favorites filtered by query — pinned to top
  const filteredFavorites = useMemo(
    () => favorites.filter((f) => matchesQuery(f.exercise)),
    [favorites, matchesQuery]
  );

  // Non-favorite exercises filtered by query
  const filteredNonFavorites = useMemo(
    () =>
      exercises
        .filter((e) => !favoriteIds.has(e.id))
        .filter(matchesQuery),
    [exercises, favoriteIds, matchesQuery]
  );

  const totalResults = filteredFavorites.length + filteredNonFavorites.length;

  // Handle selecting an exercise to add to the session
  const handleSelectExercise = useCallback(
    async (exercise: Exercise) => {
      if (addingId) return;

      setAddingId(exercise.id);
      try {
        await onAddExercise({
          localId: generateLocalId(),
          exerciseId: exercise.id,
          exerciseName: exercise.name,
        });
        onClose();
      } catch (error) {
        console.error('Failed to add exercise:', error);
      } finally {
        setAddingId(null);
      }
    },
    [addingId, onAddExercise, onClose]
  );

  // Handle custom exercise created — add it to the list and immediately add to session
  const handleExerciseCreated = useCallback(
    async (exercise: Exercise) => {
      setExercises((prev) => [...prev, exercise]);
      setShowCreateForm(false);
      await handleSelectExercise(exercise);
    },
    [handleSelectExercise]
  );

  if (!isOpen) return null;

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
          <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
            <h2 className="text-lg font-bold">Add Exercise</h2>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-[var(--color-text-secondary)]" />
            </button>
          </div>

          {/* Search input */}
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exercises…"
                className="
                  w-full pl-9 pr-4 py-2.5 rounded-xl
                  bg-[var(--color-base-700)] border border-[var(--glass-border)]
                  text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-purple)]/50
                  transition-all
                "
              />
            </div>
          </div>

          {/* Create form (shown inline when triggered) */}
          {showCreateForm && (
            <div className="flex-shrink-0">
              <CreateExerciseForm
                initialName={query}
                onCreated={handleExerciseCreated}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          )}

          {/* Exercise list */}
          {!showCreateForm && (
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent-purple)]" />
                </div>
              ) : totalResults === 0 ? (
                /* Empty state — show create CTA prominently */
                <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-4">
                  <Dumbbell className="h-12 w-12 text-[var(--color-text-muted)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                      {query ? `No results for "${query}"` : 'No exercises found'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Create a custom exercise to add it to your workout
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-accent-purple)] text-sm font-medium text-white hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-4 w-4" />
                    {query ? `Create "${query}"` : 'Create custom exercise'}
                  </button>
                </div>
              ) : (
                <>
                  {/* ⭐ Favorites section — pinned to top */}
                  {filteredFavorites.length > 0 && (
                    <section>
                      <SectionHeader label="⭐ Favorites" />
                      {filteredFavorites.map((fav) => (
                        <ExerciseRow
                          key={fav.exercise.id}
                          exercise={fav.exercise}
                          isFavorite
                          isAdded={currentIds.has(fav.exercise.id)}
                          isAdding={addingId === fav.exercise.id}
                          onSelect={handleSelectExercise}
                        />
                      ))}
                    </section>
                  )}

                  {/* All exercises section */}
                  {filteredNonFavorites.length > 0 && (
                    <section>
                      <SectionHeader
                        label={
                          filteredFavorites.length > 0 ? 'All Exercises' : 'Exercises'
                        }
                      />
                      {filteredNonFavorites.map((exercise) => (
                        <ExerciseRow
                          key={exercise.id}
                          exercise={exercise}
                          isAdded={currentIds.has(exercise.id)}
                          isAdding={addingId === exercise.id}
                          onSelect={handleSelectExercise}
                        />
                      ))}
                    </section>
                  )}

                  {/* Create custom exercise button at the bottom of results */}
                  <CreateExerciseButton
                    query={query}
                    onClick={() => setShowCreateForm(true)}
                  />

                  <div className="h-6" />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
