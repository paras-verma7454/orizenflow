# Orizen Flow

**AI-Powered Candidate Evaluation Engine & Modern ATS**

Orizen Flow is a next-generation Applicant Tracking System (ATS) that combines evidence-based AI candidate evaluation with modern recruitment workflows. Built with Bun, Turborepo, and a type-safe full-stack architecture, it provides organizations with intelligent hiring automation while maintaining human oversight.

🌐 **Live Demo**: [https://orizenflow.luffytaro.me](https://orizenflow.luffytaro.me)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.3.7-black)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://orizenflow.luffytaro.me)

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)
- [What's Implemented](#-whats-implemented)
- [Roadmap](#-roadmap)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact & Support](#-contact--support)

## 🌟 Overview

Orizen Flow streamlines the entire hiring pipeline from job posting to candidate evaluation. It features:

- **Public Job Board** - Beautiful public-facing job listings
- **Smart Application Forms** - Validated application capture with anti-bot protection
- **AI Candidate Evaluation** - Automated resume analysis and skill matching using Sarvam AI
- **Recruiter Dashboard** - Comprehensive hiring workflow management
- **Pipeline Management** - Visual kanban-style candidate tracking (Applied → Screening → Interview → Hired)
- **Admin Control Panel** - Organization-wide settings and access control
- **Background Processing** - Async job queue for email, AI processing, and notifications

## ✨ Key Features

### For Recruiters

- Multi-tenant architecture with org-scoped data isolation
- Job posting and management interface
- Candidate pipeline visualization
- AI-generated candidate insights and scoring
- Resume parsing and skill extraction
- Automated email workflows
- Timeline view of candidate interactions
- Waitlist management for early access
- Role-based access control (Admin, Recruiter, Viewer)
- Bulk operations and candidate search

### For Candidates

- Simple, mobile-friendly application forms
- Real-time validation and feedback
- Upload resume with preview
- Application status tracking
- Privacy-focused data handling

### Technical Highlights

- **Type-Safe API** - Full end-to-end type safety from API to frontend
- **Real-Time Updates** - WebSocket support for live notifications
- **Scalable Architecture** - Microservices with Redis-backed job queues
- **Database Migrations** - Version-controlled schema with Drizzle ORM
- **OAuth Integration** - GitHub, Google, and Magic Link authentication
- **Email Templates** - Branded transactional emails via Resend
- **Analytics** - PostHog integration for product insights

## 🏗️ Architecture

Orizen Flow is built as a **Turborepo monorepo** with separate applications for different concerns:

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                │
│         apps/web - Port 3000                        │
│  • Landing page, waitlist, job board               │
│  • Recruiter dashboard, admin panel                │
│  • Type-safe API client with RPC                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                    API (Hono)                       │
│         apps/api - Port 4000                        │
│  • RESTful endpoints with OpenAPI docs             │
│  • Authentication & authorization                   │
│  • Job & candidate CRUD operations                 │
│  • Queue job dispatching                           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ├──────────────┬──────────────┐
                   ▼              ▼              ▼
         ┌─────────────┐  ┌─────────────┐  ┌──────────┐
         │  PostgreSQL │  │    Redis    │  │  Worker  │
         │  (Drizzle)  │  │  (BullMQ)   │  │ (Background│
         │             │  │             │  │   Jobs)   │
         └─────────────┘  └─────────────┘  └──────────┘
                                                  │
                                                  ▼
                                          ┌───────────────┐
                                          │   Services    │
                                          │ • Sarvam AI   │
                                          │ • Resend      │
                                          │ • Analytics   │
                                          └───────────────┘
```

## 📦 Tech Stack

### Runtime & Build Tools

- **Bun** - Fast JavaScript runtime and package manager
- **Turborepo** - High-performance monorepo build system
- **TypeScript** - Type-safe development across the stack

### Frontend (`apps/web`)

- **Next.js 15** - React framework with App Router
- **TailwindCSS** - Utility-first CSS framework
- **Shadcn/ui** - Re-usable component library
- **Fumadocs** - Documentation site generator
- **Hono RPC Client** - Type-safe API calls

### Backend (`apps/api`)

- **Hono** - Ultrafast web framework
- **Better Auth** - Modern authentication library
- **Drizzle ORM** - TypeScript-first ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching and job queue

### Worker (`apps/worker`)

- **BullMQ** - Redis-based job queue
- **Bun Worker** - Background job processor

### Shared Packages

- `@packages/auth` - Centralized authentication config
- `@packages/db` - Database schema and migrations
- `@packages/config` - Environment variable validation
- `@packages/queue` - Job queue definitions
- `@packages/email` - Email templates
- `@packages/tsconfig` - Shared TypeScript configs

### External Services

- **Sarvam AI** - Indian language AI models for resume analysis
- **Resend** - Transactional email delivery
- **PostHog** - Product analytics and feature flags
- **Userjot** - User feedback collection

## 🚀 Getting Started

### Try the Live Demo

Experience Orizen Flow in action: **[https://orizenflow.luffytaro.me](https://orizenflow.luffytaro.me)**

### Prerequisites

Ensure you have the following installed:

- **Bun** `1.3.7` or later ([install](https://bun.sh))
- **PostgreSQL** `14+` ([install](https://www.postgresql.org/download/))
- **Redis** `7+` ([install](https://redis.io/download))
- **Git**

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/paras-verma7454/orizenflow.git
cd orizenflow
```

2. **Install dependencies**

```bash
bun install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` and configure the following **required** variables:

```env
# Database
POSTGRES_URL=postgresql://user:password@localhost:5432/orizenflow

# Redis
REDIS_URL=redis://localhost:6379

# Auth
BETTER_AUTH_SECRET=your-32-char-secret
BETTER_AUTH_URL=http://localhost:3000

# OAuth (at least one provider)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
# or
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
HONO_APP_URL=http://localhost:4000
HONO_TRUSTED_ORIGINS=http://localhost:3000
```

**Optional** integrations:

```env
# AI Evaluation
SARVAM_API_KEY=your-sarvam-api-key

# Email
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Admin Access
ADMIN_EMAILS=admin@example.com,admin2@example.com

# Worker
WORKER_CONCURRENCY=2

# Analytics
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_USERJOT_URL=your-userjot-url
```

4. **Set up the database**

```bash
# Generate migration files from schema
bun run db:generate

# Apply migrations to database
bun run db:migrate

# Or push schema directly (development only)
bun run db:push
```

5. **Start development servers**

```bash
bun dev
```

This starts all services with Turborepo's TUI:

- **Web** → `http://localhost:3000`
- **API** → `http://localhost:4000`
- **API Docs** → `http://localhost:4000/api/docs`
- **Worker** → Background process

### Development Workflow

```bash
# Start individual apps
bun --cwd apps/web dev    # Next.js only
bun --cwd apps/api dev    # Hono only
bun --cwd apps/worker dev # Worker only

# Build all packages
bun run build

# Type checking
bun run check-types

# Linting
bun run lint

# Formatting
bun run format
bun run format:check

# Database management
bun run db:studio  # Open Drizzle Studio (GUI)
bun run db:generate # Generate new migration
bun run db:migrate  # Run migrations
```

## 🐳 Deployment

Orizen Flow supports multiple deployment strategies:

### Docker Compose (Recommended for VPS)

The simplest way to deploy to a VPS or server:

```bash
# Build images one by one (prevents freezing)
chmod +x build-images.sh
./build-images.sh

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Or use the deployment script
chmod +x docker-deploy.sh
./docker-deploy.sh
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Kubernetes (k3s)

For production deployments with orchestration:

```bash
# Install k3s (on VPS)
curl -sfL https://get.k3s.io | sh -

# Deploy
chmod +x k3s-deploy.sh
./k3s-deploy.sh
```

The script automatically:

- Builds Docker images
- Imports images to k3s
- Converts docker-compose.yml to Kubernetes manifests
- Deploys to k3s cluster
- Creates secrets from .env file

### Vercel + Railway (Serverless)

For individual service deployment:

**Web (Vercel)**

```bash
cd apps/web
vercel
```

**API (Railway)**

```bash
cd apps/api
railway up
```

Configure environment variables in each platform's dashboard.

## 📚 What's Implemented

### ✅ v0.1 - Foundation

- [x] Landing page with waitlist flow
- [x] Waitlist API (`POST /api/waitlist/join`) with validation, duplicate handling
- [x] Non-blocking welcome email sending
- [x] Authentication with Better Auth (GitHub, Google, Magic Link)
- [x] User session management
- [x] Organization model with slug-based routing

### ✅ v0.2 - Core Features

- [x] Org-scoped Job CRUD APIs (`/api/v1/jobs`)
- [x] Recruiter dashboard at `/[orgSlug]/dashboard`
- [x] Job posting interface
- [x] Public job listings at `/[orgSlug]/jobs`
- [x] Job application flow at `/[orgSlug]/[jobSlug]`
- [x] Application validation and anti-bot controls
- [x] Legacy route redirect support
- [x] Admin dashboard at `/admin` with allowlist access control
- [x] Read-only admin APIs for system monitoring

### ✅ v0.3 - Infrastructure

- [x] Redis integration for caching and queues
- [x] BullMQ job queue setup
- [x] Worker service for background processing
- [x] Email queue with Resend integration
- [x] Docker deployment configuration
- [x] Kubernetes (k3s) deployment support

## 🚧 Roadmap

### v0.4 - Candidate Management

- [ ] Candidate profile page
- [ ] Resume upload and parsing
- [ ] Resume preview component
- [ ] Candidate timeline/activity log
- [ ] Bulk candidate operations
- [ ] Advanced candidate search and filtering
- [ ] Duplicate candidate detection

### v0.5 - AI Evaluation

- [ ] Complete worker-based evaluation pipeline
- [ ] Resume text extraction and normalization
- [ ] Skill extraction and categorization
- [ ] Job description analysis
- [ ] Candidate-job matching score
- [ ] Evidence-based scoring system
- [ ] AI-generated candidate summaries

### v0.6 - Pipeline Management

- [ ] Visual kanban board (Applied → Screening → Interview → Hired)
- [ ] Drag-and-drop pipeline stages
- [ ] Stage automation rules
- [ ] Rejection email templates
- [ ] Interview scheduling
- [ ] Collaborative hiring (notes, ratings)

### v1.0 - Production Ready

- [ ] Role-adaptive scoring (weighing skills by job requirements)
- [ ] Multi-language support (Hindi, English using Sarvam AI)
- [ ] Advanced analytics and reporting
- [ ] Candidate comparison tool
- [ ] Export candidate data
- [ ] Audit logs
- [ ] Mobile app (React Native)

### v2.0 - Enterprise Features

- [ ] Multi-region support
- [ ] Custom workflow builder
- [ ] Interview kit generation
- [ ] Video interview integration
- [ ] Background check integrations
- [ ] Offer letter management
- [ ] GDPR compliance tools

## 📖 API Documentation

### Authentication

Orizen Flow uses Better Auth with multiple authentication methods:

- **GitHub OAuth** - Sign in with GitHub
- **Google OAuth** - Sign in with Google
- **Magic Link** - Passwordless email authentication

All API requests require authentication via session cookies or bearer tokens.

### API Endpoints

#### Public Routes

```http
POST /api/waitlist/join
# Join the waitlist
# Body: { email: string, name?: string }

GET /:orgSlug/jobs
# List public jobs for an organization

GET /:orgSlug/:jobSlug
# View public job details
```

#### Authenticated Routes

```http
GET /api/v1/jobs
# List jobs in your organization
# Query: ?limit=10&offset=0&search=developer

POST /api/v1/jobs
# Create a new job
# Body: { title, description, type, location, ... }

GET /api/v1/jobs/:id
# Get job details

PATCH /api/v1/jobs/:id
# Update job

DELETE /api/v1/jobs/:id
# Delete job

POST /api/v1/jobs/:id/applications
# Submit job application
# Body: { name, email, resume, coverLetter, ... }
```

#### Admin Routes

```http
GET /api/admin/stats
# System statistics (admin only)

GET /api/admin/organizations
# List all organizations (admin only)
```

### Type-Safe API Client

The frontend uses Hono's RPC client for fully typed API calls:

```typescript
import { apiClient } from "@/lib/api/client"

// Full TypeScript autocomplete and type checking
const res = await apiClient.v1.jobs.$get({
  query: { limit: "10" },
})
const { data } = await res.json() // Type-safe response
```

API documentation is auto-generated and available at `/api/docs`.

## 🗂️ Project Structure

```
orizenflow/
├── apps/
│   ├── api/                    # Hono backend (Port 4000)
│   │   ├── src/
│   │   │   ├── index.ts       # App entry point
│   │   │   ├── routers/       # API route handlers
│   │   │   │   ├── auth.ts    # Authentication routes
│   │   │   │   ├── jobs.ts    # Job CRUD
│   │   │   │   ├── waitlist.ts
│   │   │   │   └── v1.ts      # Main API router
│   │   │   ├── middlewares/   # Request middleware
│   │   │   │   ├── auth.ts    # Auth verification
│   │   │   │   ├── admin.ts   # Admin guard
│   │   │   │   └── rate-limiter.ts
│   │   │   └── lib/           # Utilities
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web/                    # Next.js frontend (Port 3000)
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   │   ├── (admin)/   # Admin dashboard
│   │   │   │   ├── (protected)/ # Auth required pages
│   │   │   │   ├── [orgSlug]/ # Org-scoped routes
│   │   │   │   ├── api/       # API routes
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx   # Landing page
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # Custom hooks
│   │   │   └── lib/           # Client utilities
│   │   ├── public/            # Static assets
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── worker/                 # Background worker
│       ├── src/
│       │   ├── index.ts       # Worker entry
│       │   └── lib/           # Job processors
│       └── package.json
│
├── packages/
│   ├── auth/                   # Better Auth config
│   │   └── src/index.ts
│   ├── config/                 # Environment validation
│   │   └── src/
│   │       ├── api-hono.ts
│   │       ├── web-next.ts
│   │       ├── worker.ts
│   │       └── db.ts
│   ├── db/                     # Database layer
│   │   ├── drizzle/           # Migration files
│   │   ├── src/
│   │   │   ├── schema/        # Table schemas
│   │   │   └── index.ts       # DB client
│   │   └── drizzle.config.ts
│   ├── email/                  # Email templates
│   │   └── src/
│   │       ├── index.ts
│   │       └── templates.ts
│   ├── queue/                  # Job queue
│   │   └── src/index.ts
│   └── tsconfig/               # Shared TS config
│
├── docker-compose.yml          # Docker orchestration
├── k3s-deploy.sh              # Kubernetes deployment
├── docker-deploy.sh           # Docker deployment
├── build-images.sh            # Build script
├── DEPLOYMENT.md              # Deployment guide
├── CLAUDE.md                  # AI agent instructions
├── AGENTS.md                  # General agent guidelines
├── turbo.json                 # Turborepo config
├── lefthook.yml              # Git hooks
└── package.json               # Root package manifest
```

## 🧪 Testing

```bash
# Run tests (when implemented)
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

## 🔒 Security

- **Environment Variables**: Never commit `.env` files. Use `.env.example` as a template.
- **API Keys**: Store sensitive keys in environment variables only.
- **Authentication**: All authenticated routes are protected by session middleware.
- **Admin Access**: Admin routes check against `ADMIN_EMAILS` allowlist.
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse.
- **CORS**: Configured to allow only trusted origins.
- **SQL Injection**: Drizzle ORM provides parameterized queries.
- **XSS Protection**: React automatically escapes output.

### Reporting Security Issues

Please report security vulnerabilities to: **security@orizenflow.com**

Do not open public GitHub issues for security problems.

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Commit with conventional commits**: `git commit -m "feat: add amazing feature"`
5. **Push to your fork**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `ci:` - CI/CD changes

### Code Style

- Use TypeScript for all new code
- Follow the existing code style (enforced by oxlint)
- Use `@/` path alias for imports when applicable
- Write minimal but necessary comments
- Format code with `bun run format` before committing

### Pre-commit Hooks

Lefthook automatically runs on commit:

- Linting on staged files
- Type checking
- Security audit (on canary branch)
- Commit message validation

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- **Base Template**: [zerostarter](https://github.com/nrjdalal/zerostarter) by [@nrjdalal](https://github.com/nrjdalal)
- **Sarvam AI**: Indian language AI models
- **Vercel**: React and Next.js best practices
- **Bun**: Fast JavaScript runtime and build tools

## 📞 Contact & Support

- **Live Demo**: [https://orizenflow.luffytaro.me](https://orizenflow.luffytaro.me)
- **GitHub**: [@paras-verma7454](https://github.com/paras-verma7454)
- **Repository**: [orizenflow](https://github.com/paras-verma7454/orizenflow)
- **Email**: support@orizenflow.com
- **Issues**: [GitHub Issues](https://github.com/paras-verma7454/orizenflow/issues)

## 📚 Additional Resources

- [Quick Reference Guide](QUICK_REFERENCE.md) - Common commands and troubleshooting
- [Deployment Guide](DEPLOYMENT.md) - Detailed deployment instructions
- [Claude Guide](CLAUDE.md) - AI coding assistant instructions
- [Agent Guidelines](AGENTS.md) - General AI agent guidelines
- [Changelog](CHANGELOG.md) - Version history and changes

---

**Built with ❤️ using Bun, Next.js, Hono, and TypeScript**
