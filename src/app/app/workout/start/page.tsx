'use client';

/**
 * Workout Daily Logger
 *
 * Single-page workout hub. No separate session or summary screens.
 * Users log sets directly inline — no "Start Workout" / "End Workout" flow.
 *
 * Strip: 7-day paginated band controlled by ‹ / › buttons.
 * weekOffset (steps of 7): 0 = current week, -1 = last week, etc.
 * Calendar icon jumps to any past date and syncs the visible week.
 * "Back to Today" pill appears whenever weekOffset !== 0.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  useActiveSessionContext,
  type ActiveSessionExercise,
  type ActiveSessionSet,
} from '@/lib/offline';
import {
  SetLoggerSheet,
  AddExerciseSheet,
  SortableExerciseList,
  SwapExerciseSheet,
} from '@/components/workout';
import {
  CheckCircle2,
  Moon,
  Dumbbell,
  Plus,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  AlertCircle,
  CalendarDays,
  TrendingUp,
  MoreVertical,
  Undo2,
  ArrowLeftRight,
  AlertTriangle,
  X,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ScheduledTemplate {
  id: string;
  name: string;
  mode: 'FIXED' | 'SLOT';
  estimatedMinutes: number | null;
  blocks?: { id: string; exercise: { name: string } }[];
}

interface SessionSummary {
  id: string;
  title: string | null;
  startedAt: string;
  endedAt: string | null;
  status: string;
  exercises: { id: string; exercise: { name: string }; _count: { sets: number } }[];
}

interface DayLog {
  id: string;
  status: 'COMPLETED' | 'MISSED' | 'REST' | 'SKIPPED';
  workoutSession: SessionSummary | null;
  scheduledTemplate: { id: string; name: string } | null;
}

interface DayData {
  date: string;
  weekday: string;
  isToday: boolean;
  isPast: boolean;
  isScheduledRest: boolean;
  scheduledTemplate: ScheduledTemplate | null;
  scheduledLabel: string | null;
  dayLog: DayLog | null;
  completedSession: SessionSummary | null;
}

interface WeekResponse {
  days: DayData[];
  activeSplitName: string | null;
  today: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const WEEK_SIZE = 7; // always show exactly 7 days

// =============================================================================
// HELPERS
// =============================================================================

function toMidnightLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dateStr: string, n: number): string {
  const d = toMidnightLocal(dateStr);
  d.setDate(d.getDate() + n);
  return toDateString(d);
}

function formatShortDate(dateStr: string): { dayNum: string; dayName: string } {
  const d = toMidnightLocal(dateStr);
  return {
    dayNum: String(d.getDate()),
    dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
  };
}

function formatLongDate(dateStr: string): string {
  const d = toMidnightLocal(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getTodayString(): string {
  return toDateString(new Date());
}

/** Returns the date string that is `weekOffset * 7` days from today */
function getWeekMonday(todayStr: string, weekOffset: number): string {
  const d = toMidnightLocal(todayStr);
  // Move to Monday of the current week (0=Sun → go back 6, 1=Mon → 0, ..., 6=Sat → go back 5)
  const dow = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMonday = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + daysToMonday + weekOffset * 7);
  return toDateString(d);
}

function getWeekCenter(todayStr: string, weekOffset: number): string {
  return addDays(todayStr, weekOffset * 7);
}

type DayStatus =
  | 'completed'
  | 'missed'
  | 'rest'
  | 'skipped'
  | 'today-active'
  | 'today-workout'
  | 'today-rest'
  | 'today-empty'
  | 'unresolved'
  | 'future-workout'
  | 'future-rest'
  | 'future-none';

function getDayStatus(day: DayData, hasActiveSession: boolean): DayStatus {
  if (day.isToday && hasActiveSession) return 'today-active';

  if (day.dayLog) {
    const s = day.dayLog.status.toLowerCase() as DayStatus;
    const knownStatuses: DayStatus[] = ['completed', 'missed', 'rest', 'skipped', 'today-active', 'today-workout', 'today-rest', 'today-empty', 'unresolved', 'future-workout', 'future-rest', 'future-none'];
    if (knownStatuses.includes(s)) return s;
    // Unknown/stale status — fall through to schedule-based logic
  }
  if (day.completedSession) return 'completed';
  if (day.isToday) {
    if (day.isScheduledRest) return 'today-rest';
    if (day.scheduledTemplate) return 'today-workout';
    return 'today-empty';
  }
  if (day.isPast) return 'unresolved';
  if (day.isScheduledRest) return 'future-rest';
  if (day.scheduledTemplate) return 'future-workout';
  return 'future-none';
}

// =============================================================================
// DAY TILE
// =============================================================================

