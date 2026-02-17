# TASK_LIST.md — SwoleAI (Granular, Cursor-Friendly)

> Rules
- Each task focuses on **one thing**.
- Every task has **Prerequisites**, **Subtasks**, and **Acceptance Criteria**.
- Assume **Neon DB + OpenAI API key are already configured**.
- Create `.env.example` early.
- **Do not update MEMO.md automatically.** After a task is completed, MEMO.md will be updated only when you (the human) explicitly say: **“Update memo for Task X”** right before starting the next task.

---

## Phase 0 — Project Foundations

### Task 0.1 — Add `.env.example`
**Prerequisites**: Repo exists.

**Subtasks**
- Add `.env.example` at repo root.
- Include required keys (no real secrets):
  - `DATABASE_URL=`
  - `NEXTAUTH_SECRET=`
  - `NEXTAUTH_URL=`
  - `OPENAI_API_KEY=`
  - optional: `SENTRY_DSN=`
  - optional: `UPSTASH_REDIS_REST_URL=` + `UPSTASH_REDIS_REST_TOKEN=`
- Ensure `.env` remains gitignored.

**Acceptance Criteria**
- `.env.example` exists and matches TECH_STACK required env vars.

---

### Task 0.2 — Add base dependencies (frontend + backend)
**Prerequisites**: Task 0.1.

**Subtasks**
- Install core deps:
  - Next.js + TypeScript
  - Tailwind
  - Prisma + `@prisma/client`
  - Auth.js/NextAuth
  - Zod
  - TanStack Query
  - Dexie
  - Lucide
  - `next-pwa` (or equivalent)
- Add minimal scripts (dev/build/lint/format if used).

**Acceptance Criteria**
- `npm run dev` starts successfully.
- Dependencies are committed.

---

### Task 0.3 — Create App Shell layout (PulsePlan baseline)
**Prerequisites**: Task 0.2.

**Subtasks**
- Create `/app` layout with PulsePlan base styling (dark-first, glass cards).
- Add `AppShell` component scaffolding.
- Add mobile bottom nav placeholders (Dashboard/Workout/Routine/Insights/Settings).

**Acceptance Criteria**
- App loads with base layout and nav visible on `/app/dashboard`.

---

## Phase 1 — Auth + Route Protection

### Task 1.1 — Create public pages: Homepage
**Prerequisites**: Task 0.3.

**Subtasks**
- Build `/` homepage with CTA buttons to login/signup.

**Acceptance Criteria**
- Homepage renders and routes to `/login` and `/signup`.

---

### Task 1.2 — Create public pages: Login
**Prerequisites**: Task 1.1.

**Subtasks**
- Build `/login` UI (email/password, forgot password link).
- Add client-side validation.

**Acceptance Criteria**
- Login page renders with validation errors shown correctly.

---

### Task 1.3 — Create public pages: Signup
**Prerequisites**: Task 1.2.

**Subtasks**
- Build `/signup` UI (email/password/confirm).
- Add client-side validation.

**Acceptance Criteria**
- Signup page renders with validation errors shown correctly.

---

### Task 1.4 — Create public pages: Forgot Password (UI only)
**Prerequisites**: Task 1.3.

**Subtasks**
- Build `/forgot-password` UI with email input.

**Acceptance Criteria**
- Forgot password page renders.

---

### Task 1.5 — Configure Auth.js/NextAuth (server)
**Prerequisites**: Task 1.3, Task 0.1.

**Subtasks**
- Add NextAuth route handler.
- Configure provider strategy (Credentials or Magic Link) per TECH_STACK.
- Store session strategy consistently.

**Acceptance Criteria**
- User can sign up and log in successfully.
- Session persists across refresh.

---

### Task 1.6 — Add auth middleware to protect `/app/*`
**Prerequisites**: Task 1.5.

**Subtasks**
- Add middleware that redirects unauthenticated users to `/login`.

**Acceptance Criteria**
- Visiting `/app/dashboard` while logged out redirects to `/login`.

---

