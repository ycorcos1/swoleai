'use client';

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
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MuscleGroupVolume {
  muscleGroup: string;
  sets: number;
  warning: string | null;
}

interface VolumeReport {
  byMuscleGroup: MuscleGroupVolume[];
  warnings: string[];
  weekStart: string;
  weekEnd: string;
}

interface PRResult {
  exerciseId: string;
  exerciseName: string;
  type: 'LOAD_PR' | 'REP_PR' | 'E1RM_PR' | 'VOLUME_PR';
  newValue: number;
  previousBest: number | null;
  unit: string;
}

interface PlateauCandidate {
  exerciseId: string;
  exerciseName: string;
  severity: 'mild' | 'moderate' | 'severe';
  exposureCount: number;
  message: string;
}

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

// ── Insights helpers ──────────────────────────────────────────────────────────

const MUSCLE_DISPLAY: Record<string, string> = {
  CHEST: 'Chest', BACK: 'Back', SHOULDERS: 'Shoulders', BICEPS: 'Biceps',
  TRICEPS: 'Triceps', QUADS: 'Quads', HAMSTRINGS: 'Hamstrings', GLUTES: 'Glutes',
  CALVES: 'Calves', CORE: 'Core', TRAPS: 'Traps', FOREARMS: 'Forearms',
  LATS: 'Lats', ABS: 'Abs',
};

const PR_CONFIG: Record<PRResult['type'], { label: string; color: string; bg: string }> = {
  LOAD_PR:   { label: 'Load PR',   color: 'text-amber-400',                            bg: 'bg-amber-500/10' },
  REP_PR:    { label: 'Rep PR',    color: 'text-[var(--color-accent-purple)]',         bg: 'bg-purple-500/10' },
  E1RM_PR:   { label: 'e1RM PR',   color: 'text-emerald-400',                          bg: 'bg-emerald-500/10' },
  VOLUME_PR: { label: 'Volume PR', color: 'text-[var(--color-accent-blue)]',           bg: 'bg-blue-500/10' },
};

const SEVERITY_CONFIG: Record<PlateauCandidate['severity'], { color: string; icon: typeof TrendingDown }> = {
  mild:     { color: 'text-amber-400',   icon: Minus },
  moderate: { color: 'text-orange-400',  icon: TrendingDown },
  severe:   { color: 'text-red-400',     icon: TrendingDown },
};

function formatMuscle(key: string): string {
  return MUSCLE_DISPLAY[key.toUpperCase()] ?? key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
}

