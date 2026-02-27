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

Rules:
- Only select exercises the user has already performed or that are in their routine.
- Respect the user's equipment access, constraints, and goal mode.
- Keep sessions within the user's session_minutes budget.
- Do not add exercises for body parts that were trained in the most recent session (avoid consecutive same-muscle training).
- Provide progressive overload guidance in progressionNote when applicable.
- Return ONLY valid JSON matching the schema. No markdown, no prose outside JSON.

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
      "progressionNote": "optional string"
    }
  ],
  "notes": "optional string (overall coaching notes)",
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
  const summary = await buildTrainingSummary(userId);
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
