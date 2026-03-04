/**
 * Task 9.4 — Coach endpoint: Next Session Plan
 *
 * POST /api/coach/next-session
 *
 * Builds a compact training summary, calls OpenAI to produce a structured
 * next-session plan, validates the output with the Zod schema, and stores
 * it as a PENDING CoachProposal.
 *
 * Idempotent if the input summary hash matches an existing PENDING proposal
 * of the same type — returns the cached proposal instead of re-calling OpenAI.
 *
 * Acceptance Criteria: Produces a pending proposal that renders in UI.
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { buildTrainingSummary, hashSummary } from '@/lib/coach/training-summary';
import { NextSessionProposalSchema } from '@/lib/coach/schemas';
import { openai, COACH_MODEL } from '@/lib/coach/openai';

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are SwoleAI, an expert strength and hypertrophy coach.
Your task is to plan the user's training session for TODAY based on their active split schedule.

## Step 1 — Identify today's session
The training summary includes a "today" field with the current weekday and the matching schedule entry.
- If today is a rest day (isRest: true), respond with sessionTitle "Rest Day", an empty exercises array, and a short note.
- Otherwise, use today.scheduleDay.templateName to identify which day template to execute.
- Find that template in "currentTemplates" by name, then use ALL its exercises as the basis for the session.

## Step 2 — Understand the split type
Common split patterns and their muscle groups per day:
- **PPL (Push/Pull/Legs)**: Push = chest, front delts, side delts, triceps | Pull = back (lats, mid back), rear delts, biceps | Legs = quads, hamstrings, glutes, calves
- **Upper/Lower**: Upper = chest, back, shoulders, biceps, triceps | Lower = quads, hamstrings, glutes, calves, abs
- **Arnold Split (6-day)**: Chest+Back | Shoulders+Arms | Legs (repeated twice)
- **Full Body**: all major muscle groups each session
- **Bro Split**: one muscle group per day (Chest day, Back day, Leg day, Shoulder day, Arms day)
Use the split name and today's template label to understand which muscles to focus on.

## Step 3 — Build the full session
- Start with ALL exercises in the template for today. Do NOT omit any template exercises.
- Use the exact exerciseId values from the template (provided in currentTemplates.exercises[].exerciseId).
- You may add 1–2 additional exercises if needed to cover a muscle group adequately or if session_minutes allows.
- Follow the template's setsPlanned / repMin / repMax as the default, adjusting based on intent (see below).

## Step 4 — Exercise selection rules
1. **Favorites first**: The summary includes a "favorites" list per muscle group with priority (PRIMARY or BACKUP) and intent (progression | hypertrophy | auto).
   - For any additional exercises beyond the template, prefer PRIMARY favorites, then BACKUP favorites.
   - If the user has no favorites for a muscle group, choose appropriate exercises from their history.

2. **Avoid repetition**: "recentSessionHistory" lists the last 4 sessions' exercises.
   - Do NOT repeat an exercise used in the MOST RECENT session for the same muscle group if alternatives exist.

3. **Coaching intent per exercise**:
   - **progression**: Apply progressive overload. If the user's last top set was X kg × Y reps, suggest X kg × (Y+1) OR (X + small increment) × Y reps. Fill progressionNote with the specific target.
   - **hypertrophy**: Focus on 10–15 rep range, controlled tempo. Do NOT push weight increases — maintain weight and maximize mind-muscle connection. Note this in progressionNote.
   - **auto**: For STRENGTH goal → apply progression. For HYPERTROPHY goal → use hypertrophy rules. For HYBRID → compounds get progression, isolation gets hypertrophy.

4. **Isolation vs compound** (for "auto" intent):
   - Compounds (bench press, squat, deadlift, overhead press, row, pull-up, etc.) → progression.
   - Isolation (flyes, curls, lateral raises, tricep pushdowns, leg curls, leg extensions, etc.) → hypertrophy.

5. Respect the user's equipment access, session_minutes budget, and any constraints.
6. Do not train the same muscle groups trained in the MOST RECENT completed session.

## Output
Return ONLY valid JSON matching this schema. No markdown, no prose outside JSON.

{
  "sessionTitle": "string (e.g. 'Legs & Abs — Wednesday')",
  "exercises": [
    {
      "exerciseId": "string (exact id from summary — must exist in currentTemplates or favorites)",
      "exerciseName": "string",
      "sets": integer,
      "repMin": integer,
      "repMax": integer,
      "restSeconds": integer,
      "progressionNote": "optional string — specific coaching cue"
    }
  ],
  "notes": "optional string (overall session coaching note, 1–2 sentences)",
  "estimatedMinutes": optional integer
}`;

// =============================================================================
// HANDLER
// =============================================================================

export async function POST() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  // 1. Build training summary
  let summary;
  try {
    summary = await buildTrainingSummary(userId);
  } catch (err) {
    console.error('[coach/next-session] DB error building summary:', err);
    return NextResponse.json(
      { error: 'Database error', message: 'Failed to load training data. Please try again.' },
      { status: 503 }
    );
  }
  const inputHash = hashSummary(summary);

  // 2. Check for cached PENDING proposal with same input hash
  const cached = await prisma.coachProposal.findFirst({
    where: { userId, type: 'NEXT_SESSION', status: 'PENDING', inputSummaryHash: inputHash },
    select: { id: true, type: true, status: true, proposalJson: true, rationale: true, createdAt: true },
  });

  if (cached) {
    return NextResponse.json({ proposal: cached, cached: true });
  }

  // 3. Call OpenAI
  // Build a focused preamble so the AI immediately knows what day it is and what template to use
  const todayInfo = summary.today;
  const todayTemplate = todayInfo.scheduleDay?.templateId
    ? summary.currentTemplates.find((t) => t.id === todayInfo.scheduleDay!.templateId)
    : null;

  const todayPreamble = todayInfo.scheduleDay
    ? todayInfo.scheduleDay.isRest
      ? `TODAY (${todayInfo.weekday}) is a REST DAY. Do not plan a workout.`
      : `TODAY is ${todayInfo.weekday}. Today's session is: "${todayInfo.scheduleDay.templateName ?? todayInfo.scheduleDay.label ?? 'Workout'}".
${todayTemplate
  ? `Template exercises for today (use these exerciseIds in your response):
${todayTemplate.exercises.map((e, i) => `  ${i + 1}. ${e.exerciseName} (id: ${e.exerciseId}) — ${e.setsPlanned} sets × ${e.repMin}–${e.repMax} reps`).join('\n')}`
  : 'No template found for today — plan based on the split name and muscle groups.'
}`
    : `TODAY is ${todayInfo.weekday}. No active split schedule found — plan a balanced session based on recent history.`;

  const userMessage = `${todayPreamble}

Full training summary:
${JSON.stringify(summary, null, 2)}

Plan today's complete session.`;

  let rawContent: string;
  try {
    const completion = await openai.chat.completions.create({
      model: COACH_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 1500,
    });
    rawContent = completion.choices[0]?.message?.content ?? '';
  } catch (err) {
    console.error('[coach/next-session] OpenAI error:', err);
    return NextResponse.json(
      { error: 'AI service error', message: 'Failed to generate session plan' },
      { status: 502 }
    );
  }

  // 4. Parse + validate
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return NextResponse.json(
      { error: 'AI response parse error', raw: rawContent },
      { status: 422 }
    );
  }

  const validation = NextSessionProposalSchema.safeParse(parsed);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'AI output failed schema validation',
        details: validation.error.flatten(),
        raw: parsed,
      },
      { status: 422 }
    );
  }

  // 5. Store proposal
  const proposal = await prisma.coachProposal.create({
    data: {
      userId,
      type: 'NEXT_SESSION',
      status: 'PENDING',
      inputSummaryHash: inputHash,
      proposalJson: validation.data as unknown as Prisma.InputJsonValue,
      rationale: validation.data.notes ?? null,
    },
    select: {
      id: true,
      type: true,
      status: true,
      proposalJson: true,
      rationale: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ proposal, cached: false }, { status: 201 });
}
