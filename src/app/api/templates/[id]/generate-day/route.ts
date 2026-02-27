/**
 * Task 10.2 — AI gap-filler for missing slots
 *
 * POST /api/templates/:id/generate-day
 *
 * Generates a concrete exercise list for a SLOT template day:
 *   1. Fetches the SLOT template with its slots.
 *   2. Loads user favorites (with exercise details).
 *   3. Derives recently-used exercise IDs from the last 3 completed sessions.
 *   4. Runs the deterministic slot filler (Task 10.1) — favorites-first.
 *   5. For any slots still unfilled, queries the exercise catalog constrained
 *      to each slot's muscle group / pattern / equipment requirements, then
 *      calls OpenAI to pick from that constrained list.
 *   6. Validates that every AI-returned exerciseId exists in the catalog
 *      subset we supplied (no hallucinated exercises).
 *   7. Returns the fully merged generatedDay array for UI preview.
 *
 * The response is the "reviewable proposal" the user inspects before
 * accepting (Task 10.3). Nothing is persisted to the database here;
 * accept → Task 10.3 creates a new FIXED template.
 *
 * Acceptance Criteria (Task 10.2):
 *   Only valid exercises are selected; output is reviewable proposal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  fillSlotsFromFavorites,
  type SlotInput,
  type SlotFillResult,
  type FilledExercise,
} from '@/lib/slot-filler/deterministic';
import { AiGapFillerSchema } from '@/lib/coach/schemas';
import { openai, COACH_MODEL } from '@/lib/coach/openai';

// =============================================================================
// Types
// =============================================================================

export interface GeneratedSlot {
  slotIndex: number;
  muscleGroup: string;
  exerciseCount: number;
  defaultSets: number;
  defaultRepMin: number;
  defaultRepMax: number;
  exercises: FilledExercise[];
  unfilledCount: number;
}

// =============================================================================
// AI system prompt
// =============================================================================

const SYSTEM_PROMPT = `You are SwoleAI, an expert strength coach helping fill workout slots.
For each slot provided you MUST select exercises ONLY from the "candidates" list given for that slot.
Do not invent exercise IDs. Do not pick exercises not in the candidates list.
Return ONLY valid JSON matching this schema — no markdown, no prose:

{
  "slots": [
    {
      "muscleGroup": "string",
      "exercises": [
        { "exerciseId": "string (exact id from candidates)", "exerciseName": "string" }
      ]
    }
  ]
}`;

// =============================================================================
// Helper: build catalog candidates for an unfilled slot
// =============================================================================

interface CatalogCandidate {
  id: string;
  name: string;
  type: string;
  pattern: string;
  muscleGroups: string[];
}

function buildCatalogCandidates(
  allExercises: CatalogCandidate[],
  slot: SlotInput,
  alreadyPickedIds: Set<string>,
): CatalogCandidate[] {
  const slotMg = slot.muscleGroup.toLowerCase();

  let candidates = allExercises.filter(
    (ex) =>
      ex.muscleGroups.some((mg) => mg.toLowerCase() === slotMg) &&
      !alreadyPickedIds.has(ex.id),
  );

  const pc = slot.patternConstraints;
  if (pc?.allowedPatterns?.length) {
    candidates = candidates.filter((ex) => pc.allowedPatterns!.includes(ex.pattern));
  }
  if (pc?.excludedPatterns?.length) {
    candidates = candidates.filter((ex) => !pc.excludedPatterns!.includes(ex.pattern));
  }

  const ec = slot.equipmentConstraints;
  if (ec?.allowedTypes?.length) {
    candidates = candidates.filter((ex) => ec.allowedTypes!.includes(ex.type));
  }
  if (ec?.excludedTypes?.length) {
    candidates = candidates.filter((ex) => !ec.excludedTypes!.includes(ex.type));
  }

  return candidates;
}

// =============================================================================
// Handler
// =============================================================================

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const { id: templateId } = await params;

  // ── 1. Fetch the SLOT template ────────────────────────────────────────────
  const template = await prisma.workoutDayTemplate.findFirst({
    where: { id: templateId, userId, mode: 'SLOT' },
    select: {
      id: true,
      name: true,
      slots: {
        orderBy: { orderIndex: 'asc' },
        select: {
          orderIndex: true,
          muscleGroup: true,
          exerciseCount: true,
          patternConstraints: true,
          equipmentConstraints: true,
          defaultSets: true,
          defaultRepMin: true,
          defaultRepMax: true,
        },
      },
    },
  });

  if (!template) {
    return NextResponse.json(
      { error: 'Template not found or is not a SLOT template' },
      { status: 404 },
    );
  }

  if (template.slots.length === 0) {
    return NextResponse.json(
      { error: 'Template has no slots to fill' },
      { status: 422 },
    );
  }

  // ── 2. Load user favorites with exercise details ──────────────────────────
  const rawFavorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      exercise: {
        select: {
          id: true,
          name: true,
          type: true,
          pattern: true,
          muscleGroups: true,
        },
      },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });

  const favorites = rawFavorites.map((f) => ({
    exerciseId: f.exerciseId,
    priority: f.priority as 'PRIMARY' | 'BACKUP',
    exercise: {
      id: f.exercise.id,
      name: f.exercise.name,
      type: f.exercise.type as string,
      pattern: f.exercise.pattern as string,
      muscleGroups: (f.exercise.muscleGroups as string[]) ?? [],
    },
  }));

  // ── 3. Derive recently used exercise IDs (last 3 completed sessions) ──────
  const recentSessions = await prisma.workoutSession.findMany({
    where: { userId, status: 'COMPLETED' },
    orderBy: { startedAt: 'desc' },
    take: 3,
    select: {
      exercises: { select: { exerciseId: true } },
    },
  });

  const recentlyUsedIds = new Set<string>(
    recentSessions.flatMap((s) => s.exercises.map((e) => e.exerciseId)),
  );

  // ── 4. Build SlotInput array ──────────────────────────────────────────────
  const slotInputs: SlotInput[] = template.slots.map((s) => ({
    muscleGroup: s.muscleGroup,
    exerciseCount: s.exerciseCount,
    patternConstraints: s.patternConstraints as SlotInput['patternConstraints'],
    equipmentConstraints: s.equipmentConstraints as SlotInput['equipmentConstraints'],
    defaultSets: s.defaultSets,
    defaultRepMin: s.defaultRepMin,
    defaultRepMax: s.defaultRepMax,
  }));

  // ── 5. Run deterministic slot filler (Task 10.1) ──────────────────────────
  const deterministicResults: SlotFillResult[] = fillSlotsFromFavorites(
    slotInputs,
    favorites,
    recentlyUsedIds,
  );

  // ── 6. AI gap-fill for remaining unfilled slots ───────────────────────────
  const unfilledIndices = deterministicResults
    .map((r, i) => ({ result: r, index: i }))
    .filter(({ result }) => result.unfilledCount > 0);

  // Track all picked IDs (deterministic + AI) to prevent cross-slot duplicates
  const allPickedIds = new Set<string>(
    deterministicResults.flatMap((r) => r.exercises.map((e) => e.exerciseId)),
  );

  // Merged results — starts as a copy of the deterministic results
  const mergedResults: GeneratedSlot[] = deterministicResults.map((r) => ({ ...r }));

  if (unfilledIndices.length > 0) {
    // Load exercise catalog (system + user custom) — lightweight fields only
    const allExercises = await prisma.exercise.findMany({
      where: {
        OR: [{ isCustom: false }, { isCustom: true, ownerUserId: userId }],
      },
      select: {
        id: true,
        name: true,
        type: true,
        pattern: true,
        muscleGroups: true,
      },
    });

    const catalog: CatalogCandidate[] = allExercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      type: ex.type as string,
      pattern: ex.pattern as string,
      muscleGroups: (ex.muscleGroups as string[]) ?? [],
    }));

    // Build per-slot candidate lists for the AI prompt
    interface UnfilledSlotInfo {
      index: number;
      muscleGroup: string;
      needCount: number;
      candidates: CatalogCandidate[];
    }

    const unfilledInfo: UnfilledSlotInfo[] = unfilledIndices
      .map(({ result, index }) => {
        const candidates = buildCatalogCandidates(
          catalog,
          slotInputs[index],
          allPickedIds,
        );
        return {
          index,
          muscleGroup: result.muscleGroup,
          needCount: result.unfilledCount,
          candidates,
        };
      })
      .filter((info) => info.candidates.length > 0); // skip if truly no catalog matches

    if (unfilledInfo.length > 0) {
      // Build AI prompt payload
      const userPayload = unfilledInfo.map((info) => ({
        muscleGroup: info.muscleGroup,
        needExercises: info.needCount,
        candidates: info.candidates.slice(0, 30).map((c) => ({
          exerciseId: c.id,
          exerciseName: c.name,
          type: c.type,
          pattern: c.pattern,
        })),
      }));

      let aiResult: { slots: { muscleGroup: string; exercises: { exerciseId: string; exerciseName: string }[] }[] } | null = null;

      try {
        const completion = await openai.chat.completions.create({
          model: COACH_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Fill these unfilled workout slots. Pick from candidates only:\n${JSON.stringify(userPayload, null, 2)}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 800,
        });

        const raw = completion.choices[0]?.message?.content ?? '';
        const parsed = JSON.parse(raw);
        const validation = AiGapFillerSchema.safeParse(parsed);
        if (validation.success) {
          aiResult = validation.data;
        } else {
          console.warn('[generate-day] AI output failed schema validation', validation.error.flatten());
        }
      } catch (err) {
        console.warn('[generate-day] AI gap-fill error (continuing with partial fill):', err);
      }

      // Merge AI suggestions — validate each exerciseId against the allowed catalog subset
      if (aiResult) {
        // Build a quick lookup: muscleGroup → allowed exercise IDs set + map to name
        const allowedByMg = new Map<string, Map<string, string>>(
          unfilledInfo.map((info) => [
            info.muscleGroup.toLowerCase(),
            new Map(info.candidates.map((c) => [c.id, c.name])),
          ]),
        );

        for (const aiSlot of aiResult.slots) {
          const mg = aiSlot.muscleGroup.toLowerCase();
          const allowed = allowedByMg.get(mg);
          if (!allowed) continue;

          // Find the matching merged result slot
          const matchInfo = unfilledInfo.find(
            (info) => info.muscleGroup.toLowerCase() === mg,
          );
          if (!matchInfo) continue;

          const merged = mergedResults[matchInfo.index];
          const stillNeed = merged.unfilledCount;

          for (const aiEx of aiSlot.exercises) {
            if (merged.unfilledCount <= 0) break;
            // Validate: must be in the allowed catalog subset and not yet picked
            const validName = allowed.get(aiEx.exerciseId);
            if (!validName || allPickedIds.has(aiEx.exerciseId)) continue;

            merged.exercises.push({
              exerciseId: aiEx.exerciseId,
              exerciseName: validName, // use our DB name, not AI's potentially hallucinated name
              setsPlanned: merged.defaultSets,
              repMin: merged.defaultRepMin,
              repMax: merged.defaultRepMax,
              source: 'favorite_backup', // re-used type; will show as 'ai' via field below
            });
            // Override source with 'ai' label — extend FilledExercise inline
            const last = merged.exercises[merged.exercises.length - 1] as FilledExercise & {
              source: string;
            };
            last.source = 'ai' as FilledExercise['source'];

            allPickedIds.add(aiEx.exerciseId);
            merged.unfilledCount = Math.max(0, merged.unfilledCount - 1);
          }

          void stillNeed; // suppress unused-variable warning
        }
      }
    }
  }

  const fullyFilled = mergedResults.every((r) => r.unfilledCount === 0);

  return NextResponse.json({
    generatedDay: mergedResults,
    templateId: template.id,
    templateName: template.name,
    fullyFilled,
  });
}
