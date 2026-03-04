/**
 * One-time script to deduplicate exercises that have the same normalized name.
 * Normalization: lowercase, trim, collapse whitespace, strip trailing 's'.
 *
 * Run with:  npx ts-node --skip-project scripts/dedup-exercises.ts
 * Or:        npx tsx scripts/dedup-exercises.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/s$/, ''); // strip trailing 's' to catch plurals
}

async function main() {
  const exercises = await prisma.exercise.findMany({
    select: { id: true, name: true, muscleGroups: true, isCustom: true, ownerUserId: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by [ownerUserId or 'system'] + normalized name
  const groups = new Map<string, typeof exercises>();
  for (const ex of exercises) {
    const scope = ex.ownerUserId ?? 'system';
    const key = `${scope}::${normalize(ex.name)}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(ex);
    groups.set(key, bucket);
  }

  let totalMerged = 0;

  for (const [, bucket] of groups) {
    if (bucket.length <= 1) continue;

    const [canonical, ...duplicates] = bucket;
    console.log(`Merging "${duplicates.map(d => d.name).join('", "')}" → "${canonical.name}"`);

    for (const dup of duplicates) {
      // Re-point any favorites referencing the duplicate → canonical
      // (favorites have a unique constraint on user_id + exercise_id, so skip if one exists)
      const favs = await prisma.favorite.findMany({ where: { exerciseId: dup.id } });
      for (const fav of favs) {
        const alreadyExists = await prisma.favorite.findUnique({
          where: { userId_exerciseId: { userId: fav.userId, exerciseId: canonical.id } },
        });
        if (!alreadyExists) {
          await prisma.favorite.update({
            where: { id: fav.id },
            data: { exerciseId: canonical.id },
          });
        } else {
          await prisma.favorite.delete({ where: { id: fav.id } });
        }
      }

      // Re-point personal records
      const prs = await prisma.personalRecord.findMany({ where: { exerciseId: dup.id } });
      for (const pr of prs) {
        const alreadyExists = await prisma.personalRecord.findUnique({
          where: { userId_exerciseId: { userId: pr.userId, exerciseId: canonical.id } },
        });
        if (!alreadyExists) {
          await prisma.personalRecord.update({
            where: { id: pr.id },
            data: { exerciseId: canonical.id },
          });
        } else {
          await prisma.personalRecord.delete({ where: { id: pr.id } });
        }
      }

      // Delete the duplicate exercise
      await prisma.exercise.delete({ where: { id: dup.id } });
      totalMerged++;
    }
  }

  console.log(`\nDone. Merged ${totalMerged} duplicate exercise(s).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
