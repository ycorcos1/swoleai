/**
 * GET /api/versions/:id/compare?to=:toId — Task 8.4
 *
 * Compares two routine version snapshots and returns a structured diff.
 *
 * The diff covers:
 *   - Template changes: blocks added / removed / modified (exercise swap, rep changes)
 *   - Schedule day changes: which template is assigned to each weekday
 *   - Favorite changes: exercises added or removed from favorites
 *
 * Query params:
 *   - to: the ID of the second version to compare against (required)
 *
 * Returns: { from, to, diff }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  RoutineSnapshot,
  SnapshotBlock,
  SnapshotTemplate,
} from '@/lib/versions/snapshot';

// =============================================================================
// Diff Types
// =============================================================================

export interface BlockDiff {
  orderIndex: number;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  from: SnapshotBlock | null;
  to: SnapshotBlock | null;
  /** Human-readable summary of what changed */
  changes: string[];
}

export interface TemplateDiff {
  templateId: string;
  templateName: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  blocks: BlockDiff[];
}

export interface ScheduleDayDiff {
  weekday: string;
  status: 'changed' | 'unchanged';
  from: { templateId: string | null; isRest: boolean; label: string | null };
  to: { templateId: string | null; isRest: boolean; label: string | null };
}

export interface VersionDiff {
  templates: TemplateDiff[];
  scheduleDays: ScheduleDayDiff[];
  favorites: {
    added: string[];
    removed: string[];
  };
}

// =============================================================================
// Diff helpers
// =============================================================================

function diffBlocks(
  fromBlocks: SnapshotBlock[],
  toBlocks: SnapshotBlock[]
): BlockDiff[] {
  const maxLen = Math.max(fromBlocks.length, toBlocks.length);
  const result: BlockDiff[] = [];

  for (let i = 0; i < maxLen; i++) {
    const from = fromBlocks[i] ?? null;
    const to = toBlocks[i] ?? null;

    if (!from && to) {
      result.push({ orderIndex: i, status: 'added', from: null, to, changes: ['Block added'] });
      continue;
    }
    if (from && !to) {
      result.push({ orderIndex: i, status: 'removed', from, to: null, changes: ['Block removed'] });
      continue;
    }
    if (!from || !to) continue;

    const changes: string[] = [];
    if (from.exerciseId !== to.exerciseId) {
      changes.push(`Exercise: ${from.exerciseName} → ${to.exerciseName}`);
    }
    if (from.setsPlanned !== to.setsPlanned) {
      changes.push(`Sets: ${from.setsPlanned} → ${to.setsPlanned}`);
    }
    if (from.repMin !== to.repMin || from.repMax !== to.repMax) {
      changes.push(`Reps: ${from.repMin}–${from.repMax} → ${to.repMin}–${to.repMax}`);
    }
    if (from.restSeconds !== to.restSeconds) {
      changes.push(`Rest: ${from.restSeconds}s → ${to.restSeconds}s`);
    }
    if (from.progressionEngine !== to.progressionEngine) {
      changes.push(
        `Progression: ${from.progressionEngine ?? 'none'} → ${to.progressionEngine ?? 'none'}`
      );
    }

    result.push({
      orderIndex: i,
      status: changes.length > 0 ? 'changed' : 'unchanged',
      from,
      to,
      changes,
    });
  }

  return result;
}

function diffTemplates(
  fromSnap: RoutineSnapshot,
  toSnap: RoutineSnapshot
): TemplateDiff[] {
  const fromById = new Map<string, SnapshotTemplate>(
    fromSnap.templates.map((t) => [t.id, t])
  );
  const toById = new Map<string, SnapshotTemplate>(
    toSnap.templates.map((t) => [t.id, t])
  );

  const allIds = new Set([...fromById.keys(), ...toById.keys()]);
  const result: TemplateDiff[] = [];

  for (const id of allIds) {
    const from = fromById.get(id);
    const to = toById.get(id);

    if (!from && to) {
      result.push({
        templateId: id,
        templateName: to.name,
        status: 'added',
        blocks: diffBlocks([], to.blocks),
      });
    } else if (from && !to) {
      result.push({
        templateId: id,
        templateName: from.name,
        status: 'removed',
        blocks: diffBlocks(from.blocks, []),
      });
    } else if (from && to) {
      const blocks = diffBlocks(from.blocks, to.blocks);
      const hasChanges = blocks.some((b) => b.status !== 'unchanged');
      result.push({
        templateId: id,
        templateName: to.name,
        status: hasChanges ? 'changed' : 'unchanged',
        blocks,
      });
    }
  }

  // Sort: changed first, then unchanged
  result.sort((a, b) => {
    const order = { added: 0, removed: 1, changed: 2, unchanged: 3 };
    return order[a.status] - order[b.status];
  });

  return result;
}

