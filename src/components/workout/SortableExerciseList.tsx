'use client';

/**
 * SortableExerciseList (Task 5.9)
 *
 * Wraps exercise cards in a drag-and-drop sortable list powered by @dnd-kit.
 * Supports both mouse and touch (mobile-first).
 *
 * Features:
 * - Drag handle on each card (GripVertical icon)
 * - Optimistic UI: reorders locally before persisting
 * - Persists new order to IndexedDB via reorderExercises callback
 */

import { useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ActiveSessionExercise } from '@/lib/offline';

// =============================================================================
// TYPES
// =============================================================================

export interface SortableExerciseListProps {
  exercises: ActiveSessionExercise[];
  onReorder: (orderedLocalIds: string[]) => Promise<void>;
  renderCard: (
    exercise: ActiveSessionExercise,
    dragHandle: React.ReactNode
  ) => React.ReactNode;
}

interface SortableItemProps {
  exercise: ActiveSessionExercise;
  renderCard: (
    exercise: ActiveSessionExercise,
    dragHandle: React.ReactNode
  ) => React.ReactNode;
}

// =============================================================================
// SORTABLE ITEM
// =============================================================================

/**
 * Individual sortable wrapper for an exercise card.
 * Injects a drag handle that the card can render wherever it chooses.
 */
function SortableItem({ exercise, renderCard }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.localId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative',
  };

  // Drag handle rendered inside the card
  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="
        flex h-8 w-8 items-center justify-center rounded-lg
        text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]
        hover:bg-[var(--color-base-600)] active:bg-[var(--color-base-500)]
        touch-none select-none transition-colors
        cursor-grab active:cursor-grabbing
      "
      aria-label="Drag to reorder exercise"
      // Prevent the card's tap handler from firing on drag handle tap
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="h-5 w-5" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      {renderCard(exercise, dragHandle)}
    </div>
  );
}

// =============================================================================
// SORTABLE EXERCISE LIST
// =============================================================================

/**
 * Drag-and-drop sortable list of exercise cards.
 *
 * Usage:
 * ```tsx
 * <SortableExerciseList
 *   exercises={session.exercises}
 *   onReorder={reorderExercises}
 *   renderCard={(exercise, dragHandle) => (
 *     <ExerciseCard exercise={exercise} dragHandle={dragHandle} ... />
 *   )}
 * />
 * ```
 */
export function SortableExerciseList({
  exercises,
  onReorder,
  renderCard,
}: SortableExerciseListProps) {
  // Local copy of order for optimistic UI during drag
  const [localOrder, setLocalOrder] = useState<string[]>(
    exercises.map((e) => e.localId)
  );

  // Sync local order when exercises prop changes (e.g. on mount or external update)
  // We only re-sync when IDs actually change (add/remove exercise), not on reorder
  const incomingIds = exercises.map((e) => e.localId).join(',');
  const localIds = localOrder.join(',');

  // If the set of exercises changed (addition/removal), reset local order
  if (
    incomingIds !== localIds &&
    !exercises.every((e) => localOrder.includes(e.localId))
  ) {
    setLocalOrder(exercises.map((e) => e.localId));
  }

  // Build a localId → exercise map for sorted rendering
  const exerciseMap = new Map(exercises.map((e) => [e.localId, e]));

  // Sensors: PointerSensor for mouse/stylus, TouchSensor for finger
  // Require a 8px movement before activating to avoid accidental drags on taps
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = localOrder.indexOf(active.id as string);
      const newIndex = localOrder.indexOf(over.id as string);

      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(localOrder, oldIndex, newIndex);

      // Optimistic update
      setLocalOrder(newOrder);

      // Persist to IndexedDB
      try {
        await onReorder(newOrder);
      } catch (err) {
        // Rollback on failure
        console.error('Failed to persist exercise reorder:', err);
        setLocalOrder(localOrder);
      }
    },
    [localOrder, onReorder]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={localOrder} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {localOrder.map((id) => {
            const exercise = exerciseMap.get(id);
            if (!exercise) return null;
            return (
              <SortableItem
                key={id}
                exercise={exercise}
                renderCard={renderCard}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
