import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// POST /api/schedule/log
// =============================================================================
// Records what happened on a given calendar day.
// No shift logic — users manually update what workout they do on each day.
// =============================================================================

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  status: z.enum(['MISSED', 'REST', 'SKIPPED']),
  scheduledTemplateId: z.string().optional(),
});

function toMidnightUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { date, status, scheduledTemplateId } = parsed.data;
  const dateUTC = toMidnightUTC(date);

  const dayLog = await prisma.scheduledDayLog.upsert({
    where: { userId_date: { userId, date: dateUTC } },
    update: {
      status,
      scheduledTemplateId: scheduledTemplateId ?? null,
      shiftedToDate: null,
      shiftedFromDate: null,
    },
    create: {
      userId,
      date: dateUTC,
      status,
      scheduledTemplateId: scheduledTemplateId ?? null,
    },
  });

  return NextResponse.json({
    dayLog: {
      id: dayLog.id,
      date: date,
      status: dayLog.status,
    },
  });
}
