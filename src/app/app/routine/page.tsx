/**
 * Routine Studio — Tabbed UI skeleton (Task 6.1)
 *
 * Tabs: Splits | Days | Favorites | Versions
 * PulsePlan design: dark-first, glass panels, purple→blue gradient accent
 */

'use client';

import { useState } from 'react';
import { LayoutGrid, CalendarDays, Star, GitBranch } from 'lucide-react';

type Tab = 'splits' | 'days' | 'favorites' | 'versions';

interface TabConfig {
  id: Tab;
  label: string;
  Icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: 'splits',    label: 'Splits',    Icon: LayoutGrid  },
  { id: 'days',      label: 'Days',      Icon: CalendarDays },
  { id: 'favorites', label: 'Favorites', Icon: Star         },
  { id: 'versions',  label: 'Versions',  Icon: GitBranch    },
];

// ── Tab content placeholders ──────────────────────────────────────────────────

function SplitsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-4">
        <LayoutGrid className="h-8 w-8 text-[var(--color-accent-purple)]" />
      </div>
      <h2 className="text-lg font-semibold mb-1">No splits yet</h2>
      <p className="text-sm text-[var(--color-text-muted)] max-w-xs mb-6">
        A split maps your workout days to the week. Create one to get scheduled workouts on your dashboard.
      </p>
      <button className="btn-primary px-6">Create Split</button>
    </div>
  );
}

function DaysTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-4">
        <CalendarDays className="h-8 w-8 text-[var(--color-accent-purple)]" />
      </div>
      <h2 className="text-lg font-semibold mb-1">No saved workout days</h2>
      <p className="text-sm text-[var(--color-text-muted)] max-w-xs mb-6">
        Save a workout day as a reusable template — fixed exercises or slot-based (by muscle group).
      </p>
      <button className="btn-primary px-6">Create Day</button>
    </div>
  );
}

function FavoritesTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-4">
        <Star className="h-8 w-8 text-[var(--color-accent-purple)]" />
      </div>
      <h2 className="text-lg font-semibold mb-1">No favorites yet</h2>
      <p className="text-sm text-[var(--color-text-muted)] max-w-xs mb-6">
        Mark exercises as favorites (Primary or Backup) to speed up day creation and get better AI suggestions.
      </p>
      <button className="btn-secondary px-6">Browse Exercises</button>
    </div>
  );
}

function VersionsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-base-600)] mb-4">
        <GitBranch className="h-8 w-8 text-[var(--color-accent-purple)]" />
      </div>
      <h2 className="text-lg font-semibold mb-1">No program versions</h2>
      <p className="text-sm text-[var(--color-text-muted)] max-w-xs mb-6">
        Every change to your routine is saved as a version inside a program block — so you can compare and roll back at any time.
      </p>
    </div>
  );
}

const TAB_CONTENT: Record<Tab, React.ReactNode> = {
  splits:    <SplitsTab />,
  days:      <DaysTab />,
  favorites: <FavoritesTab />,
  versions:  <VersionsTab />,
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RoutinePage() {
  const [activeTab, setActiveTab] = useState<Tab>('splits');

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Routine Studio</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Splits, days, favorites &amp; versions
        </p>
      </header>

      {/* Tab bar */}
      <nav
        className="flex border-b border-[var(--glass-border)] px-4 gap-1"
        role="tablist"
        aria-label="Routine Studio tabs"
      >
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${id}`}
              id={`tab-${id}`}
              onClick={() => setActiveTab(id)}
              className={[
                'flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors relative',
                'min-h-[44px] touch-target focus-visible:outline-none',
                isActive
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ background: 'var(--color-accent-gradient)' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Tab panels */}
      <div className="flex-1 overflow-y-auto">
        {TABS.map(({ id }) => (
          <div
            key={id}
            role="tabpanel"
            id={`tabpanel-${id}`}
            aria-labelledby={`tab-${id}`}
            hidden={activeTab !== id}
          >
            {TAB_CONTENT[id]}
          </div>
        ))}
      </div>
    </div>
  );
}
