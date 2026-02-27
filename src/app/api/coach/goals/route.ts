/**
 * Task 9.7 — Coach endpoint: Goals & guardrails
 *
 * POST /api/coach/goals
 *
 * Reviews the user's stated goals, training history, and constraints to
 * produce goal recommendations and guardrail rules. Guardrails protect
 * against volume spikes, injury aggravation, and overtraining.
 *
 * Acceptance Criteria: Stores guardrail recommendations.
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { buildTrainingSummary, hashSummary } from '@/lib/coach/training-summary';
import { GoalsProposalSchema } from '@/lib/coach/schemas';
import { openai, COACH_MODEL } from '@/lib/coach/openai';

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are SwoleAI, an expert strength and performance coach.

Review the user's training profile, goals, history, and constraints. Provide:
1. Goal recommendations (2–5) aligned with their stated objective.
2. Guardrail rules (1–5) to protect them from overtraining, injury, or stagnation.

Goal categories: strength | hypertrophy | recovery | nutrition | lifestyle
Guardrail types: volume_cap | frequency_cap | injury_avoidance | recovery | other

Rules:
- Be specific and actionable. Reference the user's actual exercises, patterns, and constraints.
- Prioritise safety guardrails if the user has injury constraints.
- Return ONLY valid JSON.

Schema:
{
  "goals": [
    {
      "category": "strength|hypertrophy|recovery|nutrition|lifestyle",
      "title": "string",
      "description": "string",
      "priority": "high|medium|low"
    }
  ],
  "guardrails": [
    {
      "type": "volume_cap|frequency_cap|injury_avoidance|recovery|other",
      "description": "string",
      "appliesTo": optional ["exercise or muscle name"]
    }
  ],
  "summary": "optional string (overall coaching commentary)"
}`;

// =============================================================================
// HANDLER
// =============================================================================

export async function POST() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const summary = await buildTrainingSummary(userId);
  const inputHash = hashSummary(summary);

  // Cache check
  const cached = await prisma.coachProposal.findFirst({
    where: { userId, type: 'GOALS', status: 'PENDING', inputSummaryHash: inputHash },
    select: { id: true, type: true, status: true, proposalJson: true, rationale: true, createdAt: true },
  });
  if (cached) {
    return NextResponse.json({ proposal: cached, cached: true });
  }

  const userMessage = `Training summary:\n${JSON.stringify(summary, null, 2)}\n\nReview my goals and provide guardrail recommendations.`;

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
      max_tokens: 2000,
    });
    rawContent = completion.choices[0]?.message?.content ?? '';
  } catch (err) {
    console.error('[coach/goals] OpenAI error:', err);
    return NextResponse.json(
      { error: 'AI service error', message: 'Failed to generate goals review' },
      { status: 502 }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return NextResponse.json({ error: 'AI response parse error', raw: rawContent }, { status: 422 });
  }

  const validation = GoalsProposalSchema.safeParse(parsed);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'AI output failed schema validation', details: validation.error.flatten(), raw: parsed },
      { status: 422 }
    );
  }

  const proposal = await prisma.coachProposal.create({
    data: {
      userId,
      type: 'GOALS',
      status: 'PENDING',
      inputSummaryHash: inputHash,
      proposalJson: validation.data as unknown as Prisma.InputJsonValue,
      rationale: validation.data.summary ?? validation.data.goals[0]?.description ?? null,
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
