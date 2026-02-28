'use client';

/**
 * Goals page — Task 13.4
 *
 * Two sections:
 * 1. Goals wizard — set goalMode, daysPerWeek, sessionMinutes, equipment
 *    Persists via PUT /api/profile.
 *
 * 2. AI Guardrails — trigger /api/coach/goals to get AI goal + guardrail
 *    recommendations. Shows the latest GOALS proposal if one exists.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  Target,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type GoalMode = 'HYPERTROPHY' | 'STRENGTH' | 'HYBRID';
type UnitSystem = 'IMPERIAL' | 'METRIC';
type Equipment = 'COMMERCIAL' | 'HOME';

interface Profile {
  goalMode: GoalMode | null;
  daysPerWeek: number | null;
  sessionMinutes: number | null;
  units: UnitSystem | null;
  equipment: Equipment | null;
}

interface GoalsProposal {
  id: string;
  type: string;
  status: string;
  rationale: string | null;
  createdAt: string;
}

// ── Option components ─────────────────────────────────────────────────────────

interface OptionButtonProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
}

function OptionButton({ selected, onClick, label, description }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-3 text-left transition-all ${
        selected
          ? 'border-[var(--color-accent-purple)] bg-purple-500/10 text-[var(--color-text-primary)]'
          : 'border-[var(--glass-border)] bg-[var(--color-base-700)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-purple)]/50'
      }`}
    >
      <div className="flex items-center gap-2">
        {selected && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-accent-purple)]" />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>
      {description && (
        <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed pl-6">
          {description}
        </p>
      )}
    </button>
  );
}

// ── Goals Wizard ──────────────────────────────────────────────────────────────

interface GoalsWizardProps {
  onSaved: () => void;
}

function GoalsWizard({ onSaved }: GoalsWizardProps) {
  const [profile, setProfile] = useState<Profile>({
    goalMode: null,
    daysPerWeek: null,
    sessionMinutes: null,
    units: 'IMPERIAL',
    equipment: 'COMMERCIAL',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        if (data?.profile) {
          setProfile({
            goalMode: data.profile.goalMode ?? null,
            daysPerWeek: data.profile.daysPerWeek ?? null,
            sessionMinutes: data.profile.sessionMinutes ?? null,
            units: data.profile.units ?? 'IMPERIAL',
            equipment: data.profile.equipment ?? 'COMMERCIAL',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(profile.goalMode ? { goalMode: profile.goalMode } : {}),
          ...(profile.daysPerWeek !== null ? { daysPerWeek: profile.daysPerWeek } : {}),
          ...(profile.sessionMinutes !== null ? { sessionMinutes: profile.sessionMinutes } : {}),
          ...(profile.units ? { units: profile.units } : {}),
          ...(profile.equipment ? { equipment: profile.equipment } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to save goals');
        return;
      }
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <GlassCard className="mb-4">
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--color-base-600)]" />
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="mb-4">
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-[var(--color-accent-purple)]" />
        Your Goals
      </h2>

      {/* Goal mode */}
      <div className="mb-5">
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
          Primary goal
        </label>
        <div className="flex flex-col gap-2">
          <OptionButton
            selected={profile.goalMode === 'HYPERTROPHY'}
            onClick={() => setProfile((p) => ({ ...p, goalMode: 'HYPERTROPHY' }))}
            label="Hypertrophy"
            description="Build muscle size and aesthetics"
          />
          <OptionButton
            selected={profile.goalMode === 'STRENGTH'}
            onClick={() => setProfile((p) => ({ ...p, goalMode: 'STRENGTH' }))}
            label="Strength"
            description="Maximise 1RM across compound lifts"
          />
          <OptionButton
            selected={profile.goalMode === 'HYBRID'}
            onClick={() => setProfile((p) => ({ ...p, goalMode: 'HYBRID' }))}
            label="Hybrid"
            description="Balanced approach — size and strength"
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="mb-5">
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
          Days per week
        </label>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setProfile((p) => ({ ...p, daysPerWeek: d }))}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                profile.daysPerWeek === d
                  ? 'border-[var(--color-accent-purple)] bg-purple-500/10 text-[var(--color-text-primary)]'
                  : 'border-[var(--glass-border)] bg-[var(--color-base-700)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-purple)]/50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Session length */}
      <div className="mb-5">
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
          Session length (minutes)
        </label>
        <div className="flex gap-2 flex-wrap">
          {[45, 60, 75, 90, 120].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setProfile((p) => ({ ...p, sessionMinutes: m }))}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                profile.sessionMinutes === m
                  ? 'border-[var(--color-accent-purple)] bg-purple-500/10 text-[var(--color-text-primary)]'
                  : 'border-[var(--glass-border)] bg-[var(--color-base-700)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-purple)]/50'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div className="mb-5">
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
          Equipment access
        </label>
        <div className="flex gap-2">
          <OptionButton
            selected={profile.equipment === 'COMMERCIAL'}
            onClick={() => setProfile((p) => ({ ...p, equipment: 'COMMERCIAL' }))}
            label="Commercial gym"
          />
          <OptionButton
            selected={profile.equipment === 'HOME'}
            onClick={() => setProfile((p) => ({ ...p, equipment: 'HOME' }))}
            label="Home gym"
          />
        </div>
      </div>

      {/* Units */}
      <div className="mb-5">
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
          Units
        </label>
        <div className="flex gap-2">
          <OptionButton
            selected={profile.units === 'IMPERIAL'}
            onClick={() => setProfile((p) => ({ ...p, units: 'IMPERIAL' }))}
            label="Imperial (lbs)"
          />
          <OptionButton
            selected={profile.units === 'METRIC'}
            onClick={() => setProfile((p) => ({ ...p, units: 'METRIC' }))}
            label="Metric (kg)"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-900/30 border border-red-700 px-3 py-2 text-sm text-red-400 mb-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-900/30 border border-emerald-700 px-3 py-2 text-sm text-emerald-400 mb-4">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Goals saved!
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? 'Saving…' : 'Save Goals'}
      </button>
    </GlassCard>
  );
}

