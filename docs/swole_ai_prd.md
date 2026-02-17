# SwoleAI — Product Requirements Document (PRD)

## 1. Product Summary
SwoleAI is a mobile-first, account-based gym logging web app (installed to iPhone Home Screen as a PWA) that combines a *fast, reliable workout logger* with an *AI coach layer*.

The logger is built for real gym conditions: one-handed logging, offline reliability, undo/edit safety, and frictionless continuation if the app closes. The AI coach produces **structured, reviewable proposals** for next-session plans, weekly routine adjustments, goal/guardrail recommendations, and plateau interventions—tailored to the user’s actual routine, preferences, favorites, and training history.

Visual design: **PulsePlan style** (sleek, futuristic dark-first with purple/blue gradient accents and “glass” panels), branded as **SwoleAI**.

---

## 2. Goals
1. **Daily utility:** The user can log workouts faster than Notes/Sheets.
2. **Consistency:** The app supports stable programming via splits/day templates, with controlled weekly adjustments.
3. **Adaptive coaching:** AI improves training decisions without destabilizing the plan.
4. **Reliability:** Logging works instantly and safely even with poor connectivity.
5. **Trust:** AI changes are never automatic; all changes are reviewable, explainable, and reversible.

---

## 3. Non-Goals
- Social feeds, leaderboards, or community features.
- Nutrition tracking as a core module.
- Video form analysis or computer vision.
- Daily AI-generated full program rewrites.

---

## 4. Target Users
- **Primary:** Gym-goers training 3–6 days/week who want structure + progression without managing spreadsheets.
- **Secondary:** Intermediate lifters who already have routines but want optimization and plateau help.
- **Edge:** Power users who want exportable data and configurable progression rules.

---

## 5. Key Product Principles
1. **Logger first:** Workout Mode must be the best experience.
2. **AI as proposals:** AI returns structured plans/patches; user accepts/edits/rejects.
3. **Determinism where possible:** Substitutions, progressions, and plateau detection are code-first; AI refines and explains.
4. **Stability > novelty:** Weekly check-ins tweak; they do not constantly reshuffle.
5. **Offline-first:** Local writes happen instantly; sync is secondary.

---

## 6. Core Objects (Conceptual Model)
- **Account/User Profile:** training goal, schedule, constraints, preferences.
- **Exercise Catalog:** global + user custom, tagged by muscle group(s), movement pattern, equipment.
- **Favorites Bank:** user’s preferred exercises (and optional “priority/backup” levels) organized by muscle group/pattern.
- **Workout Split (Program Schedule):** weekly structure mapping days of week to a Saved Workout Day template.
- **Saved Workout Day (Template):** a reusable day plan, either fixed-exercise or slot-based rules (e.g., Push = 2 chest, 2 shoulders, 2 triceps).
- **Workout Session (Log):** real performed session with sets/reps/weight/RPE and flags.
- **Program Blocks + Routine Versions:** versioned routine sets, grouped into blocks (e.g., 4–6 weeks) with changelogs and rollback.
- **Coach Proposal:** AI-generated plan/patch with rationale and apply/modify controls.

---

## 7. User Journeys (End-to-End)
### 7.1 First-Time User
1. Lands on Homepage → Signup.
2. Completes onboarding wizard: goals, days/week, session length, equipment, constraints.
3. Creates/Imports a Split and Saved Workout Days (manual or AI).
4. Starts first workout in Workout Mode.
5. Ends workout → generates Next Session Plan.

### 7.2 Returning User
1. Opens PWA → Dashboard.
2. Sees Today’s workout from Active Split.
3. Logs workout quickly.
4. Optional: taps Weekly Check-in on a scheduled cadence.

### 7.3 “Build My Day From Favorites” User
1. Opens Routine Studio → selects Saved Workout Day template (slot-based).
2. Chooses “Generate from Favorites” → app fills slots using favorites; AI fills gaps.
3. User reviews and saves as a stable day template.

---

## 8. Functional Requirements

### 8.1 Auth + Accounts
**Requirements**
- Email/password signup and login.
- Forgot password flow.
- Protected routes for all app screens.
- Profile management (goals, constraints, preferences).
- Multi-device support (same account on phone/desktop).

**Acceptance Criteria**
- Unauthenticated users cannot access `/app/*`.
- Session persists across refresh; logout clears session.

---

### 8.2 Onboarding Wizard
**Steps**
1. Goal: hypertrophy / strength / hybrid.
2. Schedule: days/week, typical session length.
3. Environment: equipment (commercial/home), unit system.
4. Constraints: injuries/avoid list; must-have lifts.
5. Routine setup: create split + days manually OR AI-assisted.

**Acceptance Criteria**
- Onboarding completion sets an Active Split (or prompts to create one).

---

