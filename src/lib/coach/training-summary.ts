/**
 * Task 9.3 — Training summary builder (server)
 *
 * Builds a compact, token-efficient summary object for use in OpenAI prompts.
 * Intentionally excludes raw session history; uses aggregates instead.
 *
 * Summary includes:
 *   - User profile (goal, units, equipment, constraints, days/week)
 *   - Active split + schedule overview
 *   - Current routine (template names + exercise lists — no nested sets data)
 *   - Recent session aggregates (last 4 weeks)
 *   - Top-set history per exercise (last 5 exposures) for progression context
 *   - Plateau candidates (exercises stalled ≥ 2 exposures)
 *   - PR records per exercise (best weight × reps)
 *
 * Acceptance Criteria: Summary excludes raw full history; includes key aggregates.
 */

import { prisma } from '@/lib/db';
import { detectPlateaus } from '@/lib/rules/plateau';
import type { ExposureResult, SetPerformance } from '@/lib/rules/types';

// =============================================================================
// Types
// =============================================================================

export interface ExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  /** Top-set progression over last 5 exposures: [{ date, weight, reps }] */
  recentTopSets: { date: string; weight: number; reps: number }[];
  /** All-time PR: highest weight × reps product */
  prWeight: number;
  prReps: number;
}

export interface SessionAggregate {
  weekLabel: string; // e.g. "2026-W08"
  sessionCount: number;
  totalSets: number;
  totalVolume: number; // sum of weight × reps across all sets
  muscleGroupSets: Record<string, number>;
}

export interface TrainingSummary {
  generatedAt: string;
  user: {
    goalMode: string | null;
    daysPerWeek: number | null;
    sessionMinutes: number | null;
    units: string | null;
    equipment: string | null;
    constraints: unknown;
  };
  activeSplit: {
    id: string;
    name: string;
    schedule: { weekday: string; label: string | null; templateName: string | null; isRest: boolean }[];
  } | null;
  currentTemplates: {
    id: string;
    name: string;
    mode: string;
    exercises: { orderIndex: number; exerciseName: string; setsPlanned: number; repMin: number; repMax: number }[];
  }[];
  weeklyAggregates: SessionAggregate[];
  exerciseSummaries: ExerciseSummary[];
  plateauCandidates: {
    exerciseId: string;
    exerciseName: string;
    severity: string;
    plateauType: string;
    lastWeight: number;
    lastReps: number;
    avgRpe: number | null;
    message: string;
  }[];
}

// =============================================================================
// Helper: ISO week label
// =============================================================================

