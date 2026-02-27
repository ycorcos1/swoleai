/**
 * Task 9.8 — Proposal Detail Page
 *
 * Renders the full proposal content, type-specific details, and
 * Accept / Reject actions for PENDING proposals.
 *
 * Accept flow:
 *   - POSTs to /api/proposals/[id]/accept
 *   - For WEEKLY/PLATEAU: applies patch ops + creates new RoutineVersion
 *   - For NEXT_SESSION/GOALS: marks as accepted only
 *
 * Reject flow:
 *   - PATCHes /api/proposals/[id] with { status: 'REJECTED' }
 *
 * Acceptance Criteria: Accept updates routine version and marks proposal accepted.
 */

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  XCircle,
  Loader2,
  Dumbbell,
  Calendar,
  TrendingUp,
  Target,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

// =============================================================================
// Types
// =============================================================================

type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
type ProposalType = 'NEXT_SESSION' | 'WEEKLY' | 'PLATEAU' | 'GOALS';

interface FullProposal {
  id: string;
  type: ProposalType;
  status: ProposalStatus;
  proposalJson: unknown;
  rationale: string | null;
  inputSummaryHash: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Helpers
// =============================================================================

const TYPE_META: Record<ProposalType, { label: string; Icon: React.ElementType; color: string }> = {
  NEXT_SESSION: { label: 'Next Session Plan', Icon: Dumbbell, color: 'text-[var(--color-accent-blue)]' },
  WEEKLY: { label: 'Weekly Check-in', Icon: Calendar, color: 'text-[var(--color-accent-purple)]' },
  PLATEAU: { label: 'Plateau Intervention', Icon: TrendingUp, color: 'text-orange-400' },
  GOALS: { label: 'Goals & Guardrails', Icon: Target, color: 'text-emerald-400' },
};

const STATUS_CHIP: Record<ProposalStatus, string> = {
  PENDING: 'text-amber-400 bg-amber-500/10',
  ACCEPTED: 'text-emerald-400 bg-emerald-500/10',
  REJECTED: 'text-red-400 bg-red-500/10',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// Type-specific renderers
// =============================================================================

function renderNextSession(json: unknown) {
  const data = json as {
    sessionTitle: string;
    exercises: { exerciseName: string; sets: number; repMin: number; repMax: number; restSeconds: number; progressionNote?: string }[];
    notes?: string;
    estimatedMinutes?: number;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{data.sessionTitle}</h3>
        {data.estimatedMinutes && (
          <span className="text-xs text-[var(--color-text-muted)]">{data.estimatedMinutes} min</span>
        )}
      </div>
      {data.notes && (
        <p className="text-sm text-[var(--color-text-secondary)] italic">{data.notes}</p>
      )}
      <div className="space-y-2">
        {data.exercises?.map((ex, i) => (
          <div key={i} className="rounded-[var(--radius-md)] bg-[var(--color-base-700)] px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{ex.exerciseName}</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {ex.sets} × {ex.repMin}–{ex.repMax} reps
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-[var(--color-text-muted)]">
                Rest {ex.restSeconds}s
              </span>
              {ex.progressionNote && (
                <span className="text-xs text-[var(--color-accent-blue)]">{ex.progressionNote}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderWeekly(json: unknown) {
  const data = json as {
    patches: { op: string; templateId?: string; blockOrderIndex?: number }[];
    rationale: string;
    volumeAnalysis?: { totalSetsLastWeek?: number; recommendations?: string[] };
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-text-secondary)]">{data.rationale}</p>
      {data.volumeAnalysis?.recommendations && data.volumeAnalysis.recommendations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Recommendations</p>
          {data.volumeAnalysis.recommendations.map((r, i) => (
            <div key={i} className="rounded-[var(--radius-md)] bg-[var(--color-base-700)] px-3 py-2 text-sm">
              {r}
            </div>
          ))}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
          Patch Operations ({data.patches?.length ?? 0})
        </p>
        {data.patches?.map((p, i) => (
          <div key={i} className="rounded-[var(--radius-md)] bg-[var(--color-base-700)] px-3 py-2">
            <span className="text-xs font-mono text-[var(--color-accent-purple)]">{p.op}</span>
            {p.templateId && (
              <span className="text-xs text-[var(--color-text-muted)] ml-2">
                template …{p.templateId.slice(-6)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderPlateau(json: unknown) {
  const data = json as {
    overallDiagnosis: string;
    interventions: { exerciseName: string; diagnosis: string; interventionRationale: string; patches: { op: string }[] }[];
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-text-secondary)]">{data.overallDiagnosis}</p>
      {data.interventions?.map((inv, i) => (
        <div key={i} className="rounded-[var(--radius-md)] bg-[var(--color-base-700)] px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{inv.exerciseName}</span>
            <span className="text-xs rounded-full px-2 py-0.5 bg-orange-500/10 text-orange-400">
              {inv.patches?.length ?? 0} patch{(inv.patches?.length ?? 0) !== 1 ? 'es' : ''}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">{inv.diagnosis}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{inv.interventionRationale}</p>
        </div>
      ))}
    </div>
  );
}

function renderGoals(json: unknown) {
  const data = json as {
    goals: { category: string; title: string; description: string; priority: string }[];
    guardrails: { type: string; description: string; appliesTo?: string[] }[];
    summary?: string;
  };

  return (
    <div className="space-y-4">
      {data.summary && (
        <p className="text-sm text-[var(--color-text-secondary)] italic">{data.summary}</p>
      )}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Goals</p>
        {data.goals?.map((g, i) => (
          <div key={i} className="rounded-[var(--radius-md)] bg-[var(--color-base-700)] px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{g.title}</span>
              <span className={`text-xs rounded-full px-2 py-0.5 ${
                g.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                g.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                'bg-[var(--color-base-600)] text-[var(--color-text-muted)]'
              }`}>
                {g.priority}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">{g.description}</p>
          </div>
        ))}
      </div>
      {data.guardrails && data.guardrails.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Guardrails</p>
          {data.guardrails.map((g, i) => (
            <div key={i} className="rounded-[var(--radius-md)] bg-[var(--color-base-700)] px-3 py-2.5">
              <span className="text-xs rounded-full px-2 py-0.5 bg-emerald-500/10 text-emerald-400 mb-1 inline-block">
                {g.type.replace(/_/g, ' ')}
              </span>
              <p className="text-xs text-[var(--color-text-secondary)]">{g.description}</p>
              {g.appliesTo && g.appliesTo.length > 0 && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Applies to: {g.appliesTo.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderProposalContent(type: ProposalType, json: unknown) {
  switch (type) {
    case 'NEXT_SESSION': return renderNextSession(json);
    case 'WEEKLY': return renderWeekly(json);
    case 'PLATEAU': return renderPlateau(json);
    case 'GOALS': return renderGoals(json);
  }
}

// =============================================================================
// Page
// =============================================================================

export default function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [proposal, setProposal] = useState<FullProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/proposals/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setProposal(data.proposal))
      .catch(() => setError('Failed to load proposal'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAccept() {
    if (!proposal) return;
    setActing('accept');
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${id}/accept`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Accept failed');

      setProposal((prev) => prev ? { ...prev, status: 'ACCEPTED' } : prev);
      const msg = data.newVersionId
        ? `Accepted! New routine version created.`
        : 'Accepted!';
      setSuccessMsg(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accept failed');
    } finally {
      setActing(null);
    }
  }

  async function handleReject() {
    if (!proposal) return;
    setActing('reject');
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      if (!res.ok) throw new Error('Reject failed');
      setProposal((prev) => prev ? { ...prev, status: 'REJECTED' } : prev);
      setSuccessMsg('Proposal rejected.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setActing(null);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent-purple)]" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-[var(--color-text-muted)]">Proposal not found.</p>
        <button className="btn-secondary mt-4" onClick={() => router.back()}>
          Go back
        </button>
      </div>
    );
  }

  const meta = TYPE_META[proposal.type];
  const Icon = meta.Icon;
  const isPending = proposal.status === 'PENDING';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-4 pt-4 pb-4 flex items-center gap-3">
        <button
          onClick={() => router.push('/app/coach')}
          className="rounded-full p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'rgba(139,92,246,0.15)' }}
        >
          <Icon className={`h-4.5 w-4.5 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate">{meta.label}</h1>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CHIP[proposal.status]}`}>
              {proposal.status.charAt(0) + proposal.status.slice(1).toLowerCase()}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {formatDate(proposal.createdAt)}
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-4">
        {/* Error */}
        {error && (
          <div className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Success */}
        {successMsg && (
          <div className="rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {successMsg}
          </div>
        )}

        {/* Rationale */}
        {proposal.rationale && (
          <GlassCard>
            <div className="flex items-start gap-2">
              <Bot className="h-4 w-4 text-[var(--color-accent-purple)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--color-text-secondary)]">{proposal.rationale}</p>
            </div>
          </GlassCard>
        )}

        {/* Proposal content */}
        <GlassCard>
          {renderProposalContent(proposal.type, proposal.proposalJson)}
        </GlassCard>
      </div>

      {/* Action bar (fixed bottom) — only for PENDING */}
      {isPending && (
        <div
          className="fixed bottom-16 left-0 right-0 px-4 py-3 flex gap-3"
          style={{ background: 'var(--color-base-900)', borderTop: '1px solid var(--glass-border)' }}
        >
          <button
            onClick={handleReject}
            disabled={acting !== null}
            className="flex-1 flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            {acting === 'reject' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Reject
          </button>

          <button
            onClick={handleAccept}
            disabled={acting !== null}
            className="flex-1 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent-purple)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {acting === 'accept' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Accept
          </button>
        </div>
      )}
    </div>
  );
}
