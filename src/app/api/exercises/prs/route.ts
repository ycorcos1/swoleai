import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// GET /api/exercises/prs — List all personal records for the user
// =============================================================================
// Returns each PR with its associated exercise details

export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const prs = await prisma.personalRecord.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      weight: true,
      reps: true,
      notes: true,
      achievedAt: true,
      updatedAt: true,
      exercise: {
        select: {
          id: true,
          name: true,
          type: true,
          pattern: true,
          muscleGroups: true,
        },
      },
    },
  });

  return NextResponse.json({ prs });
}

// =============================================================================
// POST /api/exercises/prs — Create or update a personal record
// =============================================================================
// Upserts on (userId, exerciseId) — one PR per exercise per user

const upsertPRSchema = z.object({
  exerciseId: z.string().min(1),
  weight: z.number().positive(),
  reps: z.number().int().min(1).max(100),
  notes: z.string().max(300).optional().nullable(),
  achievedAt: z.string().datetime().optional(),
});

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

  const parsed = upsertPRSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { exerciseId, weight, reps, notes, achievedAt } = parsed.data;

  // Verify the exercise exists
  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [{ isCustom: false }, { ownerUserId: userId }],
    },
    select: { id: true },
  });

  if (!exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }

  const pr = await prisma.personalRecord.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    create: {
      userId,
      exerciseId,
      weight,
      reps,
      notes: notes ?? null,
      achievedAt: achievedAt ? new Date(achievedAt) : new Date(),
    },
    update: {
      weight,
      reps,
      notes: notes ?? null,
      achievedAt: achievedAt ? new Date(achievedAt) : new Date(),
    },
    select: {
      id: true,
      weight: true,
      reps: true,
      notes: true,
      achievedAt: true,
      updatedAt: true,
      exercise: {
        select: {
          id: true,
          name: true,
          type: true,
          pattern: true,
          muscleGroups: true,
        },
      },
    },
  });

  return NextResponse.json({ pr }, { status: 201 });
}
