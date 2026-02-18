import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  TemplateMode,
  ProgressionEngine,
  MovementPattern,
  ExerciseType,
  Prisma,
} from '@prisma/client';

// =============================================================================
// Zod Schemas for validation
// =============================================================================

// Schema for GET query params
const listTemplatesQuerySchema = z.object({
  // Filter by template mode
  mode: z.nativeEnum(TemplateMode).optional(),
  // Search by name (partial match)
  search: z.string().optional(),
});

// Schema for a block in a FIXED template
const workoutDayBlockSchema = z.object({
  orderIndex: z.number().int().min(0),
  exerciseId: z.string().min(1, 'Exercise ID is required'),
  setsPlanned: z.number().int().min(1).default(3),
  repMin: z.number().int().min(1).default(8),
  repMax: z.number().int().min(1).default(12),
  restSeconds: z.number().int().min(0).default(120),
  progressionEngine: z.nativeEnum(ProgressionEngine).nullable().optional(),
  intensityTarget: z
    .object({
      rpe: z.number().min(1).max(10).optional(),
      rir: z.number().min(0).max(10).optional(),
      percentOf1RM: z.number().min(0).max(100).optional(),
    })
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
});

// Schema for a slot in a SLOT template
const workoutDaySlotSchema = z.object({
  orderIndex: z.number().int().min(0),
  muscleGroup: z.string().min(1, 'Muscle group is required'),
  exerciseCount: z.number().int().min(1).default(1),
  patternConstraints: z
    .object({
      allowedPatterns: z.array(z.nativeEnum(MovementPattern)).optional(),
      excludedPatterns: z.array(z.nativeEnum(MovementPattern)).optional(),
    })
    .nullable()
    .optional(),
  equipmentConstraints: z
    .object({
      allowedTypes: z.array(z.nativeEnum(ExerciseType)).optional(),
      excludedTypes: z.array(z.nativeEnum(ExerciseType)).optional(),
    })
    .nullable()
    .optional(),
  defaultSets: z.number().int().min(1).default(3),
  defaultRepMin: z.number().int().min(1).default(8),
  defaultRepMax: z.number().int().min(1).default(12),
  notes: z.string().nullable().optional(),
});

// Schema for POST body (create template)
// Supports both FIXED mode (with blocks) and SLOT mode (with slots)
const createTemplateSchema = z
  .object({
    name: z.string().min(1, 'Template name is required').max(100, 'Name too long'),
    mode: z.nativeEnum(TemplateMode).default('FIXED'),
    defaultProgressionEngine: z.nativeEnum(ProgressionEngine).default('DOUBLE_PROGRESSION'),
    notes: z.string().nullable().optional(),
    estimatedMinutes: z.number().int().min(1).nullable().optional(),
    // For FIXED mode templates
    blocks: z.array(workoutDayBlockSchema).optional(),
    // For SLOT mode templates
    slots: z.array(workoutDaySlotSchema).optional(),
  })
  .refine(
    (data) => {
      // FIXED mode requires blocks (can be empty initially)
      if (data.mode === 'FIXED') {
        return data.slots === undefined || data.slots.length === 0;
      }
      // SLOT mode requires slots (can be empty initially)
      if (data.mode === 'SLOT') {
        return data.blocks === undefined || data.blocks.length === 0;
      }
      return true;
    },
    {
      message: 'FIXED mode templates should have blocks, SLOT mode templates should have slots',
    }
  );

// =============================================================================
// GET /api/templates — List user's templates
// =============================================================================
// Returns all workout day templates owned by the authenticated user
// Supports filtering by mode and search

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  // Parse query params
  const { searchParams } = new URL(request.url);
  const queryResult = listTemplatesQuerySchema.safeParse({
    mode: searchParams.get('mode') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: queryResult.error.flatten() },
      { status: 400 }
    );
  }

  const { mode, search } = queryResult.data;

  // Build where clause - always scoped to user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    userId,
  };

  // Apply filters
  if (mode) {
    where.mode = mode;
  }

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    };
  }

  const templates = await prisma.workoutDayTemplate.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }],
    select: {
      id: true,
      name: true,
      mode: true,
      defaultProgressionEngine: true,
      notes: true,
      estimatedMinutes: true,
      createdAt: true,
      updatedAt: true,
      // Include blocks for FIXED templates
      blocks: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          orderIndex: true,
          exerciseId: true,
          exercise: {
            select: {
              id: true,
              name: true,
              type: true,
              pattern: true,
              muscleGroups: true,
            },
          },
          setsPlanned: true,
          repMin: true,
          repMax: true,
          restSeconds: true,
          progressionEngine: true,
          intensityTarget: true,
          notes: true,
        },
      },
      // Include slots for SLOT templates
      slots: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          orderIndex: true,
          muscleGroup: true,
          exerciseCount: true,
          patternConstraints: true,
          equipmentConstraints: true,
          defaultSets: true,
          defaultRepMin: true,
          defaultRepMax: true,
          notes: true,
        },
      },
    },
  });

  return NextResponse.json({ templates });
}

