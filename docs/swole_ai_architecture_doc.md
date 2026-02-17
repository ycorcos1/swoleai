# SwoleAI — Architecture Document (Vercel + Neon Postgres + OpenAI)

> This architecture implements the SwoleAI PRD (mobile-first PWA gym logger + AI coach proposals), including offline-first Workout Mode, accounts, multi-device sync, deterministic rules (substitutions/progression/plateau), routine versioning + program blocks, and AI coach endpoints using OpenAI.

---

## 1) Architecture Goals
1. **Workout reliability:** logging must work instantly and safely in the gym (offline-first).
2. **Accounts + sync:** users can use phone + desktop; data persists across devices.
3. **Trustworthy AI:** AI outputs are structured, validated, reviewable, and never auto-applied.
4. **Deterministic core:** substitutions, progression, volume, plateau detection are code-first; AI refines.
5. **Versioned programming:** routine changes are tracked with versions and rollback.
6. **Security + privacy:** protect user data, keep API keys server-side, support data export/deletion.

---

## 2) System Overview
**Client:** Next.js mobile PWA (PulsePlan UI) with IndexedDB local store + service worker for caching.

**Backend:** Next.js API routes deployed on Vercel.

**Database:** Neon Postgres as the system of record.

**AI Provider:** OpenAI API used only from server routes.

**Core idea:** Workout logging is **event-based** locally and synced to the server; AI endpoints operate on a compact “training summary” derived from recent data and deterministic rule outputs.

---

## 3) High-Level Diagram

```mermaid
flowchart LR
  subgraph Client[Client: SwoleAI PWA (Next.js)]
    UI[UI Screens]
    IDB[IndexedDB Local Store
(active session + event log)]
    SW[Service Worker Cache
(app shell + assets)]
    UI <--> IDB
    UI <--> SW
  end

  subgraph Vercel[Backend: Vercel (Next.js API Routes)]
    AUTH[Auth Middleware]
    API[CRUD API
(splits/days/favorites/workouts/history)]
    SYNC[Sync API
(push/pull + conflict handling)]
    RULES[Rules Engine
(substitutions, progression, PRs,
volume, plateau detect, deload)]
    COACH[Coach Actions API
(next-session/weekly/plateau/goals)]
    VALID[Schema Validation
(JSON + patch ops)]
  end

  subgraph Data[Data Layer]
    DB[(Neon Postgres)]
    OBJ[(Object Storage optional
(archives/exports))]
  end

  subgraph AI[AI Provider]
    LLM[OpenAI API]
  end

  UI <--> AUTH
  UI <--> API
  UI <--> SYNC
  UI <--> COACH

  AUTH <--> DB
  API <--> DB
  SYNC <--> DB
  RULES <--> DB

  COACH <--> RULES
  COACH <--> DB
  COACH <--> VALID
  COACH <--> LLM

  API -. optional .-> OBJ
```

---

## 4) Technology Decisions
### 4.1 Frontend
- **Next.js (App Router) + TypeScript**
- **PWA**: manifest + service worker caching
- **State**: React Query/SWR for server state, local store for workout logging
- **IndexedDB**: Dexie (recommended) for local persistence

### 4.2 Backend
- **Next.js API routes on Vercel**
- **Rate limiting** on AI endpoints
- **Schema validation** for AI JSON outputs (Zod recommended)

### 4.3 Data
- **Neon Postgres** (server-side access only)
- **ORM**: Prisma recommended for migrations + typed models

### 4.4 Auth
Two supported paths:
- **Auth.js / NextAuth + Neon** (simple pairing)
- (Alternative) Supabase Auth (not required if using Neon)

This doc assumes **Auth.js**.

### 4.5 AI
- **OpenAI API** used from server routes only
- Strict JSON outputs validated by Zod
- “Repair” pass if JSON invalid; deterministic fallback if still invalid

---

## 5) Data Model (Logical)

### 5.1 Core tables
**users**
- id, email, created_at
- profile fields: goal_mode, days_per_week, session_minutes, equipment, units
- constraints: injuries_json, avoid_exercises_json, must_have_json

**exercises**
- id, name, type (barbell/dumbbell/machine/cable/bodyweight)
- muscle_groups_json, movement_pattern, equipment_tags_json
- joint_stress_flags_json
- is_custom, owner_user_id nullable

**favorites**
- user_id, exercise_id
- priority (primary/backup), tags_json

**splits**
- id, user_id, name, is_active

**split_schedule_days**
- split_id, weekday (0-6)
- workout_day_template_id nullable
- is_rest boolean

**workout_day_templates**
- id, user_id, name
- mode (fixed/slot)
- default_progression_engine
- notes

**workout_day_blocks** (for fixed templates)
- template_id, order_index
- exercise_id
- sets_planned, rep_min, rep_max, rest_seconds
- intensity_target_json (optional)
- progression_engine override optional

**workout_day_slots** (for slot templates)
- template_id, order_index
- muscle_group (e.g., chest)
- count
- optional pattern_constraints_json

**program_blocks**
- id, user_id, name, start_date, end_date nullable

**routine_versions**
- id, user_id, program_block_id
- created_at
- changelog
- snapshot_json (split + templates + favorites refs)

**workout_sessions**
- id, user_id
- started_at, ended_at
- split_id nullable, template_id nullable
- title, notes
- constraints_flags_json (pain, equipment crowded)

**workout_exercises**
- id, workout_session_id, exercise_id, order_index, notes

**workout_sets**
- id, workout_exercise_id, set_index
- weight, reps
- rpe nullable
- flags_json (warmup/backoff/drop/failure)
- created_at

