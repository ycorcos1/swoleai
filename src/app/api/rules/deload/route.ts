/**
 * POST /api/rules/deload
 *
 * Runs plateau detection and returns a deterministic deload recommendation.
 *
 * Body:
 *   {
 *     lowEnergy:   boolean?                           — user flagged low energy
 *     exercises:   { exerciseId, exerciseName }[]?    — exercises in today's session
 *     windowSize:  number?                            — plateau detection window (default 4)
 *   }
 *
 * Response:
 *   { recommendation: DeloadRecommendation, plateaus: PlateauCandidate[] }
 *
 * Task 7.7 — Acceptance Criteria: Returns proposed deload adjustments deterministically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { detectPlateaus } from '@/lib/rules/plateau';
import { recommendDeload } from '@/lib/rules/deload';
import type { ExposureResult, SetPerformance } from '@/lib/rules/types';

// =============================================================================
// SCHEMA
// =============================================================================

const bodySchema = z.object({
  lowEnergy: z.boolean().optional().default(false),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        exerciseName: z.string().min(1),
      })
    )
    .optional()
    .default([]),
  windowSize: z.number().int().min(2).max(8).optional().default(4),
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

  const { lowEnergy, exercises, windowSize } = parsed.data;

  // --- Run plateau detection (same logic as /api/rules/plateau) -------------
  const recentSessions = await prisma.workoutSession.findMany({
    where: { userId, status: 'COMPLETED' },
    orderBy: { startedAt: 'desc' },
    take: (windowSize + 2) * 5,
    select: {
      startedAt: true,
      exercises: {
        select: {
          exerciseId: true,
          exercise: { select: { name: true } },
          sets: {
            select: { weight: true, reps: true, rpe: true, flags: true },
            orderBy: { setIndex: 'asc' },
          },
        },
      },
    },
  });

  const exerciseMap = new Map<
    string,
    { name: string; exposures: ExposureResult[] }
  >();

  for (const session of recentSessions) {
    for (const we of session.exercises) {
      const sets: SetPerformance[] = we.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe ?? undefined,
        flags: (s.flags as SetPerformance['flags']) ?? undefined,
      }));

      const exposure: ExposureResult = { sessionDate: session.startedAt, sets };

      const existing = exerciseMap.get(we.exerciseId);
      if (existing) {
        existing.exposures.push(exposure);
      } else {
        exerciseMap.set(we.exerciseId, {
          name: we.exercise.name,
          exposures: [exposure],
        });
      }
    }
  }

  const exercisesForPlateau = Array.from(exerciseMap.entries())
    .filter(([, v]) => v.exposures.length >= 2)
    .map(([id, v]) => ({ id, name: v.name, exposures: v.exposures }));

  const plateaus = detectPlateaus(exercisesForPlateau, { windowSize });

  // --- Build deload recommendation -----------------------------------------
  const recommendation = recommendDeload(plateaus, {
    lowEnergy,
    exercises,
  });

  return NextResponse.json({ recommendation, plateaus });
}
