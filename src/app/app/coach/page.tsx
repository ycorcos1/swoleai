/**
 * Task 9.8 — Coach Proposal Inbox
 *
 * Lists all coach proposals for the authenticated user.
 * Allows filtering by status (pending / accepted / rejected).
 * Each row links to the proposal detail page for review.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

// =============================================================================
// Types
// =============================================================================

type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
type ProposalType = 'NEXT_SESSION' | 'WEEKLY' | 'PLATEAU' | 'GOALS';

interface Proposal {
  id: string;
  type: ProposalType;
  status: ProposalStatus;
  rationale: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Helpers
// =============================================================================

const TYPE_LABELS: Record<ProposalType, string> = {
  NEXT_SESSION: 'Next Session',
  WEEKLY: 'Weekly Check-in',
  PLATEAU: 'Plateau Fix',
  GOALS: 'Goals Review',
};

const TYPE_COLORS: Record<ProposalType, string> = {
  NEXT_SESSION: 'text-[var(--color-accent-blue)] bg-blue-500/10',
  WEEKLY: 'text-[var(--color-accent-purple)] bg-purple-500/10',
  PLATEAU: 'text-orange-400 bg-orange-500/10',
  GOALS: 'text-emerald-400 bg-emerald-500/10',
};

const STATUS_COLORS: Record<ProposalStatus, string> = {
  PENDING: 'text-amber-400 bg-amber-500/10',
  ACCEPTED: 'text-emerald-400 bg-emerald-500/10',
  REJECTED: 'text-red-400 bg-red-500/10',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// Generate buttons
// =============================================================================

const GENERATE_ENDPOINTS: { type: ProposalType; label: string; endpoint: string }[] = [
  { type: 'NEXT_SESSION', label: 'Next Session Plan', endpoint: '/api/coach/next-session' },
  { type: 'WEEKLY', label: 'Weekly Check-in', endpoint: '/api/coach/weekly-checkin' },
  { type: 'PLATEAU', label: 'Plateau Fix', endpoint: '/api/coach/plateau' },
  { type: 'GOALS', label: 'Goals Review', endpoint: '/api/coach/goals' },
];

// =============================================================================
// Component
// =============================================================================

export default function CoachInboxPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<ProposalType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/proposals${params}`);
      if (!res.ok) throw new Error('Failed to load proposals');
      const data = await res.json();
      setProposals(data.proposals ?? []);
    } catch {
      setError('Failed to load coach proposals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  async function handleGenerate(endpoint: string, type: ProposalType) {
    setGenerating(type);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to generate');
      }
      const data = await res.json();
      // Navigate directly to the new proposal
      router.push(`/app/coach/${data.proposal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: 'rgba(139,92,246,0.15)' }}
          >
            <Bot className="h-5 w-5 text-[var(--color-accent-purple)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Coach</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Proposals &amp; recommendations</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {/* Generate actions */}
        <GlassCard>
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
            Generate New
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {GENERATE_ENDPOINTS.map(({ type, label, endpoint }) => (
              <button
                key={type}
                onClick={() => handleGenerate(endpoint, type)}
                disabled={generating !== null}
                className="btn-secondary text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {generating === type ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {label}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Error */}
        {error && (
          <div className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={[
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'bg-[var(--color-accent-purple)] text-white'
                  : 'bg-[var(--color-base-700)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}

          <button
            onClick={fetchProposals}
            className="ml-auto rounded-full p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Proposal list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-base-700)] h-20" />
            ))}
          </div>
        ) : proposals.length === 0 ? (
          <GlassCard className="text-center py-10">
            <Bot className="h-10 w-10 text-[var(--color-text-muted)] mx-auto mb-3" />
            <p className="font-semibold">No proposals yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Generate a session plan or weekly check-in above.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {proposals.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/app/coach/${p.id}`)}
                className="w-full text-left"
              >
                <GlassCard className="flex items-center gap-3 hover:bg-[var(--color-base-700)] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[p.type]}`}
                      >
                        {TYPE_LABELS[p.type]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}
                      >
                        {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                    {p.rationale && (
                      <p className="mt-1.5 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                        {p.rationale}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0" />
                </GlassCard>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
