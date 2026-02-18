import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// Zod Schema for validation
// =============================================================================

// Schema for GET query params (history filters)
// Supports date range filtering for workout history
const historyQuerySchema = z.object({
  // Start date for date range filter (ISO 8601 string)
  startDate: z.string().datetime().optional(),
  // End date for date range filter (ISO 8601 string)
  endDate: z.string().datetime().optional(),
  // Limit number of results (default 50, max 100)
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  // Offset for pagination
  offset: z.coerce.number().int().min(0).optional().default(0),
  // Filter by session status (optional)
  status: z.enum(['ACTIVE', 'COMPLETED', 'ABANDONED']).optional(),
});

// =============================================================================
// GET /api/history — List workout sessions
// =============================================================================
// Returns completed workout sessions for the authenticated user.
// Supports filtering by date range, status, and pagination.
// Sessions are sorted by startedAt in descending order (most recent first).

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
    status: searchParams.get('status') ?? undefined,
  };

  const parseResult = historyQuerySchema.safeParse(queryParams);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { startDate, endDate, limit, offset, status } = parseResult.data;

  // Build where clause for filtering
  const whereClause: {
    userId: string;
    startedAt?: { gte?: Date; lte?: Date };
    status?: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  } = {
    userId,
  };

  // Apply date range filter if provided
  if (startDate || endDate) {
    whereClause.startedAt = {};
    if (startDate) {
      whereClause.startedAt.gte = new Date(startDate);
    }
    if (endDate) {
      whereClause.startedAt.lte = new Date(endDate);
    }
  }

  // Apply status filter if provided
  if (status) {
    whereClause.status = status;
  }

  // Fetch sessions with related data
  const [sessions, totalCount] = await Promise.all([
    prisma.workoutSession.findMany({
      where: whereClause,
      orderBy: {
        startedAt: 'desc', // Most recent first
      },
      skip: offset,
      take: limit,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        status: true,
        title: true,
        notes: true,
        constraintFlags: true,
        createdAt: true,
        updatedAt: true,
        // Include related split and template data
        split: {
          select: {
            id: true,
            name: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            mode: true,
          },
        },
        // Include exercise summary with set counts
        exercises: {
          select: {
            id: true,
            orderIndex: true,
            exercise: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                sets: true,
              },
            },
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    }),
    prisma.workoutSession.count({
      where: whereClause,
    }),
  ]);

  // Calculate duration for each session and format response
  const formattedSessions = sessions.map((session) => {
    let durationMinutes: number | null = null;
    if (session.endedAt && session.startedAt) {
      durationMinutes = Math.round(
        (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000
      );
    }

    // Calculate total sets and exercises count
    const totalExercises = session.exercises.length;
    const totalSets = session.exercises.reduce(
      (sum, ex) => sum + ex._count.sets,
      0
    );

    return {
      ...session,
      durationMinutes,
      summary: {
        totalExercises,
        totalSets,
      },
    };
  });

  return NextResponse.json({
    sessions: formattedSessions,
    pagination: {
      total: totalCount,
      limit,
      offset,
      hasMore: offset + sessions.length < totalCount,
    },
  });
}
