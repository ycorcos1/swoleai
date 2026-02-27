'use client';

import { useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import {
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X,
} from 'lucide-react';

// =============================================================================
// Settings Page — Task 11.3 / 11.4
// Download my data (JSON + CSV), Import data, Delete account
// =============================================================================

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">Settings</h1>
      <DataSection />
      <DeleteAccountSection />
    </div>
  );
}

// =============================================================================
// Data section — export + import
// =============================================================================

function DataSection() {
  const [importState, setImportState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
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
      // Reset so the same file can be re-selected
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
// Delete account section — Task 11.4
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
      // Sign out and redirect to home
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
          Permanently delete your account and all associated data. This cannot be
          undone.
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

function ConfirmDeleteModal({
  deleting,
  error,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
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
            <h2
              id="delete-dialog-title"
              className="text-lg font-bold text-red-400"
            >
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
          This will permanently delete your account, all workout history,
          routines, and coach proposals. <strong className="text-[var(--color-text-primary)]">This cannot be undone.</strong>
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
