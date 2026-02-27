/**
 * POST /api/rules/progression
 *
 * Computes the next-session progression target for a specific exercise
 * based on the user's last session performance.
 *
 * Body:
 *   {
 *     exerciseId:      string   — exercise to compute target for
 *     repMin:          number   — lower bound of rep range
 *     repMax:          number   — upper bound of rep range
 *     engine:          string   — ProgressionEngine value
 *     weightIncrement: number?  — plate increment in user's unit (default 5)
 *   }
 *
 * Response:
 *   { target: ProgressionTarget, lastSessionDate: string | null }
 *
 * Task 7.3 — Acceptance Criteria: Next targets can be computed from last performance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { computeProgressionTarget } from '@/lib/rules/progression';
import type { ExposureResult, SetPerformance } from '@/lib/rules/types';

// =============================================================================
// SCHEMA
// =============================================================================

const bodySchema = z.object({
  exerciseId: z.string().min(1),
  repMin: z.number().int().min(1).default(8),
  repMax: z.number().int().min(1).default(12),
  engine: z
    .enum(['DOUBLE_PROGRESSION', 'STRAIGHT_SETS', 'TOP_SET_BACKOFF', 'RPE_BASED', 'NONE'])
    .default('DOUBLE_PROGRESSION'),
  weightIncrement: z.number().min(0.5).max(50).optional().default(5),
});

// =============================================================================
// HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { exerciseId, repMin, repMax, engine, weightIncrement } = parsed.data;

  // --- Find the most recent completed session that includes this exercise ----
  const lastWorkoutExercise = await prisma.workoutExercise.findFirst({
    where: {
      exerciseId,
      session: {
        userId,
        status: 'COMPLETED',
      },
    },
    orderBy: {
      session: { startedAt: 'desc' },
    },
    select: {
      session: { select: { startedAt: true } },
      sets: {
        select: {
          weight: true,
          reps: true,
          rpe: true,
          flags: true,
        },
        orderBy: { setIndex: 'asc' },
      },
    },
  });

  if (!lastWorkoutExercise) {
    return NextResponse.json(
      {
        target: {
          suggestedWeight: 0,
          suggestedRepMin: repMin,
          suggestedRepMax: repMax,
          engine,
          rationale: 'No prior sessions found for this exercise',
          isReadyForProgression: false,
        },
        lastSessionDate: null,
      },
      { status: 200 }
    );
  }

  // Map DB sets to SetPerformance
  const sets: SetPerformance[] = lastWorkoutExercise.sets.map((s) => ({
    weight: s.weight,
    reps: s.reps,
    rpe: s.rpe ?? undefined,
    flags: (s.flags as SetPerformance['flags']) ?? undefined,
  }));

  const exposure: ExposureResult = {
    sessionDate: lastWorkoutExercise.session.startedAt,
    sets,
  };

  const target = computeProgressionTarget(engine, exposure, repMin, repMax, weightIncrement);

  return NextResponse.json({
    target,
    lastSessionDate: lastWorkoutExercise.session.startedAt.toISOString(),
  });
}
