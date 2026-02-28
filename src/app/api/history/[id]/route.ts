/**
 * GET /api/history/[id] — Fetch a single workout session with full detail
 *
 * Returns the session with all exercises and logged sets for the History
 * detail view (Task 13.3).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const { id: sessionId } = await params;

  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      status: true,
      title: true,
      notes: true,
      split: { select: { id: true, name: true } },
      template: { select: { id: true, name: true, mode: true } },
      exercises: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          orderIndex: true,
          exercise: { select: { id: true, name: true, muscleGroups: true } },
          sets: {
            orderBy: { setIndex: 'asc' },
            select: {
              id: true,
              setIndex: true,
              weight: true,
              reps: true,
              rpe: true,
              flags: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Compute duration
  let durationMinutes: number | null = null;
  if (session.endedAt && session.startedAt) {
    durationMinutes = Math.round(
      (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000
    );
  }

  return NextResponse.json({ session: { ...session, durationMinutes } });
}
