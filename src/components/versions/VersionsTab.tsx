/**
 * VersionsTab — Task 6.9 + Task 8.3 + Task 8.4
 *
 * Lists program blocks (with nested routine versions).
 * Each version row has:
 *   - "Diff vs prev" — compares this version with the one before it
 *   - "Rollback" — rolls the active routine back to this version
 *
 * Diff modal shows:
 *   - Template block changes (added / removed / changed exercises/reps)
 *   - Schedule day template assignment changes
 *   - Favorite changes
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  ChevronDown,
  ChevronRight,
  Clock,
  BookOpen,
  RotateCcw,
  GitCompare,
  Plus,
  Minus,
  ArrowRight,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoutineVersionSummary {
  id: string;
  versionNumber: number;
  changelog: string | null;
  createdAt: string;
}

interface ProgramBlockSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  routineVersions: RoutineVersionSummary[];
}

interface VersionsApiResponse {
  programBlocks: ProgramBlockSummary[];
  unlinkedVersions: RoutineVersionSummary[];
}

// Compare API types
interface BlockDiff {
  orderIndex: number;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  from: { exerciseName: string; setsPlanned: number; repMin: number; repMax: number } | null;
  to: { exerciseName: string; setsPlanned: number; repMin: number; repMax: number } | null;
  changes: string[];
}

interface TemplateDiff {
  templateId: string;
  templateName: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  blocks: BlockDiff[];
}

interface ScheduleDayDiff {
  weekday: string;
  status: 'changed' | 'unchanged';
  from: { templateId: string | null; isRest: boolean };
  to: { templateId: string | null; isRest: boolean };
}

interface VersionDiff {
  templates: TemplateDiff[];
  scheduleDays: ScheduleDayDiff[];
  favorites: { added: string[]; removed: string[] };
}

interface CompareApiResponse {
  from: { id: string; versionNumber: number; changelog: string | null };
  to: { id: string; versionNumber: number; changelog: string | null };
  diff: VersionDiff;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function blockDateRange(block: ProgramBlockSummary): string {
  const start = formatDate(block.startDate);
  const end = block.endDate ? formatDate(block.endDate) : 'Ongoing';
  return `${start} – ${end}`;
}

// ── DiffModal ─────────────────────────────────────────────────────────────────

function DiffModal({
  data,
  onClose,
}: {
  data: CompareApiResponse;
  onClose: () => void;
}) {
  const { from, to, diff } = data;
  const changedTemplates = diff.templates.filter((t) => t.status !== 'unchanged');
  const changedDays = diff.scheduleDays.filter((d) => d.status === 'changed');
  const hasFavChanges =
    diff.favorites.added.length > 0 || diff.favorites.removed.length > 0;
  const hasAnyChanges =
    changedTemplates.length > 0 || changedDays.length > 0 || hasFavChanges;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-[var(--radius-lg)] bg-[var(--color-base-800)] border border-[var(--glass-border)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-[var(--glass-border)]">
          <GitCompare className="h-4 w-4 text-[var(--color-accent-purple)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              v{from.versionNumber}{' '}
              <ArrowRight className="inline h-3 w-3 mx-0.5 text-[var(--color-text-muted)]" />{' '}
              v{to.versionNumber}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">
              {to.changelog ?? 'No description'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-md hover:bg-[var(--color-base-600)] transition-colors"
            aria-label="Close diff"
          >
            <X className="h-4 w-4 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {!hasAnyChanges && (
            <p className="text-sm text-center text-[var(--color-text-muted)] py-6 italic">
              No differences between these versions.
            </p>
          )}

          {/* Template diffs */}
          {changedTemplates.map((t) => (
            <div key={t.templateId}>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                {t.status === 'added' && (
                  <span className="text-emerald-400">+ </span>
                )}
                {t.status === 'removed' && (
                  <span className="text-rose-400">- </span>
                )}
                {t.templateName}
              </p>

              {t.blocks
                .filter((b) => b.status !== 'unchanged')
                .map((b) => (
                  <div
                    key={b.orderIndex}
                    className={[
                      'flex items-start gap-2 py-2 border-b border-[var(--glass-border)] last:border-0 text-xs',
                    ].join(' ')}
                  >
                    {/* Status icon */}
                    {b.status === 'added' && (
                      <Plus className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
                    )}
                    {b.status === 'removed' && (
                      <Minus className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-rose-400" />
                    )}
                    {b.status === 'changed' && (
                      <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {b.status === 'added'
                          ? b.to?.exerciseName
                          : b.status === 'removed'
                          ? b.from?.exerciseName
                          : `Slot ${b.orderIndex + 1}`}
                      </p>
                      {b.changes.map((c, i) => (
                        <p key={i} className="text-[var(--color-text-muted)] mt-0.5">
                          {c}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}

              {t.blocks.filter((b) => b.status !== 'unchanged').length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)] italic py-1">
                  Template {t.status}.
                </p>
              )}
            </div>
          ))}

          {/* Schedule day diffs */}
          {changedDays.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                Schedule changes
              </p>
              {changedDays.map((d) => (
                <div
                  key={d.weekday}
                  className="flex items-center gap-2 py-1.5 border-b border-[var(--glass-border)] last:border-0 text-xs"
                >
                  <span className="w-24 text-[var(--color-text-muted)] capitalize">
                    {d.weekday.toLowerCase()}
                  </span>
                  <span className="text-[var(--color-text-primary)] truncate">
                    {d.from.isRest
                      ? 'Rest'
                      : d.from.templateId
                      ? `(template)`
                      : 'Unassigned'}
                  </span>
                  <ArrowRight className="h-3 w-3 flex-shrink-0 text-[var(--color-text-muted)]" />
                  <span className="text-[var(--color-text-primary)] truncate">
                    {d.to.isRest
                      ? 'Rest'
                      : d.to.templateId
                      ? `(template)`
                      : 'Unassigned'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Favorite diffs */}
          {hasFavChanges && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                Favorites
              </p>
              {diff.favorites.added.map((id) => (
                <div key={id} className="flex items-center gap-2 py-1 text-xs">
                  <Plus className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                  <span className="text-[var(--color-text-muted)] font-mono">{id}</span>
                </div>
              ))}
              {diff.favorites.removed.map((id) => (
                <div key={id} className="flex items-center gap-2 py-1 text-xs">
                  <Minus className="h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
                  <span className="text-[var(--color-text-muted)] font-mono">{id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RollbackConfirmModal ──────────────────────────────────────────────────────

function RollbackConfirmModal({
  version,
  onConfirm,
  onCancel,
  loading,
  error,
  success,
}: {
  version: RoutineVersionSummary;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
  success: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-base-800)] border border-[var(--glass-border)] shadow-2xl p-5">
        {success ? (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
            <p className="font-semibold text-[var(--color-text-primary)]">
              Rolled back successfully
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Your routine has been restored to v{version.versionNumber}.
            </p>
            <button onClick={onCancel} className="btn-secondary w-full text-sm mt-2">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-4">
              <RotateCcw className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">
                  Rollback to v{version.versionNumber}?
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                  This will restore your split, templates, and favorites to
                  the state captured in v{version.versionNumber}. A new version
                  will be created recording this rollback.
                </p>
              </div>
            </div>

            {version.changelog && (
              <div className="mb-4 p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-base-700)] text-xs text-[var(--color-text-muted)] italic">
                &ldquo;{version.changelog}&rdquo;
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 mb-3 p-2.5 rounded-[var(--radius-sm)] bg-[rgba(239,68,68,0.1)] text-xs text-[var(--color-error)]">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onCancel}
                disabled={loading}
                className="btn-secondary flex-1 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2 px-4 rounded-[var(--radius-md)] bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Rolling back…' : 'Confirm rollback'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── VersionRow ────────────────────────────────────────────────────────────────

function VersionRow({
  version,
  prevVersion,
  onRollback,
}: {
  version: RoutineVersionSummary;
  prevVersion: RoutineVersionSummary | null;
  onRollback: (v: RoutineVersionSummary) => void;
}) {
  const [diffData, setDiffData] = useState<CompareApiResponse | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const handleCompare = useCallback(async () => {
    if (!prevVersion) return;
    if (diffData) {
      setShowDiff(true);
      return;
    }
    setDiffLoading(true);
    setDiffError(null);
    try {
      const res = await fetch(
        `/api/versions/${prevVersion.id}/compare?to=${version.id}`
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Compare failed (${res.status})`);
      }
      const data = (await res.json()) as CompareApiResponse;
      setDiffData(data);
      setShowDiff(true);
    } catch (err) {
      setDiffError(err instanceof Error ? err.message : 'Compare failed');
    } finally {
      setDiffLoading(false);
    }
  }, [prevVersion, version.id, diffData]);

  return (
    <>
      <div className="flex items-start gap-3 py-2.5 border-b border-[var(--glass-border)] last:border-0">
        {/* Version badge */}
        <span
          className={[
            'flex-shrink-0 flex items-center justify-center',
            'w-8 h-8 rounded-full text-xs font-bold tabular-nums',
            'bg-[rgba(139,92,246,0.12)] text-[var(--color-accent-purple)]',
          ].join(' ')}
        >
          v{version.versionNumber}
        </span>

        {/* Changelog + date */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--color-text-primary)] leading-snug">
            {version.changelog ?? (
              <span className="italic text-[var(--color-text-muted)]">
                No description
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)] flex items-center gap-1">
            <Clock className="h-3 w-3 flex-shrink-0" />
            {formatDate(version.createdAt)}
          </p>

          {/* Action buttons */}
          <div className="mt-1.5 flex items-center gap-2">
            {prevVersion && (
              <button
                onClick={handleCompare}
                disabled={diffLoading}
                className={[
                  'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors',
                  'bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)]',
                  'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                  'disabled:opacity-50',
                ].join(' ')}
                title={`Compare v${prevVersion.versionNumber} → v${version.versionNumber}`}
              >
                <GitCompare className="h-3 w-3" />
                {diffLoading ? 'Loading…' : 'Diff'}
              </button>
            )}
            <button
              onClick={() => onRollback(version)}
              className={[
                'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors',
                'bg-[rgba(245,158,11,0.12)] hover:bg-[rgba(245,158,11,0.2)]',
                'text-amber-400 hover:text-amber-300',
              ].join(' ')}
              title={`Rollback to v${version.versionNumber}`}
            >
              <RotateCcw className="h-3 w-3" />
              Rollback
            </button>
          </div>

          {diffError && (
            <p className="mt-1 text-xs text-[var(--color-error)]">{diffError}</p>
          )}
        </div>
      </div>

      {showDiff && diffData && (
        <DiffModal data={diffData} onClose={() => setShowDiff(false)} />
      )}
    </>
  );
}

// ── ProgramBlockCard ──────────────────────────────────────────────────────────

function ProgramBlockCard({
  block,
  onRollback,
}: {
  block: ProgramBlockSummary;
  onRollback: (v: RoutineVersionSummary) => void;
}) {
  const [expanded, setExpanded] = useState(block.routineVersions.length > 0);
  const vCount = block.routineVersions.length;

  return (
    <GlassCard className="mb-3">
      {/* Block header — click to toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={[
          'flex items-center gap-3 w-full text-left -m-1 p-1 rounded-[var(--radius-sm)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-purple)]',
          'transition-colors hover:bg-[rgba(255,255,255,0.03)]',
        ].join(' ')}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]" />
        )}
        <BookOpen className="h-4 w-4 flex-shrink-0 text-[var(--color-accent-purple)]" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{block.name}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {blockDateRange(block)}
          </p>
        </div>
        <span
          className={[
            'flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium',
            vCount > 0
              ? 'bg-[rgba(139,92,246,0.15)] text-[var(--color-accent-purple)]'
              : 'bg-[var(--color-base-600)] text-[var(--color-text-muted)]',
          ].join(' ')}
        >
          {vCount} version{vCount !== 1 ? 's' : ''}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
          {vCount === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] italic py-1">
              No versions recorded for this block yet.
            </p>
          ) : (
            block.routineVersions.map((v, idx) => (
              <VersionRow
                key={v.id}
                version={v}
                prevVersion={block.routineVersions[idx + 1] ?? null}
                onRollback={onRollback}
              />
            ))
          )}
        </div>
      )}
    </GlassCard>
  );
}

// ── UnlinkedVersionsSection ───────────────────────────────────────────────────

function UnlinkedVersionsSection({
  versions,
  onRollback,
}: {
  versions: RoutineVersionSummary[];
  onRollback: (v: RoutineVersionSummary) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <GlassCard className="mb-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={[
          'flex items-center gap-3 w-full text-left -m-1 p-1 rounded-[var(--radius-sm)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-purple)]',
          'transition-colors hover:bg-[rgba(255,255,255,0.03)]',
        ].join(' ')}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]" />
        )}
        <GitBranch className="h-4 w-4 flex-shrink-0 text-[var(--color-accent-purple)]" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Unassigned versions</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Versions not linked to a program block
          </p>
        </div>
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(139,92,246,0.15)] text-[var(--color-accent-purple)]">
          {versions.length}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
          {versions.map((v, idx) => (
            <VersionRow
              key={v.id}
              version={v}
              prevVersion={versions[idx + 1] ?? null}
              onRollback={onRollback}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ── Main VersionsTab ──────────────────────────────────────────────────────────

export function VersionsTab() {
  const [programBlocks, setProgramBlocks] = useState<ProgramBlockSummary[]>([]);
  const [unlinkedVersions, setUnlinkedVersions] = useState<RoutineVersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Rollback state
  const [rollbackTarget, setRollbackTarget] = useState<RoutineVersionSummary | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [rollbackSuccess, setRollbackSuccess] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/versions');
      if (!res.ok) throw new Error(`Failed to load versions (${res.status})`);
      const data = (await res.json()) as VersionsApiResponse;
      setProgramBlocks(data.programBlocks ?? []);
      setUnlinkedVersions(data.unlinkedVersions ?? []);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Could not load versions'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // ── Rollback handlers ─────────────────────────────────────────────────────

  const handleRollbackRequest = useCallback((version: RoutineVersionSummary) => {
    setRollbackTarget(version);
    setRollbackError(null);
    setRollbackSuccess(false);
  }, []);

  const handleRollbackConfirm = useCallback(async () => {
    if (!rollbackTarget) return;
    setRollbackLoading(true);
    setRollbackError(null);
    try {
      const res = await fetch('/api/versions/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: rollbackTarget.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Rollback failed (${res.status})`);
      }
      setRollbackSuccess(true);
      // Refresh version list after a short delay
      setTimeout(() => {
        setRollbackTarget(null);
        fetchVersions();
      }, 1500);
    } catch (err) {
      setRollbackError(
        err instanceof Error ? err.message : 'Rollback failed. Try again.'
      );
    } finally {
      setRollbackLoading(false);
    }
  }, [rollbackTarget, fetchVersions]);

  const handleRollbackCancel = useCallback(() => {
    setRollbackTarget(null);
    setRollbackError(null);
    setRollbackSuccess(false);
  }, []);

  // ── Loading skeleton ──────────────────────────────────────────────────────

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

  // ── Fetch error ───────────────────────────────────────────────────────────

  if (fetchError) {
    return (
      <div className="px-4 py-8 flex flex-col items-center text-center">
        <p className="text-sm text-[var(--color-error)] mb-4">{fetchError}</p>
        <button onClick={fetchVersions} className="btn-secondary text-sm px-4">
          Retry
        </button>
      </div>
    );
  }

  const hasContent = programBlocks.length > 0 || unlinkedVersions.length > 0;

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-4">
          <GitBranch className="h-8 w-8 text-[var(--color-accent-purple)]" />
        </div>
        <h2 className="text-lg font-semibold mb-1">No program versions</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-xs">
          Every change to your routine is saved as a version inside a program
          block — so you can compare and roll back at any time.
        </p>
      </div>
    );
  }

  // ── Content ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="px-4 py-4">
        {programBlocks.map((block) => (
          <ProgramBlockCard
            key={block.id}
            block={block}
            onRollback={handleRollbackRequest}
          />
        ))}

        {unlinkedVersions.length > 0 && (
          <UnlinkedVersionsSection
            versions={unlinkedVersions}
            onRollback={handleRollbackRequest}
          />
        )}
      </div>

      {/* Rollback confirmation modal */}
      {rollbackTarget && (
        <RollbackConfirmModal
          version={rollbackTarget}
          onConfirm={handleRollbackConfirm}
          onCancel={handleRollbackCancel}
          loading={rollbackLoading}
          error={rollbackError}
          success={rollbackSuccess}
        />
      )}
    </>
  );
}
