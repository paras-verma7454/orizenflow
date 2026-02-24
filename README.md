# Orizen Flow

Orizen Flow is an evidence-based AI candidate evaluation engine and modern ATS, built as a Bun + Turborepo monorepo. It combines a public hiring surface, recruiter workflows, and an admin control panel with a type-safe API stack.

## What's Implemented

- Landing page with waitlist flow
- Waitlist API: `POST /api/waitlist/join` with validation, duplicate handling, and non-blocking welcome email flow
- Authentication with Better Auth (GitHub, Google, Magic Link)
- Org-scoped Job CRUD (`/api/v1/jobs`) and recruiter dashboard pages
- Public job application flow at `/:orgSlug/:jobSlug` with validation, anti-bot controls, and legacy route redirect support
- Admin dashboard at `/admin` with allowlist access control and read-only admin APIs

## Next Up

- Worker-driven candidate processing (BullMQ + Redis)
- AI evaluation pipeline using Sarvam AI
- Pipeline/Kanban hiring workflow (Applied -> Hired)

## Tech Stack

- Runtime and monorepo: Bun + Turborepo
- Frontend: Next.js (`apps/web`)
- API: Hono (`apps/api`)
- Worker: Bun worker app (`apps/worker`)
- Database: PostgreSQL + Drizzle ORM (`packages/db`)
- Auth: Better Auth (`packages/auth`)
- Queueing: Redis + BullMQ (`packages/queue`)
- Env validation: `@packages/env` from `packages/config`
- Email: Resend
- AI provider: Sarvam AI

## Monorepo Structure

```text
.
|- apps/
|  |- api/      # Hono backend
|  |- web/      # Next.js frontend
|  `- worker/   # Background jobs
`- packages/
   |- auth/     # Shared auth
   |- config/   # Environment validation (exports as @packages/env)
   |- db/       # Drizzle schema and database access
   |- queue/    # Queue definitions and helpers
   `- tsconfig/ # Shared TypeScript config
```

## Prerequisites

- Bun `1.3.7` (or compatible)
- PostgreSQL
- Redis

## Quick Start

```bash
bun install
cp .env.example .env

bun run db:generate
bun run db:migrate

bun dev
```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- API docs: `http://localhost:4000/api/docs`

## Environment Variables

Copy `.env.example` to `.env` and set at least:

- `POSTGRES_URL`
- `REDIS_URL`
- `BETTER_AUTH_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and/or `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `HONO_APP_URL`, `HONO_TRUSTED_ORIGINS`

Optional integrations and controls:

- `SARVAM_API_KEY`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `ADMIN_EMAILS`
- `WORKER_CONCURRENCY`
- `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_USERJOT_URL`

## Scripts

- `bun dev` - Start all workspace dev servers
- `bun run build` - Build all packages/apps
- `bun run start` - Start production processes for workspace packages/apps
- `bun run lint` - Run lint tasks
- `bun run check-types` - Run TypeScript checks
- `bun run format` - Format files with Oxfmt
- `bun run format:check` - Check formatting without rewriting
- `bun run db:generate` - Generate Drizzle migrations
- `bun run db:migrate` - Apply Drizzle migrations
- `bun run db:push` - Push schema changes directly
- `bun run db:studio` - Open Drizzle Studio

## Roadmap (Concise)

- v1: search, duplicate detection, resume preview, candidate timeline, complete worker-based evaluation flow
- v2: role-adaptive scoring, skill extraction, evidence strength scoring, AI candidate comparison

## Repository

GitHub: [paras-verma7454/orizenflow](https://github.com/paras-verma7454/orizenflow)

Boilerplate base: [nrjdalal/zerostarter](https://github.com/nrjdalal/zerostarter)
