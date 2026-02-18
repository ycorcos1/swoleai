'use client';

/**
 * Workout Mode Screen (Task 5.2)
 *
 * The primary workout logging interface for SwoleAI.
 *
 * Layout (per Design Spec 5.3.1):
 * - Top bar: session name, elapsed time, sync pill, overflow menu
 * - Exercise cards list: shows exercises with sets and "last time" summary
 * - Bottom sticky bar: Add Exercise, Timer, End Workout
 *
 * Features:
 * - Renders exercise cards list from IndexedDB (offline-first)
 * - Mobile-first design with large touch targets
 * - Usable on mobile (Acceptance Criteria)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { SyncStatusPill } from '@/components/ui/SyncStatusPill';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useActiveSessionContext } from '@/lib/offline';
import {
  Dumbbell,
  Loader2,
  Plus,
  Timer,
  Square,
  MoreVertical,
  ChevronRight,
  Clock,
  TrendingUp,
  Undo2,
} from 'lucide-react';
import type { ActiveSessionExercise, ActiveSessionSet } from '@/lib/offline';
import { SetLoggerSheet } from '@/components/workout';

// =============================================================================
// TYPES
// =============================================================================

interface ElapsedTimeProps {
  startedAt: Date;
}

interface ExerciseCardProps {
  exercise: ActiveSessionExercise;
  onTapAddSet: () => void;
  onTapEditSet: (set: ActiveSessionSet) => void;
}

interface BottomBarProps {
  onAddExercise: () => void;
  onToggleTimer: () => void;
  onEndWorkout: () => void;
  isTimerActive?: boolean;
}

// =============================================================================
// ELAPSED TIME COMPONENT
// =============================================================================

/**
 * Displays elapsed workout time, updating every second
 */
