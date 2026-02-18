import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ExerciseType, MovementPattern } from '@prisma/client';

// =============================================================================
// Zod Schemas for validation
// =============================================================================

// Schema for GET query params
const listExercisesQuerySchema = z.object({
  // Filter by custom only (user's custom exercises)
  customOnly: z.enum(['true', 'false']).optional(),
  // Filter by movement pattern
  pattern: z.nativeEnum(MovementPattern).optional(),
  // Filter by exercise type
  type: z.nativeEnum(ExerciseType).optional(),
  // Search by name (partial match)
  search: z.string().optional(),
});

// Schema for POST body (create custom exercise)
const createExerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required').max(100, 'Name too long'),
  type: z.nativeEnum(ExerciseType).default('OTHER'),
  pattern: z.nativeEnum(MovementPattern).default('OTHER'),
  // Muscle groups as array of strings (e.g., ["chest", "triceps"])
  muscleGroups: z.array(z.string()).default([]),
  // Equipment tags as array of strings (e.g., ["barbell", "bench"])
  equipmentTags: z.array(z.string()).default([]),
  // Joint stress flags as record (e.g., {"shoulder": "high"})
  jointStressFlags: z.record(z.string(), z.string()).default({}),
});

// =============================================================================
// GET /api/exercises — List exercises
// =============================================================================
// Returns system exercises + user's custom exercises
// Supports filtering by customOnly, pattern, type, search

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  // Parse query params
  const { searchParams } = new URL(request.url);
  const queryResult = listExercisesQuerySchema.safeParse({
    customOnly: searchParams.get('customOnly') ?? undefined,
    pattern: searchParams.get('pattern') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: queryResult.error.flatten() },
      { status: 400 }
    );
  }

  const { customOnly, pattern, type, search } = queryResult.data;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    // Show system exercises (isCustom=false) OR user's custom exercises
    OR: [
      { isCustom: false },
      { isCustom: true, ownerUserId: userId },
    ],
  };

  // Apply filters
  if (customOnly === 'true') {
    // Only show user's custom exercises
    delete where.OR;
    where.isCustom = true;
    where.ownerUserId = userId;
  }

  if (pattern) {
    where.pattern = pattern;
  }

  if (type) {
    where.type = type;
  }

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    };
  }

  const exercises = await prisma.exercise.findMany({
    where,
    orderBy: [
      { isCustom: 'asc' }, // System exercises first
      { name: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      type: true,
      pattern: true,
      muscleGroups: true,
      equipmentTags: true,
      jointStressFlags: true,
      isCustom: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ exercises });
}

// =============================================================================
// POST /api/exercises — Create a custom exercise
// =============================================================================
// Creates a new custom exercise owned by the authenticated user

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
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const parseResult = createExerciseSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { name, type, pattern, muscleGroups, equipmentTags, jointStressFlags } = parseResult.data;

  // Check if user already has a custom exercise with this name
  const existingExercise = await prisma.exercise.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      isCustom: true,
      ownerUserId: userId,
    },
  });

  if (existingExercise) {
    return NextResponse.json(
      { error: 'An exercise with this name already exists' },
      { status: 409 }
    );
  }

  // Create the custom exercise
  const exercise = await prisma.exercise.create({
    data: {
      name,
      type,
      pattern,
      muscleGroups: muscleGroups as string[],
      equipmentTags: equipmentTags as string[],
      jointStressFlags: jointStressFlags as Record<string, string>,
      isCustom: true,
      ownerUserId: userId,
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
      createdAt: true,
    },
  });

  return NextResponse.json({ exercise }, { status: 201 });
}
