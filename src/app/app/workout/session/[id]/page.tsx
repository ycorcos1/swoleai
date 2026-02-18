'use client';

/**
 * Workout Session Page (Placeholder)
 *
 * This is a placeholder for Task 5.2 (Workout Mode screen skeleton).
 * For now, it just shows the session is active.
 */

import { useParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { useActiveSessionContext } from '@/lib/offline';
import { Dumbbell, Loader2 } from 'lucide-react';

export default function WorkoutSessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { session, isLoading } = useActiveSessionContext();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent-purple)]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <Dumbbell className="h-16 w-16 text-[var(--color-text-muted)] mb-4" />
        <h1 className="text-xl font-bold mb-2">No Active Session</h1>
        <p className="text-[var(--color-text-muted)]">
          Start a workout to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">
          {session.title || 'Workout Session'}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Session ID: {sessionId}
        </p>
      </header>

      {/* Session Info */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-purple)]/20">
            <Dumbbell className="h-5 w-5 text-[var(--color-accent-purple)]" />
          </div>
          <div>
            <p className="font-medium">Workout in Progress</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Started {session.startedAt.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {session.exercises.length} exercise(s) added
        </p>
      </GlassCard>

      {/* Placeholder for Task 5.2 */}
      <GlassCard className="text-center py-8">
        <p className="text-[var(--color-text-muted)]">
          Exercise cards and workout mode UI coming in Task 5.2
        </p>
      </GlassCard>
    </div>
  );
}
