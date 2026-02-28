import type { Session } from "@packages/auth"

import { db, jobs, organization } from "@packages/db"
import { and, desc, eq } from "drizzle-orm"
import { Hono } from "hono"
import { validator } from "hono/validator"
import { describeRoute, resolver } from "hono-openapi"
import { SarvamAIClient } from "sarvamai"
import { z } from "zod"

import { generateShortId } from "@/lib/utils"
import { authMiddleware } from "@/middlewares"

const jobQuestionSchema = z.object({
  id: z.string().min(1).max(80),
  prompt: z.string().trim().min(1).max(300),
  required: z.boolean().default(false),
})

const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  status: z.enum(["draft", "open", "closed", "filled"]).default("draft"),
  jobType: z.enum(["remote", "hybrid", "on-site"]).default("on-site"),
  location: z.string().optional(),
  salaryRange: z.string().optional(),
  questions: z.array(jobQuestionSchema).max(20).default([]),
})

const updateJobSchema = createJobSchema.partial()

const generateDescriptionSchema = z.object({
  context: z.string().min(10).max(5000),
  jobType: z.enum(["remote", "hybrid", "on-site"]).optional(),
  location: z.string().optional(),
  salaryRange: z.string().optional(),
})

const sarvamClient = process.env.SARVAM_API_KEY
  ? new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY })
  : null

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)

const createJobSlug = (title: string) => {
  const base = slugify(title)
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6)
  return `${base || "job"}-${suffix}`
}