function isoWeekLabel(date: Date): string {
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
  return `${tmp.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// =============================================================================
// Builder
// =============================================================================

export async function buildTrainingSummary(userId: string): Promise<TrainingSummary> {
  // 1. User profile
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      goalMode: true,
      daysPerWeek: true,
      sessionMinutes: true,
      units: true,
      equipment: true,
      constraints: true,
    },
  });

  // 2. Active split + schedule
  const activeSplit = await prisma.split.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      scheduleDays: {
        orderBy: { weekday: 'asc' },
        select: {
          weekday: true,
          label: true,
          isRest: true,
          workoutDayTemplate: { select: { id: true, name: true } },
        },
      },
    },
  });

  // 3. Current templates (from active split schedule days)
  const templateIds = activeSplit
    ? activeSplit.scheduleDays
        .map((d) => d.workoutDayTemplate?.id)
        .filter(Boolean) as string[]
    : [];

  const uniqueTemplateIds = [...new Set(templateIds)];

  const templates = uniqueTemplateIds.length
    ? await prisma.workoutDayTemplate.findMany({
        where: { id: { in: uniqueTemplateIds }, userId },
        select: {
          id: true,
          name: true,
          mode: true,
          blocks: {
            orderBy: { orderIndex: 'asc' },
            select: {
              orderIndex: true,
              setsPlanned: true,
              repMin: true,
              repMax: true,
              exercise: { select: { name: true } },
            },
          },
        },
      })
    : [];

  // 4. Recent sessions — last 28 days
  const since = new Date();
  since.setDate(since.getDate() - 28);

  const recentSessions = await prisma.workoutSession.findMany({
    where: { userId, status: 'COMPLETED', startedAt: { gte: since } },
    orderBy: { startedAt: 'desc' },
    select: {
      startedAt: true,
      exercises: {
        select: {
          exerciseId: true,
          exercise: { select: { name: true, muscleGroups: true } },
          sets: {
            select: {
              weight: true,
              reps: true,
              rpe: true,
              flags: true,
              setIndex: true,
            },
            orderBy: { setIndex: 'asc' },
          },
        },
      },
    },
  });

  // 5. Weekly aggregates
  const weekMap = new Map<string, SessionAggregate>();
  for (const session of recentSessions) {
    const label = isoWeekLabel(session.startedAt);
    if (!weekMap.has(label)) {
      weekMap.set(label, {
        weekLabel: label,
        sessionCount: 0,
        totalSets: 0,
        totalVolume: 0,
        muscleGroupSets: {},
      });
    }
    const agg = weekMap.get(label)!;
    agg.sessionCount += 1;

    for (const we of session.exercises) {
      const workingSets = we.sets.filter((s) => {
        const flags = s.flags as Record<string, boolean> | null;
        return !flags?.warmup && s.weight > 0 && s.reps > 0;
      });
      agg.totalSets += workingSets.length;
      agg.totalVolume += workingSets.reduce((sum, s) => sum + s.weight * s.reps, 0);

      // Muscle group breakdown
      const muscleGroups = (we.exercise.muscleGroups as string[]) ?? [];
      for (const mg of muscleGroups) {
        agg.muscleGroupSets[mg] = (agg.muscleGroupSets[mg] ?? 0) + workingSets.length;
      }
    }
  }

  const weeklyAggregates = [...weekMap.values()].sort((a, b) =>
    a.weekLabel.localeCompare(b.weekLabel)
  );

  // 6. Exercise summaries — aggregate all sessions (last 60 days) for context
  const since60 = new Date();
  since60.setDate(since60.getDate() - 60);

  const historySessions = await prisma.workoutSession.findMany({
    where: { userId, status: 'COMPLETED', startedAt: { gte: since60 } },
    orderBy: { startedAt: 'asc' },
    select: {
      startedAt: true,
      exercises: {
        select: {
          exerciseId: true,
          exercise: { select: { name: true } },
          sets: {
            select: { weight: true, reps: true, rpe: true, flags: true },
            orderBy: { setIndex: 'asc' },
          },
        },
      },
    },
  });

  // Build exercise map: exerciseId → { name, exposures }
  const exerciseMap = new Map<string, { name: string; exposures: ExposureResult[] }>();

  for (const session of historySessions) {
    for (const we of session.exercises) {
      const sets: SetPerformance[] = we.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe ?? undefined,
        flags: (s.flags as SetPerformance['flags']) ?? undefined,
      }));
      const exposure: ExposureResult = { sessionDate: session.startedAt, sets };

      const existing = exerciseMap.get(we.exerciseId);
      if (existing) {
        existing.exposures.push(exposure);
      } else {
        exerciseMap.set(we.exerciseId, { name: we.exercise.name, exposures: [exposure] });
      }
    }
  }

  // Build compact exercise summaries (top-set last 5, PR)
  const exerciseSummaries: ExerciseSummary[] = [];
  for (const [exerciseId, { name, exposures }] of exerciseMap) {
    const sorted = [...exposures].sort(
      (a, b) => a.sessionDate.getTime() - b.sessionDate.getTime()
    );
    const last5 = sorted.slice(-5);

    const recentTopSets = last5.map((exp) => {
      const ws = exp.sets.filter(
        (s) => !(s.flags as Record<string, boolean> | undefined)?.warmup && s.weight > 0 && s.reps > 0
      );
      const topWeight = ws.length ? Math.max(...ws.map((s) => s.weight)) : 0;
      const bestReps = ws.length
        ? Math.max(...ws.filter((s) => s.weight === topWeight).map((s) => s.reps))
        : 0;
      return {
        date: exp.sessionDate.toISOString().split('T')[0],
        weight: topWeight,
        reps: bestReps,
      };
    });

    // All-time PR from full history
    let prWeight = 0;
    let prReps = 0;
    for (const exp of sorted) {
      for (const s of exp.sets) {
        if (s.weight > prWeight || (s.weight === prWeight && s.reps > prReps)) {
          prWeight = s.weight;
          prReps = s.reps;
        }
      }
    }

    exerciseSummaries.push({ exerciseId, exerciseName: name, recentTopSets, prWeight, prReps });
  }

  // 7. Plateau detection
  const exercisesForPlateau = [...exerciseMap.entries()]
    .filter(([, v]) => v.exposures.length >= 2)
    .map(([id, v]) => ({ id, name: v.name, exposures: v.exposures }));

  const plateauCandidates = detectPlateaus(exercisesForPlateau).map((p) => ({
    exerciseId: p.exerciseId,
    exerciseName: p.exerciseName,
    severity: p.severity,
    plateauType: p.plateauType,
    lastWeight: p.lastWeight,
    lastReps: p.lastReps,
    avgRpe: p.avgRpe,
    message: p.message,
  }));

  return {
    generatedAt: new Date().toISOString(),
    user: {
      goalMode: user.goalMode,
      daysPerWeek: user.daysPerWeek,
      sessionMinutes: user.sessionMinutes,
      units: user.units,
      equipment: user.equipment,
      constraints: user.constraints,
    },
    activeSplit: activeSplit
      ? {
          id: activeSplit.id,
          name: activeSplit.name,
          schedule: activeSplit.scheduleDays.map((d) => ({
            weekday: d.weekday,
            label: d.label,
            templateName: d.workoutDayTemplate?.name ?? null,
            isRest: d.isRest,
          })),
        }
      : null,
    currentTemplates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      mode: t.mode,
      exercises: t.blocks.map((b) => ({
        orderIndex: b.orderIndex,
        exerciseName: b.exercise.name,
        setsPlanned: b.setsPlanned,
        repMin: b.repMin,
        repMax: b.repMax,
      })),
    })),
    weeklyAggregates,
    exerciseSummaries,
    plateauCandidates,
  };
}

// =============================================================================
// Stable hash of summary inputs (for caching/dedup)
// =============================================================================

export function hashSummary(summary: TrainingSummary): string {
  // Simple deterministic hash: stringify key fields
  const payload = JSON.stringify({
    g: summary.generatedAt.slice(0, 10), // day-level granularity
    s: summary.activeSplit?.id,
    p: summary.plateauCandidates.map((p) => p.exerciseId).sort(),
    w: summary.weeklyAggregates.map((w) => w.weekLabel),
  });
  // djb2-style hash (no crypto needed — this is a cache hint, not security)
  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) + hash) ^ payload.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
