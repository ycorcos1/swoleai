/**
 * GET /api/rules/substitutions
 *
 * Returns a ranked list of substitute exercises for a given exercise,
 * respecting user constraints (avoid list, injuries, available equipment)
 * and penalising recently used exercises.
 *
 * Query params:
 *   exerciseId  (required) — ID of the exercise to substitute
 *   limit       (optional) — max candidates to return (default 10, max 20)
 *
 * Response:
 *   { candidates: SubstitutionCandidate[], target: ExerciseInfo }
 *
 * Task 7.1 — Acceptance Criteria: Given an exercise + constraints, returns ordered candidates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { rankSubstitutionCandidates } from '@/lib/rules/substitution';
import type { ExerciseInfo, SubstitutionConstraints } from '@/lib/rules/types';

// =============================================================================
// SCHEMA
// =============================================================================

const querySchema = z.object({
  exerciseId: z.string().min(1, 'exerciseId is required'),
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
});

// =============================================================================
// HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const { searchParams } = new URL(request.url);
  const parseResult = querySchema.safeParse({
    exerciseId: searchParams.get('exerciseId') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { exerciseId, limit } = parseResult.data;

  // --- Fetch target exercise ------------------------------------------------
  const targetRaw = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [{ isCustom: false }, { isCustom: true, ownerUserId: userId }],
    },
    select: {
      id: true,
      name: true,
      type: true,
      pattern: true,
      muscleGroups: true,
      equipmentTags: true,
      jointStressFlags: true,
      isCustom: true,
    },
  });

  if (!targetRaw) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }

  // --- Fetch user profile for constraints -----------------------------------
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { constraints: true, equipment: true },
  });

  const userConstraints = (user?.constraints as {
    injuries?: string[];
    avoidExercises?: string[];
    mustHaveExercises?: string[];
  } | null) ?? {};

  // Build injury flags map (simple: treat each injured area as "high" stress)
  const injuryFlags: Record<string, string> = {};
  for (const area of userConstraints.injuries ?? []) {
    injuryFlags[area.toLowerCase().replace(/\s/g, '_')] = 'high';
  }

  // --- Fetch recently used exercise IDs (last 3 sessions) ------------------
  const recentSessions = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: 3,
    select: {
      exercises: {
        select: { exerciseId: true },
      },
    },
  });

  const recentlyUsedIds = [
    ...new Set(
      recentSessions.flatMap((s) => s.exercises.map((e) => e.exerciseId))
    ),
  ];

  // --- Fetch all available exercises ----------------------------------------
  const allExercisesRaw = await prisma.exercise.findMany({
    where: {
      OR: [{ isCustom: false }, { isCustom: true, ownerUserId: userId }],
    },
    select: {
      id: true,
      name: true,
      type: true,
      pattern: true,
      muscleGroups: true,
      equipmentTags: true,
      jointStressFlags: true,
      isCustom: true,
    },
  });

  // --- Map to ExerciseInfo shape --------------------------------------------
  type RawExercise = {
    id: string;
    name: string;
    type: string;
    pattern: string;
    muscleGroups: unknown;
    equipmentTags: unknown;
    jointStressFlags: unknown;
    isCustom: boolean;
  };

  function toExerciseInfo(raw: RawExercise): ExerciseInfo {
    return {
      id: raw.id,
      name: raw.name,
      type: raw.type as string,
      pattern: raw.pattern as string,
      muscleGroups: raw.muscleGroups as string[],
      equipmentTags: raw.equipmentTags as string[],
      jointStressFlags: raw.jointStressFlags as Record<string, string>,
      isCustom: raw.isCustom,
    };
  }

  const target = toExerciseInfo(targetRaw as RawExercise);
  const candidates = (allExercisesRaw as RawExercise[]).map(toExerciseInfo);

  // --- Build constraints ----------------------------------------------------
  const constraints: SubstitutionConstraints = {
    excludeExerciseId: exerciseId,
    avoidExerciseIds: userConstraints.avoidExercises ?? [],
    recentlyUsedIds,
    injuryFlags,
  };

  // --- Rank and return -------------------------------------------------------
  const ranked = rankSubstitutionCandidates(target, candidates, constraints, limit);

  return NextResponse.json({ target, candidates: ranked });
}