const stripMarkdownHeadingHashes = (value: string) =>
  value
    .split("\n")
    .map((line) => {
      const match = line.match(/^\s{0,3}#{1,6}\s+(.*)$/)
      return match ? match[1] : line
    })
    .join("\n")

const noActiveOrganizationError = {
  error: {
    code: "NO_ACTIVE_ORGANIZATION",
    message: "Create or select an organization to continue",
  },
} as const

export const jobsRouter = new Hono<{ Variables: Session }>()
  .use("/*", authMiddleware)
  .get(
    "/",
    describeRoute({
      tags: ["jobs"],
      description: "List all jobs for the user's active organization",
      responses: {
        200: {
          description: "List of jobs",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
            },
          },
        },
      },
    }),
    async (c) => {
      const session = c.get("session")
      const orgId = session.activeOrganizationId

      if (!orgId) {
        return c.json(noActiveOrganizationError, 403)
      }

      const data = await db
        .select()
        .from(jobs)
        .where(eq(jobs.organizationId, orgId))
        .orderBy(desc(jobs.createdAt))

      return c.json({ data })
    },
  )
  .post(
    "/",
    describeRoute({
      tags: ["jobs"],
      description: "Create a new job posting",
      responses: {
        201: {
          description: "Job created",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: z.record(z.string(), z.unknown()) })),
            },
          },
        },
      },
    }),
    validator("json", (value, c) => {
      const parsed = createJobSchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      const session = c.get("session")
      const orgId = session.activeOrganizationId

      if (!orgId) {
        return c.json(noActiveOrganizationError, 403)
      }

      const [org] = await db.select().from(organization).where(eq(organization.id, orgId))
      if (!org) {
        return c.json(noActiveOrganizationError, 403)
      }

      const data = c.req.valid("json")
      const { questions, ...jobData } = data
      const [inserted] = await db
        .insert(jobs)
        .values({
          ...jobData,
          shortId: generateShortId(),
          questionsJson: JSON.stringify(questions),
          slug: createJobSlug(data.title),
          organizationId: orgId,
        })
        .returning()

      return c.json({ data: inserted }, 201)
    },
  )
  .post(
    "/generate-description",
    describeRoute({
      tags: ["jobs"],
      description: "Generate a job title and description using Sarvam AI",
      responses: {
        200: {
          description: "Generated job content",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  data: z.object({
                    title: z.string(),
                    description: z.string(),
                    salaryRange: z.string().optional(),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    validator("json", (value, c) => {
      const parsed = generateDescriptionSchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      if (!sarvamClient) {
        return c.json({ error: { code: "CONFIG_ERROR", message: "SARVAM_API_KEY is not configured" } }, 500)
      }

      const data = c.req.valid("json")

      const prompt = [
        "Generate a high-quality job posting from the provided hiring context.",
        "Return valid JSON only (no markdown block, no explanation) using this exact shape:",
        '{"title":"...","description":"...","salaryRange":"..."}',
        "Description must include sections: About the Role, Responsibilities, Requirements, Nice to Have, Benefits.",
        "Do not use markdown heading syntax like #, ##, or ### anywhere in the description.",
        "Keep title concise and don't mention job location in title . The salaryRange should be a string like '$100k - $150k/yr' or '₹10k/month  or 12LPA' based on job location if location is not given use USA standard and market-standard based on the job location and type if present like if it's a india job can't give USA standard salary etc.",
        "",
        "IMPORTANT: Consider these work arrangement details:",
        `- Work Type: ${data.jobType ?? "not specified"} - ${data.jobType === "remote" ? "Fully remote position" : data.jobType === "hybrid" ? "Mix of remote and office work" : "On-site at office location"}`,
        `- Location: ${data.location ?? "not specified"}${data.location ? " - Mention this prominently in the description" : ""}`,
        data.salaryRange ? `- Salary Range: ${data.salaryRange}` : "",
        "",
        "Hiring Context:",
        data.context,
      ].filter(line => line !== undefined).join("\n")

      const completion = await sarvamClient.chat.completions({
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are an expert technical recruiter. You must return valid JSON only, matching the exact requested schema.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      })

      const content = completion.choices?.[0]?.message?.content
      if (!content) {
        return c.json({ error: { code: "AI_ERROR", message: "No response from AI model" } }, 502)
      }

      const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "")
      let parsedJson: unknown
      try {
        parsedJson = JSON.parse(cleaned)
      } catch {
        return c.json({ error: { code: "AI_PARSE_ERROR", message: "Failed to parse AI response" } }, 502)
      }

      const parsed = z
        .object({
          title: z.string().min(1),
          description: z.string().min(1),
          salaryRange: z.string().optional(),
        })
        .safeParse(parsedJson)

      if (!parsed.success) {
        return c.json({ error: { code: "AI_PARSE_ERROR", message: "Failed to parse AI response" } }, 502)
      }

      const sanitized = {
        ...parsed.data,
        description: stripMarkdownHeadingHashes(parsed.data.description),
      }

      return c.json({ data: sanitized })
    },
  )
  .get(
    "/:id",
    describeRoute({
      tags: ["jobs"],
      description: "Get a job by ID",
      responses: {
        200: {
          description: "Job details",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: z.record(z.string(), z.unknown()) })),
            },
          },
        },
      },
    }),
    async (c) => {
      const id = c.req.param("id")
      const session = c.get("session")
      const orgId = session.activeOrganizationId

      if (!orgId) {
        return c.json(noActiveOrganizationError, 403)
      }

      const [data] = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId)))

      if (!data) {
        return c.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, 404)
      }

      return c.json({ data })
    },
  )
  .put(
    "/:id",
    describeRoute({
      tags: ["jobs"],
      description: "Update a job posting",
      responses: {
        200: {
          description: "Job updated",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: z.record(z.string(), z.unknown()) })),
            },
          },
        },
      },
    }),
    validator("json", (value, c) => {
      const parsed = updateJobSchema.safeParse(value)
      if (!parsed.success) {
        return c.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
          400,
        )
      }
      return parsed.data
    }),
    async (c) => {
      const id = c.req.param("id")
      const session = c.get("session")
      const orgId = session.activeOrganizationId

      if (!orgId) {
        return c.json(noActiveOrganizationError, 403)
      }

      const data = c.req.valid("json")
      const [existing] = await db
        .select({ slug: jobs.slug })
        .from(jobs)
        .where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId)))

      if (!existing) {
        return c.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, 404)
      }

      const { questions, ...jobData } = data
      const [updated] = await db
        .update(jobs)
        .set({
          ...jobData,
          ...(questions ? { questionsJson: JSON.stringify(questions) } : {}),
          slug: existing.slug || createJobSlug(data.title || "job"),
          updatedAt: new Date(),
        })
        .where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId)))
        .returning()

      if (!updated) {
        return c.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, 404)
      }

      return c.json({ data: updated })
    },
  )
  .delete(
    "/:id",
    describeRoute({
      tags: ["jobs"],
      description: "Delete a job posting",
      responses: {
        200: {
          description: "Job deleted",
        },
      },
    }),
    async (c) => {
      const id = c.req.param("id")
      const session = c.get("session")
      const orgId = session.activeOrganizationId

      if (!orgId) {
        return c.json(noActiveOrganizationError, 403)
      }

      const [data] = await db
        .delete(jobs)
        .where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId)))
        .returning()

      if (!data) {
        return c.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, 404)
      }

      return c.json({ data: { message: "Job deleted" } })
    },
  )
