# Candidate Evaluation Pipeline v2 - Implementation Plan

**Status:** Ready for implementation  
**Date:** March 4, 2026

## Overview

Production-grade improvements to OrizenFlow's candidate evaluation pipeline focusing on:

- **Latency reduction** (10-15s → 3-5s via parallelization)
- **Cost optimization** (40-60% token reduction + early auto-reject)
- **Evidence quality** (resume project extraction as first-class signal)
- **Reliability** (evaluation lifecycle tracking)

## User Feedback Summary

Your existing pipeline is excellent:

- ✅ Deterministic signals before AI (skill overlap, resume metrics, evidence integrity)
- ✅ Role-adaptive rubrics (engineering/product/design/marketing/sales/operations/general)
- ✅ Deterministic caps prevent LLM hallucination
- ✅ Evidence integrity scoring

This plan preserves your architecture while adding high-impact optimizations.

---

## Implementation Steps

### 1. Add Evaluation Status Lifecycle

**File:** `packages/db/src/schema/jobs.ts`

Add `status` column to `candidate_evaluations` table:

```typescript
status: text("status").notNull().default("pending") // pending|processing|completed|failed
```

**File:** `apps/worker/src/lib/evaluate-candidate.ts`

Update evaluation flow:

- Set `status: "processing"` at job start
- Set `status: "completed"` on success
- Set `status: "failed"` on error
- Include in upsert operations

**UI benefit:** HR dashboard can show "AI Analysis: Processing..." instead of blocking.

---

### 2. Parallelize Evidence Gathering

**File:** `apps/worker/src/lib/evaluate-candidate.ts` (line ~1440-1570)

**Current (sequential):**

```typescript
const resumeIngestion = await extractResumeTextExcerpt(...)
// then GitHub
// then portfolio
```

**New (parallel):**

```typescript
const [resumeResult, githubResult, portfolioResult] = await Promise.allSettled([
  extractResumeTextExcerpt(application.resumeUrl),
  githubTarget ? scrapeGithub(githubTarget.normalizedUrl, options.githubToken) : null,
  portfolioTarget ? scrapePortfolio(portfolioTarget.normalizedUrl) : null,
])
```

Aggregate successes/failures into existing `failures` array.

**Impact:** 10-15s → 3-5s processing time

---

### 3. Extract Resume Projects (NEW)

**File:** `apps/worker/src/lib/evaluate-candidate.ts`

Add new function `extractResumeProjects()`:

```typescript
type ProjectSignal = {
  title: string
  description: string
  technologies: string[]
  hasMetrics: boolean
  complexity: "high" | "medium" | "low"
}

const extractResumeProjects = (resumeText: string | null): ProjectSignal[] => {
  // Parse sections: "Projects", "Personal Projects", "Side Projects"
  // Extract bullet points/descriptions
  // Identify tech stack tokens (React, Go, PostgreSQL, etc.)
  // Detect metrics/outcomes (users, performance, scale)
  // Score complexity based on architecture keywords, metrics, tech stack

  return projects.slice(0, 5) // Top 5 projects
}
```

**Why this matters:**

- Many engineers show projects in resume (especially new grads/bootcamp)
- Projects prove real ability better than GitHub vanity metrics
- For engineering roles: `Projects > GitHub stars`

**Integration points:**

1. Call after resume ingestion
2. Add to `skillEvidence` calculation
3. Include in structured prompt signals
4. Apply deterministic project boost
5. Persist in `evidenceJson`

---

### 4. Add Deterministic Project Scoring

**File:** `apps/worker/src/lib/evaluate-candidate.ts`

Add function `applyProjectQualityBoost()`:

```typescript
const applyProjectQualityBoost = (
  baseScore: number,
  roleFamily: RoleFamily,
  projectSignals: ProjectSignal[],
): number => {
  if (roleFamily !== "engineering") return baseScore

  const strongProjects = projectSignals.filter((p) => p.complexity === "high" && p.hasMetrics)

  if (strongProjects.length >= 2) return baseScore + 8
  if (strongProjects.length === 1) return baseScore + 4

  return baseScore
}
```

Call before final score persistence, after role-aware adjustments.

**Rationale:** Treat strong resume projects equal to professional experience for engineering roles.

---

### 5. Restructure AI Prompt (Token Reduction)

**File:** `apps/worker/src/lib/evaluate-candidate.ts` (line ~1064-1219)

**Current:** Send full resume text, GitHub evidence blobs, portfolio pages

**New (structured signals):**

