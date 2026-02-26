import type { Session } from "@packages/auth"

import { BUILD_VERSION } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { createCandidateEvaluationQueue } from "@packages/queue"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { validator } from "hono/validator"
import { z } from "zod"

import { adminMiddleware, authMiddleware } from "@/middlewares"
import { candidateEvaluations, db, jobApplications, jobs, member, organization, user, waitlist } from "@packages/db"
import { EmailService } from "@packages/email"

const emailService =
  env.RESEND_API_KEY && env.RESEND_FROM_EMAIL
    ? new EmailService({ apiKey: env.RESEND_API_KEY, from: env.RESEND_FROM_EMAIL })
    : null

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const appIdParamSchema = z.object({
  id: z.string().min(1),
})

const queue = env.REDIS_URL ? createCandidateEvaluationQueue(env.REDIS_URL) : null

const getQueueSnapshot = async () => {
  if (!queue) {
    return {
      connected: false,
      counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 },
      oldestWaitingAgeSeconds: null as number | null,
    }
  }

  try {
    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))

    return await (Promise.race([
      (async () => {
        const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused")
        const [oldestWaitingJob] = await queue.getJobs(["waiting"], 0, 0, true)
        const oldestWaitingAgeSeconds = oldestWaitingJob
          ? Math.max(0, Math.floor((Date.now() - oldestWaitingJob.timestamp) / 1000))
          : null

        return {
          connected: true,
          counts: {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
            paused: counts.paused ?? 0,
          },
          oldestWaitingAgeSeconds,
        }
      })(),
      timeout(1000),
    ]) as Promise<any>)
  } catch {
    return {
      connected: false,
      counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 },
      oldestWaitingAgeSeconds: null as number | null,
    }
  }
}

