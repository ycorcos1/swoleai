import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// Zod Schema for validation
// =============================================================================

// Schema for POST body (start workout session)
// Both splitId and templateId are optional for freestyle workouts
const startWorkoutSchema = z.object({
  // Optional split ID - links session to a workout split
  splitId: z.string().optional(),
  // Optional template ID - links session to a workout day template
  templateId: z.string().optional(),
  // Optional session title (auto-generated if not provided)
  title: z.string().max(200).optional(),
  // Optional initial notes
  notes: z.string().optional(),
  // Optional constraint flags (pain, equipment issues, energy level)
  constraintFlags: z
    .object({
      pain: z.array(z.string()).optional(),
      equipmentCrowded: z.boolean().optional(),
      lowEnergy: z.boolean().optional(),
    })
    .optional(),
});

// =============================================================================
// POST /api/workouts/start — Start a new workout session
// =============================================================================
// Creates a new workout session for the authenticated user
// Optionally links to a split and/or template for context
// Returns the sessionId for subsequent logging operations

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Allow empty body for completely freestyle workouts
    body = {};
  }

  const parseResult = startWorkoutSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { splitId, templateId, title, notes, constraintFlags } = parseResult.data;

  // Validate splitId belongs to the user if provided
  if (splitId) {
    const split = await prisma.split.findFirst({
      where: { id: splitId, userId },
      select: { id: true },
    });

    if (!split) {
      return NextResponse.json(
        { error: 'Split not found', message: 'The specified split does not exist or does not belong to you' },
        { status: 404 }
      );
    }
  }

  // Validate templateId belongs to the user if provided
  if (templateId) {
    const template = await prisma.workoutDayTemplate.findFirst({
      where: { id: templateId, userId },
      select: { id: true, name: true },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found', message: 'The specified template does not exist or does not belong to you' },
        { status: 404 }
      );
    }
  }

  // Create the workout session
  const session = await prisma.workoutSession.create({
    data: {
      userId,
      startedAt: new Date(),
      status: 'ACTIVE',
      title: title ?? null,
      notes: notes ?? null,
      splitId: splitId ?? null,
      templateId: templateId ?? null,
      constraintFlags: constraintFlags ?? {},
    },
    select: {
      id: true,
      startedAt: true,
      status: true,
      title: true,
      notes: true,
      constraintFlags: true,
      splitId: true,
      templateId: true,
      createdAt: true,
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
    },
  });

  return NextResponse.json(
    {
      sessionId: session.id,
      session,
    },
    { status: 201 }
  );
}