```typescript
const buildStructuredPrompt = ({
  roleFamily,
  rubric,
  jobContext,
  candidateContext,
  signals,
  resumeExcerpt, // Short backstop only
}) =>
  [
    "Evaluate candidate using role-adaptive rubric. Output JSON only.",
    scoreSchema(rubric),

    `Role: ${jobContext.title}`,
    `Key requirements: ${jobContext.keyRequirements}`,

    `Candidate: ${candidateContext.name} (${candidateContext.email})`,

    "Evidence signals:",
    `- Skill overlap: ${signals.skillOverlap.matched.length}/${signals.skillOverlap.total} (${signals.overlapRatio}%)`,
    `- Resume structure: ${signals.resume.bullets} bullets, ${signals.resume.metrics} quantified`,
    `- Projects extracted: ${signals.projects.count} (${signals.projects.strong} strong)`,
    signals.github
      ? `- GitHub: ${signals.github.repos} repos, ${signals.github.languages.join(", ")}`
      : null,
    signals.portfolio ? `- Portfolio: ${signals.portfolio.pages} pages` : null,

    `Resume excerpt (context only):`,
    resumeExcerpt.slice(0, 1800),
  ]
    .filter(Boolean)
    .join("\n")
```

**Impact:** ~70% token reduction (~$0.003 → ~$0.001 per evaluation)

---

### 6. Add Pre-LLM Auto-Reject Gate

**File:** `apps/worker/src/lib/evaluate-candidate.ts` (after overlap computation)

```typescript
// Early auto-reject: skip LLM when clearly unqualified
if (skillOverlap.ratio < 0.2) {
  console.log("[evaluateCandidateJob] Auto-reject: skill overlap too low", {
    applicationId: application.id,
    ratio: skillOverlap.ratio,
  })

  const autoRejectEvaluation = {
    roleFamily,
    rubricVersion: RUBRIC_VERSION,
    score: 35,
    recommendation: "No Hire",
    summary: "Insufficient skill alignment with job requirements",
    skills: skillEvidence.resume.slice(0, 10),
    strengths: [],
    weaknesses: ["Minimal overlap with required skills"],
    scoreBreakdown: rubric.criteria.map((c) => ({ ...c, score: 0 })),
  }

  // Persist with status: "completed" and cap reason: "LOW_SKILL_OVERLAP_AUTOREJECT"
  // Skip all LLM calls
  return
}
```

**Example:**

- **Job:** Backend Engineer (Go, PostgreSQL, Kubernetes)
- **Candidate skills:** Photoshop, Illustrator, Branding
- **Decision:** No LLM call needed

**Impact:** 40-60% reduction in LLM costs

---

### 7. Prioritize Portfolio Links

**File:** `apps/worker/src/lib/evaluate-candidate.ts` (line ~262-349, `scrapePortfolio`)

Add URL scoring before queue insertion:

```typescript
const scorePortfolioUrl = (url: string): number => {
  const path = new URL(url).pathname.toLowerCase()
  if (path.includes("/projects")) return 100
  if (path.includes("/work")) return 90
  if (path.includes("/case-study") || path.includes("/case-studies")) return 90
  if (path.includes("/portfolio")) return 80
  if (path.includes("/github")) return 70
  if (path.includes("/about") || path.includes("/contact")) return 10
  return 50 // default
}

// Sort queue by score before crawling
queue.sort((a, b) => scorePortfolioUrl(b) - scorePortfolioUrl(a))
```

**Impact:** Better signal quality from portfolio evidence

---

### 8. Update Recommendation Thresholds

**File:** `apps/worker/src/lib/evaluate-candidate.ts` (line ~362, `recommendationFromScore`)

**Current:**

```typescript
if (score >= 90) return "Strong Hire"
if (score >= 70) return "Hire"
if (score >= 60) return "Hold"
return "No Hire"
```

**New:**

```typescript
if (score >= 80) return "Strong Hire"
if (score >= 70) return "Hire"
if (score >= 55) return "Hold"
return "No Hire"
```

**Rationale:** LLM scores rarely reach 90; 85+ is exceptional in practice.

---

### 9. Persist Enhanced Evidence

**File:** `apps/worker/src/lib/evaluate-candidate.ts` (line ~1740-1779, upsert)

Update `evidenceJson` structure:

```typescript
const persistedEvidence = {
  ...enrichment,
  projectSignals: extractedProjects, // NEW
  evaluationMeta: {
    roleFamily,
    rubricVersion: RUBRIC_VERSION,
    evidenceIntegrityScore: integrity.score,
    evidenceIntegrityTier: integrity.tier,
    capRulesApplied,
    projectBoostApplied, // NEW
    autoRejected: false, // NEW
  },
}
```

