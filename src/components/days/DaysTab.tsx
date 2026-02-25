/**
 * DaysTab — Task 6.5: Days UI: list + create template
 *           Task 6.6: Days UI: fixed template editor
 *
 * - Fetches user's day templates from GET /api/templates
 * - Renders each template as a glass card (name, mode badge, estimated time, block/slot count)
 * - "Create Day" wizard: Step 1 choose Fixed vs Slot, Step 2 name + metadata → POST /api/templates
 * - FIXED templates show an "Edit" button that opens the FixedTemplateEditor view
 * - After creation or edit: template list is updated in-place (Acceptance Criteria: persists)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  Layers,
  Shuffle,
  Clock,
  Dumbbell,
  Pencil,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  FixedTemplateEditor,
  type TemplateForEditor,
  type TemplateBlockFull,
  type TemplateSlotFull,
} from './FixedTemplateEditor';
import { SlotTemplateEditor } from './SlotTemplateEditor';

// ── Types ─────────────────────────────────────────────────────────────────────

type TemplateMode = 'FIXED' | 'SLOT';

// TemplateBlock now carries the full data returned by the API (used by editor)
interface TemplateBlock extends TemplateBlockFull {}

// TemplateSlot carries the full slot data returned by the API (used by editor)
interface TemplateSlot extends TemplateSlotFull {}

interface Template extends TemplateForEditor {
  slots: TemplateSlot[];
}

// ── Wizard step 1: choose mode ────────────────────────────────────────────────

interface ChooseModeProps {
  onChoose: (mode: TemplateMode) => void;
  onCancel: () => void;
}

function ChooseModeStep({ onChoose, onCancel }: ChooseModeProps) {
  const [selected, setSelected] = useState<TemplateMode | null>(null);

  return (
    <GlassCard className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">New Day Template</h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        Step 1 of 2 — Choose a template type
      </p>

      {/* Mode cards */}
      <div className="space-y-3 mb-5">
        {/* Fixed */}
        <button
          type="button"
          onClick={() => setSelected('FIXED')}
          aria-pressed={selected === 'FIXED'}
          className={[
            'w-full text-left rounded-[var(--radius-md)] p-3.5 border transition-all duration-150',
            'flex items-start gap-3',
            selected === 'FIXED'
              ? 'border-[var(--color-accent-purple)] bg-[rgba(139,92,246,0.10)]'
              : 'border-[var(--glass-border)] bg-[var(--color-base-700)] hover:border-[rgba(139,92,246,0.35)]',
          ].join(' ')}
        >
          <div
            className={[
              'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
              selected === 'FIXED'
                ? 'bg-[rgba(139,92,246,0.25)]'
                : 'bg-[var(--color-base-600)]',
            ].join(' ')}
          >
            <Layers
              className={[
                'h-4.5 w-4.5',
                selected === 'FIXED'
                  ? 'text-[var(--color-accent-purple)]'
                  : 'text-[var(--color-text-muted)]',
              ].join(' ')}
            />
          </div>
          <div>
            <div className="font-semibold text-sm mb-0.5">Fixed</div>
            <div className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Pre-planned exercises in a fixed order. You choose exactly what to do each time.
            </div>
          </div>
        </button>

        {/* Slot */}
        <button
          type="button"
          onClick={() => setSelected('SLOT')}
          aria-pressed={selected === 'SLOT'}
          className={[
            'w-full text-left rounded-[var(--radius-md)] p-3.5 border transition-all duration-150',
            'flex items-start gap-3',
            selected === 'SLOT'
              ? 'border-[var(--color-accent-purple)] bg-[rgba(139,92,246,0.10)]'
              : 'border-[var(--glass-border)] bg-[var(--color-base-700)] hover:border-[rgba(139,92,246,0.35)]',
          ].join(' ')}
        >
          <div
            className={[
              'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
              selected === 'SLOT'
                ? 'bg-[rgba(139,92,246,0.25)]'
                : 'bg-[var(--color-base-600)]',
            ].join(' ')}
          >
            <Shuffle
              className={[
                'h-4.5 w-4.5',
                selected === 'SLOT'
                  ? 'text-[var(--color-accent-purple)]'
                  : 'text-[var(--color-text-muted)]',
              ].join(' ')}
            />
          </div>
          <div>
            <div className="font-semibold text-sm mb-0.5">Slot</div>
            <div className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Muscle-group slots filled per session. AI or you picks exercises for each slot.
            </div>
          </div>
        </button>
      </div>

      {/* Footer */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => selected && onChoose(selected)}
          disabled={!selected}
          className="btn-primary flex-1 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm px-4">
          Cancel
        </button>
      </div>
    </GlassCard>
  );
}

// ── Wizard step 2: name + metadata ────────────────────────────────────────────