### 8.3 Dashboard (Home in-app)
**Must include**
- Start Workout / Continue Workout.
- Today’s scheduled session (from Active Split) + quick change.
- Coach Actions: Next Session Plan, Weekly Check-in, Diagnose Plateau, Goals Review.
- Quick Stats: adherence this week, last workout, upcoming deload (if scheduled), PR highlights.
- Sync status: Synced / Pending / Offline.

**Acceptance Criteria**
- Continue workout restores user to last state within the active session.

---

### 8.4 Routine Studio (Programming)
#### 8.4.1 Workout Splits (Saved Program Schedules)
**Features**
- Create/edit/delete splits.
- Define schedule: mapping weekdays to a Saved Workout Day (or rest).
- Set split as Active.
- Multiple splits can exist; only one active.

**Acceptance Criteria**
- Active split controls the Dashboard “Today” workout suggestion.

#### 8.4.2 Saved Workout Days (Templates)
**Two modes**
- **Fixed mode:** explicit exercise list with planned sets/rep ranges/rest.
- **Slot mode:** rule-based day (e.g., Push = 2 chest, 2 shoulders, 2 triceps) with optional movement-pattern constraints.

**Features**
- Add, reorder, remove exercises/slots.
- Configure per exercise/slot: sets, rep range, rest, intensity target (optional), progression engine.
- “Save as template” from a completed workout session.

**Acceptance Criteria**
- Day templates can be launched directly into Workout Mode.

#### 8.4.3 Favorites Bank
**Features**
- Favorite/unfavorite exercises.
- Categorize favorites by muscle group and movement pattern automatically.
- Optional user tags: “Primary”, “Backup”, “Avoid”, “Pain-free”.

**Acceptance Criteria**
- Favorites appear first in selection UIs and are used by AI day generation.

#### 8.4.4 Generate Day from Favorites (AI-assisted)
**Flow**
1. User selects a Slot-based Day template.
2. Taps “Generate from Favorites”.
3. System fills slots deterministically from favorites (using recency avoidance).
4. Remaining slots are filled by AI (or deterministic fallback) respecting constraints.
5. User reviews proposed day and can accept/edit.
6. Accepted plan can be saved as a stable fixed-day template.

**Acceptance Criteria**
- If favorites exist for a slot, the proposal uses them first.
- If no favorites exist, AI selects from catalog consistent with constraints.

---

### 8.5 Workout Mode (Core Logging)
**Must-haves (usability)**
- One-handed set logging with big inputs.
- Prefill last performance and suggested targets.
- **Edit set**, **undo last action**, **delete set**, **reorder exercises**, **add exercise mid-session**.
- Flag sets: warmup, backoff, dropset, failure.
- Rest timer: auto-start after set, quick adjust, per-exercise defaults.
- Swap exercise: deterministic substitution suggestions + optional AI suggestions.
- Continue workout after app close (persist state).

**Workout lifecycle**
- Start → active session created.
- Log exercise sets and notes.
- End workout → summary (volume, PRs, notes).
- Optional “Generate Next Session Plan”.

**Acceptance Criteria**
- Logging a set works offline and is persisted locally immediately.
- Undo restores to previous state without data corruption.

---

### 8.6 Progression Engines (User-selectable)
Provide progression engines selectable per exercise or per template:
- **Double progression:** increase reps to top of range, then load.
- **Straight sets:** fixed sets/reps, load based on last performance.
- **Top set + backoff:** top set target + backoff sets with % drop.
- **RPE/RIR-based (optional):** adjust load to meet target effort.

**Acceptance Criteria**
- Next Session Plan uses the configured progression engine.

---

### 8.7 PR System (Robust)
**PR Types**
- Rep PR at a given load.
- Load PR for a rep bracket.
- Estimated 1RM PR.
- Best volume session PR per exercise.

**Behavior**
- PRs are detected automatically during workout and displayed in summary.
- Users can disable specific PR types.

---

### 8.8 Muscle Group Volume Targets + Balance Warnings
**Features**
- Weekly set targets per muscle group based on goals.
- Volume tracking across sessions and templates.
- Balance warnings (e.g., pull vs push imbalance).
- Visual summary in Weekly Check-in and Insights.

**Acceptance Criteria**
- Weekly Check-in surfaces at least one actionable volume insight when imbalanced.

---

### 8.9 Deload + Recovery Management
**Features**
- User can schedule a deload week manually.
- AI can propose deload based on fatigue signals and plateau patterns.
- “Low energy day” mode: automatically reduce volume/intensity based on settings.
- Recovery notes and pain flags influence proposals.

**Acceptance Criteria**
- Deload proposals are opt-in and shown as a patch.

---

