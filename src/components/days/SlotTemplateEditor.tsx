/**
 * SlotTemplateEditor — Task 6.7: Days UI: slot template editor
 *
 * - Lists existing slots (muscle group, exerciseCount, defaultSets, repRange)
 * - Add Slot: pick from common muscle groups or type a custom one
 * - Reorder slots (up/down), remove slots
 * - Expandable per-slot config:
 *     exerciseCount, defaultSets, defaultRepMin, defaultRepMax,
 *     patternConstraints (allowed/excluded MovementPattern),
 *     equipmentConstraints (allowed/excluded ExerciseType),
 *     notes
 * - Saves via PUT /api/templates/:id with { slots: [...] }
 * - On success: calls onDone(updatedTemplate)
 */

'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Settings2,
  Save,
  Loader2,
  Shuffle,
  Wand2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { type TemplateForEditor, type TemplateSlotFull } from './FixedTemplateEditor';

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

// ── Constants ──────────────────────────────────────────────────────────────

const COMMON_MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'core',
  'lats',
  'traps',
  'forearms',
  'adductors',
];

const MOVEMENT_PATTERNS: { value: string; label: string }[] = [
  { value: 'HORIZONTAL_PUSH', label: 'Horizontal Push' },
  { value: 'HORIZONTAL_PULL', label: 'Horizontal Pull' },
  { value: 'VERTICAL_PUSH', label: 'Vertical Push' },
  { value: 'VERTICAL_PULL', label: 'Vertical Pull' },
  { value: 'HIP_HINGE', label: 'Hip Hinge' },
  { value: 'SQUAT', label: 'Squat' },
  { value: 'LUNGE', label: 'Lunge' },
  { value: 'ISOLATION', label: 'Isolation' },
  { value: 'CARRY', label: 'Carry' },
  { value: 'CORE', label: 'Core' },
  { value: 'OTHER', label: 'Other' },
];

const EXERCISE_TYPES: { value: string; label: string }[] = [
  { value: 'BARBELL', label: 'Barbell' },
  { value: 'DUMBBELL', label: 'Dumbbell' },
  { value: 'MACHINE', label: 'Machine' },
  { value: 'CABLE', label: 'Cable' },
  { value: 'BODYWEIGHT', label: 'Bodyweight' },
  { value: 'OTHER', label: 'Other' },
];

// ── Local slot type ────────────────────────────────────────────────────────

interface LocalSlot {
  /** Stable key: db id for existing, temp string for new. */
  _key: string;
  muscleGroup: string;
  exerciseCount: number;
  allowedPatterns: string[];
  excludedPatterns: string[];
  allowedTypes: string[];
  excludedTypes: string[];
  defaultSets: number;
  defaultRepMin: number;
  defaultRepMax: number;
  notes: string;
}

function slotFromApi(slot: TemplateSlotFull): LocalSlot {
  return {
    _key: slot.id,
    muscleGroup: slot.muscleGroup,
    exerciseCount: slot.exerciseCount,
    allowedPatterns: slot.patternConstraints?.allowedPatterns ?? [],
    excludedPatterns: slot.patternConstraints?.excludedPatterns ?? [],
    allowedTypes: slot.equipmentConstraints?.allowedTypes ?? [],
    excludedTypes: slot.equipmentConstraints?.excludedTypes ?? [],
    defaultSets: slot.defaultSets,
    defaultRepMin: slot.defaultRepMin,
    defaultRepMax: slot.defaultRepMax,
    notes: slot.notes ?? '',
  };
}

