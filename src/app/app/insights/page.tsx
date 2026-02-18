/**
 * Insights placeholder (Task 7.x)
 *
 * Full implementation in Phase 7.
 * Renders a coming-soon state so the route exists on production
 * and the bottom nav never 404s.
 */

import { BarChart3 } from 'lucide-react';

export default function InsightsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-6">
        <BarChart3 className="h-10 w-10 text-[var(--color-accent-blue)]" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Insights</h1>
      <p className="text-[var(--color-text-muted)] max-w-xs">
        Volume balance, PR feed, and plateau alerts — coming soon.
      </p>
    </div>
  );
}
