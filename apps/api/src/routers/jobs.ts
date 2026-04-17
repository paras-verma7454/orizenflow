import type { Session } from "@packages/auth"

import { db, jobs, organization } from "@packages/db"
import { and, desc, eq } from "drizzle-orm"
import { Hono } from "hono"
import { validator } from "hono/validator"
import { describeRoute, resolver } from "hono-openapi"
import { SarvamAIClient } from "sarvamai"
import { z } from "zod"

import { parseAiJsonLoose } from "@/lib/ai"
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
  return slugify(title) || "job"
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
      const shortId = generateShortId()
      const [inserted] = await db
        .insert(jobs)
        .values({
          ...jobData,
          shortId,
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
        "Create a professional job description based on the provided hiring context.",
        "Your response MUST be a valid JSON object with the following fields:",
        '- "title": A concise job title.',
        '- "description": A detailed description in Markdown (lists, etc.).',
        '- "salaryRange": A realistic salary range string.',
        "",
        "Description Rules:",
        "1. Include sections: About the Role, Responsibilities, Requirements, Nice to Have, Benefits.",
        "2. Put a blank line before each section title.",
        "3. Use bullet points for lists.",
        "4. DO NOT use markdown headings (no # symbols). Just use bold for titles.",
        "",
        "Field Specifics:",
        "- title: Do NOT include the location in the title.",
        `- salaryRange: Use local standards for ${data.location ?? "the requested location"}. Format like '$100k - $150k/yr' or '₹10k/month'.`,
        "",
        "Work Details:",
        `- Type: ${data.jobType ?? "specified in context"}`,
        `- Location: ${data.location ?? "specified in context"}`,
        data.salaryRange ? `- Requested Range: ${data.salaryRange}` : "",
        "",
        "HIRING CONTEXT:",
        data.context,
      ].filter(Boolean).join("\n")

      let completion;
      try {
        completion = await sarvamClient.chat.completions({
          model: "sarvam-30b",
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You are an expert recruiter. You MUST return ONLY a valid JSON object. No conversational text, no <think> blocks, no markdown code fences.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        })
      } catch (error) {
        console.error("Sarvam AI Connection Error:", error)
        return c.json({ error: { code: "AI_ERROR", message: "Failed to connect to AI service" } }, 502)
      }

      const content = completion.choices?.[0]?.message?.content
      
      if (!content) {
        console.error("Sarvam AI Empty Response:", JSON.stringify(completion, null, 2))
        return c.json({ error: { code: "AI_ERROR", message: "AI model returned an empty response" } }, 502)
      }

      // console.log("AI Response Content:", content)

      const parsedJson = parseAiJsonLoose(content)
      if (parsedJson === null) {
        console.error("AI Parse Error. Content was:", content)
        return c.json({ error: { code: "AI_PARSE_ERROR", message: "Failed to parse AI response into JSON" } }, 502)
      }

      const result = z
        .object({
          title: z.string().min(1),
          description: z.string().min(1),
          salaryRange: z.string().optional(),
        })
        .safeParse(parsedJson)

      if (!result.success) {
        console.error("AI Schema Validation Error:", result.error.format(), "Content was:", content)
        return c.json({ error: { code: "AI_PARSE_ERROR", message: "AI response did not match expected schema" } }, 502)
      }

      const sanitized = {
        title: result.data.title,
        salaryRange: result.data.salaryRange,
        description: stripMarkdownHeadingHashes(result.data.description),
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
        .select({ slug: jobs.slug, title: jobs.title })
        .from(jobs)
        .where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId)))

      if (!existing) {
        return c.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, 404)
      }

      const { questions, ...jobData } = data

      // Auto-regenerate slug if title is being updated
      const newSlug = data.title && data.title !== existing.title
        ? createJobSlug(data.title)
        : existing.slug || createJobSlug(existing.title)

      const [updated] = await db
        .update(jobs)
        .set({
          ...jobData,
          ...(questions ? { questionsJson: JSON.stringify(questions) } : {}),
          slug: newSlug,
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
