import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// Zod Schemas for validation
// =============================================================================

// Schema for split ID param validation
const splitIdSchema = z.string().min(1, 'Split ID is required');

// =============================================================================
// POST /api/splits/:id/activate — Activate a split
// =============================================================================
// Activates the specified split for the authenticated user.
// Deactivates any other active split to ensure only one split is active at a time.
// Idempotent: if the split is already active, returns success without changes.

export async function POST(
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

  // If already active, return success (idempotent)
  if (existingSplit.isActive) {
    const split = await prisma.split.findUnique({
      where: { id },
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

    return NextResponse.json({ 
      split,
      message: 'Split is already active',
    });
  }

  // Use a transaction to atomically:
  // 1. Deactivate any currently active splits for this user
  // 2. Activate the specified split
  const split = await prisma.$transaction(async (tx) => {
    // Deactivate all other active splits for this user
    await tx.split.updateMany({
      where: {
        userId,
        isActive: true,
        id: { not: id },
      },
      data: { isActive: false },
    });

    // Activate the specified split
    return tx.split.update({
      where: { id },
      data: { isActive: true },
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

  return NextResponse.json({ 
    split,
    message: 'Split activated successfully',
  });
}