## Phase 2 — Database + Core Schema (Neon + Prisma)

### Task 2.1 — Initialize Prisma + connect to Neon
**Prerequisites**: Task 0.1, Task 1.5.

**Subtasks**
- Create `prisma/schema.prisma`.
- Configure `DATABASE_URL`.
- Add first migration.

**Acceptance Criteria**
- `prisma migrate dev` succeeds.

---

### Task 2.2 — Add core tables: users + profile fields
**Prerequisites**: Task 2.1.

**Subtasks**
- Add `User` model (id, email, timestamps).
- Add profile fields required by PRD (goal, days/week, session minutes, units, equipment, constraints JSON).

**Acceptance Criteria**
- Migration runs.
- Profile fields exist in DB.

---

### Task 2.3 — Add exercises + favorites schema
**Prerequisites**: Task 2.2.

**Subtasks**
- Add `Exercise` model with tags (muscle groups, pattern, equipment tags, stress flags).
- Add `Favorite` model (userId+exerciseId unique).

**Acceptance Criteria**
- Migration runs.
- Unique favorite constraint enforced.

---

### Task 2.4 — Add splits + split schedule schema
**Prerequisites**: Task 2.3.

**Subtasks**
- Add `Split` model.
- Add `SplitScheduleDay` model mapping weekday → template/rest.

**Acceptance Criteria**
- One active split per user can be enforced (DB or app-level).

---

### Task 2.5 — Add day templates schema (fixed + slot)
**Prerequisites**: Task 2.4.

**Subtasks**
- Add `WorkoutDayTemplate` model.
- Add `WorkoutDayBlock` (fixed mode).
- Add `WorkoutDaySlot` (slot mode).

**Acceptance Criteria**
- Migration runs.
- Template can represent both modes.

---

### Task 2.6 — Add workouts schema (sessions/exercises/sets)
**Prerequisites**: Task 2.5.

**Subtasks**
- Add `WorkoutSession`, `WorkoutExercise`, `WorkoutSet` models.
- Include set flags JSON.

**Acceptance Criteria**
- Migration runs.
- Set flags persist.

---

### Task 2.7 — Add versioning schema (program blocks + versions)
**Prerequisites**: Task 2.6.

**Subtasks**
- Add `ProgramBlock` + `RoutineVersion`.
- Add `RoutineChangeLog`.

**Acceptance Criteria**
- Migration runs.
- Version snapshot JSON field exists.

---

### Task 2.8 — Add coach proposals schema
**Prerequisites**: Task 2.7.

**Subtasks**
- Add `CoachProposal` model (type, status, proposal JSON, hash).

**Acceptance Criteria**
- Migration runs.

---

## Phase 3 — API: Core CRUD (No AI Yet)

### Task 3.1 — API auth guard helper
**Prerequisites**: Task 1.6.

**Subtasks**
- Implement a server helper to require session + return userId.

**Acceptance Criteria**
- Any API route can reliably get authenticated userId.

---

### Task 3.2 — Exercises API: list + create custom
**Prerequisites**: Task 3.1, Task 2.3.

**Subtasks**
- `GET /api/exercises`
- `POST /api/exercises` (custom exercises)

**Acceptance Criteria**
- User can list exercises.
- User can create a custom exercise.

---

### Task 3.3 — Favorites API: toggle
**Prerequisites**: Task 3.2.

**Subtasks**
- `POST /api/favorites/:exerciseId` toggle

**Acceptance Criteria**
- Favoriting is idempotent and reflects correct state.

---

### Task 3.4 — Splits API: create/list/update
**Prerequisites**: Task 2.4, Task 3.1.

**Subtasks**
- `GET /api/splits`
- `POST /api/splits`
- `PUT /api/splits/:id`

**Acceptance Criteria**
- CRUD works scoped to user.

---

### Task 3.5 — Splits API: activate split
**Prerequisites**: Task 3.4.

**Subtasks**
- `POST /api/splits/:id/activate`
- Ensure only one active split.

**Acceptance Criteria**
- Activating one split deactivates the prior active split.