function diffScheduleDays(
  fromSnap: RoutineSnapshot,
  toSnap: RoutineSnapshot
): ScheduleDayDiff[] {
  const fromByWeekday = new Map(fromSnap.scheduleDays.map((d) => [d.weekday, d]));
  const toByWeekday = new Map(toSnap.scheduleDays.map((d) => [d.weekday, d]));
  const allWeekdays = new Set([...fromByWeekday.keys(), ...toByWeekday.keys()]);

  const result: ScheduleDayDiff[] = [];
  for (const weekday of allWeekdays) {
    const from = fromByWeekday.get(weekday);
    const to = toByWeekday.get(weekday);
    const fromData = {
      templateId: from?.templateId ?? null,
      isRest: from?.isRest ?? false,
      label: from?.label ?? null,
    };
    const toData = {
      templateId: to?.templateId ?? null,
      isRest: to?.isRest ?? false,
      label: to?.label ?? null,
    };
    const changed =
      fromData.templateId !== toData.templateId ||
      fromData.isRest !== toData.isRest;

    result.push({
      weekday,
      status: changed ? 'changed' : 'unchanged',
      from: fromData,
      to: toData,
    });
  }

  return result;
}

function diffFavorites(
  fromSnap: RoutineSnapshot,
  toSnap: RoutineSnapshot
): { added: string[]; removed: string[] } {
  const fromSet = new Set(fromSnap.favoriteIds);
  const toSet = new Set(toSnap.favoriteIds);
  return {
    added: toSnap.favoriteIds.filter((id) => !fromSet.has(id)),
    removed: fromSnap.favoriteIds.filter((id) => !toSet.has(id)),
  };
}

// =============================================================================
// Route handler
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }
  const { userId } = auth;

  const { id: fromId } = await params;
  const toId = request.nextUrl.searchParams.get('to');

  if (!toId) {
    return NextResponse.json(
      { error: 'Query param "to" is required' },
      { status: 400 }
    );
  }

  // Load both versions
  const [fromVersion, toVersion] = await Promise.all([
    prisma.routineVersion.findFirst({
      where: { id: fromId, userId },
      select: {
        id: true,
        versionNumber: true,
        changelog: true,
        createdAt: true,
        snapshotJson: true,
      },
    }),
    prisma.routineVersion.findFirst({
      where: { id: toId, userId },
      select: {
        id: true,
        versionNumber: true,
        changelog: true,
        createdAt: true,
        snapshotJson: true,
      },
    }),
  ]);

  if (!fromVersion) {
    return NextResponse.json(
      { error: `Version ${fromId} not found` },
      { status: 404 }
    );
  }
  if (!toVersion) {
    return NextResponse.json(
      { error: `Version ${toId} not found` },
      { status: 404 }
    );
  }

  const fromSnap = fromVersion.snapshotJson as unknown as RoutineSnapshot;
  const toSnap = toVersion.snapshotJson as unknown as RoutineSnapshot;

  const diff: VersionDiff = {
    templates: diffTemplates(fromSnap, toSnap),
    scheduleDays: diffScheduleDays(fromSnap, toSnap),
    favorites: diffFavorites(fromSnap, toSnap),
  };

  return NextResponse.json({
    from: {
      id: fromVersion.id,
      versionNumber: fromVersion.versionNumber,
      changelog: fromVersion.changelog,
      createdAt: fromVersion.createdAt,
    },
    to: {
      id: toVersion.id,
      versionNumber: toVersion.versionNumber,
      changelog: toVersion.changelog,
      createdAt: toVersion.createdAt,
    },
    diff,
  });
}
