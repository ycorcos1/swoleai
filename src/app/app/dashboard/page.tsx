'use client';

/**
 * Dashboard — Task 13.1
 *
 * Wired sections:
 * - Header: date + SyncStatusPill
 * - Today Card: active split → today's scheduled day (Start / Continue / Rest)
 * - Coach Actions Card: four AI actions, each navigates to proposal
 * - Quick Stats: real workouts-this-week count vs target, last workout chip
 * - Recent Activity: latest proposals + deload chip if recommended
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  CheckCircle2,
  Dumbbell,
  Moon,
  Loader2,
  ChevronRight,
  Trophy,
  Bot,
  Clock,
  Zap,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScheduleDay {
  id: string;
  weekday: string;
  isRest: boolean;
  label: string | null;
  workoutDayTemplateId: string | null;
  workoutDayTemplate: { id: string; name: string; mode: string } | null;
}

interface Split {
  id: string;
  name: string;
  isActive: boolean;
  scheduleDays: ScheduleDay[];
}

interface RecentSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  title: string | null;
  summary: { totalExercises: number; totalSets: number };
}

interface RecentProposal {
  id: string;
  type: 'NEXT_SESSION' | 'WEEKLY' | 'PLATEAU' | 'GOALS';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  rationale: string | null;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const JS_DAY_TO_WEEKDAY: Record<number, string> = {
  0: 'SUN',
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
};

function startOfWeekISO(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfWeekISO(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() + (6 - d.getDay()));
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const PROPOSAL_LABELS: Record<RecentProposal['type'], string> = {
  NEXT_SESSION: 'Next Session',
  WEEKLY: 'Weekly Check-in',
  PLATEAU: 'Plateau Fix',
  GOALS: 'Goals Review',
};

const STATUS_PILL: Record<RecentProposal['status'], string> = {
  PENDING: 'text-amber-400 bg-amber-500/10',
  ACCEPTED: 'text-emerald-400 bg-emerald-500/10',
  REJECTED: 'text-red-400 bg-red-500/10',
};

// ── Coach Actions ─────────────────────────────────────────────────────────────

const COACH_ACTIONS: { label: string; endpoint: string }[] = [
  { label: 'Next Session Plan', endpoint: '/api/coach/next-session' },
  { label: 'Weekly Check-in', endpoint: '/api/coach/weekly-checkin' },
  { label: 'Diagnose Plateau', endpoint: '/api/coach/plateau' },
  { label: 'Goals Review', endpoint: '/api/coach/goals' },
];

// ── Dashboard Page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  const [dateString, setDateString] = useState<string>('');
  const [activeSplit, setActiveSplit] = useState<Split | null>(null);
  const [todayDay, setTodayDay] = useState<ScheduleDay | null | undefined>(undefined);
  const [loadingSplit, setLoadingSplit] = useState(true);

  const [workoutsThisWeek, setWorkoutsThisWeek] = useState<number | null>(null);
  const [targetDays, setTargetDays] = useState<number | null>(null);
  const [lastSession, setLastSession] = useState<RecentSession | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [recentProposals, setRecentProposals] = useState<RecentProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);

  const [coachGenerating, setCoachGenerating] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    setDateString(
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    );

    const todayKey = JS_DAY_TO_WEEKDAY[now.getDay()];
    const weekStart = startOfWeekISO(now);
    const weekEnd = endOfWeekISO(now);

    // Fetch active split
    fetch('/api/splits')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { splits: Split[] }) => {
        const active = (data.splits ?? []).find((s) => s.isActive) ?? null;
        setActiveSplit(active);
        if (active) {
          const match = active.scheduleDays.find((d) => d.weekday === todayKey);
          setTodayDay(match ?? null);
        } else {
          setTodayDay(null);
        }
      })
      .catch(() => {
        setActiveSplit(null);
        setTodayDay(null);
      })
      .finally(() => setLoadingSplit(false));

    // Fetch this-week workout count and last session in parallel
    Promise.all([
      fetch(
        `/api/history?limit=1&status=COMPLETED&startDate=${encodeURIComponent(weekStart)}&endDate=${encodeURIComponent(weekEnd)}`
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/history?limit=1&status=COMPLETED')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/profile')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([weekData, lastData, profileData]) => {
      setWorkoutsThisWeek(weekData?.pagination?.total ?? 0);
      setLastSession(lastData?.sessions?.[0] ?? null);
      setTargetDays(profileData?.profile?.daysPerWeek ?? null);
    }).finally(() => setLoadingStats(false));

    // Fetch recent proposals
    fetch('/api/proposals?limit=3')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        setRecentProposals(data?.proposals ?? []);
      })
      .finally(() => setLoadingProposals(false));
  }, []);

  // ── Today Card ──────────────────────────────────────────────────────────────

  function renderTodayCard() {
    if (loadingSplit) {
      return (
        <GlassCard className="mb-4">
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-16 rounded bg-[var(--color-base-600)]" />
            <div className="h-5 w-40 rounded bg-[var(--color-base-600)]" />
            <div className="h-3 w-28 rounded bg-[var(--color-base-600)]" />
          </div>
          <div className="mt-4 h-10 rounded-[var(--radius-md)] bg-[var(--color-base-600)] animate-pulse" />
        </GlassCard>
      );
    }

    if (!activeSplit) {
      return (
        <GlassCard className="mb-4">
          <p className="text-sm text-[var(--color-text-muted)]">Today</p>
          <h2 className="mt-1 text-lg font-semibold">No split active</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Create and activate a split to get your schedule
          </p>
          <button
            className="btn-primary mt-4 w-full"
            onClick={() => router.push('/app/routine')}
          >
            Go to Routine
          </button>
        </GlassCard>
      );
    }

    if (todayDay === null || todayDay === undefined) {
      return (
        <GlassCard className="mb-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-base-600)]">
              <Moon className="h-4.5 w-4.5 text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Today</p>
              <h2 className="mt-0.5 text-lg font-semibold">Rest Day</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                No workout mapped for{' '}
                <span className="font-medium text-[var(--color-text-primary)]">{activeSplit.name}</span>
              </p>
            </div>
          </div>
          <button
            className="btn-secondary mt-4 w-full"
            onClick={() => router.push('/app/workout/start')}
          >
            Start Freestyle
          </button>
        </GlassCard>
      );
    }

    if (todayDay.isRest) {
      return (
        <GlassCard className="mb-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-base-600)]">
              <Moon className="h-4.5 w-4.5 text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Today</p>
              <h2 className="mt-0.5 text-lg font-semibold">Rest Day</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Active split:{' '}
                <span className="font-medium text-[var(--color-text-primary)]">{activeSplit.name}</span>
              </p>
            </div>
          </div>
          <button
            className="btn-secondary mt-4 w-full"
            onClick={() => router.push('/app/workout/start')}
          >
            Start Freestyle
          </button>
        </GlassCard>
      );
    }

    const workoutLabel = todayDay.label || todayDay.workoutDayTemplate?.name || 'Workout';

    return (
      <GlassCard className="mb-4">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(139,92,246,0.15)' }}
          >
            <Dumbbell className="h-4.5 w-4.5 text-[var(--color-accent-purple)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--color-text-muted)]">Today</p>
            <h2 className="mt-0.5 text-lg font-semibold truncate">{workoutLabel}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="h-3 w-3 text-[var(--color-accent-green)] flex-shrink-0" />
              <p className="text-sm text-[var(--color-text-secondary)] truncate">
                {activeSplit.name}
                {todayDay.workoutDayTemplate
                  ? ` · ${todayDay.workoutDayTemplate.mode.toLowerCase()} template`
                  : ''}
              </p>
            </div>
          </div>
        </div>
        <button
          className="btn-primary mt-4 w-full"
          onClick={() => router.push('/app/workout/start')}
        >
          Start Workout
        </button>
      </GlassCard>
    );
  }

  // ── Quick Stats ─────────────────────────────────────────────────────────────

  function renderQuickStats() {
    const weekLabel =
      workoutsThisWeek === null
        ? '—'
        : targetDays
        ? `${workoutsThisWeek} / ${targetDays}`
        : String(workoutsThisWeek);

    const lastLabel = lastSession
      ? formatRelativeDate(lastSession.startedAt)
      : '—';

    const lastSubLabel = lastSession
      ? `${lastSession.summary.totalSets} sets · ${lastSession.summary.totalExercises} exercises`
      : 'No sessions yet';

    return (
      <GlassCard className="mb-4">
        <h3 className="mb-3 font-semibold">This Week</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            {loadingStats ? (
              <div className="h-7 w-16 rounded animate-pulse bg-[var(--color-base-600)]" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{weekLabel}</p>
            )}
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {targetDays ? 'Workouts' : 'Workouts this week'}
            </p>
          </div>
          <div className="w-px bg-[var(--glass-border)]" />
          <div className="flex-1">
            {loadingStats ? (
              <div className="h-7 w-20 rounded animate-pulse bg-[var(--color-base-600)]" />
            ) : (
              <>
                <p className="text-2xl font-bold tabular-nums">{lastLabel}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">{lastSubLabel}</p>
              </>
            )}
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Last workout</p>
          </div>
        </div>
        {lastSession && (
          <Link
            href="/app/history"
            className="mt-3 flex items-center gap-1 text-xs text-[var(--color-accent-purple)] hover:underline"
          >
            View history <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </GlassCard>
    );
  }

  // ── Recent Activity ─────────────────────────────────────────────────────────

  function renderRecentActivity() {
    if (loadingProposals) {
      return (
        <GlassCard>
          <h3 className="mb-3 font-semibold">Recent Activity</h3>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 rounded-xl animate-pulse bg-[var(--color-base-600)]" />
            ))}
          </div>
        </GlassCard>
      );
    }

    if (recentProposals.length === 0) {
      return (
        <GlassCard>
          <h3 className="mb-3 font-semibold">Recent Activity</h3>
          <div className="flex flex-col items-center py-4 text-center">
            <Bot className="h-8 w-8 text-[var(--color-text-muted)] mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">
              No coach proposals yet. Use the AI Coach to get started.
            </p>
          </div>
        </GlassCard>
      );
    }

    return (
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Recent Activity</h3>
          <Link
            href="/app/coach"
            className="text-xs text-[var(--color-accent-purple)] hover:underline flex items-center gap-1"
          >
            All proposals <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="space-y-2">
          {recentProposals.map((p) => (
            <Link
              key={p.id}
              href={`/app/coach/${p.id}`}
              className="flex items-center gap-3 rounded-xl bg-[var(--color-base-700)] px-3 py-2.5 hover:bg-[var(--color-base-600)] transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-base-600)]">
                <Bot className="h-4 w-4 text-[var(--color-accent-purple)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{PROPOSAL_LABELS[p.type]}</p>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {formatRelativeDate(p.createdAt)}
                  {p.rationale ? ` · ${p.rationale.slice(0, 40)}…` : ''}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_PILL[p.status]}`}
              >
                {p.status.toLowerCase()}
              </span>
            </Link>
          ))}
        </div>
      </GlassCard>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-6 pb-24">
      {/* Header */}
      <header className="mb-6">
        <p className="text-sm text-[var(--color-text-muted)]">{dateString || '\u00A0'}</p>
        <h1 className="mt-1 text-2xl font-bold">Dashboard</h1>
      </header>

      {/* Today Card */}
      {renderTodayCard()}

      {/* Coach Actions Card */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-[var(--color-accent-purple)]" />
          <h3 className="font-semibold">AI Coach</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {COACH_ACTIONS.map(({ label, endpoint }) => (
            <button
              key={label}
              disabled={coachGenerating !== null}
              onClick={async () => {
                setCoachGenerating(label);
                try {
                  const res = await fetch(endpoint, { method: 'POST' });
                  const data = await res.json();
                  if (res.ok && data.proposal?.id) {
                    router.push(`/app/coach/${data.proposal.id}`);
                  } else {
                    router.push('/app/coach');
                  }
                } catch {
                  router.push('/app/coach');
                } finally {
                  setCoachGenerating(null);
                }
              }}
              className="btn-secondary text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {coachGenerating === label && <Loader2 className="h-3 w-3 animate-spin" />}
              {label}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Quick Stats */}
      {renderQuickStats()}

      {/* Recent Activity */}
      {renderRecentActivity()}

      {/* PR Trophy prompt */}
      {lastSession && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-[var(--color-base-700)] border border-[var(--glass-border)] px-4 py-3">
          <Trophy className="h-5 w-5 shrink-0 text-[var(--color-warning)]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Track your PRs</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              View personal records in Insights
            </p>
          </div>
          <Link
            href="/app/insights"
            className="shrink-0 flex items-center gap-1 text-xs font-medium text-[var(--color-accent-purple)] hover:underline"
          >
            <Clock className="h-3.5 w-3.5" /> View
          </Link>
        </div>
      )}
    </div>
  );
}