**coach_proposals**
- id, user_id, type (next_session/weekly/plateau/goals)
- created_at
- input_summary_hash
- proposal_json
- status (pending/accepted/rejected)

**routine_change_log**
- id, user_id
- proposal_id nullable
- from_version_id, to_version_id
- patch_ops_json

### 5.2 Why snapshots for versions
Routine versions store a **snapshot_json** so rollback is reliable even if exercises/templates change later.

---

## 6) Offline-First Logging + Sync

### 6.1 Local-first strategy
- During workouts, writes go to **IndexedDB immediately**.
- Local data includes:
  - active_session
  - event_log (append-only set events)
  - pending_mutations queue

### 6.2 Sync principles
- Server is the source of truth for finalized history.
- Client syncs:
  - **push** pending mutations when online
  - **pull** latest server updates periodically or on app open

### 6.3 Conflict handling
- Prefer **append-only events** for set logs.
- Edits create “edit events” or update rows with updated_at timestamps.
- Conflict rule:
  - For immutable set creation: no conflict.
  - For edits: last write wins, but store prior value in change log if desired.

### 6.4 Continue workout
- Active session is stored locally; reopening restores UI state even without network.

---

## 7) Deterministic Rules Engine
The rules engine runs on the backend (and partially in client for immediate UX hints).

### 7.1 Substitution system
- Uses exercise tags (muscle group, pattern, equipment, stress flags).
- Candidate scoring:
  - exact pattern match > muscle match > equipment match
  - respects avoid list + injury flags
  - penalize recently used exercises

### 7.2 Progression engines
- Double progression
- Straight sets
- Top set + backoff
- Optional RPE/RIR

### 7.3 PR detection
- Rep PR at load
- Load PR for rep bracket
- e1RM PR
- Volume PR

### 7.4 Volume targets + balance
- Weekly sets per muscle group
- Balance warnings (push vs pull, etc.)

### 7.5 Plateau detection
- Deterministic rule: no improvement across N exposures + high effort

### 7.6 Deload logic
- Suggested deload based on fatigue + plateau signals
- Low energy day adjustments

---

## 8) AI Coach System (OpenAI)

### 8.1 Coach endpoints
- `POST /api/coach/next-session`
- `POST /api/coach/weekly-checkin`
- `POST /api/coach/plateau`
- `POST /api/coach/goals`

### 8.2 Inputs
Each endpoint receives a compact payload:
- user_profile
- active_split/template context
- constraints
- training_summary (last 2–4 exposures per exercise)
- deterministic outputs (plateau candidates, volume balance, substitution candidates)

### 8.3 Outputs
- Strict JSON per schema:
  - next session plan
  - patch proposals (weekly)
  - plateau interventions
  - goals + guardrails

### 8.4 Validation + fallback
- Validate against Zod schema.
- If invalid: run a repair prompt once.
- If still invalid: return deterministic fallback and log error.

### 8.5 Never auto-apply
- All AI outputs create a **coach_proposal** with status=pending.
- UI requires explicit accept.
- Acceptance writes patches and creates a new routine version.

### 8.6 Cost controls
- Rate limit by user.
- Cache training summaries.
- Limit history window and token budget.

---

## 9) API Surface (REST-ish)

### 9.1 Auth
- `POST /api/auth/*` (Auth.js handlers)

### 9.2 Exercises + Favorites
- `GET /api/exercises`
- `POST /api/exercises` (custom)
- `POST /api/favorites/:exerciseId` (toggle)

### 9.3 Splits
- `GET /api/splits`
- `POST /api/splits`
- `PUT /api/splits/:id`
- `POST /api/splits/:id/activate`

### 9.4 Day templates
- `GET /api/templates`
- `POST /api/templates`
- `PUT /api/templates/:id`
- `POST /api/templates/:id/generate-from-favorites`

### 9.5 Workouts
- `POST /api/workouts/start`
- `POST /api/workouts/:id/log-set`
- `POST /api/workouts/:id/end`
- `GET /api/history`

### 9.6 Versions
- `GET /api/versions`
- `POST /api/versions/rollback`
- `GET /api/versions/:id/compare?to=:id2`

### 9.7 Data
- `GET /api/data/export`
- `POST /api/data/import`
- `GET /api/data/download`
- `DELETE /api/account` (delete all user data)

---

## 10) Security + Privacy
- DB access only from server.
- OpenAI key stored in Vercel env vars.
- Authorization enforced via middleware; user_id scoping on every query.
- PII minimized in logs.
- Export + delete support as first-class.

---

## 11) Observability
- Log request IDs.
- Track:
  - sync failures
  - AI validation failures
  - AI endpoint latency/cost
  - workout logging latency
- Error reporting (Sentry recommended).

---

## 12) Deployment
- Vercel preview deployments for PRs.
- Neon branch DB for staging if desired.
- Prisma migrations run in CI or manually during deploy.
- Env vars:
  - DATABASE_URL
  - AUTH_SECRET
  - OPENAI_API_KEY

---

## 13) Implementation Phases (Architecture-aligned)
1. Auth + route protection + Neon schema + CRUD for splits/templates.
2. Workout Mode offline-first (IndexedDB) + basic sync.
3. Deterministic rules engine (substitutions/progression/PR/volume).
4. Routine versioning + program blocks + rollback.
5. Coach endpoints (OpenAI) + proposal inbox + patch apply.
6. Data export/import + delete account.

---

## 14) Appendix: Alignment to PRD
- AI provider: OpenAI (`8.11` in PRD).
- Offline-first and gym usability requirements: PRD Workout Mode (`8.5`).
- Splits/days/favorites and generate-from-favorites: PRD Routine Studio (`8.4`).
- Versioning and program blocks: PRD (`8.12`).

