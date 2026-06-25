# Monorepo → Single Next.js App Migration

## Goal
Convert Turborepo monorepo (Next.js 16 + Hono API + BullMQ worker + 6 packages) into a single Next.js app deployed on Vercel Hobby (free) tier.

## Constraints & Preferences
- Vercel Hobby tier: 10s Serverless Function timeout, no Cron, no Vercel KV, Node.js runtime (not Bun)
- AI evaluation: best-effort with retry button on timeout
- DB driver: `drizzle-orm/postgres-js` (was `drizzle-orm/bun-sql`)
- OG images: `next/og` (was `@takumi-rs/image-response`)
- OpenAPI docs: dropped
- BullMQ / Redis queue: removed — inline Server Actions
- Playwright: removed — fetch-based scraping only
- All shared packages inlined into `lib/`
- Auth: Better Auth via Next.js Route Handler
- Env validation: `@t3-oss/env-nextjs` (was 5 separate `@t3-oss/env-core` schemas)
- Rate limiting: custom in `middleware.ts`
- Worker logic runs as Server Actions with best-effort timeout
- PostHog removed; umami analytics kept

## Progress

### ✅ Done
- Monorepo structure removed — `apps/`, `packages/`, `turbo.json`, Docker files deleted
- `apps/web/*` moved to project root — single Next.js app at root level
- All 34+ pages using Hono RPC `apiClient.v1.*.$get()` pattern now use Proxy-based client mapping to real `/api/*` URLs (`src/lib/api/client.ts`)
- `apiClient` typed as `any` (dynamic Proxy chain cannot be statically typed)
- `isPlatformAdmin` export added to `src/lib/admin.ts` (alias for `isAdminEmail`)
- PostHog removed from `instrumentation-client.ts`, `providers.tsx`, `env.ts`, `package.json`
- Umami analytics script kept in `layout.tsx`
- Server Action: `src/lib/actions/evaluate-candidate.ts` — fetch-based AI evaluation pipeline (SarvamAI, resume text, GitHub API, portfolio scraping)
- Package dependencies consolidated and installed — `bun install` successful
- `tsconfig.json` inlined (no longer extends `@packages/tsconfig/base.json`)
- `env.ts` fixed: removed `clientPrefix` (removed in `@t3-oss/env-nextjs` v0.13.x)
- Added `export const dynamic = "force-dynamic"` to layouts/pages using `auth.api.getSession()` to prevent prerender errors
- Single catch-all API route handler (`app/api/[...catchall]/route.ts`) handles all v1, public, waitlist, admin routing (710+ lines)
- Auth route handler (`app/api/auth/[...all]/route.ts`) set up
- Auth client created (`lib/auth/client.ts`) with `magicLinkClient()` and `organizationClient()` plugins
- Build passes ✅

### Blocked
- Better Auth warns: `Base URL could not be determined` at build time — expected without `BETTER_AUTH_BASE_URL` env var set
- Middleware deprecation warning: `"middleware" file convention is deprecated. Please use "proxy" instead.` — Next.js 16 change, future fix

### Next Steps
1. Verify auth flow end-to-end (sign-in, callback, session) with real env vars
2. Clean up old root monorepo config files (`.coderabbit.yaml`, `lefthook.yml`, etc.)
3. Test lint: `next lint`
4. Test types: `tsc --noEmit`

## Key Decisions
- Single catch-all API route handler avoids splitting into 20+ route files
- Proxy-based `apiClient` recreates Hono RPC chaining interface to avoid rewriting 34+ pages
- `isPlatformAdmin` is a simple alias to `isAdminEmail` — fulfills type contract for admin layouts
- `@t3-oss/env-nextjs` v0.13.x doesn't accept `clientPrefix` — removed
- Auth pages use `force-dynamic` to prevent Next.js from prerendering pages that need server-side session checks
