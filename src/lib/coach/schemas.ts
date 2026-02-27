/**
 * Task 9.2 — Zod schemas for AI coach outputs
 *
 * These schemas validate the JSON returned by OpenAI before it is stored in
 * coach_proposals.proposal_json. Invalid output causes a 422 error — the
 * endpoint retries or surfaces the failure rather than storing garbage.
 *
 * Schema inventory:
 *   NextSessionProposalSchema  — NEXT_SESSION type
 *   WeeklyProposalSchema       — WEEKLY type (patch ops)
 *   PlateauProposalSchema      — PLATEAU type (interventions)
 *   GoalsProposalSchema        — GOALS type (guardrails)
 */

import { z } from 'zod';

// =============================================================================
// Shared sub-schemas
// =============================================================================

/** A single planned exercise in a session */
const PlannedExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  repMin: z.number().int().min(1).max(100),
  repMax: z.number().int().min(1).max(100),
  restSeconds: z.number().int().min(0).max(600),
  progressionNote: z.string().optional(),
});

/** A domain-specific patch op for routine mutations */
const PatchOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('replace_block_exercise'),
    templateId: z.string().min(1),
    blockOrderIndex: z.number().int().min(0),
    exerciseId: z.string().min(1),
  }),
  z.object({
    op: z.literal('update_block'),
    templateId: z.string().min(1),
    blockOrderIndex: z.number().int().min(0),
    changes: z.object({
      setsPlanned: z.number().int().min(1).max(20).optional(),
      repMin: z.number().int().min(1).max(100).optional(),
      repMax: z.number().int().min(1).max(100).optional(),
      restSeconds: z.number().int().min(0).max(600).optional(),
      progressionEngine: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
  }),
  z.object({
    op: z.literal('add_block'),
    templateId: z.string().min(1),
    block: z.object({
      exerciseId: z.string().min(1),
      setsPlanned: z.number().int().min(1).max(20),
      repMin: z.number().int().min(1).max(100),
      repMax: z.number().int().min(1).max(100),
      restSeconds: z.number().int().min(0).max(600),
      progressionEngine: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
  }),
  z.object({
    op: z.literal('remove_block'),
    templateId: z.string().min(1),
    blockOrderIndex: z.number().int().min(0),
  }),
  z.object({
    op: z.literal('set_schedule_day'),
    splitId: z.string().min(1),
    weekday: z.string().min(1),
    templateId: z.string().nullable(),
    isRest: z.boolean(),
  }),
  z.object({
    op: z.literal('add_favorite'),
    exerciseId: z.string().min(1),
  }),
  z.object({
    op: z.literal('remove_favorite'),
    exerciseId: z.string().min(1),
  }),
]);

// =============================================================================
// NEXT_SESSION — next-session plan
// =============================================================================

export const NextSessionProposalSchema = z.object({
  /** Human-readable title for the session (e.g., "Push Day A") */
  sessionTitle: z.string().min(1).max(100),
  /** Ordered list of exercises to perform */
  exercises: z.array(PlannedExerciseSchema).min(1).max(20),
  /** Coaching notes for the session */
  notes: z.string().max(1000).optional(),
  /** Estimated total session duration in minutes */
  estimatedMinutes: z.number().int().min(10).max(300).optional(),
});

export type NextSessionProposal = z.infer<typeof NextSessionProposalSchema>;

// =============================================================================
// WEEKLY — weekly check-in patch proposal
// =============================================================================

export const WeeklyProposalSchema = z.object({
  /** Patch operations to apply to the routine */
  patches: z.array(PatchOpSchema).min(1).max(20),
  /** Human-readable explanation of why these changes are recommended */
  rationale: z.string().min(1).max(2000),
  /** High-level volume analysis that informed the recommendation */
  volumeAnalysis: z
    .object({
      totalSetsLastWeek: z.number().int().min(0).optional(),
      muscleGroupBreakdown: z.record(z.string(), z.number()).optional(),
      recommendations: z.array(z.string()).optional(),
    })
    .optional(),
});

export type WeeklyProposal = z.infer<typeof WeeklyProposalSchema>;

// =============================================================================
// PLATEAU — plateau diagnosis + interventions
// =============================================================================

const PlateauInterventionSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  diagnosis: z.string().min(1).max(500),
  /** Suggested patch operations to address the plateau */
  patches: z.array(PatchOpSchema).max(5),
  /** Brief explanation of each intervention */
  interventionRationale: z.string().max(500),
});

export const PlateauProposalSchema = z.object({
  /** Overall plateau diagnosis summary */
  overallDiagnosis: z.string().min(1).max(1000),
  /** Per-exercise interventions — capped at 5 to keep proposals actionable */
  interventions: z.array(PlateauInterventionSchema).min(1).max(5),
});

export type PlateauProposal = z.infer<typeof PlateauProposalSchema>;

// =============================================================================
// GOALS — goals & guardrails review
// =============================================================================

const GoalRecommendationSchema = z.object({
  category: z.enum(['strength', 'hypertrophy', 'recovery', 'nutrition', 'lifestyle']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  priority: z.enum(['high', 'medium', 'low']),
});

const GuardrailSchema = z.object({
  type: z.enum(['volume_cap', 'frequency_cap', 'injury_avoidance', 'recovery', 'other']),
  description: z.string().min(1).max(500),
  /** Exercises or muscle groups this guardrail applies to */
  appliesTo: z.array(z.string()).optional(),
});

export const GoalsProposalSchema = z.object({
  /** Goal recommendations aligned with user's stated objectives */
  goals: z.array(GoalRecommendationSchema).min(1).max(10),
  /** Guardrail rules the coach recommends to protect the user */
  guardrails: z.array(GuardrailSchema).max(10),
  /** Optional overall coach commentary */
  summary: z.string().max(1000).optional(),
});

export type GoalsProposal = z.infer<typeof GoalsProposalSchema>;

// =============================================================================
// GENERATE_DAY — AI gap-filler schema (Task 10.2)
// =============================================================================
// Used when the deterministic slot filler leaves slots unfilled.
// The AI receives a constrained catalog per unfilled slot and must return
// exercise picks only from that list. We validate all returned IDs against
// the catalog before trusting them.

const AiGapExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
});

const AiGapSlotSchema = z.object({
  muscleGroup: z.string().min(1),
  exercises: z.array(AiGapExerciseSchema).min(0).max(10),
});

export const AiGapFillerSchema = z.object({
  slots: z.array(AiGapSlotSchema).min(1).max(20),
});

export type AiGapFiller = z.infer<typeof AiGapFillerSchema>;

// =============================================================================
// Union helper — validate proposalJson by type
// =============================================================================

export type ProposalType = 'NEXT_SESSION' | 'WEEKLY' | 'PLATEAU' | 'GOALS';

export function validateProposalJson(
  type: ProposalType,
  json: unknown
):
  | { success: true; data: NextSessionProposal | WeeklyProposal | PlateauProposal | GoalsProposal }
  | { success: false; error: z.ZodError } {
  switch (type) {
    case 'NEXT_SESSION':
      return NextSessionProposalSchema.safeParse(json) as ReturnType<typeof validateProposalJson>;
    case 'WEEKLY':
      return WeeklyProposalSchema.safeParse(json) as ReturnType<typeof validateProposalJson>;
    case 'PLATEAU':
      return PlateauProposalSchema.safeParse(json) as ReturnType<typeof validateProposalJson>;
    case 'GOALS':
      return GoalsProposalSchema.safeParse(json) as ReturnType<typeof validateProposalJson>;
  }
}
