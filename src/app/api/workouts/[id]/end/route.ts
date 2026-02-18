import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// Zod Schema for validation
// =============================================================================

// Schema for POST body (end workout session)
// Optional notes and status override
const endWorkoutSchema = z.object({
  // Optional final notes for the session
  notes: z.string().optional(),
  // Optional explicit status (defaults to COMPLETED)
  // Allow ABANDONED for when user wants to explicitly mark session as incomplete
  status: z.enum(['COMPLETED', 'ABANDONED']).optional(),
});

// =============================================================================
// POST /api/workouts/:id/end — End a workout session
// =============================================================================
// Marks a workout session as completed (or abandoned) and records the end time.
// - Validates the session exists and belongs to the user.
// - Validates the session is currently ACTIVE.
// - Updates endedAt and status fields.

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

  // Parse and validate body (allow empty body for default completion)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Allow empty body - will use defaults
    body = {};
  }

  const parseResult = endWorkoutSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { notes, status = 'COMPLETED' } = parseResult.data;

  // Verify the session exists and belongs to the user
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      notes: true,
    },
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

  // Check if session is still active (can't end an already ended session)
  if (session.status !== 'ACTIVE') {
    return NextResponse.json(
      {
        error: 'Session already ended',
        message: `Cannot end a ${session.status.toLowerCase()} session`,
      },
      { status: 400 }
    );
  }

  // End the session
  const endedAt = new Date();
  const updatedSession = await prisma.workoutSession.update({
    where: { id: sessionId },
    data: {
      endedAt,
      status,
      // Merge notes: if new notes provided, append to existing or replace
      notes: notes !== undefined
        ? notes
        : session.notes,
    },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      status: true,
      title: true,
      notes: true,
      constraintFlags: true,
      splitId: true,
      templateId: true,
      createdAt: true,
      updatedAt: true,
      // Include related data for context
      split: {
        select: {
          id: true,
          name: true,
        },
      },
      template: {
        select: {
          id: true,
          name: true,
          mode: true,
        },
      },
      // Include summary of exercises performed
      exercises: {
        select: {
          id: true,
          orderIndex: true,
          exercise: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              sets: true,
            },
          },
        },
        orderBy: {
          orderIndex: 'asc',
        },
      },
    },
  });

  // Calculate session duration in minutes
  const durationMinutes = Math.round(
    (endedAt.getTime() - new Date(updatedSession.startedAt).getTime()) / 60000
  );

  return NextResponse.json({
    session: {
      ...updatedSession,
      durationMinutes,
    },
    message: status === 'COMPLETED'
      ? 'Workout session completed successfully'
      : 'Workout session marked as abandoned',
  });
}
