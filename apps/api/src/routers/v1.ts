import type { Session } from "@packages/auth"

import { createCandidateEvaluationQueue } from "@packages/queue"
import { env } from "@packages/env/api-hono"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { validator } from "hono/validator"
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm"
import { SarvamAIClient } from "sarvamai"
import { z } from "zod"

import { authMiddleware } from "@/middlewares"
import { candidateEvaluations, db, jobApplications, jobs, user } from "@packages/db"

const CANDIDATE_STATUSES = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const
const candidateStatusSchema = z.enum(CANDIDATE_STATUSES)

const sessionSchema = z.object({
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  expiresAt: z.string().meta({ format: "date-time", example: "2026-01-28T13:06:25.712Z" }),
  id: z.string().meta({ example: "6kpGKXeJAKfB4MERWrfdyFdKd1ZB0Czo" }),
  ipAddress: z.string().nullable().meta({ example: "202.9.121.21" }),
  token: z.string().meta({ example: "Ds8MdODZSgu57rbR8hzapFlcv6IwoIgD" }),
  updatedAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  userAgent: z.string().nullable().meta({ example: "Mozilla/5.0 Chrome/143.0.0.0 Safari/537.36" }),
  userId: z.string().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
})

const userSchema = z.object({
  createdAt: z.string().meta({ format: "date-time", example: "2025-12-17T14:33:40.317Z" }),
  email: z.string().meta({ example: "user@example.com" }),
  emailVerified: z.boolean().meta({ example: true }),
  id: z.string().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  image: z.string().nullable().meta({ example: "https://example.com/avatar.png" }),
  name: z.string().meta({ example: "John Doe" }),
  updatedAt: z.string().meta({ format: "date-time", example: "2025-12-17T14:33:40.317Z" }),
})

const userUpdateSchema = z.object({
  name: z.string().min(1).max(120).meta({ example: "Jane Doe" }),
})

const candidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  resumeUrl: z.string(),
  linkedinUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  portfolioUrl: z.string().nullable(),
  coverLetter: z.string().nullable(),
  status: candidateStatusSchema,
  matchScore: z.number().int().nullable(),
  skillsJson: z.string().nullable(),
  evaluationSummary: z.string().nullable(),
  recommendation: z.string().nullable(),
  evidenceJson: z.string().nullable(),
  createdAt: z.string().meta({ format: "date-time" }),
  job: z.object({
    id: z.string(),
    title: z.string(),
  }),
})

const candidatesQuerySchema = z.object({
  jobId: z.string().optional(),
  status: candidateStatusSchema.optional(),
  q: z.string().trim().min(1).max(120).optional(),
  skills: z.string().trim().min(1).max(200).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
  source: z.enum(["github", "portfolio", "resume"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const semanticSearchSchema = z.object({
  query: z.string().trim().min(3).max(300),
  jobId: z.string().optional(),
  status: candidateStatusSchema.optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  maxScore: z.number().int().min(0).max(100).optional(),
  limit: z.number().int().min(1).max(50).default(20),
})

const updateCandidateStatusSchema = z.object({
  status: candidateStatusSchema,
})

const listCandidatesResponseSchema = z.object({
  data: z.array(candidateSchema),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
  }),
})

const candidateEvaluationSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  jobId: z.string(),
  model: z.string(),
  score: z.number().int().nullable(),
  summary: z.string().nullable(),
  strengthsJson: z.string().nullable(),
  weaknessesJson: z.string().nullable(),
  recommendation: z.string().nullable(),
  evidenceJson: z.string().nullable(),
  aiResponseJson: z.string().nullable(),
  createdAt: z.string().meta({ format: "date-time" }),
  updatedAt: z.string().meta({ format: "date-time" }),
})

const enqueueReviewSchema = z.object({
  force: z.boolean().optional().default(false),
})

const enqueueBulkReviewSchema = z.object({
  jobId: z.string().optional(),
  status: candidateStatusSchema.optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
  force: z.boolean().optional().default(false),
})

