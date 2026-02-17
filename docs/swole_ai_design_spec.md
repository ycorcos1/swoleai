# SwoleAI — Design Specification (PulsePlan UI)

> Scope: This design spec translates the PRD into concrete UX, IA, UI components, states, and interaction details so implementation can proceed without guessing. The app name is **SwoleAI** and the visual style is **PulsePlan**.

---

## 0. Design System Summary (PulsePlan)

### 0.1 Core Principles
- **Gym-first speed:** minimize typing; large touch targets.
- **Dark-first, high clarity:** high contrast for gym lighting.
- **AI is “action-based,” not chatty:** proposals and patches with clear diffs.
- **Stability and trust:** changes are reviewable, versioned, reversible.

### 0.2 Color + Visual Language
- **Base:** near-black / deep navy backgrounds.
- **Panels:** glass-like cards with subtle blur and thin borders.
- **Accents:** purple → blue gradient for primary CTAs and active states.
- **Status colors:**
  - Success/PR: green
  - Warning/fatigue: amber
  - Error: red
  - Info: cyan/blue
- **Shadows/glow:** subtle outer glow on primary buttons and selected cards.

### 0.3 Typography
- **Headings:** modern geometric sans (bold, tight line height).
- **Body:** clean sans, medium weight, readable at small sizes.
- **Numbers (weights/reps):** tabular numerals (important).

### 0.4 Spacing + Touch Targets
- Minimum touch target: **44px**.
- Standard spacing scale: 4/8/12/16/24.
- Cards: 16px padding, 14–16px radius.

### 0.5 Iconography
- Outlined icons with consistent stroke.
- Use icons in Workout Mode for: edit, undo, timer, swap, add, reorder, warmup, drop set, failure.

---

## 1. Information Architecture + Navigation

### 1.1 Route Map
Public:
- `/` Homepage
- `/login`
- `/signup`
- `/forgot-password`

Authenticated:
- `/app/dashboard`
- `/app/workout/start`
- `/app/workout/session/:id`
- `/app/routine` (tabs: Splits / Days / Favorites / Versions)
- `/app/history`
- `/app/insights`
- `/app/goals`
- `/app/coach` (Actions + Proposal Inbox)
- `/app/settings`

### 1.2 Mobile Navigation
- **Bottom Nav (5 items):** Dashboard, Workout, Routine, Insights, Settings
- Coach actions are accessible from:
  - Dashboard “Coach Actions” card
  - Coach Center page via a top-right “Coach” button on Dashboard
- **Workout** tab behavior:
  - If an active session exists → opens **Workout Mode**
  - Else → opens **Workout Start**

### 1.3 Desktop Navigation
- Left sidebar nav mirroring bottom nav items.

---

## 2. Global Patterns

### 2.1 Auth Gate
- Any `/app/*` route requires session.
- If missing/expired: redirect to `/login` and show toast “Please log in.”

### 2.2 Loading States
- Skeleton loaders for lists.
- Workout Mode never blocks on network; local-first render.

### 2.3 Offline + Sync Status
- Global sync pill (top of Dashboard, Settings):
  - **Synced** (green)
  - **Pending** (amber)
  - **Offline** (gray)
  - **Error** (red) with retry

### 2.4 Proposal / Patch Review Pattern (Core)
All AI outputs render as **Proposals** with:
- Summary header
- “Why this” rationale (short)
- Patch cards (diff view)
- Buttons: **Accept**, **Edit**, **Reject**
- Acceptance creates a new routine version when applicable.

### 2.5 Versioning Pattern
- Changes to templates or splits:
  - “Save changes” creates a new **Version** (unless user toggles “overwrite current version” — default OFF)
  - Versions belong to a **Program Block**.
- Rollback is one click.

---

## 3. Page Specs (Public)

### 3.1 Homepage (`/`)
**Goal:** explain product, drive signup.

**Layout (mobile):**
- Hero: SwoleAI logo + tagline
- CTA buttons: **Create account** (primary), **Log in** (secondary)
- 3 feature tiles: Log fast, AI coach proposals, Versioned routines
- Footer links: privacy, terms

### 3.2 Login (`/login`)
- Fields: email, password
- Buttons: Log in (primary)
- Links: Forgot password, Create account
- Error states inline; password show/hide.

### 3.3 Signup (`/signup`)
- Fields: email, password, confirm password
- Button: Create account (primary)
- Link: Log in

### 3.4 Forgot Password (`/forgot-password`)
- Email field, send reset link.

---

## 4. Onboarding Wizard

### 4.1 Structure
- Progress indicator (steps 1–5)
- Back/Next buttons
- “Skip for now” allowed only for programming setup; not for profile basics.

### 4.2 Step Details
1) **Goal**: hypertrophy / strength / hybrid
2) **Schedule**: days/week + session minutes
3) **Environment**: equipment (home/commercial), units (lb/kg)
4) **Constraints & Preferences**: injuries/avoid, must-have lifts, likes/dislikes
5) **Programming Setup**:
   - Create split manually
   - Paste/import routine (AI convert)
   - Generate starter split (AI)

**Completion:** requires an Active Split OR the user chooses “I’ll set this later” and app defaults to Freestyle.

---

## 5. Authenticated App Pages

## 5.1 Dashboard (`/app/dashboard`)
**Primary intent:** start or continue training immediately.

**Sections (top → bottom):**
1) Header: date + sync status pill
2) Today Card:
   - Today’s scheduled day (from Active Split)
   - Buttons: **Start Workout** (primary) / **Continue** if active
   - Secondary: “Change” opens day selector
3) Coach Actions Card:
   - Buttons: Next Session Plan, Weekly Check-in, Diagnose Plateau, Goals Review
