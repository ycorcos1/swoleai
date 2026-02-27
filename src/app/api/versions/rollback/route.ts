/**
 * POST /api/versions/rollback — Task 8.3
 *
 * Rolls back the user's active routine to a prior RoutineVersion snapshot.
 *
 * Process:
 *   1. Load the target version's snapshotJson
 *   2. Restore the routine DB state from that snapshot:
 *      - Update template blocks/slots to match snapshot
 *      - Update active split's schedule-day template assignments
 *      - Sync favorites to match snapshot's favoriteIds
 *   3. Take a fresh snapshot of the restored state
 *   4. Save it as a new RoutineVersion (changelog = "Rollback to v{N}")
 *   5. Record a RoutineChangeLog from the latest version → the new version
 *
 * Body: { versionId: string }
 *
 * Returns: { version: CreatedVersion, restoredSummary: { ... } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma, ProgressionEngine } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { buildRoutineSnapshot, RoutineSnapshot } from '@/lib/versions/snapshot';
import { createNewVersion } from '@/lib/versions/patch';

// =============================================================================
// Validation
// =============================================================================

const rollbackSchema = z.object({
  versionId: z.string().min(1, 'versionId is required'),
});

// =============================================================================
// POST /api/versions/rollback
// =============================================================================

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = rollbackSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { versionId } = parseResult.data;

  // Load the target version and verify ownership
  const targetVersion = await prisma.routineVersion.findFirst({
    where: { id: versionId, userId },
    select: {
      id: true,
      versionNumber: true,
      snapshotJson: true,
    },
  });

  if (!targetVersion) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  const snapshot = targetVersion.snapshotJson as unknown as RoutineSnapshot;

  // Track what we restored for the response summary
  const restoredSummary: {
    templatesRestored: string[];
    scheduleDaysUpdated: number;
    favoritesAdded: number;
    favoritesRemoved: number;
    skippedTemplates: string[];
  } = {
    templatesRestored: [],
    scheduleDaysUpdated: 0,
    favoritesAdded: 0,
    favoritesRemoved: 0,
    skippedTemplates: [],
  };

  // Apply the snapshot to the DB inside a transaction
  await prisma.$transaction(async (tx) => {
    // ── 1. Restore template blocks/slots ─────────────────────────────────────
    for (const tSnap of snapshot.templates) {
      // Verify the template still exists and belongs to this user
      const template = await tx.workoutDayTemplate.findFirst({
        where: { id: tSnap.id, userId },
        select: { id: true, mode: true },
      });

      if (!template) {
        restoredSummary.skippedTemplates.push(tSnap.id);
        continue;
      }

      if (template.mode === 'FIXED') {
        // Delete all current blocks and recreate from snapshot
        await tx.workoutDayBlock.deleteMany({
          where: { templateId: template.id },
        });

        for (const b of tSnap.blocks) {
          // Verify the exercise still exists
          const exerciseExists = await tx.exercise.findFirst({
            where: { id: b.exerciseId },
            select: { id: true },
          });
          if (!exerciseExists) continue;

          await tx.workoutDayBlock.create({
            data: {
              templateId: template.id,
              orderIndex: b.orderIndex,
              exerciseId: b.exerciseId,
              setsPlanned: b.setsPlanned,
              repMin: b.repMin,
              repMax: b.repMax,
              restSeconds: b.restSeconds,
              progressionEngine: (b.progressionEngine as ProgressionEngine | null) ?? null,
              intensityTarget:
                b.intensityTarget != null
                  ? (b.intensityTarget as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              notes: b.notes,
            },
          });
        }
      } else if (template.mode === 'SLOT') {
        // Delete all current slots and recreate from snapshot
        await tx.workoutDaySlot.deleteMany({
          where: { templateId: template.id },
        });

        for (const s of tSnap.slots) {
          await tx.workoutDaySlot.create({
            data: {
              templateId: template.id,
              orderIndex: s.orderIndex,
              muscleGroup: s.muscleGroup,
              exerciseCount: s.exerciseCount,
              patternConstraints:
                s.patternConstraints != null
                  ? (s.patternConstraints as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              equipmentConstraints:
                s.equipmentConstraints != null
                  ? (s.equipmentConstraints as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              defaultSets: s.defaultSets,
              defaultRepMin: s.defaultRepMin,
              defaultRepMax: s.defaultRepMax,
              notes: s.notes,
            },
          });
        }
      }

      restoredSummary.templatesRestored.push(tSnap.name);
    }

    // ── 2. Restore split schedule day assignments ─────────────────────────────
    if (snapshot.splitId && snapshot.scheduleDays.length > 0) {
      // Check the split still exists
      const split = await tx.split.findFirst({
        where: { id: snapshot.splitId, userId },
        select: { id: true },
      });

      if (split) {
        for (const daySnap of snapshot.scheduleDays) {
          const scheduleDay = await tx.splitScheduleDay.findFirst({
            where: {
              splitId: split.id,
              weekday: daySnap.weekday as never,
            },
            select: { id: true },
          });

          if (scheduleDay) {
            await tx.splitScheduleDay.update({
              where: { id: scheduleDay.id },
              data: {
                workoutDayTemplateId: daySnap.templateId,
                isRest: daySnap.isRest,
              },
            });
            restoredSummary.scheduleDaysUpdated++;
          }
        }
      }
    }

    // ── 3. Sync favorites ─────────────────────────────────────────────────────
    const snapshotFavoriteIds = new Set(snapshot.favoriteIds);

    const currentFavorites = await tx.favorite.findMany({
      where: { userId },
      select: { exerciseId: true },
    });
    const currentFavoriteIds = new Set(
      currentFavorites.map((f) => f.exerciseId)
    );

    // Add missing favorites
    for (const exId of snapshotFavoriteIds) {
      if (!currentFavoriteIds.has(exId)) {
        // Verify exercise exists before creating favorite
        const exerciseExists = await tx.exercise.findFirst({
          where: { id: exId },
          select: { id: true },
        });
        if (exerciseExists) {
          await tx.favorite.create({ data: { userId, exerciseId: exId } });
          restoredSummary.favoritesAdded++;
        }
      }
    }

    // Remove extras not in snapshot
    for (const exId of currentFavoriteIds) {
      if (!snapshotFavoriteIds.has(exId)) {
        await tx.favorite.deleteMany({
          where: { userId, exerciseId: exId },
        });
        restoredSummary.favoritesRemoved++;
      }
    }
  });

  // Find the current latest version (before creating the rollback version)
  const latestVersion = await prisma.routineVersion.findFirst({
    where: { userId },
    orderBy: { versionNumber: 'desc' },
    select: { id: true },
  });

  // Create a new version capturing the restored state
  const newVersion = await createNewVersion(userId, {
    changelog: `Rollback to v${targetVersion.versionNumber}`,
    fromVersionId: latestVersion?.id ?? null,
    patchOps: [],
  });

  return NextResponse.json({
    version: newVersion,
    restoredSummary,
    rolledBackTo: {
      id: targetVersion.id,
      versionNumber: targetVersion.versionNumber,
    },
  });
}
