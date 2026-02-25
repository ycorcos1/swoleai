/**
 * VersionsTab — Task 6.9: Versions UI: list blocks + versions
 *
 * Fetches program blocks (with nested routine versions) from GET /api/versions.
 * Renders:
 *   - Loading skeleton
 *   - Fetch error with retry
 *   - Empty state when no blocks and no unlinked versions exist
 *   - Program block cards, each expandable to show its version list
 *   - "Unlinked versions" section for versions without a program block
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { GitBranch, ChevronDown, ChevronRight, Clock, BookOpen } from 'lucide-react';
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

// ── VersionRow ────────────────────────────────────────────────────────────────

function VersionRow({ version }: { version: RoutineVersionSummary }) {
  return (
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
      </div>
    </div>
  );
}

// ── ProgramBlockCard ──────────────────────────────────────────────────────────

function ProgramBlockCard({ block }: { block: ProgramBlockSummary }) {
  // Default expanded when the block has versions (collapsed when empty)
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
        {/* Chevron */}
        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]" />
        )}

        {/* Block icon */}
        <BookOpen className="h-4 w-4 flex-shrink-0 text-[var(--color-accent-purple)]" />

        {/* Block info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{block.name}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {blockDateRange(block)}
          </p>
        </div>

        {/* Version count badge */}
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

      {/* Versions list — shown when expanded */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
          {vCount === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] italic py-1">
              No versions recorded for this block yet.
            </p>
          ) : (
            block.routineVersions.map((v) => (
              <VersionRow key={v.id} version={v} />
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
}: {
  versions: RoutineVersionSummary[];
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
          {versions.map((v) => (
            <VersionRow key={v.id} version={v} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ── Main VersionsTab ──────────────────────────────────────────────────────────

export function VersionsTab() {
  const [programBlocks, setProgramBlocks] = useState<ProgramBlockSummary[]>([]);
  const [unlinkedVersions, setUnlinkedVersions] = useState<
    RoutineVersionSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  const hasContent =
    programBlocks.length > 0 || unlinkedVersions.length > 0;

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
    <div className="px-4 py-4">
      {programBlocks.map((block) => (
        <ProgramBlockCard key={block.id} block={block} />
      ))}

      {unlinkedVersions.length > 0 && (
        <UnlinkedVersionsSection versions={unlinkedVersions} />
      )}
    </div>
  );
}
