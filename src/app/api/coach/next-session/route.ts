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
Your task is to plan the user's NEXT training session based on their training summary.

## Exercise selection rules
1. **Favorites first**: The summary includes a "favorites" list per muscle group with a priority (PRIMARY or BACKUP) and an intent (progression | hypertrophy | auto).
   - When planning a muscle group, always prefer PRIMARY favorites first, then BACKUP favorites.
   - If the session requires more exercises for a muscle group than the user has favorited, fill the remaining slots with exercises from their history or routine.
   - If the user has no favorites at all for a muscle group, choose appropriate exercises from their routine or history.

2. **Avoid repetition**: The summary includes "recentSessionHistory" (last 4 sessions with exercise names).
   - Do NOT repeat the same exercise that was used in the MOST RECENT session for the same muscle group.
   - Rotate through different exercises across sessions to ensure variety and balanced stimulus.

3. **Coaching intent per exercise**:
   - **progression**: Apply progressive overload. If the user's top set last time was X kg × Y reps, suggest X kg × (Y+1) reps OR (X + small increment) kg × Y reps. Always fill progressionNote with the specific target.
   - **hypertrophy**: Focus on the 10–15 rep range with controlled tempo. Do NOT push weight increases — instead recommend maintaining weight and maximizing the mind-muscle connection. Note this in progressionNote.
   - **auto**: Use the user's goal mode. For STRENGTH, apply progression. For HYPERTROPHY, use the hypertrophy rules above. For HYBRID, alternate between the two based on the exercise type (compounds → progression, isolation → hypertrophy).

4. **Isolation vs compound awareness** (applies when intent is "auto"):
   - Compound lifts (bench press, squat, deadlift, overhead press, row, pull-up, etc.) → apply progression.
   - Isolation movements (flyes, curls, lateral raises, tricep pushdowns, leg curls, etc.) → apply hypertrophy rules, not progression.

5. Only select exercises the user has performed, favorited, or that are in their routine templates.
6. Respect the user's equipment access, constraints, and session_minutes budget.
7. Do not train the same muscle groups that were trained in the most recent session (avoid consecutive same-muscle days).

## Output
Return ONLY valid JSON matching the schema. No markdown, no prose outside JSON.

Schema:
{
  "sessionTitle": "string (e.g. Push Day A)",
  "exercises": [
    {
      "exerciseId": "string (exact id from summary)",
      "exerciseName": "string",
      "sets": integer,
      "repMin": integer,
      "repMax": integer,
      "restSeconds": integer,
      "progressionNote": "optional string — specific coaching cue (e.g. 'Aim for 85kg × 5, up from 82.5kg last session' or 'Keep at 15kg, focus on full stretch')"
    }
  ],
  "notes": "optional string (overall session coaching notes)",
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
  const userMessage = `Training summary:\n${JSON.stringify(summary, null, 2)}\n\nPlan my next session.`;

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