interface TemplateDetailsProps {
  mode: TemplateMode;
  onBack: () => void;
  onSuccess: (template: Template) => void;
  onCancel: () => void;
}

function TemplateDetailsStep({ mode, onBack, onSuccess, onCancel }: TemplateDetailsProps) {
  const [name, setName] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError('Template name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const minutes = estimatedMinutes ? parseInt(estimatedMinutes, 10) : null;

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          mode,
          notes: notes.trim() || null,
          estimatedMinutes: minutes && minutes > 0 ? minutes : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string })?.error ?? `Request failed (${res.status})`
        );
      }

      const data = (await res.json()) as { template: Template };
      onSuccess(data.template);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassCard className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to choose mode"
            className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="font-semibold">New Day Template</h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 mb-4">
        <p className="text-xs text-[var(--color-text-muted)]">
          Step 2 of 2 — Template details
        </p>
        <span
          className={[
            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
            mode === 'FIXED'
              ? 'bg-[rgba(139,92,246,0.15)] text-[var(--color-accent-purple)]'
              : 'bg-[rgba(59,130,246,0.15)] text-[var(--color-accent-blue)]',
          ].join(' ')}
        >
          {mode}
        </span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Name */}
        <div className="mb-3">
          <label htmlFor="tmpl-name" className="block text-sm font-medium mb-1.5">
            Template name <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            id="tmpl-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder={mode === 'FIXED' ? 'e.g. Push A' : 'e.g. Upper Body Slots'}
            maxLength={100}
            autoFocus
            className={[
              'w-full rounded-[var(--radius-md)] px-3 py-2.5 text-sm',
              'bg-[var(--color-base-700)] border transition-colors',
              'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
              nameError
                ? 'border-[var(--color-error)]'
                : 'border-[var(--glass-border)] focus:border-[var(--color-accent-purple)]',
              'outline-none',
            ].join(' ')}
          />
          {nameError && (
            <p className="mt-1.5 text-xs text-[var(--color-error)]">{nameError}</p>
          )}
        </div>

        {/* Estimated minutes */}
        <div className="mb-3">
          <label htmlFor="tmpl-minutes" className="block text-sm font-medium mb-1.5">
            Estimated duration{' '}
            <span className="text-[var(--color-text-muted)] font-normal">(minutes, optional)</span>
          </label>
          <input
            id="tmpl-minutes"
            type="number"
            min={1}
            max={300}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            placeholder="e.g. 60"
            className={[
              'w-full rounded-[var(--radius-md)] px-3 py-2.5 text-sm',
              'bg-[var(--color-base-700)] border border-[var(--glass-border)]',
              'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
              'outline-none focus:border-[var(--color-accent-purple)] transition-colors',
            ].join(' ')}
          />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label htmlFor="tmpl-notes" className="block text-sm font-medium mb-1.5">
            Notes{' '}
            <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
          </label>
          <textarea
            id="tmpl-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything to remember about this day…"
            rows={2}
            maxLength={500}
            className={[
              'w-full rounded-[var(--radius-md)] px-3 py-2.5 text-sm resize-none',
              'bg-[var(--color-base-700)] border border-[var(--glass-border)]',
              'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
              'outline-none focus:border-[var(--color-accent-purple)] transition-colors',
            ].join(' ')}
          />
        </div>

        {/* Global error */}
        {error && (
          <p className="text-xs text-[var(--color-error)] mb-3">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1 text-sm disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create Template'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary text-sm px-4">
            Cancel
          </button>
        </div>
      </form>
    </GlassCard>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
}

function TemplateCard({ template, onEdit }: TemplateCardProps) {
  const isFixed = template.mode === 'FIXED';
  const itemCount = isFixed ? template.blocks.length : template.slots.length;
  const itemLabel = isFixed
    ? `${itemCount} exercise${itemCount !== 1 ? 's' : ''}`
    : `${itemCount} slot${itemCount !== 1 ? 's' : ''}`;

  return (
    <GlassCard className="mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{template.name}</h3>

            {/* Mode badge */}
            <span
              className={[
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide flex-shrink-0',
                isFixed
                  ? 'bg-[rgba(139,92,246,0.15)] text-[var(--color-accent-purple)]'
                  : 'bg-[rgba(59,130,246,0.15)] text-[var(--color-accent-blue)]',
              ].join(' ')}
            >
              {isFixed ? (
                <Layers className="h-2.5 w-2.5 mr-1" />
              ) : (
                <Shuffle className="h-2.5 w-2.5 mr-1" />
              )}
              {template.mode}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {/* Exercise / slot count */}
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <Dumbbell className="h-3 w-3" />
              {itemLabel}
            </span>

            {/* Estimated duration */}
            {template.estimatedMinutes && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <Clock className="h-3 w-3" />
                ~{template.estimatedMinutes} min
              </span>
            )}
          </div>

          {/* Notes preview */}
          {template.notes && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5 line-clamp-2">
              {template.notes}
            </p>
          )}
        </div>

        {/* Edit button — FIXED (Task 6.6) and SLOT (Task 6.7) templates */}
        <button
          type="button"
          onClick={() => onEdit(template)}
          aria-label={`Edit ${template.name}`}
          className={[
            'flex-shrink-0 p-2 rounded-[var(--radius-sm)] transition-colors',
            'text-[var(--color-text-muted)]',
            isFixed
              ? 'hover:text-[var(--color-accent-purple)] hover:bg-[rgba(139,92,246,0.10)]'
              : 'hover:text-[var(--color-accent-blue)] hover:bg-[rgba(59,130,246,0.10)]',
          ].join(' ')}
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </GlassCard>
  );
}

