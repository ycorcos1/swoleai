/**
 * GET /api/rules/volume
 *
 * Returns the user's weekly volume report (sets per muscle group)
 * for the specified date range, along with balance warnings.
 *
 * Query params:
 *   weekStart  (optional) — ISO 8601 date string; defaults to start of current week
 *   weekEnd    (optional) — ISO 8601 date string; defaults to end of current week
 *
 * Response:
 *   { report: VolumeReport }
 *
 * Task 7.5 — Acceptance Criteria: Returns imbalance warnings consistently.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { calculateWeeklyVolume } from '@/lib/rules/volume';
import type { SessionForVolume } from '@/lib/rules/volume';
import type { SetPerformance } from '@/lib/rules/types';

// =============================================================================
// SCHEMA
// =============================================================================

const querySchema = z.object({
  weekStart: z.string().optional(),
  weekEnd: z.string().optional(),
});

// =============================================================================
// DATE HELPERS
// =============================================================================

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

// =============================================================================
// HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    weekStart: searchParams.get('weekStart') ?? undefined,
    weekEnd: searchParams.get('weekEnd') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const now = new Date();
  const weekStart = parsed.data.weekStart
    ? new Date(parsed.data.weekStart)
    : startOfWeek(now);
  const weekEnd = parsed.data.weekEnd
    ? new Date(parsed.data.weekEnd)
    : endOfWeek(now);

  if (isNaN(weekStart.getTime()) || isNaN(weekEnd.getTime())) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }

  // --- Fetch completed sessions within the date range ----------------------
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      startedAt: { gte: weekStart, lte: weekEnd },
    },
    select: {
      exercises: {
        select: {
          exercise: {
            select: { muscleGroups: true },
          },
          sets: {
            select: {
              weight: true,
              reps: true,
              flags: true,
            },
          },
        },
      },
    },
  });

  // Map to SessionForVolume shape
  const volumeInput: SessionForVolume[] = sessions.map((s) => ({
    exercises: s.exercises.map((e) => ({
      muscleGroups: e.exercise.muscleGroups as string[],
      sets: e.sets.map((set) => ({
        flags: (set.flags as SetPerformance['flags']) ?? null,
      })),
    })),
  }));

  const report = calculateWeeklyVolume(volumeInput, weekStart, weekEnd);

  return NextResponse.json({ report });
}
