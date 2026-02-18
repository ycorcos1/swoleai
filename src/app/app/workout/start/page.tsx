'use client';

/**
 * Workout Start Screen (Task 5.1)
 *
 * Entry point for starting a workout session.
 * Shows:
 * - Today's scheduled workout (from active split)
 * - All available templates
 * - Freestyle workout option
 *
 * Starting a workout:
 * 1. Saves session to IndexedDB (offline-first)
 * 2. Calls server API to create session
 * 3. Routes to Workout Mode (/app/workout/session/:id)
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { useActiveSessionContext } from '@/lib/offline';
import {
  Play,
  CalendarCheck,
  Dumbbell,
  Sparkles,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface Template {
  id: string;
  name: string;
  mode: 'FIXED' | 'SLOT';
  estimatedMinutes: number | null;
  blocks?: { id: string; exercise: { name: string } }[];
  slots?: { id: string; muscleGroup: string }[];
}

interface ScheduleDay {
  id: string;
  weekday: string;
  isRest: boolean;
  label: string | null;
  workoutDayTemplate: Template | null;
}

interface Split {
  id: string;
  name: string;
  isActive: boolean;
  scheduleDays: ScheduleDay[];
}

interface TodaySchedule {
  split: Split | null;
  scheduleDay: ScheduleDay | null;
  template: Template | null;
}

// Weekday enum mapping
const WEEKDAYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

// =============================================================================
// HOOKS
// =============================================================================

function useTodaySchedule() {
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule>({
    split: null,
    scheduleDay: null,
    template: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTodaySchedule() {
      try {
        // Get the active split
        const splitsRes = await fetch('/api/splits?activeOnly=true');
        if (!splitsRes.ok) throw new Error('Failed to fetch splits');
        const { splits } = await splitsRes.json();

        if (!splits || splits.length === 0) {
          setTodaySchedule({ split: null, scheduleDay: null, template: null });
          setIsLoading(false);
          return;
        }

        const activeSplit: Split = splits[0];

        // Get today's weekday
        const todayWeekday = WEEKDAYS[new Date().getDay()];

        // Find today's schedule day
        const todayScheduleDay = activeSplit.scheduleDays.find(
          (day: ScheduleDay) => day.weekday === todayWeekday
        );

        setTodaySchedule({
          split: activeSplit,
          scheduleDay: todayScheduleDay || null,
          template: todayScheduleDay?.workoutDayTemplate || null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schedule');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTodaySchedule();
  }, []);

  return { todaySchedule, isLoading, error };
}

function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/templates');
        if (!res.ok) throw new Error('Failed to fetch templates');
        const { templates } = await res.json();
        setTemplates(templates || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTemplates();
  }, []);

  return { templates, isLoading, error };
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface WorkoutOptionCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick: () => void;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary';
  badge?: string;
}

function WorkoutOptionCard({
  title,
  subtitle,
  icon,
  onClick,
  isLoading,
  variant = 'secondary',
  badge,
}: WorkoutOptionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        w-full text-left transition-all active:scale-[0.98]
        ${variant === 'primary' ? 'glass-card border-[var(--color-accent-purple)]/30' : 'glass-card'}
        p-4 flex items-center gap-4
        ${isLoading ? 'opacity-60 cursor-wait' : 'hover:brightness-105'}
      `}
    >
      <div
        className={`
          flex h-12 w-12 items-center justify-center rounded-xl
          ${variant === 'primary' 
            ? 'bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-blue)]' 
            : 'bg-[var(--color-base-600)]'
          }
        `}
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        ) : (
          icon
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{title}</h3>
          {badge && (
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)]">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-[var(--color-text-muted)] truncate">{subtitle}</p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-[var(--color-text-muted)] flex-shrink-0" />
    </button>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function WorkoutStartPage() {
  const router = useRouter();
  const { session: activeSession, isLoading: isSessionLoading, startSession } = useActiveSessionContext();
  const { todaySchedule, isLoading: isScheduleLoading } = useTodaySchedule();
  const { templates, isLoading: isTemplatesLoading } = useTemplates();
  
  const [startingWorkoutId, setStartingWorkoutId] = useState<string | null>(null);

  // If there's already an active session, redirect to it
  useEffect(() => {
    if (!isSessionLoading && activeSession) {
      const sessionId = activeSession.serverSessionId || 'current';
      router.replace(`/app/workout/session/${sessionId}`);
    }
  }, [isSessionLoading, activeSession, router]);

  // Start a workout with a specific template
  const handleStartWorkout = useCallback(
    async (templateId?: string, splitId?: string, title?: string) => {
      const workoutKey = templateId || 'freestyle';
      setStartingWorkoutId(workoutKey);

      try {
        // 1. Start session locally (IndexedDB) and queue sync
        await startSession({
          templateId,
          splitId,
          title,
        });

        // 2. Call server API to create session
        const res = await fetch('/api/workouts/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId, splitId, title }),
        });

        if (!res.ok) {
          // Even if server fails, we have local session - continue
          console.warn('Server session creation failed, continuing with local session');
        }

        // 3. Route to Workout Mode
        // Use 'current' as ID since we're using local session
        router.push('/app/workout/session/current');
      } catch (err) {
        console.error('Failed to start workout:', err);
        setStartingWorkoutId(null);
      }
    },
    [startSession, router]
  );

  // Start today's scheduled workout
  const handleStartTodayWorkout = useCallback(() => {
    if (todaySchedule.template && todaySchedule.split) {
      handleStartWorkout(
        todaySchedule.template.id,
        todaySchedule.split.id,
        todaySchedule.template.name
      );
    }
  }, [todaySchedule, handleStartWorkout]);

  // Start a freestyle workout (no template)
  // For testing Task 5.3, we add sample exercises so the Set Logger can be tested
  const handleStartFreestyle = useCallback(async () => {
    const workoutKey = 'freestyle';
    setStartingWorkoutId(workoutKey);

    try {
      // Start session with sample exercises for testing Set Logger
      await startSession({
        title: 'Freestyle Workout',
        initialExercises: [
          {
            localId: `ex_${Date.now()}_1`,
            exerciseId: 'sample-bench-press',
            exerciseName: 'Bench Press',
          },
          {
            localId: `ex_${Date.now()}_2`,
            exerciseId: 'sample-squat',
            exerciseName: 'Squat',
          },
          {
            localId: `ex_${Date.now()}_3`,
            exerciseId: 'sample-deadlift',
            exerciseName: 'Deadlift',
          },
        ],
      });

      // Try server API (may fail if DB is unreachable)
      try {
        await fetch('/api/workouts/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Freestyle Workout' }),
        });
      } catch {
        console.warn('Server session creation failed, continuing with local session');
      }

      router.push('/app/workout/session/current');
    } catch (err) {
      console.error('Failed to start workout:', err);
      setStartingWorkoutId(null);
    }
  }, [startSession, router]);

  // Start a workout with a specific template
  const handleStartTemplate = useCallback(
    (template: Template) => {
      handleStartWorkout(
        template.id,
        todaySchedule.split?.id,
        template.name
      );
    },
    [todaySchedule.split, handleStartWorkout]
  );

  // Loading state
  if (isSessionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent-purple)]" />
      </div>
    );
  }

  const isLoading = isScheduleLoading || isTemplatesLoading;
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Filter templates to exclude today's scheduled one (shown separately)
  const otherTemplates = templates.filter(
    (t) => t.id !== todaySchedule.template?.id
  );

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Start Workout</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {todayLabel} — Choose how you want to train
        </p>
      </header>

      {/* Today's Scheduled Workout */}
      {!isLoading && todaySchedule.template && !todaySchedule.scheduleDay?.isRest && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Today&apos;s Scheduled
          </h2>
          <WorkoutOptionCard
            title={todaySchedule.template.name}
            subtitle={getTemplateSubtitle(todaySchedule.template)}
            icon={<Dumbbell className="h-6 w-6 text-white" />}
            onClick={handleStartTodayWorkout}
            isLoading={startingWorkoutId === todaySchedule.template.id}
            variant="primary"
            badge="Scheduled"
          />
        </section>
      )}

      {/* Rest Day Notice */}
      {!isLoading && todaySchedule.scheduleDay?.isRest && (
        <GlassCard className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-success)]/20">
              <CalendarCheck className="h-5 w-5 text-[var(--color-success)]" />
            </div>
            <div>
              <p className="font-medium">Rest Day</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Take it easy! You can still start a workout below.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* No Split Notice */}
      {!isLoading && !todaySchedule.split && (
        <GlassCard className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-warning)]/20">
              <CalendarCheck className="h-5 w-5 text-[var(--color-warning)]" />
            </div>
            <div>
              <p className="font-medium">No Active Split</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Set up a split in Routine to get scheduled workouts.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Freestyle Option */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Quick Start
        </h2>
        <WorkoutOptionCard
          title="Freestyle Workout"
          subtitle="Start empty and add exercises as you go"
          icon={<Play className="h-6 w-6 text-[var(--color-text-primary)]" />}
          onClick={handleStartFreestyle}
          isLoading={startingWorkoutId === 'freestyle'}
        />
      </section>

      {/* Templates List */}
      {!isLoading && otherTemplates.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Your Templates
          </h2>
          <div className="space-y-3">
            {otherTemplates.map((template) => (
              <WorkoutOptionCard
                key={template.id}
                title={template.name}
                subtitle={getTemplateSubtitle(template)}
                icon={<Dumbbell className="h-6 w-6 text-[var(--color-text-primary)]" />}
                onClick={() => handleStartTemplate(template)}
                isLoading={startingWorkoutId === template.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty Templates State */}
      {!isLoading && templates.length === 0 && (
        <GlassCard className="text-center py-8">
          <Dumbbell className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-3" />
          <p className="font-medium mb-1">No templates yet</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Create templates in Routine to save your workouts.
          </p>
        </GlassCard>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[var(--color-base-600)]" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-[var(--color-base-600)] rounded mb-2" />
                  <div className="h-3 w-24 bg-[var(--color-base-600)] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getTemplateSubtitle(template: Template): string {
  const parts: string[] = [];

  if (template.estimatedMinutes) {
    parts.push(`~${template.estimatedMinutes} min`);
  }

  if (template.mode === 'FIXED' && template.blocks?.length) {
    parts.push(`${template.blocks.length} exercises`);
  } else if (template.mode === 'SLOT' && template.slots?.length) {
    const muscleGroups = template.slots.map((s) => s.muscleGroup).slice(0, 3);
    parts.push(muscleGroups.join(', '));
    if (template.slots.length > 3) {
      parts.push(`+${template.slots.length - 3} more`);
    }
  }

  return parts.join(' • ') || 'Template';
}
