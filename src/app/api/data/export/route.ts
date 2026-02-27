import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});

// =============================================================================
// GET /api/data/export — Export user data as JSON or CSV
// =============================================================================

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  const searchParams = request.nextUrl.searchParams;
  const parseResult = exportQuerySchema.safeParse({
    format: searchParams.get('format') ?? 'json',
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { format } = parseResult.data;

  // Fetch all user data
  const [user, sessions, favorites] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        goalMode: true,
        daysPerWeek: true,
        sessionMinutes: true,
        units: true,
        equipment: true,
        constraints: true,
        onboardingComplete: true,
      },
    }),
    prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: {
        split: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, mode: true } },
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: {
            exercise: { select: { id: true, name: true, type: true, pattern: true, muscleGroups: true } },
            sets: {
              orderBy: { setIndex: 'asc' },
              select: {
                setIndex: true,
                weight: true,
                reps: true,
                rpe: true,
                flags: true,
                notes: true,
                createdAt: true,
              },
            },
          },
        },
      },
    }),
    prisma.favorite.findMany({
      where: { userId },
      include: {
        exercise: { select: { id: true, name: true, type: true, pattern: true, muscleGroups: true } },
      },
    }),
  ]);

  const exportedAt = new Date().toISOString();

  if (format === 'csv') {
    const rows: string[] = [
      'session_id,session_title,started_at,ended_at,status,split_name,template_name,exercise_name,set_index,weight,reps,rpe,flags,set_notes',
    ];

    for (const session of sessions) {
      for (const ex of session.exercises) {
        if (ex.sets.length === 0) {
          rows.push(
            [
              session.id,
              csvEscape(session.title ?? ''),
              session.startedAt.toISOString(),
              session.endedAt?.toISOString() ?? '',
              session.status,
              csvEscape(session.split?.name ?? ''),
              csvEscape(session.template?.name ?? ''),
              csvEscape(ex.exercise.name),
              '',
              '',
              '',
              '',
              '',
              '',
            ].join(',')
          );
        } else {
          for (const set of ex.sets) {
            rows.push(
              [
                session.id,
                csvEscape(session.title ?? ''),
                session.startedAt.toISOString(),
                session.endedAt?.toISOString() ?? '',
                session.status,
                csvEscape(session.split?.name ?? ''),
                csvEscape(session.template?.name ?? ''),
                csvEscape(ex.exercise.name),
                set.setIndex,
                set.weight,
                set.reps,
                set.rpe ?? '',
                csvEscape(JSON.stringify(set.flags)),
                csvEscape(set.notes ?? ''),
              ].join(',')
            );
          }
        }
      }
    }

    const csv = rows.join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="swoleai-export-${exportedAt.slice(0, 10)}.csv"`,
      },
    });
  }

  // Default: JSON export
  const payload = {
    exportedAt,
    version: '1',
    user,
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      status: s.status,
      notes: s.notes,
      constraintFlags: s.constraintFlags,
      split: s.split,
      template: s.template,
      exercises: s.exercises.map((ex) => ({
        orderIndex: ex.orderIndex,
        notes: ex.notes,
        exercise: ex.exercise,
        sets: ex.sets,
      })),
    })),
    favorites: favorites.map((f) => ({
      priority: f.priority,
      tags: f.tags,
      exercise: f.exercise,
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="swoleai-export-${exportedAt.slice(0, 10)}.json"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
