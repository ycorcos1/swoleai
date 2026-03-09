import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const session = await prisma.workoutSession.findFirst({
    where: { id: params.id, userId },
    include: {
      exercises: {
        orderBy: { orderIndex: 'asc' },
        include: {
          exercise: { select: { id: true, name: true } },
          sets: {
            orderBy: { setIndex: 'asc' },
            select: {
              id: true,
              setIndex: true,
              reps: true,
              weightKg: true,
              rpe: true,
              notes: true,
              completedAt: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ session });
}
