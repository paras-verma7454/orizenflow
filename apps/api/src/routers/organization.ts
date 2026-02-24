import type { Session } from "@packages/auth"

import { db, member, organization, session } from "@packages/db"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"
import { validator } from "hono/validator"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import { authMiddleware } from "@/middlewares"

const organizationProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  websiteUrl: z.url().optional(),
  linkedinUrl: z.url().optional(),
  tagline: z.string().max(180).optional(),
  about: z.string().max(2000).optional(),
})

const bootstrapOrganizationSchema = z.object({
  name: z.string().min(1).max(120),
  websiteUrl: z.url().optional(),
  linkedinUrl: z.url().optional(),
  tagline: z.string().max(180).optional(),
  about: z.string().max(2000).optional(),
}).refine((value) => Boolean(value.websiteUrl || value.linkedinUrl), {
  message: "Provide website URL or LinkedIn URL",
  path: ["websiteUrl"],
})

const noActiveOrganizationError = {
  error: {
    code: "NO_ACTIVE_ORGANIZATION",
    message: "Create or select an organization to continue",
  },
} as const

const parseMetadata = (raw: string | null) => {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>
    return {}
  } catch {
    return {}
  }
}

const toProfileResponse = (org: { id: string; slug: string; name: string; logo: string | null; metadata: string | null }) => {
  const metadata = parseMetadata(org.metadata)
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    logo: org.logo,
    websiteUrl: typeof metadata.websiteUrl === "string" ? metadata.websiteUrl : null,
    linkedinUrl: typeof metadata.linkedinUrl === "string" ? metadata.linkedinUrl : null,
    tagline: typeof metadata.tagline === "string" ? metadata.tagline : null,
    about: typeof metadata.about === "string" ? metadata.about : null,
  }
}

const toSlug = (name: string) =>
  `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)}-${Date.now().toString(36).slice(-6)}`

export const organizationRouter = new Hono<{ Variables: Session }>()
  .use("/*", authMiddleware)
  .get(
    "/profile",
    describeRoute({
      tags: ["organization"],
      description: "Get active organization profile",
      responses: {
        200: {
          description: "Organization profile",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: z.record(z.string(), z.unknown()) })),
            },
          },
        },
      },
    }),
    async (c) => {
      const authSession = c.get("session")
      const orgId = authSession.activeOrganizationId

      if (!orgId) {
        return c.json(noActiveOrganizationError, 403)
      }

      const [org] = await db
        .select({
          id: organization.id,
          slug: organization.slug,
          name: organization.name,
          logo: organization.logo,
          metadata: organization.metadata,
        })
        .from(organization)
        .where(eq(organization.id, orgId))

      if (!org) {
        return c.json({ error: { code: "NOT_FOUND", message: "Organization not found" } }, 404)
      }

      return c.json({ data: toProfileResponse(org) })
    },
  )
  .put(
    "/profile",
    describeRoute({
      tags: ["organization"],
      description: "Update active organization profile",
      responses: {
        200: {
          description: "Updated organization profile",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: z.record(z.string(), z.unknown()) })),
            },
          },
        },
      },
    }),
    validator("json", (value, c) => {
      const parsed = organizationProfileSchema.safeParse(value)
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

      if (!orgId) {
        return c.json(noActiveOrganizationError, 403)
      }

      const payload = c.req.valid("json")
      const [existing] = await db
        .select({ metadata: organization.metadata })
        .from(organization)
        .where(eq(organization.id, orgId))

      if (!existing) {
        return c.json({ error: { code: "NOT_FOUND", message: "Organization not found" } }, 404)
      }

      const currentMetadata = parseMetadata(existing.metadata)
      const nextMetadata: Record<string, unknown> = {
        ...currentMetadata,
        websiteUrl: payload.websiteUrl,
        linkedinUrl: payload.linkedinUrl,
        tagline: payload.tagline,
        about: payload.about,
      }

      const [updated] = await db
        .update(organization)
        .set({
          ...(payload.name ? { name: payload.name } : {}),
          metadata: JSON.stringify(nextMetadata),
        })
        .where(eq(organization.id, orgId))
        .returning({
          id: organization.id,
          slug: organization.slug,
          name: organization.name,
          logo: organization.logo,
          metadata: organization.metadata,
        })

      return c.json({ data: toProfileResponse(updated) })
    },
  )
  .post(
    "/bootstrap",
    describeRoute({
      tags: ["organization"],
      description: "Create an organization for the current user and set it active",
      responses: {
        201: {
          description: "Organization created",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: z.record(z.string(), z.unknown()) })),
            },
          },
        },
      },
    }),
    validator("json", (value, c) => {
      const parsed = bootstrapOrganizationSchema.safeParse(value)
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

      if (authSession.activeOrganizationId) {
        const [existingOrg] = await db
          .select({
            id: organization.id,
            slug: organization.slug,
            name: organization.name,
            logo: organization.logo,
            metadata: organization.metadata,
          })
          .from(organization)
          .where(eq(organization.id, authSession.activeOrganizationId))

        if (existingOrg) {
          return c.json({ data: toProfileResponse(existingOrg) })
        }
      }

      const [existingMembership] = await db
        .select({ organizationId: member.organizationId })
        .from(member)
        .where(eq(member.userId, authSession.userId))

      if (existingMembership) {
        await db
          .update(session)
          .set({ activeOrganizationId: existingMembership.organizationId })
          .where(and(eq(session.id, authSession.id), eq(session.userId, authSession.userId)))

        const [existingOrg] = await db
          .select({
            id: organization.id,
            slug: organization.slug,
            name: organization.name,
            logo: organization.logo,
            metadata: organization.metadata,
          })
          .from(organization)
          .where(eq(organization.id, existingMembership.organizationId))

        if (existingOrg) {
          return c.json({ data: toProfileResponse(existingOrg) })
        }
      }

      const payload = c.req.valid("json")
      const organizationId = crypto.randomUUID()
      const now = new Date()
      const metadata = JSON.stringify({
        websiteUrl: payload.websiteUrl,
        linkedinUrl: payload.linkedinUrl,
        tagline: payload.tagline,
        about: payload.about,
      })

      const [created] = await db
        .insert(organization)
        .values({
          id: organizationId,
          name: payload.name,
          slug: toSlug(payload.name),
          createdAt: now,
          metadata,
        })
        .returning({
          id: organization.id,
          slug: organization.slug,
          name: organization.name,
          logo: organization.logo,
          metadata: organization.metadata,
        })

      await db.insert(member).values({
        id: crypto.randomUUID(),
        organizationId,
        userId: authSession.userId,
        role: "owner",
        createdAt: now,
      })

      await db
        .update(session)
        .set({ activeOrganizationId: organizationId })
        .where(and(eq(session.id, authSession.id), eq(session.userId, authSession.userId)))

      return c.json({ data: toProfileResponse(created) }, 201)
    },
  )