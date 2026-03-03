'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  Target,
  Calendar,
  Clock,
  Dumbbell,
  Zap,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

type Goal = 'HYPERTROPHY' | 'STRENGTH' | 'HYBRID' | 'FAT_LOSS';
type Equipment = 'COMMERCIAL' | 'HOME' | 'BODYWEIGHT';
type Experience = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

interface WizardState {
  goal: Goal | null;
  daysPerWeek: number | null;
  sessionMinutes: number | null;
  equipment: Equipment | null;
  experienceLevel: Experience;
  focusAreas: string[];
}

interface AIRoutineWizardProps {
  onClose: () => void;
}

// =============================================================================
// Step configs
// =============================================================================

const GOALS: { value: Goal; label: string; description: string; icon: string }[] = [
  { value: 'HYPERTROPHY', label: 'Build Muscle', description: 'Maximize muscle size & definition', icon: '💪' },
  { value: 'STRENGTH', label: 'Get Stronger', description: 'Increase maximal strength & power', icon: '🏋️' },
  { value: 'HYBRID', label: 'Hybrid', description: 'Balance strength and muscle growth', icon: '⚡' },
  { value: 'FAT_LOSS', label: 'Fat Loss', description: 'Lose fat while keeping muscle', icon: '🔥' },
];

const DAYS = [2, 3, 4, 5, 6];

const SESSION_LENGTHS: { value: number; label: string }[] = [
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 75, label: '75 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '2 hours' },
];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string; description: string }[] = [
  { value: 'COMMERCIAL', label: 'Commercial Gym', description: 'Barbells, machines, cables & more' },
  { value: 'HOME', label: 'Home Gym', description: 'Dumbbells, bands, pull-up bar' },
  { value: 'BODYWEIGHT', label: 'Bodyweight Only', description: 'No equipment needed' },
];

const EXPERIENCE_OPTIONS: { value: Experience; label: string; description: string }[] = [
  { value: 'BEGINNER', label: 'Beginner', description: 'Less than 1 year of training' },
  { value: 'INTERMEDIATE', label: 'Intermediate', description: '1–3 years of training' },
  { value: 'ADVANCED', label: 'Advanced', description: '3+ years of training' },
];

const FOCUS_OPTIONS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core', 'Upper Body', 'Lower Body'];

const STEPS = ['Goal', 'Schedule', 'Equipment', 'Experience', 'Review'];

// =============================================================================
// Component
// =============================================================================