---

### Task 3.6 — Templates API: create/list/update
**Prerequisites**: Task 2.5, Task 3.1.

**Subtasks**
- `GET /api/templates`
- `POST /api/templates`
- `PUT /api/templates/:id`

**Acceptance Criteria**
- Supports fixed + slot mode payloads.

---

### Task 3.7 — Workouts API: start session
**Prerequisites**: Task 2.6, Task 3.1.

**Subtasks**
- `POST /api/workouts/start` (splitId/templateId optional)

**Acceptance Criteria**
- Returns sessionId.

---

### Task 3.8 — Workouts API: log set
**Prerequisites**: Task 3.7.

**Subtasks**
- `POST /api/workouts/:id/log-set`
- Create workout_exercise if missing.

**Acceptance Criteria**
- Sets append correctly and preserve flags.

---

### Task 3.9 — Workouts API: end session
**Prerequisites**: Task 3.8.

**Subtasks**
- `POST /api/workouts/:id/end`

**Acceptance Criteria**
- Session end time recorded.

---

### Task 3.10 — History API: list sessions
**Prerequisites**: Task 3.9.

**Subtasks**
- `GET /api/history` with date range

**Acceptance Criteria**
- Returns sessions sorted by date.

---

## Phase 4 — Client Offline Store + Sync

### Task 4.1 — Add IndexedDB schema (Dexie)
**Prerequisites**: Task 0.2.

**Subtasks**
- Create local DB with tables:
  - activeSession
  - setEvents
  - pendingMutations

**Acceptance Criteria**
- Local DB initializes without errors.

---

### Task 4.2 — Active session persistence (continue workout)
**Prerequisites**: Task 4.1.

**Subtasks**
- Save active session state to IndexedDB.
- Restore on app reload.

**Acceptance Criteria**
- User can resume workout after reload.

---

### Task 4.3 — Mutation queue (push)
**Prerequisites**: Task 4.2.

**Subtasks**
- Add queue for pending mutations.
- Background flush when online.

**Acceptance Criteria**
- Offline set logs sync when network returns.

---

### Task 4.4 — Sync status pill
**Prerequisites**: Task 4.3.

**Subtasks**
- Compute synced/pending/offline/error status.
- Display global pill.

**Acceptance Criteria**
- UI reflects offline and pending states.

---

## Phase 5 — Workout Mode UI (Usability First)

### Task 5.1 — Workout Start screen
**Prerequisites**: Task 3.7, Task 0.3.

**Subtasks**
- Build `/app/workout/start`.
- Show scheduled day + templates list + freestyle.

**Acceptance Criteria**
- Starting creates a session and routes to Workout Mode.

---

### Task 5.2 — Workout Mode screen skeleton
**Prerequisites**: Task 5.1.

**Subtasks**
- Build `/app/workout/session/:id`.
- Render exercise cards list.
- Add bottom bar: Add Exercise, Timer, End Workout.

**Acceptance Criteria**
- Screen renders and is usable on mobile.

---

### Task 5.3 — Set Logger sheet (log set)
**Prerequisites**: Task 5.2.

**Subtasks**
- Implement set logger modal.
- Big steppers for weight/reps.
- Log set writes to IndexedDB and queues sync.

**Acceptance Criteria**
- Logging a set updates UI immediately and persists locally.

---

### Task 5.4 — Edit set
**Prerequisites**: Task 5.3.

**Subtasks**
- Allow editing a previously logged set.

**Acceptance Criteria**
- Edited set is persisted and reflected after reload.

---

### Task 5.5 — Undo last action
**Prerequisites**: Task 5.3.

**Subtasks**
- Implement undo stack for last logged set action.

**Acceptance Criteria**
- Undo restores prior state safely.

---

### Task 5.6 — Set flags
**Prerequisites**: Task 5.3.

**Subtasks**
- Add flag toggles: warmup/backoff/drop/failure.

**Acceptance Criteria**
- Flags are saved and displayed.

---

### Task 5.7 — Rest timer (auto-start + quick adjust)
**Prerequisites**: Task 5.3.

