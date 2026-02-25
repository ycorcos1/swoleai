'use client';

/**
 * Dashboard — Task 13.1 skeleton wired for Task 6.4
 *
 * "Today" card reads the user's active split and shows today's
 * scheduled workout (or rest day).  Data is fetched from GET /api/splits,
 * filtered for isActive, and then the matching ScheduleDay for the
 * current local weekday is displayed.
 */

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { CheckCircle2, Dumbbell, Moon } from 'lucide-react';

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map JS getDay() (0 = Sun) to our WEEKDAY keys */
const JS_DAY_TO_WEEKDAY: Record<number, string> = {
  0: 'SUN',
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
};

// ── Dashboard Page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [dateString, setDateString] = useState<string>('');
  const [activeSplit, setActiveSplit] = useState<Split | null>(null);
  const [todayDay, setTodayDay] = useState<ScheduleDay | null | undefined>(
    undefined // undefined = not yet resolved
  );
  const [loadingSplit, setLoadingSplit] = useState(true);

  // Compute date on client side to use user's local timezone
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

    // Fetch splits and find the active one
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
  }, []);

  // ── Resolve "Today" display ─────────────────────────────────────────────

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

    // No active split
    if (!activeSplit) {
      return (
        <GlassCard className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Today</p>
              <h2 className="mt-1 text-lg font-semibold">No workout scheduled</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Create and activate a split to get started
              </p>
            </div>
          </div>
          <button className="btn-primary mt-4 w-full">Start Workout</button>
        </GlassCard>
      );
    }

    // Active split found but today has no schedule day
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
                No workout mapped for today in{' '}
                <span className="font-medium text-[var(--color-text-primary)]">
                  {activeSplit.name}
                </span>
              </p>
            </div>
          </div>
          <button className="btn-secondary mt-4 w-full">Start Freestyle</button>
        </GlassCard>
      );
    }

    // Rest day
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
                <span className="font-medium text-[var(--color-text-primary)]">
                  {activeSplit.name}
                </span>
              </p>
            </div>
          </div>
          <button className="btn-secondary mt-4 w-full">Start Freestyle</button>
        </GlassCard>
      );
    }

    // Workout day
    const workoutLabel =
      todayDay.label ||
      todayDay.workoutDayTemplate?.name ||
      'Workout';

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
        <button className="btn-primary mt-4 w-full">Start Workout</button>
      </GlassCard>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <header className="mb-6">
        <p className="text-sm text-[var(--color-text-muted)]">
          {dateString || '\u00A0'}
        </p>
        <h1 className="mt-1 text-2xl font-bold">Dashboard</h1>
      </header>

      {/* Today Card */}
      {renderTodayCard()}

      {/* Coach Actions Card */}
      <GlassCard className="mb-4">
        <h3 className="mb-3 font-semibold">Coach Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary text-sm">Next Session Plan</button>
          <button className="btn-secondary text-sm">Weekly Check-in</button>
          <button className="btn-secondary text-sm">Diagnose Plateau</button>
          <button className="btn-secondary text-sm">Goals Review</button>
        </div>
      </GlassCard>

      {/* Quick Stats */}
      <GlassCard>
        <h3 className="mb-3 font-semibold">This Week</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-2xl font-bold tabular-nums">0 / 4</p>
            <p className="text-xs text-[var(--color-text-muted)]">Workouts</p>
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold tabular-nums">—</p>
            <p className="text-xs text-[var(--color-text-muted)]">Last workout</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
