/**
 * FixedTemplateEditor — Task 6.6: Days UI: fixed template editor
 *
 * - Lists existing blocks in order with reorder (up/down) controls
 * - Inline block config: sets, rep range (min/max), rest, progression engine
 * - "Add Exercise" opens a search overlay (GET /api/exercises?search=...)
 * - Saves via PUT /api/templates/:id → replaces all blocks
 * - On success: calls onDone(updatedTemplate) so parent list stays fresh
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  Dumbbell,
  Settings2,
  Save,
  Loader2,
} from 'lucide-react';

// ── Shared CSS helpers ─────────────────────────────────────────────────────

const inputCls = [
  'w-full rounded-[var(--radius-sm)] px-2.5 py-2 text-sm',
  'bg-[var(--color-base-600)] border border-[var(--glass-border)]',
  'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
  'outline-none focus:border-[var(--color-accent-purple)] transition-colors',
  'tabular-nums',
].join(' ');

const selectCls = [
  'w-full rounded-[var(--radius-sm)] px-2.5 py-2 text-sm',
  'bg-[var(--color-base-600)] border border-[var(--glass-border)]',
  'text-[var(--color-text-primary)]',
  'outline-none focus:border-[var(--color-accent-purple)] transition-colors',
].join(' ');

// ── Types ──────────────────────────────────────────────────────────────────

type ProgressionEngine =
  | 'DOUBLE_PROGRESSION'
  | 'STRAIGHT_SETS'
  | 'TOP_SET_BACKOFF'
  | 'RPE_BASED'
  | 'NONE';

export interface TemplateBlockFull {
  id: string;
  orderIndex: number;
  exerciseId: string;
  exercise: {
    id: string;
    name: string;
    type: string;
    pattern: string;
    muscleGroups: unknown[];
  };
  setsPlanned: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  progressionEngine: ProgressionEngine | null;
  intensityTarget: unknown;
  notes: string | null;
}

export interface TemplateSlotFull {
  id: string;
  orderIndex: number;
  muscleGroup: string;
  exerciseCount: number;
  patternConstraints: {
    allowedPatterns?: string[];
    excludedPatterns?: string[];
  } | null;
  equipmentConstraints: {
    allowedTypes?: string[];
    excludedTypes?: string[];
  } | null;
  defaultSets: number;
  defaultRepMin: number;
  defaultRepMax: number;
  notes: string | null;
}

export interface TemplateForEditor {
  id: string;
  name: string;
  mode: 'FIXED' | 'SLOT';
  defaultProgressionEngine: string;
  notes: string | null;
  estimatedMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  blocks: TemplateBlockFull[];
  slots: TemplateSlotFull[];
}

interface LocalBlock {
  /** Stable local key: db id for existing, temp string for new. */
  _key: string;
  exerciseId: string;
  exerciseName: string;
  setsPlanned: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  progressionEngine: ProgressionEngine | null;
  notes: string;
}

interface ExerciseOption {
  id: string;
  name: string;
  type: string;
  pattern: string;
  muscleGroups: unknown[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const REST_OPTIONS: { value: number; label: string }[] = [
  { value: 30, label: '30 s' },
  { value: 45, label: '45 s' },
  { value: 60, label: '1 min' },
  { value: 90, label: '1:30' },
  { value: 120, label: '2 min' },
  { value: 150, label: '2:30' },
  { value: 180, label: '3 min' },
  { value: 240, label: '4 min' },
  { value: 300, label: '5 min' },
];

const PROGRESSION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Default (template)' },
  { value: 'DOUBLE_PROGRESSION', label: 'Double Progression' },
  { value: 'STRAIGHT_SETS', label: 'Straight Sets' },
  { value: 'TOP_SET_BACKOFF', label: 'Top Set + Backoff' },
  { value: 'RPE_BASED', label: 'RPE Based' },
  { value: 'NONE', label: 'None (manual)' },
];

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')}`;
}

// ── ExercisePicker overlay ─────────────────────────────────────────────────

interface ExercisePickerProps {
  onSelect: (exercise: ExerciseOption) => void;
  onClose: () => void;
}

