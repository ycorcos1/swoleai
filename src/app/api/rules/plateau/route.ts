/**
 * GET /api/rules/plateau
 *
 * Detects plateau candidates for the authenticated user across all
 * exercises they have performed in recent history.
 *
 * Query params:
 *   windowSize      (optional) — number of exposures to analyse (default 4, max 8)
 *   effortThreshold (optional) — minimum avg RPE to flag as high effort (default 7.5)
 *   minExercises    (optional) — only check exercises done at least N times (default 2)
 *
 * Response:
 *   { plateaus: PlateauCandidate[] }   — sorted: severe first
 *
 * Task 7.6 — Acceptance Criteria: Plateau candidates returned for a user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { detectPlateaus } from '@/lib/rules/plateau';
import type { ExposureResult, SetPerformance } from '@/lib/rules/types';

// =============================================================================
// SCHEMA
// =============================================================================

const querySchema = z.object({
  windowSize: z.coerce.number().int().min(2).max(8).optional().default(4),
  effortThreshold: z.coerce.number().min(1).max(10).optional().default(7.5),
  minExposures: z.coerce.number().int().min(2).max(10).optional().default(2),
});

// =============================================================================
// HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    windowSize: searchParams.get('windowSize') ?? undefined,
    effortThreshold: searchParams.get('effortThreshold') ?? undefined,
    minExposures: searchParams.get('minExposures') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { windowSize, effortThreshold, minExposures } = parsed.data;

  // --- Fetch all completed sessions with sets grouped by exercise -----------
  //     We look back at the last (windowSize + 2) sessions to give context.
  const recentSessions = await prisma.workoutSession.findMany({
    where: { userId, status: 'COMPLETED' },
    orderBy: { startedAt: 'desc' },
    take: (windowSize + 2) * 5, // conservative upper bound
    select: {
      startedAt: true,
      exercises: {
        select: {
          exerciseId: true,
          exercise: { select: { name: true } },
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
      },
    },
  });

  // Group exposures by exercise
  const exerciseMap = new Map<
    string,
    { name: string; exposures: ExposureResult[] }
  >();

  for (const session of recentSessions) {
    for (const we of session.exercises) {
      const existing = exerciseMap.get(we.exerciseId);
      const sets: SetPerformance[] = we.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe ?? undefined,
        flags: (s.flags as SetPerformance['flags']) ?? undefined,
      }));

      const exposure: ExposureResult = {
        sessionDate: session.startedAt,
        sets,
      };

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

  // Filter to exercises with enough exposures to analyse
  const exercises = Array.from(exerciseMap.entries())
    .filter(([, v]) => v.exposures.length >= minExposures)
    .map(([id, v]) => ({ id, name: v.name, exposures: v.exposures }));

  const plateaus = detectPlateaus(exercises, { windowSize, effortThreshold });

  return NextResponse.json({ plateaus });
}
