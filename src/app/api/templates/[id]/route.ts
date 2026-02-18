import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  ProgressionEngine,
  MovementPattern,
  ExerciseType,
  Prisma,
} from '@prisma/client';

// =============================================================================
// Zod Schemas for validation
// =============================================================================

// Schema for template ID param validation
const templateIdSchema = z.string().min(1, 'Template ID is required');

// Schema for a block in a FIXED template (for updates)
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

// Schema for a slot in a SLOT template (for updates)
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

// Schema for PUT body (update template)
// All fields optional - only provided fields will be updated
// Note: mode cannot be changed after creation
const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Name too long').optional(),
  defaultProgressionEngine: z.nativeEnum(ProgressionEngine).optional(),
  notes: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().min(1).nullable().optional(),
  // For FIXED mode templates - if provided, replaces all existing blocks
  blocks: z.array(workoutDayBlockSchema).optional(),
  // For SLOT mode templates - if provided, replaces all existing slots
  slots: z.array(workoutDaySlotSchema).optional(),
});

// =============================================================================
// PUT /api/templates/:id — Update an existing template
// =============================================================================
// Updates a template owned by the authenticated user
// If blocks/slots are provided, replaces all existing blocks/slots
// Note: Template mode cannot be changed after creation

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  // Validate template ID param
  const { id } = await params;
  const templateIdResult = templateIdSchema.safeParse(id);
  if (!templateIdResult.success) {
    return NextResponse.json(
      { error: 'Invalid template ID', details: templateIdResult.error.flatten() },
      { status: 400 }
    );
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = updateTemplateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { name, defaultProgressionEngine, notes, estimatedMinutes, blocks, slots } =
    parseResult.data;

  // Check if at least one field is being updated
  if (
    name === undefined &&
    defaultProgressionEngine === undefined &&
    notes === undefined &&
    estimatedMinutes === undefined &&
    blocks === undefined &&
    slots === undefined
  ) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // Check if the template exists and belongs to this user
  const existingTemplate = await prisma.workoutDayTemplate.findFirst({
    where: {
      id,
      userId,
    },
    select: { id: true, mode: true },
  });

  if (!existingTemplate) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Validate mode-appropriate data
  // FIXED templates should only have blocks, SLOT templates should only have slots
  if (existingTemplate.mode === 'FIXED' && slots && slots.length > 0) {
    return NextResponse.json(
      { error: 'Cannot add slots to a FIXED mode template. Use blocks instead.' },
      { status: 400 }
    );
  }

  if (existingTemplate.mode === 'SLOT' && blocks && blocks.length > 0) {
    return NextResponse.json(
      { error: 'Cannot add blocks to a SLOT mode template. Use slots instead.' },
      { status: 400 }
    );
  }

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
    const invalidIds = exerciseIds.filter((eid) => !validExerciseIds.has(eid));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid exercise IDs', invalidIds },
        { status: 400 }
      );
    }
  }

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (name !== undefined) {
    updateData.name = name;
  }

  if (defaultProgressionEngine !== undefined) {
    updateData.defaultProgressionEngine = defaultProgressionEngine;
  }

  if (notes !== undefined) {
    updateData.notes = notes;
  }

  if (estimatedMinutes !== undefined) {
    updateData.estimatedMinutes = estimatedMinutes;
  }

  // Update in a transaction if blocks or slots are being replaced
  const needsTransaction = blocks !== undefined || slots !== undefined;

  if (needsTransaction) {
    const template = await prisma.$transaction(async (tx) => {
      // Delete existing blocks if replacing
      if (blocks !== undefined && existingTemplate.mode === 'FIXED') {
        await tx.workoutDayBlock.deleteMany({
          where: { templateId: id },
        });
      }

      // Delete existing slots if replacing
      if (slots !== undefined && existingTemplate.mode === 'SLOT') {
        await tx.workoutDaySlot.deleteMany({
          where: { templateId: id },
        });
      }

      // Update the template and create new blocks/slots
      return tx.workoutDayTemplate.update({
        where: { id },
        data: {
          ...updateData,
          // Create new blocks for FIXED mode
          blocks:
            blocks !== undefined && existingTemplate.mode === 'FIXED'
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
          // Create new slots for SLOT mode
          slots:
            slots !== undefined && existingTemplate.mode === 'SLOT'
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
    });

    return NextResponse.json({ template });
  }

  // Simple update without blocks/slots changes
  const template = await prisma.workoutDayTemplate.update({
    where: { id },
    data: updateData,
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

  return NextResponse.json({ template });
}
