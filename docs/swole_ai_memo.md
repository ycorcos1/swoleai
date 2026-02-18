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
