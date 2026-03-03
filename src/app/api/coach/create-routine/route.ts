/**
 * POST /api/coach/create-routine
 *
 * Takes a short questionnaire (goal, days/week, session length, equipment,
 * focus areas) and asks the AI to design a full weekly split with named
 * workout day templates and exercises.
 *
 * Flow:
 *  1. Validate input
 *  2. Call OpenAI to generate the routine structure
 *  3. For each AI-suggested exercise name, look it up in the exercise catalog
 *     (case-insensitive partial match). If not found, create a custom exercise.
 *  4. Create WorkoutDayTemplates (FIXED mode) with blocks
 *  5. Create the Split with schedule days linked to templates
 *  6. Activate the split (deactivates any existing active split)
 *  7. Return the created split
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { openai, COACH_MODEL } from '@/lib/coach/openai';
import { Weekday } from '@prisma/client';

// =============================================================================
// Input schema
// =============================================================================

const CreateRoutineInputSchema = z.object({
  goal: z.enum(['HYPERTROPHY', 'STRENGTH', 'HYBRID', 'FAT_LOSS']),
  daysPerWeek: z.number().int().min(2).max(6),
  sessionMinutes: z.number().int().min(30).max(120),
  equipment: z.enum(['COMMERCIAL', 'HOME', 'BODYWEIGHT']),
  focusAreas: z.array(z.string()).max(3).optional().default([]),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('INTERMEDIATE'),
});

type CreateRoutineInput = z.infer<typeof CreateRoutineInputSchema>;

// =============================================================================
// AI output schema (what we expect OpenAI to return)
// =============================================================================

const AIExerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().min(1).max(10),
  repMin: z.number().int().min(1).max(50),
  repMax: z.number().int().min(1).max(50),
  restSeconds: z.number().int().min(30).max(300),
});

const AIWorkoutDaySchema = z.object({
  weekday: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
  isRest: z.boolean(),
  label: z.string().optional(),
  exercises: z.array(AIExerciseSchema).max(12).optional().default([]),
});

// Map short weekday codes to Prisma Weekday enum values
const WEEKDAY_MAP: Record<string, Weekday> = {
  MON: 'MONDAY',
  TUE: 'TUESDAY',
  WED: 'WEDNESDAY',
  THU: 'THURSDAY',
  FRI: 'FRIDAY',
  SAT: 'SATURDAY',
  SUN: 'SUNDAY',
};

const AIRoutineSchema = z.object({
  splitName: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  days: z.array(AIWorkoutDaySchema).min(7).max(7),
});

type AIRoutine = z.infer<typeof AIRoutineSchema>;

// =============================================================================
// System prompt
// =============================================================================

function buildSystemPrompt(input: CreateRoutineInput): string {
  const equipmentMap = {
    COMMERCIAL: 'full commercial gym (barbells, dumbbells, cables, machines)',
    HOME: 'home gym (dumbbells, resistance bands, pull-up bar)',
    BODYWEIGHT: 'bodyweight only (no equipment)',
  };

  const goalMap = {
    HYPERTROPHY: 'muscle hypertrophy (size)',
    STRENGTH: 'maximal strength',
    HYBRID: 'hybrid strength and hypertrophy',
    FAT_LOSS: 'fat loss while preserving muscle',
  };

  const levelMap = {
    BEGINNER: 'beginner (less than 1 year of consistent training)',
    INTERMEDIATE: 'intermediate (1-3 years)',
    ADVANCED: 'advanced (3+ years)',
  };

  return `You are SwoleAI, an expert strength and hypertrophy coach. Design a complete weekly workout routine.

User profile:
- Goal: ${goalMap[input.goal]}
- Training days per week: ${input.daysPerWeek}
- Session length: ${input.sessionMinutes} minutes
- Equipment: ${equipmentMap[input.equipment]}
- Experience level: ${levelMap[input.experienceLevel]}
${input.focusAreas.length > 0 ? `- Focus areas: ${input.focusAreas.join(', ')}` : ''}

Rules:
- Return EXACTLY 7 days (MON through SUN). Rest days must have isRest: true and empty exercises array.
- Training days must have isRest: false and a non-empty exercises array.
- Use exactly ${input.daysPerWeek} training days and ${7 - input.daysPerWeek} rest days.
- Keep exercise count per session appropriate for ${input.sessionMinutes} min sessions.
- Use real, well-known exercise names (e.g. "Barbell Back Squat", "Incline Dumbbell Press").
- Only suggest exercises achievable with: ${equipmentMap[input.equipment]}.
- Provide realistic sets/reps for the goal and experience level.
- Give each training day a descriptive label (e.g. "Push A", "Lower Body", "Pull Day").
- Return ONLY valid JSON matching the schema exactly. No markdown, no prose.

Schema:
{
  "splitName": "string",
  "description": "optional string",
  "days": [
    {
      "weekday": "MON|TUE|WED|THU|FRI|SAT|SUN",
      "isRest": boolean,
      "label": "optional string",
      "exercises": [
        {
          "name": "string",
          "sets": integer,
          "repMin": integer,
          "repMax": integer,
          "restSeconds": integer
        }
      ]
    }
  ]
}`;
}

// =============================================================================
// Exercise lookup / creation helper
// =============================================================================

async function resolveExerciseId(name: string, userId: string): Promise<string> {
  // Try case-insensitive match in system + user exercises
  const match = await prisma.exercise.findFirst({
    where: {
      name: { contains: name, mode: 'insensitive' },
      OR: [{ isCustom: false }, { isCustom: true, ownerUserId: userId }],
    },
    select: { id: true },
    orderBy: { isCustom: 'asc' }, // prefer system exercises
  });

  if (match) return match.id;

  // Create a custom exercise if not found
  const created = await prisma.exercise.create({
    data: {
      name,
      type: 'OTHER',
      pattern: 'OTHER',
      muscleGroups: [],
      equipmentTags: [],
      jointStressFlags: {},
      isCustom: true,
      ownerUserId: userId,
    },
    select: { id: true },
  });

  return created.id;
}

// =============================================================================
// Handler
// =============================================================================

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  // 1. Validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CreateRoutineInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  // 2. Call OpenAI
  let aiRoutine: AIRoutine;
  try {
    const completion = await openai.chat.completions.create({
      model: COACH_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(input) },
        {
          role: 'user',
          content: `Create a ${input.daysPerWeek}-day per week routine for my goal of ${input.goal}.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsedJson = JSON.parse(raw);
    const validated = AIRoutineSchema.safeParse(parsedJson);

    if (!validated.success) {
      console.error('[coach/create-routine] AI schema validation failed:', validated.error.flatten());
      return NextResponse.json(
        { error: 'AI output failed validation', message: 'Failed to generate routine. Please try again.' },
        { status: 422 }
      );
    }

    aiRoutine = validated.data;
  } catch (err) {
    console.error('[coach/create-routine] OpenAI error:', err);
    return NextResponse.json(
      { error: 'AI service error', message: 'Failed to generate routine. Please try again.' },
      { status: 502 }
    );
  }

  // 3. Create templates and resolve exercises
  try {
    const templateMap = new Map<string, string>(); // weekday -> templateId

    for (const day of aiRoutine.days) {
      if (day.isRest || !day.exercises || day.exercises.length === 0) continue;

      // Resolve exercise IDs in parallel
      const exerciseIds = await Promise.all(
        day.exercises.map((ex) => resolveExerciseId(ex.name, userId))
      );

      // Create the WorkoutDayTemplate with blocks
      const template = await prisma.workoutDayTemplate.create({
        data: {
          name: day.label ?? `${day.weekday} Workout`,
          mode: 'FIXED',
          defaultProgressionEngine: input.goal === 'STRENGTH' ? 'STRAIGHT_SETS' : 'DOUBLE_PROGRESSION',
          estimatedMinutes: input.sessionMinutes,
          userId,
          blocks: {
            create: day.exercises.map((ex, i) => ({
              orderIndex: i,
              exercise: { connect: { id: exerciseIds[i] } },
              setsPlanned: ex.sets,
              repMin: ex.repMin,
              repMax: ex.repMax,
              restSeconds: ex.restSeconds,
            })),
          },
        },
        select: { id: true },
      });

      templateMap.set(day.weekday, template.id);
    }

    // 4. Deactivate existing active splits
    await prisma.split.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // 5. Create the split with schedule days
    const split = await prisma.split.create({
      data: {
        name: aiRoutine.splitName,
        isActive: true,
        userId,
        scheduleDays: {
          create: aiRoutine.days.map((day) => ({
            weekday: WEEKDAY_MAP[day.weekday],
            isRest: day.isRest,
            label: day.label ?? null,
            workoutDayTemplateId: templateMap.get(day.weekday) ?? null,
          })),
        },
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        scheduleDays: {
          orderBy: { weekday: 'asc' },
          select: {
            weekday: true,
            isRest: true,
            label: true,
            workoutDayTemplate: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(
      { split, description: aiRoutine.description ?? null },
      { status: 201 }
    );
  } catch (err) {
    console.error('[coach/create-routine] DB error:', err);
    return NextResponse.json(
      { error: 'Database error', message: 'Failed to save routine. Please try again.' },
      { status: 503 }
    );
  }
}
