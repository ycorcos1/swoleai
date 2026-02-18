/**
 * Settings placeholder (Task 8.x)
 *
 * Full implementation in Phase 8.
 * Renders a coming-soon state so the route exists on production
 * and the bottom nav never 404s.
 */

import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-6">
        <Settings className="h-10 w-10 text-[var(--color-text-secondary)]" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-[var(--color-text-muted)] max-w-xs">
        Profile, preferences, sync status, and data export — coming soon.
      </p>
    </div>
  );
}
