/**
 * Task 8.2 — Patch Op Format + Application + Version Creation
 *
 * Patch ops describe targeted mutations to a user's routine (split schedule,
 * template blocks, favorites). They are applied to the actual DB records,
 * after which a new RoutineVersion snapshot is taken.
 *
 * Patch op format is inspired by JSON Patch (RFC 6902) but domain-specific
 * for SwoleAI's data model to keep application logic simple and auditable.
 */

import { Prisma, ProgressionEngine } from '@prisma/client';
import { prisma } from '@/lib/db';
import { buildRoutineSnapshot } from './snapshot';

// =============================================================================
// Patch Op Types
// =============================================================================

export type PatchOp =
  /** Swap the exercise in an existing FIXED template block */
  | {
      op: 'replace_block_exercise';
      templateId: string;
      blockOrderIndex: number;
      exerciseId: string;
    }
  /** Update scalar fields of an existing FIXED template block */
  | {
      op: 'update_block';
      templateId: string;
      blockOrderIndex: number;
      changes: {
        setsPlanned?: number;
        repMin?: number;
        repMax?: number;
        restSeconds?: number;
        progressionEngine?: string | null;
        notes?: string | null;
      };
    }
  /** Append a new block to a FIXED template */
  | {
      op: 'add_block';
      templateId: string;
      block: {
        exerciseId: string;
        setsPlanned: number;
        repMin: number;
        repMax: number;
        restSeconds: number;
        progressionEngine?: string | null;
        notes?: string | null;
      };
    }
  /** Remove a block from a FIXED template by order index */
  | {
      op: 'remove_block';
      templateId: string;
      blockOrderIndex: number;
    }
  /** Update a split schedule day's template assignment */
  | {
      op: 'set_schedule_day';
      splitId: string;
      weekday: string;
      templateId: string | null;
      isRest: boolean;
    }
  /** Add an exercise to the user's favorites (idempotent) */
  | { op: 'add_favorite'; exerciseId: string }
  /** Remove an exercise from the user's favorites */
  | { op: 'remove_favorite'; exerciseId: string };

// Prisma transaction client type
type PrismaTx = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// =============================================================================
// Apply Patch Ops
// =============================================================================

/**
 * Apply an array of patch ops to the database.
 * All ops run inside a single transaction provided by the caller.
 * Throws if any op references a record that cannot be found.
 */
export async function applyPatchOps(
  userId: string,
  ops: PatchOp[],
  tx: PrismaTx
): Promise<void> {
  for (const op of ops) {
    switch (op.op) {
      case 'replace_block_exercise': {
        // Find the block by templateId + orderIndex scoped to user's template
        const block = await tx.workoutDayBlock.findFirst({
          where: {
            orderIndex: op.blockOrderIndex,
            template: { id: op.templateId, userId },
          },
          select: { id: true },
        });
        if (!block) {
          throw new Error(
            `Block at orderIndex ${op.blockOrderIndex} in template ${op.templateId} not found`
          );
        }
        await tx.workoutDayBlock.update({
          where: { id: block.id },
          data: { exerciseId: op.exerciseId },
        });
        break;
      }

      case 'update_block': {
        const block = await tx.workoutDayBlock.findFirst({
          where: {
            orderIndex: op.blockOrderIndex,
            template: { id: op.templateId, userId },
          },
          select: { id: true },
        });
        if (!block) {
          throw new Error(
            `Block at orderIndex ${op.blockOrderIndex} in template ${op.templateId} not found`
          );
        }
        const { progressionEngine, ...rest } = op.changes;
        await tx.workoutDayBlock.update({
          where: { id: block.id },
          data: {
            ...rest,
            ...(progressionEngine !== undefined
              ? { progressionEngine: progressionEngine as ProgressionEngine | null }
              : {}),
          },
        });
        break;
      }

      case 'add_block': {
        // Verify template belongs to user
        const template = await tx.workoutDayTemplate.findFirst({
          where: { id: op.templateId, userId },
          select: { id: true, _count: { select: { blocks: true } } },
        });
        if (!template) {
          throw new Error(`Template ${op.templateId} not found`);
        }
        const nextIndex = template._count.blocks;
        await tx.workoutDayBlock.create({
          data: {
            templateId: op.templateId,
            orderIndex: nextIndex,
            exerciseId: op.block.exerciseId,
            setsPlanned: op.block.setsPlanned,
            repMin: op.block.repMin,
            repMax: op.block.repMax,
            restSeconds: op.block.restSeconds,
            progressionEngine:
              (op.block.progressionEngine as ProgressionEngine | null) ?? null,
            notes: op.block.notes ?? null,
            intensityTarget: Prisma.JsonNull,
          },
        });
        break;
      }

      case 'remove_block': {
        const block = await tx.workoutDayBlock.findFirst({
          where: {
            orderIndex: op.blockOrderIndex,
            template: { id: op.templateId, userId },
          },
          select: { id: true },
        });
        if (!block) {
          throw new Error(
            `Block at orderIndex ${op.blockOrderIndex} in template ${op.templateId} not found`
          );
        }
        await tx.workoutDayBlock.delete({ where: { id: block.id } });
        // Compact order indices for remaining blocks
        await tx.$executeRaw`
          WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY order_index) - 1 AS new_idx
            FROM workout_day_blocks
            WHERE template_id = ${op.templateId}
          )
          UPDATE workout_day_blocks
          SET order_index = ranked.new_idx
          FROM ranked
          WHERE workout_day_blocks.id = ranked.id
        `;
        break;
      }

      case 'set_schedule_day': {
        const scheduleDay = await tx.splitScheduleDay.findFirst({
          where: {
            weekday: op.weekday as never,
            split: { id: op.splitId, userId },
          },
          select: { id: true },
        });
        if (!scheduleDay) {
          throw new Error(
            `Schedule day ${op.weekday} in split ${op.splitId} not found`
          );
        }
        await tx.splitScheduleDay.update({
          where: { id: scheduleDay.id },
          data: {
            workoutDayTemplateId: op.templateId,
            isRest: op.isRest,
          },
        });
        break;
      }

      case 'add_favorite': {
        await tx.favorite.upsert({
          where: {
            userId_exerciseId: { userId, exerciseId: op.exerciseId },
          },
          create: { userId, exerciseId: op.exerciseId },
          update: {},
        });
        break;
      }

      case 'remove_favorite': {
        await tx.favorite.deleteMany({
          where: { userId, exerciseId: op.exerciseId },
        });
        break;
      }
    }
  }
}

