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

### Task 1.3 — Create public pages: Signup ✅
- Created `src/app/signup/page.tsx` with full signup UI
- Email field with icon, placeholder, and validation (required + email format regex)
- Password field with show/hide toggle button
- Confirm password field with show/hide toggle button
- Client-side validation: email (required + valid format), password (required, min 8 chars, uppercase, lowercase, number), confirm password (required + must match)
- Real-time validation on blur + form submit validation
- Inline error display with red border, AlertCircle icon, and error message
- Password strength indicators showing requirements progress (checkmarks for met criteria)
- "Log in" link at bottom pointing to `/login`
- Loading state with spinner during form submission
- PulsePlan styling: dark theme, glass background effects, gradient logo matching login page

### Task 1.4 — Create public pages: Forgot Password (UI only) ✅
- Created `src/app/forgot-password/page.tsx` with password reset request UI
- Email field with icon, placeholder, and client-side validation (required + email format regex)
- Real-time validation on blur + form submit validation
- Inline error display with red border, AlertCircle icon, and error message
- Loading state with spinner during form submission
- Success state after submission showing "Check your email" confirmation with submitted email displayed
- "Try again" button in success state to allow re-submitting
- "Back to login" links in header and footer
- "Remember your password? Log in" link at bottom
- PulsePlan styling: dark theme, glass background effects, gradient logo matching login/signup pages
- Build verified: `/forgot-password` route included in static pages output

### Task 1.5 — Configure Auth.js/NextAuth (server) ✅
- Created `src/lib/auth/auth.config.ts` with full NextAuth configuration:
  - Credentials provider for email/password authentication
  - Zod schema validation for credentials
  - bcrypt password hashing (12 rounds)
  - JWT session strategy with 30-day maxAge
  - Custom callbacks for session/token handling with user id/email
  - Custom pages config pointing to `/login`, `/signup`
- Created `src/app/api/auth/[...nextauth]/route.ts` route handler
- Created `src/app/api/auth/signup/route.ts` for user registration:
  - Zod validation (email format, password min 8 chars + uppercase + lowercase + number)
  - Duplicate email check (409 conflict response)
  - Password hashing with bcrypt before storage
  - Returns 201 with user id/email on success
- Created `src/types/next-auth.d.ts` extending Session and JWT types with `id` and `email`
- Created `src/components/providers/AuthProvider.tsx` wrapping app with `SessionProvider`
- Updated `src/app/layout.tsx` to wrap children with `<AuthProvider>`
- Updated `src/app/login/page.tsx`:
  - Wired form to `signIn('credentials')` from next-auth/react
  - Redirects to `/app/dashboard` on success
  - Shows general error banner for invalid credentials
- Updated `src/app/signup/page.tsx`:
  - Calls `/api/auth/signup` to create account
  - Auto signs in after successful signup
  - Redirects to `/app/dashboard` on success
  - Shows email-specific error for duplicate account (409)
- Added `bcryptjs` + `@types/bcryptjs` dependencies
- Note: In-memory user store used for development; will be replaced with Prisma DB in Task 2.x
- Build verified: all routes compile, TypeScript passes, lint clean

### Task 1.6 — Add auth middleware to protect `/app/*` ✅
- Created `src/middleware.ts` with route protection for `/app/*` paths
- Uses `getToken` from `next-auth/jwt` to check for valid session token
- Unauthenticated users redirected to `/login` with `callbackUrl` query param preserved
- Middleware matcher configured for `/app/:path*` pattern only
- Build verified: middleware registered as "ƒ Proxy (Middleware)" in Next.js build output
- TypeScript passes, ESLint clean
- Note: Next.js 16 shows deprecation warning for "middleware" in favor of "proxy" convention, but middleware still functions correctly

### Task 2.1 — Initialize Prisma + connect to Neon ✅
- Created `prisma/schema.prisma` with PostgreSQL datasource pointing to `DATABASE_URL` env var
- Configured generator for `prisma-client-js`
- Added minimal `User` model (id, email, createdAt, updatedAt) to verify connection
- Model uses `@@map("users")` for snake_case table naming
- Created `src/lib/db/prisma.ts` with Prisma client singleton pattern (prevents hot-reload connection exhaustion)
- Created `src/lib/db/index.ts` barrel export for convenient imports
- Ran `prisma migrate dev --name init` → migration applied successfully to Neon Postgres
- Migration file: `prisma/migrations/20260218000328_init/migration.sql`
- Verified: `prisma migrate status` shows "Database schema is up to date!"
- Note: Full User model fields (profile, constraints, etc.) will be added in Task 2.2
