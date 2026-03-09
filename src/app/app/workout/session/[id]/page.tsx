'use client';

/**
 * Workout Mode Screen (Task 5.2)
 *
 * The primary workout logging interface for SwoleAI.
 *
 * Layout (per Design Spec 5.3.1):
 * - Top bar: session name, elapsed time, overflow menu
 * - Exercise cards list: shows exercises with sets and "last time" summary
 * - Bottom sticky bar: Add Exercise, End Workout
 *
 * Features:
 * - Renders exercise cards list from IndexedDB (offline-first)
 * - Mobile-first design with large touch targets
 * - Usable on mobile (Acceptance Criteria)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useActiveSessionContext } from '@/lib/offline';
import {
  Dumbbell,
  Loader2,
  Plus,
  Square,
  MoreVertical,
  TrendingUp,
  Undo2,
  ArrowLeftRight,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { ActiveSessionExercise, ActiveSessionSet } from '@/lib/offline';
import { SetLoggerSheet, AddExerciseSheet, SortableExerciseList, SwapExerciseSheet } from '@/components/workout';

// =============================================================================
// TYPES
// =============================================================================

interface ExerciseCardProps {
  exercise: ActiveSessionExercise;
  onTapAddSet: () => void;
  onTapEditSet: (set: ActiveSessionSet) => void;
  /** Drag handle node injected by SortableExerciseList (Task 5.9) */
  dragHandle?: React.ReactNode;
  /** Swap button handler (Task 7.2) */
  onTapSwap?: () => void;
  /** Joint stress flags for this exercise (H.1) */
  jointStressFlags?: Record<string, string>;
  /** Called when user dismisses the stress badge for this exercise (H.1) */
  onDismissStressBadge?: () => void;
}

interface BottomBarProps {
  onAddExercise: () => void;
  onEndWorkout: () => void;
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
function ExerciseCard({ exercise, onTapAddSet, onTapEditSet, dragHandle, onTapSwap, jointStressFlags, onDismissStressBadge }: ExerciseCardProps) {
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

  // Build stress badge labels (H.1)
  const stressLabels = useMemo(() => {
    if (!jointStressFlags) return [];
    return Object.entries(jointStressFlags)
      .filter(([, level]) => level === 'high' || level === 'moderate' || level === 'medium')
      .map(([joint]) => joint.replace(/_/g, ' '));
  }, [jointStressFlags]);

  const hasStress = stressLabels.length > 0;

  return (
    <div className="glass-card p-4">
      {/* Header row */}
      <div className="flex items-start gap-2">
        {/* Drag handle (Task 5.9) — rendered left of card content */}
        {dragHandle && (
          <div className="flex items-center pt-0.5 shrink-0">
            {dragHandle}
          </div>
        )}

        {/* Tappable area — opens set logger */}
        <button
          onClick={onTapAddSet}
          className="flex-1 min-w-0 text-left transition-all active:scale-[0.99]"
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

              {/* Right-side action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Swap button (Task 7.2) */}
                {onTapSwap && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onTapSwap(); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-95 transition-all"
                    aria-label={`Swap ${exercise.exerciseName}`}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  </button>
                )}

                {/* Add Set Button */}
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] shadow-sm">
                  <Plus className="h-4 w-4 text-white" />
                </div>
              </div>
          </div>
        </button>
      </div>

