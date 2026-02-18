'use client';

import { BottomNav } from './BottomNav';
import { SyncStatusPill } from '@/components/ui';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell — Main layout wrapper for authenticated app pages
 * Provides the mobile-first structure with bottom navigation
 * Includes global sync status indicator (Task 4.4)
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-base-900)]">
      {/* Global header with sync status */}
      <header className="sticky top-0 z-40 flex h-12 items-center justify-end border-b border-[var(--glass-border)] bg-[var(--color-base-800)]/95 px-4 backdrop-blur-lg safe-area-top">
        <SyncStatusPill />
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-[var(--bottom-nav-height)]">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
