import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// Zod Schema for validation
// =============================================================================

// Schema for POST body (log a set)
// Supports logging individual sets with all flags (warmup/backoff/dropset/failure)
const logSetSchema = z.object({
  // Required: exercise to log the set for
  exerciseId: z.string().min(1, 'exerciseId is required'),

  // Required: performance data
  weight: z.number().nonnegative('Weight must be non-negative'),
  reps: z.number().int().positive('Reps must be a positive integer'),

  // Optional: RPE (1-10 scale)
  rpe: z.number().min(1).max(10).optional(),

  // Optional: set flags (warmup, backoff, dropset, failure)
  flags: z
    .object({
      warmup: z.boolean().optional(),
      backoff: z.boolean().optional(),
      dropset: z.boolean().optional(),
      failure: z.boolean().optional(),
    })
    .optional(),

  // Optional: notes for this specific set
  notes: z.string().optional(),
});

// =============================================================================
// POST /api/workouts/:id/log-set — Log a set for a workout session
// =============================================================================
// Logs a single set for an exercise within a workout session.
// - If the exercise doesn't exist in the session yet, creates a WorkoutExercise.
// - Appends the set to the exercise with the correct setIndex.
// - Preserves all flags (warmup, backoff, dropset, failure).

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  const { id: sessionId } = await params;

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  const parseResult = logSetSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { exerciseId, weight, reps, rpe, flags, notes } = parseResult.data;

  // Verify the session exists and belongs to the user
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, status: true },
  });

  if (!session) {
    return NextResponse.json(
      {
        error: 'Session not found',
        message: 'The specified workout session does not exist or does not belong to you',
      },
      { status: 404 }
    );
  }

  // Check if session is still active (can't log sets to completed/abandoned sessions)
  if (session.status !== 'ACTIVE') {
    return NextResponse.json(
      {
        error: 'Session not active',
        message: `Cannot log sets to a ${session.status.toLowerCase()} session`,
      },
      { status: 400 }
    );
  }

  // Verify the exercise exists (either system or user's custom exercise)
  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [
        { isCustom: false }, // System exercise
        { isCustom: true, ownerUserId: userId }, // User's custom exercise
      ],
    },
    select: { id: true, name: true },
  });

  if (!exercise) {
    return NextResponse.json(
      {
        error: 'Exercise not found',
        message: 'The specified exercise does not exist or is not accessible',
      },
      { status: 404 }
    );
  }

  // Use a transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Find or create WorkoutExercise for this exercise in this session
    let workoutExercise = await tx.workoutExercise.findFirst({
      where: { sessionId, exerciseId },
      select: { id: true, orderIndex: true },
    });

    if (!workoutExercise) {
      // Get the next order index for this session
      const maxOrderResult = await tx.workoutExercise.aggregate({
        where: { sessionId },
        _max: { orderIndex: true },
      });
      const nextOrderIndex = (maxOrderResult._max.orderIndex ?? -1) + 1;

      // Create the WorkoutExercise
      workoutExercise = await tx.workoutExercise.create({
        data: {
          sessionId,
          exerciseId,
          orderIndex: nextOrderIndex,
        },
        select: { id: true, orderIndex: true },
      });
    }

    // Get the next set index for this exercise
    const maxSetResult = await tx.workoutSet.aggregate({
      where: { workoutExerciseId: workoutExercise.id },
      _max: { setIndex: true },
    });
    const nextSetIndex = (maxSetResult._max.setIndex ?? -1) + 1;

    // Create the WorkoutSet
    const workoutSet = await tx.workoutSet.create({
      data: {
        workoutExerciseId: workoutExercise.id,
        setIndex: nextSetIndex,
        weight,
        reps,
        rpe: rpe ?? null,
        flags: flags ?? {},
        notes: notes ?? null,
      },
      select: {
        id: true,
        setIndex: true,
        weight: true,
        reps: true,
        rpe: true,
        flags: true,
        notes: true,
        createdAt: true,
      },
    });

    return {
      workoutExercise,
      workoutSet,
    };
  });

  return NextResponse.json(
    {
      set: result.workoutSet,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        workoutExerciseId: result.workoutExercise.id,
        orderIndex: result.workoutExercise.orderIndex,
      },
      sessionId,
    },
    { status: 201 }
  );
}
