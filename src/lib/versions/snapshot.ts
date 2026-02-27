/**
 * Task 8.1 — Routine Snapshot Builder
 *
 * Serializes the user's current active routine into a self-contained
 * RoutineSnapshot that can be stored in routine_versions.snapshot_json
 * and reloaded later for rollback or comparison.
 *
 * Snapshot captures:
 *   - Active split identity (id, name)
 *   - Schedule days (weekday → templateId mapping)
 *   - Full template data (blocks with exercise names, slots)
 *   - Favorite exercise IDs
 */

import { prisma } from '@/lib/db';

// =============================================================================
// Snapshot Types
// =============================================================================

export interface SnapshotBlock {
  orderIndex: number;
  exerciseId: string;
  exerciseName: string;
  setsPlanned: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  progressionEngine: string | null;
  intensityTarget: unknown;
  notes: string | null;
}

export interface SnapshotSlot {
  orderIndex: number;
  muscleGroup: string;
  exerciseCount: number;
  patternConstraints: unknown;
  equipmentConstraints: unknown;
  defaultSets: number;
  defaultRepMin: number;
  defaultRepMax: number;
  notes: string | null;
}

export interface SnapshotTemplate {
  id: string;
  name: string;
  mode: string;
  defaultProgressionEngine: string | null;
  notes: string | null;
  estimatedMinutes: number | null;
  blocks: SnapshotBlock[];
  slots: SnapshotSlot[];
}

export interface SnapshotScheduleDay {
  weekday: string;
  templateId: string | null;
  isRest: boolean;
  label: string | null;
}

export interface RoutineSnapshot {
  capturedAt: string;
  splitId: string | null;
  splitName: string | null;
  scheduleDays: SnapshotScheduleDay[];
  templates: SnapshotTemplate[];
  favoriteIds: string[];
}

// =============================================================================
// Builder
// =============================================================================

/**
 * Build a complete snapshot of the user's current active routine.
 *
 * If the user has no active split, the snapshot will have null split fields
 * and empty scheduleDays/templates but will still capture favoriteIds.
 */
export async function buildRoutineSnapshot(
  userId: string
): Promise<RoutineSnapshot> {
  // 1. Fetch the active split with all schedule days
  const activeSplit = await prisma.split.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      scheduleDays: {
        orderBy: { weekday: 'asc' },
        select: {
          weekday: true,
          workoutDayTemplateId: true,
          isRest: true,
          label: true,
        },
      },
    },
  });

  // 2. Map schedule days and collect referenced template IDs
  const scheduleDays: SnapshotScheduleDay[] = [];
  const templateIds = new Set<string>();

  if (activeSplit) {
    for (const day of activeSplit.scheduleDays) {
      scheduleDays.push({
        weekday: day.weekday,
        templateId: day.workoutDayTemplateId,
        isRest: day.isRest,
        label: day.label,
      });
      if (day.workoutDayTemplateId) {
        templateIds.add(day.workoutDayTemplateId);
      }
    }
  }

  // 3. Fetch all referenced templates with full block/slot data
  const templates: SnapshotTemplate[] = [];

  if (templateIds.size > 0) {
    const dbTemplates = await prisma.workoutDayTemplate.findMany({
      where: { id: { in: [...templateIds] }, userId },
      select: {
        id: true,
        name: true,
        mode: true,
        defaultProgressionEngine: true,
        notes: true,
        estimatedMinutes: true,
        blocks: {
          orderBy: { orderIndex: 'asc' },
          select: {
            orderIndex: true,
            exerciseId: true,
            exercise: { select: { name: true } },
            setsPlanned: true,
            repMin: true,
            repMax: true,
            restSeconds: true,
            progressionEngine: true,
            intensityTarget: true,
            notes: true,
          },
        },
        slots: {
          orderBy: { orderIndex: 'asc' },
          select: {
            orderIndex: true,
            muscleGroup: true,
            exerciseCount: true,
            patternConstraints: true,
            equipmentConstraints: true,
            defaultSets: true,
            defaultRepMin: true,
            defaultRepMax: true,
            notes: true,
          },
        },
      },
    });

    for (const t of dbTemplates) {
      templates.push({
        id: t.id,
        name: t.name,
        mode: t.mode,
        defaultProgressionEngine: t.defaultProgressionEngine,
        notes: t.notes,
        estimatedMinutes: t.estimatedMinutes,
        blocks: t.blocks.map((b) => ({
          orderIndex: b.orderIndex,
          exerciseId: b.exerciseId,
          exerciseName: b.exercise.name,
          setsPlanned: b.setsPlanned,
          repMin: b.repMin,
          repMax: b.repMax,
          restSeconds: b.restSeconds,
          progressionEngine: b.progressionEngine,
          intensityTarget: b.intensityTarget,
          notes: b.notes,
        })),
        slots: t.slots.map((s) => ({
          orderIndex: s.orderIndex,
          muscleGroup: s.muscleGroup,
          exerciseCount: s.exerciseCount,
          patternConstraints: s.patternConstraints,
          equipmentConstraints: s.equipmentConstraints,
          defaultSets: s.defaultSets,
          defaultRepMin: s.defaultRepMin,
          defaultRepMax: s.defaultRepMax,
          notes: s.notes,
        })),
      });
    }
  }

  // 4. Fetch user's current favorite exercise IDs
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    select: { exerciseId: true },
  });

  return {
    capturedAt: new Date().toISOString(),
    splitId: activeSplit?.id ?? null,
    splitName: activeSplit?.name ?? null,
    scheduleDays,
    templates,
    favoriteIds: favorites.map((f) => f.exerciseId),
  };
}
