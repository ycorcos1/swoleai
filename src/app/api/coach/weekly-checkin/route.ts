/**
 * Task 9.5 — Coach endpoint: Weekly Check-in
 *
 * POST /api/coach/weekly-checkin
 *
 * Analyses the user's last week of training and produces patch ops that
 * adjust the routine (exercise swaps, volume tweaks). Output is stored as
 * a WEEKLY CoachProposal in PENDING status awaiting user review.
 *
 * Acceptance Criteria: Creates patch proposal and can be accepted.
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { buildTrainingSummary, hashSummary } from '@/lib/coach/training-summary';
import { WeeklyProposalSchema } from '@/lib/coach/schemas';
import { openai, COACH_MODEL } from '@/lib/coach/openai';

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are SwoleAI, an expert strength and hypertrophy coach conducting a weekly check-in.

Analyse the user's recent training data and produce targeted routine adjustments as patch operations.

Patch op types available:
- replace_block_exercise: { op, templateId, blockOrderIndex, exerciseId }
- update_block: { op, templateId, blockOrderIndex, changes: { setsPlanned?, repMin?, repMax?, restSeconds?, progressionEngine?, notes? } }
- add_block: { op, templateId, block: { exerciseId, setsPlanned, repMin, repMax, restSeconds, progressionEngine?, notes? } }
- remove_block: { op, templateId, blockOrderIndex }
- set_schedule_day: { op, splitId, weekday, templateId, isRest }
- add_favorite: { op, exerciseId }
- remove_favorite: { op, exerciseId }

Rules:
- Only reference templateIds and exerciseIds that exist in the summary.
- Keep patches minimal and targeted — max 5 patch ops.
- Provide a clear rationale explaining why each change is recommended.
- Return ONLY valid JSON. No markdown.

Schema:
{
  "patches": [ ...patch ops... ],
  "rationale": "string explaining all changes",
  "volumeAnalysis": {
    "totalSetsLastWeek": optional integer,
    "muscleGroupBreakdown": optional { "muscle": sets },
    "recommendations": optional ["string"]
  }
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
    where: { userId, type: 'WEEKLY', status: 'PENDING', inputSummaryHash: inputHash },
    select: { id: true, type: true, status: true, proposalJson: true, rationale: true, createdAt: true },
  });
  if (cached) {
    return NextResponse.json({ proposal: cached, cached: true });
  }

  const userMessage = `Training summary:\n${JSON.stringify(summary, null, 2)}\n\nConduct a weekly check-in and provide routine adjustment patches.`;

  let rawContent: string;
  try {
    const completion = await openai.chat.completions.create({
      model: COACH_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    });
    rawContent = completion.choices[0]?.message?.content ?? '';
  } catch (err) {
    console.error('[coach/weekly-checkin] OpenAI error:', err);
    return NextResponse.json(
      { error: 'AI service error', message: 'Failed to generate weekly check-in' },
      { status: 502 }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return NextResponse.json({ error: 'AI response parse error', raw: rawContent }, { status: 422 });
  }

  const validation = WeeklyProposalSchema.safeParse(parsed);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'AI output failed schema validation', details: validation.error.flatten(), raw: parsed },
      { status: 422 }
    );
  }

  const proposal = await prisma.coachProposal.create({
    data: {
      userId,
      type: 'WEEKLY',
      status: 'PENDING',
      inputSummaryHash: inputHash,
      proposalJson: validation.data as unknown as Prisma.InputJsonValue,
      rationale: validation.data.rationale,
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
