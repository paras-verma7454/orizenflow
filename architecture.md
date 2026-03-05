# Orizen Flow Architecture

Orizen Flow is a next-generation Applicant Tracking System (ATS) built with a modern, type-safe full-stack monorepo architecture. Below is a comprehensive architectural diagram outlining how the different applications, packages, and external services interact within the system.

## System Architecture Diagram

```mermaid
flowchart TB
    %% External Users
    subgraph Users ["👤 End Users"]
        Candidate("Candidates")
        Recruiter("Recruiters / Hiring Managers")
        Admin("System Admins")
    end

    %% Frontend App
    subgraph Frontend ["🖥️ Apps (Web)"]
        NextJS("Next.js 15 (apps/web)<br>UI, Dashboards, Job Board")
    end

    %% Backend Services
    subgraph Backend ["⚙️ Apps (API & Background)"]
        HonoAPI("Hono API (apps/api)<br>Core REST & Type-Safe RPC")
        Worker("Bun Worker (apps/worker)<br>Background Job Processor")
    end

    %% Shared Packages
    subgraph Packages ["📦 Shared Packages"]
        PkgAuth("@packages/auth<br>Better Auth Config")
        PkgDB("@packages/db<br>Drizzle ORM & Schema")
        PkgQueue("@packages/queue<br>BullMQ Job Definitions")
        PkgConfig("@packages/config<br>Type-safe Env Vars")
        PkgEmail("@packages/email<br>Email Templates")
    end

    %% Data Stores
    subgraph Data ["💾 Data Stores"]
        Postgres[(PostgreSQL<br>Database)]
        Redis[(Redis<br>Cache & BullMQ)]
    end

    %% External Services
    subgraph External ["🌐 External Services"]
        OAuth("OAuth Providers<br>GitHub / Google")
        Resend("Resend<br>Transactional Emails")
        Sarvam("Sarvam AI<br>Resume Parsing & Eval")
        Analytics("PostHog / Userjot<br>Analytics & Feedback")
    end

    %% Workflows & Connections
    Candidate -->|"Views Jobs / Applies"| NextJS
    Recruiter -->|"Manages Jobs & Candidates"| NextJS
    Admin -->|"System Config"| NextJS

    NextJS -->|"Type-Safe RPC Calls"| HonoAPI
    NextJS -.->|"Telemetry"| Analytics

    HonoAPI <-->|"Auth Checks"| PkgAuth
    PkgAuth <-->|"Validates Logins"| OAuth
    HonoAPI <-->|"Reads/Writes"| PkgDB
    PkgDB <-->|"Query/Mutate"| Postgres

    HonoAPI -->|"Enqueues Jobs"| PkgQueue
    PkgQueue -->|"Stores Jobs"| Redis

    Redis -->|"Job Polling"| Worker
    Worker <-->|"Reads/Writes"| PkgDB
    Worker -->|"Extracts Template"| PkgEmail
    PkgEmail -->|"Sends via"| Resend
    Worker <-->|"Evaluates Resumes (Multi-lingual)"| Sarvam

    %% Package usage associations
    HonoAPI -.- PkgConfig
    NextJS -.- PkgConfig
    Worker -.- PkgConfig

    classDef specific fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff
    class NextJS,HonoAPI,Worker specific

    classDef package fill:#334155,stroke:#10b981,stroke-width:2px,color:#fff
    class PkgAuth,PkgDB,PkgQueue,PkgConfig,PkgEmail package

    classDef database fill:#0f172a,stroke:#f59e0b,stroke-width:2px,color:#fff
    class Postgres,Redis database

    classDef external fill:#475569,stroke:#64748b,stroke-width:2px,stroke-dasharray: 5 5,color:#fff
    class OAuth,Resend,Sarvam,Analytics external

    classDef user fill:#64748b,stroke:#cbd5e1,stroke-width:2px,color:#fff
    class Candidate,Recruiter,Admin user
```

## Data Flow & Workflow

1. **User Interaction**: Users (Candidates, Recruiters, Admins) interact with the **Next.js frontend**.
2. **API Communication**: The frontend invokes the backend using a strongly-typed RPC client hooked into the **Hono API**.
3. **Authentication**: The API securely authenticates requests via **Better Auth** (configured in `@packages/auth`), integrating with GitHub/Google OAuth.
4. **Data Persistence**: Synchronous operations (fetching jobs, creating entries) are handled immediately via **Drizzle ORM** (`@packages/db`) to **PostgreSQL**.
5. **Background Processing**: For heavy tasks like Candidate Resume Parsing or Email notifications:
   - The Hono API enqueues a job into **Redis** via **BullMQ** (`@packages/queue`).
   - The dedicated **Bun Worker** picks up the job.
   - The worker integrates with **Sarvam AI** for advanced, multi-lingual resume parsing and scoring.
   - If a notification D --> E["Playwright-Based Validation"] D --> E["Playwright-Based Validation"] is needed, the worker constructs the email with `@packages/email` and dispatches it via **Resend**.