// =============================================================================
// POST /api/templates — Create a new template
// =============================================================================
// Creates a new workout day template owned by the authenticated user
// Supports both FIXED mode (with blocks) and SLOT mode (with slots)

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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = createTemplateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const {
    name,
    mode,
    defaultProgressionEngine,
    notes,
    estimatedMinutes,
    blocks,
    slots,
  } = parseResult.data;

  // Validate that all exercise IDs in blocks belong to the user or are system exercises
  if (blocks && blocks.length > 0) {
    const exerciseIds = blocks.map((b) => b.exerciseId);
    const validExercises = await prisma.exercise.findMany({
      where: {
        id: { in: exerciseIds },
        OR: [{ isCustom: false }, { isCustom: true, ownerUserId: userId }],
      },
      select: { id: true },
    });

    const validExerciseIds = new Set(validExercises.map((e) => e.id));
    const invalidIds = exerciseIds.filter((id) => !validExerciseIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid exercise IDs', invalidIds },
        { status: 400 }
      );
    }
  }

  // Create the template with blocks or slots
  const template = await prisma.workoutDayTemplate.create({
    data: {
      name,
      mode,
      defaultProgressionEngine,
      notes: notes ?? null,
      estimatedMinutes: estimatedMinutes ?? null,
      userId,
      // Create blocks for FIXED mode
      blocks:
        mode === 'FIXED' && blocks && blocks.length > 0
          ? {
              create: blocks.map((block) => ({
                orderIndex: block.orderIndex,
                exercise: { connect: { id: block.exerciseId } },
                setsPlanned: block.setsPlanned,
                repMin: block.repMin,
                repMax: block.repMax,
                restSeconds: block.restSeconds,
                progressionEngine: block.progressionEngine ?? null,
                intensityTarget: block.intensityTarget ?? Prisma.JsonNull,
                notes: block.notes ?? null,
              })),
            }
          : undefined,
      // Create slots for SLOT mode
      slots:
        mode === 'SLOT' && slots && slots.length > 0
          ? {
              create: slots.map((slot) => ({
                orderIndex: slot.orderIndex,
                muscleGroup: slot.muscleGroup,
                exerciseCount: slot.exerciseCount,
                patternConstraints: slot.patternConstraints ?? Prisma.JsonNull,
                equipmentConstraints: slot.equipmentConstraints ?? Prisma.JsonNull,
                defaultSets: slot.defaultSets,
                defaultRepMin: slot.defaultRepMin,
                defaultRepMax: slot.defaultRepMax,
                notes: slot.notes ?? null,
              })),
            }
          : undefined,
    },
    select: {
      id: true,
      name: true,
      mode: true,
      defaultProgressionEngine: true,
      notes: true,
      estimatedMinutes: true,
      createdAt: true,
      updatedAt: true,
      blocks: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          orderIndex: true,
          exerciseId: true,
          exercise: {
            select: {
              id: true,
              name: true,
              type: true,
              pattern: true,
              muscleGroups: true,
            },
          },
          setsPlanned: true,
          repMin: true,
          repMax: true,
          restSeconds: true,
          progressionEngine: true,
          intensityTarget: true,
          notes: true,
        },
      },
      slots: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          orderIndex: true,
          muscleGroup: true,
          exerciseCount: true,
          patternConstraints: true,
          equipmentConstraints: true,
          defaultSets: true,
          defaultRepMin: true,
          defaultRepMax: true,
          notes: true,
        },
      },
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
