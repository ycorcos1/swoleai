'use client';

import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell — Main layout wrapper for authenticated app pages
 * Provides the mobile-first structure with bottom navigation
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-base-900)]">
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-[var(--bottom-nav-height)]">
        {children}
      </main>
      
      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
