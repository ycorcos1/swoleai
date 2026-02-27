/**
 * Task 9.8 — Accept a coach proposal
 *
 * POST /api/proposals/[id]/accept
 *
 * For proposals with patch ops (WEEKLY, PLATEAU):
 *   1. Applies patch operations to the database.
 *   2. Creates a new RoutineVersion snapshot.
 *   3. Marks the proposal as ACCEPTED.
 *
 * For proposals without patch ops (NEXT_SESSION, GOALS):
 *   Simply marks the proposal as ACCEPTED.
 *
 * Acceptance Criteria: Accept updates routine version and marks proposal accepted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { applyOpsAndCreateVersion } from '@/lib/versions/patch';
import type { PatchOp } from '@/lib/versions/patch';
import { WeeklyProposalSchema, PlateauProposalSchema } from '@/lib/coach/schemas';

// =============================================================================
// HANDLER
// =============================================================================

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;
  const { id } = await params;

  // 1. Fetch proposal
  const proposal = await prisma.coachProposal.findFirst({
    where: { id, userId },
    select: { id: true, type: true, status: true, proposalJson: true },
  });

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (proposal.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'Proposal has already been reviewed' },
      { status: 409 }
    );
  }

  // 2. Extract patch ops if applicable
  let patchOps: PatchOp[] = [];
  let changelog = `Accepted ${proposal.type.toLowerCase().replace('_', ' ')} proposal`;

  if (proposal.type === 'WEEKLY') {
    const parsed = WeeklyProposalSchema.safeParse(proposal.proposalJson);
    if (parsed.success) {
      patchOps = parsed.data.patches as PatchOp[];
      changelog = `Accepted weekly check-in: ${parsed.data.rationale.slice(0, 200)}`;
    }
  } else if (proposal.type === 'PLATEAU') {
    const parsed = PlateauProposalSchema.safeParse(proposal.proposalJson);
    if (parsed.success) {
      patchOps = parsed.data.interventions.flatMap((i) => i.patches) as PatchOp[];
      changelog = `Accepted plateau intervention: ${parsed.data.overallDiagnosis.slice(0, 200)}`;
    }
  }

  // 3. Apply patch ops + create version (if any ops exist)
  let newVersionId: string | null = null;

  if (patchOps.length > 0) {
    try {
      const version = await applyOpsAndCreateVersion(userId, patchOps, {
        changelog,
        proposalId: proposal.id,
      });
      newVersionId = version.id;
    } catch (err) {
      console.error('[proposals/accept] Error applying patch ops:', err);
      return NextResponse.json(
        {
          error: 'Failed to apply patch operations',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
        { status: 422 }
      );
    }
  }

  // 4. Mark proposal as ACCEPTED
  const updated = await prisma.coachProposal.update({
    where: { id: proposal.id },
    data: { status: 'ACCEPTED' },
    select: {
      id: true,
      type: true,
      status: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    proposal: updated,
    newVersionId,
    patchOpsApplied: patchOps.length,
  });
}
