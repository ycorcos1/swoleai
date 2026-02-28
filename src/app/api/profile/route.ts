/**
 * GET  /api/profile — fetch the authenticated user's profile
 * PUT  /api/profile — update the authenticated user's profile
 *
 * Profile fields: goalMode, daysPerWeek, sessionMinutes, units, equipment, constraints
 * Used by the Goals page and Settings page (Task 13.4, 13.5).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// SCHEMA
// =============================================================================

const updateSchema = z.object({
  goalMode: z.enum(['HYPERTROPHY', 'STRENGTH', 'HYBRID']).optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  sessionMinutes: z.number().int().min(15).max(300).optional(),
  units: z.enum(['IMPERIAL', 'METRIC']).optional(),
  equipment: z.enum(['COMMERCIAL', 'HOME']).optional(),
  constraints: z
    .object({
      injuries: z.array(z.string()).optional(),
      avoidExercises: z.array(z.string()).optional(),
      mustHaveExercises: z.array(z.string()).optional(),
    })
    .optional(),
});

// =============================================================================
// GET /api/profile
// =============================================================================

export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      goalMode: true,
      daysPerWeek: true,
      sessionMinutes: true,
      units: true,
      equipment: true,
      constraints: true,
      onboardingComplete: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ profile: user });
}

// =============================================================================
// PUT /api/profile
// =============================================================================

export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { constraints, ...rest } = parsed.data;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...rest,
      ...(constraints !== undefined ? { constraints } : {}),
    },
    select: {
      id: true,
      email: true,
      goalMode: true,
      daysPerWeek: true,
      sessionMinutes: true,
      units: true,
      equipment: true,
      constraints: true,
      onboardingComplete: true,
    },
  });

  return NextResponse.json({ profile: updated });
}
