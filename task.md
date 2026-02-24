# Orizen Flow - Master Roadmap

## Phase 1: Core (MVP) - The Launchpad (Weeks 1-3)

- [x] **Restructuring & UI Foundation** <!-- id: 400 -->
  - [x] Monorepo structure: apps/ and packages/ <!-- id: 401 -->
  - [x] UI: Shadcn + Aceternity UI + Framer Motion <!-- id: 402 -->
- [x] **Landing Page & Waitlist** <!-- id: 410 -->
  - [x] Landing UI: Hero (Typewriter), Problems, Solution, How It Works, Features, Product Preview, Waitlist CTA, Footer <!-- id: 411 -->
  - [x] API: waitlist table + Resend Integration + IP tracking <!-- id: 412 -->
- [x] **Auth & Jobs** <!-- id: 420 -->
  - [x] HR Auth: signup/login (Better Auth with GitHub/Google/Magic Link) <!-- id: 421 -->
  - [x] Job Management: Full CRUD with page-based UI (create, detail, edit), status lifecycle (draft/open/closed/filled), job type (remote/hybrid/on-site), status filter tabs with count badges, delete confirmation <!-- id: 422 -->
- [ ] **Public Apply & Worker** <!-- id: 430 -->
  - [x] Public Page: /:orgSlug/:jobSlug (legacy /:orgSlug/:jobSlug/:id redirects) <!-- id: 431 -->
  - [ ] Worker: BullMQ + Redis + Resume/GitHub Parsers <!-- id: 432 -->
  - [ ] AI: **Sarvam AI** Evaluation Engine <!-- id: 433 -->
- [ ] **Final MVP Polish** <!-- id: 440 -->
  - [ ] Recruiter Dashboard & Kanban board <!-- id: 441 -->
  - [ ] Candidate Profile & Pipeline <!-- id: 442 -->

- [ ] **Phase 3: Admin & Analytics** <!-- id: 450 -->
  - [ ] Database: users.role (admin/user) <!-- id: 451 -->
  - [ ] Admin UI: Overview, Users table, Queue monitoring <!-- id: 452 -->
  - [ ] Launch Emailing: Resend Batch System <!-- id: 453 -->

## Phase 4: Essential (v1) - Usability (Weeks 4-5)

- [ ] Search & Filtering <!-- id: 501 -->
- [ ] Duplicate Detection <!-- id: 502 -->
- [ ] Resume Preview & Timeline <!-- id: 503 -->
- [ ] CSV Import <!-- id: 504 -->

## Phase 3: Differentiators (v2) - AI Intel (Weeks 6-7)

- [ ] Role-Adaptive Evaluation <!-- id: 601 -->
- [ ] Skill Extraction & Evidence Strength <!-- id: 602 -->
- [ ] AI Comparison & JD Generator <!-- id: 603 -->

## Phase 4: Advanced (v3) - Scale (Week 8+)

- [ ] Team Collaboration <!-- id: 701 -->
- [ ] Careers Page Generator <!-- id: 702 -->