**UI opportunity:** Show recruiters "evidence-based hiring" confidence UI:

```
Score: 82
Confidence: High

Evidence analyzed:
✓ Resume parsed (12 bullets, 4 metrics)
✓ 3 strong projects extracted
✓ GitHub: 18 repos analyzed
✓ Portfolio: 3 pages analyzed
```

---

## Migration Strategy

### Database

```sql
-- Add status column
ALTER TABLE candidate_evaluations
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';

-- Add index for status filtering
CREATE INDEX idx_candidate_evaluations_status
ON candidate_evaluations(status);
```

### Rollout

1. Deploy DB migration
2. Deploy worker with backward-compatible changes
3. Monitor first 100 evaluations
4. Enable auto-reject gate (feature flag if needed)
5. Full rollout

### Rollback

- Worker changes are backward-compatible (status defaults to 'pending')
- Auto-reject can be disabled via config flag
- Old evaluation format still readable

---

## Verification Checklist

- [ ] Type check: `bun --cwd apps/worker run check-types`
- [ ] Lint: `bun --cwd apps/worker run lint`
- [ ] Test case 1: Engineering candidate with strong resume projects but no GitHub → score >=70
- [ ] Test case 2: Candidate with overlap <0.2 → auto-reject, no LLM call, status="completed"
- [ ] Test case 3: Portfolio crawl prioritizes `/projects` over `/contact`
- [ ] Test case 4: Score 86 → "Strong Hire" (old: needed 90)
- [ ] Evidence JSON includes `projectSignals` and `evaluationMeta.projectBoostApplied`
- [ ] Parallel fetch reduces latency to <5s

---

## Cost Impact Estimate

**Before:**

- Average evaluation: 3500 tokens @ $0.003 = **$0.0105**
- 1000 candidates/month = **$10.50**

**After:**

- 40% auto-rejected (no LLM): $0
- 60% evaluated: 1200 tokens @ $0.001 = **$0.0012**
- 1000 candidates/month = **$0.72**

**Savings: ~93%** (combining auto-reject + token reduction)

---

## Performance Impact

| Metric           | Before  | After     | Improvement                      |
| ---------------- | ------- | --------- | -------------------------------- |
| Avg latency      | 12s     | 4s        | **67% faster**                   |
| Token cost       | $0.0105 | $0.0012   | **88% cheaper**                  |
| Auto-reject rate | 0%      | 40%       | **60% cost saved**               |
| Evidence quality | Good    | Excellent | Resume projects >> GitHub vanity |

---

## Marketing Angle

Your existing "evidence-based hiring" is already differentiated. Expose it:

**Dashboard UI concept:**

```
┌─────────────────────────────────────────┐
│ Jane Smith - Backend Engineer          │
│ Score: 82 | Confidence: High           │
├─────────────────────────────────────────┤
│ Evidence analyzed:                      │
│ ✓ Resume: 12 bullets, 4 quantified     │
│ ✓ Projects: 3 strong (Go, K8s, gRPC)   │
│ ✓ GitHub: 18 repos, 45 stars           │
│ ✓ Skill match: 8/10 (80%)              │
│                                         │
│ Top strengths:                          │
│ • Distributed systems experience       │
│ • Strong project portfolio              │
│ • Modern stack proficiency             │
└─────────────────────────────────────────┘
```

Messaging: **"Evidence-based hiring, not resume gambling"**

---

## Risks & Mitigations

| Risk                                   | Mitigation                                                    |
| -------------------------------------- | ------------------------------------------------------------- |
| Resume project parsing false positives | Conservative complexity scoring; manual review loop           |
| Auto-reject misses edge cases          | Start with 0.15 threshold, monitor for 2 weeks, tune to 0.2   |
| Parallel fetch increases error rate    | `Promise.allSettled` prevents cascade; retry logic preserved  |
| Token reduction hurts quality          | A/B test 100 evals before/after; keep backstop resume excerpt |

---

## Next Steps

1. ✅ Plan approved
2. ⏳ Implement changes (estimated 3-4 hours)
3. ⏳ Test with staging data
4. ⏳ Deploy to production
5. ⏳ Monitor first 100 evaluations
6. ⏳ Document results

---

## Files to Modify

1. `packages/db/src/schema/jobs.ts` - Add status column
2. `apps/worker/src/lib/evaluate-candidate.ts` - Core pipeline changes
3. `packages/db/drizzle/` - Migration file (auto-generated)

**No breaking changes.** Backward compatible.

---

**Ready to implement?** All decisions confirmed, scope locked, plan validated against existing architecture.