export const adminRouter = new Hono<{ Variables: Session }>()
  .use("/*", authMiddleware, adminMiddleware)
  .get(
    "/overview",
    describeRoute({
      tags: ["admin"],
      description: "Get platform overview metrics",
      responses: {
        200: {
          description: "Overview metrics",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  data: z.object({
                    totals: z.object({
                      users: z.number(),
                      organizations: z.number(),
                      jobs: z.number(),
                      applications: z.number(),
                      evaluations: z.number(),
                    }),
                    jobsByStatus: z.array(z.object({ status: z.string(), count: z.number() })),
                    applicationsByStatus: z.array(z.object({ status: z.string(), count: z.number() })),
                    evaluations: z.object({
                      averageScore: z.number().nullable(),
                      completedLast24Hours: z.number(),
                    }),
                    queue: z.object({
                      connected: z.boolean(),
                      counts: z.object({
                        waiting: z.number(),
                        active: z.number(),
                        completed: z.number(),
                        failed: z.number(),
                        delayed: z.number(),
                        paused: z.number(),
                      }),
                      oldestWaitingAgeSeconds: z.number().nullable(),
                      queuedLast24HoursProxy: z.number(),
                    }),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    async (c) => {
      const [
        totalUsersRow,
        totalOrganizationsRow,
        totalJobsRow,
        totalApplicationsRow,
        totalEvaluationsRow,
        jobsStatusRows,
        applicationsStatusRows,
        avgScoreRow,
        appsLast24HoursRow,
        evaluationsLast24HoursRow,
        queueSnapshot,
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(user),
        db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(organization),
        db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(jobs),
        db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(jobApplications),
        db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(candidateEvaluations),
        db
          .select({ status: jobs.status, count: sql<number>`count(*)`.mapWith(Number) })
          .from(jobs)
          .groupBy(jobs.status)
          .orderBy(jobs.status),
        db
          .select({ status: jobApplications.status, count: sql<number>`count(*)`.mapWith(Number) })
          .from(jobApplications)
          .groupBy(jobApplications.status)
          .orderBy(jobApplications.status),
        db
          .select({
            averageScore: sql<number | null>`avg(${candidateEvaluations.score})::numeric`,
          })
          .from(candidateEvaluations),
        db
          .select({ count: sql<number>`count(*)`.mapWith(Number) })
          .from(jobApplications)
          .where(sql`${jobApplications.createdAt} >= NOW() - INTERVAL '24 hours'`),
        db
          .select({ count: sql<number>`count(*)`.mapWith(Number) })
          .from(candidateEvaluations)
          .where(sql`${candidateEvaluations.updatedAt} >= NOW() - INTERVAL '24 hours'`),
        getQueueSnapshot(),
      ])

      const averageScoreRaw = avgScoreRow[0]?.averageScore
      const averageScore =
        typeof averageScoreRaw === "number"
          ? Number(averageScoreRaw.toFixed(2))
          : averageScoreRaw === null
            ? null
            : Number(averageScoreRaw)

      return c.json({
        data: {
          totals: {
            users: totalUsersRow[0]?.count ?? 0,
            organizations: totalOrganizationsRow[0]?.count ?? 0,
            jobs: totalJobsRow[0]?.count ?? 0,
            applications: totalApplicationsRow[0]?.count ?? 0,
            evaluations: totalEvaluationsRow[0]?.count ?? 0,
          },
          jobsByStatus: jobsStatusRows.map((row) => ({
            status: row.status ?? "unknown",
            count: row.count,
          })),
          applicationsByStatus: applicationsStatusRows.map((row) => ({
            status: row.status ?? "unknown",
            count: row.count,
          })),
          evaluations: {
            averageScore: Number.isFinite(averageScore as number) ? (averageScore as number) : null,
            completedLast24Hours: evaluationsLast24HoursRow[0]?.count ?? 0,
          },
          queue: {
            ...queueSnapshot,
            queuedLast24HoursProxy: appsLast24HoursRow[0]?.count ?? 0,
          },
        },
      })
    },
  )
  .get(
    "/users-orgs",
    describeRoute({
      tags: ["admin"],
      description: "List users and organization memberships",
      responses: {
        200: {
          description: "Memberships list",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  data: z.array(
                    z.object({
                      membershipId: z.string(),
                      role: z.string(),
                      createdAt: z.string().nullable(),
                      user: z.object({
                        id: z.string(),
                        name: z.string(),
                        email: z.string(),
                        image: z.string().nullable(),
                      }),
                      organization: z.object({
                        id: z.string(),
                        name: z.string(),
                        slug: z.string(),
                      }),
                    }),
                  ),
                  pagination: z.object({
                    limit: z.number(),
                    offset: z.number(),
                    total: z.number(),
                    hasMore: z.boolean(),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    validator("query", (value, c) => {
      const parsed = listQuerySchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      const { limit, offset } = c.req.valid("query")

      const [rows, total] = await Promise.all([
        db
          .select({
            membershipId: member.id,
            role: member.role,
            createdAt: member.createdAt,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userImage: user.image,
            organizationId: organization.id,
            organizationName: organization.name,
            organizationSlug: organization.slug,
          })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .innerJoin(organization, eq(member.organizationId, organization.id))
          .orderBy(desc(member.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(member),
      ])
      const totalCount = total[0]?.count ?? 0

      return c.json({
        data: rows.map((row) => ({
          membershipId: row.membershipId,
          role: row.role,
          createdAt: row.createdAt ? row.createdAt.toISOString() : null,
          user: {
            id: row.userId,
            name: row.userName,
            email: row.userEmail,
            image: row.userImage,
          },
          organization: {
            id: row.organizationId,
            name: row.organizationName,
            slug: row.organizationSlug,
          },
        })),
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + rows.length < totalCount,
        },
      })
    },
  )
  .get(
    "/organizations",
    describeRoute({
      tags: ["admin"],
      description: "List all organizations",
      responses: {
        200: {
          description: "Organizations list",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  data: z.array(
                    z.object({
                      id: z.string(),
                      name: z.string(),
                      slug: z.string(),
                      logo: z.string().nullable(),
                      createdAt: z.string().nullable(),
                      jobCount: z.number(),
                      jobs: z.array(
                        z.object({
                          id: z.string(),
                          title: z.string(),
                          status: z.string(),
                          createdAt: z.string().nullable(),
                        }),
                      ),
                    }),
                  ),
                  pagination: z.object({
                    limit: z.number(),
                    offset: z.number(),
                    total: z.number(),
                    hasMore: z.boolean(),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    validator("query", (value, c) => {
      const parsed = listQuerySchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      const { limit, offset } = c.req.valid("query")

      const [rows, total] = await Promise.all([
        db
          .select({
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            logo: organization.logo,
            createdAt: organization.createdAt,
          })
          .from(organization)
          .orderBy(desc(organization.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(organization),
      ])
      const organizationIds = rows.map((row) => row.id)
      const jobsRows = organizationIds.length
        ? await db
          .select({
            id: jobs.id,
            title: jobs.title,
            status: jobs.status,
            organizationId: jobs.organizationId,
            createdAt: jobs.createdAt,
          })
          .from(jobs)
          .where(inArray(jobs.organizationId, organizationIds))
          .orderBy(desc(jobs.createdAt))
        : []

      const jobsByOrganization = jobsRows.reduce<Record<string, typeof jobsRows>>((acc, job) => {
        if (!acc[job.organizationId]) {
          acc[job.organizationId] = []
        }
        acc[job.organizationId].push(job)
        return acc
      }, {})
      const totalCount = total[0]?.count ?? 0

      return c.json({
        data: rows.map((row) => {
          const orgJobs = jobsByOrganization[row.id] ?? []
          return {
            ...row,
            createdAt: row.createdAt ? row.createdAt.toISOString() : null,
            jobCount: orgJobs.length,
            jobs: orgJobs.map((job) => ({
              id: job.id,
              title: job.title,
              status: job.status ?? "unknown",
              createdAt: job.createdAt ? job.createdAt.toISOString() : null,
            })),
          }
        }),
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + rows.length < totalCount,
        },
      })
    },
  )
  .get(
    "/waitlist",
    describeRoute({
      tags: ["admin"],
      description: "List waitlist entries",
      responses: {
        200: {
          description: "Waitlist entries list",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  data: z.array(
                    z.object({
                      id: z.string(),
                      email: z.string(),
                      status: z.string(),
                      createdAt: z.string().nullable(),
                    }),
                  ),
                  pagination: z.object({
                    limit: z.number(),
                    offset: z.number(),
                    total: z.number(),
                    hasMore: z.boolean(),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    validator("query", (value, c) => {
      const parsed = listQuerySchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      const { limit, offset } = c.req.valid("query")

      const [rows, total] = await Promise.all([
        db
          .select({
            id: waitlist.id,
            email: waitlist.email,
            status: waitlist.status,
            createdAt: waitlist.createdAt,
          })
          .from(waitlist)
          .orderBy(desc(waitlist.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(waitlist),
      ])
      const totalCount = total[0]?.count ?? 0

      return c.json({
        data: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt ? row.createdAt.toISOString() : null,
        })),
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + rows.length < totalCount,
        },
      })
    },
  )
  .get(
    "/queue",
    describeRoute({
      tags: ["admin"],
      description: "Get candidate evaluation queue metrics",
      responses: {
        200: {
          description: "Queue metrics",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  data: z.object({
                    connected: z.boolean(),
                    counts: z.object({
                      waiting: z.number(),
                      active: z.number(),
                      completed: z.number(),
                      failed: z.number(),
                      delayed: z.number(),
                      paused: z.number(),
                    }),
                    oldestWaitingAgeSeconds: z.number().nullable(),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    async (c) => {
      const queueSnapshot = await getQueueSnapshot()
      return c.json({ data: queueSnapshot })
    },
  )
  .get(
    "/candidates/:id/debug",
    describeRoute({
      tags: ["admin"],
      description: "Get candidate application debug payload including raw AI fields",
      responses: {
        200: {
          description: "Candidate debug payload",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  data: z.object({
                    application: z.object({
                      id: z.string(),
                      name: z.string(),
                      email: z.string(),
                      status: z.string(),
                      createdAt: z.string(),
                      resumeUrl: z.string(),
                      job: z.object({
                        id: z.string(),
                        title: z.string(),
                      }),
                      organization: z.object({
                        id: z.string(),
                        name: z.string(),
                        slug: z.string(),
                      }),
                    }),
                    evaluation: z
                      .object({
                        id: z.string(),
                        model: z.string(),
                        score: z.number().nullable(),
                        summary: z.string().nullable(),
                        recommendation: z.string().nullable(),
                        resumeTextExcerpt: z.string().nullable(),
                        evidenceJson: z.string().nullable(),
                        aiResponseJson: z.string().nullable(),
                        createdAt: z.string(),
                        updatedAt: z.string(),
                      })
                      .nullable(),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    validator("param", (value, c) => {
      const parsed = appIdParamSchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      const { id } = c.req.valid("param")

      const [application] = await db
        .select({
          id: jobApplications.id,
          name: jobApplications.name,
          email: jobApplications.email,
          status: jobApplications.status,
          createdAt: jobApplications.createdAt,
          resumeUrl: jobApplications.resumeUrl,
          jobId: jobs.id,
          jobTitle: jobs.title,
          organizationId: organization.id,
          organizationName: organization.name,
          organizationSlug: organization.slug,
        })
        .from(jobApplications)
        .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
        .innerJoin(organization, eq(jobApplications.organizationId, organization.id))
        .where(eq(jobApplications.id, id))

      if (!application) {
        return c.json({ error: { code: "NOT_FOUND", message: "Candidate application not found" } }, 404)
      }

      const [evaluation] = await db
        .select({
          id: candidateEvaluations.id,
          model: candidateEvaluations.model,
          score: candidateEvaluations.score,
          summary: candidateEvaluations.summary,
          recommendation: candidateEvaluations.recommendation,
          resumeTextExcerpt: candidateEvaluations.resumeTextExcerpt,
          evidenceJson: candidateEvaluations.evidenceJson,
          aiResponseJson: candidateEvaluations.aiResponseJson,
          createdAt: candidateEvaluations.createdAt,
          updatedAt: candidateEvaluations.updatedAt,
        })
        .from(candidateEvaluations)
        .innerJoin(jobApplications, eq(candidateEvaluations.applicationId, jobApplications.id))
        .where(and(eq(candidateEvaluations.applicationId, id), eq(jobApplications.id, id)))
        .orderBy(desc(candidateEvaluations.updatedAt))

      return c.json({
        data: {
          application: {
            id: application.id,
            name: application.name,
            email: application.email,
            status: application.status,
            createdAt: application.createdAt.toISOString(),
            resumeUrl: application.resumeUrl,
            job: {
              id: application.jobId,
              title: application.jobTitle,
            },
            organization: {
              id: application.organizationId,
              name: application.organizationName,
              slug: application.organizationSlug,
            },
          },
          evaluation: evaluation
            ? {
              id: evaluation.id,
              model: evaluation.model,
              score: evaluation.score,
              summary: evaluation.summary,
              recommendation: evaluation.recommendation,
              resumeTextExcerpt: evaluation.resumeTextExcerpt,
              evidenceJson: evaluation.evidenceJson,
              aiResponseJson: evaluation.aiResponseJson,
              createdAt: evaluation.createdAt.toISOString(),
              updatedAt: evaluation.updatedAt.toISOString(),
            }
            : null,
        },
      })
    },
  )
  .get(
    "/health",
    describeRoute({
      tags: ["admin"],
      description: "Get system health with database and redis status",
      responses: {
        200: {
          description: "Health status",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  data: z.object({
                    status: z.enum(["ok", "degraded"]),
                    environment: z.string(),
                    version: z.string(),
                    checks: z.object({
                      db: z.enum(["ok", "down"]),
                      redis: z.enum(["ok", "down", "not_configured"]),
                      queue: z.enum(["ok", "down", "not_configured"]),
                    }),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    async (c) => {
      let dbStatus: "ok" | "down" = "ok"
      let redisStatus: "ok" | "down" | "not_configured" = queue ? "ok" : "not_configured"
      let queueStatus: "ok" | "down" | "not_configured" = queue ? "ok" : "not_configured"

      try {
        await db.execute(sql`select 1`)
      } catch {
        dbStatus = "down"
      }

      if (queue) {
        const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))

        try {
          await Promise.race([
            (async () => {
              const client = await queue.client
              const pingResponse = await client.ping()
              if (pingResponse !== "PONG") redisStatus = "down"
            })(),
            timeout(1000),
          ])
        } catch {
          redisStatus = "down"
        }

        try {
          await Promise.race([queue.waitUntilReady(), timeout(1000)])
        } catch {
          queueStatus = "down"
        }

        if (redisStatus === "down") queueStatus = "down"
      }

      const status = dbStatus === "ok" && redisStatus !== "down" && queueStatus !== "down" ? "ok" : "degraded"

      return c.json({
        data: {
          status,
          environment: env.NODE_ENV,
          version: BUILD_VERSION,
          checks: {
            db: dbStatus,
            redis: redisStatus,
            queue: queueStatus,
          },
        },
      })
    },
  )
  .post(
    "/waitlist/send-live-now",
    describeRoute({
      tags: ["admin"],
      description: "Send live-now email to all waitlisted users",
      responses: {
        200: {
          description: "Emails queued for sending",
          content: {
            "application/json": {
              schema: resolver(z.object({ success: z.boolean(), count: z.number() })),
            },
          },
        },
        500: {
          description: "Failed to send emails",
        },
      },
    }),
    async (c) => {
      if (!emailService) {
        return c.json({ error: "Email service not configured" }, 500)
      }

      const pendingUsers = await db.select().from(waitlist).where(eq(waitlist.status, "pending"))

      if (pendingUsers.length === 0) {
        return c.json({ success: true, count: 0, message: "No pending users to notify" })
      }

      // Send emails in parallel (or we could use a queue for better reliability)
      // For now, doing it simple.
      const results = await Promise.allSettled(
        pendingUsers.map(async (u) => {
          await emailService.sendLiveNowEmail(u.email)
          await db.update(waitlist).set({ status: "invited" }).where(eq(waitlist.id, u.id))
        }),
      )

      const successCount = results.filter((r) => r.status === "fulfilled").length

      return c.json({ success: true, count: successCount })
    },
  )
