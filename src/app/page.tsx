import Link from 'next/link';
import { Dumbbell, Zap, Brain, History } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-base-900)]">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--color-accent-purple)] opacity-[0.04] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--color-accent-blue)] opacity-[0.04] blur-[120px]" />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        {/* Hero section */}
        <div className="flex flex-col items-center text-center max-w-md mb-12">
          {/* Logo */}
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] shadow-[var(--shadow-glow)] mb-6">
            <Dumbbell className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>

          {/* App name */}
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            <span className="gradient-text">Swole</span>
            <span className="text-[var(--color-text-primary)]">AI</span>
          </h1>

          {/* Tagline */}
          <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
            Log workouts fast. Get AI-powered coaching. Own your training.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs mb-16">
          <Link href="/signup" className="btn-primary text-center text-base">
            Create account
          </Link>
          <Link href="/login" className="btn-secondary text-center text-base">
            Log in
          </Link>
        </div>

        {/* Feature tiles */}
        <div className="grid gap-4 w-full max-w-md">
          <FeatureTile
            icon={<Zap className="w-5 h-5" />}
            title="Log fast"
            description="One-handed logging built for the gym floor. Offline-first reliability."
          />
          <FeatureTile
            icon={<Brain className="w-5 h-5" />}
            title="AI coach proposals"
            description="Structured plans you review and accept—never automatic rewrites."
          />
          <FeatureTile
            icon={<History className="w-5 h-5" />}
            title="Versioned routines"
            description="Track every change. Roll back anytime. Full control."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 text-center relative z-10">
        <div className="flex items-center justify-center gap-6 text-sm text-[var(--color-text-muted)]">
          <Link
            href="/privacy"
            className="hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Privacy
          </Link>
          <span className="w-1 h-1 rounded-full bg-[var(--color-base-500)]" />
          <Link
            href="/terms"
            className="hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureTile({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card flex items-start gap-4 p-4">
      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-base-600)] text-[var(--color-accent-purple)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-0.5">
          {title}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] leading-snug">
          {description}
        </p>
      </div>
    </div>
  );
}
