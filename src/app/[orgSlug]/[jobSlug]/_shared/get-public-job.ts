import { and, eq, ne } from "drizzle-orm"
import { db, jobs, organization } from "@/lib/db"

function parseMetadata(raw: string | null) {
  if (!raw) return { tagline: null, about: null, websiteUrl: null, linkedinUrl: null }
  try {
    const meta = JSON.parse(raw)
    return {
      tagline: meta.tagline ?? null,
      about: meta.about ?? null,
      websiteUrl: meta.websiteUrl ?? null,
      linkedinUrl: meta.linkedinUrl ?? null,
    }
  } catch {
    return { tagline: null, about: null, websiteUrl: null, linkedinUrl: null }
  }
}

function parseQuestions(questionsJson: string | null) {
  try {
    const q = JSON.parse(questionsJson ?? "[]")
    return Array.isArray(q) ? q : []
  } catch {
    return []
  }
}

export type PublicJobData = {
  id: string
  shortId: string
  title: string
  slug: string
  description: string
  status: string
  jobType: string
  location: string | null
  salaryRange: string | null
  questions: Array<{ id: string; prompt: string; required: boolean }>
  createdAt: string
  organization: {
    id: string
    name: string
    slug: string
    logo: string | null
    tagline: string | null
    about: string | null
    websiteUrl: string | null
    linkedinUrl: string | null
    website?: string | null
    linkedin?: string | null
  }
}

export async function getPublicJobByShortId(shortId: string): Promise<PublicJobData | null> {
  const [data] = await db
    .select({
      id: jobs.id,
      shortId: jobs.shortId,
      title: jobs.title,
      slug: jobs.slug,
      description: jobs.description,
      status: jobs.status,
      jobType: jobs.jobType,
      location: jobs.location,
      salaryRange: jobs.salaryRange,
      questionsJson: jobs.questionsJson,
      createdAt: jobs.createdAt,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        metadata: organization.metadata,
      },
    })
    .from(jobs)
    .innerJoin(organization, eq(jobs.organizationId, organization.id))
    .where(and(eq(jobs.shortId, shortId), ne(jobs.status, "draft")))

  if (!data) return null

  const meta = parseMetadata(data.organization.metadata)
  return {
    ...data,
    questions: parseQuestions(data.questionsJson),
    createdAt: data.createdAt.toISOString(),
    organization: {
      id: data.organization.id,
      name: data.organization.name,
      slug: data.organization.slug,
      logo: data.organization.logo,
      tagline: meta.tagline ?? null,
      about: meta.about ?? null,
      websiteUrl: meta.websiteUrl ?? null,
      linkedinUrl: meta.linkedinUrl ?? null,
      website: meta.websiteUrl ?? null,
      linkedin: meta.linkedinUrl ?? null,
    },
  }
}
