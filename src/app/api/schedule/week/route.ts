import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// =============================================================================
// GET /api/schedule/week
// =============================================================================
// Returns a 7-day window of schedule data (3 days past + today + 3 days future).
// Each day includes:
//   - date: ISO string (midnight UTC)
//   - weekday: SUNDAY..SATURDAY
//   - scheduledTemplate: the template from the active split for that weekday (if any)
//   - isScheduledRest: whether the split marks this weekday as rest
//   - dayLog: the ScheduledDayLog record for this date (null if none yet)
//   - workoutSession: the completed WorkoutSession for this date (null if none)
//
// The optional `startDate` query param overrides the center date (defaults to today).
// =============================================================================

const WEEKDAY_ENUM = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

type WeekdayEnum = (typeof WEEKDAY_ENUM)[number];

function toMidnightUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { userId } = auth;

  // Allow a custom center date via query param; default to today
  const centerParam = request.nextUrl.searchParams.get('centerDate');
  const center = centerParam ? new Date(centerParam) : new Date();

  // Allow a custom window size via query param; default to 7 (3 past + today + 3 future)
  const windowParam = request.nextUrl.searchParams.get('window');
  const windowSize = windowParam ? Math.min(Math.max(parseInt(windowParam, 10), 7), 60) : 7;
  const startOfWeek = request.nextUrl.searchParams.get('startOfWeek') === 'true';
  // When startOfWeek=true, center is Monday and we return exactly 7 days forward (Mon–Sun)
  const pastDays = startOfWeek ? 0 : Math.floor((windowSize - 1) / 2);
  const futureDays = windowSize - 1 - pastDays;

  // Build the window
  const days: Date[] = [];
  for (let offset = -pastDays; offset <= futureDays; offset++) {
    const d = new Date(center);
    d.setDate(d.getDate() + offset);
    days.push(toMidnightUTC(d));
  }

  const windowStart = days[0];
  const windowEnd = days[days.length - 1];

  // Fetch active split with schedule days
  const activeSplit = await prisma.split.findFirst({
    where: { userId, isActive: true },
    include: {
      scheduleDays: {
        include: {
          workoutDayTemplate: {
            select: {
              id: true,
              name: true,
              mode: true,
              estimatedMinutes: true,
              blocks: {
                select: { id: true, exercise: { select: { name: true } } },
                orderBy: { orderIndex: 'asc' },
                take: 4,
              },
            },
          },
        },
      },
    },
  });

  // Fetch existing day logs for the window
  const dayLogs = await prisma.scheduledDayLog.findMany({
    where: {
      userId,
      date: { gte: windowStart, lte: windowEnd },
    },
    include: {
      workoutSession: {
        select: {
          id: true,
          title: true,
          startedAt: true,
          endedAt: true,
          status: true,
          exercises: {
            select: {
              id: true,
              exercise: { select: { name: true } },
              _count: { select: { sets: true } },
            },
            orderBy: { orderIndex: 'asc' },
          },
        },
      },
      scheduledTemplate: {
        select: {
          id: true,
          name: true,
          mode: true,
          estimatedMinutes: true,
          blocks: {
            select: { id: true, exercise: { select: { name: true } } },
            orderBy: { orderIndex: 'asc' },
            take: 4,
          },
        },
      },
    },
  });

  // Fetch completed sessions that fall within the window (not already linked to a day log)
  const completedSessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      startedAt: {
        gte: windowStart,
        lte: new Date(windowEnd.getTime() + 86400000), // include full last day
      },
    },
    select: {
      id: true,
      title: true,
      startedAt: true,
      endedAt: true,
      status: true,
      templateId: true,
      exercises: {
        select: {
          id: true,
          exercise: { select: { name: true } },
          _count: { select: { sets: true } },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  // Build lookup maps
  const dayLogByDate = new Map(
    dayLogs.map((log) => [log.date.toISOString().slice(0, 10), log])
  );
  const sessionByDate = new Map<string, (typeof completedSessions)[number]>();
  for (const session of completedSessions) {
    const key = toMidnightUTC(new Date(session.startedAt))
      .toISOString()
      .slice(0, 10);
    if (!sessionByDate.has(key)) {
      sessionByDate.set(key, session);
    }
  }

  // Build the schedule map from the active split
  const scheduleByWeekday = new Map<WeekdayEnum, (typeof activeSplit.scheduleDays)[number]>();
  if (activeSplit) {
    for (const day of activeSplit.scheduleDays) {
      scheduleByWeekday.set(day.weekday as WeekdayEnum, day);
    }
  }

  const today = toMidnightUTC(new Date());

  // Assemble the response
  const result = days.map((date) => {
    const dateKey = date.toISOString().slice(0, 10);
    const weekday = WEEKDAY_ENUM[date.getUTCDay()];
    const scheduleDay = scheduleByWeekday.get(weekday) ?? null;
    const dayLog = dayLogByDate.get(dateKey) ?? null;
    const session = sessionByDate.get(dateKey) ?? null;
    const isToday = date.getTime() === today.getTime();
    const isPast = date.getTime() < today.getTime();

    return {
      date: dateKey,
      weekday,
      isToday,
      isPast,
      isScheduledRest: scheduleDay?.isRest ?? false,
      scheduledTemplate: scheduleDay?.workoutDayTemplate ?? null,
      scheduledLabel: scheduleDay?.label ?? null,
      dayLog: dayLog
        ? {
            id: dayLog.id,
            status: dayLog.status,
            workoutSession: dayLog.workoutSession,
            scheduledTemplate: dayLog.scheduledTemplate,
          }
        : null,
      completedSession: session ?? null,
    };
  });

  return NextResponse.json({
    days: result,
    activeSplitName: activeSplit?.name ?? null,
    today: today.toISOString().slice(0, 10),
  });
}
