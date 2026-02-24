# Orizen Flow - Master Implementation Plan

## Goal Description

Build **Orizen Flow**, an evidence-based AI candidate evaluation engine and modern ATS. This plan outlines the full lifecycle from a high-conversion landing page to a multi-phase AI-hiring CRM.

---

## Current Progress

| Component                    | Status         | Notes                                                                                                                                                                       |
| ---------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo Structure           | ✅ Done        | `apps/web` (Next.js 16), `apps/api` (Hono), `packages/*` (db, auth, config, tsconfig)                                                                                       |
| Visual Identity              | ✅ Done        | Light/Dark monochrome palette, Inter font, CSS variables, Shadcn + Aceternity UI                                                                                            |
| Landing Page                 | ✅ Done        | All 8 sections: Hero, Problem, Solution, How It Works, Features, Product Preview, Waitlist CTA, Footer                                                                      |
| Waitlist API                 | ✅ Done        | `POST /api/waitlist/join` — Zod validation, DB insert, duplicate handling, IP tracking, Resend welcome email (non-blocking).                                                |
| SEO / OG Image               | ✅ Done        | Dynamic metadata, `og:image` generation via `@takumi-rs/image-response`                                                                                                     |
| Auth (Module 2)              | ✅ Done        | Better Auth — GitHub, Google, Magic Link. Session management, protected routes.                                                                                             |
| Job CRUD (Module 2)          | ✅ Done        | `POST/GET/PUT/DELETE /api/v1/jobs` — org-scoped. Full page-based UI for create, view, edit. Status lifecycle: draft → open → closed → filled.                               |
| Dashboard UI                 | ✅ Done        | Sidebar nav (fixed links), overview page with live stats/recent applications, jobs listing with status filter tabs + count badges, candidates table from real applications. |
| Public Apply (Module 1)      | ✅ Done        | Public job page + application form at `/:orgSlug/:jobSlug` (legacy `/:orgSlug/:jobSlug/:id` redirects) with org branding/details, URL validation, honeypot, and resume `HEAD` check. |
| Worker / BullMQ (Module 3)   | ❌ Not started | Resume parsing, GitHub scraping                                                                                                                                             |
| AI Evaluation (Module 3)     | ❌ Not started | Sarvam AI integration                                                                                                                                                       |
| Kanban / Pipeline (Module 4) | ❌ Not started | Applied → Hired board                                                                                                                                                       |
| Admin Dashboard (Module 5)   | ✅ Done        | Platform-only `/admin` with email allowlist auth, overview, users/orgs, queue, candidate debug, and system health.                                                      |

---

## User Review Required

> [!IMPORTANT]
>
> - **AI Strategy**: Use **Sarvam AI** for all evaluations and descriptions.
> - **Infrastructure**: Use **Redis** for rate limiting and BullMQ.
> - **UI/UX**: **Industrial-minimal AI dashboard aesthetic** (Linear/Vercel style).
> - **Strategy**: Launch Phase 1 (Landing/Waitlist) while building the Core MVP.

---

### Visual Identity (Premium Monochrome)

- **Aesthetic**: Industrial-minimal (Linear/Vercel style). Calm, technical, precise, monochrome base.
- **Theme**: Unified Monochrome with Light/Dark toggle.
- **Light Palette**:
  - **Background**: `#FFFFFF` | **Secondary**: `#F8FAFC` | **Card**: `#FFFFFF` | **Border**: `#E5E7EB`
  - **Text**: `#0F172A` (Prim), `#64748B` (Sec), `#94A3B8` (Muted)
  - **Accent**: `#2563EB` (Used sparingly for links/active states)
- **Dark Palette**:
  - **Background**: `#0B0B0C` | **Secondary**: `#111113` | **Card**: `#18181B` | **Border**: `#27272A`
  - **Text**: `#FAFAFA` (Prim), `#A1A1AA` (Sec), `#71717A` (Muted)
  - **Accent**: `#3B82F6` (Used sparingly)
- **Typography**: Inter (High whitespace, grid-based).
- **Hero Cinematic Layers**:
  1. **Base Foundation**: Soft dark neutral (Dark) / Pure white (Light).
  2. **Diagonal Grid**: Faint dotted lines for structural signals.
  3. **Animated Beams**: Slow, monochrome monochrome streaks (Calm motion).
  4. **Diagonal Shadow Planes**: Layered dimension for "cinematic" feel.
  5. **Content Focus**: Perfectly centered headline, sub-headline, and CTAs.
  6. **Preview Card**: Product dashboard emerging from the bottom.

### Sections (Final Layout)

1.  **Cinematic Hero**: "Evidence-based hiring, not resume guessing." (Centered focus) + monochrome beams + preview card.
2.  **Problem Section**: Monochrome 3-card grid (Resume noise, scattered evidence, manual overhead).
3.  **Solution Section**: "Orizen Flow fixes this." Multi-source analysis (GitHub, Portfolios) displayed in structured clean cards.
4.  **How it Works**: Simple 3-step visualization (Create Job -> Candidate Applies -> AI Evaluates).
5.  **Feature Highlights**: Grid layout (AI Evaluation, Multi-source Analysis, Pipeline Dashboard, Evidence Insights).
6.  **Product Preview**: High-fidelity dashboard screenshot with label: "Built for modern hiring teams."
7.  **Waitlist CTA**: Centered, clean "Join Early Access" section.
8.  **Footer**: Minimalist (Orizen Flow, AI Hiring CRM, Contact, Privacy).