      {/* Joint Stress Badge (H.1) — non-blocking inline warning */}
      {hasStress && onDismissStressBadge && (
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
                className="text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
              >
                Swap?
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDismissStressBadge(); }}
              className="flex h-5 w-5 items-center justify-center rounded text-amber-400/60 hover:text-amber-300 transition-colors"
              aria-label="Dismiss stress warning"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

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
              {/* Flags (Task 5.6) */}
              {set.flags?.warmup && (
                <span className="text-[8px] font-medium uppercase px-1 py-0.5 rounded bg-[var(--color-info)]/20 text-[var(--color-info)]">
                  W
                </span>
              )}
              {set.flags?.backoff && (
                <span className="text-[8px] font-medium uppercase px-1 py-0.5 rounded bg-[var(--color-accent-blue)]/20 text-[var(--color-accent-blue)]">
                  B
                </span>
              )}
              {set.flags?.dropset && (
                <span className="text-[8px] font-medium uppercase px-1 py-0.5 rounded bg-[var(--color-warning)]/20 text-[var(--color-warning)]">
                  D
                </span>
              )}
              {set.flags?.failure && (
                <span className="text-[8px] font-medium uppercase px-1 py-0.5 rounded bg-[var(--color-error)]/20 text-[var(--color-error)]">
                  F
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
 * - End Workout
 */
function BottomBar({
  onAddExercise,
  onEndWorkout,
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
  const sessionId = params.id as string;
  const { session, isLoading, endSession, addExercise, updateExercise, logSet, updateSet, reorderExercises, canUndo, undoLastAction, abandonSession } = useActiveSessionContext();

  // Server-side session state (for past/completed sessions not in IndexedDB)
  const [serverSession, setServerSession] = useState<{
    id: string;
    title: string | null;
    status: string;
    exercises: {
      id: string;
      orderIndex: number;
      exercise: { id: string; name: string };
      sets: { id: string; setIndex: number; reps: number | null; weightKg: number | null; rpe: number | null; notes: string | null }[];
    }[];
  } | null>(null);
  const [serverLoading, setServerLoading] = useState(false);

  const [isEndingWorkout, setIsEndingWorkout] = useState(false);
  const [showEndWorkoutModal, setShowEndWorkoutModal] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [units, setUnits] = useState<'IMPERIAL' | 'METRIC'>('IMPERIAL');

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.profile?.units) setUnits(data.profile.units as 'IMPERIAL' | 'METRIC'); })
      .catch(() => {});
  }, []);

  // When IndexedDB loading finishes and there's no active session, load from server
  useEffect(() => {
    if (isLoading || session) return;
    setServerLoading(true);
    fetch(`/api/workouts/${sessionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setServerSession(data?.session ?? null))
      .catch(() => {})
      .finally(() => setServerLoading(false));
  }, [isLoading, session, sessionId]);

  const [stressFlagsMap, setStressFlagsMap] = useState<Record<string, Record<string, string>>>({});
  const [dismissedStressBadges, setDismissedStressBadges] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/exercises')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.exercises) return;
        const map: Record<string, Record<string, string>> = {};
        for (const ex of data.exercises) {
          if (ex.jointStressFlags && Object.keys(ex.jointStressFlags).length > 0) {
            map[ex.id] = ex.jointStressFlags as Record<string, string>;
          }
        }
        setStressFlagsMap(map);
      })
      .catch(() => {});
  }, []);

  const [isUndoing, setIsUndoing] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ActiveSessionExercise | null>(null);
  const [showSetLoggerSheet, setShowSetLoggerSheet] = useState(false);
  const [editingSet, setEditingSet] = useState<ActiveSessionSet | null>(null);
  const [showAddExerciseSheet, setShowAddExerciseSheet] = useState(false);
  const [swapTargetExercise, setSwapTargetExercise] = useState<ActiveSessionExercise | null>(null);
  const [showSwapSheet, setShowSwapSheet] = useState(false)

  // =============================================================================
  // HANDLERS
  // =============================================================================

  // Handler to open the Add Exercise sheet (Task 5.8)
  const handleAddExercise = useCallback(() => {
    setShowAddExerciseSheet(true);
  }, []);

  // Handler to open the Swap sheet (Task 7.2)
  const handleOpenSwap = useCallback((exercise: ActiveSessionExercise) => {
    setSwapTargetExercise(exercise);
    setShowSwapSheet(true);
  }, []);

  // Handler to perform the swap (Task 7.2)
  const handleSwapExercise = useCallback(
    async (newExerciseId: string, newExerciseName: string) => {
      if (!swapTargetExercise) return;
      await updateExercise(swapTargetExercise.localId, {
        exerciseId: newExerciseId,
        exerciseName: newExerciseName,
      });
    },
    [swapTargetExercise, updateExercise]
  );

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

  // Discard session handlers (Task C.3)
  const handleDiscardTap = useCallback(() => {
    setShowMoreOptions(false);
    setTimeout(() => setShowDiscardConfirm(true), 150);
  }, []);

  const handleConfirmDiscard = useCallback(async () => {
    if (isDiscarding) return;
    setIsDiscarding(true);
    try {
      await abandonSession();
      setShowDiscardConfirm(false);
      router.replace('/app/workout/start');
    } catch (error) {
      console.error('Failed to discard session:', error);
      setIsDiscarding(false);
    }
  }, [isDiscarding, abandonSession, router]);

  const handleConfirmEndWorkout = useCallback(async () => {
    setIsEndingWorkout(true);
    try {
      await endSession();
      setShowEndWorkoutModal(false);
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

  if (isLoading || serverLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent-purple)]" />
      </div>
    );
  }

  // Past/completed session loaded from server — read/edit view
  if (!session && serverSession) {
    const serverExercises = [...serverSession.exercises].sort((a, b) => a.orderIndex - b.orderIndex);
    return (
      <div className="flex flex-col min-h-full pb-24">
        <header className="sticky top-0 z-30 bg-[var(--color-base-900)]/95 backdrop-blur-md border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--color-base-600)] transition-colors">
              <X className="h-5 w-5 text-[var(--color-text-secondary)]" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">{serverSession.title || 'Workout'}</h1>
              <p className="text-xs text-emerald-400 font-medium">Completed</p>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-4 space-y-3">
          {serverExercises.length === 0 ? (
            <GlassCard className="text-center py-12">
              <Dumbbell className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-3" />
              <p className="text-sm text-[var(--color-text-muted)]">No exercises logged for this session.</p>
            </GlassCard>
          ) : (
            serverExercises.map((ex) => (
              <div key={ex.id} className="glass-card p-4">
                <p className="font-semibold">{ex.exercise.name}</p>
                {ex.sets.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">No sets logged</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ex.sets.map((s, idx) => (
                      <span key={s.id} className="px-3 py-1.5 rounded-lg bg-[var(--color-base-600)] text-sm font-medium tabular-nums">
                        <span className="text-[10px] text-[var(--color-text-muted)] mr-1">{idx + 1}</span>
                        {s.weightKg ?? 0}×{s.reps ?? 0}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </main>
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
          </div>

          {/* Right: Undo + Menu */}
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
            <button
              onClick={() => setShowMoreOptions(true)}
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
          /* Task 5.9 — Drag/drop reorder */
          <SortableExerciseList
            exercises={[...session.exercises].sort((a, b) => a.orderIndex - b.orderIndex)}
            onReorder={reorderExercises}
            renderCard={(exercise, dragHandle) => (
              <ExerciseCard
                exercise={exercise}
                onTapAddSet={() => handleAddSetTap(exercise)}
                onTapEditSet={(set) => handleEditSetTap(exercise, set)}
                onTapSwap={() => handleOpenSwap(exercise)}
                dragHandle={dragHandle}
                jointStressFlags={
                  !dismissedStressBadges.has(exercise.localId)
                    ? stressFlagsMap[exercise.exerciseId]
                    : undefined
                }
                onDismissStressBadge={() =>
                  setDismissedStressBadges((prev) => new Set([...prev, exercise.localId]))
                }
              />
            )}
          />
        )}
      </main>

      {/* Bottom Bar */}
      <BottomBar
        onAddExercise={handleAddExercise}
        onEndWorkout={handleEndWorkout}
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
          units={units}
        />
      )}

      {/* Add Exercise Sheet (Task 5.8) */}
      <AddExerciseSheet
        isOpen={showAddExerciseSheet}
        onClose={() => setShowAddExerciseSheet(false)}
        onAddExercise={addExercise}
        currentExerciseIds={session?.exercises.map((e) => e.exerciseId) ?? []}
      />

      {/* Swap Exercise Sheet (Task 7.2) */}
      {swapTargetExercise && (
        <SwapExerciseSheet
          isOpen={showSwapSheet}
          onClose={() => { setShowSwapSheet(false); setSwapTargetExercise(null); }}
          targetExerciseId={swapTargetExercise.exerciseId}
          targetExerciseName={swapTargetExercise.exerciseName}
          onSwap={handleSwapExercise}
        />
      )}

      {/* More Options Sheet (Task C.3) */}
      {showMoreOptions && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMoreOptions(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-[70] animate-in slide-in-from-bottom duration-300">
            <div className="bg-[var(--color-base-800)] border-t border-[var(--glass-border)] rounded-t-3xl shadow-2xl safe-area-bottom px-4 pt-4 pb-8">
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-[var(--color-base-500)]" />
              </div>
              <h2 className="text-base font-semibold mb-4 px-2">Session Options</h2>
              <div className="space-y-2">
                {/* Discard session */}
                <button
                  onClick={handleDiscardTap}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--color-error)]/10 hover:bg-[var(--color-error)]/20 active:scale-[0.98] transition-all text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-error)]/20 shrink-0">
                    <Square className="h-5 w-5 text-[var(--color-error)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-error)]">Discard session</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Delete this workout. This cannot be undone.
                    </p>
                  </div>
                </button>
                {/* Cancel */}
                <button
                  onClick={() => setShowMoreOptions(false)}
                  className="w-full py-3.5 rounded-xl bg-[var(--color-base-600)] font-medium text-sm text-[var(--color-text-secondary)] hover:opacity-90 transition-opacity"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Discard Confirm Modal (Task C.3) */}
      <ConfirmModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleConfirmDiscard}
        title="Discard workout?"
        message="This workout will be permanently deleted. This cannot be undone."
        confirmLabel="Discard"
        cancelLabel="Keep going"
        variant="danger"
        isLoading={isDiscarding}
      />
    </div>
  );
}