4) Quick Stats Row:
   - Workouts this week vs target
   - Last workout summary chip
   - Upcoming deload chip (if scheduled)
5) Recent activity:
   - PR highlights
   - Latest proposals (accepted/rejected)

**Empty states:**
- No split: prompt “Create your split” → Routine Studio

---

## 5.2 Workout Start (`/app/workout/start`)
**Cards:**
- Scheduled (Today) from Active Split (recommended)
- Saved Workout Days list (search)
- Freestyle

**Actions:**
- Start

---

## 5.3 Workout Mode (`/app/workout/session/:id`)
This is the highest priority UI.

### 5.3.1 Workout Mode Layout
- Top bar: session name, elapsed time, sync pill, overflow menu
- Exercise list (cards): each card shows:
  - Exercise name
  - Planned sets x rep range
  - Last time summary (e.g., 185 x 8/8/7)
  - Small “Coach tip” chip (optional)
  - Buttons: Log, Swap, Reorder handle
- Bottom sticky bar:
  - Add Exercise
  - Timer
  - End Workout

### 5.3.2 Set Logger (Modal / Sheet)
For selected exercise:
- Set list (scroll)
- Each set row:
  - Weight stepper
  - Reps stepper
  - Optional RPE selector
  - Flags: warmup/backoff/drop/failure
  - Save/Log
- Controls:
  - **Undo last action**
  - Edit previous set
  - Delete set

### 5.3.3 Rest Timer
- Auto-start on “Log set” when enabled.
- Quick adjust: -15s, +15s, +60s.
- Per-exercise defaults editable.

### 5.3.4 Swap Exercise
- Opens substitution sheet.
- Shows deterministic candidates first.
- “Ask Coach” optional: AI suggestion limited to allowed candidates.

### 5.3.5 Reorder + Add Exercise
- Drag reorder in list.
- Add exercise search with favorites pinned at top.

### 5.3.6 Continue Workout
- If app closes, reopening returns to active session.

---

## 5.4 Workout Summary (`/app/workout/session/:id/summary`)
**Sections:**
- Volume summary + duration
- PR highlights (badges)
- Notes
- Buttons:
  - **Generate Next Session Plan** (primary)
  - Save as template day (secondary)
  - Done (back to dashboard)

---

## 5.5 Routine Studio (`/app/routine`)
Tabbed interface:

### 5.5.1 Splits Tab
- List of splits with Active badge.
- Create/edit split:
  - Name
  - Days of week mapping to Saved Workout Day or Rest
  - Set Active

### 5.5.2 Days Tab (Saved Workout Days)
- List of day templates.
- Create day:
  - Fixed mode OR Slot mode

**Fixed Mode editor:**
- Ordered exercise blocks
- Configure sets/rep range/rest/progression per block

**Slot Mode editor:**
- Define slots per muscle group with counts (e.g., chest x2)
- Optional movement constraints per slot category
- Button: **Generate from Favorites**

### 5.5.3 Favorites Tab
- Favorites list grouped by muscle group/pattern.
- Toggle “Primary/Backup”.

### 5.5.4 Versions Tab
- Program blocks list (e.g., Block 1: Jan 1–Feb 1)
- Versions under each block.
- Compare version diff view.
- Rollback button.

---

## 5.6 Coach Center (`/app/coach`)

### 5.6.1 Actions
- Next Session Plan
- Weekly Check-in
- Diagnose Plateau
- Goals Review

Each action launches a proposal screen.

### 5.6.2 Proposal Inbox
- List: pending / accepted / rejected
- Detail: proposal content + applied patches

---

## 5.7 Weekly Check-in Proposal UI
- Summary: adherence, volume balance, fatigue
- Patch cards (diff):
  - Volume adjustments
  - Exercise swaps
  - Rep range changes
  - Deload scheduling
  - Block transition suggestions
- Buttons: Accept selected patches / Reject / Edit

Accept creates a new version in Versions tab.

---

## 5.8 Insights (`/app/insights`)
- Volume balance chart
- PR feed
- Plateau alerts
- Adherence trend

---

## 5.9 History (`/app/history`)
- Sessions list
- Session detail
- Exercise detail view: last N performances, PR markers

---

## 5.10 Goals (`/app/goals`)
- Set goals wizard
- Guardrails configuration
- Weekly targets per muscle group

---

## 5.11 Settings (`/app/settings`)
- Profile + preferences
- Units
- Sync status and expectations
- Export JSON/CSV
- Import JSON
- Download my data
- Delete account + data
- Logout

---

## 6. Component Library (Implementation Notes)

### 6.1 Core Components
- `AppShell` (nav + layout)
- `GlassCard`
- `PrimaryGradientButton`
- `SyncStatusPill`
- `ExerciseCard`
- `SetLoggerSheet`
- `RestTimer`
- `ProposalCard`
- `DiffRow` (from → to)
- `VersionTimeline`

### 6.2 Forms + Validation
- Inline field errors
- Disable submit until valid

---

## 7. Copy + Tone
- Minimal, confident, coach-like.
- Avoid excessive motivational fluff.
- Use plain language for AI rationale.

---

## 8. Accessibility
- Contrast meets WCAG AA.
- Buttons and inputs reachable with one hand.
- Screen reader labels for icons.

---

## 9. Edge Cases (UI)
- No favorites for a slot → clearly show AI-filled picks.
- No substitution candidates → show “No safe swap found” + allow manual search.
- Proposal validation failure → show fallback deterministic plan.
- Offline → disable coach actions with explanation (or queue if desired).

---

## 10. Open Decisions (Lock before implementation)
- Exact icon set (Lucide recommended).
- Whether to include plate calculator in v1.
- Whether notifications are in-app only or include push (iOS PWA constraints).