**Subtasks**
- Implement rest timer component.
- Auto-start on set log.
- Quick adjust buttons.

**Acceptance Criteria**
- Timer starts after logging and can be adjusted.

---

### Task 5.8 — Add exercise mid-workout
**Prerequisites**: Task 5.2.

**Subtasks**
- Add exercise search.
- Favorites pinned to top.

**Acceptance Criteria**
- User can add and log sets for the new exercise.

---

### Task 5.9 — Reorder exercises
**Prerequisites**: Task 5.2.

**Subtasks**
- Drag/drop reorder.

**Acceptance Criteria**
- Order persists in active session.

---

### Task 5.10 — End workout + summary screen
**Prerequisites**: Task 5.3.

**Subtasks**
- End workout action.
- Build summary page.

**Acceptance Criteria**
- Ending records end time and shows summary.

---

## Phase 6 — Routine Studio UI (Splits/Days/Favorites/Versions)

### Task 6.1 — Routine Studio tabs skeleton
**Prerequisites**: Task 0.3.

**Subtasks**
- Build `/app/routine` tabbed UI.

**Acceptance Criteria**
- Tabs render: Splits, Days, Favorites, Versions.

---

### Task 6.2 — Splits UI: list + create
**Prerequisites**: Task 3.4.

**Subtasks**
- List splits.
- Create split form.

**Acceptance Criteria**
- Split can be created and appears in list.

---

### Task 6.3 — Splits UI: schedule editor
**Prerequisites**: Task 6.2.

**Subtasks**
- Weekday mapping UI.

**Acceptance Criteria**
- Schedule saves and reloads.

---

### Task 6.4 — Splits UI: activate
**Prerequisites**: Task 3.5.

**Subtasks**
- Activate button with confirmation.

**Acceptance Criteria**
- Activated split updates Dashboard “Today”.

---

### Task 6.5 — Days UI: list + create template
**Prerequisites**: Task 3.6.

**Subtasks**
- List templates.
- Create template wizard (choose fixed vs slot).

**Acceptance Criteria**
- Template saved and listed.

---

### Task 6.6 — Days UI: fixed template editor
**Prerequisites**: Task 6.5.

**Subtasks**
- Add/reorder blocks.
- Configure sets/rep range/rest/progression.

**Acceptance Criteria**
- Fixed template edits persist.

---

### Task 6.7 — Days UI: slot template editor
**Prerequisites**: Task 6.5.

**Subtasks**
- Define muscle group counts and optional constraints.

**Acceptance Criteria**
- Slot template edits persist.

---

### Task 6.8 — Favorites UI: list + toggle
**Prerequisites**: Task 3.3.

**Subtasks**
- Favorites grouped view.
- Toggle primary/backup.

**Acceptance Criteria**
- Favorites update persists.

---

### Task 6.9 — Versions UI: list blocks + versions
**Prerequisites**: Task 2.7.

**Subtasks**
- Render program blocks and versions list.

**Acceptance Criteria**
- Versions view loads without errors.

---

## Phase 7 — Deterministic Rules Engine

### Task 7.1 — Implement substitution candidate selector
**Prerequisites**: Task 2.3.

**Subtasks**
- Build scoring function based on tags and constraints.

**Acceptance Criteria**
- Given an exercise + constraints, returns ordered candidates.

---

### Task 7.2 — Add Swap UI wired to deterministic candidates
**Prerequisites**: Task 7.1, Task 5.2.

**Subtasks**
- Swap sheet shows candidate list.

**Acceptance Criteria**
- Swapping replaces exercise in active session.

---

### Task 7.3 — Implement progression engines (core logic)
**Prerequisites**: Task 2.5, Task 2.6.

**Subtasks**
- Implement double progression.
- Add engine selection field to template blocks.

**Acceptance Criteria**
- Next targets can be computed from last performance.

---

### Task 7.4 — PR detection logic
**Prerequisites**: Task 2.6.

**Subtasks**
- Compute PR types from session sets.

