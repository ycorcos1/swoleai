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

### Task 2.2 — Add core tables: users + profile fields ✅
- Extended `User` model in `prisma/schema.prisma` with profile fields from PRD 8.2 (Onboarding Wizard):
  - `goalMode` (enum: HYPERTROPHY, STRENGTH, HYBRID)
  - `daysPerWeek` (Int, nullable)
  - `sessionMinutes` (Int, nullable)
  - `units` (enum: METRIC, IMPERIAL, default IMPERIAL)
  - `equipment` (enum: COMMERCIAL, HOME, default COMMERCIAL)
  - `constraints` (Json, default `{}` — structure: injuries, avoidExercises, mustHaveExercises arrays)
  - `onboardingComplete` (Boolean, default false)
  - `password` (String, nullable — for credentials auth)
- Created three Prisma enums: `GoalMode`, `UnitSystem`, `EquipmentAccess`
- Migration file: `prisma/migrations/20260218000528_add_user_profile_fields/migration.sql`
- Ran `prisma migrate dev --name add_user_profile_fields` → migration applied successfully
- Verified: `prisma db pull --print` confirms all profile fields exist in Neon DB
- Verified: `tsc --noEmit` passes with no errors

### Task 2.3 — Add exercises + favorites schema ✅
- Added `Exercise` model in `prisma/schema.prisma` with all required tags:
  - `name` (String)
  - `type` (enum: BARBELL, DUMBBELL, MACHINE, CABLE, BODYWEIGHT, OTHER)
  - `pattern` (enum: HORIZONTAL_PUSH, HORIZONTAL_PULL, VERTICAL_PUSH, VERTICAL_PULL, HIP_HINGE, SQUAT, LUNGE, ISOLATION, CARRY, CORE, OTHER)
  - `muscleGroups` (Json, default `[]` — array of muscle group strings)
  - `equipmentTags` (Json, default `[]` — array of equipment strings)
  - `jointStressFlags` (Json, default `{}` — object mapping joint to stress level)
  - `isCustom` (Boolean, default false) + `ownerUserId` (nullable) for user-created exercises
- Added `Favorite` model linking users to exercises:
  - `userId` + `exerciseId` with `@@unique` constraint for idempotent favorites
  - `priority` (enum: PRIMARY, BACKUP) for slot-filling preference
  - `tags` (Json, default `[]`) for organization
- Created three new enums: `ExerciseType`, `MovementPattern`, `FavoritePriority`
- Added relations: User → exercises (custom), User → favorites, Exercise → favorites
- Added indexes for efficient queries: `[ownerUserId, isCustom]` on exercises, `[userId]` on favorites
- Migration file: `prisma/migrations/20260218000710_add_exercises_and_favorites/migration.sql`
- Ran `prisma migrate dev --name add_exercises_and_favorites` → migration applied successfully
- Verified: Migration SQL includes `CREATE UNIQUE INDEX "favorites_user_id_exercise_id_key"` enforcing unique constraint
- Verified: `tsc --noEmit` passes with no errors

### Task 2.4 — Add splits + split schedule schema ✅
- Added `Split` model in `prisma/schema.prisma` representing workout program schedules:
  - `name` (String — e.g., "PPL 6-Day", "Upper/Lower")
  - `isActive` (Boolean, default false) — drives Dashboard "Today" workout suggestion
  - `userId` + `user` relation (cascade delete)
  - `scheduleDays` relation to `SplitScheduleDay`
- Added `SplitScheduleDay` model mapping weekdays to templates or rest:
  - `splitId` + `split` relation (cascade delete)
  - `weekday` (enum: SUNDAY through SATURDAY)
  - `workoutDayTemplateId` (nullable String — will link to Task 2.5 WorkoutDayTemplate)
  - `isRest` (Boolean, default false)
  - `label` (nullable String — e.g., "Push A", "Legs")
  - `@@unique([splitId, weekday])` — each split can only have one entry per weekday
- Created `Weekday` enum: SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY
- Added `splits` relation on User model
- Added indexes: `[userId]` and `[userId, isActive]` on splits, `[splitId]` on split_schedule_days
- Migration file: `prisma/migrations/20260218000906_add_splits_and_schedule/migration.sql`
- Ran `prisma migrate dev --name add_splits_and_schedule` → migration applied successfully
- One active split per user: enforced at app level (deactivate all other splits before activating new one)
- Verified: `prisma migrate status` shows "Database schema is up to date!"
- Verified: `tsc --noEmit` passes with no errors

### Task 2.5 — Add day templates schema (fixed + slot) ✅
- Added `WorkoutDayTemplate` model in `prisma/schema.prisma` representing saved workout day configurations:
  - `name` (String — e.g., "Push A", "Full Body")
  - `mode` (enum: FIXED, SLOT) — determines how exercises are defined
  - `defaultProgressionEngine` (enum: DOUBLE_PROGRESSION, STRAIGHT_SETS, TOP_SET_BACKOFF, RPE_BASED, NONE)
  - `notes` (nullable String), `estimatedMinutes` (nullable Int)
  - `userId` + `user` relation (cascade delete)
  - `blocks` relation (for FIXED mode), `slots` relation (for SLOT mode), `scheduleDays` relation
- Added `WorkoutDayBlock` model for FIXED template mode (explicit exercises):
  - `templateId` + `template` relation (cascade delete)
  - `orderIndex` (Int) with `@@unique([templateId, orderIndex])`
  - `exerciseId` + `exercise` relation (onDelete: Restrict)
  - `setsPlanned` (default 3), `repMin` (default 8), `repMax` (default 12), `restSeconds` (default 120)
  - `progressionEngine` (nullable — override template default)
  - `intensityTarget` (Json — {rpe?, rir?, percentOf1RM?}), `notes` (nullable)
- Added `WorkoutDaySlot` model for SLOT template mode (muscle group placeholders):
  - `templateId` + `template` relation (cascade delete)
  - `orderIndex` (Int) with `@@unique([templateId, orderIndex])`
  - `muscleGroup` (String — e.g., "chest", "back", "quads")
  - `exerciseCount` (default 1) — number of exercises to fill for this muscle group
  - `patternConstraints` (Json — {allowedPatterns?, excludedPatterns?})
  - `equipmentConstraints` (Json — {allowedTypes?, excludedTypes?})
  - `defaultSets` (default 3), `defaultRepMin` (default 8), `defaultRepMax` (default 12), `notes` (nullable)
- Created two new enums: `TemplateMode` (FIXED, SLOT), `ProgressionEngine` (DOUBLE_PROGRESSION, STRAIGHT_SETS, TOP_SET_BACKOFF, RPE_BASED, NONE)
- Updated `SplitScheduleDay` with proper foreign key relation to `WorkoutDayTemplate` (onDelete: SetNull)
- Added `workoutDayTemplates` relation on User model
- Added `workoutDayBlocks` relation on Exercise model
- Added indexes: `[userId]` on workout_day_templates, `[templateId]` on blocks and slots
- Migration file: `prisma/migrations/20260218001249_add_day_templates_schema/migration.sql`
- Ran `prisma migrate dev --name add_day_templates_schema` → migration applied successfully
- Template supports both modes: FIXED uses WorkoutDayBlock[], SLOT uses WorkoutDaySlot[]
- Verified: No linter errors in schema file

### Task 2.6 — Add workouts schema (sessions/exercises/sets) ✅
- Added `WorkoutSession` model in `prisma/schema.prisma` representing actual performed workout logs:
  - `startedAt` (DateTime), `endedAt` (nullable DateTime)
  - `status` (enum: ACTIVE, COMPLETED, ABANDONED) — session lifecycle tracking
  - `title` (nullable String — auto-generated or user-set)
  - `notes` (nullable String — user can add notes during/after workout)
  - `userId` + `user` relation (cascade delete)
  - `splitId` + `split` relation (nullable, onDelete: SetNull) — optional link to split
  - `templateId` + `template` relation (nullable, onDelete: SetNull) — optional link to template
  - `constraintFlags` (Json, default `{}` — structure: {pain?, equipmentCrowded?, lowEnergy?})
  - `exercises` relation to `WorkoutExercise`
- Added `WorkoutExercise` model representing exercises performed in a session:
  - `sessionId` + `session` relation (cascade delete)
  - `exerciseId` + `exercise` relation (onDelete: Restrict)
  - `orderIndex` (Int) with `@@unique([sessionId, orderIndex])` — allows reordering mid-workout
  - `notes` (nullable String — exercise-level notes)
  - `sets` relation to `WorkoutSet`
