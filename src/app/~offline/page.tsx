'use client';

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a1f] px-6 text-center">
      <div className="flex flex-col items-center gap-6 max-w-sm">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-[0_0_32px_rgba(168,85,247,0.4)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-10 h-10 text-white"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">You&apos;re offline</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            No connection detected. Your logged sets are saved locally and will
            sync automatically when you&apos;re back online.
          </p>
        </div>

        <div className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
            Available offline
          </p>
          <ul className="text-sm text-gray-300 space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
              Log sets &amp; reps (saves to device)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
              View active workout session
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              AI coach features require connection
            </li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold text-sm shadow-[0_0_24px_rgba(168,85,247,0.3)] active:opacity-80 transition-opacity"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