function ElapsedTime({ startedAt }: ElapsedTimeProps) {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    const updateElapsed = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      if (hours > 0) {
        setElapsed(
          `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      } else {
        setElapsed(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
      <Clock className="h-4 w-4" />
      <span className="tabular-nums font-medium">{elapsed}</span>
    </div>
  );
}

// =============================================================================
// EXERCISE CARD COMPONENT
// =============================================================================

/**
 * Exercise card showing:
 * - Exercise name
 * - Planned sets x rep range (if template-based)
 * - Individual sets as tappable pills (Task 5.4)
 * - Add set button
 */
function ExerciseCard({ exercise, onTapAddSet, onTapEditSet }: ExerciseCardProps) {
  // Calculate sets summary
  const setsCount = exercise.sets.length;
  const completedSets = exercise.sets.filter((s) => s.weight > 0 || s.reps > 0);

  // Get the best set (highest weight)
  const bestSet = useMemo(() => {
    if (completedSets.length === 0) return null;
    return completedSets.reduce((best, current) =>
      current.weight > (best?.weight ?? 0) ? current : best
    , completedSets[0]);
  }, [completedSets]);

  return (
    <div className="glass-card p-4">
      {/* Header row - tappable to add new set */}
      <button
        onClick={onTapAddSet}
        className="w-full text-left transition-all active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Exercise Info */}
          <div className="flex-1 min-w-0">
            {/* Exercise Name */}
            <h3 className="font-semibold text-base truncate">
              {exercise.exerciseName}
            </h3>

            {/* Sets Summary */}
            <div className="flex items-center gap-3 mt-1.5">
              {/* Sets count badge */}
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-base-600)] text-[var(--color-text-secondary)]">
                {setsCount} set{setsCount !== 1 ? 's' : ''}
              </span>

              {/* Best set indicator */}
              {bestSet && (
                <span className="flex items-center gap-1 text-xs text-[var(--color-accent-purple)]">
                  <TrendingUp className="h-3 w-3" />
                  <span className="tabular-nums">
                    {bestSet.weight} × {bestSet.reps}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Add Set Button */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] shadow-sm">
            <Plus className="h-4 w-4 text-white" />
          </div>
        </div>
      </button>

      {/* Individual Sets - Tappable pills for editing (Task 5.4) */}
      {completedSets.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]">
          {exercise.sets.map((set, idx) => (
            <button
              key={set.localId}
              onClick={() => onTapEditSet(set)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-95 transition-all group"
              aria-label={`Edit set ${idx + 1}: ${set.weight} lbs × ${set.reps} reps`}
            >
              {/* Set number badge */}
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]">
                {idx + 1}
              </span>
              {/* Weight × Reps */}
              <span className="text-sm font-medium tabular-nums text-[var(--color-text-primary)]">
                {set.weight}×{set.reps}
              </span>
              {/* Flags */}
              {set.flags?.warmup && (
                <span className="text-[8px] font-medium uppercase px-1 py-0.5 rounded bg-[var(--color-info)]/20 text-[var(--color-info)]">
                  W
                </span>
              )}
              {set.flags?.failure && (
                <span className="text-[8px] font-medium uppercase px-1 py-0.5 rounded bg-[var(--color-error)]/20 text-[var(--color-error)]">
                  F
                </span>
              )}
              {set.flags?.dropset && (
                <span className="text-[8px] font-medium uppercase px-1 py-0.5 rounded bg-[var(--color-warning)]/20 text-[var(--color-warning)]">
                  D
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty state prompt */}
      {setsCount === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] mt-2">
          Tap + to log your first set
        </p>
      )}
    </div>
  );
}

// =============================================================================
// BOTTOM BAR COMPONENT
// =============================================================================

/**
 * Sticky bottom bar with workout actions:
 * - Add Exercise
 * - Timer toggle
 * - End Workout
 */
function BottomBar({
  onAddExercise,
  onToggleTimer,
  onEndWorkout,
  isTimerActive = false,
}: BottomBarProps) {
  return (
    <div 
      className="fixed left-0 right-0 z-40 bg-[var(--color-base-800)]/95 backdrop-blur-md border-t border-[var(--glass-border)]"
      style={{ bottom: 'var(--bottom-nav-height)' }}
    >
      <div className="flex items-center justify-around px-4 py-3">
        {/* Add Exercise */}
        <button
          onClick={onAddExercise}
          className="flex flex-col items-center gap-1 touch-target"
          aria-label="Add exercise"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] shadow-[var(--shadow-glow)]">
            <Plus className="h-6 w-6 text-white" />
          </div>
          <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">
            Add
          </span>
        </button>

        {/* Timer */}
        <button
          onClick={onToggleTimer}
          className="flex flex-col items-center gap-1 touch-target"
          aria-label={isTimerActive ? 'Pause timer' : 'Start timer'}
        >
          <div
            className={`
              flex h-12 w-12 items-center justify-center rounded-xl
              ${isTimerActive 
                ? 'bg-[var(--color-accent-purple)]/20 border border-[var(--color-accent-purple)]' 
                : 'bg-[var(--color-base-600)]'
              }
            `}
          >
            <Timer
              className={`h-6 w-6 ${isTimerActive ? 'text-[var(--color-accent-purple)]' : 'text-[var(--color-text-primary)]'}`}
            />
          </div>
          <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">
            Timer
          </span>
        </button>

        {/* End Workout */}
        <button
          onClick={onEndWorkout}
          className="flex flex-col items-center gap-1 touch-target"
          aria-label="End workout"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-base-600)]">
            <Square className="h-6 w-6 text-[var(--color-error)]" />
          </div>
          <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">
            End
          </span>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

function EmptyExerciseState({ onAddExercise }: { onAddExercise: () => void }) {
  return (
    <GlassCard className="text-center py-12">
      <Dumbbell className="h-16 w-16 mx-auto text-[var(--color-text-muted)] mb-4" />
      <h2 className="text-lg font-semibold mb-2">No exercises yet</h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-xs mx-auto">
        Start building your workout by adding your first exercise
      </p>
      <button onClick={onAddExercise} className="btn-primary">
        <Plus className="h-5 w-5" />
        Add Exercise
      </button>
    </GlassCard>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function WorkoutSessionPage() {
  const params = useParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sessionId = params.id as string; // Will be used for deep-linking in future tasks
  const { session, isLoading, endSession, logSet, updateSet, canUndo, undoLastAction } = useActiveSessionContext();

  const [isEndingWorkout, setIsEndingWorkout] = useState(false);
  const [showEndWorkoutModal, setShowEndWorkoutModal] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  // Undo state (Task 5.5)
  const [isUndoing, setIsUndoing] = useState(false);
  
  // Set Logger sheet state
  const [selectedExercise, setSelectedExercise] = useState<ActiveSessionExercise | null>(null);
  const [showSetLoggerSheet, setShowSetLoggerSheet] = useState(false);
  // Edit mode state (Task 5.4)
  const [editingSet, setEditingSet] = useState<ActiveSessionSet | null>(null);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleAddExercise = useCallback(() => {
    // TODO: Task 5.3+ - Open Add Exercise modal/sheet
    // For now, this is a placeholder
    console.log('Add Exercise tapped - implement in Task 5.3+');
  }, []);

  const handleToggleTimer = useCallback(() => {
    // TODO: Task 5.7 - Implement rest timer
    setIsTimerActive((prev) => !prev);
    console.log('Timer toggled - implement in Task 5.7');
  }, []);

  // Undo handler (Task 5.5)
  const handleUndo = useCallback(async () => {
    if (isUndoing || !canUndo) return;
    
    setIsUndoing(true);
    try {
      const undoneAction = await undoLastAction();
      if (undoneAction) {
        console.log('Undid action:', undoneAction.payload.type);
      }
    } catch (error) {
      console.error('Failed to undo:', error);
    } finally {
      setIsUndoing(false);
    }
  }, [isUndoing, canUndo, undoLastAction]);

  const handleEndWorkout = useCallback(() => {
    if (isEndingWorkout) return;
    setShowEndWorkoutModal(true);
  }, [isEndingWorkout]);

  const handleConfirmEndWorkout = useCallback(async () => {
    setIsEndingWorkout(true);
    try {
      await endSession();
      setShowEndWorkoutModal(false);
      // Navigate to workout summary (Task 5.x) or back to start
      router.replace('/app/workout/start');
    } catch (error) {
      console.error('Failed to end workout:', error);
      setIsEndingWorkout(false);
    }
  }, [endSession, router]);

  // Handler for adding a new set to an exercise
  const handleAddSetTap = useCallback((exercise: ActiveSessionExercise) => {
    setSelectedExercise(exercise);
    setEditingSet(null); // Clear any editing state - we're adding a new set
    setShowSetLoggerSheet(true);
  }, []);

  // Handler for editing an existing set (Task 5.4)
  const handleEditSetTap = useCallback((exercise: ActiveSessionExercise, set: ActiveSessionSet) => {
    setSelectedExercise(exercise);
    setEditingSet(set);
    setShowSetLoggerSheet(true);
  }, []);

  const handleCloseSetLoggerSheet = useCallback(() => {
    setShowSetLoggerSheet(false);
    setSelectedExercise(null);
    setEditingSet(null);
  }, []);

  const handleLogSet = useCallback(
    async (
      exerciseLocalId: string,
      set: Omit<ActiveSessionSet, 'setIndex' | 'loggedAt'>
    ) => {
      await logSet(exerciseLocalId, set);
    },
    [logSet]
  );

  // Handler for updating an existing set (Task 5.4)
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

  // =============================================================================
  // RENDER: LOADING STATE
  // =============================================================================

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent-purple)]" />
      </div>
    );
  }

  // =============================================================================
  // RENDER: NO ACTIVE SESSION
  // =============================================================================

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <Dumbbell className="h-16 w-16 text-[var(--color-text-muted)] mb-4" />
        <h1 className="text-xl font-bold mb-2">No Active Session</h1>
        <p className="text-[var(--color-text-muted)] mb-6">
          Start a workout to see it here.
        </p>
        <button
          onClick={() => router.push('/app/workout/start')}
          className="btn-primary"
        >
          Start Workout
        </button>
      </div>
    );
  }

  // =============================================================================
  // RENDER: WORKOUT MODE
  // =============================================================================

  // Calculate padding: bottom bar (~80px) + bottom nav (72px) = ~152px
  return (
    <div className="flex flex-col min-h-full pb-40">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[var(--color-base-900)]/95 backdrop-blur-md border-b border-[var(--glass-border)]">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Session Info */}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">
              {session.title || 'Workout'}
            </h1>
            <ElapsedTime startedAt={session.startedAt} />
          </div>

          {/* Right: Undo + Sync Pill + Menu */}
          <div className="flex items-center gap-2">
            {/* Undo Button (Task 5.5) */}
            <button
              onClick={handleUndo}
              disabled={!canUndo || isUndoing}
              className={`
                flex h-10 w-10 items-center justify-center rounded-lg transition-all
                ${canUndo && !isUndoing
                  ? 'bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-95'
                  : 'opacity-40 cursor-not-allowed'
                }
              `}
              aria-label="Undo last action"
            >
              <Undo2 
                className={`h-5 w-5 text-[var(--color-text-primary)] ${isUndoing ? 'animate-pulse' : ''}`} 
              />
            </button>
            <SyncStatusPill showCount={false} />
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[var(--color-base-600)] transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="h-5 w-5 text-[var(--color-text-secondary)]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Exercise Cards */}
      <main className="flex-1 px-4 py-4">
        {session.exercises.length === 0 ? (
          <EmptyExerciseState onAddExercise={handleAddExercise} />
        ) : (
          <div className="space-y-3">
            {session.exercises
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((exercise) => (
                <ExerciseCard
                  key={exercise.localId}
                  exercise={exercise}
                  onTapAddSet={() => handleAddSetTap(exercise)}
                  onTapEditSet={(set) => handleEditSetTap(exercise, set)}
                />
              ))}
          </div>
        )}
      </main>

      {/* Bottom Bar */}
      <BottomBar
        onAddExercise={handleAddExercise}
        onToggleTimer={handleToggleTimer}
        onEndWorkout={handleEndWorkout}
        isTimerActive={isTimerActive}
      />

      {/* End Workout Confirmation Modal */}
      <ConfirmModal
        isOpen={showEndWorkoutModal}
        onClose={() => setShowEndWorkoutModal(false)}
        onConfirm={handleConfirmEndWorkout}
        title="End Workout?"
        message="Are you sure you want to finish this workout session?"
        confirmLabel="End Workout"
        cancelLabel="Keep Going"
        variant="danger"
        isLoading={isEndingWorkout}
      />

      {/* Set Logger Sheet (Task 5.3 + 5.4) */}
      {selectedExercise && (
        <SetLoggerSheet
          isOpen={showSetLoggerSheet}
          onClose={handleCloseSetLoggerSheet}
          exercise={selectedExercise}
          onLogSet={handleLogSet}
          onUpdateSet={handleUpdateSet}
          editingSet={editingSet ?? undefined}
        />
      )}
    </div>
  );
}