// ── AI Guardrails ─────────────────────────────────────────────────────────────

interface GoalItem {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface GuardrailItem {
  type: string;
  description: string;
  appliesTo?: string[];
}

interface GoalsProposalDetail {
  id: string;
  status: string;
  rationale: string | null;
  createdAt: string;
  proposalJson: {
    goals: GoalItem[];
    guardrails: GuardrailItem[];
    summary?: string;
  };
}

const PRIORITY_COLORS: Record<string, string> = {
  high:   'text-red-400 bg-red-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  low:    'text-emerald-400 bg-emerald-500/10',
};

const GUARDRAIL_TYPE_LABELS: Record<string, string> = {
  volume_cap:       'Volume Cap',
  frequency_cap:    'Frequency Cap',
  injury_avoidance: 'Injury Avoidance',
  recovery:         'Recovery',
  other:            'Rule',
};

interface AIGuardrailsProps {
  refresh: number;
}

function AIGuardrails({ refresh }: AIGuardrailsProps) {
  const router = useRouter();
  const [latestProposal, setLatestProposal] = useState<GoalsProposalDetail | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const fetchLatest = useCallback(() => {
    setLoadingProposal(true);
    fetch('/api/proposals?type=GOALS&limit=1')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(async (data) => {
        const p: GoalsProposal | undefined = data?.proposals?.[0];
        if (!p) {
          setLatestProposal(null);
          return;
        }
        // Fetch full proposal detail
        const res = await fetch(`/api/proposals/${p.id}`);
        if (!res.ok) { setLatestProposal(null); return; }
        const detail = await res.json();
        setLatestProposal(detail.proposal ?? null);
      })
      .finally(() => setLoadingProposal(false));
  }, []);

  useEffect(() => { fetchLatest(); }, [fetchLatest, refresh]);

  async function handleGenerate() {
    setGenerating(true);
    setGenError('');
    try {
      const res = await fetch('/api/coach/goals', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.proposal?.id) {
        router.push(`/app/coach/${data.proposal.id}`);
      } else {
        setGenError(data.error ?? 'Failed to generate goals review');
      }
    } catch {
      setGenError('Network error — please try again.');
    } finally {
      setGenerating(false);
    }
  }

  if (loadingProposal) {
    return (
      <GlassCard>
        <div className="space-y-3 animate-pulse">
          <div className="h-5 w-32 rounded bg-[var(--color-base-600)]" />
          <div className="h-16 rounded-xl bg-[var(--color-base-600)]" />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          AI Guardrails
        </h2>
        {latestProposal && (
          <button
            onClick={() => router.push(`/app/coach/${latestProposal.id}`)}
            className="flex items-center gap-1 text-xs text-[var(--color-accent-purple)] hover:underline"
          >
            View full <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Show latest proposal content inline */}
      {latestProposal?.proposalJson && (
        <div className="space-y-4 mb-5">
          {/* Goals */}
          {latestProposal.proposalJson.goals?.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                Goals
              </p>
              <div className="space-y-2">
                {latestProposal.proposalJson.goals.map((g, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-[var(--color-base-700)] px-3 py-2.5 flex items-start gap-3"
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        PRIORITY_COLORS[g.priority] ?? 'text-[var(--color-text-muted)] bg-[var(--color-base-600)]'
                      }`}
                    >
                      {g.priority}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{g.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{g.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guardrails */}
          {latestProposal.proposalJson.guardrails?.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                Guardrails
              </p>
              <div className="space-y-2">
                {latestProposal.proposalJson.guardrails.map((g, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-emerald-900/20 border border-emerald-700/30 px-3 py-2.5 flex items-start gap-3"
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-emerald-300 uppercase tracking-wide mb-0.5">
                        {GUARDRAIL_TYPE_LABELS[g.type] ?? g.type}
                      </p>
                      <p className="text-sm text-[var(--color-text-secondary)]">{g.description}</p>
                      {g.appliesTo && g.appliesTo.length > 0 && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          Applies to: {g.appliesTo.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {latestProposal.proposalJson.summary && (
            <p className="text-sm text-[var(--color-text-secondary)] italic border-l-2 border-[var(--color-accent-purple)] pl-3">
              {latestProposal.proposalJson.summary}
            </p>
          )}
        </div>
      )}

      {!latestProposal && (
        <div className="mb-4 py-4 text-center">
          <ShieldCheck className="h-10 w-10 mx-auto text-[var(--color-text-muted)] mb-2" />
          <p className="text-sm text-[var(--color-text-muted)]">
            No AI goals review yet. Run a review to get personalised guardrails.
          </p>
        </div>
      )}

      {genError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-900/30 border border-red-700 px-3 py-2 text-sm text-red-400 mb-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {genError}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {generating ? 'Generating…' : 'Get AI Goals Review'}
      </button>
    </GlassCard>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const [guardrailsRefresh, setGuardrailsRefresh] = useState(0);

  return (
    <div className="px-4 py-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Set your targets and get AI guardrails
        </p>
      </header>

      <GoalsWizard onSaved={() => setGuardrailsRefresh((n) => n + 1)} />
      <AIGuardrails refresh={guardrailsRefresh} />
    </div>
  );
}
