/**
 * Task 9.6 — Coach endpoint: Plateau interventions
 *
 * POST /api/coach/plateau
 *
 * Takes plateau candidates detected by the deterministic plateau engine and
 * asks the AI to provide targeted interventions (exercise swaps, rep range
 * changes, deload recommendations). Caps interventions at 5 for focus.
 *
 * Acceptance Criteria: Returns limited interventions with patch ops.
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { buildTrainingSummary, hashSummary } from '@/lib/coach/training-summary';
import { PlateauProposalSchema } from '@/lib/coach/schemas';
import { openai, COACH_MODEL } from '@/lib/coach/openai';

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are SwoleAI, an expert strength coach specialising in plateau-busting.

The user has stalled on specific exercises. Provide targeted, evidence-based interventions.

For each plateau, you may suggest ONE of:
  1. Exercise swap (replace_block_exercise patch op)
  2. Rep range / volume adjustment (update_block patch op)
  3. Deload recommendation (update_block with reduced setsPlanned/repMax)
  4. Add a variation (add_block patch op)

Patch op types:
- replace_block_exercise: { op, templateId, blockOrderIndex, exerciseId }
- update_block: { op, templateId, blockOrderIndex, changes: { setsPlanned?, repMin?, repMax?, restSeconds?, notes? } }
- add_block: { op, templateId, block: { exerciseId, setsPlanned, repMin, repMax, restSeconds, notes? } }
- remove_block: { op, templateId, blockOrderIndex }

Rules:
- Max 5 interventions total.
- Only reference exerciseIds and templateIds that exist in the training summary.
- Each intervention must have a clear, concise rationale.
- Return ONLY valid JSON.

Schema:
{
  "overallDiagnosis": "string (1-2 sentences summary of plateau causes)",
  "interventions": [
    {
      "exerciseId": "string",
      "exerciseName": "string",
      "diagnosis": "string (why this exercise is stalled)",
      "patches": [ ...max 2 patch ops... ],
      "interventionRationale": "string"
    }
  ]
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

  if (summary.plateauCandidates.length === 0) {
    return NextResponse.json(
      { message: 'No plateau candidates detected', plateaus: [] },
      { status: 200 }
    );
  }

  // Cache check
  const cached = await prisma.coachProposal.findFirst({
    where: { userId, type: 'PLATEAU', status: 'PENDING', inputSummaryHash: inputHash },
    select: { id: true, type: true, status: true, proposalJson: true, rationale: true, createdAt: true },
  });
  if (cached) {
    return NextResponse.json({ proposal: cached, cached: true });
  }

  const userMessage = `Training summary:\n${JSON.stringify(summary, null, 2)}\n\nProvide plateau interventions for the stalled exercises.`;

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
    console.error('[coach/plateau] OpenAI error:', err);
    return NextResponse.json(
      { error: 'AI service error', message: 'Failed to generate plateau interventions' },
      { status: 502 }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return NextResponse.json({ error: 'AI response parse error', raw: rawContent }, { status: 422 });
  }

  const validation = PlateauProposalSchema.safeParse(parsed);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'AI output failed schema validation', details: validation.error.flatten(), raw: parsed },
      { status: 422 }
    );
  }

  const proposal = await prisma.coachProposal.create({
    data: {
      userId,
      type: 'PLATEAU',
      status: 'PENDING',
      inputSummaryHash: inputHash,
      proposalJson: validation.data as unknown as Prisma.InputJsonValue,
      rationale: validation.data.overallDiagnosis,
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
