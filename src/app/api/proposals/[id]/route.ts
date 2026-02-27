/**
 * Task 9.1 — Proposal detail API
 *
 * GET /api/proposals/[id]
 *   Returns full proposal details (including proposalJson) for the authenticated user.
 *
 * PATCH /api/proposals/[id]
 *   Update proposal status (ACCEPTED or REJECTED) directly.
 *   Accept flow with patch ops is handled by the proposal review UI via the
 *   /api/proposals/[id]/accept endpoint (Task 9.8).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// SCHEMA
// =============================================================================

const patchBodySchema = z.object({
  status: z.enum(['REJECTED']),
});

// =============================================================================
// GET /api/proposals/[id]
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;
  const { id } = await params;

  const proposal = await prisma.coachProposal.findFirst({
    where: { id, userId },
    select: {
      id: true,
      type: true,
      status: true,
      proposalJson: true,
      rationale: true,
      inputSummaryHash: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  return NextResponse.json({ proposal });
}

// =============================================================================
// PATCH /api/proposals/[id] — Reject a proposal
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify ownership and pending status
  const existing = await prisma.coachProposal.findFirst({
    where: { id, userId },
    select: { id: true, status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (existing.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'Proposal has already been reviewed' },
      { status: 409 }
    );
  }

  const updated = await prisma.coachProposal.update({
    where: { id },
    data: { status: parsed.data.status },
    select: {
      id: true,
      type: true,
      status: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ proposal: updated });
}
