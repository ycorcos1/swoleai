/**
 * FavoritesTab — Task 6.8: Favorites UI: list + toggle
 *
 * - Fetches user favorites from GET /api/favorites
 * - Groups favorites by primary muscle group
 * - Each row shows exercise name, type/pattern meta, and a
 *   Primary | Backup segmented toggle (PATCH /api/favorites/:exerciseId)
 * - Remove button (POST /api/favorites/:exerciseId to toggle off)
 * - Changes persist to the server; optimistic UI update on success
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

// ── Types ──────────────────────────────────────────────────────────────────────

type FavPriority = 'PRIMARY' | 'BACKUP';

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatLabel(s: string): string {
  return s
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Returns the first muscle group of an exercise, or 'Other' if none. */
function primaryMuscle(groups: string[]): string {
  return groups.length > 0 ? groups[0] : 'other';
}

/** Groups an array of favorites by their primary muscle group key. */
function groupByMuscle(favorites: Favorite[]): [string, Favorite[]][] {
  const map = new Map<string, Favorite[]>();
  for (const fav of favorites) {
    const key = primaryMuscle(fav.exercise.muscleGroups as string[]);
    const bucket = map.get(key) ?? [];
    bucket.push(fav);
    map.set(key, bucket);
  }
  // Sort groups alphabetically; put 'other' last
  return [...map.entries()].sort(([a], [b]) => {
    if (a === 'other') return 1;
    if (b === 'other') return -1;
    return a.localeCompare(b);
  });
}

// ── FavoriteRow ────────────────────────────────────────────────────────────────

interface FavoriteRowProps {
  favorite: Favorite;
  busy: boolean;
  onTogglePriority: (fav: Favorite) => void;
  onRemove: (fav: Favorite) => void;
}

function FavoriteRow({
  favorite,
  busy,
  onTogglePriority,
  onRemove,
}: FavoriteRowProps) {
  const isPrimary = favorite.priority === 'PRIMARY';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[var(--glass-border)] last:border-0">
      {/* Exercise info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{favorite.exercise.name}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {formatLabel(favorite.exercise.type)}
          {' · '}
          {formatLabel(favorite.exercise.pattern)}
        </p>
      </div>

      {/* Priority segmented toggle */}
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
          aria-label="Set as Primary"
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
          aria-label="Set as Backup"
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

      {/* Remove button */}
      <button
        type="button"
        disabled={busy}
        onClick={() => onRemove(favorite)}
        aria-label={`Remove ${favorite.exercise.name} from favorites`}
        className={[
          'flex-shrink-0 p-1.5 rounded-[var(--radius-sm)] transition-colors',
          'text-[var(--color-text-muted)] hover:text-[var(--color-error)]',
          'hover:bg-[rgba(239,68,68,0.10)] disabled:opacity-40',
        ].join(' ')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── FavoritesTab ───────────────────────────────────────────────────────────────

export function FavoritesTab() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  /** ID of the favorite currently being updated (null = none) */
  const [busyId, setBusyId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/favorites');
      if (!res.ok) throw new Error(`Failed to load favorites (${res.status})`);
      const data = (await res.json()) as { favorites: Favorite[] };
      setFavorites(data.favorites ?? []);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Could not load favorites'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Toggle between PRIMARY ↔ BACKUP via PATCH */
  async function handleTogglePriority(fav: Favorite) {
    const newPriority: FavPriority =
      fav.priority === 'PRIMARY' ? 'BACKUP' : 'PRIMARY';

    setBusyId(fav.id);
    try {
      const res = await fetch(`/api/favorites/${fav.exercise.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) throw new Error('Priority update failed');
      // Optimistic-confirmed update
      setFavorites((prev) =>
        prev.map((f) =>
          f.id === fav.id ? { ...f, priority: newPriority } : f
        )
      );
    } catch {
      // Server rejected — leave state unchanged; user sees no change
    } finally {
      setBusyId(null);
    }
  }

  /** Remove from favorites via POST (toggle off) */
  async function handleRemove(fav: Favorite) {
    setBusyId(fav.id);
    try {
      const res = await fetch(`/api/favorites/${fav.exercise.id}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Remove failed');
      setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
    } catch {
      // silently leave state unchanged
    } finally {
      setBusyId(null);
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-4 py-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-card p-4 animate-pulse h-16 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--color-base-700)' }}
          />
        ))}
      </div>
    );
  }

  // ── Fetch error ────────────────────────────────────────────────────────────

  if (fetchError) {
    return (
      <div className="px-4 py-8 flex flex-col items-center text-center">
        <p className="text-sm text-[var(--color-error)] mb-4">{fetchError}</p>
        <button onClick={fetchFavorites} className="btn-secondary text-sm px-4">
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-4">
          <Star className="h-8 w-8 text-[var(--color-accent-purple)]" />
        </div>
        <h2 className="text-lg font-semibold mb-1">No favorites yet</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-xs mb-6">
          Mark exercises as favorites (Primary or Backup) to speed up day
          creation and get better AI suggestions.
        </p>
        <button className="btn-secondary px-6">Browse Exercises</button>
      </div>
    );
  }

  // ── Grouped list ───────────────────────────────────────────────────────────

  const groups = groupByMuscle(favorites);

  return (
    <div className="px-4 py-4 space-y-4">
      {groups.map(([muscleKey, favs]) => (
        <GlassCard key={muscleKey}>
          {/* Section header: muscle group name */}
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
            {formatLabel(muscleKey)}
          </h3>

          {/* Rows */}
          <div>
            {favs.map((fav) => (
              <FavoriteRow
                key={fav.id}
                favorite={fav}
                busy={busyId === fav.id}
                onTogglePriority={handleTogglePriority}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