function VolumeBar({ mg }: { mg: MuscleGroupVolume }) {
  const max = 30;
  const pct = Math.min((mg.sets / max) * 100, 100);
  const hasWarning = !!mg.warning;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-sm text-[var(--color-text-secondary)] truncate">
        {formatMuscle(mg.muscleGroup)}
      </span>
      <div className="flex-1 h-5 rounded-full bg-[var(--color-base-600)] overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            hasWarning
              ? 'bg-amber-500/70'
              : 'bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-blue)]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-8 shrink-0 text-right text-sm font-medium tabular-nums ${hasWarning ? 'text-amber-400' : 'text-[var(--color-text-primary)]'}`}>
        {mg.sets}
      </span>
      {hasWarning && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />}
    </div>
  );
}

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

  // Insights state
  const [volumeReport, setVolumeReport] = useState<VolumeReport | null>(null);
  const [volumeLoading, setVolumeLoading] = useState(true);
  const [prs, setPrs] = useState<PRResult[]>([]);
  const [prsLoading, setPrsLoading] = useState(true);
  const [prSession, setPrSession] = useState<RecentSession | null>(null);
  const [plateaus, setPlateaus] = useState<PlateauCandidate[]>([]);
  const [plateauLoading, setPlateauLoading] = useState(true);

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

    // Fetch insights: volume, PRs, plateaus
    fetch('/api/rules/volume')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => setVolumeReport(data?.report ?? null))
      .finally(() => setVolumeLoading(false));

    fetch('/api/history?limit=1&status=COMPLETED')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        const session = data?.sessions?.[0];
        if (!session) { setPrsLoading(false); return; }
        setPrSession(session);
        return fetch('/api/rules/prs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
          .then((prData) => setPrs(prData?.prs ?? []))
          .finally(() => setPrsLoading(false));
      });

    fetch('/api/rules/plateau')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => setPlateaus(data?.plateaus ?? []))
      .finally(() => setPlateauLoading(false));
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

  // ── Insights: Volume ─────────────────────────────────────────────────────────

  function renderVolumeSection() {
    const sortedMuscles =
      volumeReport?.byMuscleGroup?.filter((m) => m.sets > 0).sort((a, b) => b.sets - a.sets) ?? [];

    if (volumeLoading) {
      return (
        <GlassCard className="mb-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--color-accent-blue)]" />
            Volume Balance
          </h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-20 rounded animate-pulse bg-[var(--color-base-600)]" />
                <div className="flex-1 h-5 rounded-full animate-pulse bg-[var(--color-base-600)]" />
                <div className="h-4 w-6 rounded animate-pulse bg-[var(--color-base-600)]" />
              </div>
            ))}
          </div>
        </GlassCard>
      );
    }

    if (sortedMuscles.length === 0) {
      return (
        <GlassCard className="mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--color-accent-blue)]" />
            Volume Balance — This Week
          </h2>
          <div className="py-6 text-center">
            <BarChart3 className="h-10 w-10 mx-auto text-[var(--color-text-muted)] mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">No workouts logged this week yet.</p>
          </div>
        </GlassCard>
      );
    }

    return (
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--color-accent-blue)]" />
            Volume Balance — This Week
          </h2>
          <span className="text-xs text-[var(--color-text-muted)]">sets</span>
        </div>
        <div className="space-y-3">
          {sortedMuscles.map((mg) => (
            <VolumeBar key={mg.muscleGroup} mg={mg} />
          ))}
        </div>
        {volumeReport?.warnings && volumeReport.warnings.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {volumeReport.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-300">{w}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    );
  }

  // ── Insights: PRs ────────────────────────────────────────────────────────────

  function renderPRSection() {
    if (prsLoading) {
      return (
        <GlassCard className="mb-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Personal Records
          </h2>
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking records…
          </div>
        </GlassCard>
      );
    }

    if (!prSession) {
      return (
        <GlassCard className="mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Personal Records
          </h2>
          <div className="py-4 text-center">
            <Trophy className="h-8 w-8 mx-auto text-[var(--color-text-muted)] mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">Complete a workout to see PRs here.</p>
          </div>
        </GlassCard>
      );
    }

    return (
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Personal Records
          </h2>
          <span className="text-xs text-[var(--color-text-muted)]">Last session</span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          {prSession.title ?? 'Workout'} ·{' '}
          {new Date(prSession.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
        {prs.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <TrendingUp className="h-4 w-4" />
            No new PRs in this session. Keep pushing!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {prs.map((pr, idx) => {
              const cfg = PR_CONFIG[pr.type];
              return (
                <div
                  key={`${pr.type}-${pr.exerciseId}-${idx}`}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border border-[var(--glass-border)] ${cfg.bg}`}
                >
                  <Trophy className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pr.exerciseName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {pr.newValue} {pr.unit}
                      {pr.previousBest !== null && <span className="ml-1">(was {pr.previousBest})</span>}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    );
  }

  // ── Insights: Plateaus ───────────────────────────────────────────────────────

  function renderPlateauSection() {
    if (plateauLoading || plateaus.length === 0) return null;
    return (
      <GlassCard className="mb-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          Plateau Alerts
        </h2>
        <div className="space-y-2">
          {plateaus.slice(0, 5).map((p) => {
            const cfg = SEVERITY_CONFIG[p.severity];
            const SeverityIcon = cfg.icon;
            return (
              <div key={p.exerciseId} className="flex items-start gap-3 rounded-xl bg-[var(--color-base-700)] px-3 py-2.5">
                <SeverityIcon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.exerciseName}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{p.message} · {p.exposureCount} sessions</p>
                </div>
                <span className={`shrink-0 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--color-base-600)] ${cfg.color}`}>
                  {p.severity}
                </span>
              </div>
            );
          })}
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

      {/* Quick Stats */}
      {renderQuickStats()}

      {/* Recent Activity */}
      {renderRecentActivity()}

      {/* Insights */}
      {renderVolumeSection()}
      {renderPRSection()}
      {renderPlateauSection()}
    </div>
  );
}
