import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// GET /api/favorites — List user's favorite exercises
// =============================================================================
// Returns all favorites for the authenticated user, with full exercise details.
// PRIMARY priority favorites are returned before BACKUP ones.

export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      exercise: {
        select: {
          id: true,
          name: true,
          type: true,
          pattern: true,
          muscleGroups: true,
          isCustom: true,
        },
      },
    },
    orderBy: [
      // PRIMARY before BACKUP: 'desc' because alphabetically BACKUP < PRIMARY
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  return NextResponse.json({ favorites });
}
