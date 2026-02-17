import { GlassCard } from '@/components/ui/GlassCard';

export default function DashboardPage() {
  return (
    <div className="px-4 py-6">
      {/* Header */}
      <header className="mb-6">
        <p className="text-sm text-[var(--color-text-muted)]">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1 className="mt-1 text-2xl font-bold">Dashboard</h1>
      </header>

      {/* Today Card */}
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">Today</p>
            <h2 className="mt-1 text-lg font-semibold">No workout scheduled</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Create a split to get started
            </p>
          </div>
        </div>
        <button className="btn-primary mt-4 w-full">Start Workout</button>
      </GlassCard>

      {/* Coach Actions Card */}
      <GlassCard className="mb-4">
        <h3 className="mb-3 font-semibold">Coach Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary text-sm">Next Session Plan</button>
          <button className="btn-secondary text-sm">Weekly Check-in</button>
          <button className="btn-secondary text-sm">Diagnose Plateau</button>
          <button className="btn-secondary text-sm">Goals Review</button>
        </div>
      </GlassCard>

      {/* Quick Stats */}
      <GlassCard>
        <h3 className="mb-3 font-semibold">This Week</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-2xl font-bold tabular-nums">0 / 4</p>
            <p className="text-xs text-[var(--color-text-muted)]">Workouts</p>
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold tabular-nums">—</p>
            <p className="text-xs text-[var(--color-text-muted)]">Last workout</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
