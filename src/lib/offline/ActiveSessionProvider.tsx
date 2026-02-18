'use client';

/**
 * SwoleAI Active Session Provider (Task 4.2)
 *
 * React Context provider for active workout session state.
 * Wraps the app to provide session state and restoration on app reload.
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import { useActiveSession, type UseActiveSessionReturn } from './useActiveSession';

// =============================================================================
// CONTEXT
// =============================================================================

const ActiveSessionContext = createContext<UseActiveSessionReturn | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface ActiveSessionProviderProps {
  children: ReactNode;
}

/**
 * Provider component for active workout session state
 *
 * Wrap your app (or workout-related pages) with this provider to:
 * - Automatically restore active session state on app reload
 * - Access session state and mutation functions via useActiveSessionContext
 *
 * @example
 * ```tsx
 * // In your layout or page
 * <ActiveSessionProvider>
 *   <WorkoutApp />
 * </ActiveSessionProvider>
 * ```
 */
export function ActiveSessionProvider({ children }: ActiveSessionProviderProps) {
  const sessionState = useActiveSession();

  return (
    <ActiveSessionContext.Provider value={sessionState}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

// =============================================================================
// CONTEXT HOOK
// =============================================================================

/**
 * Hook to access the active session context
 *
 * Must be used within an ActiveSessionProvider
 *
 * @returns The active session state and mutation functions
 * @throws Error if used outside of ActiveSessionProvider
 *
 * @example
 * ```tsx
 * function WorkoutScreen() {
 *   const { session, isLoading, logSet } = useActiveSessionContext();
 *
 *   if (isLoading) return <Loading />;
 *   if (!session) return <StartWorkout />;
 *
 *   return <WorkoutInProgress session={session} onLogSet={logSet} />;
 * }
 * ```
 */
export function useActiveSessionContext(): UseActiveSessionReturn {
  const context = useContext(ActiveSessionContext);

  if (!context) {
    throw new Error(
      'useActiveSessionContext must be used within an ActiveSessionProvider'
    );
  }

  return context;
}
