/**
 * POST /api/rules/prs
 *
 * Detects personal records for all exercises in a given session,
 * comparing against the user's full history.
 *
 * Body:
 *   {
 *     sessionId: string   — server-side WorkoutSession ID
 *   }
 *
 * Response:
 *   { prs: PRResult[] }
 *
 * Task 7.4 — Acceptance Criteria: Summary page can show PR badges.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { detectAllPRs } from '@/lib/rules/pr-detection';
import type { ExerciseSessionData } from '@/lib/rules/pr-detection';
import type { SetPerformance } from '@/lib/rules/types';

// =============================================================================
// SCHEMA
// =============================================================================

const bodySchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
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

  const { sessionId } = parsed.data;

  // --- Fetch the target session with exercises + sets -----------------------
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      id: true,
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

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // --- For each exercise, fetch all prior sessions' sets --------------------
  const exerciseIds = [...new Set(session.exercises.map((e) => e.exerciseId))];

  const historicalData = await prisma.workoutExercise.findMany({
    where: {
      exerciseId: { in: exerciseIds },
      session: {
        userId,
        status: 'COMPLETED',
        // Exclude the current session from historical comparison
        NOT: { id: sessionId },
      },
    },
    select: {
      exerciseId: true,
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

  // Group historical sets by exerciseId
  const historicalByExercise = new Map<string, SetPerformance[][]>();
  for (const we of historicalData) {
    const existing = historicalByExercise.get(we.exerciseId) ?? [];
    const sets: SetPerformance[] = we.sets.map((s) => ({
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe ?? undefined,
      flags: (s.flags as SetPerformance['flags']) ?? undefined,
    }));
    existing.push(sets);
    historicalByExercise.set(we.exerciseId, existing);
  }

  // Build batch input for detectAllPRs
  const exerciseData: ExerciseSessionData[] = session.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    exerciseName: e.exercise.name,
    sessionSets: e.sets.map((s) => ({
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe ?? undefined,
      flags: (s.flags as SetPerformance['flags']) ?? undefined,
    })),
    historicalSessions: historicalByExercise.get(e.exerciseId) ?? [],
  }));

  const prs = detectAllPRs(exerciseData);

  return NextResponse.json({ prs });
}
