import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { Weekday } from '@prisma/client';

// =============================================================================
// Zod Schemas for validation
// =============================================================================

// Schema for split ID param validation
const splitIdSchema = z.string().min(1, 'Split ID is required');

// Schema for schedule day input (for updates)
const scheduleDaySchema = z.object({
  weekday: z.nativeEnum(Weekday),
  workoutDayTemplateId: z.string().nullable().optional(),
  isRest: z.boolean().default(false),
  label: z.string().nullable().optional(),
});

// Schema for PUT body (update split)
// All fields optional - only provided fields will be updated
const updateSplitSchema = z.object({
  name: z.string().min(1, 'Split name is required').max(100, 'Name too long').optional(),
  // Note: Use POST /api/splits/:id/activate for activation (Task 3.5)
  // But we allow setting isActive to false here for deactivation
  isActive: z.boolean().optional(),
  // If provided, replaces all schedule days
  scheduleDays: z.array(scheduleDaySchema).optional(),
});

// =============================================================================
// PUT /api/splits/:id — Update an existing split
// =============================================================================
// Updates a split owned by the authenticated user
// If scheduleDays is provided, replaces all existing schedule days

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  // Validate split ID param
  const { id } = await params;
  const splitIdResult = splitIdSchema.safeParse(id);
  if (!splitIdResult.success) {
    return NextResponse.json(
      { error: 'Invalid split ID', details: splitIdResult.error.flatten() },
      { status: 400 }
    );
  }

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

  const parseResult = updateSplitSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { name, isActive, scheduleDays } = parseResult.data;

  // Check if at least one field is being updated
  if (name === undefined && isActive === undefined && scheduleDays === undefined) {
    return NextResponse.json(
      { error: 'No fields to update' },
      { status: 400 }
    );
  }

  // Check if the split exists and belongs to this user
  const existingSplit = await prisma.split.findFirst({
    where: {
      id,
      userId,
    },
    select: { id: true, isActive: true },
  });

  if (!existingSplit) {
    return NextResponse.json(
      { error: 'Split not found' },
      { status: 404 }
    );
  }

  // If activating this split, deactivate all other splits for this user
  if (isActive === true && !existingSplit.isActive) {
    await prisma.split.updateMany({
      where: { userId, isActive: true, id: { not: id } },
      data: { isActive: false },
    });
  }

  // Validate that all referenced template IDs belong to this user (if provided)
  if (scheduleDays) {
    const templateIds = scheduleDays
      .map((day) => day.workoutDayTemplateId)
      .filter((tid): tid is string => tid != null);

    if (templateIds.length > 0) {
      const validTemplates = await prisma.workoutDayTemplate.findMany({
        where: {
          id: { in: templateIds },
          userId,
        },
        select: { id: true },
      });

      const validTemplateIds = new Set(validTemplates.map((t) => t.id));
      const invalidIds = templateIds.filter((tid) => !validTemplateIds.has(tid));

      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: 'Invalid template IDs', invalidIds },
          { status: 400 }
        );
      }
    }
  }

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (name !== undefined) {
    updateData.name = name;
  }

  if (isActive !== undefined) {
    updateData.isActive = isActive;
  }

  // Update in a transaction if schedule days are being replaced
  if (scheduleDays !== undefined) {
    const split = await prisma.$transaction(async (tx) => {
      // Delete existing schedule days
      await tx.splitScheduleDay.deleteMany({
        where: { splitId: id },
      });

      // Update the split and create new schedule days
      return tx.split.update({
        where: { id },
        data: {
          ...updateData,
          scheduleDays: {
            create: scheduleDays.map((day) => ({
              weekday: day.weekday,
              workoutDayTemplateId: day.workoutDayTemplateId ?? null,
              isRest: day.isRest,
              label: day.label ?? null,
            })),
          },
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          scheduleDays: {
            orderBy: { weekday: 'asc' },
            select: {
              id: true,
              weekday: true,
              workoutDayTemplateId: true,
              isRest: true,
              label: true,
              workoutDayTemplate: {
                select: {
                  id: true,
                  name: true,
                  mode: true,
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({ split });
  }

  // Simple update without schedule day changes
  const split = await prisma.split.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      scheduleDays: {
        orderBy: { weekday: 'asc' },
        select: {
          id: true,
          weekday: true,
          workoutDayTemplateId: true,
          isRest: true,
          label: true,
          workoutDayTemplate: {
            select: {
              id: true,
              name: true,
              mode: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ split });
}
