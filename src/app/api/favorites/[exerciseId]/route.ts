import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { FavoritePriority } from '@prisma/client';

// =============================================================================
// Zod Schemas for validation
// =============================================================================

// Schema for POST body (optional: allows setting priority and tags when favoriting)
const toggleFavoriteSchema = z.object({
  // Priority for slot filling (PRIMARY exercises chosen before BACKUP)
  priority: z.nativeEnum(FavoritePriority).optional().default('PRIMARY'),
  // Optional tags for organization (e.g., ["chest_day", "push"])
  tags: z.array(z.string()).optional().default([]),
}).optional();

// Schema for exerciseId param validation
const exerciseIdSchema = z.string().min(1, 'Exercise ID is required');

// =============================================================================
// POST /api/favorites/:exerciseId — Toggle favorite
// =============================================================================
// Toggles favorite status for an exercise:
// - If not favorited: creates favorite with provided priority/tags
// - If already favorited: removes the favorite
// Returns the current favorite state (favorited: true/false)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  // Validate exerciseId param
  const { exerciseId } = await params;
  const exerciseIdResult = exerciseIdSchema.safeParse(exerciseId);
  if (!exerciseIdResult.success) {
    return NextResponse.json(
      { error: 'Invalid exercise ID', details: exerciseIdResult.error.flatten() },
      { status: 400 }
    );
  }

  // Parse optional body (for priority/tags when favoriting)
  let body: z.infer<typeof toggleFavoriteSchema> = { priority: 'PRIMARY', tags: [] };
  try {
    const rawBody = await request.text();
    if (rawBody) {
      const parsedBody = JSON.parse(rawBody);
      const bodyResult = toggleFavoriteSchema.safeParse(parsedBody);
      if (!bodyResult.success) {
        return NextResponse.json(
          { error: 'Invalid body', details: bodyResult.error.flatten() },
          { status: 400 }
        );
      }
      body = bodyResult.data ?? { priority: 'PRIMARY', tags: [] };
    }
  } catch {
    // If body parsing fails, use defaults (empty body is valid for toggle)
  }

  const priority = body?.priority ?? 'PRIMARY';
  const tags = body?.tags ?? [];

  // Verify exercise exists and is accessible by this user
  // (system exercises OR user's own custom exercises)
  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [
        { isCustom: false }, // System exercise
        { isCustom: true, ownerUserId: userId }, // User's own custom exercise
      ],
    },
    select: { id: true, name: true },
  });

  if (!exercise) {
    return NextResponse.json(
      { error: 'Exercise not found or not accessible' },
      { status: 404 }
    );
  }

  // Check if favorite already exists
  const existingFavorite = await prisma.favorite.findUnique({
    where: {
      userId_exerciseId: {
        userId,
        exerciseId,
      },
    },
  });

  if (existingFavorite) {
    // Already favorited → remove favorite (toggle off)
    await prisma.favorite.delete({
      where: {
        id: existingFavorite.id,
      },
    });

    return NextResponse.json({
      favorited: false,
      exerciseId,
      message: 'Exercise removed from favorites',
    });
  } else {
    // Not favorited → add favorite (toggle on)
    const newFavorite = await prisma.favorite.create({
      data: {
        userId,
        exerciseId,
        priority,
        tags: tags as string[],
      },
      select: {
        id: true,
        priority: true,
        tags: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      favorited: true,
      exerciseId,
      favorite: newFavorite,
      message: 'Exercise added to favorites',
    });
  }
}
