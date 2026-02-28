'use client';

/**
 * Insights page — Task 13.2
 *
 * Sections:
 * - Volume balance chart: weekly sets per muscle group (from /api/rules/volume)
 * - PR feed: personal records from the most recent completed session
 *            (from /api/history + /api/rules/prs)
 * - Plateau alerts: any plateauing exercises (from /api/rules/plateau)
 */

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  BarChart3,
  Trophy,
  AlertTriangle,
  Loader2,
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

interface RecentSession {
  id: string;
  startedAt: string;
  title: string | null;
  summary: { totalExercises: number; totalSets: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MUSCLE_DISPLAY: Record<string, string> = {
  CHEST: 'Chest',
  BACK: 'Back',
  SHOULDERS: 'Shoulders',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  QUADS: 'Quads',
  HAMSTRINGS: 'Hamstrings',
  GLUTES: 'Glutes',
  CALVES: 'Calves',
  CORE: 'Core',
  TRAPS: 'Traps',
  FOREARMS: 'Forearms',
  LATS: 'Lats',
  ABS: 'Abs',
};

const PR_CONFIG: Record<PRResult['type'], { label: string; color: string; bg: string }> = {
  LOAD_PR:   { label: 'Load PR',   color: 'text-amber-400',                              bg: 'bg-amber-500/10' },
  REP_PR:    { label: 'Rep PR',    color: 'text-[var(--color-accent-purple)]',           bg: 'bg-purple-500/10' },
  E1RM_PR:   { label: 'e1RM PR',   color: 'text-emerald-400',                            bg: 'bg-emerald-500/10' },
  VOLUME_PR: { label: 'Volume PR', color: 'text-[var(--color-accent-blue)]',             bg: 'bg-blue-500/10' },
};

const SEVERITY_CONFIG: Record<PlateauCandidate['severity'], { color: string; icon: typeof TrendingDown }> = {
  mild:     { color: 'text-amber-400',   icon: Minus },
  moderate: { color: 'text-orange-400',  icon: TrendingDown },
  severe:   { color: 'text-red-400',     icon: TrendingDown },
};

function formatMuscle(key: string): string {
  return MUSCLE_DISPLAY[key.toUpperCase()] ?? key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
}

// ── Volume Bar ────────────────────────────────────────────────────────────────

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
      <span
        className={`w-8 shrink-0 text-right text-sm font-medium tabular-nums ${
          hasWarning ? 'text-amber-400' : 'text-[var(--color-text-primary)]'
        }`}
      >
        {mg.sets}
      </span>
      {hasWarning && (
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [volumeReport, setVolumeReport] = useState<VolumeReport | null>(null);
  const [volumeLoading, setVolumeLoading] = useState(true);

  const [prs, setPrs] = useState<PRResult[]>([]);
  const [prsLoading, setPrsLoading] = useState(true);
  const [lastSession, setLastSession] = useState<RecentSession | null>(null);

  const [plateaus, setPlateaus] = useState<PlateauCandidate[]>([]);
  const [plateauLoading, setPlateauLoading] = useState(true);

  useEffect(() => {
    // Volume balance
    fetch('/api/rules/volume')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => setVolumeReport(data?.report ?? null))
      .finally(() => setVolumeLoading(false));

    // PR feed: get most recent completed session, then detect PRs
    fetch('/api/history?limit=1&status=COMPLETED')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        const session: RecentSession | undefined = data?.sessions?.[0];
        if (!session) {
          setPrsLoading(false);
          return;
        }
        setLastSession(session);
        return fetch('/api/rules/prs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
          .then((prData) => {
            setPrs(prData?.prs ?? []);
          })
          .finally(() => setPrsLoading(false));
      });

    // Plateau alerts
    fetch('/api/rules/plateau')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => setPlateaus(data?.plateaus ?? []))
      .finally(() => setPlateauLoading(false));
  }, []);

  // ── Volume Balance ───────────────────────────────────────────────────────

  const sortedMuscles =
    volumeReport?.byMuscleGroup
      ?.filter((m) => m.sets > 0)
      .sort((a, b) => b.sets - a.sets) ?? [];

  function renderVolumeSection() {
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
            <p className="text-sm text-[var(--color-text-muted)]">
              No workouts logged this week yet.
            </p>
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
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-300">{w}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    );
  }

  // ── PR Feed ───────────────────────────────────────────────────────────────

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

    if (!lastSession) {
      return (
        <GlassCard className="mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Personal Records
          </h2>
          <div className="py-4 text-center">
            <Trophy className="h-8 w-8 mx-auto text-[var(--color-text-muted)] mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">
              Complete a workout to see PRs here.
            </p>
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
          <span className="text-xs text-[var(--color-text-muted)]">
            Last session
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          {lastSession.title ?? 'Workout'} ·{' '}
          {new Date(lastSession.startedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
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
                      {pr.previousBest !== null && (
                        <span className="ml-1">(was {pr.previousBest})</span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
                  >
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

  // ── Plateau Alerts ────────────────────────────────────────────────────────

  function renderPlateauSection() {
    if (plateauLoading) return null;
    if (plateaus.length === 0) return null;

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
              <div
                key={p.exerciseId}
                className="flex items-start gap-3 rounded-xl bg-[var(--color-base-700)] px-3 py-2.5"
              >
                <SeverityIcon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.exerciseName}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {p.message} · {p.exposureCount} sessions
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--color-base-600)] ${cfg.color}`}
                >
                  {p.severity}
                </span>
              </div>
            );
          })}
        </div>
      </GlassCard>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Volume, PRs &amp; plateau alerts
        </p>
      </header>

      {renderVolumeSection()}
      {renderPRSection()}
      {renderPlateauSection()}
    </div>
  );
}