### Tech Logic

- **API**: `POST /api/waitlist/join` with Zod validation & rate limiting (hono-rate-limiter).
- **Email**: ✅ `resend.emails.send()` with "Welcome to Orizen Flow" HTML template (non-blocking, graceful fallback if no API key).
- **SEO**: Dynamic Metadata: `title`, `description`, `og:image`.
- **Database**: `waitlist` table: `id`, `email`, `name`, `ip`, `status`, `createdAt`, `updatedAt`.

---

## Phase 2: The AI Hiring CRM (Core Modules)

### Module 1: Candidate Application (Public)

- **Page**: ✅ `/:orgSlug/:jobSlug` with dynamic organization context (name + profile details). Legacy `/:orgSlug/:jobSlug/:id` redirects to the clean URL.
- **Validation**: ✅ Synchronous `HEAD` request for resumes + HoneyPot for bots.
- **Success**: ✅ Clear "Application Submitted" confirmation.

### Module 2: Authentication & Job Management (HR)

- **Auth**: ✅ Signup/Login/Logout with session management (Better Auth, GitHub/Google/Magic Link).
- **Job Creation**: ✅ Full-page create form (`/dashboard/jobs/new`) with 12-row description textarea, job type select (remote/hybrid/on-site), optional salary range, breadcrumb navigation. **AI Description Generator** (via Sarvam AI) pending.
- **Job Detail**: ✅ Dedicated detail page (`/dashboard/jobs/[id]`) with two-column layout — formatted JD (whitespace-pre-wrap) + sidebar with inline status selector and metadata.
- **Job Edit**: ✅ Full-page edit form (`/dashboard/jobs/[id]/edit`) with hiring status selector (draft/open/closed/filled), pre-filled fields, breadcrumb navigation.
- **Jobs Listing**: ✅ Status filter tabs (All, Actively Hiring, Draft, Closed, Filled) with count badges. Delete confirmation via AlertDialog.
- **Job CRUD API**: ✅ `POST/GET/PUT/DELETE /api/v1/jobs` — org-scoped from session. Hono `validator` middleware for proper RPC type inference.

### Module 3: AI Evaluation (Worker)

- **Parsers**: `pdf-parse` for text and hyperlink extraction. GitHub scraper for repos/languages (Cached 7 days).
- **AI Logic (Sarvam AI)**: Input (Resume + Job Desc + Evidence) -> Output (MatchLevel, Score, Summary, Strengths, Weaknesses, Recommendation).

### Module 4: HR Dashboard (CRM)

- **Analytics**: Feedback Charts (New candidates per day, Match level distribution) using Recharts.
- **Views**: Candidate applications table (live data) is implemented. Kanban board (Applied -> Hired) and Candidate Profile with AI evidence sidebar/notes are pending.

---

## Phase 3: Admin Dashboard & Launch Strategy

### Module 5: Admin Dashboard (System Control)

- **Route**: ✅ `/admin` (admin-only, platform scope).
- **Access Control**: ✅ `ADMIN_EMAILS` env allowlist enforced in both API middleware and web route guard.
- **Sections**: ✅ Overview, Users & Organizations, Queue Monitoring, Candidate Debug View (`/admin/candidates/[id]`), System Health.
- **API Surface**: ✅ `/api/v1/admin/*` read-only endpoints:
  - `GET /overview`
  - `GET /users-orgs`
  - `GET /queue`
  - `GET /candidates/:id/debug`
  - `GET /health`
- **Safety Model**: ✅ Read-only admin v1 (no write/mutation actions).

### Module 6: Launch Day Strategy & Email

- **Email System**: Resend for batch conversion from the waitlist with exponential backoff.

---

## Phase 4: Essential & Differentiators (v1 & v2)

- **v1**: Search, Duplicate detection, Resume preview, Timeline.
- **v2**: Role-Adaptive logic, Skill extraction, Evidence strength, AI Comparison.

---

## Directory Structure

```
orizen-flow/
├── apps/
│   ├── web/              # Next.js 16 (Landing, Dashboard, Auth)
│   ├── api/              # Hono (API + Auth + Jobs CRUD)
│   └── worker/           # BullMQ (AI + Parsing) — not yet created
├── packages/
│   ├── db/               # Drizzle Schema (auth, waitlist, jobs)
│   ├── auth/             # Better Auth Config
│   ├── config/           # Shared Env (@t3-oss/env-core)
│   ├── tsconfig/         # Shared TypeScript Configs
│   ├── queue/            # BullMQ Config — not yet created
│   ├── ai/               # Sarvam AI Client — not yet created
│   └── parsers/          # Resume/GitHub Parsers — not yet created
└── docker-compose.yml    # Postgres, Redis, Services
```

## Verification Plan

### Automated Tests

- `turbo run build`, `turbo run check-types`.

### Manual Verification

- Test responsive Hero and Waitlist flow.
- Verify batch emailing script logic in staging.