function toggleItem(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

// ── Multi-select constraint pill group ─────────────────────────────────────

interface ConstraintPillsProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function ConstraintPills({ label, options, selected, onChange }: ConstraintPillsProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(toggleItem(selected, opt.value))}
              className={[
                'px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all',
                active
                  ? 'border-[var(--color-accent-purple)] bg-[rgba(139,92,246,0.18)] text-[var(--color-accent-purple)]'
                  : 'border-[var(--glass-border)] bg-[var(--color-base-600)] text-[var(--color-text-muted)] hover:border-[rgba(139,92,246,0.40)]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── SlotRow ────────────────────────────────────────────────────────────────

interface SlotRowProps {
  slot: LocalSlot;
  index: number;
  total: number;
  onMove: (index: number, dir: 'up' | 'down') => void;
  onRemove: (key: string) => void;
  onChange: (key: string, patch: Partial<LocalSlot>) => void;
}

function SlotRow({ slot, index, total, onMove, onRemove, onChange }: SlotRowProps) {
  const [expanded, setExpanded] = useState(false);

  const hasConstraints =
    slot.allowedPatterns.length > 0 ||
    slot.excludedPatterns.length > 0 ||
    slot.allowedTypes.length > 0 ||
    slot.excludedTypes.length > 0;

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
            aria-label={`Move ${slot.muscleGroup} slot up`}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-25 transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 'down')}
            disabled={index === total - 1}
            aria-label={`Move ${slot.muscleGroup} slot down`}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-25 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Slot summary (clickable to expand) */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="text-sm font-medium capitalize truncate leading-snug">
            {slot.muscleGroup}
            {hasConstraints && (
              <span className="ml-1.5 text-[10px] font-semibold text-[var(--color-accent-blue)] uppercase tracking-wide">
                constrained
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] tabular-nums">
            {slot.exerciseCount} ex · {slot.defaultSets} × {slot.defaultRepMin}–{slot.defaultRepMax}
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
          onClick={() => onRemove(slot._key)}
          aria-label={`Remove ${slot.muscleGroup} slot`}
          className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors flex-shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded config panel */}
      {expanded && (
        <div className="border-t border-[var(--glass-border)] px-3 py-3 space-y-3">
          {/* Muscle group */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
              Muscle group
            </label>
            <input
              type="text"
              value={slot.muscleGroup}
              onChange={(e) => onChange(slot._key, { muscleGroup: e.target.value })}
              placeholder="e.g. chest, back, quads…"
              maxLength={50}
              className={inputCls}
            />
          </div>

          {/* Exercise count + Sets + Rep range — 4-column grid */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                # Exs
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={slot.exerciseCount}
                onChange={(e) =>
                  onChange(slot._key, {
                    exerciseCount: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                Sets
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={slot.defaultSets}
                onChange={(e) =>
                  onChange(slot._key, {
                    defaultSets: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
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
                value={slot.defaultRepMin}
                onChange={(e) =>
                  onChange(slot._key, {
                    defaultRepMin: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
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
                value={slot.defaultRepMax}
                onChange={(e) =>
                  onChange(slot._key, {
                    defaultRepMax: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                className={inputCls}
              />
            </div>
          </div>

          {/* Pattern constraints */}
          <ConstraintPills
            label="Allowed patterns (optional)"
            options={MOVEMENT_PATTERNS}
            selected={slot.allowedPatterns}
            onChange={(v) => onChange(slot._key, { allowedPatterns: v })}
          />
          <ConstraintPills
            label="Excluded patterns (optional)"
            options={MOVEMENT_PATTERNS}
            selected={slot.excludedPatterns}
            onChange={(v) => onChange(slot._key, { excludedPatterns: v })}
          />

          {/* Equipment constraints */}
          <ConstraintPills
            label="Allowed equipment (optional)"
            options={EXERCISE_TYPES}
            selected={slot.allowedTypes}
            onChange={(v) => onChange(slot._key, { allowedTypes: v })}
          />
          <ConstraintPills
            label="Excluded equipment (optional)"
            options={EXERCISE_TYPES}
            selected={slot.excludedTypes}
            onChange={(v) => onChange(slot._key, { excludedTypes: v })}
          />

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
              Notes{' '}
              <span className="font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={slot.notes}
              onChange={(e) => onChange(slot._key, { notes: e.target.value })}
              placeholder="e.g. prioritise compounds first…"
              maxLength={200}
              className={inputCls}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── AddSlotPanel ────────────────────────────────────────────────────────────

interface AddSlotPanelProps {
  onAdd: (muscleGroup: string) => void;
  onCancel: () => void;
}

function AddSlotPanel({ onAdd, onCancel }: AddSlotPanelProps) {
  const [custom, setCustom] = useState('');

  function handlePick(group: string) {
    onAdd(group);
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = custom.trim();
    if (trimmed) onAdd(trimmed);
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-accent-blue)] bg-[rgba(59,130,246,0.06)] p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[var(--color-text-muted)]">
          Choose muscle group
        </p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {COMMON_MUSCLE_GROUPS.map((mg) => (
          <button
            key={mg}
            type="button"
            onClick={() => handlePick(mg)}
            className="px-2.5 py-1 rounded-full text-xs border border-[var(--glass-border)] bg-[var(--color-base-700)] text-[var(--color-text-muted)] hover:border-[var(--color-accent-blue)] hover:text-[var(--color-accent-blue)] capitalize transition-all"
          >
            {mg}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Custom muscle group…"
          maxLength={50}
          autoFocus
          className={[
            'flex-1 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm',
            'bg-[var(--color-base-600)] border border-[var(--glass-border)]',
            'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
            'outline-none focus:border-[var(--color-accent-blue)] transition-colors',
          ].join(' ')}
        />
        <button
          type="submit"
          disabled={!custom.trim()}
          className="btn-secondary text-xs px-3 disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  );
}

// ── Generated-day types ────────────────────────────────────────────────────

type ExerciseSource = 'favorite_primary' | 'favorite_backup' | 'ai';

interface GeneratedExercise {
  exerciseId: string;
  exerciseName: string;
  setsPlanned: number;
  repMin: number;
  repMax: number;
  source: ExerciseSource;
}

interface GeneratedSlot {
  slotIndex: number;
  muscleGroup: string;
  exerciseCount: number;
  defaultSets: number;
  defaultRepMin: number;
  defaultRepMax: number;
  exercises: GeneratedExercise[];
  unfilledCount: number;
}

interface GeneratedDay {
  generatedDay: GeneratedSlot[];
  templateId: string;
  templateName: string;
  fullyFilled: boolean;
}

// ── Source badge ───────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: ExerciseSource }) {
  if (source === 'favorite_primary') {
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-[rgba(139,92,246,0.18)] text-[var(--color-accent-purple)]">
        Primary
      </span>
    );
  }
  if (source === 'favorite_backup') {
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-[rgba(59,130,246,0.18)] text-[var(--color-accent-blue)]">
        Backup
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-[rgba(234,179,8,0.18)] text-yellow-400">
      AI
    </span>
  );
}

// ── GeneratedDayPreview ────────────────────────────────────────────────────

interface GeneratedDayPreviewProps {
  result: GeneratedDay;
  onAccept: () => void;
  onDismiss: () => void;
  accepting: boolean;
  acceptError: string | null;
}

function GeneratedDayPreview({
  result,
  onAccept,
  onDismiss,
  accepting,
  acceptError,
}: GeneratedDayPreviewProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-accent-purple)] bg-[rgba(139,92,246,0.06)] overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-[var(--color-accent-purple)]" />
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Generated Day Preview
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss preview"
          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Slot-by-slot exercise list */}
      <div className="px-3 py-2 space-y-3">
        {result.generatedDay.map((slot) => (
          <div key={slot.slotIndex}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1 capitalize">
              {slot.muscleGroup}
            </p>
            {slot.exercises.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] italic">
                No exercises found for this slot.
              </p>
            ) : (
              <ul className="space-y-1">
                {slot.exercises.map((ex) => (
                  <li
                    key={ex.exerciseId}
                    className="flex items-center gap-2 text-xs bg-[var(--color-base-700)] rounded px-2 py-1.5"
                  >
                    <span className="flex-1 font-medium truncate">{ex.exerciseName}</span>
                    <span className="text-[var(--color-text-muted)] tabular-nums flex-shrink-0">
                      {ex.setsPlanned}×{ex.repMin}–{ex.repMax}
                    </span>
                    <SourceBadge source={ex.source} />
                  </li>
                ))}
              </ul>
            )}
            {slot.unfilledCount > 0 && (
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                {slot.unfilledCount} exercise{slot.unfilledCount > 1 ? 's' : ''} could not be filled.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Accept error */}
      {acceptError && (
        <div className="mx-3 mb-2 flex items-center gap-1.5 text-xs text-[var(--color-error)]">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {acceptError}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-3 pb-3">
        <button
          type="button"
          onClick={onDismiss}
          className="btn-secondary flex-1 text-xs py-2"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={accepting}
          className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {accepting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              Save as Fixed Template
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── SlotTemplateEditor ─────────────────────────────────────────────────────

export interface SlotTemplateEditorProps {
  template: TemplateForEditor;
  onDone: (updated: TemplateForEditor) => void;
  onBack: () => void;
}

export function SlotTemplateEditor({ template, onDone, onBack }: SlotTemplateEditorProps) {
  // Initialise local slot state from template (sorted by orderIndex)
  const [slots, setSlots] = useState<LocalSlot[]>(() =>
    [...template.slots]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(slotFromApi)
  );

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  // ── Generate-from-favorites state ──────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedDay, setGeneratedDay] = useState<GeneratedDay | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptedTemplateName, setAcceptedTemplateName] = useState<string | null>(null);

  // Reset savedOk when slots change
  useEffect(() => {
    setSavedOk(false);
  }, [slots]);

  // ── Slot mutations ─────────────────────────────────────────────────────

  function handleMoveSlot(index: number, dir: 'up' | 'down') {
    setSlots((prev) => {
      const next = [...prev];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleRemoveSlot(key: string) {
    setSlots((prev) => prev.filter((s) => s._key !== key));
  }

  function handleSlotChange(key: string, patch: Partial<LocalSlot>) {
    setSlots((prev) => prev.map((s) => (s._key === key ? { ...s, ...patch } : s)));
  }

  function handleAddSlot(muscleGroup: string) {
    setSlots((prev) => [
      ...prev,
      {
        _key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        muscleGroup,
        exerciseCount: 1,
        allowedPatterns: [],
        excludedPatterns: [],
        allowedTypes: [],
        excludedTypes: [],
        defaultSets: 3,
        defaultRepMin: 8,
        defaultRepMax: 12,
        notes: '',
      },
    ]);
    setShowAddPanel(false);
  }

  // ── Generate from favorites ────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    setGeneratedDay(null);
    setAcceptedTemplateName(null);

    try {
      const res = await fetch(`/api/templates/${template.id}/generate-day`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string })?.error ?? `Request failed (${res.status})`,
        );
      }

      const data = (await res.json()) as GeneratedDay;
      setGeneratedDay(data);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate day');
    } finally {
      setGenerating(false);
    }
  }

  async function handleAcceptGenerated() {
    if (!generatedDay) return;

    setAccepting(true);
    setAcceptError(null);

    // Flatten slot exercises into ordered blocks for a new FIXED template
    const blocks: {
      orderIndex: number;
      exerciseId: string;
      setsPlanned: number;
      repMin: number;
      repMax: number;
      restSeconds: number;
    }[] = [];

    let blockIdx = 0;
    for (const slot of generatedDay.generatedDay) {
      for (const ex of slot.exercises) {
        blocks.push({
          orderIndex: blockIdx++,
          exerciseId: ex.exerciseId,
          setsPlanned: ex.setsPlanned,
          repMin: ex.repMin,
          repMax: ex.repMax,
          restSeconds: 120,
        });
      }
    }

    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const newName = `${template.name} – ${today}`;

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          mode: 'FIXED',
          blocks,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string })?.error ?? `Request failed (${res.status})`,
        );
      }

      setAcceptedTemplateName(newName);
      setGeneratedDay(null);
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setAccepting(false);
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const payload = {
      slots: slots.map((s, idx) => ({
        orderIndex: idx,
        muscleGroup: s.muscleGroup.trim() || 'unknown',
        exerciseCount: s.exerciseCount,
        defaultSets: s.defaultSets,
        defaultRepMin: s.defaultRepMin,
        defaultRepMax: s.defaultRepMax,
        patternConstraints:
          s.allowedPatterns.length > 0 || s.excludedPatterns.length > 0
            ? {
                ...(s.allowedPatterns.length > 0 ? { allowedPatterns: s.allowedPatterns } : {}),
                ...(s.excludedPatterns.length > 0 ? { excludedPatterns: s.excludedPatterns } : {}),
              }
            : null,
        equipmentConstraints:
          s.allowedTypes.length > 0 || s.excludedTypes.length > 0
            ? {
                ...(s.allowedTypes.length > 0 ? { allowedTypes: s.allowedTypes } : {}),
                ...(s.excludedTypes.length > 0 ? { excludedTypes: s.excludedTypes } : {}),
              }
            : null,
        notes: s.notes.trim() || null,
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
      setTimeout(() => onDone(data.template), 700);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
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
          <p className="text-xs text-[var(--color-text-muted)]">Slot template · Edit slots</p>
        </div>
      </div>

      {/* Generate from Favorites — action button */}
      {slots.length > 0 && !generatedDay && (
        <div className="mb-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Generate from Favorites
              </>
            )}
          </button>
          {generateError && (
            <p className="text-xs text-[var(--color-error)] mt-1.5 text-center">
              {generateError}
            </p>
          )}
          {acceptedTemplateName && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[var(--color-success)] justify-center">
              <Check className="h-3.5 w-3.5" />
              Saved as &ldquo;{acceptedTemplateName}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Generated day preview */}
      {generatedDay && (
        <GeneratedDayPreview
          result={generatedDay}
          onAccept={handleAcceptGenerated}
          onDismiss={() => setGeneratedDay(null)}
          accepting={accepting}
          acceptError={acceptError}
        />
      )}

      {/* Section label */}
      {slots.length > 0 && (
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          Slots ({slots.length})
        </p>
      )}

      {/* Empty state */}
      {slots.length === 0 && !showAddPanel && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-3">
            <Shuffle className="h-7 w-7 text-[var(--color-text-muted)]" />
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            No slots yet — add a muscle group slot.
          </p>
          <button
            type="button"
            onClick={() => setShowAddPanel(true)}
            className="btn-primary flex items-center gap-2 text-sm px-6"
          >
            <Plus className="h-4 w-4" />
            Add Slot
          </button>
        </div>
      )}

      {/* Add slot panel */}
      {showAddPanel && (
        <AddSlotPanel onAdd={handleAddSlot} onCancel={() => setShowAddPanel(false)} />
      )}

      {/* Slot list */}
      {slots.length > 0 && (
        <div className="mb-3">
          {slots.map((slot, index) => (
            <SlotRow
              key={slot._key}
              slot={slot}
              index={index}
              total={slots.length}
              onMove={handleMoveSlot}
              onRemove={handleRemoveSlot}
              onChange={handleSlotChange}
            />
          ))}
        </div>
      )}

      {/* Add slot button (when slots exist) */}
      {slots.length > 0 && !showAddPanel && (
        <button
          type="button"
          onClick={() => setShowAddPanel(true)}
          className="btn-secondary w-full text-sm flex items-center justify-center gap-2 mb-4"
        >
          <Plus className="h-4 w-4" />
          Add Slot
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
  );
}
