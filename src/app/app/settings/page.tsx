'use client';

/**
 * Settings page — Task 13.5
 *
 * Sections:
 * 1. Profile — email display, unit preference, account created date
 * 2. Data — export JSON/CSV, import JSON
 * 3. Sync status expectations
 * 4. Danger Zone — delete account
 * 5. Logout
 */

import { useRef, useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X,
  LogOut,
  User,
  Loader2,
  Clock,
  Target,
  Bot,
  ChevronRight,
} from 'lucide-react';
import { SyncStatusPill } from '@/components/ui/SyncStatusPill';

// ── Types ─────────────────────────────────────────────────────────────────────

type UnitSystem = 'IMPERIAL' | 'METRIC';

interface Profile {
  email: string;
  units: UnitSystem | null;
  createdAt: string;
}

// =============================================================================
// Profile section
// =============================================================================

function ProfileSection() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [units, setUnits] = useState<UnitSystem>('IMPERIAL');

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        if (data?.profile) {
          setProfile(data.profile);
          setUnits(data.profile.units ?? 'IMPERIAL');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveUnits(newUnits: UnitSystem) {
    setUnits(newUnits);
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: newUnits }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl bg-[var(--color-base-700)] p-5 flex flex-col gap-4 animate-pulse">
        <div className="h-5 w-24 rounded bg-[var(--color-base-600)]" />
        <div className="h-4 w-48 rounded bg-[var(--color-base-600)]" />
        <div className="h-10 rounded-xl bg-[var(--color-base-600)]" />
      </section>
    );
  }

  const email = profile?.email ?? session?.user?.email ?? '—';
  const createdAt = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <section className="rounded-2xl bg-[var(--color-base-700)] p-5 flex flex-col gap-4">
      <h2 className="font-semibold text-lg flex items-center gap-2">
        <User className="h-5 w-5 text-[var(--color-accent-purple)]" />
        Profile
      </h2>

      <div className="flex flex-col gap-1">
        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Email</p>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{email}</p>
        {createdAt && (
          <p className="text-xs text-[var(--color-text-muted)]">Member since {createdAt}</p>
        )}
      </div>

      <div>
        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
          Units
        </p>
        <div className="flex gap-2">
          {(['IMPERIAL', 'METRIC'] as UnitSystem[]).map((u) => (
            <button
              key={u}
              onClick={() => handleSaveUnits(u)}
              disabled={saving}
              className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-all ${
                units === u
                  ? 'border-[var(--color-accent-purple)] bg-purple-500/10 text-[var(--color-text-primary)]'
                  : 'border-[var(--glass-border)] bg-[var(--color-base-600)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-purple)]/50'
              }`}
            >
              {u === 'IMPERIAL' ? 'lbs (Imperial)' : 'kg (Metric)'}
            </button>
          ))}
        </div>
        {saving && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </div>
        )}
        {saved && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle className="h-3 w-3" />
            Saved
          </div>
        )}
      </div>
    </section>
  );
}

// =============================================================================
// Sync status section
// =============================================================================

function SyncSection() {
  return (
    <section className="rounded-2xl bg-[var(--color-base-700)] p-5 flex flex-col gap-3">
      <h2 className="font-semibold text-lg">Sync Status</h2>
      <div className="flex items-center gap-3">
        <SyncStatusPill showCount />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Workouts are logged offline first and synced when connected.
        </p>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        If you see &ldquo;Pending&rdquo;, open the app online to sync. Your data
        is never lost — it lives on this device until synced.
      </p>
    </section>
  );
}

// =============================================================================
// Data section — export + import
// =============================================================================

function DataSection() {
  const [importState, setImportState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport(format: 'json' | 'csv') {
    window.location.href = `/api/data/export?format=${format}`;
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportState('loading');
    setImportMsg('');

    try {
      const text = await file.text();
      const payload = JSON.parse(text) as unknown;

      const res = await fetch('/api/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        imported?: number;
        total?: number;
        errors?: string[];
        error?: string;
      };

      if (!res.ok) {
        setImportState('error');
        setImportMsg(data.error ?? 'Import failed');
      } else {
        setImportState('success');
        const partial =
          data.errors && data.errors.length > 0
            ? ` (${data.errors.length} skipped)`
            : '';
        setImportMsg(`Imported ${data.imported ?? 0} of ${data.total ?? 0} sessions${partial}.`);
      }
    } catch {
      setImportState('error');
      setImportMsg('Could not parse file. Make sure it is a valid SwoleAI JSON export.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <section className="rounded-2xl bg-[var(--color-base-700)] p-5 flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Your Data</h2>

      {/* Export */}
      <div className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Download a full copy of your workout history, profile, and favourites.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-accent-purple)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-base-600)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:opacity-90 transition-opacity"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="flex flex-col gap-2 border-t border-[var(--color-base-600)] pt-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Import workout sessions from a SwoleAI JSON export file.
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importState === 'loading'}
          className="flex w-fit items-center gap-2 rounded-xl bg-[var(--color-base-600)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {importState === 'loading' ? 'Importing…' : 'Import JSON'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />

        {importState === 'success' && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-900/30 border border-emerald-700 px-3 py-2 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {importMsg}
          </div>
        )}
        {importState === 'error' && (
          <div className="flex items-center gap-2 rounded-xl bg-red-900/30 border border-red-700 px-3 py-2 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {importMsg}
          </div>
        )}
      </div>
    </section>
  );
}

// =============================================================================
// Logout section
// =============================================================================

function LogoutSection() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ callbackUrl: '/' });
  }

  return (
    <section className="rounded-2xl bg-[var(--color-base-700)] p-5 flex flex-col gap-3">
      <h2 className="font-semibold text-lg">Account</h2>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex w-fit items-center gap-2 rounded-xl bg-[var(--color-base-600)] border border-[var(--glass-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loggingOut ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {loggingOut ? 'Logging out…' : 'Log out'}
      </button>
    </section>
  );
}

// =============================================================================
// Delete account section
// =============================================================================

function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch('/api/data/account', { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Delete failed. Please try again.');
        setDeleting(false);
        return;
      }
      await signOut({ callbackUrl: '/' });
    } catch {
      setError('Network error. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl bg-[var(--color-base-700)] p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-lg text-red-400">Danger Zone</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="flex w-fit items-center gap-2 rounded-xl bg-red-900/40 border border-red-700 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/60 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete Account
        </button>
      </section>

      {open && (
        <ConfirmDeleteModal
          deleting={deleting}
          error={error}
          onConfirm={handleDelete}
          onCancel={() => {
            setOpen(false);
            setError('');
          }}
        />
      )}
    </>
  );
}

// =============================================================================
// Confirmation modal
// =============================================================================

interface ConfirmDeleteModalProps {
  deleting: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDeleteModal({ deleting, error, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-base-700)] p-6 shadow-xl flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-900/40">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <h2 id="delete-dialog-title" className="text-lg font-bold text-red-400">
              Delete Account
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-[var(--color-text-secondary)]">
          This will permanently delete your account, all workout history, routines, and coach
          proposals.{' '}
          <strong className="text-[var(--color-text-primary)]">This cannot be undone.</strong>
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Consider downloading your data before deleting.
        </p>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-900/30 border border-red-700 px-3 py-2 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-xl bg-[var(--color-base-600)] py-2.5 text-sm font-medium text-[var(--color-text-primary)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-700 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Yes, Delete Everything'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Quick navigation section
// =============================================================================

const QUICK_LINKS = [
  { href: '/app/history', label: 'Workout History', description: 'View past sessions', icon: Clock },
  { href: '/app/goals', label: 'Goals', description: 'Set goals & get guardrails', icon: Target },
  { href: '/app/coach', label: 'AI Coach', description: 'Proposals & coaching actions', icon: Bot },
];

function QuickLinksSection() {
  return (
    <section className="rounded-2xl bg-[var(--color-base-700)] p-5 flex flex-col gap-3">
      <h2 className="font-semibold text-lg">More</h2>
      <div className="flex flex-col gap-2">
        {QUICK_LINKS.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl bg-[var(--color-base-600)] px-3 py-3 hover:bg-[var(--color-base-500)] transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-base-700)]">
              <Icon className="h-4 w-4 text-[var(--color-accent-purple)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 pb-24 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">Settings</h1>
      <ProfileSection />
      <QuickLinksSection />
      <SyncSection />
      <DataSection />
      <LogoutSection />
      <DeleteAccountSection />
    </div>
  );
}