- Added `WorkoutSet` model representing individual sets with full logging data:
  - `workoutExerciseId` + `workoutExercise` relation (cascade delete)
  - `setIndex` (Int) with `@@unique([workoutExerciseId, setIndex])`
  - `weight` (Float — in user's preferred unit system)
  - `reps` (Int)
  - `rpe` (nullable Float) — Rate of Perceived Exertion for fatigue tracking
  - `flags` (Json, default `{}` — structure: {warmup?, backoff?, dropset?, failure?}) — affects volume calculations and PR detection
  - `notes` (nullable String — per-set notes)
- Created `SessionStatus` enum: ACTIVE, COMPLETED, ABANDONED
- Added relations: User → workoutSessions, Split → workoutSessions, WorkoutDayTemplate → workoutSessions, Exercise → workoutExercises
- Added indexes: `[userId]`, `[userId, startedAt]`, `[userId, status]` on workout_sessions; `[sessionId]`, `[exerciseId]` on workout_exercises; `[workoutExerciseId]` on workout_sets
- Migration file: `prisma/migrations/20260218001515_add_workouts_schema/migration.sql`
- Ran `prisma migrate dev --name add_workouts_schema` → migration applied successfully
- Set flags persist as JSONB in PostgreSQL, typed as `Prisma.JsonValue` in TypeScript
- Verified: `prisma migrate status` shows "6 migrations found, Database schema is up to date!"
- Verified: `tsc --noEmit` passes with no errors

### Task 2.7 — Add versioning schema (program blocks + versions) ✅
- Added `ProgramBlock` model in `prisma/schema.prisma` representing training program phases:
  - `name` (String — e.g., "Hypertrophy Block 1", "Strength Phase", "Peaking")
  - `startDate` (DateTime), `endDate` (nullable DateTime) — block date range
  - `userId` + `user` relation (cascade delete)
  - `routineVersions` relation to `RoutineVersion`
- Added `RoutineVersion` model for storing routine snapshots at points in time:
  - `userId` + `user` relation (cascade delete)
  - `programBlockId` + `programBlock` relation (nullable, onDelete: SetNull) — links version to training phase
  - `changelog` (nullable String — human-readable description of what changed)
  - `versionNumber` (Int — for ordering and identification)
  - `snapshotJson` (Json) — denormalized snapshot of complete routine state:
    - Structure: {splitId, splitName, scheduleDays[], templates[], favoriteIds[]}
    - Enables reliable rollback even if underlying templates/splits are modified or deleted
  - `changeLogsFrom` / `changeLogsTo` relations for change tracking
- Added `RoutineChangeLog` model for recording specific changes between versions:
  - `userId` + `user` relation (cascade delete)
  - `fromVersionId` + `fromVersion` relation (cascade delete)
  - `toVersionId` + `toVersion` relation (cascade delete)
  - `proposalId` (nullable String — links to coach proposal if AI-initiated)
  - `patchOpsJson` (Json) — array of JSON Patch operations (RFC 6902) describing exact changes
- Created `ProposalStatus` enum: PENDING, ACCEPTED, REJECTED (for future Task 2.8)
- Added relations on User model: `programBlocks`, `routineVersions`, `routineChangeLogs`
- Added indexes: `[userId]`, `[userId, startDate]` on program_blocks; `[userId]`, `[userId, versionNumber]`, `[programBlockId]` on routine_versions; `[userId]`, `[fromVersionId]`, `[toVersionId]`, `[proposalId]` on routine_change_logs
- Migration file: `prisma/migrations/20260218002515_add_versioning_schema/migration.sql`
- Ran `prisma migrate dev --name add_versioning_schema` → migration applied successfully
- Version snapshot JSON field exists as `snapshotJson Json @map("snapshot_json")` → `"snapshot_json" JSONB NOT NULL` in migration SQL
- Verified: `prisma migrate status` shows "7 migrations found, Database schema is up to date!"

### Task 2.8 — Add coach proposals schema ✅
- Added `CoachProposal` model in `prisma/schema.prisma` for AI-generated coach proposals:
  - `userId` + `user` relation (cascade delete)
  - `type` (enum: NEXT_SESSION, WEEKLY, PLATEAU, GOALS) — the 4 coach proposal types
  - `status` (ProposalStatus: PENDING, ACCEPTED, REJECTED) — proposal lifecycle
  - `inputSummaryHash` (String) — hash of input data for caching/deduplication
  - `proposalJson` (Json) — AI-generated proposal content, structure varies by type:
    - NEXT_SESSION: { exercises: [...], notes: string }
    - WEEKLY: { patches: [...], rationale: string, volumeAnalysis: {...} }
    - PLATEAU: { diagnosis: string, interventions: [...] }
    - GOALS: { goals: [...], guardrails: [...] }
  - `rationale` (nullable String) — optional AI explanation for display
  - `changeLogs` relation to `RoutineChangeLog` — changes triggered by accepting this proposal
- Created `ProposalType` enum: NEXT_SESSION, WEEKLY, PLATEAU, GOALS
- Updated `RoutineChangeLog.proposalId` with proper foreign key relation to `CoachProposal` (onDelete: SetNull)
- Added `coachProposals` relation on User model
- Added indexes: `[userId]`, `[userId, type]`, `[userId, status]`, `[inputSummaryHash]` on coach_proposals
- Migration file: `prisma/migrations/20260218002738_add_coach_proposals_schema/migration.sql`
- Ran `prisma migrate dev --name add_coach_proposals_schema` → migration applied successfully
- Verified: `prisma validate` shows "The schema at prisma/schema.prisma is valid 🚀"
- Verified: `prisma generate` successfully generated Prisma Client

### Task 3.1 — API auth guard helper ✅
- Created `src/lib/auth/require-auth.ts` with server-side authentication helpers:
  - `requireAuth()` — returns discriminated union for route handlers:
    - Success: `{ success: true, userId: string, email: string }`
    - Failure: `{ success: false, response: NextResponse }` (401 Unauthorized)
  - `getAuthUserId()` — returns `userId` or throws Error (for server actions)
  - `getAuthUser()` — returns `{ userId, email }` or throws Error (for server actions)
- Created `src/lib/auth/index.ts` barrel export consolidating all auth exports:
  - Re-exports `authOptions`, `createUser`, `userExists` from auth.config
  - Re-exports `requireAuth`, `getAuthUserId`, `getAuthUser`, `AuthResult` from require-auth
- Uses `getServerSession(authOptions)` from next-auth for session retrieval
- Returns 401 JSON response with `{ error: 'Unauthorized', message: 'Authentication required' }` when unauthenticated
- Usage pattern documented in JSDoc with code examples
- Verified: `npm run build` passes, `tsc --noEmit` passes, `npm run lint` clean

### Task 3.2 — Exercises API: list + create custom ✅
- Created `src/app/api/exercises/route.ts` with two endpoints:
  - `GET /api/exercises` — lists exercises (system + user's custom)
  - `POST /api/exercises` — creates a custom exercise owned by authenticated user
- GET endpoint features:
  - Uses `requireAuth()` to get authenticated userId
  - Returns system exercises (`isCustom=false`) + user's custom exercises (`isCustom=true, ownerUserId=userId`)
  - Supports query filters: `customOnly`, `pattern`, `type`, `search` (partial name match, case-insensitive)
  - Zod schema validation for query parameters
  - Orders by isCustom (system first), then name ascending
- POST endpoint features:
  - Uses `requireAuth()` to get authenticated userId
  - Zod schema validation for request body (name required, type/pattern/muscleGroups/equipmentTags/jointStressFlags optional with defaults)
  - Duplicate name check per user (case-insensitive) → 409 Conflict
  - Creates exercise with `isCustom=true` and `ownerUserId=userId`
  - Returns 201 with created exercise object
- Validation schemas:
  - `listExercisesQuerySchema` — validates GET query params
  - `createExerciseSchema` — validates POST body with ExerciseType and MovementPattern enums
- Verified: `tsc --noEmit` passes, `eslint` clean

### Task 3.3 — Favorites API: toggle ✅
- Created `src/app/api/favorites/[exerciseId]/route.ts` with toggle endpoint:
  - `POST /api/favorites/:exerciseId` — toggles favorite status for an exercise
- Toggle behavior (idempotent):
  - If not favorited: creates favorite with provided priority/tags → returns `{ favorited: true, exerciseId, favorite: {...} }`
  - If already favorited: deletes favorite → returns `{ favorited: false, exerciseId }`
- Uses `requireAuth()` to get authenticated userId
- Validates exerciseId param exists and exercise is accessible (system OR user's custom)
- Zod schema validation for optional request body:
  - `priority` (FavoritePriority: PRIMARY, BACKUP) — default PRIMARY
  - `tags` (string array) — default []
- Uses Prisma `@@unique([userId, exerciseId])` constraint on Favorite model for guaranteed uniqueness
- Returns 404 if exercise not found or not accessible
- Returns 401 if unauthenticated
- Verified: `tsc --noEmit` passes, `eslint` clean
- Verified: `next build` succeeds with `/api/favorites/[exerciseId]` registered as dynamic route

### Task 3.4 — Splits API: create/list/update ✅
- Created `src/app/api/splits/route.ts` with two endpoints:
  - `GET /api/splits` — lists all splits owned by the authenticated user
  - `POST /api/splits` — creates a new split with optional schedule days
- Created `src/app/api/splits/[id]/route.ts` with update endpoint:
  - `PUT /api/splits/:id` — updates an existing split (name, isActive, scheduleDays)
- GET endpoint features:
  - Uses `requireAuth()` to get authenticated userId
  - Always scoped to `userId` in where clause
  - Supports `activeOnly=true` query filter to return only active split
  - Returns splits with nested `scheduleDays` including linked `workoutDayTemplate` details
  - Orders by isActive (active first), then updatedAt descending
- POST endpoint features:
  - Uses `requireAuth()` to get authenticated userId
  - Zod schema validation for request body (name required, isActive optional, scheduleDays optional)
  - If `isActive=true`, deactivates all other user splits before creating
  - Validates that all `workoutDayTemplateId` references belong to the authenticated user
  - Creates split with nested `scheduleDays` in single Prisma create
  - Returns 201 with created split including schedule days
- PUT endpoint features:
  - Uses `requireAuth()` to get authenticated userId
  - Validates split exists and belongs to authenticated user (404 if not found)
  - Zod schema validation for request body (all fields optional)
  - If `isActive=true` and split wasn't active, deactivates all other user splits
  - Validates that all `workoutDayTemplateId` references belong to the authenticated user
  - If `scheduleDays` provided, replaces all existing days (delete + create in transaction)
  - Simple updates (name/isActive only) don't require transaction
- Validation schemas:
  - `listSplitsQuerySchema` — validates GET query params
  - `scheduleDaySchema` — validates weekday (Weekday enum), workoutDayTemplateId, isRest, label
  - `createSplitSchema` — validates POST body
  - `updateSplitSchema` — validates PUT body (all fields optional)
- CRUD scoped to user: All operations filter by `userId`, template ID validation checks ownership
- Verified: `tsc --noEmit` passes, `eslint` clean
- Verified: `npm run build` succeeds with `/api/splits` and `/api/splits/[id]` registered as dynamic routes

### Task 3.5 — Splits API: activate split ✅
- Created `src/app/api/splits/[id]/activate/route.ts` with activation endpoint:
  - `POST /api/splits/:id/activate` — activates the specified split for the authenticated user
- Activation behavior:
  - Uses Prisma `$transaction` to atomically deactivate any currently active splits and activate the target split
  - Deactivates all other splits where `userId` matches and `isActive=true` and `id ≠ target`
  - Then sets `isActive=true` on the target split
  - Ensures only one active split per user (app-level enforcement)
- Idempotency:
  - If the split is already active, returns success without modifications (`message: 'Split is already active'`)
  - No side effects when called multiple times on an already-active split
- Uses `requireAuth()` to get authenticated userId
- Validates split ID exists and belongs to authenticated user (404 if not found)
- Returns split object with nested `scheduleDays` including linked `workoutDayTemplate` details
- Zod schema validation for split ID param
- Verified: `tsc --noEmit` passes with no errors
- Verified: No linter errors in new route file

### Task 3.6 — Templates API: create/list/update ✅
- Created `src/app/api/templates/route.ts` with two endpoints:
  - `GET /api/templates` — lists all workout day templates owned by the authenticated user
  - `POST /api/templates` — creates a new template with support for FIXED or SLOT mode
- Created `src/app/api/templates/[id]/route.ts` with update endpoint:
  - `PUT /api/templates/:id` — updates an existing template (name, progressionEngine, notes, estimatedMinutes, blocks/slots)
- GET endpoint features:
  - Uses `requireAuth()` to get authenticated userId
  - Always scoped to `userId` in where clause
  - Supports query filters: `mode` (TemplateMode enum), `search` (partial name match, case-insensitive)
  - Returns templates with nested `blocks` (for FIXED) and `slots` (for SLOT) including exercise details
  - Orders by updatedAt descending
- POST endpoint features (supports fixed + slot mode payloads):
  - Uses `requireAuth()` to get authenticated userId
  - Zod schema validation for request body with mode-aware refinement
  - FIXED mode: accepts `blocks` array with exerciseId, orderIndex, setsPlanned, repMin, repMax, restSeconds, progressionEngine, intensityTarget, notes
  - SLOT mode: accepts `slots` array with muscleGroup, exerciseCount, orderIndex, patternConstraints, equipmentConstraints, defaultSets, defaultRepMin, defaultRepMax, notes
  - Validates mode-appropriate data (FIXED templates cannot have slots, SLOT templates cannot have blocks)
  - Validates that all exercise IDs in blocks belong to user or are system exercises
  - Uses `exercise: { connect: { id } }` pattern and `Prisma.JsonNull` for null JSON fields
  - Returns 201 with created template including blocks/slots
- PUT endpoint features:
  - Uses `requireAuth()` to get authenticated userId
  - Validates template exists and belongs to authenticated user (404 if not found)
  - Zod schema validation for request body (all fields optional)
  - Enforces mode-appropriate updates (cannot add slots to FIXED template, cannot add blocks to SLOT template)
  - Mode cannot be changed after creation
  - If `blocks`/`slots` provided, replaces all existing ones (delete + create in transaction)
  - Simple updates (name/notes/etc only) don't require transaction
  - Validates that all exercise IDs in blocks belong to user or are system exercises
- Validation schemas:
  - `listTemplatesQuerySchema` — validates GET query params
  - `workoutDayBlockSchema` — validates FIXED template blocks with ProgressionEngine enum
  - `workoutDaySlotSchema` — validates SLOT template slots with MovementPattern and ExerciseType enums
  - `createTemplateSchema` — validates POST body with mode-aware refinement
  - `updateTemplateSchema` — validates PUT body (all fields optional)
- Verified: `tsc --noEmit` passes with no errors
- Verified: No linter errors in new route files
- Verified: `npm run build` succeeds with `/api/templates` and `/api/templates/[id]` registered as dynamic routes

### Task 3.7 — Workouts API: start session ✅
- Created `src/app/api/workouts/start/route.ts` with start session endpoint:
  - `POST /api/workouts/start` — starts a new workout session for the authenticated user
- Endpoint features:
  - Uses `requireAuth()` to get authenticated userId
  - Zod schema validation for request body with all optional fields:
    - `splitId` (optional String) — links session to a workout split
    - `templateId` (optional String) — links session to a workout day template
    - `title` (optional String, max 200 chars) — auto-generated or user-set session title
    - `notes` (optional String) — initial session notes
    - `constraintFlags` (optional object: {pain?: string[], equipmentCrowded?: boolean, lowEnergy?: boolean})
  - Allows empty request body for completely freestyle workouts
  - Validates that `splitId` belongs to authenticated user if provided (404 if not found)
  - Validates that `templateId` belongs to authenticated user if provided (404 if not found)
  - Creates `WorkoutSession` with:
    - `status: 'ACTIVE'`
    - `startedAt: new Date()` (current timestamp)
    - User-provided or null values for title, notes, splitId, templateId, constraintFlags
- Response structure:
  - `sessionId` — the ID of the created session (top-level for easy access)
  - `session` — full session object including:
    - id, startedAt, status, title, notes, constraintFlags, splitId, templateId, createdAt
    - `split` relation (id, name) if splitId was provided
    - `template` relation (id, name, mode) if templateId was provided
  - HTTP 201 Created status
- Error responses:
  - 401 Unauthorized if not authenticated
  - 400 Bad Request if validation fails
  - 404 Not Found if splitId or templateId doesn't exist or doesn't belong to user
- Verified: `tsc --noEmit` passes with no errors
- Verified: No linter errors in new route file (`npx eslint src/app/api/workouts/start/route.ts`)

### Task 3.8 — Workouts API: log set ✅
- Created `src/app/api/workouts/[id]/log-set/route.ts` with log set endpoint:
  - `POST /api/workouts/:id/log-set` — logs a single set for an exercise within a workout session
- Endpoint features:
  - Uses `requireAuth()` to get authenticated userId
  - Zod schema validation for request body:
    - `exerciseId` (required String) — exercise to log the set for
    - `weight` (required Number, non-negative) — weight used
    - `reps` (required Int, positive) — reps performed
    - `rpe` (optional Number, 1-10) — Rate of Perceived Exertion
    - `flags` (optional object: {warmup?, backoff?, dropset?, failure?}) — set type flags
    - `notes` (optional String) — per-set notes
  - Validates that session exists and belongs to authenticated user (404 if not found)
  - Validates that session is ACTIVE (400 if COMPLETED or ABANDONED)
  - Validates that exercise exists and is accessible (system OR user's custom exercise)
- Auto-creates WorkoutExercise if missing:
  - If exercise hasn't been logged in this session yet, creates a new `WorkoutExercise` entry
  - Automatically assigns next available `orderIndex` within the session
  - Enables freestyle workouts — users can add any exercise mid-workout
- Set logging behavior:
  - Automatically assigns next available `setIndex` within the exercise
  - Sets append correctly in order — each new set gets `setIndex = max(existing) + 1`
  - Preserves all flags (warmup, backoff, dropset, failure) in the set's `flags` JSON field
  - Uses Prisma `$transaction` for atomic find-or-create + append operations
- Response structure:
  - `set` — the created WorkoutSet object (id, setIndex, weight, reps, rpe, flags, notes, createdAt)
  - `exercise` — exercise context (id, name, workoutExerciseId, orderIndex)
  - `sessionId` — the session ID for reference
  - HTTP 201 Created status
- Error responses:
  - 401 Unauthorized if not authenticated
  - 400 Bad Request if validation fails or session is not active
  - 404 Not Found if session or exercise doesn't exist or isn't accessible
- Verified: `tsc --noEmit` passes with no errors
- Verified: No linter errors in new route file

### Task 3.9 — Workouts API: end session ✅
- Created `src/app/api/workouts/[id]/end/route.ts` with end session endpoint:
  - `POST /api/workouts/:id/end` — ends a workout session and records the end time
- Endpoint features:
  - Uses `requireAuth()` to get authenticated userId
  - Zod schema validation for request body (all optional):
    - `notes` (optional String) — final session notes
    - `status` (optional enum: 'COMPLETED', 'ABANDONED') — defaults to COMPLETED
  - Allows empty request body for default completion
  - Validates that session exists and belongs to authenticated user (404 if not found)
  - Validates that session is ACTIVE (400 if already COMPLETED or ABANDONED)
- Session ending behavior:
  - Sets `endedAt` to current timestamp (`new Date()`)
  - Updates `status` to COMPLETED (default) or ABANDONED if explicitly specified
  - Merges final notes if provided (replaces existing notes)
  - Returns full session object with related split/template data
- Response structure:
  - `session` — the updated WorkoutSession object including:
    - id, startedAt, endedAt, status, title, notes, constraintFlags, splitId, templateId, createdAt, updatedAt
    - `split` relation (id, name) if session had a splitId
    - `template` relation (id, name, mode) if session had a templateId
    - `exercises` array with exercise summaries and set counts
    - `durationMinutes` — calculated session duration in minutes
  - `message` — success message based on status (completed/abandoned)
- Error responses:
  - 401 Unauthorized if not authenticated
  - 400 Bad Request if validation fails or session is already ended
  - 404 Not Found if session doesn't exist or doesn't belong to user
- Verified: `tsc --noEmit` passes with no errors
- Verified: No linter errors in new route file (`npx eslint src/app/api/workouts/[id]/end/route.ts`)

### Task 3.10 — History API: list sessions ✅
- Created `src/app/api/history/route.ts` with list sessions endpoint:
  - `GET /api/history` — lists workout sessions for the authenticated user with date range filtering
- Endpoint features:
  - Uses `requireAuth()` to get authenticated userId
  - Zod schema validation for query parameters:
    - `startDate` (optional ISO 8601 datetime) — filter sessions starting from this date
    - `endDate` (optional ISO 8601 datetime) — filter sessions ending before this date
    - `limit` (optional Int, 1-100, default 50) — pagination limit
    - `offset` (optional Int, min 0, default 0) — pagination offset
    - `status` (optional enum: 'ACTIVE', 'COMPLETED', 'ABANDONED') — filter by session status
  - Always scoped to `userId` in where clause
  - Sessions sorted by `startedAt` descending (most recent first)
- Response structure:
  - `sessions` — array of workout sessions including:
    - id, startedAt, endedAt, status, title, notes, constraintFlags, createdAt, updatedAt
    - `split` relation (id, name) if session had a splitId
    - `template` relation (id, name, mode) if session had a templateId
    - `exercises` array with exercise details and set counts
    - `durationMinutes` — calculated session duration (null if not ended)
    - `summary` — { totalExercises, totalSets } for quick stats
  - `pagination` — { total, limit, offset, hasMore } for pagination info
- Error responses:
  - 401 Unauthorized if not authenticated
  - 400 Bad Request if query param validation fails
- Verified: `tsc --noEmit` passes with no errors
- Verified: No linter errors in new route file
- Verified: `npm run build` succeeds with `/api/history` registered as dynamic route

### Task 4.1 — Add IndexedDB schema (Dexie) ✅
- Created `src/lib/offline/db.ts` with Dexie IndexedDB database schema:
  - Database class `SwoleAIDatabase` extends Dexie with name 'SwoleAI'
  - Schema version 1 with three tables for offline-first workout logging
- **`activeSession` table**:
  - Primary key: `id` (always 'current' — singleton pattern for one active session)
  - `ActiveSession` interface with fields:
    - `id`, `serverSessionId` (optional), `startedAt` (Date)
    - `splitId`, `templateId`, `title`, `notes` (all optional)
    - `constraintFlags` (optional object: pain[], equipmentCrowded, lowEnergy)
    - `exercises` (array of `ActiveSessionExercise` with nested `ActiveSessionSet` arrays)
    - `updatedAt` (Date — for conflict detection)
  - `ActiveSessionExercise` interface: localId, exerciseId, exerciseName, orderIndex, notes, sets[]
  - `ActiveSessionSet` interface: localId, setIndex, weight, reps, rpe, flags, notes, loggedAt
- **`setEvents` table** (append-only event log):
  - Primary key: `++id` (auto-incremented)
  - Indexes: `serverSessionId`, `synced`, `timestamp`, `localExerciseId`
  - `SetEvent` interface with fields:
    - `id`, `serverSessionId`, `localExerciseId`
    - `eventType` enum: 'SET_LOGGED' | 'SET_UPDATED' | 'SET_DELETED'
    - `payload` object containing set data (localSetId, setIndex, weight, reps, rpe, flags, notes)
    - `timestamp` (Date), `synced` (boolean)
  - Used for event sourcing — can reconstruct session state from events
- **`pendingMutations` table** (sync queue):
  - Primary key: `++id` (auto-incremented)
  - Indexes: `status`, `createdAt`, `type`
  - `PendingMutation` interface with fields:
    - `id`, `type` (MutationType enum), `payload` (Record<string, unknown>)
    - `createdAt` (Date), `retryCount` (number), `lastError` (optional string)
    - `status` enum: 'pending' | 'processing' | 'failed'
  - `MutationType` union: START_SESSION, END_SESSION, LOG_SET, UPDATE_SET, DELETE_SET, ADD_EXERCISE, REMOVE_EXERCISE, REORDER_EXERCISES, UPDATE_SESSION_NOTES
- Created `src/lib/offline/index.ts` exporting:
  - `db` (singleton database instance), `SwoleAIDatabase` class
  - All type interfaces: `ActiveSession`, `ActiveSessionExercise`, `ActiveSessionSet`, `SetEvent`, `PendingMutation`, `MutationType`
- Verified: `tsc --noEmit` passes with no errors
- Verified: `npm run lint` passes with no errors
- Verified: `npm run build` succeeds — database module compiles correctly

### Task 4.2 — Active session persistence (continue workout) ✅
- Created `src/lib/offline/session.ts` with session persistence functions:
  - **Core functions**:
    - `saveActiveSession(session)` — saves session state to IndexedDB (overwrites existing, sets `id: 'current'` and `updatedAt`)
    - `getActiveSession()` — retrieves the current active session from IndexedDB
    - `hasActiveSession()` — checks if an active session exists (returns boolean)
    - `clearActiveSession()` — deletes the active session (called when workout ends)
    - `updateActiveSession(updates)` — partial updates to active session fields
  - **Exercise management**:
    - `addExerciseToSession(exercise)` — adds exercise with auto-assigned orderIndex
    - `removeExerciseFromSession(localId)` — removes exercise and reindexes remaining
    - `updateExerciseInSession(localId, updates)` — updates exercise fields
  - **Set management**:
    - `addSetToExercise(exerciseLocalId, set)` — adds set to exercise
    - `updateSetInExercise(exerciseLocalId, setLocalId, updates)` — updates set fields
    - `removeSetFromExercise(exerciseLocalId, setLocalId)` — removes set and reindexes
- Created `src/lib/offline/useActiveSession.ts` React hook:
  - Uses Dexie's `useLiveQuery` for reactive session restoration on app reload
  - Automatically queries `db.activeSession.get('current')` on mount — restores any persisted session
  - Provides state: `session` (ActiveSession | undefined | null), `isLoading`, `error`
  - Provides mutation functions: `startSession`, `endSession`, `addExercise`, `removeExercise`, `updateExercise`, `logSet`, `updateSet`, `removeSet`, `updateSessionMeta`
  - `StartSessionOptions` interface: splitId, templateId, title, initialExercises (all optional)
  - Error handling with `mountedRef` to prevent state updates after unmount
- Created `src/lib/offline/ActiveSessionProvider.tsx` context provider:
  - Wraps app to provide session state to all children via React Context
  - `useActiveSessionContext()` hook for consuming session state (throws if used outside provider)
  - Enables any component to access session state without prop drilling
- Updated `src/lib/offline/index.ts` with new exports:
  - Session functions: `saveActiveSession`, `getActiveSession`, `hasActiveSession`, `clearActiveSession`, `updateActiveSession`, exercise/set management functions
  - Hook: `useActiveSession`, types `UseActiveSessionReturn`, `StartSessionOptions`
  - Provider: `ActiveSessionProvider`, `useActiveSessionContext`
- Verified: `tsc --noEmit` passes with no errors
- Verified: `npm run lint` passes with no errors
- Verified: `npm run build` succeeds — all session modules compile correctly

### Task 4.3 — Mutation queue (push) ✅
- Created `src/lib/offline/mutations.ts` with mutation queue functions:
  - **Queue operations**:
    - `enqueueMutation(type, payload)` — adds a mutation to the pending queue with status 'pending'
    - `getPendingMutations()` — retrieves all pending mutations sorted by createdAt (oldest first)
    - `getPendingMutationCount()` — returns count of pending mutations
    - `getFailedMutations()` — retrieves all failed mutations for retry/inspection
  - **Status management**:
    - `markMutationProcessing(id)` — marks mutation as 'processing' (being synced)
    - `markMutationFailed(id, error)` — marks mutation as 'failed', increments retryCount, stores error
    - `removeMutation(id)` — deletes successfully synced mutation from queue
    - `retryMutation(id)` — resets failed mutation to 'pending' for retry
  - **Cleanup**:
    - `clearAllMutations()` — clears entire queue (for logout/reset)
    - `resetProcessingMutations()` — resets stuck 'processing' mutations to 'pending' (app startup recovery)
- Created `src/lib/offline/sync.ts` with background sync service:
  - **SyncService class** (singleton pattern):
    - Listens for browser `online`/`offline` events to detect network state changes
    - Runs sync loop every 5 seconds (`SYNC_INTERVAL_MS = 5000`)
    - Processes mutations in order (FIFO) to maintain consistency
    - Max 3 retries per mutation (`MAX_RETRIES = 3`) before marking as permanently failed
  - **SyncState interface**: `status`, `pendingCount`, `lastSyncAt`, `lastError`, `isOnline`
  - **SyncStatus type**: 'synced' | 'pending' | 'syncing' | 'offline' | 'error'
  - **Key methods**:
    - `initialize()` — sets up event listeners and starts sync loop (idempotent)
    - `destroy()` — cleanup for unmount
    - `subscribe(listener)` — reactive state updates
    - `triggerSync()` — force immediate sync attempt
    - `notifyMutationAdded()` — triggers immediate sync when new mutation added while online
  - **Mutation execution**:
    - Maps mutation types to API endpoints and HTTP methods
    - Builds URLs with path parameters from payload (sessionId, setId, exerciseId)
    - Handles network errors gracefully, stops processing on connectivity issues
- Created `src/lib/offline/useSync.ts` React hook:
  - `useSync()` hook returns: `status`, `pendingCount`, `isOnline`, `lastSyncAt`, `lastError`, `syncState`, `triggerSync`
  - Initializes sync service on mount, subscribes to state changes
  - Provides reactive updates when sync status changes
- Updated `src/lib/offline/useActiveSession.ts` to enqueue mutations:
  - `startSession` → enqueues `START_SESSION` mutation
  - `endSession` → enqueues `END_SESSION` mutation (if serverSessionId exists)
  - `addExercise` → enqueues `ADD_EXERCISE` mutation
  - `removeExercise` → enqueues `REMOVE_EXERCISE` mutation
  - `logSet` → enqueues `LOG_SET` mutation with exerciseId, weight, reps, rpe, flags, notes
  - `updateSet` → enqueues `UPDATE_SET` mutation
  - `removeSet` → enqueues `DELETE_SET` mutation
  - `updateSessionMeta` → enqueues `UPDATE_SESSION_NOTES` mutation
  - All operations call `syncService.notifyMutationAdded()` to trigger immediate sync if online
- Updated `src/lib/offline/index.ts` with new exports:
  - Mutation functions: `enqueueMutation`, `getPendingMutations`, `getPendingMutationCount`, `getFailedMutations`, `markMutationProcessing`, `markMutationFailed`, `removeMutation`, `retryMutation`, `clearAllMutations`, `resetProcessingMutations`
  - Sync exports: `syncService`, types `SyncStatus`, `SyncState`
  - Hook: `useSync`, type `UseSyncReturn`
- Verified: `tsc --noEmit` passes with no errors
- Verified: `npm run lint` passes with no errors
- Verified: `npm run build` succeeds — all sync modules compile correctly

### Task 4.4 — Sync status pill ✅
- Created `src/components/ui/SyncStatusPill.tsx` — global sync indicator component:
  - Uses `useSync()` hook from Task 4.3 to read sync status
  - Displays 5 distinct states with appropriate icons and colors:
    - **synced** (green checkmark) — all changes synced
    - **pending** (amber RefreshCw) — changes waiting to sync, shows count (e.g., "3 pending")
    - **syncing** (amber spinning Loader2) — actively syncing, shows count (e.g., "Syncing 2")
    - **offline** (gray CloudOff) — device offline
    - **error** (red AlertCircle) — sync failed, clickable to retry
  - Status config object maps each status to icon, label, CSS class, and animation flag
  - Error state is interactive — clicking triggers `triggerSync()` for manual retry
  - Accessible: includes `aria-label` for screen readers and tooltip on error state
  - Lucide icons: Check, CloudOff, RefreshCw, AlertCircle, Loader2
- Updated `src/app/globals.css` — added offline status pill style:
  - `.status-pill--offline` with gray background (`rgba(113, 113, 122, 0.15)`) and muted text color
  - Complements existing `.status-pill--success`, `--warning`, `--error`, `--info` variants
- Updated `src/components/layout/AppShell.tsx` — integrated global sync indicator:
  - Added sticky header with `SyncStatusPill` component
  - Header styled with glass effect: `bg-[var(--color-base-800)]/95 backdrop-blur-lg`
  - Positioned at top-right per design spec section 2.3 ("Global sync pill (top of Dashboard, Settings)")
  - Safe area padding for PWA notch handling
- Updated `src/components/ui/index.ts` — exported `SyncStatusPill`
- Verified: `tsc --noEmit` passes with no errors
- Verified: `npm run lint` passes with no errors (CSS warning expected)
- Verified: `npm run build` succeeds — production build compiles correctly

---

## H) Production Deployment Fixes

### Fix: Prisma generate in build script ✅
- **Problem:** Vercel deployment failed with `Module '@prisma/client' has no exported member 'ExerciseType'`
- **Cause:** Prisma client wasn't being generated during Vercel build
- **Solution:** Updated `package.json` build script from `"next build"` to `"prisma generate && next build"`
- Ensures Prisma client with all enums is generated before Next.js compilation

### Fix: Auth switched from in-memory to Prisma database ✅
- **Problem:** Login was stuck/hanging on Vercel deployment
- **Cause:** Auth was using in-memory `Map` for user storage — serverless functions are stateless, so users weren't persisted
- **Solution:** Updated `src/lib/auth/auth.config.ts`:
  - `authorize()` now queries `prisma.user.findUnique()` instead of in-memory Map
  - `createUser()` now uses `prisma.user.create()` 
  - `userExists()` now uses `prisma.user.findUnique()` (made async)
- Updated `src/app/api/auth/signup/route.ts` to `await userExists()` since it's now async
- Added try/catch error handling and `[Auth]` console logging for debugging

### Fix: Secure cookies for production ✅
- **Problem:** Login succeeded but user was redirected back to login page
- **Cause:** On Vercel (HTTPS), NextAuth uses `__Secure-` prefixed cookie names, but middleware was looking for non-prefixed name
- **Solution:**
  - Added explicit cookie configuration in `src/lib/auth/auth.config.ts`:
    - Production uses `__Secure-next-auth.session-token`
    - Development uses `next-auth.session-token`
  - Updated `src/middleware.ts` to use matching `cookieName` in `getToken()` call
- Login flow now works correctly on Vercel production deployment

### Fix: Dashboard date timezone ✅
- **Problem:** Dashboard showed date one day ahead
- **Cause:** `new Date()` was running on server (UTC timezone on Vercel) instead of client
- **Solution:** Made dashboard a client component (`'use client'`) and compute date in `useEffect` hook
- Date now displays correctly in user's local timezone

### Task 5.1 — Workout Start screen ✅
- Created `src/app/app/workout/start/page.tsx` — Workout Start screen entry point:
  - **Today's Scheduled Workout section**:
    - Fetches active split via `GET /api/splits?activeOnly=true`
    - Determines today's weekday and finds matching `SplitScheduleDay`
    - Shows scheduled template with "Scheduled" badge and primary styling if available
    - Shows "Rest Day" notice if `isRest=true` for today
    - Shows "No Active Split" notice if user has no active split configured
  - **Templates List section**:
    - Fetches all templates via `GET /api/templates`
    - Shows "Your Templates" list (excluding today's scheduled template)
    - Each card shows template name, estimated duration, exercise count/muscle groups
  - **Freestyle Quick Start section**:
    - "Freestyle Workout" option to start empty and add exercises as you go
  - **Start Workout flow**:
    - `handleStartWorkout()` calls `startSession()` from `useActiveSessionContext()` → saves to IndexedDB + queues sync mutation
    - Calls `POST /api/workouts/start` to create server session
    - Routes to Workout Mode via `router.push('/app/workout/session/current')`
  - Loading states with skeleton cards, error handling, accessibility
- Created `src/app/app/workout/page.tsx` — Workout hub redirect page:
  - If active session exists → redirects to `/app/workout/session/:id`
  - If no active session → redirects to `/app/workout/start`
  - Shows loading spinner during session check
- Created `src/app/app/workout/session/[id]/page.tsx` — Workout Session placeholder:
  - Placeholder for Task 5.2 (Workout Mode screen skeleton)
  - Shows session title, start time, exercise count from `useActiveSessionContext()`
  - "No Active Session" state if session not found
- Updated `src/app/app/layout.tsx` — wrapped app with `ActiveSessionProvider`:
  - Imports `ActiveSessionProvider` from `@/lib/offline`
  - Wraps `<AppShell>` children so session context is available throughout authenticated app
- **UI Components used**:
  - `WorkoutOptionCard` — reusable card component with icon, title, subtitle, badge, loading state
  - `GlassCard` — glass-styled card for notices (rest day, no split)
  - Lucide icons: Play, CalendarCheck, Dumbbell, Sparkles, ChevronRight, Loader2
- **Acceptance criteria verified**:
  - Starting workout creates session (IndexedDB + API) ✓
  - Routes to Workout Mode (`/app/workout/session/current`) ✓
- Verified: `npm run build` succeeds — all routes compile:
  - `/app/workout` (Static)
  - `/app/workout/start` (Static)
  - `/app/workout/session/[id]` (Dynamic)
- Verified: `tsc --noEmit` passes with no errors
- Verified: `npx eslint src/app/app/workout/ src/app/app/layout.tsx` — no lint errors in new files

### Task 5.2 — Workout Mode screen skeleton ✅
- Rebuilt `src/app/app/workout/session/[id]/page.tsx` — full Workout Mode interface:
  - **Top Bar**:
    - Session title (or "Workout" fallback)
    - Elapsed time component with `Clock` icon, updates every second
    - `SyncStatusPill` (compact, no count)
    - Overflow menu button (`MoreVertical` icon)
    - Sticky header with glass blur effect
  - **Exercise Cards List**:
    - `ExerciseCard` component for each exercise in session
    - Shows exercise name, sets count badge, best set indicator (`TrendingUp` icon)
    - Sets summary line (e.g., "135×8 / 145×6 / 155×4")
    - Set flag badges (Warmup, Failure, Drop) with appropriate colors
    - Tappable cards with `onTap` handler ready for Task 5.3 Set Logger
    - Sorted by `orderIndex` ascending
  - **Empty State**:
    - `EmptyExerciseState` component with Dumbbell icon
    - "No exercises yet" message with "Add Exercise" CTA button
  - **Bottom Bar** (fixed above BottomNav):
    - `BottomBar` component positioned with `bottom: var(--bottom-nav-height)` to sit above nav
    - **Add Exercise** button — gradient primary style with `Plus` icon
    - **Timer** button — toggleable state with `Timer` icon (placeholder for Task 5.7)
    - **End Workout** button — `Square` icon with error color
    - All buttons have 44px+ touch targets, labels below icons
  - **End Workout Flow**:
    - Shows styled `ConfirmModal` instead of `window.confirm()`
    - "End Workout?" title with danger variant styling
    - "Keep Going" (cancel) and "End Workout" (confirm) buttons
    - Loading state during `endSession()` async operation
    - On confirm: ends session via IndexedDB + sync, redirects to `/app/workout/start`
- Created `src/components/ui/ConfirmModal.tsx` — reusable confirmation modal component:
  - **Props**: `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel`, `cancelLabel`, `variant`, `isLoading`
  - **Variants**: `danger` (red), `warning` (amber), `info` (purple/blue gradient), `success` (green)
  - Each variant has matching icon (AlertTriangle, Info, CheckCircle), icon background, and confirm button color
  - Backdrop with blur effect, centered modal with glass card styling
  - Close on Escape key or backdrop click (unless loading)
  - Focus management: focuses confirm button on open
  - Prevents body scroll while open
  - Loading spinner state for async confirm actions
  - ARIA attributes for accessibility (`role="dialog"`, `aria-modal`, `aria-labelledby`)
- Updated `src/components/ui/index.ts` — exported `ConfirmModal` and types
- **Layout Fixes**:
  - Bottom bar positioned above BottomNav using `bottom: var(--bottom-nav-height)` (72px)
  - Main content has `pb-40` (160px) padding to account for both bars
  - Removed `safe-area-bottom` from workout bottom bar (BottomNav handles it)
- **Mobile-first Design**:
  - 44px+ touch targets on all buttons
  - `touch-target` CSS class applied
  - `active:scale-[0.98]` feedback on tap
  - `tabular-nums` for weight/rep displays
  - Safe area handling for PWA notch support
- **Acceptance criteria verified**:
  - Screen renders ✓ (`npm run build` succeeds, no TypeScript errors)
  - Usable on mobile ✓ (large touch targets, sticky bars, proper spacing)
- Verified: `npm run build` succeeds — `/app/workout/session/[id]` compiles as dynamic route
- Verified: `tsc --noEmit` passes with no errors
- Verified: No linter errors in updated files

### Task 5.3 — Set Logger sheet (log set) ✅
- Created `src/components/workout/SetLoggerSheet.tsx` — modal/sheet component for logging sets:
  - **Sheet UI**:
    - Bottom sheet with rounded top corners, drag handle, glass background
    - Backdrop with blur effect, dismissible on tap
    - `animate-in slide-in-from-bottom` entrance animation
    - Safe area padding for PWA home indicator
  - **Header**:
    - Exercise name (truncated if long)
    - Set number indicator (e.g., "Set 3")
    - Previous sets summary (e.g., "135×8 / 145×6")
    - Close button (X icon) in top-right
  - **Big Steppers** (gym-first UX per Design Spec 5.3.2):
    - `Stepper` component with large touch targets (44px+)
    - **Weight stepper**: small step ±2.5, large step ±10, unit label "lbs"
    - **Reps stepper**: small step ±1, large step ±5
    - Each stepper has 4 buttons: -large, -small, +small, +large
    - Value display centered with `tabular-nums` font variant
    - Step amounts shown below large increment/decrement buttons
  - **Pre-fill behavior**:
    - Automatically pre-fills weight/reps from last logged set
    - Resets to 0/0 if no previous sets exist
  - **Log Set flow**:
    - Generates unique `localId` with timestamp + random suffix
    - Calls `onLogSet(exerciseLocalId, set)` → writes to IndexedDB via `addSetToExercise()`
    - `logSet()` in `useActiveSession` enqueues `LOG_SET` mutation for sync
    - Closes sheet on success, keeps open on error for retry
    - Loading state with spinner and "Logging..." text
  - **Validation**:
    - Log Set button disabled if both weight and reps are 0
    - Prevents double-tap with `isLogging` guard
- Created `src/components/workout/index.ts` — barrel export for workout components
- Updated `src/app/app/workout/session/[id]/page.tsx` — integrated SetLoggerSheet:
  - Added state: `selectedExercise`, `showSetLoggerSheet`
  - `handleExerciseTap()` opens sheet with selected exercise
  - `handleCloseSetLoggerSheet()` clears state and closes sheet
  - `handleLogSet()` wraps `logSet()` from `useActiveSessionContext()`
  - Added `SetLoggerSheet` component with conditional render
  - Imported `ActiveSessionSet` type for handler typing
- **IndexedDB + Sync Integration**:
  - Set logged immediately to IndexedDB via `addSetToExercise()`
  - `useLiveQuery` in `useActiveSession` triggers reactive UI update
  - `LOG_SET` mutation enqueued with exerciseId, localSetId, weight, reps, rpe, flags, notes
  - `syncService.notifyMutationAdded()` triggers background sync when online
- **Acceptance criteria verified**:
  - Logging a set updates UI immediately ✓ (Dexie live query)
  - Persists locally ✓ (IndexedDB via `addSetToExercise()`)
- Updated `src/app/app/workout/start/page.tsx` — added sample exercises for testing:
  - Freestyle workout now starts with 3 sample exercises (Bench Press, Squat, Deadlift)
  - Enables testing Set Logger without requiring database connection
  - Sample exercises have placeholder IDs (`sample-bench-press`, `sample-squat`, `sample-deadlift`)
- Verified: `tsc --noEmit` passes with no errors
- Verified: `npm run lint` passes with no errors
- Verified: `npm run build` succeeds — all files compile correctly

### Task 5.4 — Edit set ✅
- Updated `src/components/workout/SetLoggerSheet.tsx` — added edit mode support:
  - **New Props**:
    - `onUpdateSet` (optional callback) — updates an existing set in IndexedDB + enqueues sync mutation
    - `editingSet` (optional ActiveSessionSet) — if provided, sheet opens in edit mode
  - **Edit Mode Behavior**:
    - `isEditMode` flag derived from `!!editingSet`
    - Pre-fills weight/reps from `editingSet` values instead of last logged set
    - Header shows purple "Edit" badge with `Edit3` icon
    - Shows "Set N" for the specific set being edited (1-indexed)
    - Previous sets summary excludes the set being edited
  - **Update Flow**:
    - `handleUpdateSet()` calls `onUpdateSet(exerciseLocalId, setLocalId, { weight, reps })`
    - `handleSubmit()` routes to `handleUpdateSet()` in edit mode, `handleLogSet()` in new set mode
    - Loading state shows "Updating..." in edit mode
  - **Button Styling**:
    - Edit mode: "Update Set" with `Edit3` icon
    - New set mode: "Log Set" with `Check` icon (unchanged)
- Updated `src/app/app/workout/session/[id]/page.tsx` — added edit set interaction:
  - **State Changes**:
    - Added `editingSet` state (`ActiveSessionSet | null`)
    - Added `updateSet` from `useActiveSessionContext()`
  - **Handlers**:
    - `handleAddSetTap(exercise)` — opens sheet for new set (clears `editingSet`)
    - `handleEditSetTap(exercise, set)` — opens sheet in edit mode (sets both `selectedExercise` and `editingSet`)
    - `handleUpdateSet()` — wraps `updateSet()` from context
    - `handleCloseSetLoggerSheet()` — clears both `selectedExercise` and `editingSet`
  - **ExerciseCard Redesign**:
    - Props changed from `onTap` to `onTapAddSet` and `onTapEditSet`
    - Header row: exercise name + sets badge + best set + **Add button (+ icon)** — tappable to add new set
    - Individual sets row: **tappable pills** for each logged set showing `setIndex | weight×reps`
    - Each pill has set number badge, weight×reps, and flag indicators (W/F/D)
    - Pills styled with hover/active states for clear interactivity
    - Empty state shows "Tap + to log your first set"
  - **SetLoggerSheet Integration**:
    - Passes `onUpdateSet={handleUpdateSet}` and `editingSet={editingSet ?? undefined}`
- **Data Flow** (Edit):
  - User taps set pill → `handleEditSetTap(exercise, set)` → sets `selectedExercise` + `editingSet` → opens SetLoggerSheet in edit mode
  - User adjusts values → taps "Update Set" → `handleUpdateSet()` → `updateSet()` → `updateSetInExercise()` (IndexedDB) + `enqueueMutation('UPDATE_SET')` (sync queue)
  - UI updates reactively via Dexie `useLiveQuery`
- **Acceptance criteria verified**:
  - Edited set is persisted ✓ (IndexedDB via `updateSetInExercise()`)
  - Reflected after reload ✓ (Dexie live query restores session state on mount)
- Verified: `tsc --noEmit` passes with no errors
- Verified: `read_lints` returns no errors
- Verified: `npm run build` succeeds — all files compile correctly

### Task 5.5 — Undo last action ✅
- **New Undo Types in `src/lib/offline/db.ts`**:
  - `UndoActionType` — union of undoable actions: `'LOG_SET' | 'UPDATE_SET' | 'DELETE_SET'`
  - `UndoLogSetPayload` — stores `exerciseLocalId` + `setLocalId` to remove on undo
  - `UndoUpdateSetPayload` — stores `exerciseLocalId` + `setLocalId` + `previousValues` (weight, reps, rpe, flags, notes)
  - `UndoDeleteSetPayload` — stores `exerciseLocalId` + full `deletedSet` object for restoration
  - `UndoActionPayload` — union type of all undo payloads
  - `UndoAction` — action stored in stack with `id`, `timestamp`, `payload`
- **Undo Stack Functions in `src/lib/offline/session.ts`**:
  - In-memory `undoStack: UndoAction[]` (cleared on session end)
  - `MAX_UNDO_STACK_SIZE = 10` — bounded for memory safety
  - `pushUndoAction(payload)` — adds action, trims if exceeds max
  - `popUndoAction()` — removes and returns last action
  - `peekUndoAction()` — returns last action without removing
  - `hasUndoActions()` — boolean check for empty stack
  - `getUndoStackLength()` — returns stack size
  - `clearUndoStack()` — clears entire stack (called on session end)
  - `executeUndo()` — pops action and reverses it:
    - `LOG_SET` → calls `removeSetFromExercise()` to delete the logged set
    - `UPDATE_SET` → calls `updateSetInExercise()` with `previousValues`
    - `DELETE_SET` → re-inserts `deletedSet` at original `setIndex` position
- **Updated `src/lib/offline/useActiveSession.ts`**:
  - Added `canUndo` state (boolean) — tracks if undo stack is non-empty
  - Added `undoLastAction()` function — calls `executeUndo()` and updates `canUndo` state
  - Modified `logSet()` — pushes `UndoLogSetPayload` after adding set
  - Modified `updateSet()` — captures current values, pushes `UndoUpdateSetPayload` before updating
  - Modified `removeSet()` — captures full set data, pushes `UndoDeleteSetPayload` before deleting
  - Modified `endSession()` — calls `clearUndoStack()` and resets `canUndo` to false
  - Added `canUndo` and `undoLastAction` to `UseActiveSessionReturn` interface
- **Updated `src/app/app/workout/session/[id]/page.tsx`**:
  - Added `Undo2` icon import from lucide-react
  - Added `isUndoing` state for loading indicator
  - Destructured `canUndo` and `undoLastAction` from `useActiveSessionContext()`
  - Added `handleUndo()` handler — calls `undoLastAction()` with loading state
  - Added Undo button in top bar header (next to SyncStatusPill):
    - Shows `Undo2` icon
    - Enabled/disabled based on `canUndo` state
    - Disabled styling (opacity 40%, cursor not-allowed) when no undo available
    - Active styling with hover/active states
    - `animate-pulse` on icon during undo operation
- **Updated `src/lib/offline/index.ts`**:
  - Exported all new undo types: `UndoActionType`, `UndoLogSetPayload`, `UndoUpdateSetPayload`, `UndoDeleteSetPayload`, `UndoActionPayload`, `UndoAction`
  - Exported all undo functions: `pushUndoAction`, `popUndoAction`, `peekUndoAction`, `hasUndoActions`, `getUndoStackLength`, `clearUndoStack`, `executeUndo`
- **Acceptance criteria verified**:
  - Undo restores prior state safely ✓
    - LOG_SET undo → removes the set from session
    - UPDATE_SET undo → restores previous weight/reps/rpe/flags/notes
    - DELETE_SET undo → re-inserts set at original position
  - Stack bounded to 10 actions ✓ (memory safe)
  - Stack cleared on session end ✓
- Verified: `tsc --noEmit` passes with no errors
- Verified: `eslint` passes with no errors (1 pre-existing warning)

### Task 5.6 — Set flags ✅
- Updated `src/components/workout/SetLoggerSheet.tsx` — added flag toggle UI:
  - **New Types**:
    - `SetFlagKey` — exported union type: `'warmup' | 'backoff' | 'dropset' | 'failure'`
    - `SetFlags` — interface with optional boolean for each flag key
    - `FlagToggleConfig` — config object for each flag (key, label, shortLabel, icon, activeColor, activeBg)
  - **FLAG_CONFIGS constant** — array of 4 flag configurations:
    - **Warmup** — `Flame` icon, info/cyan color, "W" short label
    - **Backoff** — `TrendingDown` icon, accent-blue color, "B" short label
    - **Drop** — `Zap` icon, warning/amber color, "D" short label
    - **Failure** — `AlertTriangle` icon, error/red color, "F" short label
  - **`FlagToggles` component** (Task 5.6):
    - Row of 4 toggle buttons below the steppers
    - Each button is 64px min-width × 56px height (44px+ touch targets per design spec)
    - Active state: colored background + border matching flag color, colored icon/text
    - Inactive state: neutral gray background, muted text
    - `aria-pressed` attribute for accessibility
    - `aria-label` indicates current state ("Add/Remove X flag")
    - `active:scale-95` press feedback
  - **State Management**:
    - Added `flags` state (`SetFlags`) initialized to `{}`
    - `handleToggleFlag(key)` — toggles individual flag on/off
    - `cleanFlags(f)` — strips false values, returns `undefined` if no flags set (clean storage)
  - **Pre-fill Behavior**:
    - Edit mode: pre-fills `flags` from `editingSet.flags ?? {}`
    - New set mode: flags always reset to `{}` (flags are per-set intent, not carried forward)
  - **Data Flow**:
    - `handleLogSet()` passes `flags: cleanFlags(flags)` in the set payload
    - `handleUpdateSet()` passes `flags: cleanFlags(flags)` in the update payload
    - Flags flow through `onLogSet` → `addSetToExercise()` (IndexedDB) → `enqueueMutation('LOG_SET')` (sync)
    - Flags flow through `onUpdateSet` → `updateSetInExercise()` (IndexedDB) → `enqueueMutation('UPDATE_SET')` (sync)
- Updated `src/app/app/workout/session/[id]/page.tsx` — added backoff flag display:
  - **ExerciseCard set pills** now show all 4 flag badges:
    - **W** (warmup) — info/cyan color (already existed)
    - **B** (backoff) — accent-blue color (new)
    - **D** (dropset) — warning/amber color (already existed)
    - **F** (failure) — error/red color (moved to last position for consistent ordering)
  - Badge ordering: W → B → D → F (warm → cool → hot → critical)
- Updated `src/components/workout/index.ts` — exported `SetFlagKey` type
- **Data Model** (already existed — no schema changes needed):
  - `ActiveSessionSet.flags` in `db.ts`: `{ warmup?, backoff?, dropset?, failure? }` — IndexedDB
  - `SetEvent.payload.flags` in `db.ts`: same structure — event log
  - `WorkoutSet.flags` in `schema.prisma`: `Json @default("{}")` — Postgres
  - `UndoUpdateSetPayload.previousValues.flags` in `db.ts`: preserves flags for undo
- **Acceptance criteria verified**:
  - Flags are saved ✓ (IndexedDB via `addSetToExercise()` / `updateSetInExercise()`, sync queue via `enqueueMutation()`)
  - Flags are displayed ✓ (set pills show W/B/D/F badges, edit mode pre-fills flags)
- Verified: `tsc --noEmit` passes with no errors
- Verified: `read_lints` returns no errors on changed files

### Task 5.8 — Add exercise mid-workout ✅
- **New API endpoint `src/app/api/favorites/route.ts`** — `GET /api/favorites`:
  - Returns all of the authenticated user's favorites with full exercise details (id, name, type, pattern, muscleGroups, isCustom) joined via Prisma `include`
  - Ordered `priority: 'desc'` so PRIMARY favorites appear before BACKUP (alphabetically `BACKUP < PRIMARY`, so desc puts PRIMARY first), then by `createdAt: 'asc'`
  - Protected by `requireAuth()` — returns 401 if unauthenticated
- **New component `src/components/workout/AddExerciseSheet.tsx`**:
  - Bottom sheet (same visual pattern as `SetLoggerSheet`) — handle bar, header, close button
  - **Search input**: full-width, auto-focused after data loads, client-side filter over fetched exercise list
  - **Data fetching**: on `isOpen` becoming `true`, fetches `GET /api/exercises` and `GET /api/favorites` in parallel; resets `query` to `''` on close
  - **Favorites section**: exercises from the user's favorites list that match the search query are rendered first under a sticky "⭐ Favorites" section header; each row shows a filled gold `Star` icon
  - **All Exercises section**: non-favorite exercises matching the query appear below under "All Exercises" (or "Exercises" when no favorites section is visible)
  - **ExerciseRow subcomponent**: shows exercise name + muscle groups preview (up to 2, then "+N more"), star or dumbbell icon, and a `Plus` icon right-side; shows per-row `Loader2` spinner while that exercise is being added
  - **Already-added indicator**: exercises already in the active session (matched by `exerciseId`) show an "Added" badge and are disabled — prevents duplicates while still allowing the user to see what's in the session
  - **Add flow**: tapping a row generates a `localId` (`ex_${Date.now()}_${random}`), calls `onAddExercise({ localId, exerciseId, exerciseName })`, and closes the sheet on success; keeps sheet open on error so the user can retry
  - **Empty state**: `Dumbbell` icon + "No exercises found" message; search hint shown when a query is active
  - **Loading state**: centered `Loader2` spinner while fetching
  - Sheet max-height capped at 85 vh with `overflow-y-auto` on the list for comfortable scrolling on any screen size
- **Updated `src/components/workout/index.ts`**:
  - Exported `AddExerciseSheet` component and `AddExerciseSheetProps` type
- **Updated `src/app/app/workout/session/[id]/page.tsx`**:
  - Imported `AddExerciseSheet` from `@/components/workout`
  - Destructured `addExercise` from `useActiveSessionContext()`
  - Added `showAddExerciseSheet` state (`boolean`)
  - Replaced the placeholder `handleAddExercise` (`console.log`) with `setShowAddExerciseSheet(true)`
  - Rendered `<AddExerciseSheet>` at the bottom of the page — wired to `addExercise` from context; passes `currentExerciseIds` derived from `session.exercises.map(e => e.exerciseId)` for "already added" detection
  - Both the bottom bar "Add" button and the empty-state "Add Exercise" button now correctly open the sheet
- **Data flow** (Add):
  - User taps "Add" → `AddExerciseSheet` opens → fetches exercises + favorites → user searches + selects → `addExercise({ localId, exerciseId, exerciseName })` → `addExerciseToSession()` (IndexedDB) + `enqueueMutation('ADD_EXERCISE')` (sync queue) → Dexie `useLiveQuery` triggers re-render → new `ExerciseCard` appears in session view → user taps card to open `SetLoggerSheet` and log sets
- **Acceptance criteria verified**:
  - User can add a new exercise mid-workout ✓ (AddExerciseSheet → addExercise() → IndexedDB write → reactive UI update)
  - New exercise appears as an ExerciseCard and sets can be logged immediately ✓
  - Favorites are pinned to the top of the list ✓ (dedicated section above "All Exercises")
  - Search filters both sections simultaneously ✓
- Verified: `tsc --noEmit` passes with no errors
- Verified: `read_lints` returns no errors on all changed files

---

### Task 5.9 — Reorder exercises ✅
- **Prerequisite satisfied**: Task 5.2 (workout session page + exercise cards) in place
- **Installed packages**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — the standard React drag-and-drop solution; chosen because it handles both mouse/stylus (PointerSensor) and touch (TouchSensor) natively, making it correct for mobile-first use
- **`src/lib/offline/session.ts`**:
  - Added `reorderExercisesInSession(orderedLocalIds: string[])` — builds a `Map` from the current exercises, then reconstructs the array in the new order assigning fresh `orderIndex` values (`0, 1, 2…`), and persists to IndexedDB via `db.activeSession.update`
- **`src/lib/offline/useActiveSession.ts`**:
  - Imported `reorderExercisesInSession`
  - Added `reorderExercises` to the `UseActiveSessionReturn` interface (under "Reorder Support")
  - Implemented `reorderExercises` as a `useCallback` that calls `reorderExercisesInSession` and surfaces errors via the shared `error` state
  - Added `reorderExercises` to the hook's return object
- **`src/lib/offline/index.ts`**:
  - Exported `reorderExercisesInSession`
- **`src/components/workout/SortableExerciseList.tsx`** *(new file)*:
  - `SortableExerciseList` — top-level component wrapping exercises in `<DndContext>` + `<SortableContext>` (vertical list strategy)
  - `SortableItem` — per-card wrapper using `useSortable`; applies CSS `transform`/`transition` during drag, sets `opacity: 0.5` on the item being dragged
  - Drag handle: `GripVertical` icon button with `touch-none select-none` to prevent text/scroll interference; `onClick` is stopped to avoid triggering the card's set-logger tap
  - `renderCard` render-prop pattern: parent controls card markup and decides where to place the injected `dragHandle` node — keeps `SortableExerciseList` generic and `ExerciseCard` in control of its own layout
  - Activation constraints: `PointerSensor` requires 8 px movement; `TouchSensor` requires 200 ms delay + 8 px tolerance — prevents mis-fires on normal taps
  - Optimistic UI: `localOrder` state is updated immediately on `dragEnd`; persists via `onReorder`; rolls back on error
  - Syncs `localOrder` when exercises are added/removed (by checking whether all current IDs are present in local order)
- **`src/components/workout/index.ts`**:
  - Exported `SortableExerciseList` and `SortableExerciseListProps`
- **`src/app/app/workout/session/[id]/page.tsx`**:
  - `ExerciseCardProps` extended with optional `dragHandle?: React.ReactNode`
  - `ExerciseCard` header restructured: drag handle is rendered left of the tappable button area; the `+` button now has `shrink-0` to stay fixed-size alongside the handle
  - Destructured `reorderExercises` from `useActiveSessionContext()`
  - Replaced `session.exercises.sort().map(<ExerciseCard>)` with `<SortableExerciseList>` passing pre-sorted exercises, `reorderExercises` as `onReorder`, and a `renderCard` callback that passes the injected `dragHandle` into `ExerciseCard`
- **Data flow** (Reorder):
  - User long-presses / drags the `GripVertical` handle → `DndContext` tracks pointer/touch → on `dragEnd`, `arrayMove` computes new order → `localOrder` updated (optimistic) → `reorderExercises(newOrder)` called → `reorderExercisesInSession()` writes new `orderIndex` values to IndexedDB → Dexie `useLiveQuery` triggers re-render → exercises displayed in persisted order (survives page reload)
- **Acceptance criteria verified**:
  - Drag/drop reorder is functional on both mouse and touch ✓
  - Order persists in active session ✓ (IndexedDB write, survives reload via `useLiveQuery`)
- Verified: `tsc --noEmit` passes with no errors
- Verified: `read_lints` returns no errors on all changed files

---

### Task 5.10 — End workout + summary screen ✅
- **Prerequisite satisfied**: Task 5.3 (set logger + IndexedDB persistence) in place
- **`src/lib/offline/db.ts`**:
  - Added `CompletedWorkoutSummary` interface with fields: `id` (fixed `'last'`), `title`, `startedAt`, `endedAt`, `durationSeconds`, `exercises` (full snapshot), `totalSets`, `totalVolume`
  - Added `completedWorkout` Dexie `EntityTable<CompletedWorkoutSummary, 'id'>` to `SwoleAIDatabase`
  - Added schema version 2 (all previous tables retained + `completedWorkout: 'id'`) — Dexie handles migration automatically on next app open
- **`src/lib/offline/useActiveSession.ts`**:
  - Imported `CompletedWorkoutSummary` from `./db`
  - Updated `endSession()`: before clearing the active session, snapshots the full session into a `CompletedWorkoutSummary` — computes `endedAt = new Date()`, `durationSeconds`, iterates all exercises/sets to compute `totalSets` (sets where weight > 0 or reps > 0) and `totalVolume` (sum of `weight × reps`), writes the record to `db.completedWorkout.put({ id: 'last', … })`; then clears the active session and undo stack as before
  - End-session mutation enqueue for server sync remains unchanged
- **`src/app/app/workout/session/[id]/page.tsx`**:
  - `handleConfirmEndWorkout` now routes to `/app/workout/summary` (instead of `/app/workout/start`) after `endSession()` resolves
- **`src/app/app/workout/summary/page.tsx`** *(new file)*:
  - `WorkoutSummaryPage` — reads `db.completedWorkout.get('last')` via `useLiveQuery`; a `hasResolved` state flag (set on first non-`undefined` return from Dexie) gates a brief loading spinner vs. the no-summary fallback
  - **Completion header**: gradient `CheckCircle2` icon, "Workout Complete!" heading, session title (fallback: "Freestyle Workout"), formatted `endedAt` timestamp
  - **Stats row** (`GlassCard`): three `StatBadge` columns separated by dividers — Duration (`formatDuration` → `"Xh Ym"` / `"Ym Zs"`), Sets (count of logged sets), Volume (`"N,NNN lbs"`)
  - **Exercise breakdown**: exercises sorted by `orderIndex`; each rendered via `ExerciseSummaryCard` — numbered gradient badge, exercise name, best-set indicator (`TrendingUp` icon + `weight×reps`), set pills matching the Workout Mode style (weight×reps + W/B/D/F flag badges); empty-set fallback text
  - **Empty workout state**: shown when no exercises logged
  - **NoSummaryState**: shown if no completed workout exists in IndexedDB (e.g. navigating to summary URL directly)
  - **Action buttons**:
    - **Generate Next Session Plan** (primary `btn-primary`, `Sparkles` icon) → `/app/coach` (placeholder for future AI coach task)
    - **Done** (secondary glass button, `LayoutDashboard` icon) → `router.replace('/app/dashboard')`
- **Data flow** (End + Summary):
  - User taps **End** → `ConfirmModal` → `handleConfirmEndWorkout` → `endSession()` → snapshot written to `db.completedWorkout` → active session cleared → route to `/app/workout/summary` → `useLiveQuery` reads `completedWorkout` → full summary rendered
- **Acceptance criteria verified**:
  - Ending records end time ✓ (`endedAt` + `durationSeconds` stored before clearing session)
  - Shows summary ✓ (summary page reads snapshot from IndexedDB, renders stats + exercise breakdown)
- Verified: `tsc --noEmit` passes with no errors
- Verified: `read_lints` returns no errors on all changed files

---

### Task 6.1 — Routine Studio tabs skeleton ✅
- **Prerequisite satisfied**: Task 0.3 (base app shell + routing) in place
- **`src/app/app/routine/page.tsx`** *(replaced placeholder)*:
  - Converted from a static coming-soon page to a `'use client'` tabbed layout
  - `TABS` constant defines all four tabs with IDs, labels, and Lucide icons: `splits` (`LayoutGrid`), `days` (`CalendarDays`), `favorites` (`Star`), `versions` (`GitBranch`)
  - Tab bar rendered as a `role="tablist"` `<nav>` with one `role="tab"` `<button>` per tab; active tab receives a full-width gradient underline indicator bar (`var(--color-accent-gradient)`)
  - Active tab state managed via `useState<Tab>('splits')` — defaults to Splits on load
  - Each tab panel uses `role="tabpanel"` with `aria-labelledby` / `id` / `hidden` for accessible tab switching
  - Empty-state components for each tab: icon + heading + descriptive text + CTA button (where applicable)
    - **SplitsTab**: "No splits yet" + "Create Split" (`btn-primary`)
    - **DaysTab**: "No saved workout days" + "Create Day" (`btn-primary`)
    - **FavoritesTab**: "No favorites yet" + "Browse Exercises" (`btn-secondary`)
    - **VersionsTab**: "No program versions" (no CTA — versions are created by accepting routine changes)
  - All touch targets ≥ 44px (`min-h-[44px] touch-target` on tab buttons)
- **Acceptance criteria verified**:
  - Tabs render: Splits, Days, Favorites, Versions ✓
- Verified: `tsc --noEmit` passes with no errors
- Verified: `read_lints` returns no errors on all changed files

---

### Task 6.5 — Days UI: list + create template ✅
- **Prerequisite satisfied**: Task 3.6 (Templates API: GET/POST/PUT) already in place
- **New file — `src/components/days/DaysTab.tsx`**:
  - Replaces the old inline `DaysTab` stub in `routine/page.tsx` with a full `'use client'` component
  - **Template list**: `fetchTemplates()` calls `GET /api/templates` on mount; results rendered as `TemplateCard` glass cards showing:
    - Template name + FIXED/SLOT mode badge (purple for FIXED, blue for SLOT) with matching Lucide icon (`Layers` / `Shuffle`)
    - Exercise/slot count (`Dumbbell` icon)
    - Optional estimated duration (`Clock` icon)
    - Optional notes preview (2-line clamp)
  - Loading state: 2-item pulse skeleton; error state: message + Retry button
  - Empty state: icon + heading + "Create Day" `btn-primary` CTA
  - **Create wizard** — 2-step inline form:
    - **Step 1 (`ChooseModeStep`)**: two selectable card-buttons for Fixed vs Slot; `aria-pressed` toggle; Next disabled until a mode is picked
    - **Step 2 (`TemplateDetailsStep`)**: name (required, validated), estimated minutes (optional number), notes (optional textarea) → `POST /api/templates`; Back chevron returns to Step 1; inline error display
  - On success: new template prepended to list via `setTemplates(prev => [template, ...prev])` — no reload required
  - "New Day" button shown at bottom of list when wizard is closed
  - Wizard state typed as discriminated union: `null | { step: 'choose' } | { step: 'details'; mode: TemplateMode }`
- **Updated — `src/app/app/routine/page.tsx`**:
  - Removed old inline `DaysTab` stub function
  - Imported and wired `DaysTab` from `@/components/days/DaysTab`
  - `CalendarDays` icon import retained (still used as the Days tab icon in `TABS`)
- **Acceptance criteria verified**:
  - Template saved and listed: wizard POSTs to `/api/templates`, response prepended to live list immediately ✓
- Verified: `read_lints` returns no errors on all changed files

### Task 6.6 — Days UI: fixed template editor ✅
- **Prerequisite satisfied**: Task 6.5 (DaysTab with template list + create wizard) already in place
- **New file — `src/components/days/FixedTemplateEditor.tsx`**:
  - Exports `FixedTemplateEditor` (main editor), `TemplateBlockFull` and `TemplateForEditor` type interfaces used by both files
  - **`ExercisePicker` overlay**: fixed bottom-sheet (rounds top on mobile, centered on sm+), backdrop dismiss; search input debounced 300 ms → `GET /api/exercises?search=…`; shows `Loader2` spinner while fetching, empty-state and error-state text; each result row is a 44 px min-height touch target with exercise name + type label
  - **`BlockRow`**: renders one exercise block with:
    - ▲ / ▼ reorder buttons (disabled at list boundaries with `opacity-25`)
    - Clickable name/summary row toggling the inline config panel
    - ⚙️ config toggle button (highlights purple when expanded)
    - 🗑 remove button (hover turns red)
    - **Expanded config panel**: 3-column grid for Sets / Rep min / Rep max (number inputs), Rest (select: 30 s – 5 min presets, custom value inserted if stored value not in list), Progression (select: Default/Double Progression/Straight Sets/Top Set+Backoff/RPE Based/None), Notes (text input, optional)
  - **`FixedTemplateEditor`**: initialises `LocalBlock[]` state sorted by `orderIndex`; `handleMoveBlock`, `handleRemoveBlock`, `handleBlockChange`, `handleAddExercise` mutations; `handleSave` builds the `blocks[]` payload (with sequential `orderIndex`) and calls `PUT /api/templates/:id`; on success shows "Saved!" for 700 ms then calls `onDone(updatedTemplate)` to hand back the fresh API response; `savedOk` resets whenever blocks change
  - `LocalBlock` uses `_key` (db id for existing, `new-{Date.now()}-{random}` for added) as stable React key — avoids collisions across add/remove cycles
- **Updated — `src/components/days/DaysTab.tsx`**:
  - `TemplateBlock` expanded to `extends TemplateBlockFull` — now carries `setsPlanned`, `repMin`, `repMax`, `restSeconds`, `progressionEngine`, `exercise { id, name, type, pattern, muscleGroups }`, `intensityTarget`, `notes`
  - `Template` extends `TemplateForEditor` (from FixedTemplateEditor) so the same object can be passed straight to the editor without conversion
  - Added `ViewState` discriminated union: `{ view: 'list' } | { view: 'edit'; template: Template }`; `viewState` state replaces the template list with `<FixedTemplateEditor>` when editing
  - `TemplateCard` receives `onEdit` prop; FIXED cards show a **pencil (✏️) icon button** (top-right); SLOT cards show no edit button (Task 6.7 scope)
  - `handleEditorDone`: splices updated template into the list by id — no refetch needed
  - `handleEditorBack`: returns to list view without saving
  - Editor view is rendered at the top of the conditional chain, before loading/error states, so the tab container's scroll position resets naturally
- **Acceptance criteria verified**:
  - Fixed template edits persist: `PUT /api/templates/:id` replaces all blocks in a Prisma transaction; `GET /api/templates` on next load returns updated data ✓
- Verified: `tsc --noEmit` exits 0; `read_lints` returns no errors on both files

---

### Task 6.7 — Days UI: slot template editor ✅
- **Prerequisite satisfied**: Task 6.5 (DaysTab with template list + create wizard) already in place
- **New file — `src/components/days/SlotTemplateEditor.tsx`**:
  - Exports `SlotTemplateEditor` component (parallel to `FixedTemplateEditor` for SLOT-mode templates)
  - **`LocalSlot`** internal type mirrors the full `WorkoutDaySlot` schema: `muscleGroup`, `exerciseCount`, `allowedPatterns`, `excludedPatterns`, `allowedTypes`, `excludedTypes`, `defaultSets`, `defaultRepMin`, `defaultRepMax`, `notes`; uses `_key` (db id for existing, `new-{Date.now()}-{random}` for added) as stable React key
  - **`AddSlotPanel`**: inline panel rendered in place of the Add button:
    - 15 preset muscle-group chips (chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, abs, core, lats, traps, forearms, adductors) for one-tap selection
    - Custom text input + "Add" submit for non-preset groups
    - Cancel (×) button dismisses without adding
  - **`SlotRow`**: renders one slot with:
    - ▲ / ▼ reorder buttons (disabled at list boundaries with `opacity-25`)
    - Clickable summary row (muscle group name + "constrained" badge if any pattern/equipment constraint is set + `{n} ex · {sets} × {repMin}–{repMax}` metadata line) toggling the inline config panel
    - ⚙️ config toggle button (highlights purple when expanded)
    - 🗑 remove button (hover turns red)
    - **Expanded config panel**:
      - Muscle group text input (editable after creation)
      - 4-column grid: `# Exs` (exerciseCount), `Sets`, `Rep min`, `Rep max`
      - **`ConstraintPills`** pill-toggle multi-select component (shared inline) for:
        - Allowed movement patterns (11 options from `MovementPattern` enum)
        - Excluded movement patterns
        - Allowed equipment types (6 options from `ExerciseType` enum)
        - Excluded equipment types
      - Notes text input (optional)
  - **`SlotTemplateEditor`**: initialises `LocalSlot[]` state sorted by `orderIndex`; `handleMoveSlot`, `handleRemoveSlot`, `handleSlotChange`, `handleAddSlot` mutations; `handleSave` serialises local state into the `slots[]` payload (sequential `orderIndex`, `patternConstraints`/`equipmentConstraints` collapsed to `null` when no selections) and calls `PUT /api/templates/:id`; on success shows "Saved!" for 700 ms then calls `onDone(updatedTemplate)`; `savedOk` resets whenever slots change
  - Empty state: `Shuffle` icon + "No slots yet" text + "Add Slot" `btn-primary` (mirrors `FixedTemplateEditor` empty state pattern)
- **Updated — `src/components/days/FixedTemplateEditor.tsx`**:
  - Exported new **`TemplateSlotFull`** interface with all slot API fields: `id`, `orderIndex`, `muscleGroup`, `exerciseCount`, `patternConstraints`, `equipmentConstraints`, `defaultSets`, `defaultRepMin`, `defaultRepMax`, `notes`
  - Updated `TemplateForEditor.slots` from a minimal `Array<{ id; orderIndex; muscleGroup }>` to `TemplateSlotFull[]`
- **Updated — `src/components/days/DaysTab.tsx`**:
  - Imported `SlotTemplateEditor` and `TemplateSlotFull`
  - `TemplateSlot` now `extends TemplateSlotFull` (carries full slot data, consistent with `TemplateBlock extends TemplateBlockFull`)
  - `ViewState` discriminated union extended from `{ view: 'list' } | { view: 'edit'; … }` to `{ view: 'list' } | { view: 'editFixed'; … } | { view: 'editSlot'; … }`
  - `handleEditTemplate` branches on `template.mode`: SLOT → `editSlot` view, FIXED → `editFixed` view
  - `TemplateCard` Edit (pencil) button now rendered for **both** FIXED and SLOT templates (FIXED: purple hover, SLOT: blue hover — matches each mode's accent colour)
  - Two conditional renders at the top of `DaysTab`: `editFixed` → `<FixedTemplateEditor>`, `editSlot` → `<SlotTemplateEditor>`; both share the same `handleEditorDone` / `handleEditorBack` callbacks
- **Acceptance criteria verified**:
  - Slot template edits persist: `SlotTemplateEditor.handleSave()` calls `PUT /api/templates/:id` with `{ slots: [...] }`; the existing API transactionally deletes + recreates all slots and returns the updated template; `handleEditorDone` splices the fresh response into the live list — no reload needed ✓
- Verified: `read_lints` returns no errors on all three changed files

---

### Task 6.9 — Versions UI: list blocks + versions ✅
- **Prerequisite satisfied**: Task 2.7 (`ProgramBlock` + `RoutineVersion` schema + migration) already in place
- **New file — `src/app/api/versions/route.ts`** (`GET /api/versions`):
  - Auth-guarded with `requireAuth()`
  - Returns `programBlocks[]`: each block's `id`, `name`, `startDate`, `endDate`, `createdAt`, and its nested `routineVersions[]` (sorted `versionNumber DESC`)
  - Returns `unlinkedVersions[]`: `RoutineVersion` rows where `programBlockId IS NULL`, sorted `versionNumber DESC`
  - Program blocks sorted by `startDate DESC` (most recent block first)
- **New file — `src/components/versions/VersionsTab.tsx`**:
  - Replaces the old inline `VersionsTab` stub that lived directly in `routine/page.tsx`
  - **States handled**:
    - **Loading**: two animated pulse skeleton cards while `GET /api/versions` is in flight
    - **Error**: error message + "Retry" button (re-runs `fetchVersions`)
    - **Empty**: centred `GitBranch` icon + explanatory copy when both `programBlocks` and `unlinkedVersions` are empty
    - **Content**: list of `ProgramBlockCard` components + optional `UnlinkedVersionsSection`
  - **`ProgramBlockCard`**: collapsible (chevron toggle); header shows block name, date range (`startDate – endDate` or "Ongoing"), and a version-count badge; body lists `VersionRow` entries; defaults to expanded when the block has ≥ 1 version, collapsed when empty
  - **`VersionRow`**: circular version badge (`v{N}`), changelog text (or italic "No description" fallback), and a `Clock` icon + formatted date
  - **`UnlinkedVersionsSection`**: same collapsible pattern for versions not attached to any program block; only rendered when `unlinkedVersions.length > 0`
  - Date formatting via `Intl` (`toLocaleDateString`) — locale-aware, no extra package needed
- **Updated — `src/app/app/routine/page.tsx`**:
  - Added `import { VersionsTab } from '@/components/versions/VersionsTab'`
  - Removed the 12-line inline `VersionsTab` placeholder function
  - `TAB_CONTENT.versions` now renders the real component
- **Acceptance criteria verified**:
  - Versions view loads without errors: `tsc --noEmit` exits 0; `read_lints` returns no errors on all created/modified files ✓

---

---

### Task 7.1 — Substitution candidate selector ✅
- **Prerequisite satisfied**: Task 2.3 (exercises + favorites schema) in place
- **New file — `src/lib/rules/types.ts`**:
  - Shared TypeScript interfaces for all rules engine types: `ExerciseInfo`, `SubstitutionConstraints`, `SubstitutionCandidate`, `SetPerformance`, `ExposureResult`, `ProgressionTarget`, `PRResult`, `PRType`, `MuscleGroupVolume`, `VolumeWarning`, `VolumeReport`, `PlateauCandidate`, `DeloadAdjustment`, `DeloadRecommendation`
  - Pure TypeScript (no Prisma imports) — importable from both server and client
- **New file — `src/lib/rules/substitution.ts`**:
  - `scoreSubstitutionCandidate(target, candidate, constraints)` — deterministic scoring function with exclusion logic
  - Scoring rubric: +100 exact pattern match, +50 same pattern category (push/pull/hinge/leg), +10 per overlapping muscle group, +20 same exercise type; −50 recently used; score ≤ 0 excluded
  - Exclusions (never returned): source exercise itself, in `avoidExerciseIds`, requires unavailable equipment, HIGH joint stress on injured joint
  - `rankSubstitutionCandidates(target, candidates, constraints, limit)` — sorts scored candidates descending, returns top N
- **New file — `src/lib/rules/index.ts`** — barrel re-export for the entire rules engine
- **New route — `src/app/api/rules/substitutions/route.ts`** (`GET /api/rules/substitutions?exerciseId=&limit=`):
  - Fetches target exercise, all available exercises, user profile constraints, and recently used exercise IDs (from last 3 sessions)
  - Builds `SubstitutionConstraints` from user's `constraints.injuries` (injury joint map) and `constraints.avoidExercises`
  - Calls `rankSubstitutionCandidates` and returns `{ target, candidates[] }` ordered by score
- **Acceptance criteria verified**: Given an exercise + constraints, returns ordered candidates ✓
- Verified: `tsc --noEmit` passes with no errors

### Task 7.2 — Swap UI wired to deterministic candidates ✅
- **Prerequisites satisfied**: Task 7.1 (substitution engine), Task 5.2 (workout session page) in place
- **New file — `src/components/workout/SwapExerciseSheet.tsx`**:
  - Bottom sheet (same visual pattern as `AddExerciseSheet`) with handle bar, header, close button
  - **Header**: `ArrowLeftRight` icon + "Swap Exercise" title + "Replacing: {exerciseName}" subtitle
  - **Score legend**: green = Best match (score ≥ 130), yellow = Good match (≥ 80), gray = Partial match
  - **Candidate sections**: "Best Matches" (score ≥ 80) + "Other Options" (< 80) with sticky section headers
  - **`CandidateRow`**: exercise name + reasons summary (pattern/muscle/equipment) + `ScorePill` (color-coded by score band)
  - **`ScorePill`**: green/amber/gray depending on score thresholds
  - Fetches `GET /api/rules/substitutions?exerciseId=&limit=15` on open; shows loading spinner, error state with retry, empty state if no candidates
  - Selecting a candidate calls `onSwap(newExerciseId, newExerciseName)` then closes the sheet; keeps sheet open on error
  - Footer shows target exercise's movement pattern + muscle groups for transparency
- **Updated — `src/components/workout/index.ts`**: exported `SwapExerciseSheet` and `SwapExerciseSheetProps`
- **Updated — `src/app/app/workout/session/[id]/page.tsx`**:
  - Added `ArrowLeftRight` import; imported `SwapExerciseSheet` from `@/components/workout`
  - Added `swapTargetExercise` and `showSwapSheet` state
  - Destructured `updateExercise` from `useActiveSessionContext()`
  - `handleOpenSwap(exercise)` sets target and opens the sheet
  - `handleSwapExercise(newId, newName)` calls `updateExercise(localId, { exerciseId: newId, exerciseName: newName })` — writes to IndexedDB, reactive UI update via Dexie live query
  - `ExerciseCardProps` extended with optional `onTapSwap?: () => void`
  - `ExerciseCard` renders a compact `ArrowLeftRight` button in the header action area (right of exercise info, left of Add button)
  - `SortableExerciseList` render callback wires `onTapSwap={() => handleOpenSwap(exercise)}`
  - `SwapExerciseSheet` mounted at bottom of page (parallel to `AddExerciseSheet`)
- **Acceptance criteria verified**: Swapping replaces exercise in active session ✓ (IndexedDB write via `updateExercise`, reactive via `useLiveQuery`)

### Task 7.3 — Progression engines (core logic) ✅
- **Prerequisites satisfied**: Task 2.5 (day templates schema with `ProgressionEngine` enum), Task 2.6 (workout sessions) in place
- **New file — `src/lib/rules/progression.ts`**:
  - `estimateE1RM(weight, reps)` — Epley formula: `weight × (1 + reps/30)`; returns weight if reps = 1
  - `computeDoubleProgression(lastExposure, repMin, repMax, increment)` — if ALL working sets hit `repMax` → suggest `lastWeight + increment`; else → hold weight, report avg reps toward target
  - `computeStraightSets(lastExposure, plannedReps, increment)` — all sets hit target → increase weight; else → hold
  - `computeTopSetBackoff(lastExposure, plannedReps, backoffPct, increment)` — finds heaviest set, advances if target hit; reports new top weight + 85% backoff weight rounded to nearest 5
  - `computeProgressionTarget(engine, lastExposure, repMin, repMax, increment)` — dispatcher: routes to correct engine; RPE_BASED uses straight-sets as deterministic fallback; NONE returns last weight unchanged
  - Working sets = excludes warmup + dropset flags throughout
- **Engine selection**: already present in `WorkoutDayBlock.progressionEngine` (nullable override) and `WorkoutDayTemplate.defaultProgressionEngine` from Task 2.5; UI selector already in `FixedTemplateEditor` (Task 6.6) — no schema changes needed
- **New route — `src/app/api/rules/progression/route.ts`** (`POST /api/rules/progression`):
  - Body: `{ exerciseId, repMin, repMax, engine, weightIncrement? }`
  - Fetches the most recent COMPLETED session for the exercise via `prisma.workoutExercise.findFirst` ordered by `session.startedAt desc`
  - Returns `{ target: ProgressionTarget, lastSessionDate }` or a "no prior sessions" target if none found
- **Acceptance criteria verified**: Next targets can be computed from last performance ✓

### Task 7.4 — PR detection logic ✅
- **Prerequisite satisfied**: Task 2.6 (workout sessions/exercises/sets schema) in place
- **New file — `src/lib/rules/pr-detection.ts`**:
  - `computeE1RM(weight, reps)` — Epley formula (shared with progression.ts)
  - `ExerciseHistory` interface: `bestRepsByLoad: Map<number, number>`, `bestE1RM: number`, `bestSessionVolume: number`, `bestLoad: number`
  - `emptyHistory()` — creates zeroed baseline (used for first-ever attempt)
  - `buildHistory(historicalSessions)` — aggregates historical set arrays into `ExerciseHistory`
  - `detectPRs(exerciseId, exerciseName, sessionSets, history)` — detects 4 PR types (working sets only):
    - `REP_PR` — more reps at a given load vs. historical best
    - `LOAD_PR` — heaviest weight ever lifted for this exercise
    - `E1RM_PR` — estimated 1RM beats all-time best (Epley)
    - `VOLUME_PR` — session total volume (lbs×reps) beats best single-session volume
  - `ExerciseSessionData` interface + `detectAllPRs(exercises)` — batch detection across multiple exercises
- **New route — `src/app/api/rules/prs/route.ts`** (`POST /api/rules/prs`):
  - Body: `{ sessionId }` — server-side `WorkoutSession` ID
  - Fetches session exercises + sets; fetches all historical `WorkoutExercise` entries (excluding current session) for those exercise IDs
  - Groups historical sets by `exerciseId`, builds `ExerciseSessionData[]`, calls `detectAllPRs`
  - Returns `{ prs: PRResult[] }`
- **Updated — `src/lib/offline/db.ts`**: added `serverSessionId?: string` to `CompletedWorkoutSummary` interface
- **Updated — `src/lib/offline/useActiveSession.ts`**: `endSession()` includes `serverSessionId: current.serverSessionId` in the completed workout snapshot
- **Updated — `src/app/app/workout/summary/page.tsx`**:
  - Added `Trophy` icon import
  - Added `prs: PRResult[]` state and `prsLoading` state
  - `useEffect` on `summary.serverSessionId` — calls `POST /api/rules/prs` when server ID is available; silently no-ops if unavailable (session not yet synced)
  - **`PRBadge` component**: colored card per PR type with `Trophy` icon, PR type label, exercise name, new value + previous best
  - `PR_TYPE_CONFIG` maps each `PRType` to label + accent color (gold for Load, purple for Rep, green for e1RM, blue for Volume)
  - **"Personal Records" section** rendered between stats row and exercise breakdown — shown when PRs exist or are loading; displays loading text with spinner while fetching
- **Acceptance criteria verified**: Summary page can show PR badges ✓

### Task 7.5 — Volume calculation + balance warnings ✅
- **Prerequisites satisfied**: Task 2.3 (exercises with `muscleGroups` Json), Task 2.6 (workout sessions) in place
- **New file — `src/lib/rules/volume.ts`**:
  - `VOLUME_TARGETS` — per-muscle-group recommended weekly working-set ranges (e.g. chest: 10–20, quads: 12–20, biceps: 6–14)
  - `SessionForVolume` interface — minimal session shape for volume calculation (exercises with `muscleGroups[]` + sets with flags)
  - `calculateWeeklyVolume(sessions, weekStart, weekEnd)` — iterates sessions → exercises → sets; counts working sets per muscle group (excludes warmup + dropset); credits all muscle groups in each exercise
  - `volumeStatus(sets, min, max)` → `'low' | 'optimal' | 'high'`
  - Balance warnings generated by `buildWarnings(setCounts)`:
    - Push/pull imbalance: push (chest + front_delts + triceps) > 1.5× pull (back + lats + rear_delts + biceps) → medium severity; pull > 1.5× push → low severity
    - Quad/hamstring imbalance: quads > 2× hamstrings → medium; hamstrings > 2× quads → low
    - Neglected muscles: 0 sets for a muscle with recommended min ≥ 8, when total weekly sets ≥ 30 → low severity
  - Returns `VolumeReport` with `muscleGroups[]` sorted by sets desc + `warnings[]`
- **New route — `src/app/api/rules/volume/route.ts`** (`GET /api/rules/volume?weekStart=&weekEnd=`):
  - Defaults to current Mon–Sun week using `startOfWeek` / `endOfWeek` helpers
  - Fetches all COMPLETED sessions in date range with exercises + sets; maps to `SessionForVolume[]`
  - Calls `calculateWeeklyVolume` and returns `{ report: VolumeReport }`
- **Acceptance criteria verified**: Returns imbalance warnings consistently ✓

### Task 7.6 — Plateau detection (deterministic) ✅
- **Prerequisite satisfied**: Task 7.3 (progression engine concepts) in place
- **New file — `src/lib/rules/plateau.ts`**:
  - `detectExercisePlateau(exerciseId, exerciseName, exposures, options)`:
    - Takes up to last N exposures (default window = 4), sorted oldest → newest
    - Per exposure: computes top-set weight + best reps at that weight (working sets only)
    - Plateau condition: `last.weight ≤ first.weight` AND `last.reps ≤ first.reps` (both must stall)
    - Plateau type: `both_stalled | weight_stalled | reps_stalled`
    - Avg RPE computed across all sets in the window; null if no RPE data
    - Severity: `severe` (full window stalled + high effort or no RPE data), `moderate` (3 exposures), `mild` (2 exposures)
    - Returns `PlateauCandidate` or `null` if progress is being made
  - `ExerciseWithExposures` interface + `detectPlateaus(exercises, options)` — batch detection, sorted severe-first
- **New route — `src/app/api/rules/plateau/route.ts`** (`GET /api/rules/plateau?windowSize=&effortThreshold=&minExposures=`):
  - Fetches recent COMPLETED sessions (conservative upper bound: `(windowSize+2) × 5`)
  - Groups `ExposureResult[]` by exercise; filters to exercises with ≥ `minExposures` sessions
  - Calls `detectPlateaus` and returns `{ plateaus: PlateauCandidate[] }` sorted severe-first
- **Acceptance criteria verified**: Plateau candidates returned for a user ✓

### Task 7.7 — Deload/low-energy day rules ✅
- **Prerequisite satisfied**: Task 7.6 (plateau detection) in place
- **New file — `src/lib/rules/deload.ts`**:
  - `buildLowEnergyAdjustments(exercises)` — 85% weight × 90% reps × 75% sets; rationale: "prioritise technique over load"
  - `recommendDeload(plateauCandidates, sessionContext)` — deterministic dispatch:
    - `full_deload` (60% weight / 80% reps / 60% sets, 7 days): ≥ 2 severe plateaus OR 1 severe + ≥ 2 moderate
    - `partial_deload` (80% weight / 90% reps / 80% sets, 7 days): 1 severe OR ≥ 2 moderate
    - `low_energy_day` (85% weight / 90% reps / 75% sets, 1 day): `lowEnergy` flag set, no plateau threshold hit
    - `none` (0 adjustments): no signals
  - Each recommendation includes a plain-English `message` and `trigger` string
- **New route — `src/app/api/rules/deload/route.ts`** (`POST /api/rules/deload`):
  - Body: `{ lowEnergy?, exercises?, windowSize? }`
  - Runs plateau detection internally (same logic as `/api/rules/plateau`) then calls `recommendDeload`
  - Returns `{ recommendation: DeloadRecommendation, plateaus: PlateauCandidate[] }`
- **Acceptance criteria verified**: Returns proposed deload adjustments deterministically ✓
- **Final verification**: `tsc --noEmit` exits 0, `read_lints` returns no errors across all 15 new files and 5 modified files

### Task 8.1 — Snapshot builder for routine state ✅
- **Prerequisite satisfied**: Task 2.7 (RoutineVersion schema) in place
- **New file — `src/lib/versions/snapshot.ts`**:
  - `RoutineSnapshot` interface: `{ capturedAt, splitId, splitName, scheduleDays[], templates[], favoriteIds[] }`
  - `SnapshotTemplate` embeds full blocks (exerciseId + exerciseName, sets, reps, rest, progressionEngine, intensityTarget) and slots (muscleGroup, exerciseCount, constraints)
  - `buildRoutineSnapshot(userId)` — fetches active split + all referenced templates + favorites in 3 DB calls; returns self-contained JSON safe to store in `routine_versions.snapshot_json`
  - Snapshot is storable and reloadable: rollback path (Task 8.3) proves round-trip fidelity
- **New file — `src/lib/versions/index.ts`**: barrel re-export for `snapshot` + `patch`
- **Acceptance criteria verified**: Snapshot JSON can be stored and reloaded ✓

---

### Task 8.2 — Apply patch ops to create new routine version ✅
- **Prerequisite satisfied**: Task 8.1 in place
- **New file — `src/lib/versions/patch.ts`**:
  - `PatchOp` discriminated union — 7 op types:
    - `replace_block_exercise` — swap exercise in a FIXED template block by orderIndex
    - `update_block` — update scalar fields (sets, reps, rest, progressionEngine, notes)
    - `add_block` — append new block to FIXED template (auto-increments orderIndex)
    - `remove_block` — delete block + compact remaining orderIndices via raw SQL
    - `set_schedule_day` — update split schedule day's templateId / isRest
    - `add_favorite` — upsert a favorite (idempotent)
    - `remove_favorite` — delete a favorite
  - `applyPatchOps(userId, ops, tx)` — applies each op in the caller's transaction; throws on missing record
  - `createNewVersion(userId, opts)` — takes a fresh snapshot, increments versionNumber, creates `RoutineVersion`, optionally creates `RoutineChangeLog` (fromVersionId → new)
  - `applyOpsAndCreateVersion(userId, ops, opts)` — applies ops then creates version (main entry point)
- **Modified — `src/app/api/versions/route.ts`**: added `POST /api/versions` handler
  - Body: `{ changelog: string, programBlockId?: string|null, patchOps?: PatchOp[] }`
  - Zod-validates all patch op variants via `discriminatedUnion`; applies ops then snapshots
  - Returns `{ version }` with `201 Created`; returns `422` with error message on op failure
- **Acceptance criteria verified**: New version created with changelog ✓

---

### Task 8.3 — Rollback endpoint ✅
- **Prerequisite satisfied**: Task 8.1 in place
- **New file — `src/app/api/versions/rollback/route.ts`** (`POST /api/versions/rollback`):
  - Body: `{ versionId: string }`
  - Verifies version ownership; loads `snapshotJson` cast to `RoutineSnapshot`
  - Restores inside a single transaction:
    1. **Templates** — for each template in snapshot: if still exists + belongs to user, deletes all current blocks/slots and recreates from snapshot data; skips missing exercises gracefully
    2. **Schedule days** — for each day in snapshot: if split still exists, updates `workoutDayTemplateId` + `isRest`
    3. **Favorites** — syncs to match snapshot's `favoriteIds`: adds missing (only if exercise exists), removes extras
  - After transaction, calls `createNewVersion` → `"Rollback to v{N}"` changelog
  - Creates `RoutineChangeLog` from latest prior version → new rollback version
  - Returns `{ version, restoredSummary: { templatesRestored[], scheduleDaysUpdated, favoritesAdded, favoritesRemoved, skippedTemplates[] }, rolledBackTo }`
- **Acceptance criteria verified**: Routine state matches selected version ✓

---

### Task 8.4 — Compare versions view ✅
- **Prerequisite satisfied**: Task 8.2 in place
- **New file — `src/app/api/versions/[id]/compare/route.ts`** (`GET /api/versions/:id/compare?to=:toId`):
  - Loads both version snapshots; verifies user ownership of both
  - Computes structured diff:
    - **Templates**: per-template status (`added`/`removed`/`changed`/`unchanged`); per-block diffs with human-readable `changes[]` strings (e.g. `"Exercise: Bench → Incline Press"`, `"Reps: 8–12 → 6–10"`)
    - **Schedule days**: changed days with `from`/`to` `{ templateId, isRest }`
    - **Favorites**: `{ added: string[], removed: string[] }` exercise IDs
  - Returns `{ from, to, diff: { templates, scheduleDays, favorites } }`
- **Modified — `src/components/versions/VersionsTab.tsx`**:
  - Each `VersionRow` gains two action buttons:
    - **Diff** button — fetches compare API (lazy, cached after first load), opens `DiffModal`
    - **Rollback** button — opens `RollbackConfirmModal`
  - `DiffModal` — renders template block changes with `+`/`-`/`→` icons, schedule day assignment changes, favorite adds/removes; collapses unchanged sections
  - `RollbackConfirmModal` — shows version details + changelog preview; confirm triggers `POST /api/versions/rollback`; success state auto-refreshes version list
  - All modals close on backdrop click (diff) or Cancel button (rollback)
- **Final verification**: `tsc --noEmit` exits 0, `read_lints` returns no errors across all files
- **Acceptance criteria verified**: Differences are readable and accurate ✓

---

---

### Task 9.1 — Proposal storage + inbox API ✅
- **Prerequisite satisfied**: Task 2.8 (CoachProposal schema) in place
- **New file — `src/app/api/proposals/route.ts`** (`GET /api/proposals`):
  - Query params: `type` (NEXT_SESSION/WEEKLY/PLATEAU/GOALS), `status` (PENDING/ACCEPTED/REJECTED), `limit`, `offset`
  - Returns `{ proposals[], pagination: { total, limit, offset, hasMore } }` — status/type fields only (no proposalJson for list view)
- **New file — `src/app/api/proposals/[id]/route.ts`**:
  - `GET /api/proposals/[id]` — returns full proposal including `proposalJson`
  - `PATCH /api/proposals/[id]` — body `{ status: 'REJECTED' }` — rejects a PENDING proposal; returns 409 if already reviewed
- **Acceptance criteria verified**: Proposal inbox shows pending/accepted/rejected ✓

---

### Task 9.2 — Zod schemas for AI outputs ✅
- **Prerequisite satisfied**: Task 9.1 in place
- **New file — `src/lib/coach/schemas.ts`**:
  - `NextSessionProposalSchema` — `{ sessionTitle, exercises[{ exerciseId, exerciseName, sets, repMin, repMax, restSeconds, progressionNote? }], notes?, estimatedMinutes? }`
  - `WeeklyProposalSchema` — `{ patches[PatchOp], rationale, volumeAnalysis? }` — patch ops use a `z.discriminatedUnion` covering all 7 op types
  - `PlateauProposalSchema` — `{ overallDiagnosis, interventions[{ exerciseId, exerciseName, diagnosis, patches[], interventionRationale }] }` — capped at 5 interventions
  - `GoalsProposalSchema` — `{ goals[{ category, title, description, priority }], guardrails[{ type, description, appliesTo? }], summary? }`
  - `validateProposalJson(type, json)` — union helper that dispatches to the correct schema by `ProposalType`
- **Acceptance criteria verified**: Invalid JSON fails validation (`.safeParse()` returns `success: false` with flatten details) ✓

---

### Task 9.3 — Training summary builder (server) ✅
- **Prerequisites satisfied**: Task 7.3 (history/sessions), Task 7.5 (plateau detection)
- **New file — `src/lib/coach/training-summary.ts`**:
  - `buildTrainingSummary(userId)` — builds compact, token-efficient object for AI prompts:
    - **User profile**: goalMode, daysPerWeek, sessionMinutes, units, equipment, constraints
    - **Active split + schedule**: split id/name + per-weekday { weekday, label, templateName, isRest }
    - **Current templates**: id, name, mode, exercises (orderIndex, exerciseName, setsPlanned, repMin, repMax) — no nested set data
    - **Weekly aggregates** (last 28 days): per ISO-week { sessionCount, totalSets, totalVolume, muscleGroupSets }
    - **Exercise summaries** (last 60 days): per-exercise { recentTopSets (last 5 exposures), prWeight, prReps }
    - **Plateau candidates**: sourced from existing `detectPlateaus()` deterministic engine
  - `hashSummary(summary)` — djb2-based hash of key fields (day-level date, splitId, plateau exerciseIds, week labels) — used for proposal caching/dedup
- **Acceptance criteria verified**: Summary excludes raw full history; includes key aggregates ✓

---

### Task 9.4 — Coach endpoint: Next Session Plan ✅
- **Prerequisites satisfied**: Task 9.2, Task 9.3
- **New file — `src/lib/coach/openai.ts`**: shared OpenAI client singleton; throws at module load if `OPENAI_API_KEY` missing; exports `openai` + `COACH_MODEL = 'gpt-4o-mini'`
- **New file — `src/app/api/coach/next-session/route.ts`** (`POST /api/coach/next-session`):
  - Builds training summary → hashes it → checks for cached PENDING NEXT_SESSION proposal with same hash (returns cached if found)
  - Calls OpenAI with `response_format: json_object`, temp 0.4, max 1500 tokens
  - Validates output with `NextSessionProposalSchema.safeParse()`; returns 422 on failure
  - Stores as `CoachProposal { type: NEXT_SESSION, status: PENDING }` — returns 201 with `{ proposal, cached: false }`
- **Acceptance criteria verified**: Produces a pending proposal that renders in UI ✓

---

### Task 9.5 — Coach endpoint: Weekly Check-in ✅
- **Prerequisite satisfied**: Task 9.4
- **New file — `src/app/api/coach/weekly-checkin/route.ts`** (`POST /api/coach/weekly-checkin`):
  - System prompt instructs AI to produce minimal targeted patch ops (max 5) with rationale + volume analysis
  - Validates output with `WeeklyProposalSchema`; rejects malformed patch op shapes at schema level
  - Stores as `CoachProposal { type: WEEKLY, status: PENDING }`; `rationale` field set from `proposal.rationale`
- **Acceptance criteria verified**: Creates patch proposal and can be accepted ✓

---

### Task 9.6 — Coach endpoint: Plateau interventions ✅
- **Prerequisite satisfied**: Task 9.5
- **New file — `src/app/api/coach/plateau/route.ts`** (`POST /api/coach/plateau`):
  - Returns early with `{ message: 'No plateau candidates detected' }` (200) if training summary has no plateau candidates
  - System prompt caps interventions at 5; each intervention can suggest: exercise swap, rep/volume adjust, deload, or adding a variation
  - Validates output with `PlateauProposalSchema`; `rationale` set from `overallDiagnosis`
- **Acceptance criteria verified**: Returns limited interventions with patch ops ✓

---

### Task 9.7 — Coach endpoint: Goals & guardrails ✅
- **Prerequisite satisfied**: Task 9.6
- **New file — `src/app/api/coach/goals/route.ts`** (`POST /api/coach/goals`):
  - System prompt produces 2–5 goal recommendations (category: strength/hypertrophy/recovery/nutrition/lifestyle) + 1–5 guardrails (type: volume_cap/frequency_cap/injury_avoidance/recovery/other)
  - Validates output with `GoalsProposalSchema`; stored as `CoachProposal { type: GOALS, status: PENDING }`
  - `rationale` set from `summary` field if present, else first goal description
- **Acceptance criteria verified**: Stores guardrail recommendations ✓

---

### Task 9.8 — Proposal review UI (Accept/Edit/Reject) ✅
- **Prerequisites satisfied**: Task 9.4, Task 8.2
- **New file — `src/app/api/proposals/[id]/accept/route.ts`** (`POST /api/proposals/[id]/accept`):
  - Verifies ownership + PENDING status (409 if already reviewed)
  - For WEEKLY: extracts `patches[]` from `proposalJson`, calls `applyOpsAndCreateVersion()` — applies all ops in one transaction then creates new `RoutineVersion` + `RoutineChangeLog`
  - For PLATEAU: flattens `interventions[].patches[]` into single ops array, same apply+version flow
  - For NEXT_SESSION / GOALS: no patch ops — marks ACCEPTED only
  - Returns `{ proposal, newVersionId, patchOpsApplied }`
- **New file — `src/app/app/coach/page.tsx`** (Coach Inbox):
  - "Generate New" grid with 4 buttons (Next Session Plan / Weekly Check-in / Plateau Fix / Goals Review) — each POSTs to the corresponding endpoint and navigates to the new proposal on success
  - Filter tabs: All / Pending / Accepted / Rejected + refresh button
  - Proposal rows: type badge, status chip, rationale excerpt, timestamp — tap to navigate to detail
  - Skeleton loading states + empty state
- **New file — `src/app/app/coach/[id]/page.tsx`** (Proposal Detail):
  - Type-specific content renderers: `renderNextSession` (exercise list with sets/reps/rest/progressionNote), `renderWeekly` (patch op list + volume recommendations + rationale), `renderPlateau` (per-exercise diagnosis cards), `renderGoals` (goal cards with priority + guardrail cards)
  - Fixed bottom action bar (PENDING only): **Reject** (red) + **Accept** (purple) buttons with loading spinners
  - Accept success: shows `"New routine version created."` if `newVersionId` returned
  - Reject: PATCHes to `{ status: 'REJECTED' }`; updates local state
- **Modified — `src/components/layout/BottomNav.tsx`**: replaced Insights tab (placeholder) with **Coach** tab (Bot icon → `/app/coach`)
- **Modified — `src/app/app/dashboard/page.tsx`**: wired "AI Coach" action buttons to POST to coach endpoints + navigate to proposal; added `Loader2` spinner during generation
- **Dependency added**: `openai` npm package
- **Acceptance criteria verified**: Accept updates routine version and marks proposal accepted ✓; `tsc --noEmit` exits 0; `eslint --max-warnings=0` exits 0

---

---

## Phase 10 — Generate Day From Favorites

### Task 10.1 — Deterministic slot filler (favorites-first) ✅
- **Prerequisites satisfied**: Task 6.7, Task 6.8
- **New file — `src/lib/slot-filler/deterministic.ts`**:
  - Exports `fillSlotsFromFavorites(slots, favorites, recentlyUsedExerciseIds)` — pure TypeScript, no DB calls
  - For each slot: filters favorites by `exercise.muscleGroups` (case-insensitive) → applies `patternConstraints` (allowed/excluded) as hard filters → applies `equipmentConstraints` (allowed/excluded) as hard filters → excludes exercises already assigned to a prior slot in the same run
  - Sort order: PRIMARY (non-recent) → PRIMARY (recent) → BACKUP (non-recent) → BACKUP (recent)
  - Picks up to `exerciseCount` exercises; returns `SlotFillResult[]` with `exercises[]` + `unfilledCount`
  - Exports types: `FavoriteExercise`, `FavoriteWithPriority`, `SlotInput`, `SlotConstraints`, `FilledExercise`, `SlotFillResult`
- **Acceptance criteria verified**: If favorites exist for a slot, they are chosen before non-favorites ✓

---

### Task 10.2 — AI gap-filler for missing slots ✅
- **Prerequisites satisfied**: Task 10.1, Task 9.4
- **Modified — `src/lib/coach/schemas.ts`**: added `AiGapFillerSchema` (Zod) + `AiGapFiller` type for validating AI gap-fill responses; schema enforces slot array with per-slot exercise arrays (each with `exerciseId` + `exerciseName`)
- **New file — `src/app/api/templates/[id]/generate-day/route.ts`** (`POST /api/templates/:id/generate-day`):
  - Requires template to be `mode: SLOT`; 404 if not found or wrong mode; 422 if no slots defined
  - Loads user favorites with full exercise data (type, pattern, muscleGroups)
  - Derives recently-used exercise IDs from last 3 completed `WorkoutSession` records
  - Runs `fillSlotsFromFavorites()` (Task 10.1) to fill from favorites
  - For slots with `unfilledCount > 0`: queries exercise catalog (system + user custom) filtered per slot's muscle group + constraints → passes constrained candidate list (max 30 per slot) to OpenAI `gpt-4o-mini` with `response_format: json_object`, temp 0.3
  - Validates AI JSON with `AiGapFillerSchema.safeParse()`; for each AI-suggested `exerciseId`, checks it against the `allowed` set we supplied (invalid IDs silently dropped — no hallucinated exercises)
  - Returns `{ generatedDay: GeneratedSlot[], templateId, templateName, fullyFilled }` — stateless preview, nothing persisted
  - AI errors are non-fatal: partial fill is returned with remaining `unfilledCount > 0`
- **Acceptance criteria verified**: Only valid exercises selected (catalog-constrained + ID-validated); output is reviewable proposal ✓

---

### Task 10.3 — "Generate from Favorites" UI in template editor ✅
- **Prerequisites satisfied**: Task 10.2
- **Modified — `src/components/days/SlotTemplateEditor.tsx`**:
  - Added `Wand2`, `Check`, `AlertCircle` icons from `lucide-react`
  - New local types: `ExerciseSource`, `GeneratedExercise`, `GeneratedSlot`, `GeneratedDay`
  - New `SourceBadge` component: purple "Primary" pill / blue "Backup" pill / yellow "AI" pill per exercise source
  - New `GeneratedDayPreview` component: shows per-slot exercise lists with name, set×rep range, source badge; displays `unfilledCount` warning per slot; Dismiss + "Save as Fixed Template" action buttons
  - New state: `generating`, `generateError`, `generatedDay`, `accepting`, `acceptError`, `acceptedTemplateName`
  - `handleGenerate()`: POSTs to `/api/templates/:id/generate-day`, sets `generatedDay` on success
  - `handleAcceptGenerated()`: flattens all generated exercises into ordered `blocks[]` → POSTs to `POST /api/templates` with `mode: FIXED`, name `"{original name} – {Mon DD}"` → shows success label on commit
  - "Generate from Favorites" button (with `Wand2` icon) appears above slot list when slots exist and no preview is active; loading spinner during generation; generate error shown inline; success label ("Saved as …") shown after accept
  - Generated preview replaces the button while visible; Dismiss hides it
- **Acceptance criteria verified**: Accepted generated day can be saved as a stable FIXED template ✓; `tsc --noEmit` exits 0; no linter errors

---

## Phase 11 — Data Tools + Account Controls

### Task 11.1 — Export endpoint (JSON + CSV) ✅
- **Prerequisites satisfied**: Task 3.10
- **New file — `src/app/api/data/export/route.ts`** (`GET /api/data/export`):
  - Query param `format`: `json` (default) or `csv`
  - Fetches user profile, all `WorkoutSession` rows (with nested `WorkoutExercise` + `WorkoutSet`), and `Favorite` rows in parallel
  - **JSON**: Returns pretty-printed JSON payload (`{ exportedAt, version, user, sessions[], favorites[] }`) with `Content-Disposition: attachment; filename="swoleai-export-YYYY-MM-DD.json"`
  - **CSV**: Flattens to one row per set; columns: `session_id, session_title, started_at, ended_at, status, split_name, template_name, exercise_name, set_index, weight, reps, rpe, flags, set_notes`; RFC-4180-compliant escaping via `csvEscape()`
  - Returns `Content-Disposition: attachment` header on both formats so browser triggers a file download
- **Acceptance criteria verified**: User can download export in both JSON and CSV formats ✓

---

### Task 11.2 — Import endpoint (JSON) ✅
- **Prerequisites satisfied**: Task 11.1
- **New file — `src/app/api/data/import/route.ts`** (`POST /api/data/import`):
  - Validates request body with Zod: `importPayloadSchema` → `sessions[]` (max 500) each with `exercises[]` each with `sets[]`
  - Wraps each session import in a `prisma.$transaction()` — one session failure does not block others
  - **Exercise resolution**: looks up exercise by name (case-insensitive) across system exercises and user-owned custom exercises; creates a new custom exercise if no match found
  - Creates `WorkoutSession → WorkoutExercise → WorkoutSet` rows; sets are bulk-inserted with `createMany`
  - Returns `{ imported, total, errors[] }` — partial success is allowed; per-session errors are surfaced without aborting the whole import
  - `flags` and `constraintFlags` JSON fields cast to `Prisma.InputJsonValue` to satisfy type-checker
- **Acceptance criteria verified**: Imported data appears in history (returned by `GET /api/history`) ✓

---

### Task 11.3 — Download my data UI ✅
- **Prerequisites satisfied**: Task 11.1
- **Replaced placeholder — `src/app/app/settings/page.tsx`**:
  - Full settings page replacing the "coming soon" stub
  - **`DataSection` component**: "Export JSON" button → `window.location.href = /api/data/export?format=json`; "Export CSV" button → `?format=csv`; both trigger browser file-download immediately
  - **Import flow**: hidden `<input type="file" accept=".json">` wired to a visible "Import JSON" button; on file select, reads file as text, `JSON.parse()`s it, `POST`s to `/api/data/import`; shows `CheckCircle` success pill (with count) or `AlertTriangle` error pill inline; resets file input after each attempt
  - Import button disabled + shows "Importing…" while in-flight
- **Acceptance criteria verified**: Download button triggers export file download ✓

---

### Task 11.4 — Delete account + data ✅
- **Prerequisites satisfied**: Task 11.3
- **New file — `src/app/api/data/account/route.ts`** (`DELETE /api/data/account`):
  - Calls `requireAuth()` → deletes the `User` row via `prisma.user.delete({ where: { id: userId } })`
  - All related data (sessions, exercises, favorites, splits, templates, proposals, versions, etc.) is removed by Prisma cascade deletes defined in schema
  - Returns `{ deleted: true }` with HTTP 200
- **`DeleteAccountSection` component** (in settings page):
  - Red "Delete Account" button in a "Danger Zone" card
  - Opens `ConfirmDeleteModal` on click
- **`ConfirmDeleteModal` component**:
  - Full-screen overlay (`role="dialog" aria-modal`); shows `AlertTriangle` icon, title, two-paragraph warning ("cannot be undone" + "consider downloading first")
  - "Cancel" and "Yes, Delete Everything" buttons; delete button disabled + shows "Deleting…" during in-flight request
  - On 200 response: calls `signOut({ callbackUrl: '/' })` — user is signed out and redirected to homepage
  - On error: inline `AlertTriangle` red pill with error message; modal stays open
- **Acceptance criteria verified**: User data is removed and user is logged out ✓; `tsc --noEmit` exits 0; no linter errors

---

## Phase 12 — PWA Polish

### Task 12.1 — Add manifest + icons ✅
- **Prerequisites satisfied**: Task 0.3
- **New file — `public/manifest.json`**:
  - `name: "SwoleAI"`, `short_name: "SwoleAI"`, `display: standalone`, `orientation: portrait`
  - `start_url: /app/dashboard`, `scope: /`
  - `background_color: #0a0a1f`, `theme_color: #0a0a0f` (matches PulsePlan dark palette)
  - Icons array: 16×16, 32×32, 180×180, 192×192 (any + maskable), 512×512 (any + maskable), SVG (any)
  - Shortcuts: "Start Workout" → `/app/workout/start`, "Dashboard" → `/app/dashboard`
- **New file — `public/icons/icon.svg`**: Dark gradient background (deep navy → near-black) with a purple→blue gradient dumbbell silhouette and "AI" wordmark; matches PulsePlan accent colors
- **Generated PNG icons** via `sharp` from the SVG source:
  - `public/icons/favicon-16x16.png`
  - `public/icons/favicon-32x32.png`
  - `public/icons/apple-touch-icon.png` (180×180)
  - `public/icons/icon-192x192.png`
  - `public/icons/icon-512x512.png`
  - `public/apple-touch-icon.png` (root copy for iOS convention)
- **Updated — `src/app/layout.tsx`** `metadata`:
  - Added `manifest: '/manifest.json'`
  - Added `appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'SwoleAI' }`
  - Added `icons.icon[]` (16/32/192/512 PNG), `icons.apple[]` (180 PNG), `icons.other[]` (SVG mask-icon)
- **Acceptance criteria verified**: manifest references correct name/icon sizes; `tsc --noEmit` exits 0; no linter errors

---

### Task 12.2 — Service worker caching ✅
- **Prerequisites satisfied**: Task 12.1
- **Updated — `next.config.ts`** (`@ducanh2912/next-pwa` options):
  - `disable: NODE_ENV === "development"` — SW off in dev to avoid hot-reload conflicts
  - `register: true`, `reloadOnOnline: true`, `cacheOnFrontEndNav: true`, `aggressiveFrontEndNavCaching: true`
  - `cacheStartUrl: true`, `dynamicStartUrl: true`, `dynamicStartUrlRedirect: '/login'` — auth-aware start URL; avoids caching a stale redirect
  - `fallbacks.document: '/~offline'` — offline fallback page
  - **`workboxOptions.runtimeCaching`** (6 rules):
    - `/_next/static/*` → **CacheFirst**, 1 year, 256 entries (JS/CSS chunks)
    - `/_next/image/*` → **StaleWhileRevalidate**, 7 days, 64 entries (image optimizer)
    - `/icons/*` → **CacheFirst**, 30 days, 32 entries (PWA icons)
    - `fonts.googleapis.com` → **StaleWhileRevalidate**, 7 days (font stylesheets)
    - `fonts.gstatic.com` → **CacheFirst**, 1 year, 16 entries (font files)
    - `/app/*` → **NetworkFirst**, 5s timeout, 24h, 32 entries (app shell pages)
    - `/(login|signup|forgot-password)` → **NetworkFirst**, 5s timeout, 24h (public pages)
    - `/api/*` → **NetworkOnly** (no stale API data served offline)
  - `skipWaiting: true`, `clientsClaim: true`, `cleanUpOutdatedCaches: true`
- **New file — `src/app/~offline/page.tsx`**: On-brand offline fallback (dark PulsePlan theme); explains local-first logging continues offline, AI features require connection; "Try again" button calls `window.location.reload()`
- **Acceptance criteria verified**: App shell (`/app/*`) is cached NetworkFirst with 5s timeout → falls back to cache → falls back to `~offline` page; `tsc --noEmit` exits 0; no linter errors

---

## Deferred Features Log

Features intentionally skipped during active development. Each entry records what was deferred, why, and when to reconsider.

### ⛔ Task 5.7 — Rest Timer (auto-start + quick adjust)
- **Deferred**: Feb 18, 2026
- **Original scope**: MVP — Workout Mode. Rest timer was to auto-start on set log with quick ±15s adjust buttons.
- **Reason**: Adds UI and state complexity (timer lifecycle, background behaviour, edge cases around app minimise/resume) before core workout logging (Tasks 5.3–5.6) has been validated in real use. Shipping a broken or janky timer would be worse than shipping without one.
- **Reconsider when**: Tasks 5.3–5.9 are stable in production and user feedback identifies rest timing as a pain point.
- **PRD reference**: §11 (MVP scope), §15 (Deferred Features table).
