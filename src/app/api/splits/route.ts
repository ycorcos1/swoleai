import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { Weekday } from '@prisma/client';

// =============================================================================
// Zod Schemas for validation
// =============================================================================

// Schema for GET query params
const listSplitsQuerySchema = z.object({
  // Filter to only show active split
  activeOnly: z.enum(['true', 'false']).optional(),
});

// Schema for schedule day input
const scheduleDaySchema = z.object({
  weekday: z.nativeEnum(Weekday),
  workoutDayTemplateId: z.string().nullable().optional(),
  isRest: z.boolean().default(false),
  label: z.string().nullable().optional(),
});

// Schema for POST body (create split)
const createSplitSchema = z.object({
  name: z.string().min(1, 'Split name is required').max(100, 'Name too long'),
  // Optionally activate this split immediately
  isActive: z.boolean().default(false),
  // Optional schedule days (can add later)
  scheduleDays: z.array(scheduleDaySchema).optional().default([]),
});

// =============================================================================
// GET /api/splits — List user's splits
// =============================================================================
// Returns all splits owned by the authenticated user
// Supports filtering by activeOnly

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  // Parse query params
  const { searchParams } = new URL(request.url);
  const queryResult = listSplitsQuerySchema.safeParse({
    activeOnly: searchParams.get('activeOnly') ?? undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: queryResult.error.flatten() },
      { status: 400 }
    );
  }

  const { activeOnly } = queryResult.data;

  // Build where clause - always scoped to user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    userId,
  };

  // Apply filters
  if (activeOnly === 'true') {
    where.isActive = true;
  }

  const splits = await prisma.split.findMany({
    where,
    orderBy: [
      { isActive: 'desc' }, // Active split first
      { updatedAt: 'desc' }, // Most recently updated next
    ],
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

  return NextResponse.json({ splits });
}

// =============================================================================
// POST /api/splits — Create a new split
// =============================================================================
// Creates a new split owned by the authenticated user
// Optionally includes schedule days

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

  const parseResult = createSplitSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { name, isActive, scheduleDays } = parseResult.data;

  // If this split should be active, deactivate all other splits for this user
  if (isActive) {
    await prisma.split.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }

  // Validate that all referenced template IDs belong to this user (if provided)
  const templateIds = scheduleDays
    .map((day) => day.workoutDayTemplateId)
    .filter((id): id is string => id != null);

  if (templateIds.length > 0) {
    const validTemplates = await prisma.workoutDayTemplate.findMany({
      where: {
        id: { in: templateIds },
        userId,
      },
      select: { id: true },
    });

    const validTemplateIds = new Set(validTemplates.map((t) => t.id));
    const invalidIds = templateIds.filter((id) => !validTemplateIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid template IDs', invalidIds },
        { status: 400 }
      );
    }
  }

  // Create the split with schedule days
  const split = await prisma.split.create({
    data: {
      name,
      isActive,
      userId,
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

  return NextResponse.json({ split }, { status: 201 });
}