// ── Main DaysTab ──────────────────────────────────────────────────────────────

/** Wizard states: null = wizard closed, 'choose' = step 1, 'details' = step 2 */
type WizardState = null | { step: 'choose' } | { step: 'details'; mode: TemplateMode };

/** View mode for this tab */
type ViewState =
  | { view: 'list' }
  | { view: 'editFixed'; template: Template }
  | { view: 'editSlot'; template: Template };

export function DaysTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [wizard, setWizard] = useState<WizardState>(null);
  const [viewState, setViewState] = useState<ViewState>({ view: 'list' });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error(`Failed to load templates (${res.status})`);
      const data = (await res.json()) as { templates: Template[] };
      setTemplates(data.templates ?? []);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Could not load templates'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function handleTemplateCreated(template: Template) {
    setTemplates((prev) => [template, ...prev]);
    setWizard(null);
  }

  function openWizard() {
    setWizard({ step: 'choose' });
  }

  function closeWizard() {
    setWizard(null);
  }

  /** Called when the user clicks "Edit" on any template card */
  function handleEditTemplate(template: Template) {
    setWizard(null); // close wizard if open
    if (template.mode === 'SLOT') {
      setViewState({ view: 'editSlot', template });
    } else {
      setViewState({ view: 'editFixed', template });
    }
  }

  /** Called by either editor on successful save */
  function handleEditorDone(updated: TemplateForEditor) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === updated.id ? (updated as Template) : t))
    );
    setViewState({ view: 'list' });
  }

  /** Called when the user clicks ← in either editor */
  function handleEditorBack() {
    setViewState({ view: 'list' });
  }

  // ── Fixed template editor view ─────────────────────────────────────────────

  if (viewState.view === 'editFixed') {
    return (
      <FixedTemplateEditor
        template={viewState.template}
        onDone={handleEditorDone}
        onBack={handleEditorBack}
      />
    );
  }

  // ── Slot template editor view ──────────────────────────────────────────────

  if (viewState.view === 'editSlot') {
    return (
      <SlotTemplateEditor
        template={viewState.template}
        onDone={handleEditorDone}
        onBack={handleEditorBack}
      />
    );
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

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

  // ── Fetch error ────────────────────────────────────────────────────────────

  if (fetchError) {
    return (
      <div className="px-4 py-8 flex flex-col items-center text-center">
        <p className="text-sm text-[var(--color-error)] mb-4">{fetchError}</p>
        <button onClick={fetchTemplates} className="btn-secondary text-sm px-4">
          Retry
        </button>
      </div>
    );
  }

  // ── Content ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-4">
      {/* ── Wizard ── */}
      {wizard?.step === 'choose' && (
        <ChooseModeStep
          onChoose={(mode) => setWizard({ step: 'details', mode })}
          onCancel={closeWizard}
        />
      )}

      {wizard?.step === 'details' && (
        <TemplateDetailsStep
          mode={wizard.mode}
          onBack={() => setWizard({ step: 'choose' })}
          onSuccess={handleTemplateCreated}
          onCancel={closeWizard}
        />
      )}

      {/* ── Empty state ── */}
      {!wizard && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-4">
            <CalendarDays className="h-8 w-8 text-[var(--color-accent-purple)]" />
          </div>
          <h2 className="text-lg font-semibold mb-1">No saved workout days</h2>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xs mb-6">
            Save a workout day as a reusable template — fixed exercises or slot-based (by muscle group).
          </p>
          <button onClick={openWizard} className="btn-primary px-6 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Day
          </button>
        </div>
      )}

      {/* ── Template list ── */}
      {templates.length > 0 && (
        <>
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEditTemplate}
            />
          ))}

          {/* Add another button */}
          {!wizard && (
            <button
              onClick={openWizard}
              className="btn-secondary w-full text-sm mt-1 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Day
            </button>
          )}
        </>
      )}
    </div>
  );
}
