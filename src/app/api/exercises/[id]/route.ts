import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const updateExerciseSchema = z.object({
  muscleGroups: z.array(z.string()).optional(),
  name: z.string().min(1).max(100).optional(),
});

// =============================================================================
// PUT /api/exercises/[id] — Update a custom exercise (owner only)
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const { id } = await params;

  const existing = await prisma.exercise.findFirst({
    where: { id, isCustom: true, ownerUserId: userId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const { muscleGroups, name } = parsed.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (muscleGroups !== undefined) data.muscleGroups = muscleGroups;
  if (name !== undefined) data.name = name;

  const exercise = await prisma.exercise.update({
    where: { id },
    data,
    select: { id: true, name: true, type: true, pattern: true, muscleGroups: true, isCustom: true },
  });

  return NextResponse.json({ exercise });
}