// =============================================================================
// Create New Routine Version
// =============================================================================

export interface CreateVersionOptions {
  /** Human-readable description of what changed */
  changelog: string;
  /** Optional program block to associate this version with */
  programBlockId?: string | null;
  /** If provided, creates a RoutineChangeLog from → to */
  fromVersionId?: string | null;
  /** Patch ops that were applied to produce this version (stored in changelog) */
  patchOps?: PatchOp[];
  /** Optional coach proposal that triggered this version */
  proposalId?: string | null;
}

export interface CreatedVersion {
  id: string;
  versionNumber: number;
  changelog: string | null;
  createdAt: Date;
}

/**
 * Snapshot the current routine state and store it as a new RoutineVersion.
 * Optionally records which patch ops were applied and creates a ChangeLog entry.
 */
export async function createNewVersion(
  userId: string,
  opts: CreateVersionOptions
): Promise<CreatedVersion> {
  // Build a fresh snapshot of the current DB state
  const snapshot = await buildRoutineSnapshot(userId);

  return prisma.$transaction(async (tx) => {
    // Determine the next version number
    const latest = await tx.routineVersion.findFirst({
      where: { userId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextNumber = (latest?.versionNumber ?? 0) + 1;

    // Create the new RoutineVersion
    const version = await tx.routineVersion.create({
      data: {
        userId,
        programBlockId: opts.programBlockId ?? null,
        changelog: opts.changelog,
        versionNumber: nextNumber,
        snapshotJson: snapshot as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        versionNumber: true,
        changelog: true,
        createdAt: true,
      },
    });

    // Create RoutineChangeLog if we know what version we came from
    if (opts.fromVersionId) {
      await tx.routineChangeLog.create({
        data: {
          userId,
          fromVersionId: opts.fromVersionId,
          toVersionId: version.id,
          patchOpsJson: (opts.patchOps ?? []) as unknown as Prisma.InputJsonValue,
          proposalId: opts.proposalId ?? null,
        },
      });
    }

    return version;
  });
}

// =============================================================================
// Apply Patch Ops Then Create Version (convenience)
// =============================================================================

/**
 * Apply patch ops to the DB, then create a new RoutineVersion snapshot.
 * This is the primary entry point for routine mutations that should be versioned.
 */
export async function applyOpsAndCreateVersion(
  userId: string,
  ops: PatchOp[],
  opts: CreateVersionOptions
): Promise<CreatedVersion> {
  // Find the latest existing version to use as fromVersionId
  const latestVersion = await prisma.routineVersion.findFirst({
    where: { userId },
    orderBy: { versionNumber: 'desc' },
    select: { id: true },
  });

  // Apply all ops in a single transaction
  await prisma.$transaction(async (tx) => {
    await applyPatchOps(userId, ops, tx);
  });

  // Now create a new version snapshot (after ops are applied)
  return createNewVersion(userId, {
    ...opts,
    fromVersionId: opts.fromVersionId ?? latestVersion?.id ?? null,
    patchOps: ops,
  });
}
