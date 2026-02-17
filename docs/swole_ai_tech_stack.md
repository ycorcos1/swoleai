# TECH_STACK.md — SwoleAI (Locked Decisions)

> Purpose: Freeze implementation decisions so Cursor doesn’t second-guess. If you change something, update this file first.

## 1) Product Constraints (from PRD)
- Mobile-first PWA (iPhone Safari → Add to Home Screen)
- Accounts required (multi-device)
- Offline-first workout logging (instant writes)
- AI coach proposals (Next Session, Weekly Check-in, Goals/Guardrails, Plateau)
- Deterministic core rules: substitutions, progression, PRs, volume, plateau detection, deload logic
- Routine versioning + program blocks + rollback

## 2) Hosting
- **Web + API:** Vercel

## 3) Frontend
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI vibe:** PulsePlan skin (dark-first, glass panels, purple→blue gradient accents)
- **Icons:** Lucide
- **Forms:** React Hook Form + Zod (client)
- **Data fetching (server state):** TanStack Query (React Query)

## 4) PWA + Offline
- **Local persistence:** IndexedDB via **Dexie**
- **Service worker:** `next-pwa` (or Workbox-based setup)
- **Offline strategy:**
  - All workout logging writes locally first (IndexedDB) and updates UI immediately
  - Background sync pushes queued mutations to server when online
  - App shell cached for instant load

## 5) Backend
- **API:** Next.js Route Handlers (server)
- **Validation:** Zod schemas for every endpoint
- **Rate limiting:** Upstash Redis rate limit (or lightweight per-user limiter)
- **Logging/Errors:** Sentry (recommended)

## 6) Database
- **DB:** Neon Postgres (free tier)
- **ORM + migrations:** Prisma
- **Connection:** server-only via `DATABASE_URL` (use Neon pooling if needed)

## 7) Auth
- **Auth:** Auth.js (NextAuth) with Email/Password (Credentials) or Email Magic Link
- **Sessions:** JWT or database session strategy (pick one and keep consistent)
- **Route protection:** middleware for `/app/*`

## 8) AI Provider
- **LLM:** OpenAI API (server-side only)
- **Output contract:** Strict JSON only + server schema validation
- **Failure handling:** 1 repair attempt; if still invalid → deterministic fallback
- **Cost control:** compact summaries, strict token budget, per-user rate limit

## 9) Observability + Ops
- Metrics to track:
  - workout logging latency (client)
  - sync failure rate
  - AI validation failure rate
  - AI call cost per user/week

## 10) Environment Variables
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `OPENAI_API_KEY`
- (optional) `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- (optional) `SENTRY_DSN`

## 11) Explicit Non-Choices (do not add)
- No social features
- No nutrition tracking
- No computer vision form analysis
- No client-side DB access