**Acceptance Criteria**
- Summary page can show PR badges.

---

### Task 7.5 — Volume calculation + balance warnings
**Prerequisites**: Task 2.3, Task 2.6.

**Subtasks**
- Calculate weekly sets per muscle group.

**Acceptance Criteria**
- Returns imbalance warnings consistently.

---

### Task 7.6 — Plateau detection (deterministic)
**Prerequisites**: Task 7.3.

**Subtasks**
- Detect plateau using last N exposures and effort.

**Acceptance Criteria**
- Plateau candidates returned for a user.

---

### Task 7.7 — Deload/low-energy day rules
**Prerequisites**: Task 7.6.

**Subtasks**
- Implement deload suggestion rules.

**Acceptance Criteria**
- Returns proposed deload adjustments deterministically.

---

## Phase 8 — Routine Versioning + Patch Apply

### Task 8.1 — Snapshot builder for routine state
**Prerequisites**: Task 2.7.

**Subtasks**
- Build function to serialize active split + templates + favorites references.

**Acceptance Criteria**
- Snapshot JSON can be stored and reloaded.

---

### Task 8.2 — Apply patch ops to create new routine version
**Prerequisites**: Task 8.1.

**Subtasks**
- Define patch op format.
- Apply ops to routine and store new version.

**Acceptance Criteria**
- New version created with changelog.

---

### Task 8.3 — Rollback endpoint
**Prerequisites**: Task 8.1.

**Subtasks**
- Implement rollback to a prior version.

**Acceptance Criteria**
- Routine state matches selected version.

---

### Task 8.4 — Compare versions view
**Prerequisites**: Task 8.2.

**Subtasks**
- Render diff (from → to).

**Acceptance Criteria**
- Differences are readable and accurate.

---

## Phase 9 — Coach System (OpenAI + Proposals)

### Task 9.1 — Proposal storage + inbox API
**Prerequisites**: Task 2.8.

**Subtasks**
- CRUD to list proposals and read details.

**Acceptance Criteria**
- Proposal inbox shows pending/accepted/rejected.

---

### Task 9.2 — Zod schemas for AI outputs
**Prerequisites**: Task 9.1.

**Subtasks**
- Create strict schemas for:
  - next-session plan
  - weekly patch proposals
  - plateau interventions
  - goals/guardrails

**Acceptance Criteria**
- Invalid JSON fails validation.

---

### Task 9.3 — Training summary builder (server)
**Prerequisites**: Task 7.3, Task 7.5.

**Subtasks**
- Build compact summary object for AI prompts.

**Acceptance Criteria**
- Summary excludes raw full history; includes key aggregates.

---

### Task 9.4 — Coach endpoint: Next Session Plan
**Prerequisites**: Task 9.2, Task 9.3.

**Subtasks**
- Implement `/api/coach/next-session` using OpenAI.
- Validate JSON output.
- Store proposal.

**Acceptance Criteria**
- Produces a pending proposal that renders in UI.

---

### Task 9.5 — Coach endpoint: Weekly Check-in
**Prerequisites**: Task 9.4.

**Subtasks**
- Implement `/api/coach/weekly-checkin`.
- Output patch ops.

**Acceptance Criteria**
- Creates patch proposal and can be accepted.

---

### Task 9.6 — Coach endpoint: Plateau interventions
**Prerequisites**: Task 9.5.

**Subtasks**
- Implement `/api/coach/plateau`.

**Acceptance Criteria**
- Returns limited interventions with patch ops.

---

### Task 9.7 — Coach endpoint: Goals & guardrails
**Prerequisites**: Task 9.6.

**Subtasks**
- Implement `/api/coach/goals`.

**Acceptance Criteria**
- Stores guardrail recommendations.

---

### Task 9.8 — Proposal review UI (Accept/Edit/Reject)
**Prerequisites**: Task 9.4, Task 8.2.

**Subtasks**
- Render proposal detail page.
- Accept applies patch ops and creates new version when applicable.

**Acceptance Criteria**
- Accept updates routine version and marks proposal accepted.

