import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// DELETE /api/data/account — Delete user account and all associated data
// =============================================================================
// Cascade deletes are handled by the Prisma schema (onDelete: Cascade on all
// relations pointing to User). Deleting the User row removes everything.

export async function DELETE() {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  await prisma.user.delete({
    where: { id: userId },
  });

  return NextResponse.json({ deleted: true }, { status: 200 });
}
