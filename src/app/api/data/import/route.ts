import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// Zod schema for import payload
// =============================================================================

const importSetSchema = z.object({
  setIndex: z.number().int().min(0),
  weight: z.number().min(0),
  reps: z.number().int().min(0),
  rpe: z.number().min(1).max(10).nullable().optional(),
  flags: z.record(z.string(), z.unknown()).optional().default({}),
  notes: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

const importExerciseSchema = z.object({
  orderIndex: z.number().int().min(0),
  notes: z.string().nullable().optional(),
  exercise: z.object({
    name: z.string().min(1),
    type: z.string().optional(),
    pattern: z.string().optional(),
    muscleGroups: z.array(z.string()).optional().default([]),
  }),
  sets: z.array(importSetSchema),
});

const importSessionSchema = z.object({
  title: z.string().nullable().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ABANDONED']).default('COMPLETED'),
  notes: z.string().nullable().optional(),
  constraintFlags: z.record(z.string(), z.unknown()).optional().default({}),
  exercises: z.array(importExerciseSchema),
});

const importPayloadSchema = z.object({
  version: z.string().optional(),
  sessions: z.array(importSessionSchema).max(500),
});

// =============================================================================
// POST /api/data/import — Import workout history from JSON
// =============================================================================

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = importPayloadSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { sessions } = parseResult.data;

  let importedCount = 0;
  const errors: string[] = [];

  for (const sessionData of sessions) {
    try {
      await prisma.$transaction(async (tx) => {
        // Create the session
        const session = await tx.workoutSession.create({
            data: {
                userId,
                title: sessionData.title ?? null,
                startedAt: new Date(sessionData.startedAt),
                endedAt: sessionData.endedAt ? new Date(sessionData.endedAt) : null,
                status: sessionData.status,
                notes: sessionData.notes ?? null,
                constraintFlags: (sessionData.constraintFlags ?? {}) as Prisma.InputJsonValue,
              },
        });

        // Create exercises + sets
        for (const exData of sessionData.exercises) {
          // Find or create the exercise by name (system-level lookup, then user custom)
          let exercise = await tx.exercise.findFirst({
            where: {
              name: { equals: exData.exercise.name, mode: 'insensitive' },
              OR: [{ isCustom: false }, { ownerUserId: userId }],
            },
          });

          if (!exercise) {
            exercise = await tx.exercise.create({
              data: {
                name: exData.exercise.name,
                isCustom: true,
                ownerUserId: userId,
                muscleGroups: exData.exercise.muscleGroups ?? [],
                equipmentTags: [],
                jointStressFlags: {},
              },
            });
          }

          const workoutExercise = await tx.workoutExercise.create({
            data: {
              sessionId: session.id,
              exerciseId: exercise.id,
              orderIndex: exData.orderIndex,
              notes: exData.notes ?? null,
            },
          });

          if (exData.sets.length > 0) {
            await tx.workoutSet.createMany({
              data: exData.sets.map((set) => ({
                workoutExerciseId: workoutExercise.id,
                setIndex: set.setIndex,
                weight: set.weight,
                reps: set.reps,
                rpe: set.rpe ?? null,
                flags: (set.flags ?? {}) as Prisma.InputJsonValue,
                notes: set.notes ?? null,
              })),
            });
          }
        }
      });

      importedCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Session "${sessionData.title ?? sessionData.startedAt}": ${msg}`);
    }
  }

  return NextResponse.json(
    {
      imported: importedCount,
      total: sessions.length,
      errors: errors.length > 0 ? errors : undefined,
    },
    { status: 200 }
  );
}