### 8.10 Deterministic Exercise Substitution System
**Features**
- Each exercise has tags: muscle group(s), movement pattern, equipment, joint stress flags.
- Substitutions use a deterministic candidate list and scoring:
  - matches pattern, equipment available, respects avoid list, not used recently.
- AI can provide *optional* suggestions within the candidate set.

**Acceptance Criteria**
- Swap action always provides at least one valid option (or a clear “no match” state).

---

### 8.11 AI Coach Features
- All AI features return **structured proposals** and never apply automatically.
- LLM provider for v1: OpenAI API (via server-side Vercel API routes).
- Database for v1: Neon Postgres (via server-side Vercel API routes; no direct client DB access).
- Offline-first: IndexedDB client cache + background sync to Neon.

#### 8.11.1 Next Session Plan Generator
**Input**: profile + active split/day template + recent exercise history + constraints.
**Output**: structured session plan with targets (weights/reps/rest) + rationale.
**UI**: Accept / Edit / Reject.

#### 8.11.2 Weekly Routine Adjustment (Weekly Check-in)
**Input**: last 7–14 days logs + template + volume balance + fatigue + adherence.
**Output**: patch list (small, stable) + expected benefits + confidence.
**UI**: accept patches individually; creates new routine version.

#### 8.11.3 Goal Setting + Guardrails
**Wizard**: translates user goals into measurable targets and rules.
**Guardrails**: constrain load increases, manage fatigue, prevent overreaching.

#### 8.11.4 Plateau Detection + Interventions
**Detection**: deterministic plateau rules using last N exposures + effort.
**Interventions**: limited set (deload, rep range shift, variation swap, backoff set).
**UI**: apply as patch.

**Acceptance Criteria**
- AI output is validated; invalid output fails gracefully with a deterministic fallback.

---

### 8.12 Program Blocks + Routine Versioning
**Features**
- Routine changes create a new version with changelog.
- Versions grouped into blocks (e.g., 4–6 week block).
- Rollback to a previous version.
- “Compare versions” view for transparency.

**Acceptance Criteria**
- Accepting Weekly Check-in patches creates a new version.

---

### 8.13 History + Insights
**History**
- Session list with detail view.
- Exercise detail view with recent performance.

**Insights**
- PR feed.
- Plateau alerts.
- Volume balance dashboard.
- Adherence trend.

---

### 8.14 Account + Data Features (Expected)
- Export data (JSON + CSV).
- Import data (JSON).
- Download my data.
- Delete account + delete all data.
- Transparent sync expectations + sync status UI.

---

## 9. Information Architecture (Routes)
Public:
- `/` homepage
- `/login`
- `/signup`
- `/forgot-password`

Authenticated:
- `/app/dashboard`
- `/app/workout/start`
- `/app/workout/session/:id`
- `/app/routine` (Splits, Days, Favorites)
- `/app/history`
- `/app/insights`
- `/app/goals`
- `/app/settings`
- `/app/coach` (actions + proposal inbox)

---

## 10. Visual & UX Requirements (PulsePlan skin)
- Dark-first UI with purple/blue gradient accents.
- Glass-like panels, rounded cards, subtle glow.
- Large touch targets (44px+).
- Bottom navigation on mobile.
- Workout Mode prioritizes speed: minimal text input.

---

## 11. MVP vs V1 Scope
**MVP (ship fast)**
- Auth + onboarding + active split
- Routine Studio (splits + day templates)
- Workout Mode with core usability (edit/undo/continue) + rest timer
- Deterministic substitution
- Basic progression engine (double progression)
- AI: Next Session Plan + Weekly Check-in (limited)
- Export/import

**V1 (complete vision)**
- Program blocks + version compare/rollback
- Multiple progression engines
- Full PR system
- Volume targets + balance warnings
- Plateau detection + intervention patches
- Deload management + low energy day
- Favorites bank + “Generate day from favorites”
- Coach proposal inbox + history

---

## 12. Success Metrics
- Time-to-log a set (median) and completion rate.
- Weekly active users (WAU) and retention at 4 weeks.
- % users who complete at least 3 workouts/week.
- AI proposal acceptance rate and “undo/rollback” rate.
- Sync error rate.

---

## 13. Edge Cases & Requirements
- Mid-workout app close → resume state.
- Offline logging → later sync.
- Editing past sessions recalculates PRs and insights.
- Conflicting edits across devices handled safely (event-based logging preferred).
- Safe-mode advice if user flags acute pain.

---

## 14. Open Questions (to resolve during Design Spec)
- Default unit system and plate calculator inclusion.
- Initial exercise catalog size and tagging approach.
- Exact plateau thresholds and fatigue heuristics.
- Notification strategy (in-app vs push; iOS PWA limitations).

---

## 15. References
- Existing user flow and screen map diagrams are maintained in `/docs/diagrams`.