function DayTile({
  day,
  isSelected,
  hasActiveSession,
  onClick,
}: {
  day: DayData;
  isSelected: boolean;
  hasActiveSession: boolean;
  onClick: () => void;
}) {
  const { dayNum, dayName } = formatShortDate(day.date);
  const status = getDayStatus(day, hasActiveSession);

  const dot = () => {
    if (status === 'completed' || status === 'today-active')
      return <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />;
    if (status === 'missed')
      return <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />;
    if (status === 'rest' || status === 'today-rest' || status === 'future-rest')
      return <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />;
    if (status === 'unresolved')
      return <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />;
    if (status === 'today-workout' || status === 'future-workout')
      return <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-purple)]" />;
    return <span className="w-1.5 h-1.5 rounded-full bg-transparent" />;
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-1 flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all min-w-0
        ${isSelected
          ? 'bg-[var(--color-accent-purple)] text-white shadow-[var(--shadow-glow)]'
          : day.isToday
          ? 'bg-[var(--color-base-600)] text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-base-700)]'
        }
      `}
    >
      <span className={`text-[10px] font-medium uppercase tracking-wider ${isSelected ? 'text-white/80' : ''}`}>
        {dayName}
      </span>
      <span className={`text-lg font-bold leading-none ${day.isToday && !isSelected ? 'text-[var(--color-accent-purple)]' : ''}`}>
        {dayNum}
      </span>
      <div className="h-1.5 flex items-center">{dot()}</div>
    </button>
  );
}

// =============================================================================
// MONTH PICKER CALENDAR
// =============================================================================

function MonthPicker({
  todayStr,
  selectedDate,
  onSelect,
  onClose,
}: {
  todayStr: string;
  selectedDate: string | null;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}) {
  const todayDate = toMidnightLocal(todayStr);
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth()); // 0-indexed

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    // Don't navigate beyond current month
    const now = new Date();
    if (viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth())) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push(`${viewYear}-${mm}-${dd}`);
  }

  const nowStr = todayStr;
  const isAtCurrentMonth =
    viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth();

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[80] animate-in slide-in-from-bottom duration-300">
        <div className="bg-[var(--color-base-800)] border-t border-[var(--glass-border)] rounded-t-3xl shadow-2xl safe-area-bottom px-4 pt-4 pb-8">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-[var(--color-base-500)]" />
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--color-base-600)] active:scale-95 transition-all"
            >
              <ChevronLeft className="h-4 w-4 text-[var(--color-text-secondary)]" />
            </button>
            <p className="font-semibold text-sm">{monthName}</p>
            <button
              onClick={nextMonth}
              disabled={isAtCurrentMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--color-base-600)] active:scale-95 transition-all disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)]" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-[var(--color-text-muted)] uppercase py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((dateStr, i) => {
              if (!dateStr) return <div key={i} />;
              const isFuture = dateStr > nowStr;
              const isToday = dateStr === nowStr;
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={dateStr}
                  disabled={isFuture}
                  onClick={() => { onSelect(dateStr); onClose(); }}
                  className={`
                    flex items-center justify-center h-9 w-full rounded-lg text-sm font-medium transition-all
                    ${isSelected ? 'bg-[var(--color-accent-purple)] text-white' : ''}
                    ${isToday && !isSelected ? 'text-[var(--color-accent-purple)] font-bold' : ''}
                    ${!isSelected && !isToday ? 'text-[var(--color-text-primary)]' : ''}
                    ${isFuture ? 'opacity-25 cursor-not-allowed' : 'hover:bg-[var(--color-base-600)] active:scale-95'}
                  `}
                >
                  {Number(dateStr.split('-')[2])}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          {!isAtCurrentMonth && (
            <button
              onClick={() => { onSelect(nowStr); onClose(); }}
              className="mt-4 w-full py-2.5 rounded-xl bg-[var(--color-base-700)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-base-600)] transition-colors"
            >
              Jump to Today
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// =============================================================================
// STATS BAR
// =============================================================================

function StatsBar({
  exercises,
  units,
}: {
  exercises: ActiveSessionExercise[];
  units: 'IMPERIAL' | 'METRIC';
}) {
  const { totalSets, totalVolume } = useMemo(() => {
    let sets = 0;
    let vol = 0;
    for (const ex of exercises) {
      for (const set of ex.sets) {
        if (set.weight > 0 || set.reps > 0) {
          sets++;
          vol += set.weight * set.reps;
        }
      }
    }
    return { totalSets: sets, totalVolume: vol };
  }, [exercises]);

  return (
    <div className="glass-card p-3">
      <div className="flex items-center justify-around">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-lg font-bold tabular-nums">{totalSets}</span>
          <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Sets</span>
        </div>
        <div className="w-px h-8 bg-[var(--glass-border)]" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-lg font-bold tabular-nums">{totalVolume.toLocaleString()}</span>
          <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
            {units === 'METRIC' ? 'kg vol' : 'lbs vol'}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EXERCISE CARD
// =============================================================================

function ExerciseCard({
  exercise,
  onTapAddSet,
  onTapEditSet,
  onTapSwap,
  dragHandle,
  stressFlags,
  onDismissStress,
}: {
  exercise: ActiveSessionExercise;
  onTapAddSet: () => void;
  onTapEditSet: (set: ActiveSessionSet) => void;
  onTapSwap?: () => void;
  dragHandle?: React.ReactNode;
  stressFlags?: Record<string, string>;
  onDismissStress?: () => void;
}) {
  const loggedSets = exercise.sets.filter((s) => s.weight > 0 || s.reps > 0);

  const bestSet = useMemo(() => {
    if (!loggedSets.length) return null;
    return loggedSets.reduce((b, c) => (c.weight > b.weight ? c : b), loggedSets[0]);
  }, [loggedSets]);

  const stressLabels = useMemo(() => {
    if (!stressFlags) return [];
    return Object.entries(stressFlags)
      .filter(([, v]) => v === 'high' || v === 'moderate' || v === 'medium')
      .map(([k]) => k.replace(/_/g, ' '));
  }, [stressFlags]);

  return (
    <div className="glass-card p-4">
      <div className="flex items-start gap-2">
        {dragHandle && (
          <div className="flex items-center pt-0.5 shrink-0">{dragHandle}</div>
        )}
        <button
          onClick={onTapAddSet}
          className="flex-1 min-w-0 text-left transition-all active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{exercise.exerciseName}</h3>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-base-600)] text-[var(--color-text-secondary)]">
                  {exercise.sets.length} set{exercise.sets.length !== 1 ? 's' : ''}
                </span>
                {bestSet && (
                  <span className="flex items-center gap-1 text-xs text-[var(--color-accent-purple)]">
                    <TrendingUp className="h-3 w-3" />
                    <span className="tabular-nums">{bestSet.weight} × {bestSet.reps}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onTapSwap && (
                <button
                  onClick={(e) => { e.stopPropagation(); onTapSwap(); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-95 transition-all"
                  aria-label={`Swap ${exercise.exerciseName}`}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                </button>
              )}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] shadow-sm">
                <Plus className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        </button>
      </div>

      {stressLabels.length > 0 && onDismissStress && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span className="text-xs text-amber-300 truncate">
              Joint stress: {stressLabels.join(', ')}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onTapSwap && (
              <button
                onClick={(e) => { e.stopPropagation(); onTapSwap(); }}
                className="text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2"
              >
                Swap?
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDismissStress?.(); }}
              className="flex h-5 w-5 items-center justify-center text-amber-400/60 hover:text-amber-300"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {loggedSets.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]">
          {exercise.sets.map((set, idx) => (
            <button
              key={set.localId}
              onClick={() => onTapEditSet(set)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-95 transition-all"
            >
              <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{idx + 1}</span>
              <span className="text-sm font-medium tabular-nums">{set.weight}×{set.reps}</span>
            </button>
          ))}
        </div>
      )}

      {exercise.sets.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] mt-2">Tap + to log your first set</p>
      )}
    </div>
  );
}

// =============================================================================
// SECTION LABEL
// =============================================================================

function SectionLabel({
  icon,
  text,
  color,
}: {
  icon: React.ReactNode;
  text: string;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${color}`}>
      {icon}
      {text}
    </div>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function WorkoutStartPage() {
  const router = useRouter();
  const {
    session,
    isLoading: isSessionLoading,
    startSession,
    addExercise,
    updateExercise,
    logSet,
    updateSet,
    reorderExercises,
    canUndo,
    undoLastAction,
  } = useActiveSessionContext();

  // ── Date strip state ──────────────────────────────────────────────────────
  const todayStr = useMemo(() => getTodayString(), []);
  // weekOffset: 0 = week containing today, -1 = previous week, etc.
  const [weekOffset, setWeekOffset] = useState(0);
  const [allDays, setAllDays] = useState<DayData[]>([]);
  const [activeSplitName, setActiveSplitName] = useState<string | null>(null);
  const [isWeekLoading, setIsWeekLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  const [showCalendar, setShowCalendar] = useState(false);

  // ── Other page state ──────────────────────────────────────────────────────
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templatePickerDate, setTemplatePickerDate] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ScheduledTemplate[]>([]);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
  const [startingWorkoutId, setStartingWorkoutId] = useState<string | null>(null);

  const [loggingDate, setLoggingDate] = useState<string | null>(null);

  const [selectedExercise, setSelectedExercise] = useState<ActiveSessionExercise | null>(null);
  const [editingSet, setEditingSet] = useState<ActiveSessionSet | null>(null);
  const [showSetLogger, setShowSetLogger] = useState(false);

  const [showAddExercise, setShowAddExercise] = useState(false);

  const [swapTarget, setSwapTarget] = useState<ActiveSessionExercise | null>(null);
  const [showSwap, setShowSwap] = useState(false);

  const [stressFlagsMap, setStressFlagsMap] = useState<Record<string, Record<string, string>>>({});
  const [dismissedStress, setDismissedStress] = useState<Set<string>>(new Set());

  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [units, setUnits] = useState<'IMPERIAL' | 'METRIC'>('IMPERIAL');

  const stripRef = useRef<HTMLDivElement>(null); // unused after paginated strip

  // ── Fetch strip data ──────────────────────────────────────────────────────

  const fetchStrip = useCallback(async (center: string) => {
    setIsWeekLoading(true);
    try {
      // center is Monday of the week; use window=7 with pastDays=0 so we get Mon–Sun
      const url = `/api/schedule/week?centerDate=${center}&window=7&startOfWeek=true`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data: WeekResponse = await res.json();
      setAllDays(data.days);
      setActiveSplitName(data.activeSplitName);
    } catch {
      // non-critical
    } finally {
      setIsWeekLoading(false);
    }
  }, []);

  useEffect(() => {
    const center = getWeekMonday(todayStr, weekOffset);
    fetchStrip(center);
  }, [fetchStrip, todayStr, weekOffset]);

  // After the week loads, pick the best day to highlight:
  // - if today is in the visible window, select it
  // - otherwise select the first day
  // Only run this when allDays actually changes (new week loaded).
  const prevAllDaysRef = useRef<DayData[]>([]);
  useEffect(() => {
    if (allDays.length === 0) return;
    if (allDays === prevAllDaysRef.current) return;
    prevAllDaysRef.current = allDays;
    // If user already has a valid selection within this window, keep it
    if (selectedDate && allDays.some((d) => d.date === selectedDate)) return;
    const todayInStrip = allDays.find((d) => d.isToday);
    setSelectedDate(todayInStrip ? todayStr : allDays[0].date);
  }, [allDays, selectedDate, todayStr]);

  // ── On calendar jump: compute offset so the correct week loads ────────────

  const handleCalendarSelect = useCallback(
    (dateStr: string) => {
      // Find the Monday of the week containing the chosen date
      const chosenMonday = toMidnightLocal(dateStr);
      const dow = chosenMonday.getDay();
      const daysToMonday = dow === 0 ? -6 : 1 - dow;
      chosenMonday.setDate(chosenMonday.getDate() + daysToMonday);

      // Find the Monday of today's week
      const todayMonday = toMidnightLocal(todayStr);
      const todayDow = todayMonday.getDay();
      const todayDaysToMonday = todayDow === 0 ? -6 : 1 - todayDow;
      todayMonday.setDate(todayMonday.getDate() + todayDaysToMonday);

      const diffDays = Math.round((chosenMonday.getTime() - todayMonday.getTime()) / 86400000);
      const offset = Math.round(diffDays / 7);
      setWeekOffset(offset);
      setSelectedDate(dateStr);
    },
    [todayStr]
  );

  // ── Units ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.profile?.units) setUnits(d.profile.units); })
      .catch(() => {});
  }, []);

  // ── Stress flags ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/exercises')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.exercises) return;
        const map: Record<string, Record<string, string>> = {};
        for (const ex of d.exercises) {
          if (ex.jointStressFlags && Object.keys(ex.jointStressFlags).length > 0) {
            map[ex.id] = ex.jointStressFlags;
          }
        }
        setStressFlagsMap(map);
      })
      .catch(() => {});
  }, []);

  // ── Template picker ───────────────────────────────────────────────────────

  const openTemplatePicker = useCallback(async (forDate?: string) => {
    setTemplatePickerDate(forDate ?? null);
    setShowTemplatePicker(true);
    if (templates.length > 0) return;
    setIsTemplatesLoading(true);
    try {
      const res = await fetch('/api/templates');
      if (res.ok) setTemplates((await res.json()).templates ?? []);
    } catch {
      // non-critical
    } finally {
      setIsTemplatesLoading(false);
    }
  }, [templates.length]);

  // ── Start a session ───────────────────────────────────────────────────────

  const handleStartWithTemplate = useCallback(
    async (templateId?: string, title?: string) => {
      const key = templateId ?? 'freestyle';
      setStartingWorkoutId(key);
      const backfillDate = templatePickerDate ?? undefined;
      try {
        if (backfillDate) {
          // Past-day backfill: go directly to server, no IndexedDB session
          await fetch('/api/workouts/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId, title, backfillDate }),
          });
          setShowTemplatePicker(false);
          setTemplatePickerDate(null);
          await fetchStrip(getWeekMonday(todayStr, weekOffset));
        } else {
          await startSession({ templateId, title });
          try {
            await fetch('/api/workouts/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ templateId, title }),
            });
          } catch { /* continue with local */ }
          setShowTemplatePicker(false);
          setTemplatePickerDate(null);
        }
      } catch { /* already active */ } finally {
        setStartingWorkoutId(null);
      }
    },
    [startSession, templatePickerDate, fetchStrip, todayStr, weekOffset]
  );

  const handleStartFreestyle = useCallback(async () => {
    setStartingWorkoutId('freestyle');
    const backfillDate = templatePickerDate ?? undefined;
    try {
      if (backfillDate) {
        // Past-day backfill: go directly to server
        await fetch('/api/workouts/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Freestyle Workout', backfillDate }),
        });
        setShowTemplatePicker(false);
        setTemplatePickerDate(null);
        await fetchStrip(getWeekMonday(todayStr, weekOffset));
      } else {
        let initialExercises: { localId: string; exerciseId: string; exerciseName: string }[] = [];
        try {
          const res = await fetch('/api/exercises');
          if (res.ok) {
            const data = await res.json() as { exercises?: { id: string; name: string }[] };
            const defaults = ['Barbell Bench Press', 'Barbell Back Squat', 'Barbell Deadlift'];
            initialExercises = defaults.flatMap((name, i) => {
              const match = data.exercises?.find((e) => e.name === name);
              return match
                ? [{ localId: `ex_${Date.now()}_${i + 1}`, exerciseId: match.id, exerciseName: match.name }]
                : [];
            });
          }
        } catch { /* start empty */ }
        await startSession({ title: 'Freestyle Workout', initialExercises });
        try {
          await fetch('/api/workouts/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Freestyle Workout' }),
          });
        } catch { /* continue */ }
        setShowTemplatePicker(false);
        setTemplatePickerDate(null);
      }
    } catch { /* error */ } finally {
      setStartingWorkoutId(null);
    }
  }, [startSession, templatePickerDate, fetchStrip, todayStr, weekOffset]);

  // ── Mark day ──────────────────────────────────────────────────────────────

  const handleMarkDay = useCallback(
    async (date: string, status: 'MISSED' | 'REST' | 'SKIPPED', scheduledTemplateId?: string) => {
      setLoggingDate(date);
      try {
        const res = await fetch('/api/schedule/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, status, scheduledTemplateId }),
        });
        if (res.ok) {
          await fetchStrip(getWeekMonday(todayStr, weekOffset));
        } else {
          const err = await res.json().catch(() => ({}));
          console.error('[handleMarkDay] API error', res.status, err);
        }
      } catch (e) {
        console.error('[handleMarkDay] fetch error', e);
      } finally {
        setLoggingDate(null);
      }
    },
    [fetchStrip, todayStr, weekOffset]
  );

  // ── Set logger ────────────────────────────────────────────────────────────

  const handleTapAddSet = useCallback((exercise: ActiveSessionExercise) => {
    setSelectedExercise(exercise);
    setEditingSet(null);
    setShowSetLogger(true);
  }, []);

  const handleTapEditSet = useCallback(
    (exercise: ActiveSessionExercise, set: ActiveSessionSet) => {
      setSelectedExercise(exercise);
      setEditingSet(set);
      setShowSetLogger(true);
    },
    []
  );

  const handleLogSet = useCallback(
    async (exerciseLocalId: string, set: Omit<ActiveSessionSet, 'setIndex' | 'loggedAt'>) => {
      await logSet(exerciseLocalId, set);
    },
    [logSet]
  );

  const handleUpdateSet = useCallback(
    async (
      exerciseLocalId: string,
      setLocalId: string,
      updates: Partial<Omit<ActiveSessionSet, 'localId'>>
    ) => {
      await updateSet(exerciseLocalId, setLocalId, updates);
    },
    [updateSet]
  );

  // ── Swap ──────────────────────────────────────────────────────────────────

  const handleSwap = useCallback(
    async (newExerciseId: string, newExerciseName: string) => {
      if (!swapTarget) return;
      await updateExercise(swapTarget.localId, { exerciseId: newExerciseId, exerciseName: newExerciseName });
    },
    [swapTarget, updateExercise]
  );

  // ── Undo ──────────────────────────────────────────────────────────────────

  const handleUndo = useCallback(async () => {
    if (isUndoing || !canUndo) return;
    setIsUndoing(true);
    try { await undoLastAction(); } catch { /* non-critical */ } finally { setIsUndoing(false); }
  }, [isUndoing, canUndo, undoLastAction]);

  // =============================================================================
  // DERIVED STATE
  // =============================================================================

  const selectedDay = allDays.find((d) => d.date === selectedDate) ?? null;
  const hasActiveSession = !!session;

  // Live set count from active session (for dot update, todo 3)
  const activeSessionHasSets = useMemo(() => {
    if (!session) return false;
    return session.exercises.some((ex) => ex.sets.length > 0);
  }, [session]);

  // =============================================================================
  // SUB-COMPONENTS
  // =============================================================================

  function ResolutionPicker({
    scheduledTemplate,
    date,
    currentStatus,
  }: {
    scheduledTemplate: ScheduledTemplate | null;
    date: string;
    currentStatus?: string;
  }) {
    const isPastLogging = startingWorkoutId === `past-${date}`;
    const isLogging = loggingDate === date;

    const handleLogPast = async (templateId?: string, title?: string) => {
      setStartingWorkoutId(`past-${date}`);
      try {
        await fetch('/api/workouts/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId, title: title ?? `Workout — ${formatLongDate(date)}`, backfillDate: date }),
        });
        await fetchStrip(getWeekMonday(todayStr, weekOffset));
      } catch { /* error */ } finally {
        setStartingWorkoutId(null);
      }
    };

    return (
      <div className="space-y-3">
        {scheduledTemplate && (
          <div className="glass-card p-4">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">Scheduled</p>
            <p className="font-semibold">{scheduledTemplate.name}</p>
          </div>
        )}

        <button
          disabled={isLogging || isPastLogging}
          onClick={() => handleLogPast(scheduledTemplate?.id, scheduledTemplate?.name)}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] font-semibold text-white shadow-[var(--shadow-glow)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {isPastLogging ? <Loader2 className="h-5 w-5 animate-spin shrink-0" /> : <Plus className="h-5 w-5 shrink-0" />}
          <span>Log a workout</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--glass-border)]" />
          <span className="text-xs text-[var(--color-text-muted)]">or mark as</span>
          <div className="flex-1 h-px bg-[var(--glass-border)]" />
        </div>

        <button
          disabled={isLogging}
          onClick={() => handleMarkDay(date, 'REST')}
          className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl border transition-all disabled:opacity-50 active:scale-[0.97]
            ${currentStatus === 'rest' || currentStatus === 'missed'
              ? 'bg-[var(--color-base-500)] border-[var(--color-accent-purple)]/40 ring-1 ring-[var(--color-accent-purple)]/20'
              : 'bg-[var(--color-base-600)] border-[var(--glass-border)] hover:bg-[var(--color-base-500)]'}`}
        >
          {isLogging ? <Loader2 className="h-5 w-5 animate-spin" /> : <Moon className="h-5 w-5" />}
          <span className="text-sm font-medium">Rest day</span>
        </button>

        {scheduledTemplate && (
          <button
            disabled={isLogging || isPastLogging}
            onClick={() => openTemplatePicker(date)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text-secondary)] transition-colors disabled:opacity-50"
          >
            <Dumbbell className="h-4 w-4" />
            Log a different workout
          </button>
        )}
      </div>
    );
  }

  function ActiveLogView({ day }: { day: DayData }) {
    const sortedExercises = session
      ? [...session.exercises].sort((a, b) => a.orderIndex - b.orderIndex)
      : [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-base">
              {session?.title || day.scheduledTemplate?.name || 'Workout'}
            </p>
            {day.scheduledTemplate && session?.title !== day.scheduledTemplate.name && (
              <p className="text-xs text-[var(--color-text-muted)]">
                Scheduled: {day.scheduledTemplate.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo || isUndoing}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all
                ${canUndo && !isUndoing ? 'bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-95' : 'opacity-30 cursor-not-allowed'}`}
              aria-label="Undo"
            >
              <Undo2 className={`h-4 w-4 text-[var(--color-text-primary)] ${isUndoing ? 'animate-pulse' : ''}`} />
            </button>
            <button
              onClick={() => setShowMoreOptions(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--color-base-600)] transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-[var(--color-text-secondary)]" />
            </button>
          </div>
        </div>

        {sortedExercises.length > 0 && <StatsBar exercises={sortedExercises} units={units} />}

        {sortedExercises.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Dumbbell className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-3" />
            <p className="font-medium mb-1">No exercises yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">Add your first exercise to start logging</p>
            <button onClick={() => setShowAddExercise(true)} className="btn-primary mx-auto">
              <Plus className="h-4 w-4" /> Add Exercise
            </button>
          </div>
        ) : (
          <SortableExerciseList
            exercises={sortedExercises}
            onReorder={reorderExercises}
            renderCard={(exercise, dragHandle) => (
              <ExerciseCard
                exercise={exercise}
                onTapAddSet={() => handleTapAddSet(exercise)}
                onTapEditSet={(set) => handleTapEditSet(exercise, set)}
                onTapSwap={() => { setSwapTarget(exercise); setShowSwap(true); }}
                dragHandle={dragHandle}
                stressFlags={!dismissedStress.has(exercise.localId) ? stressFlagsMap[exercise.exerciseId] : undefined}
                onDismissStress={() => setDismissedStress((p) => new Set([...p, exercise.localId]))}
              />
            )}
          />
        )}

        {sortedExercises.length > 0 && (
          <button
            onClick={() => setShowAddExercise(true)}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl glass-card hover:brightness-105 active:scale-[0.98] transition-all text-[var(--color-text-secondary)] font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Exercise
          </button>
        )}

        <button
          onClick={openTemplatePicker}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl glass-card hover:brightness-105 active:scale-[0.98] transition-all"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-base-600)] shrink-0">
            <Sparkles className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </div>
          <span className="font-medium text-sm text-[var(--color-text-secondary)]">Switch workout</span>
          <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] ml-auto shrink-0" />
        </button>
      </div>
    );
  }

  function renderDayDetail(day: DayData) {
    const status = getDayStatus(day, hasActiveSession);

    if (status === 'today-active') return <ActiveLogView day={day} />;

    if (status === 'today-workout') {
      const tmpl = day.scheduledTemplate!;
      const names = tmpl.blocks?.map((b) => b.exercise.name).slice(0, 3) ?? [];
      return (
        <div className="space-y-4">
          <SectionLabel icon={<CalendarDays className="h-4 w-4 text-[var(--color-accent-purple)]" />} text="Scheduled for Today" color="text-[var(--color-accent-purple)]" />
          <div className="glass-card border-[var(--color-accent-purple)]/30 p-4">
            <p className="font-bold text-base">{tmpl.name}</p>
            {tmpl.estimatedMinutes && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">~{tmpl.estimatedMinutes} min</p>}
            {names.length > 0 && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                {names.join(' · ')}{tmpl.blocks && tmpl.blocks.length > 3 ? ` +${tmpl.blocks.length - 3} more` : ''}
              </p>
            )}
          </div>
          <button
            disabled={startingWorkoutId !== null}
            onClick={() => handleStartWithTemplate(tmpl.id, tmpl.name)}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] font-semibold text-white shadow-[var(--shadow-glow)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {startingWorkoutId === tmpl.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            Add Exercises
          </button>
          <button disabled={startingWorkoutId !== null} onClick={openTemplatePicker} className="w-full flex items-center gap-3 p-4 rounded-xl glass-card hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-base-600)] shrink-0"><Sparkles className="h-4 w-4 text-[var(--color-text-secondary)]" /></div>
            <span className="font-medium text-sm">Log a different workout</span>
            <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] ml-auto shrink-0" />
          </button>
          <button
            disabled={loggingDate !== null}
            onClick={() => handleMarkDay(selectedDate!, 'REST')}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[var(--color-base-700)] text-[var(--color-text-muted)] text-sm hover:bg-[var(--color-base-600)] transition-colors disabled:opacity-50"
          >
            <Moon className="h-4 w-4" />
            Mark as rest day
          </button>
        </div>
      );
    }

    if (status === 'today-rest') {
      return (
        <div className="space-y-4">
          <SectionLabel icon={<Moon className="h-4 w-4 text-[var(--color-text-muted)]" />} text="Rest Day" color="text-[var(--color-text-muted)]" />
          <div className="glass-card p-4 flex items-center gap-3">
            <Moon className="h-8 w-8 text-[var(--color-text-muted)]" />
            <div>
              <p className="font-medium">Scheduled rest day</p>
              <p className="text-sm text-[var(--color-text-muted)]">Recovery is part of the program.</p>
            </div>
          </div>
          <button disabled={startingWorkoutId !== null} onClick={openTemplatePicker} className="w-full flex items-center gap-3 p-4 rounded-xl glass-card hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-base-600)] shrink-0"><Sparkles className="h-4 w-4 text-[var(--color-text-secondary)]" /></div>
            <span className="font-medium text-sm">Train anyway</span>
            <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] ml-auto shrink-0" />
          </button>
        </div>
      );
    }

    if (status === 'today-empty') {
      return (
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-amber-400 shrink-0" />
            <div>
              <p className="font-medium">No split active</p>
              <p className="text-sm text-[var(--color-text-muted)]">Set up a split in Routine to get scheduled workouts.</p>
            </div>
          </div>
          <button disabled={startingWorkoutId !== null} onClick={openTemplatePicker} className="w-full flex items-center gap-3 p-4 rounded-xl glass-card hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-base-600)] shrink-0"><Sparkles className="h-4 w-4 text-[var(--color-text-secondary)]" /></div>
            <span className="font-medium text-sm">Log a workout</span>
            <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] ml-auto shrink-0" />
          </button>
        </div>
      );
    }

    if (status === 'completed') {
      const s = day.dayLog?.workoutSession ?? day.completedSession;
      const totalSets = s?.exercises.reduce((acc, e) => acc + e._count.sets, 0) ?? 0;
      const isPast = day.isPast;
      return (
        <div className="space-y-4">
          <div className="glass-card p-4 space-y-3">
            <p className="font-bold">{s?.title || 'Workout'}</p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--color-text-muted)]">{s?.exercises.length ?? 0} exercises</span>
              <span className="text-sm text-[var(--color-text-muted)]">{totalSets} sets</span>
            </div>
            {s && s.exercises.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-[var(--glass-border)]">
                {s.exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)] truncate">{ex.exercise.name}</span>
                    <span className="text-xs text-[var(--color-text-muted)] shrink-0 ml-2">{ex._count.sets} set{ex._count.sets !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}
            {s && (
              <button
                onClick={() => router.push(`/app/workout/session/${s.id}`)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] font-semibold text-white text-sm hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <Plus className="h-4 w-4" />
                Log / edit exercises
              </button>
            )}
          </div>
          <div className="pt-2 border-t border-[var(--glass-border)]">
            <p className="text-xs text-[var(--color-text-muted)] mb-3">Not right? Update this day:</p>
            <div className="space-y-2">
              <button
                disabled={startingWorkoutId !== null}
                onClick={() => openTemplatePicker(day.date)}
                className="w-full flex items-center gap-3 p-3 rounded-xl glass-card hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-base-600)] shrink-0">
                  <Sparkles className="h-4 w-4 text-[var(--color-text-secondary)]" />
                </div>
                <span className="font-medium text-sm">Log a different workout</span>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] ml-auto shrink-0" />
              </button>
              <button
                disabled={loggingDate !== null}
                onClick={() => handleMarkDay(day.date, 'REST')}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[var(--color-base-700)] text-[var(--color-text-muted)] text-sm hover:bg-[var(--color-base-600)] transition-colors disabled:opacity-50"
              >
                <Moon className="h-4 w-4" />
                Mark as rest day instead
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (status === 'missed' || status === 'rest' || status === 'skipped') {
      return (
        <div className="space-y-4">
          <SectionLabel icon={<Moon className="h-4 w-4 text-[var(--color-text-muted)]" />} text="Rest Day" color="text-[var(--color-text-muted)]" />
          <ResolutionPicker scheduledTemplate={day.scheduledTemplate} date={day.date} currentStatus="rest" />
        </div>
      );
    }

    if (status === 'unresolved') {
      return (
        <div className="space-y-4">
          <SectionLabel icon={<AlertCircle className="h-4 w-4 text-amber-400" />} text="What happened?" color="text-amber-400" />
          <ResolutionPicker scheduledTemplate={day.scheduledTemplate} date={day.date} />
        </div>
      );
    }

    if (status === 'future-workout' && day.scheduledTemplate) {
      const tmpl = day.scheduledTemplate;
      const names = tmpl.blocks?.map((b) => b.exercise.name).slice(0, 3) ?? [];
      return (
        <div className="space-y-3">
          <SectionLabel icon={<Dumbbell className="h-4 w-4 text-[var(--color-text-muted)]" />} text="Upcoming" color="text-[var(--color-text-muted)]" />
          <div className="glass-card p-4 opacity-70">
            <p className="font-bold">{tmpl.name}</p>
            {tmpl.estimatedMinutes && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">~{tmpl.estimatedMinutes} min</p>}
            {names.length > 0 && <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">{names.join(' · ')}</p>}
          </div>
        </div>
      );
    }

    return (
      <div className="glass-card p-4 flex items-center gap-3">
        <Moon className="h-5 w-5 text-[var(--color-text-muted)] shrink-0" />
        <p className="text-sm text-[var(--color-text-muted)]">
          {status === 'future-rest' ? 'Scheduled rest day' : 'Nothing scheduled'}
        </p>
      </div>
    );
  }

  // =============================================================================
  // LOADING
  // =============================================================================

  if (isSessionLoading || (isWeekLoading && allDays.length === 0)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent-purple)]" />
      </div>
    );
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="flex flex-col min-h-full pb-24">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workout</h1>
          {activeSplitName && (
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{activeSplitName}</p>
          )}
        </div>
        {/* Calendar jump icon */}
        <button
          onClick={() => setShowCalendar(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-95 transition-all mt-1"
          aria-label="Open calendar"
        >
          <CalendarDays className="h-4 w-4 text-[var(--color-text-secondary)]" />
        </button>
      </header>

      {/* ── Paginated Week Strip ──────────────────────────────────────────── */}
      <div className="px-4 pb-2">
        {/* Prev / Next controls */}
        <div className="flex items-center gap-2">
          {/* Prev week */}
          <button
            onClick={() => {
              setWeekOffset((o) => o - 1);
              setSelectedDate(null);
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-95 transition-all"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </button>

          {/* Day tiles */}
          <div className="flex flex-1 gap-1">
            {isWeekLoading && allDays.length === 0 ? (
              Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center gap-1 py-2.5 px-1 rounded-xl bg-[var(--color-base-700)] animate-pulse min-w-0"
                >
                  <span className="h-2 w-5 rounded bg-[var(--color-base-600)]" />
                  <span className="h-5 w-5 rounded bg-[var(--color-base-600)]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-base-600)]" />
                </div>
              ))
            ) : (
              allDays.map((day) => (
                <DayTile
                  key={day.date}
                  day={day}
                  isSelected={selectedDate === day.date}
                  hasActiveSession={hasActiveSession && activeSessionHasSets && day.isToday}
                  onClick={() => setSelectedDate(day.date)}
                />
              ))
            )}
          </div>

          {/* Next week — disabled when already at current week */}
          <button
            onClick={() => {
              setWeekOffset((o) => o + 1);
              setSelectedDate(null);
            }}
            disabled={weekOffset >= 0}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-95 transition-all disabled:opacity-30"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* "Back to Today" pill — only when not on current week */}
        {weekOffset !== 0 && (
          <button
            onClick={() => {
              setWeekOffset(0);
              setSelectedDate(todayStr);
            }}
            className="mt-2 mx-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent-purple)]/20 border border-[var(--color-accent-purple)]/30 text-xs font-medium text-[var(--color-accent-purple)] hover:bg-[var(--color-accent-purple)]/30 active:scale-95 transition-all"
          >
            <CalendarDays className="h-3 w-3" />
            Back to Today
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--glass-border)] mx-4 mb-5 mt-3" />

      {/* Day Detail */}
      <div className="flex-1 px-4">
        {selectedDay ? (
          <>
            <div className="mb-5">
              <p className="text-base font-semibold">
                {selectedDay.isToday
                  ? `Today — ${formatLongDate(selectedDay.date)}`
                  : formatLongDate(selectedDay.date)}
              </p>
            </div>
            {renderDayDetail(selectedDay)}
          </>
        ) : isWeekLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent-purple)]" />
          </div>
        ) : (
          <div className="glass-card p-5 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Select a day above</p>
          </div>
        )}
      </div>

      {/* ── Calendar Month Picker ─────────────────────────────────────────── */}
      {showCalendar && (
        <MonthPicker
          todayStr={todayStr}
          selectedDate={selectedDate}
          onSelect={handleCalendarSelect}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* ── Template Picker Sheet ─────────────────────────────────────────── */}
      {showTemplatePicker && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setShowTemplatePicker(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[60] animate-in slide-in-from-bottom duration-300">
            <div className="bg-[var(--color-base-800)] border-t border-[var(--glass-border)] rounded-t-3xl shadow-2xl safe-area-bottom px-4 pt-4 pb-8 max-h-[80vh] flex flex-col">
              <div className="flex justify-center mb-4 shrink-0"><div className="w-10 h-1 rounded-full bg-[var(--color-base-500)]" /></div>
              <h2 className="text-base font-semibold mb-4 px-1 shrink-0">Choose a workout</h2>
              <div className="overflow-y-auto space-y-2">
                {isTemplatesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent-purple)]" /></div>
                ) : (
                  <>
                    {templates.map((tmpl) => (
                      <button key={tmpl.id} disabled={startingWorkoutId !== null} onClick={() => handleStartWithTemplate(tmpl.id, tmpl.name)} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--color-base-700)] hover:bg-[var(--color-base-600)] active:scale-[0.98] transition-all text-left disabled:opacity-60">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-base-600)] shrink-0">
                          {startingWorkoutId === tmpl.id ? <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent-purple)]" /> : <Dumbbell className="h-4 w-4 text-[var(--color-text-secondary)]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{tmpl.name}</p>
                          {tmpl.estimatedMinutes && <p className="text-xs text-[var(--color-text-muted)]">~{tmpl.estimatedMinutes} min</p>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                      </button>
                    ))}
                    <button disabled={startingWorkoutId !== null} onClick={handleStartFreestyle} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--color-base-700)] hover:bg-[var(--color-base-600)] active:scale-[0.98] transition-all text-left disabled:opacity-60">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-base-600)] shrink-0"><Sparkles className="h-4 w-4 text-[var(--color-text-secondary)]" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Freestyle</p>
                        <p className="text-xs text-[var(--color-text-muted)]">Start empty, add as you go</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── More Options Sheet ────────────────────────────────────────────── */}
      {showMoreOptions && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm" onClick={() => setShowMoreOptions(false)} aria-hidden />
          <div className="fixed inset-x-0 bottom-0 z-[70] animate-in slide-in-from-bottom duration-300">
            <div className="bg-[var(--color-base-800)] border-t border-[var(--glass-border)] rounded-t-3xl shadow-2xl safe-area-bottom px-4 pt-4 pb-8">
              <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-[var(--color-base-500)]" /></div>
              <h2 className="text-base font-semibold mb-4 px-2">Options</h2>
              <div className="space-y-2">
                <button onClick={() => { setShowMoreOptions(false); router.push('/app/workout/session/current'); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-[0.98] transition-all text-left">
                  <Dumbbell className="h-5 w-5 text-[var(--color-text-secondary)]" />
                  <p className="font-medium text-sm">Full screen view</p>
                </button>
                <button onClick={() => setShowMoreOptions(false)} className="w-full py-3.5 rounded-xl bg-[var(--color-base-600)] font-medium text-sm text-[var(--color-text-secondary)] hover:opacity-90">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Set Logger Sheet ──────────────────────────────────────────────── */}
      {selectedExercise && (
        <SetLoggerSheet
          isOpen={showSetLogger}
          onClose={() => { setShowSetLogger(false); setSelectedExercise(null); setEditingSet(null); }}
          exercise={selectedExercise}
          onLogSet={handleLogSet}
          onUpdateSet={handleUpdateSet}
          editingSet={editingSet ?? undefined}
          units={units}
        />
      )}

      {/* ── Add Exercise Sheet ────────────────────────────────────────────── */}
      <AddExerciseSheet
        isOpen={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onAddExercise={addExercise}
        currentExerciseIds={session?.exercises.map((e) => e.exerciseId) ?? []}
      />

      {/* ── Swap Sheet ────────────────────────────────────────────────────── */}
      {swapTarget && (
        <SwapExerciseSheet
          isOpen={showSwap}
          onClose={() => { setShowSwap(false); setSwapTarget(null); }}
          targetExerciseId={swapTarget.exerciseId}
          targetExerciseName={swapTarget.exerciseName}
          onSwap={handleSwap}
        />
      )}
    </div>
  );
}
