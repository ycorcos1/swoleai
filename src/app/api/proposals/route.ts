/**
 * Task 9.1 — Proposal inbox API
 *
 * GET /api/proposals
 *   List coach proposals for the authenticated user.
 *   Supports filtering by type and status.
 *
 * Response: { proposals: CoachProposal[], pagination: { ... } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// SCHEMA
// =============================================================================

const querySchema = z.object({
  type: z.enum(['NEXT_SESSION', 'WEEKLY', 'PLATEAU', 'GOALS']).optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// =============================================================================
// GET /api/proposals
// =============================================================================

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    type: searchParams.get('type') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { type, status, limit, offset } = parsed.data;

  const where = {
    userId,
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
  };

  const [proposals, total] = await Promise.all([
    prisma.coachProposal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        rationale: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.coachProposal.count({ where }),
  ]);

  return NextResponse.json({
    proposals,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + proposals.length < total,
    },
  });
}