---

## Phase 10 — Generate Day From Favorites

### Task 10.1 — Deterministic slot filler (favorites-first)
**Prerequisites**: Task 6.7, Task 6.8.

**Subtasks**
- Fill slot template using favorites by muscle group/pattern.
- Avoid recently used exercises.

**Acceptance Criteria**
- If favorites exist for a slot, they are chosen before non-favorites.

---

### Task 10.2 — AI gap-filler for missing slots
**Prerequisites**: Task 10.1, Task 9.4.

**Subtasks**
- If slots remain empty, request AI suggestions constrained to catalog.

**Acceptance Criteria**
- Only valid exercises are selected; output is reviewable proposal.

---

### Task 10.3 — “Generate from Favorites” UI in template editor
**Prerequisites**: Task 10.2.

**Subtasks**
- Button in slot template editor.
- Preview → accept → save as fixed template.

**Acceptance Criteria**
- Accepted generated day can be saved as a stable template.

---

## Phase 11 — Data Tools + Account Controls

### Task 11.1 — Export endpoint (JSON + CSV)
**Prerequisites**: Task 3.10.

**Subtasks**
- Implement `/api/data/export`.

**Acceptance Criteria**
- User can download export.

---

### Task 11.2 — Import endpoint (JSON)
**Prerequisites**: Task 11.1.

**Subtasks**
- Implement `/api/data/import`.

**Acceptance Criteria**
- Imported data appears in history.

---

### Task 11.3 — Download my data UI
**Prerequisites**: Task 11.1.

**Subtasks**
- Settings screen button.

**Acceptance Criteria**
- Download triggers export.

---

### Task 11.4 — Delete account + data
**Prerequisites**: Task 11.3.

**Subtasks**
- Implement delete endpoint.
- Confirmation UI.

**Acceptance Criteria**
- User data is removed and user is logged out.

---

## Phase 12 — PWA Polish

### Task 12.1 — Add manifest + icons
**Prerequisites**: Task 0.3.

**Subtasks**
- Add PWA manifest.
- Add icons.

**Acceptance Criteria**
- “Add to Home Screen” shows correct name/icon.

---

### Task 12.2 — Service worker caching
**Prerequisites**: Task 12.1.

**Subtasks**
- Configure caching strategy.

**Acceptance Criteria**
- App shell loads offline.

---

## Phase 13 — Final UX Pages

### Task 13.1 — Dashboard UI wiring
**Prerequisites**: Task 6.4, Task 5.10.

**Subtasks**
- Show Today workout.
- Show coach actions.
- Show quick stats.

**Acceptance Criteria**
- Dashboard reflects real user state.

---

### Task 13.2 — Insights page
**Prerequisites**: Task 7.5, Task 7.4.

**Subtasks**
- Volume balance view.
- PR feed.

**Acceptance Criteria**
- Insights render meaningful data.

---

### Task 13.3 — History page
**Prerequisites**: Task 3.10.

**Subtasks**
- Session list and detail.

**Acceptance Criteria**
- Users can view past sessions.

---

### Task 13.4 — Goals page
**Prerequisites**: Task 9.7.

**Subtasks**
- Goals wizard UI.
- Guardrails UI.

**Acceptance Criteria**
- Goals can be saved and used by coach.

---

### Task 13.5 — Settings page
**Prerequisites**: Task 11.4.

**Subtasks**
- Profile/preferences.
- Export/import.
- Delete.
- Logout.

**Acceptance Criteria**
- Settings cover all account/data features.

---

## Phase 14 — Basic Testing Checklist (Not a full QA suite)

### Task 14.1 — Add minimal smoke tests
**Prerequisites**: Core flows implemented.

**Subtasks**
- Auth flow test
- Start/log/end workout test
- Offline log + later sync test

**Acceptance Criteria**
- Tests pass locally.

---

## Working Agreement: Memo Updates
- After completing any task, you will say: **“Update memo for Task X: <notes>”**.
- Only then should MEMO.md be updated before moving to the next task.

