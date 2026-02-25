/**
 * Routine Studio — Tabbed UI skeleton (Task 6.1)
 *
 * Tabs: Splits | Days | Favorites | Versions
 * PulsePlan design: dark-first, glass panels, purple→blue gradient accent
 */

'use client';

import { useState } from 'react';
import { LayoutGrid, CalendarDays, Star, GitBranch } from 'lucide-react';
import { SplitsTab } from '@/components/splits/SplitsTab';
import { DaysTab } from '@/components/days/DaysTab';
import { FavoritesTab } from '@/components/favorites/FavoritesTab';
import { VersionsTab } from '@/components/versions/VersionsTab';

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
