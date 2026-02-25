/**
 * GET /api/versions — List program blocks and routine versions (Task 6.9)
 *
 * Returns:
 *   - programBlocks: each block with its nested routineVersions (desc by versionNumber)
 *   - unlinkedVersions: routine versions with no programBlock, desc by versionNumber
 *
 * All data is scoped to the authenticated user.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  // Fetch all program blocks belonging to this user, newest first,
  // with their routine versions nested and sorted descending.
  const programBlocks = await prisma.programBlock.findMany({
    where: { userId },
    orderBy: { startDate: 'desc' },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      routineVersions: {
        orderBy: { versionNumber: 'desc' },
        select: {
          id: true,
          versionNumber: true,
          changelog: true,
          createdAt: true,
        },
      },
    },
  });

  // Fetch routine versions that are not linked to any program block
  const unlinkedVersions = await prisma.routineVersion.findMany({
    where: { userId, programBlockId: null },
    orderBy: { versionNumber: 'desc' },
    select: {
      id: true,
      versionNumber: true,
      changelog: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ programBlocks, unlinkedVersions });
}
