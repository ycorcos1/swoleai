import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const startWorkoutSchema = z.object({
  splitId: z.string().optional(),
  templateId: z.string().optional(),
  title: z.string().max(200).optional(),
  notes: z.string().optional(),
  // When provided (YYYY-MM-DD), creates a completed backfilled session for that past date
  backfillDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  constraintFlags: z
    .object({
      pain: z.array(z.string()).optional(),
      equipmentCrowded: z.boolean().optional(),
      lowEnergy: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parseResult = startWorkoutSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { splitId, templateId, title, notes, constraintFlags, backfillDate } = parseResult.data;

  if (splitId) {
    const split = await prisma.split.findFirst({ where: { id: splitId, userId }, select: { id: true } });
    if (!split) return NextResponse.json({ error: 'Split not found' }, { status: 404 });
  }

  if (templateId) {
    const template = await prisma.workoutDayTemplate.findFirst({ where: { id: templateId, userId }, select: { id: true, name: true } });
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  if (backfillDate) {
    // ── Backfill: create a completed session on the given past date ──────────
    const [year, month, day] = backfillDate.split('-').map(Number);
    const dateUTC = new Date(Date.UTC(year, month - 1, day));
    const sessionStart = new Date(Date.UTC(year, month - 1, day, 9, 0, 0)); // 9am on that day

    const session = await prisma.workoutSession.create({
      data: {
        userId,
        startedAt: sessionStart,
        endedAt: sessionStart,
        status: 'COMPLETED',
        title: title ?? null,
        notes: notes ?? null,
        splitId: splitId ?? null,
        templateId: templateId ?? null,
        constraintFlags: constraintFlags ?? {},
      },
      select: { id: true, startedAt: true, status: true, title: true, templateId: true },
    });

    // Upsert a ScheduledDayLog linking this session to the date
    await prisma.scheduledDayLog.upsert({
      where: { userId_date: { userId, date: dateUTC } },
      update: {
        status: 'COMPLETED',
        workoutSessionId: session.id,
        scheduledTemplateId: templateId ?? null,
      },
      create: {
        userId,
        date: dateUTC,
        status: 'COMPLETED',
        workoutSessionId: session.id,
        scheduledTemplateId: templateId ?? null,
      },
    });

    return NextResponse.json({ sessionId: session.id, session }, { status: 201 });
  }

  // ── Normal (today) session ────────────────────────────────────────────────
  const session = await prisma.workoutSession.create({
    data: {
      userId,
      startedAt: new Date(),
      status: 'ACTIVE',
      title: title ?? null,
      notes: notes ?? null,
      splitId: splitId ?? null,
      templateId: templateId ?? null,
      constraintFlags: constraintFlags ?? {},
    },
    select: {
      id: true, startedAt: true, status: true, title: true, notes: true,
      constraintFlags: true, splitId: true, templateId: true, createdAt: true,
      split: { select: { id: true, name: true } },
      template: { select: { id: true, name: true, mode: true } },
    },
  });

  return NextResponse.json({ sessionId: session.id, session }, { status: 201 });
}
