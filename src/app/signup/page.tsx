'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Dumbbell, Eye, EyeOff, ArrowLeft, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    // Check for at least one number
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    return undefined;
  };

  const validateConfirmPassword = (confirmPassword: string): string | undefined => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword),
    };

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password && !newErrors.confirmPassword;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, general: undefined }));
    
    try {
      // Create account
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        if (signupResponse.status === 409) {
          setErrors((prev) => ({ ...prev, email: 'An account with this email already exists' }));
        } else {
          setErrors((prev) => ({ ...prev, general: signupData.error || 'Failed to create account' }));
        }
        setIsSubmitting(false);
        return;
      }

      // Automatically sign in after successful signup
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Account created but sign-in failed - redirect to login
        router.push('/login');
        return;
      }

      // Successful signup and login - redirect to dashboard
      router.push('/app/dashboard');
      router.refresh();
    } catch {
      setErrors((prev) => ({ ...prev, general: 'Something went wrong. Please try again.' }));
      setIsSubmitting(false);
    }
  };

  // Real-time validation on blur
  const handleEmailBlur = () => {
    const error = validateEmail(email);
    setErrors((prev) => ({ ...prev, email: error }));
  };

  const handlePasswordBlur = () => {
    const error = validatePassword(password);
    setErrors((prev) => ({ ...prev, password: error }));
    // Also revalidate confirm password if it has a value
    if (confirmPassword) {
      const confirmError = validateConfirmPassword(confirmPassword);
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleConfirmPasswordBlur = () => {
    const error = validateConfirmPassword(confirmPassword);
    setErrors((prev) => ({ ...prev, confirmPassword: error }));
  };

  // Password strength indicators
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };

  const showPasswordRequirements = password.length > 0 && !errors.password;

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
          href="/"
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
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
              Create your account
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Start your training journey with SwoleAI
            </p>
          </div>

          {/* Signup form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* General error message */}
            {errors.general && (
              <div className="flex items-center gap-2 p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-[var(--radius-md)] text-[var(--color-error)] text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errors.general}</span>
              </div>
            )}
            
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

            {/* Password field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={handlePasswordBlur}
                  placeholder="Create a strong password"
                  className={`w-full h-12 pl-10 pr-12 bg-[var(--color-base-700)] border rounded-[var(--radius-md)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-purple)] transition-all ${
                    errors.password
                      ? 'border-[var(--color-error)]'
                      : 'border-[var(--glass-border)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <div className="flex items-center gap-1.5 text-[var(--color-error)] text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errors.password}</span>
                </div>
              )}
              {/* Password strength indicators */}
              {showPasswordRequirements && (
                <div className="space-y-1 pt-1">
                  <PasswordCheck met={passwordChecks.length} label="At least 8 characters" />
                  <PasswordCheck met={passwordChecks.uppercase} label="One uppercase letter" />
                  <PasswordCheck met={passwordChecks.lowercase} label="One lowercase letter" />
                  <PasswordCheck met={passwordChecks.number} label="One number" />
                </div>
              )}
            </div>

            {/* Confirm Password field */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={handleConfirmPasswordBlur}
                  placeholder="Confirm your password"
                  className={`w-full h-12 pl-10 pr-12 bg-[var(--color-base-700)] border rounded-[var(--radius-md)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-purple)] transition-all ${
                    errors.confirmPassword
                      ? 'border-[var(--color-error)]'
                      : 'border-[var(--glass-border)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <div className="flex items-center gap-1.5 text-[var(--color-error)] text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errors.confirmPassword}</span>
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full text-base disabled:opacity-50 disabled:cursor-not-allowed mt-6"
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
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-8 text-center text-[var(--color-text-secondary)]">
            Already have an account?{' '}
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

// Password requirement check component
function PasswordCheck({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <CheckCircle className="w-3.5 h-3.5 text-[var(--color-success)]" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border border-[var(--color-text-muted)]" />
      )}
      <span className={met ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}>
        {label}
      </span>
    </div>
  );
}
