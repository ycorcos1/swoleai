/**
 * Routine Studio placeholder (Task 6.x)
 *
 * Full implementation in Phase 6.
 * Renders a coming-soon state so the route exists on production
 * and the bottom nav never 404s.
 */

import { CalendarDays } from 'lucide-react';

export default function RoutinePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-6">
        <CalendarDays className="h-10 w-10 text-[var(--color-accent-purple)]" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Routine Studio</h1>
      <p className="text-[var(--color-text-muted)] max-w-xs">
        Splits, saved workout days, favorites, and program versions — coming soon.
      </p>
    </div>
  );
}
