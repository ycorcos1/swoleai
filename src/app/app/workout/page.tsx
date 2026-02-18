'use client';

/**
 * Workout Hub Page (Task 5.1)
 *
 * Redirects to:
 * - /app/workout/session/:id if there's an active session
 * - /app/workout/start if no active session
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveSessionContext } from '@/lib/offline';
import { Loader2 } from 'lucide-react';

export default function WorkoutPage() {
  const router = useRouter();
  const { session, isLoading } = useActiveSessionContext();

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        // There's an active session, redirect to it
        const sessionId = session.serverSessionId || 'current';
        router.replace(`/app/workout/session/${sessionId}`);
      } else {
        // No active session, go to start page
        router.replace('/app/workout/start');
      }
    }
  }, [isLoading, session, router]);

  // Show loading spinner while determining redirect
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent-purple)]" />
    </div>
  );
}
