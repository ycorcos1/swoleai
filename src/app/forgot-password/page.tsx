'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Dumbbell, ArrowLeft, Mail, AlertCircle, CheckCircle } from 'lucide-react';

interface FormErrors {
  email?: string;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return 'Email is required';
    }
    // Basic email regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      email: validateEmail(email),
    };

    setErrors(newErrors);
    return !newErrors.email;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    // TODO: Implement actual password reset logic with NextAuth in Task 1.5
    // For now, just simulate a delay and show success state
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  // Real-time validation on blur
  const handleEmailBlur = () => {
    const error = validateEmail(email);
    setErrors((prev) => ({ ...prev, email: error }));
  };

  // Success state after submission
  if (isSubmitted) {
    return (
      <div className="min-h-dvh flex flex-col bg-[var(--color-base-900)]">
        {/* Background decorations */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--color-accent-purple)] opacity-[0.04] blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--color-accent-blue)] opacity-[0.04] blur-[120px]" />
        </div>

        {/* Header */}
        <header className="py-4 px-6 relative z-10">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to login</span>
          </Link>
        </header>

        {/* Main content - Success state */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-success)] bg-opacity-15 mb-4">
                <CheckCircle className="w-7 h-7 text-[var(--color-success)]" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                Check your email
              </h1>
              <p className="text-[var(--color-text-secondary)] mb-6">
                We&apos;ve sent a password reset link to{' '}
                <span className="text-[var(--color-text-primary)] font-medium">{email}</span>
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mb-8">
                Didn&apos;t receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-[var(--color-accent-purple)] hover:text-[var(--color-accent-blue)] transition-colors"
                >
                  try again
                </button>
              </p>
              <Link href="/login" className="btn-primary w-full text-base">
                Back to login
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-base-900)]">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--color-accent-purple)] opacity-[0.04] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--color-accent-blue)] opacity-[0.04] blur-[120px]" />
      </div>

      {/* Header */}
      <header className="py-4 px-6 relative z-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to login</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
        <div className="w-full max-w-sm">
          {/* Logo and title */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-blue)] shadow-[var(--shadow-glow)] mb-4">
              <Dumbbell className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
              Forgot your password?
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          {/* Forgot password form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  placeholder="you@example.com"
                  className={`w-full h-12 pl-10 pr-4 bg-[var(--color-base-700)] border rounded-[var(--radius-md)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-purple)] transition-all ${
                    errors.email
                      ? 'border-[var(--color-error)]'
                      : 'border-[var(--glass-border)]'
                  }`}
                />
              </div>
              {errors.email && (
                <div className="flex items-center gap-1.5 text-[var(--color-error)] text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>

          {/* Remember password link */}
          <p className="mt-8 text-center text-[var(--color-text-secondary)]">
            Remember your password?{' '}
            <Link
              href="/login"
              className="font-medium text-[var(--color-accent-purple)] hover:text-[var(--color-accent-blue)] transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