const candidateEvaluationQueue = createCandidateEvaluationQueue(process.env.REDIS_URL || "redis://localhost:6379")
const sarvamClient = env.SARVAM_API_KEY ? new SarvamAIClient({ apiSubscriptionKey: env.SARVAM_API_KEY }) : null

export const v1Router = new Hono<{
  Variables: Session
}>()
  .use("/*", authMiddleware)
  .get(
    "/session",
    describeRoute({
      tags: ["v1"],
      description: "Get current session only",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient } from "@/lib/api/client"

const response = await apiClient.v1.session.$get()
const { data } = await response.json()`,
          },
        ],
      } as object),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: sessionSchema })),
            },
          },
        },
      },
    }),
    (c) => {
      const data = c.get("session")
      return c.json({ data })
    },
  )
  .get(
    "/user",
    describeRoute({
      tags: ["v1"],
      description: "Get current user only",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient } from "@/lib/api/client"

const response = await apiClient.v1.user.$get()
const { data } = await response.json()`,
          },
        ],
      } as object),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: userSchema })),
            },
          },
        },
      },
    }),
    (c) => {
      const data = c.get("user")
      return c.json({ data })
    },
  )
  .patch(
    "/user",
    describeRoute({
      tags: ["v1"],
      description: "Update current user's name",
      requestBody: {
        content: {
          "application/json": {
            schema: resolver(userUpdateSchema) as unknown as object,
          },
        },
      },
      responses: {
        200: {
          description: "Updated user data",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: userSchema })),
            },
          },
        },
      },
    }),
    validator("json", (value, c) => {
      const parsed = userUpdateSchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      const payload = c.req.valid("json")
      const authSession = c.get("session")

      const [updated] = await db
        .update(user)
        .set({ name: payload.name })
        .where(eq(user.id, authSession.userId))
        .returning({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })

      if (!updated) {
        return c.json({ error: { code: "NOT_FOUND", message: "User not found" } }, 404)
      }

      return c.json({ data: updated })
    },
  )
  .get(
    "/candidates",
    describeRoute({
      tags: ["v1"],
      description: "List candidate applications for active organization",
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(listCandidatesResponseSchema),
            },
          },
        },
      },
    }),
    validator("query", (value, c) => {
      const parsed = candidatesQuerySchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid query", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      const authSession = c.get("session")
      const orgId = authSession.activeOrganizationId

      if (!orgId) {
        return c.json({
          data: [],
          pagination: { limit: 0, offset: 0, total: 0, hasMore: false },
        })
      }

      const { jobId, status, q, skills, minScore, maxScore, source, dateFrom, dateTo, limit, offset } = c.req.valid("query")
      const filters = [eq(jobApplications.organizationId, orgId)]

      if (jobId) filters.push(eq(jobApplications.jobId, jobId))
      if (status) filters.push(eq(jobApplications.status, status))
      if (typeof minScore === "number") filters.push(gte(candidateEvaluations.score, minScore))
      if (typeof maxScore === "number") filters.push(lte(candidateEvaluations.score, maxScore))
      if (skills) {
        const skillTokens = skills
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean)
        if (skillTokens.length > 0) {
          filters.push(or(...skillTokens.map((token) => ilike(candidateEvaluations.skillsJson, `%${token}%`)))!)
        }
      }
      if (source === "github") {
        filters.push(
          or(
            sql<boolean>`${jobApplications.githubUrl} is not null`,
            ilike(candidateEvaluations.evidenceJson, "%\"github\":{%"),
          )!,
        )
      }
      if (source === "portfolio") {
        filters.push(
          or(
            sql<boolean>`${jobApplications.portfolioUrl} is not null`,
            ilike(candidateEvaluations.evidenceJson, "%\"portfolio\":{%"),
          )!,
        )
      }
      if (source === "resume") {
        filters.push(sql<boolean>`${jobApplications.resumeUrl} is not null`)
      }
      if (dateFrom) filters.push(gte(jobApplications.createdAt, new Date(dateFrom)))
      if (dateTo) filters.push(lte(jobApplications.createdAt, new Date(dateTo)))
      if (q) {
        filters.push(
          or(
            ilike(jobApplications.name, `%${q}%`),
            ilike(jobApplications.email, `%${q}%`),
            ilike(jobApplications.coverLetter, `%${q}%`),
            ilike(candidateEvaluations.resumeTextExcerpt, `%${q}%`),
            ilike(candidateEvaluations.summary, `%${q}%`),
            ilike(candidateEvaluations.skillsJson, `%${q}%`),
          )!,
        )
      }

      const whereClause = and(...filters)

      const data = await db
        .select({
          id: jobApplications.id,
          name: jobApplications.name,
          email: jobApplications.email,
          resumeUrl: jobApplications.resumeUrl,
          linkedinUrl: jobApplications.linkedinUrl,
          githubUrl: jobApplications.githubUrl,
          portfolioUrl: jobApplications.portfolioUrl,
          coverLetter: jobApplications.coverLetter,
          status: jobApplications.status,
          matchScore: candidateEvaluations.score,
          skillsJson: candidateEvaluations.skillsJson,
          evaluationSummary: candidateEvaluations.summary,
          recommendation: candidateEvaluations.recommendation,
          evidenceJson: candidateEvaluations.evidenceJson,
          createdAt: jobApplications.createdAt,
          job: {
            id: jobs.id,
            title: jobs.title,
          },
        })
        .from(jobApplications)
        .leftJoin(candidateEvaluations, eq(candidateEvaluations.applicationId, jobApplications.id))
        .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
        .where(whereClause)
        .orderBy(desc(jobApplications.createdAt))
        .limit(limit)
        .offset(offset)

      const [countResult] = await db
        .select({ total: sql<number>`count(*)` })
        .from(jobApplications)
        .leftJoin(candidateEvaluations, eq(candidateEvaluations.applicationId, jobApplications.id))
        .where(whereClause)

      const total = Number(countResult?.total ?? 0)

      return c.json({
        data,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + data.length < total,
        },
      })
    },
  )
  .get(
    "/candidates/:id",
    describeRoute({
      tags: ["v1"],
      description: "Get a candidate by id",
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: candidateSchema })),
            },
          },
        },
      },
    }),
    async (c) => {
      const authSession = c.get("session")
      const orgId = authSession.activeOrganizationId
      const id = c.req.param("id")

      if (!orgId) {
        return c.json({ error: { code: "NOT_FOUND", message: "Candidate not found" } }, 404)
      }

      const [data] = await db
        .select({
          id: jobApplications.id,
          name: jobApplications.name,
          email: jobApplications.email,
          resumeUrl: jobApplications.resumeUrl,
          linkedinUrl: jobApplications.linkedinUrl,
          githubUrl: jobApplications.githubUrl,
          portfolioUrl: jobApplications.portfolioUrl,
          coverLetter: jobApplications.coverLetter,
          status: jobApplications.status,
          createdAt: jobApplications.createdAt,
          job: {
            id: jobs.id,
            title: jobs.title,
          },
        })
        .from(jobApplications)
        .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
        .where(and(eq(jobApplications.id, id), eq(jobApplications.organizationId, orgId)))

      if (!data) {
        return c.json({ error: { code: "NOT_FOUND", message: "Candidate not found" } }, 404)
      }

      return c.json({ data })
    },
  )
  .get(
    "/candidates/:id/evaluation",
    describeRoute({
      tags: ["v1"],
      description: "Get latest evaluation for candidate application",
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: candidateEvaluationSchema.nullable() })),
            },
          },
        },
      },
    }),
    async (c) => {
      const authSession = c.get("session")
      const orgId = authSession.activeOrganizationId
      const id = c.req.param("id")

      if (!orgId) return c.json({ data: null })

      const [data] = await db
        .select({
          id: candidateEvaluations.id,
          applicationId: candidateEvaluations.applicationId,
          jobId: candidateEvaluations.jobId,
          model: candidateEvaluations.model,
          score: candidateEvaluations.score,
          summary: candidateEvaluations.summary,
          strengthsJson: candidateEvaluations.strengthsJson,
          weaknessesJson: candidateEvaluations.weaknessesJson,
          recommendation: candidateEvaluations.recommendation,
          evidenceJson: candidateEvaluations.evidenceJson,
          aiResponseJson: candidateEvaluations.aiResponseJson,
          createdAt: candidateEvaluations.createdAt,
          updatedAt: candidateEvaluations.updatedAt,
        })
        .from(candidateEvaluations)
        .innerJoin(jobApplications, eq(candidateEvaluations.applicationId, jobApplications.id))
        .where(and(eq(jobApplications.id, id), eq(jobApplications.organizationId, orgId)))
        .orderBy(desc(candidateEvaluations.updatedAt))

      return c.json({ data: data ?? null })
    },
  )
  .post(
    "/candidates/semantic-search",
    describeRoute({
      tags: ["v1"],
      description: "Semantic candidate search over evaluated applications",
      requestBody: {
        content: {
          "application/json": {
            schema: resolver(semanticSearchSchema) as unknown as object,
          },
        },
      },
      responses: {
        200: {
          description: "Ranked candidates",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: z.array(candidateSchema) })),
            },
          },
        },
      },
    }),
    validator("json", (value, c) => {
      const parsed = semanticSearchSchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      const authSession = c.get("session")
      const orgId = authSession.activeOrganizationId
      const { query, jobId, status, minScore, maxScore, limit } = c.req.valid("json")
      if (!orgId) return c.json({ data: [] })

      const filters = [eq(jobApplications.organizationId, orgId)]
      if (jobId) filters.push(eq(jobApplications.jobId, jobId))
      if (status) filters.push(eq(jobApplications.status, status))
      if (typeof minScore === "number") filters.push(gte(candidateEvaluations.score, minScore))
      if (typeof maxScore === "number") filters.push(lte(candidateEvaluations.score, maxScore))

      const candidates = await db
        .select({
          id: jobApplications.id,
          name: jobApplications.name,
          email: jobApplications.email,
          resumeUrl: jobApplications.resumeUrl,
          linkedinUrl: jobApplications.linkedinUrl,
          githubUrl: jobApplications.githubUrl,
          portfolioUrl: jobApplications.portfolioUrl,
          coverLetter: jobApplications.coverLetter,
          status: jobApplications.status,
          matchScore: candidateEvaluations.score,
          skillsJson: candidateEvaluations.skillsJson,
          evaluationSummary: candidateEvaluations.summary,
          recommendation: candidateEvaluations.recommendation,
          evidenceJson: candidateEvaluations.evidenceJson,
          createdAt: jobApplications.createdAt,
          job: {
            id: jobs.id,
            title: jobs.title,
          },
        })
        .from(jobApplications)
        .leftJoin(candidateEvaluations, eq(candidateEvaluations.applicationId, jobApplications.id))
        .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
        .where(and(...filters))
        .orderBy(desc(jobApplications.createdAt))
        .limit(100)

      if (!sarvamClient || candidates.length === 0) return c.json({ data: candidates.slice(0, limit) })

      const prompt = [
        "Rank the following candidates by relevance to the query.",
        "Return strict JSON only in this shape:",
        '{"ids":["candidate_id_1","candidate_id_2"]}',
        `Query: ${query}`,
        `Candidates: ${JSON.stringify(candidates.map((item) => ({
          id: item.id,
          name: item.name,
          job: item.job.title,
          score: item.matchScore,
          skillsJson: item.skillsJson,
          summary: item.evaluationSummary,
          recommendation: item.recommendation,
          coverLetter: item.coverLetter,
        })))}`
      ].join("\n")

      const completion = await sarvamClient.chat.completions({
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "You are a candidate search ranker. Output valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      })

      const content = completion.choices?.[0]?.message?.content ?? ""
      const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "")
      let parsedJson: unknown
      try {
        parsedJson = JSON.parse(cleaned)
      } catch {
        return c.json({ data: candidates.slice(0, limit) })
      }
      const parsed = z.object({ ids: z.array(z.string()) }).safeParse(parsedJson)
      if (!parsed.success) return c.json({ data: candidates.slice(0, limit) })

      const position = new Map(parsed.data.ids.map((id, index) => [id, index]))
      const ranked = [...candidates].sort((a, b) => {
        const aIndex = position.get(a.id) ?? Number.MAX_SAFE_INTEGER
        const bIndex = position.get(b.id) ?? Number.MAX_SAFE_INTEGER
        return aIndex - bIndex
      })

      return c.json({ data: ranked.slice(0, limit) })
    },
  )
  .post(
    "/candidates/:id/review",
    describeRoute({
      tags: ["v1"],
      description: "Queue a candidate review job",
      requestBody: {
        content: {
          "application/json": {
            schema: resolver(enqueueReviewSchema) as unknown as object,
          },
        },
      },
      responses: {
        200: {
          description: "Queued",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  data: z.object({
                    queued: z.boolean(),
                    applicationId: z.string(),
                    force: z.boolean(),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    validator("json", (value, c) => {
      const parsed = enqueueReviewSchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      const authSession = c.get("session")
      const orgId = authSession.activeOrganizationId
      const id = c.req.param("id")
      const { force } = c.req.valid("json")

      if (!orgId) return c.json({ error: { code: "FORBIDDEN", message: "No active organization" } }, 403)

      const [application] = await db
        .select({
          id: jobApplications.id,
          jobId: jobApplications.jobId,
          organizationId: jobApplications.organizationId,
        })
        .from(jobApplications)
        .where(and(eq(jobApplications.id, id), eq(jobApplications.organizationId, orgId)))

      if (!application) {
        return c.json({ error: { code: "NOT_FOUND", message: "Candidate not found" } }, 404)
      }

      try {
        await candidateEvaluationQueue.add(
          "evaluate-candidate",
          {
            applicationId: application.id,
            organizationId: application.organizationId,
            jobId: application.jobId,
            enqueuedAt: new Date().toISOString(),
          },
        {
          jobId: force ? `eval-${application.id}-${Date.now()}` : `eval-${application.id}`,
        },
      )
      } catch (error) {
        const reason = error instanceof Error ? error.message : "QUEUE_ERROR"
        console.error("[queue] enqueue single review failed", { reason })
        return c.json(
          {
            error: {
              code: "QUEUE_UNAVAILABLE",
              message: `Review queue is unavailable. ${reason}`,
            },
          },
          503,
        )
      }

      return c.json({
        data: {
          queued: true,
          applicationId: application.id,
          force,
        },
      })
    },
  )
  .post(
    "/candidates/review-bulk",
    describeRoute({
      tags: ["v1"],
      description: "Queue bulk candidate review jobs",
      requestBody: {
        content: {
          "application/json": {
            schema: resolver(enqueueBulkReviewSchema) as unknown as object,
          },
        },
      },
      responses: {
        200: {
          description: "Queued",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  data: z.object({
                    queued: z.number(),
                    skipped: z.number(),
                    totalSelected: z.number(),
                    force: z.boolean(),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    validator("json", (value, c) => {
      const parsed = enqueueBulkReviewSchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      const authSession = c.get("session")
      const orgId = authSession.activeOrganizationId
      const { force, jobId, status, limit, offset } = c.req.valid("json")

      if (!orgId) return c.json({ error: { code: "FORBIDDEN", message: "No active organization" } }, 403)

      const filters = [eq(jobApplications.organizationId, orgId)]
      if (jobId) filters.push(eq(jobApplications.jobId, jobId))
      if (status) filters.push(eq(jobApplications.status, status))
      const whereClause = and(...filters)

      const rows = await db
        .select({
          id: jobApplications.id,
          jobId: jobApplications.jobId,
          organizationId: jobApplications.organizationId,
          existingEvalId: candidateEvaluations.id,
        })
        .from(jobApplications)
        .leftJoin(candidateEvaluations, eq(candidateEvaluations.applicationId, jobApplications.id))
        .where(whereClause)
        .orderBy(desc(jobApplications.createdAt))
        .limit(limit)
        .offset(offset)

      const selected = force ? rows : rows.filter((row) => row.existingEvalId === null || row.existingEvalId === undefined)
      const jobsToQueue = selected.map((row) => ({
        name: "evaluate-candidate",
        data: {
          applicationId: row.id,
          organizationId: row.organizationId,
          jobId: row.jobId,
          enqueuedAt: new Date().toISOString(),
        },
        opts: {
          jobId: force ? `eval-${row.id}-${Date.now()}` : `eval-${row.id}`,
        },
      }))

      if (jobsToQueue.length > 0) {
        try {
          await candidateEvaluationQueue.addBulk(jobsToQueue)
        } catch (error) {
          const reason = error instanceof Error ? error.message : "QUEUE_ERROR"
          console.error("[queue] enqueue bulk review failed", { reason })
          return c.json(
            {
              error: {
                code: "QUEUE_UNAVAILABLE",
                message: `Review queue is unavailable. ${reason}`,
              },
            },
            503,
          )
        }
      }

      return c.json({
        data: {
          queued: jobsToQueue.length,
          skipped: rows.length - jobsToQueue.length,
          totalSelected: rows.length,
          force,
        },
      })
    },
  )
  .patch(
    "/candidates/:id/status",
    describeRoute({
      tags: ["v1"],
      description: "Update candidate status",
      requestBody: {
        content: {
          "application/json": {
            schema: resolver(updateCandidateStatusSchema) as unknown as object,
          },
        },
      },
      responses: {
        200: {
          description: "Updated candidate",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: candidateSchema })),
            },
          },
        },
      },
    }),
    validator("json", (value, c) => {
      const parsed = updateCandidateStatusSchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      const authSession = c.get("session")
      const orgId = authSession.activeOrganizationId
      const id = c.req.param("id")
      const payload = c.req.valid("json")

      if (!orgId) {
        return c.json({ error: { code: "NOT_FOUND", message: "Candidate not found" } }, 404)
      }

      const [updated] = await db
        .update(jobApplications)
        .set({ status: payload.status, updatedAt: new Date() })
        .where(and(eq(jobApplications.id, id), eq(jobApplications.organizationId, orgId)))
        .returning({ id: jobApplications.id })

      if (!updated) {
        return c.json({ error: { code: "NOT_FOUND", message: "Candidate not found" } }, 404)
      }

      const [data] = await db
        .select({
          id: jobApplications.id,
          name: jobApplications.name,
          email: jobApplications.email,
          resumeUrl: jobApplications.resumeUrl,
          linkedinUrl: jobApplications.linkedinUrl,
          githubUrl: jobApplications.githubUrl,
          portfolioUrl: jobApplications.portfolioUrl,
          coverLetter: jobApplications.coverLetter,
          status: jobApplications.status,
          createdAt: jobApplications.createdAt,
          job: {
            id: jobs.id,
            title: jobs.title,
          },
        })
        .from(jobApplications)
        .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
        .where(and(eq(jobApplications.id, id), eq(jobApplications.organizationId, orgId)))

      if (!data) {
        return c.json({ error: { code: "NOT_FOUND", message: "Candidate not found" } }, 404)
      }

      return c.json({ data })
    },
  )
