'use client';

/**
 * OnboardingModal — Task F.1
 *
 * Shown to brand-new users on their first dashboard visit.
 * Two CTAs:
 *  1. "Build my routine with AI" → opens AIRoutineWizard
 *  2. "I'll set it up myself"   → navigates to /app/routine
 *
 * Dismissing or choosing either option marks onboardingComplete = true
 * via PUT /api/profile so the modal never re-appears.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, CalendarDays, X } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface OnboardingModalProps {
  /** Called when the modal should close */
  onClose: () => void;
  /** Called when user picks "Build with AI" */
  onBuildWithAI: () => void;
}

// =============================================================================
// HELPER
// =============================================================================

async function markOnboardingComplete() {
  try {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboardingComplete: true }),
    });
  } catch {
    // Non-critical — silently ignore
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OnboardingModal({ onClose, onBuildWithAI }: OnboardingModalProps) {
  const router = useRouter();

  const handleBuildWithAI = useCallback(async () => {
    await markOnboardingComplete();
    onClose();
    onBuildWithAI();
  }, [onClose, onBuildWithAI]);

  const handleSelfSetup = useCallback(async () => {
    await markOnboardingComplete();
    onClose();
    router.push('/app/routine');
  }, [onClose, router]);

  const handleDismiss = useCallback(async () => {
    await markOnboardingComplete();
    onClose();
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="w-full max-w-md bg-[var(--color-base-800)] border border-[var(--glass-border)] rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
          {/* Gradient top strip */}
          <div className="h-1 w-full bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-blue)]" />

          <div className="px-6 pt-6 pb-8">
            {/* Dismiss button */}
            <div className="flex justify-end mb-2">
              <button
                onClick={handleDismiss}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-base-600)] transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] shadow-[var(--shadow-glow)]">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2
                id="onboarding-title"
                className="text-2xl font-bold mb-2"
              >
                Welcome to SwoleAI
              </h2>
              <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                Let&apos;s get your training set up. How would you like to build your routine?
              </p>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              {/* Primary — AI wizard */}
              <button
                onClick={handleBuildWithAI}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] hover:opacity-95 active:scale-[0.98] transition-all text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">Build my routine with AI</p>
                  <p className="text-xs text-white/70 mt-0.5">
                    Answer a few questions — AI designs your split
                  </p>
                </div>
              </button>

              {/* Secondary — self setup */}
              <button
                onClick={handleSelfSetup}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-[0.98] transition-all text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-base-500)]">
                  <CalendarDays className="h-5 w-5 text-[var(--color-text-secondary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--color-text-primary)]">I&apos;ll set it up myself</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Go to Routine Studio and build manually
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