function ExercisePicker({ onSelect, onClose }: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState<ExerciseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchExercises = useCallback(async (search: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/exercises?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load exercises (${res.status})`);
      const data = (await res.json()) as { exercises: ExerciseOption[] };
      setExercises(data.exercises ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Could not load exercises');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — all exercises
  useEffect(() => {
    fetchExercises('');
    // Focus the search input
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [fetchExercises]);

  function handleSearch(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchExercises(value), 300);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md mx-auto flex flex-col rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)]"
        style={{
          background: 'var(--color-base-800)',
          border: '1px solid var(--glass-border)',
          maxHeight: '80dvh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--glass-border)] flex-shrink-0">
          <h3 className="font-semibold text-sm">Add Exercise</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close exercise picker"
            className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 border-b border-[var(--glass-border)] flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search exercises…"
              className={[
                'w-full rounded-[var(--radius-md)] pl-9 pr-3 py-2.5 text-sm',
                'bg-[var(--color-base-700)] border border-[var(--glass-border)]',
                'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
                'outline-none focus:border-[var(--color-accent-purple)] transition-colors',
              ].join(' ')}
            />
          </div>
        </div>

        {/* Results list */}
        <div className="overflow-y-auto flex-1 py-1">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" />
            </div>
          )}

          {fetchError && !loading && (
            <p className="text-xs text-[var(--color-error)] text-center py-8 px-4">{fetchError}</p>
          )}

          {!loading && !fetchError && exercises.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-10">
              No exercises found
            </p>
          )}

          {!loading && !fetchError && exercises.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => onSelect(ex)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-base-700)] transition-colors min-h-[44px]"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-base-600)]">
                <Dumbbell className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{ex.name}</div>
                <div className="text-xs text-[var(--color-text-muted)] capitalize">
                  {ex.type.toLowerCase().replace('_', ' ')}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── BlockRow ───────────────────────────────────────────────────────────────

interface BlockRowProps {
  block: LocalBlock;
  index: number;
  total: number;
  onMove: (index: number, dir: 'up' | 'down') => void;
  onRemove: (key: string) => void;
  onChange: (key: string, field: keyof LocalBlock, value: string | number | null) => void;
}

function BlockRow({ block, index, total, onMove, onRemove, onChange }: BlockRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--color-base-700)] mb-2 overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center gap-1.5 px-2 py-2.5 min-h-[52px]">
        {/* Up / Down reorder */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            aria-label={`Move ${block.exerciseName} up`}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-25 transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 'down')}
            disabled={index === total - 1}
            aria-label={`Move ${block.exerciseName} down`}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-25 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Exercise name + config summary (clickable to expand) */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="text-sm font-medium truncate leading-snug">{block.exerciseName}</div>
          <div className="text-xs text-[var(--color-text-muted)] tabular-nums">
            {block.setsPlanned} × {block.repMin}–{block.repMax} · {formatRest(block.restSeconds)}
          </div>
        </button>

        {/* Config toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse config' : 'Edit config'}
          className={[
            'p-1.5 rounded-md transition-colors flex-shrink-0',
            expanded
              ? 'text-[var(--color-accent-purple)] bg-[rgba(139,92,246,0.15)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
          ].join(' ')}
        >
          <Settings2 className="h-4 w-4" />
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={() => onRemove(block._key)}
          aria-label={`Remove ${block.exerciseName}`}
          className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors flex-shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded config panel */}
      {expanded && (
        <div className="border-t border-[var(--glass-border)] px-3 py-3 space-y-3">

          {/* Sets × Rep range — 3-column grid */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                Sets
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={block.setsPlanned}
                onChange={(e) =>
                  onChange(block._key, 'setsPlanned', Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                Rep min
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={block.repMin}
                onChange={(e) =>
                  onChange(block._key, 'repMin', Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                Rep max
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={block.repMax}
                onChange={(e) =>
                  onChange(block._key, 'repMax', Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className={inputCls}
              />
            </div>
          </div>

          {/* Rest */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
              Rest between sets
            </label>
            <select
              value={block.restSeconds}
              onChange={(e) =>
                onChange(block._key, 'restSeconds', parseInt(e.target.value, 10))
              }
              className={selectCls}
            >
              {/* If the stored value isn't in the preset list, add it */}
              {!REST_OPTIONS.find((o) => o.value === block.restSeconds) && (
                <option value={block.restSeconds}>{formatRest(block.restSeconds)}</option>
              )}
              {REST_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Progression engine */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
              Progression
            </label>
            <select
              value={block.progressionEngine ?? ''}
              onChange={(e) =>
                onChange(
                  block._key,
                  'progressionEngine',
                  (e.target.value as ProgressionEngine) || null
                )
              }
              className={selectCls}
            >
              {PROGRESSION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
              Notes{' '}
              <span className="font-normal normal-case text-[var(--color-text-muted)]">
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={block.notes}
              onChange={(e) => onChange(block._key, 'notes', e.target.value)}
              placeholder="e.g. slow eccentric, pause at bottom…"
              maxLength={200}
              className={inputCls}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── FixedTemplateEditor ────────────────────────────────────────────────────

export interface FixedTemplateEditorProps {
  template: TemplateForEditor;
  onDone: (updated: TemplateForEditor) => void;
  onBack: () => void;
}

export function FixedTemplateEditor({ template, onDone, onBack }: FixedTemplateEditorProps) {
  // Initialise local block state from template (sorted by orderIndex)
  const [blocks, setBlocks] = useState<LocalBlock[]>(() =>
    [...template.blocks]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((b) => ({
        _key: b.id,
        exerciseId: b.exerciseId,
        exerciseName: b.exercise.name,
        setsPlanned: b.setsPlanned,
        repMin: b.repMin,
        repMax: b.repMax,
        restSeconds: b.restSeconds,
        progressionEngine: b.progressionEngine,
        notes: b.notes ?? '',
      }))
  );

  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  // Reset savedOk when blocks change
  useEffect(() => {
    setSavedOk(false);
  }, [blocks]);

  // ── Block mutations ──────────────────────────────────────────────────────

  function handleMoveBlock(index: number, dir: 'up' | 'down') {
    setBlocks((prev) => {
      const next = [...prev];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleRemoveBlock(key: string) {
    setBlocks((prev) => prev.filter((b) => b._key !== key));
  }

  function handleBlockChange(
    key: string,
    field: keyof LocalBlock,
    value: string | number | null
  ) {
    setBlocks((prev) => prev.map((b) => (b._key === key ? { ...b, [field]: value } : b)));
  }

  function handleAddExercise(exercise: ExerciseOption) {
    setBlocks((prev) => [
      ...prev,
      {
        _key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        setsPlanned: 3,
        repMin: 8,
        repMax: 12,
        restSeconds: 120,
        progressionEngine: null,
        notes: '',
      },
    ]);
    setShowPicker(false);
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const payload = {
      blocks: blocks.map((b, idx) => ({
        orderIndex: idx,
        exerciseId: b.exerciseId,
        setsPlanned: b.setsPlanned,
        repMin: b.repMin,
        repMax: b.repMax,
        restSeconds: b.restSeconds,
        progressionEngine: b.progressionEngine ?? null,
        notes: b.notes.trim() || null,
      })),
    };

    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string })?.error ?? `Request failed (${res.status})`
        );
      }

      const data = (await res.json()) as { template: TemplateForEditor };
      setSavedOk(true);
      // Brief success state then hand back to parent
      setTimeout(() => onDone(data.template), 700);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Exercise picker overlay */}
      {showPicker && (
        <ExercisePicker onSelect={handleAddExercise} onClose={() => setShowPicker(false)} />
      )}

      <div className="px-4 py-4">
        {/* Page header */}
        <div className="flex items-center gap-2 mb-5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to days list"
            className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors flex-shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold truncate">{template.name}</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Fixed template · Edit blocks</p>
          </div>
        </div>

        {/* Section label */}
        {blocks.length > 0 && (
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
            Exercises ({blocks.length})
          </p>
        )}

        {/* Empty state */}
        {blocks.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-3">
              <Dumbbell className="h-7 w-7 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mb-5">
              No exercises yet — add your first.
            </p>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="btn-primary flex items-center gap-2 text-sm px-6"
            >
              <Plus className="h-4 w-4" />
              Add Exercise
            </button>
          </div>
        )}

        {/* Block list */}
        {blocks.length > 0 && (
          <div className="mb-3">
            {blocks.map((block, index) => (
              <BlockRow
                key={block._key}
                block={block}
                index={index}
                total={blocks.length}
                onMove={handleMoveBlock}
                onRemove={handleRemoveBlock}
                onChange={handleBlockChange}
              />
            ))}
          </div>
        )}

        {/* Add exercise button (when blocks exist) */}
        {blocks.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="btn-secondary w-full text-sm flex items-center justify-center gap-2 mb-4"
          >
            <Plus className="h-4 w-4" />
            Add Exercise
          </button>
        )}

        {/* Save error */}
        {saveError && (
          <p className="text-xs text-[var(--color-error)] mb-3 text-center">{saveError}</p>
        )}

        {/* Save button — always visible so user can persist even an empty template */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || savedOk}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : savedOk ? (
            <>
              <Save className="h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </>
  );
}
