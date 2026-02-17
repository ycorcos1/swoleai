# MEMO.md — SwoleAI (Decisions + Notes)

## A) Locked Product Decisions
- App name: **SwoleAI**
- UI theme: **PulsePlan** (dark-first glass, purple→blue accents)
- Must-have features included:
  - Accounts + multi-device sync
  - Offline-first workout logging
  - Workout usability: edit/undo/continue/reorder/add exercise/set flags
  - Rest timer QoL
  - Splits + saved workout days (fixed + slot-based)
  - Favorites bank + “Generate Day from Favorites”
  - Deterministic substitutions
  - Muscle-group volume targets + balance warnings
  - Robust PR system
  - User-selectable progression engines
  - Program blocks + routine versioning + rollback
  - Deload + recovery management
  - AI coach proposals: Next Session Plan, Weekly Check-in, Goals/Guardrails, Plateau interventions
  - Data features: export/import, download data, delete account/data

## B) Implementation Locks
- Hosting: Vercel
- DB: Neon Postgres
- ORM: Prisma
- Auth: Auth.js (NextAuth)
- AI: OpenAI API (server-side)
- Offline: IndexedDB (Dexie) + service worker caching
- Validation: Zod

## C) UX Rules (non-negotiable)
- AI never silently applies changes.
- Weekly check-in proposes **small patches**, not full rewrites.
- Accepting patches creates a new routine version (with changelog) inside a program block.
- Workout Mode must remain usable without network.

## D) MVP vs V1 Reminder
- MVP ships the end-to-end loop: auth → split/day template → workout mode (offline) → summary → next session plan + basic weekly check-in.
- V1 completes: full blocks/version compare/rollback UI, full volume dashboard, plateau interventions, advanced progression engines.

## E) Known Risk Areas
- iOS PWA quirks (service worker caching, storage limits, notification limitations)
- Auth session persistence and middleware edge cases
- Sync conflicts if user edits sessions across devices
- AI JSON validation and fallback behavior

## F) Next Docs To Create
- TASK_LIST.md (last)
- ERROR_FIX_LOG.md (optional)

---

## G) Implementation Progress

### Task 0.1 — Add `.env.example` ✅
- `.env.example` created with all required env vars from TECH_STACK.md
- `.gitignore` added to ensure `.env` (secrets) is never committed
- Git repo initialized

### Task 0.2 — Add base dependencies (frontend + backend) ✅
- Next.js 16.1.6 + TypeScript + App Router initialized with `src/` directory
- Tailwind CSS v4 with `@tailwindcss/postcss` plugin
- Prisma + `@prisma/client` for ORM
- NextAuth (next-auth) for authentication
- Zod for validation
- TanStack Query (`@tanstack/react-query`) for server state
- Dexie + `dexie-react-hooks` for IndexedDB offline persistence
- Lucide (`lucide-react`) for icons
- `@ducanh2912/next-pwa` for PWA/service worker support
- Added scripts: `dev`, `build`, `start`, `lint`, `db:generate`, `db:push`, `db:migrate`, `db:studio`
- Note: Used `process.cwd()` for `turbopack.root` in `next.config.ts` to avoid conflicts with parent directory `package.json`

### Task 0.3 — Create App Shell layout (PulsePlan baseline) ✅
- Created `src/app/globals.css` with full PulsePlan design system:
  - Dark-first color palette (base-900 through base-500, text colors)
  - Purple→blue gradient accent (`--color-accent-gradient`)
  - Glass card utility (`.glass-card` with backdrop blur)
  - Primary/secondary button styles with gradient glow
  - Status pill variants (success/warning/error/info)
  - CSS custom properties for spacing, radii, shadows
  - Safe-area padding for PWA (notch/home indicator)
  - Tabular numerals for weights/reps
- Created `AppShell` component (`src/components/layout/AppShell.tsx`) as main authenticated layout wrapper
- Created `BottomNav` component (`src/components/layout/BottomNav.tsx`) with 5 nav items:
  - Dashboard, Workout, Routine, Insights, Settings
  - Active state highlighting using pathname matching
  - Lucide icons, touch-friendly sizing
- Created nested `/app` route layout (`src/app/app/layout.tsx`) wrapping children in AppShell
- Created `/app/dashboard` page with glass cards for Today, Coach Actions, Quick Stats
- Created reusable `GlassCard` UI component
- Updated root layout with SwoleAI metadata and dark theme viewport config

### Task 1.1 — Create public pages: Homepage ✅
- Rebuilt `src/app/page.tsx` as SwoleAI homepage (replacing Next.js boilerplate)
- Hero section with gradient logo icon (Dumbbell), "SwoleAI" branding, tagline
- CTA buttons: "Create account" (primary, links to `/signup`), "Log in" (secondary, links to `/login`)
- 3 feature tiles using `GlassCard` styling: Log fast, AI coach proposals, Versioned routines
- Footer with Privacy/Terms links
- Background decorations with blurred gradient circles for atmosphere
- Mobile-first design following PulsePlan spec

### Task 1.2 — Create public pages: Login ✅
- Created `src/app/login/page.tsx` with full login UI
- Email field with icon, placeholder, and validation
- Password field with show/hide toggle button
- Client-side validation: required checks, email format regex, minimum 6 character password
- Real-time validation on blur + form submit validation
- Inline error display with red border, AlertCircle icon, and error message
- Forgot password link pointing to `/forgot-password`
- "Create account" link at bottom pointing to `/signup`
- Loading state with spinner during form submission
- PulsePlan styling: dark theme, glass background effects, gradient logo