export function AIRoutineWizard({ onClose }: AIRoutineWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<WizardState>({
    goal: null,
    daysPerWeek: null,
    sessionMinutes: null,
    equipment: null,
    experienceLevel: 'INTERMEDIATE',
    focusAreas: [],
  });

  const canAdvance = () => {
    if (step === 0) return state.goal !== null;
    if (step === 1) return state.daysPerWeek !== null && state.sessionMinutes !== null;
    if (step === 2) return state.equipment !== null;
    if (step === 3) return true;
    return true;
  };

  function toggleFocus(area: string) {
    setState((s) => ({
      ...s,
      focusAreas: s.focusAreas.includes(area)
        ? s.focusAreas.filter((f) => f !== area)
        : s.focusAreas.length < 3
        ? [...s.focusAreas, area]
        : s.focusAreas,
    }));
  }

  async function handleGenerate() {
    if (!state.goal || !state.daysPerWeek || !state.sessionMinutes || !state.equipment) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/coach/create-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: state.goal,
          daysPerWeek: state.daysPerWeek,
          sessionMinutes: state.sessionMinutes,
          equipment: state.equipment,
          experienceLevel: state.experienceLevel,
          focusAreas: state.focusAreas,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to generate routine');
      }
      // Navigate to routine page to see the result
      router.push('/app/routine');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ paddingBottom: '72px' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[var(--color-base-800)] rounded-t-2xl sm:rounded-2xl border border-[var(--glass-border)] shadow-2xl flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 72px - 16px)' }}
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(139,92,246,0.15)' }}>
              <Sparkles className="h-4 w-4 text-[var(--color-accent-purple)]" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Create AI Routine</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Step {step + 1} of {STEPS.length}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-base-700)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex-none h-1 bg-[var(--color-base-700)]">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Step 0 — Goal */}
          {step === 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-[var(--color-accent-purple)]" />
                <h3 className="font-semibold">What&apos;s your goal?</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setState((s) => ({ ...s, goal: g.value }))}
                    className={[
                      'flex flex-col items-start gap-1 rounded-xl p-3 border text-left transition-all',
                      state.goal === g.value
                        ? 'border-[var(--color-accent-purple)] bg-purple-500/10'
                        : 'border-[var(--glass-border)] bg-[var(--color-base-700)] hover:border-[var(--color-accent-purple)]/50',
                    ].join(' ')}
                  >
                    <span className="text-xl">{g.icon}</span>
                    <span className="text-sm font-semibold">{g.label}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] leading-tight">{g.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Schedule */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-[var(--color-accent-purple)]" />
                <h3 className="font-semibold">How often can you train?</h3>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">Days per week</p>
              <div className="flex gap-2 mb-5">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setState((s) => ({ ...s, daysPerWeek: d }))}
                    className={[
                      'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                      state.daysPerWeek === d
                        ? 'border-[var(--color-accent-purple)] bg-purple-500/10 text-[var(--color-accent-purple)]'
                        : 'border-[var(--glass-border)] bg-[var(--color-base-700)] text-[var(--color-text-secondary)]',
                    ].join(' ')}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-[var(--color-accent-purple)]" />
                <p className="text-xs text-[var(--color-text-muted)]">Session length</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SESSION_LENGTHS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setState((prev) => ({ ...prev, sessionMinutes: s.value }))}
                    className={[
                      'px-3 py-2 rounded-xl text-sm font-medium border transition-all',
                      state.sessionMinutes === s.value
                        ? 'border-[var(--color-accent-purple)] bg-purple-500/10 text-[var(--color-accent-purple)]'
                        : 'border-[var(--glass-border)] bg-[var(--color-base-700)] text-[var(--color-text-secondary)]',
                    ].join(' ')}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Equipment */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell className="h-4 w-4 text-[var(--color-accent-purple)]" />
                <h3 className="font-semibold">What equipment do you have?</h3>
              </div>
              <div className="space-y-2">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <button
                    key={eq.value}
                    onClick={() => setState((s) => ({ ...s, equipment: eq.value }))}
                    className={[
                      'w-full flex items-center gap-3 rounded-xl p-3.5 border text-left transition-all',
                      state.equipment === eq.value
                        ? 'border-[var(--color-accent-purple)] bg-purple-500/10'
                        : 'border-[var(--glass-border)] bg-[var(--color-base-700)] hover:border-[var(--color-accent-purple)]/50',
                    ].join(' ')}
                  >
                    <div className={[
                      'h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                      state.equipment === eq.value ? 'border-[var(--color-accent-purple)]' : 'border-[var(--color-text-muted)]',
                    ].join(' ')}>
                      {state.equipment === eq.value && (
                        <div className="h-2 w-2 rounded-full bg-[var(--color-accent-purple)]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{eq.label}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{eq.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Experience + Focus */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-[var(--color-accent-purple)]" />
                <h3 className="font-semibold">Experience & focus areas</h3>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">Experience level</p>
              <div className="flex gap-2 mb-5">
                {EXPERIENCE_OPTIONS.map((e) => (
                  <button
                    key={e.value}
                    onClick={() => setState((s) => ({ ...s, experienceLevel: e.value }))}
                    className={[
                      'flex-1 py-2 px-1 rounded-xl text-xs font-semibold border text-center transition-all',
                      state.experienceLevel === e.value
                        ? 'border-[var(--color-accent-purple)] bg-purple-500/10 text-[var(--color-accent-purple)]'
                        : 'border-[var(--glass-border)] bg-[var(--color-base-700)] text-[var(--color-text-secondary)]',
                    ].join(' ')}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">Focus areas <span className="opacity-60">(optional, pick up to 3)</span></p>
              <div className="flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((area) => (
                  <button
                    key={area}
                    onClick={() => toggleFocus(area)}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      state.focusAreas.includes(area)
                        ? 'border-[var(--color-accent-purple)] bg-purple-500/10 text-[var(--color-accent-purple)]'
                        : 'border-[var(--glass-border)] bg-[var(--color-base-700)] text-[var(--color-text-muted)]',
                    ].join(' ')}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-[var(--color-accent-purple)]" />
                <h3 className="font-semibold">Ready to generate</h3>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  { label: 'Goal', value: GOALS.find((g) => g.value === state.goal)?.label },
                  { label: 'Days / week', value: `${state.daysPerWeek} days` },
                  { label: 'Session length', value: `${state.sessionMinutes} min` },
                  { label: 'Equipment', value: EQUIPMENT_OPTIONS.find((e) => e.value === state.equipment)?.label },
                  { label: 'Experience', value: EXPERIENCE_OPTIONS.find((e) => e.value === state.experienceLevel)?.label },
                  ...(state.focusAreas.length > 0 ? [{ label: 'Focus', value: state.focusAreas.join(', ') }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between rounded-xl bg-[var(--color-base-700)] px-3 py-2">
                    <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] text-center">
                The AI will design a complete split, workout templates, and exercises. This usually takes 5–10 seconds.
              </p>
              {error && (
                <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none flex items-center justify-between px-5 pb-5 pt-3 gap-3 border-t border-[var(--glass-border)]">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || generating}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex-1 btn-primary flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Routine
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
