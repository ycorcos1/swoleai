'use client';

/**
 * RestTimer — Task C.1
 *
 * Countdown rest timer for the workout session.
 *
 * Features:
 * - Default 90s, configurable via quick-select (60 / 90 / 120 / 180s)
 * - +15s / −15s while running
 * - Auto-start when a set is logged (called via ref/callback)
 * - Visual countdown ring + seconds display
 * - Vibration alert at 0 (if available)
 * - "Skip" to dismiss early
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Minus, Timer } from 'lucide-react';

// =============================================================================
// CONSTANTS
// =============================================================================

const QUICK_DURATIONS = [60, 90, 120, 180] as const;
const DEFAULT_DURATION = 90;
const RING_RADIUS = 36;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// =============================================================================
// HELPERS
// =============================================================================

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export interface RestTimerProps {
  /** Called when the sheet is dismissed */
  onClose: () => void;
}

export function RestTimer({ onClose }: RestTimerProps) {
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [remaining, setRemaining] = useState(DEFAULT_DURATION);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ring progress: 0 = empty, 1 = full
  const progress = remaining / duration;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  // =============================================================================
  // TIMER LOGIC
  // =============================================================================

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopInterval();
    setFinished(false);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setRunning(false);
          setFinished(true);
          // Vibrate if available
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopInterval]);

  const pauseTimer = useCallback(() => {
    stopInterval();
    setRunning(false);
  }, [stopInterval]);

  const handleToggle = useCallback(() => {
    if (running) {
      pauseTimer();
    } else {
      if (remaining === 0) {
        // Reset and restart
        setRemaining(duration);
        setFinished(false);
        setTimeout(() => startTimer(), 0);
      } else {
        startTimer();
      }
    }
  }, [running, remaining, duration, pauseTimer, startTimer]);

  const handleSkip = useCallback(() => {
    stopInterval();
    setRunning(false);
    setFinished(false);
    setRemaining(duration);
    onClose();
  }, [stopInterval, duration, onClose]);

  const handleSetDuration = useCallback(
    (newDuration: number) => {
      stopInterval();
      setRunning(false);
      setFinished(false);
      setDuration(newDuration);
      setRemaining(newDuration);
    },
    [stopInterval]
  );

  const handleAdjust = useCallback(
    (delta: number) => {
      setRemaining((prev) => {
        const next = Math.max(5, prev + delta);
        // If we adjusted up and timer was at 0, restart
        if (prev === 0 && delta > 0) {
          setFinished(false);
          setTimeout(() => startTimer(), 0);
        }
        return next;
      });
      // Also adjust duration ceiling so ring doesn't look odd
      if (delta > 0) {
        setDuration((prev) => Math.max(prev, remaining + delta));
      }
    },
    [remaining, startTimer]
  );

  // Auto-start on mount
  useEffect(() => {
    startTimer();
    return () => stopInterval();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =============================================================================
  // RENDER
  // =============================================================================

  const ringColor = finished
    ? 'stroke-[var(--color-success)]'
    : running
    ? 'stroke-[var(--color-accent-purple)]'
    : 'stroke-[var(--color-text-muted)]';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[70] animate-in slide-in-from-bottom duration-300">
        <div className="bg-[var(--color-base-800)] border-t border-[var(--glass-border)] rounded-t-3xl shadow-2xl safe-area-bottom px-6 pt-4 pb-8">
          {/* Handle */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-[var(--color-base-500)]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-[var(--color-accent-purple)]" />
              <h2 className="text-lg font-bold">Rest Timer</h2>
            </div>
            <button
              onClick={handleSkip}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] transition-colors"
              aria-label="Close timer"
            >
              <X className="h-4 w-4 text-[var(--color-text-secondary)]" />
            </button>
          </div>

          {/* Ring + countdown */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
                {/* Track */}
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--color-base-600)"
                  strokeWidth="6"
                />
                {/* Progress */}
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  className={`transition-all duration-1000 ${ringColor}`}
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    finished ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {finished ? '✓' : formatSeconds(remaining)}
                </span>
              </div>
            </div>

            {finished && (
              <p className="mt-2 text-sm font-medium text-[var(--color-success)]">
                Rest complete!
              </p>
            )}
          </div>

          {/* +/- adjust */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <button
              onClick={() => handleAdjust(-15)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-95 transition-all"
              aria-label="Subtract 15 seconds"
            >
              <Minus className="h-5 w-5 text-[var(--color-text-primary)]" />
            </button>
            <span className="text-xs text-[var(--color-text-muted)] w-8 text-center">15s</span>
            <button
              onClick={() => handleAdjust(15)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-base-600)] hover:bg-[var(--color-base-500)] active:scale-95 transition-all"
              aria-label="Add 15 seconds"
            >
              <Plus className="h-5 w-5 text-[var(--color-text-primary)]" />
            </button>
          </div>

          {/* Quick-select durations */}
          <div className="flex gap-2 mb-6">
            {QUICK_DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => handleSetDuration(d)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  duration === d && !finished
                    ? 'bg-[var(--color-accent-purple)] text-white'
                    : 'bg-[var(--color-base-600)] text-[var(--color-text-secondary)] hover:opacity-90'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>

          {/* Start/Pause + Skip */}
          <div className="flex gap-3">
            <button
              onClick={handleToggle}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {running ? 'Pause' : remaining === 0 ? 'Restart' : 'Start'}
            </button>
            <button
              onClick={handleSkip}
              className="px-5 py-3 rounded-xl bg-[var(--color-base-600)] text-sm font-medium text-[var(--color-text-secondary)] hover:opacity-90 transition-opacity"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
