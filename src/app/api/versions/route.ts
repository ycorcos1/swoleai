/**
 * GET /api/versions  — List program blocks and routine versions (Task 6.9)
 * POST /api/versions — Create a new routine version snapshot, optionally
 *                      applying patch ops first (Task 8.2)
 *
 * GET returns:
 *   - programBlocks: each block with its nested routineVersions (desc by versionNumber)
 *   - unlinkedVersions: routine versions with no programBlock, desc by versionNumber
 *
 * POST body:
 *   {
 *     changelog: string,
 *     programBlockId?: string | null,
 *     patchOps?: PatchOp[]   // applied before snapshotting
 *   }
 *
 * All data is scoped to the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { applyOpsAndCreateVersion } from '@/lib/versions/patch';

// =============================================================================
// POST validation schema
// =============================================================================

const patchOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('replace_block_exercise'),
    templateId: z.string().min(1),
    blockOrderIndex: z.number().int().min(0),
    exerciseId: z.string().min(1),
  }),
  z.object({
    op: z.literal('update_block'),
    templateId: z.string().min(1),
    blockOrderIndex: z.number().int().min(0),
    changes: z.object({
      setsPlanned: z.number().int().min(1).optional(),
      repMin: z.number().int().min(1).optional(),
      repMax: z.number().int().min(1).optional(),
      restSeconds: z.number().int().min(0).optional(),
      progressionEngine: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
  }),
  z.object({
    op: z.literal('add_block'),
    templateId: z.string().min(1),
    block: z.object({
      exerciseId: z.string().min(1),
      setsPlanned: z.number().int().min(1),
      repMin: z.number().int().min(1),
      repMax: z.number().int().min(1),
      restSeconds: z.number().int().min(0),
      progressionEngine: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
  }),
  z.object({
    op: z.literal('remove_block'),
    templateId: z.string().min(1),
    blockOrderIndex: z.number().int().min(0),
  }),
  z.object({
    op: z.literal('set_schedule_day'),
    splitId: z.string().min(1),
    weekday: z.string().min(1),
    templateId: z.string().nullable(),
    isRest: z.boolean(),
  }),
  z.object({ op: z.literal('add_favorite'), exerciseId: z.string().min(1) }),
  z.object({ op: z.literal('remove_favorite'), exerciseId: z.string().min(1) }),
]);

const createVersionSchema = z.object({
  changelog: z.string().min(1, 'Changelog is required').max(500),
  programBlockId: z.string().nullable().optional(),
  patchOps: z.array(patchOpSchema).optional().default([]),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  // Fetch all program blocks belonging to this user, newest first,
  // with their routine versions nested and sorted descending.
  const programBlocks = await prisma.programBlock.findMany({
    where: { userId },
    orderBy: { startDate: 'desc' },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      routineVersions: {
        orderBy: { versionNumber: 'desc' },
        select: {
          id: true,
          versionNumber: true,
          changelog: true,
          createdAt: true,
        },
      },
    },
  });

  // Fetch routine versions that are not linked to any program block
  const unlinkedVersions = await prisma.routineVersion.findMany({
    where: { userId, programBlockId: null },
    orderBy: { versionNumber: 'desc' },
    select: {
      id: true,
      versionNumber: true,
      changelog: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ programBlocks, unlinkedVersions });
}

// =============================================================================
// POST /api/versions — Apply patch ops (if any) then snapshot current state
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

  const parseResult = createVersionSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { changelog, programBlockId, patchOps } = parseResult.data;

  try {
    const version = await applyOpsAndCreateVersion(userId, patchOps, {
      changelog,
      programBlockId: programBlockId ?? null,
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to create version';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
