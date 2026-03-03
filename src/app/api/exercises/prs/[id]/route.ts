import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// DELETE /api/exercises/prs/[id] — Remove a personal record
// =============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const { id } = await params;

  const existing = await prisma.personalRecord.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Personal record not found' }, { status: 404 });
  }

  await prisma.personalRecord.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
