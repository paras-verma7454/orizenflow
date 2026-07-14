import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, gte, ilike, lte, ne, or, sql } from "drizzle-orm"
import { SarvamAIClient } from "sarvamai"
import { z } from "zod"

import { db, candidateEvaluations, jobApplications, jobs, member, organization, session as sessionTable, user, waitlist } from "@/lib/db"
import { auth } from "@/lib/auth"
import { env } from "@/lib/env"
import { EmailService } from "@/lib/email"
import { isAdminEmail } from "@/lib/admin"
import { isPrivateOrInternalUrl } from "@/lib/url-utils"
import { evaluateCandidate } from "@/lib/actions/evaluate-candidate"
import { extractFirstJson, parseAiJsonLoose, withRetry } from "@/lib/ai"

const sarvamClient = env.SARVAM_API_KEY ? new SarvamAIClient({ apiSubscriptionKey: env.SARVAM_API_KEY }) : null

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf")
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  return text.slice(0, 10000)
}
const emailService = env.RESEND_API_KEY ? new EmailService() : null

const CANDIDATE_STATUSES = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const
type CandidateStatus = (typeof CANDIDATE_STATUSES)[number]

function generateShortId(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  const randomBytes = new Uint8Array(length)
  crypto.getRandomValues(randomBytes)
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length]
  }
  return result
}

function parseMetadata(raw: string | null) {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>
    return {}
  } catch {
    return {}
  }
}

async function getAuthSession() {
  const session = await auth.api.getSession({ headers: new Headers() })
  if (!session) return null
  return session
}

function errorResponse(code: string, message: string, status: number, issues?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(issues ? { issues } : {}) } },
    { status },
  )
}

export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl
  const segments = pathname.replace(/^\/api\//, "").split("/").filter(Boolean)

  try {
    if (segments[0] === "health") {
      return NextResponse.json({ data: { message: "ok", version: "0.0.13", environment: env.NODE_ENV } })
    }

    if (segments[0] === "v1") {
      return await handleV1Get(request, segments.slice(1))
    }

    if (segments[0] === "public") {
      return await handlePublicGet(request, segments.slice(1))
    }

    if (segments[0] === "waitlist") {
      return await handleWaitlistGet(request, segments.slice(1))
    }

    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, { status: 404 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal Server Error" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { pathname } = request.nextUrl
  const segments = pathname.replace(/^\/api\//, "").split("/").filter(Boolean)

  try {
    if (segments[0] === "v1") {
      return await handleV1Post(request, segments.slice(1))
    }

    if (segments[0] === "public") {
      return await handlePublicPost(request, segments.slice(1))
    }

    if (segments[0] === "waitlist") {
      return await handleWaitlistPost(request, segments.slice(1))
    }

    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, { status: 404 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal Server Error" } }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const { pathname } = request.nextUrl
  const segments = pathname.replace(/^\/api\//, "").split("/").filter(Boolean)

  try {
    if (segments[0] === "v1") {
      return await handleV1Patch(request, segments.slice(1))
    }

    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, { status: 404 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal Server Error" } }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { pathname } = request.nextUrl
  const segments = pathname.replace(/^\/api\//, "").split("/").filter(Boolean)

  try {
    if (segments[0] === "v1") {
      return await handleV1Put(request, segments.slice(1))
    }

    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, { status: 404 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal Server Error" } }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { pathname } = request.nextUrl
  const segments = pathname.replace(/^\/api\//, "").split("/").filter(Boolean)

  try {
    if (segments[0] === "v1") {
      return await handleV1Delete(request, segments.slice(1))
    }

    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, { status: 404 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal Server Error" } }, { status: 500 })
  }
}

async function getAuthOrThrow(headers: Headers): Promise<{ session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>["session"]; user: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>["user"] }> {
  const session = await auth.api.getSession({ headers })
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

async function getAuth(headers: Headers): Promise<{ session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>["session"]; user: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>["user"] } | null> {
  const session = await auth.api.getSession({ headers })
  return session
}

function buildCandidateFilters({ orgId, jobId, status, q, skills, minScore, maxScore, source, dateFrom, dateTo }: {
  orgId: string; jobId?: string; status?: CandidateStatus; q?: string; skills?: string
  minScore?: number; maxScore?: number; source?: "github" | "portfolio" | "resume"; dateFrom?: string; dateTo?: string
}) {
  const filters = [eq(jobApplications.organizationId, orgId)]
  if (jobId) filters.push(eq(jobApplications.jobId, jobId))
  if (status) filters.push(eq(jobApplications.status, status))
  if (typeof minScore === "number") filters.push(gte(candidateEvaluations.score, minScore))
  if (typeof maxScore === "number") filters.push(lte(candidateEvaluations.score, maxScore))
  if (skills) {
    const skillTokens = skills.split(",").map((t) => t.trim()).filter(Boolean)
    if (skillTokens.length > 0) filters.push(or(...skillTokens.map((t) => ilike(candidateEvaluations.skillsJson, `%${t}%`)))!)
  }
  if (source === "github") filters.push(or(sql<boolean>`${jobApplications.githubUrl} is not null`, ilike(candidateEvaluations.evidenceJson, '%"github":{%'))!)
  if (source === "portfolio") filters.push(or(sql<boolean>`${jobApplications.portfolioUrl} is not null`, ilike(candidateEvaluations.evidenceJson, '%"portfolio":{%'))!)
  if (source === "resume") filters.push(sql<boolean>`${jobApplications.resumeText} is not null`)
  if (dateFrom) filters.push(gte(jobApplications.createdAt, new Date(dateFrom)))
  if (dateTo) filters.push(lte(jobApplications.createdAt, new Date(dateTo)))
  if (q) {
    filters.push(or(
      ilike(jobApplications.name, `%${q}%`),
      ilike(jobApplications.email, `%${q}%`),
      ilike(jobApplications.coverLetter, `%${q}%`),
      ilike(candidateEvaluations.resumeTextExcerpt, `%${q}%`),
      ilike(candidateEvaluations.summary, `%${q}%`),
      ilike(candidateEvaluations.skillsJson, `%${q}%`),
    )!)
  }
  return and(...filters)
}

async function handleV1Get(request: NextRequest, segments: string[]) {
  const auth = await getAuth(request.headers)
  if (!auth) return errorResponse("UNAUTHORIZED", "Unauthorized", 401)
  const orgId = auth.session.activeOrganizationId

  if (segments[0] === "session") {
    return NextResponse.json({ data: auth.session })
  }

  if (segments[0] === "user") {
    return NextResponse.json({ data: auth.user })
  }

  if (segments[0] === "candidates") {
    if (segments[1] === "export") {
      return exportCandidatesCSV(request, auth)
    }
    if (segments[1] && segments[2] === "evaluation") {
      return getCandidateEvaluation(segments[1], auth)
    }
    if (segments[1]) {
      return getCandidate(segments[1], auth)
    }
    return listCandidates(request, auth)
  }

  if (segments[0] === "admin") {
    return handleAdminGet(request, segments.slice(1), auth)
  }

  if (segments[0] === "organization") {
    return handleOrgGet(request, segments.slice(1), auth)
  }

  if (segments[0] === "jobs") {
    return handleJobsGet(request, segments.slice(1), auth)
  }

  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, { status: 404 })
}

async function handleV1Post(request: NextRequest, segments: string[]) {
  const auth = await getAuth(request.headers)
  if (!auth) return errorResponse("UNAUTHORIZED", "Unauthorized", 401)

  if (segments[0] === "candidates") {
    if (segments[1] === "semantic-search") {
      return semanticSearch(request, auth)
    }
    if (segments[1] && segments[2] === "review") {
      return enqueueReview(segments[1], request, auth)
    }
    if (segments[1] === "review-bulk") {
      return enqueueBulkReview(request, auth)
    }
  }

  if (segments[0] === "admin") {
    return handleAdminPost(request, segments.slice(1), auth)
  }

  if (segments[0] === "organization") {
    return handleOrgPost(request, segments.slice(1), auth)
  }

  if (segments[0] === "jobs") {
    return handleJobsPost(request, segments.slice(1), auth)
  }

  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, { status: 404 })
}

async function handleV1Patch(request: NextRequest, segments: string[]) {
  const auth = await getAuth(request.headers)
  if (!auth) return errorResponse("UNAUTHORIZED", "Unauthorized", 401)

  if (segments[0] === "user") {
    return updateUser(request, auth)
  }

  if (segments[0] === "candidates" && segments[1] && segments[2] === "status") {
    return updateCandidateStatus(segments[1], request, auth)
  }

  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, { status: 404 })
}

async function handleV1Put(request: NextRequest, segments: string[]) {
  const auth = await getAuth(request.headers)
  if (!auth) return errorResponse("UNAUTHORIZED", "Unauthorized", 401)

  if (segments[0] === "jobs" && segments[1]) {
    return updateJob(segments[1], request, auth)
  }

  if (segments[0] === "organization" && segments[1] === "profile") {
    return updateOrgProfile(request, auth)
  }

  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, { status: 404 })
}

async function handleV1Delete(request: NextRequest, segments: string[]) {
  const auth = await getAuth(request.headers)
  if (!auth) return errorResponse("UNAUTHORIZED", "Unauthorized", 401)

  if (segments[0] === "jobs" && segments[1]) {
    return deleteJob(segments[1], auth)
  }

  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, { status: 404 })
}

async function listCandidates(request: NextRequest, auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId
  if (!orgId) {
    return NextResponse.json({ data: [], pagination: { limit: 0, offset: 0, total: 0, hasMore: false } })
  }

  const searchParams = request.nextUrl.searchParams
  const limit = z.coerce.number().int().min(1).max(200).default(50).parse(searchParams.get("limit") ?? "50")
  const offset = z.coerce.number().int().min(0).default(0).parse(searchParams.get("offset") ?? "0")

  const whereClause = buildCandidateFilters({
    orgId,
    jobId: searchParams.get("jobId") || undefined,
    status: (searchParams.get("status") as CandidateStatus) || undefined,
    q: searchParams.get("q") || undefined,
    skills: searchParams.get("skills") || undefined,
    minScore: searchParams.get("minScore") ? Number(searchParams.get("minScore")) : undefined,
    maxScore: searchParams.get("maxScore") ? Number(searchParams.get("maxScore")) : undefined,
    source: searchParams.get("source") as "github" | "portfolio" | "resume" | undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
  })

  const data = await db
    .select({
      id: jobApplications.id, shortId: jobApplications.shortId, name: jobApplications.name,
      email: jobApplications.email, resumeText: jobApplications.resumeText,
      linkedinUrl: jobApplications.linkedinUrl, githubUrl: jobApplications.githubUrl,
      portfolioUrl: jobApplications.portfolioUrl, coverLetter: jobApplications.coverLetter,
      status: jobApplications.status, matchScore: candidateEvaluations.score,
      skillsJson: candidateEvaluations.skillsJson, evaluationSummary: candidateEvaluations.summary,
      recommendation: candidateEvaluations.recommendation, evidenceJson: candidateEvaluations.evidenceJson,
      createdAt: jobApplications.createdAt,
      job: { id: jobs.id, shortId: jobs.shortId, title: jobs.title },
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
  return NextResponse.json({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } })
}

async function getCandidate(id: string, auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId
  if (!orgId) return errorResponse("NOT_FOUND", "Candidate not found", 404)

  const [data] = await db
    .select({
      id: jobApplications.id, name: jobApplications.name, email: jobApplications.email,
      resumeText: jobApplications.resumeText, linkedinUrl: jobApplications.linkedinUrl,
      githubUrl: jobApplications.githubUrl, portfolioUrl: jobApplications.portfolioUrl,
      coverLetter: jobApplications.coverLetter, status: jobApplications.status,
      createdAt: jobApplications.createdAt,
      job: { id: jobs.id, title: jobs.title },
    })
    .from(jobApplications)
    .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
    .where(and(eq(jobApplications.id, id), eq(jobApplications.organizationId, orgId)))

  if (!data) return errorResponse("NOT_FOUND", "Candidate not found", 404)
  return NextResponse.json({ data })
}

async function getCandidateEvaluation(id: string, auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId
  if (!orgId) return NextResponse.json({ data: null })

  const [data] = await db
    .select({
      id: candidateEvaluations.id, applicationId: candidateEvaluations.applicationId,
      jobId: candidateEvaluations.jobId, model: candidateEvaluations.model,
      score: candidateEvaluations.score, summary: candidateEvaluations.summary,
      strengthsJson: candidateEvaluations.strengthsJson, weaknessesJson: candidateEvaluations.weaknessesJson,
      recommendation: candidateEvaluations.recommendation, evidenceJson: candidateEvaluations.evidenceJson,
      aiResponseJson: candidateEvaluations.aiResponseJson,
      createdAt: candidateEvaluations.createdAt, updatedAt: candidateEvaluations.updatedAt,
    })
    .from(candidateEvaluations)
    .innerJoin(jobApplications, eq(candidateEvaluations.applicationId, jobApplications.id))
    .where(and(eq(jobApplications.id, id), eq(jobApplications.organizationId, orgId)))
    .orderBy(desc(candidateEvaluations.updatedAt))

  return NextResponse.json({ data: data ?? null })
}

async function exportCandidatesCSV(request: NextRequest, auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId
  if (!orgId) {
    return new NextResponse("", { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="candidates.csv"' } })
  }

  const sp = request.nextUrl.searchParams
  const whereClause = buildCandidateFilters({
    orgId, jobId: sp.get("jobId") || undefined, status: sp.get("status") as CandidateStatus | undefined,
    q: sp.get("q") || undefined, skills: sp.get("skills") || undefined,
    minScore: sp.get("minScore") ? Number(sp.get("minScore")) : undefined,
    maxScore: sp.get("maxScore") ? Number(sp.get("maxScore")) : undefined,
    source: sp.get("source") as "github" | "portfolio" | "resume" | undefined,
    dateFrom: sp.get("dateFrom") || undefined, dateTo: sp.get("dateTo") || undefined,
  })

  const rows = await db
    .select({
      id: jobApplications.id, shortId: jobApplications.shortId, name: jobApplications.name,
      email: jobApplications.email, status: jobApplications.status, createdAt: jobApplications.createdAt,
      resumeText: jobApplications.resumeText, linkedinUrl: jobApplications.linkedinUrl,
      githubUrl: jobApplications.githubUrl, portfolioUrl: jobApplications.portfolioUrl,
      coverLetter: jobApplications.coverLetter, questionAnswersJson: jobApplications.questionAnswersJson,
      matchScore: candidateEvaluations.score, skillsJson: candidateEvaluations.skillsJson,
      evaluationSummary: candidateEvaluations.summary, recommendation: candidateEvaluations.recommendation,
      job: { id: jobs.id, shortId: jobs.shortId, title: jobs.title },
    })
    .from(jobApplications)
    .leftJoin(candidateEvaluations, eq(candidateEvaluations.applicationId, jobApplications.id))
    .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
    .where(whereClause)
    .orderBy(desc(jobApplications.createdAt))

  const headers = ["Candidate ID", "Name", "Email", "Status", "Applied At", "Job ID", "Job Title", "Match Score", "Recommendation", "Resume Text", "LinkedIn URL", "GitHub URL", "Portfolio URL", "Cover Letter", "Skills", "Evaluation Summary", "Question Answers"]

  const toCsv = (v: unknown) => { if (v === null || v === undefined) return ""; const raw = typeof v === "string" ? v : String(v); return `"${raw.replace(/"/g, '""')}"` }

  const lines = [headers.join(",")]
  for (const row of rows) {
    lines.push([row.shortId, row.name, row.email, row.status, row.createdAt?.toISOString() ?? "", row.job.shortId, row.job.title, row.matchScore, row.recommendation, row.resumeText, row.linkedinUrl, row.githubUrl, row.portfolioUrl, row.coverLetter, row.skillsJson, row.evaluationSummary, row.questionAnswersJson].map(toCsv).join(","))
  }

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="candidates.csv"` },
  })
}

async function semanticSearch(request: NextRequest, auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId
  const body = await request.json()
  const { query, jobId, status, minScore, maxScore, limit } = z.object({
    query: z.string().min(3).max(300), jobId: z.string().optional(),
    status: z.enum(CANDIDATE_STATUSES).optional(),
    minScore: z.number().int().min(0).max(100).optional(),
    maxScore: z.number().int().min(0).max(100).optional(),
    limit: z.number().int().min(1).max(50).default(20),
  }).parse(body)

  if (!orgId) return NextResponse.json({ data: [] })

  const filters = [eq(jobApplications.organizationId, orgId)]
  if (jobId) filters.push(eq(jobApplications.jobId, jobId))
  if (status) filters.push(eq(jobApplications.status, status))
  if (typeof minScore === "number") filters.push(gte(candidateEvaluations.score, minScore))
  if (typeof maxScore === "number") filters.push(lte(candidateEvaluations.score, maxScore))

  const candidates = await db
    .select({
      id: jobApplications.id, shortId: jobApplications.shortId, name: jobApplications.name,
      email: jobApplications.email, resumeText: jobApplications.resumeText,
      linkedinUrl: jobApplications.linkedinUrl, githubUrl: jobApplications.githubUrl,
      portfolioUrl: jobApplications.portfolioUrl, coverLetter: jobApplications.coverLetter,
      status: jobApplications.status, matchScore: candidateEvaluations.score,
      skillsJson: candidateEvaluations.skillsJson, evaluationSummary: candidateEvaluations.summary,
      recommendation: candidateEvaluations.recommendation, evidenceJson: candidateEvaluations.evidenceJson,
      createdAt: jobApplications.createdAt,
      job: { id: jobs.id, shortId: jobs.shortId, title: jobs.title },
    })
    .from(jobApplications)
    .leftJoin(candidateEvaluations, eq(candidateEvaluations.applicationId, jobApplications.id))
    .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
    .where(and(...filters))
    .orderBy(desc(jobApplications.createdAt))
    .limit(100)

  if (!sarvamClient || candidates.length === 0) return NextResponse.json({ data: candidates.slice(0, limit) })

  const prompt = ["Rank the following candidates by relevance to the query.", "Return strict JSON only in this shape:", '{"ids":["candidate_id_1","candidate_id_2"]}', `Query: ${query}`, `Candidates: ${JSON.stringify(candidates.map((c) => ({ id: c.id, name: c.name, job: c.job.title, score: c.matchScore, skillsJson: c.skillsJson, summary: c.evaluationSummary, recommendation: c.recommendation, coverLetter: c.coverLetter })))}`].join("\n")

  const completion = await withRetry(() => sarvamClient.chat.completions({
    model: "sarvam-30b", temperature: 0,
    messages: [{ role: "system", content: "You are a candidate search ranker. Output valid JSON only." }, { role: "user", content: prompt }],
  }))

  const message = completion.choices?.[0]?.message
  const content = message?.reasoning_content ?? message?.content ?? ""
  const parsedJson = parseAiJsonLoose(content)
  if (!parsedJson) return NextResponse.json({ data: candidates.slice(0, limit) })

  const parsed = z.object({ ids: z.array(z.string()) }).safeParse(parsedJson)
  if (!parsed.success) return NextResponse.json({ data: candidates.slice(0, limit) })

  const position = new Map(parsed.data.ids.map((id, i) => [id, i]))
  const ranked = [...candidates].sort((a, b) => (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity))
  return NextResponse.json({ data: ranked.slice(0, limit) })
}

async function enqueueReview(id: string, request: NextRequest, auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  return NextResponse.json({ error: { code: "NOT_IMPLEMENTED", message: "Queue removed - use Server Action" } }, { status: 501 })
}

async function enqueueBulkReview(request: NextRequest, auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  return NextResponse.json({ error: { code: "NOT_IMPLEMENTED", message: "Queue removed - use Server Action" } }, { status: 501 })
}

async function updateCandidateStatus(id: string, request: NextRequest, auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId
  if (!orgId) return errorResponse("NOT_FOUND", "Candidate not found", 404)

  const body = await request.json()
  const { status } = z.object({ status: z.enum(CANDIDATE_STATUSES) }).parse(body)

  const [updated] = await db.update(jobApplications).set({ status, updatedAt: new Date() })
    .where(and(eq(jobApplications.id, id), eq(jobApplications.organizationId, orgId)))
    .returning({ id: jobApplications.id })
  if (!updated) return errorResponse("NOT_FOUND", "Candidate not found", 404)

  const [data] = await db.select({
    id: jobApplications.id, name: jobApplications.name, email: jobApplications.email,
    resumeText: jobApplications.resumeText, linkedinUrl: jobApplications.linkedinUrl,
    githubUrl: jobApplications.githubUrl, portfolioUrl: jobApplications.portfolioUrl,
    coverLetter: jobApplications.coverLetter, status: jobApplications.status, createdAt: jobApplications.createdAt,
    job: { id: jobs.id, title: jobs.title },
  }).from(jobApplications).innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
    .where(and(eq(jobApplications.id, id), eq(jobApplications.organizationId, orgId)))

  return NextResponse.json({ data })
}

async function updateUser(request: NextRequest, auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const body = await request.json()
  const { name } = z.object({ name: z.string().min(1).max(120) }).parse(body)

  const [updated] = await db.update(user).set({ name }).where(eq(user.id, auth.session.userId))
    .returning({ id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified, image: user.image, createdAt: user.createdAt, updatedAt: user.updatedAt })

  if (!updated) return errorResponse("NOT_FOUND", "User not found", 404)
  return NextResponse.json({ data: updated })
}

async function handleJobsGet(request: NextRequest, segments: string[], auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId
  if (!orgId) return errorResponse("NO_ACTIVE_ORGANIZATION", "Create or select an organization to continue", 403)

  if (segments[0] === "generate-description") {
    return errorResponse("METHOD_NOT_ALLOWED", "Use POST for generate-description", 405)
  }

  if (segments[0]) {
    const [data] = await db.select().from(jobs).where(and(eq(jobs.id, segments[0]), eq(jobs.organizationId, orgId)))
    if (!data) return errorResponse("NOT_FOUND", "Job not found", 404)
    return NextResponse.json({ data })
  }

  const data = await db.select().from(jobs).where(eq(jobs.organizationId, orgId)).orderBy(desc(jobs.createdAt))
  return NextResponse.json({ data })
}

async function handleJobsPost(request: NextRequest, segments: string[], auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId
  if (!orgId) return errorResponse("NO_ACTIVE_ORGANIZATION", "Create or select an organization to continue", 403)

  if (segments[0] === "generate-description") {
    return generateDescription(request)
  }

  if (segments[0]) {
    return errorResponse("METHOD_NOT_ALLOWED", "Use PUT for job update", 405)
  }

  const body = await request.json()
  const parsed = z.object({
    title: z.string().min(1).max(200), description: z.string().min(1),
    status: z.enum(["draft", "open", "closed", "filled"]).default("draft"),
    jobType: z.enum(["remote", "hybrid", "on-site"]).default("on-site"),
    location: z.string().optional(), salaryRange: z.string().optional(),
    questions: z.array(z.object({ id: z.string().min(1).max(80), prompt: z.string().min(1).max(300), required: z.boolean().default(false) })).max(20).default([]),
  }).parse(body)

  const [org] = await db.select().from(organization).where(eq(organization.id, orgId))
  if (!org) return errorResponse("NO_ACTIVE_ORGANIZATION", "Create or select an organization to continue", 403)

  const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "job"
  const [inserted] = await db.insert(jobs).values({
    ...parsed, shortId: generateShortId(), questionsJson: JSON.stringify(parsed.questions), slug, organizationId: orgId,
  }).returning()

  return NextResponse.json({ data: inserted }, { status: 201 })
}

async function generateDescription(request: NextRequest) {
  if (!sarvamClient) return errorResponse("CONFIG_ERROR", "SARVAM_API_KEY is not configured", 500)

  const body = await request.json()
  const { context, jobType, location, salaryRange } = z.object({
    context: z.string().min(10).max(5000), jobType: z.enum(["remote", "hybrid", "on-site"]).optional(),
    location: z.string().optional(), salaryRange: z.string().optional(),
  }).parse(body)

  const prompt = [
    "Create a professional job description based on the provided hiring context.",
    'Your response MUST be a valid JSON object with the following fields:',
    '- "title": A concise job title.',
    '- "description": A detailed description in Markdown (lists, etc.).',
    '- "salaryRange": A realistic salary range string.',
    "", "Description Rules:", "1. Include sections: About the Role, Responsibilities, Requirements, Nice to Have, Benefits.",
    "2. Put a blank line before each section title.", "3. Use bullet points for lists.",
    "4. DO NOT use markdown headings (no # symbols). Just use bold for titles.",
    "", "Field Specifics:", "- title: Do NOT include the location in the title.",
    `- salaryRange: Use local standards for ${location ?? "the requested location"}. Format like '$100k - $150k/yr' or '₹10k/month'.`,
    "", "Work Details:", `- Type: ${jobType ?? "specified in context"}`, `- Location: ${location ?? "specified in context"}`,
    salaryRange ? `- Requested Range: ${salaryRange}` : "", "", "HIRING CONTEXT:", context,
  ].filter(Boolean).join("\n")

  const completion = await withRetry(() => sarvamClient.chat.completions({
    model: "sarvam-30b", temperature: 0.3,
    messages: [{ role: "system", content: "You are an expert recruiter. You MUST return ONLY a valid JSON object. No conversational text, no <think> blocks, no markdown code fences." }, { role: "user", content: prompt }],
  }))

  const message = completion.choices?.[0]?.message
  const content = message?.reasoning_content ?? message?.content ?? ""
  if (!content) {
    console.error("[generate-description] Empty response", { model: completion.model, finish_reason: completion.choices?.[0]?.finish_reason })
    return errorResponse("AI_ERROR", "AI model returned an empty response", 502)
  }

  const responseJson = extractFirstJson(content)
  if (!responseJson) {
    console.error("[generate-description] No JSON found in response", { length: content.length, preview: content.slice(0, 300) })
    return errorResponse("AI_PARSE_ERROR", "No valid JSON found in AI response", 502)
  }

  const result = z.object({ title: z.string().min(1), description: z.string().min(1), salaryRange: z.string().optional() }).safeParse(responseJson)
  if (!result.success) {
    console.error("[generate-description] Schema validation failed", { responseJson, issues: result.error.issues })
    return errorResponse("AI_PARSE_ERROR", "AI response did not match expected schema", 502)
  }

  const stripHashes = (v: string) => v.split("\n").map((l) => { const m = l.match(/^\s{0,3}#{1,6}\s+(.*)$/); return m ? m[1] : l }).join("\n")
  return NextResponse.json({ data: { title: result.data.title, salaryRange: result.data.salaryRange, description: stripHashes(result.data.description) } })
}

async function updateJob(id: string, request: NextRequest, auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId
  if (!orgId) return errorResponse("NO_ACTIVE_ORGANIZATION", "Create or select an organization to continue", 403)

  const body = await request.json()
  const [existing] = await db.select({ slug: jobs.slug, title: jobs.title }).from(jobs).where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId)))
  if (!existing) return errorResponse("NOT_FOUND", "Job not found", 404)

  const { questions, ...jobData } = body
  const newSlug = body.title && body.title !== existing.title ? body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) : existing.slug

  const [updated] = await db.update(jobs).set({ ...jobData, ...(questions ? { questionsJson: JSON.stringify(questions) } : {}), slug: newSlug, updatedAt: new Date() })
    .where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId))).returning()
  if (!updated) return errorResponse("NOT_FOUND", "Job not found", 404)
  return NextResponse.json({ data: updated })
}

async function deleteJob(id: string, auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId
  if (!orgId) return errorResponse("NO_ACTIVE_ORGANIZATION", "Create or select an organization to continue", 403)

  const [data] = await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId))).returning()
  if (!data) return errorResponse("NOT_FOUND", "Job not found", 404)
  return NextResponse.json({ data: { message: "Job deleted" } })
}

async function handleOrgGet(request: NextRequest, segments: string[], auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId

  if (segments[0] === "ensure-active") {
    if (orgId) {
      const [activeOrg] = await db.select({ id: organization.id }).from(organization).where(eq(organization.id, orgId))
      if (activeOrg) return NextResponse.json({ data: { hasOrganization: true, activeOrganizationId: activeOrg.id } })
    }
    const [existingMembership] = await db.select({ organizationId: member.organizationId }).from(member).where(eq(member.userId, auth.session.userId))
    if (!existingMembership) return NextResponse.json({ data: { hasOrganization: false, activeOrganizationId: null } })
    await db.update(sessionTable).set({ activeOrganizationId: existingMembership.organizationId })
      .where(and(eq(sessionTable.id, auth.session.id), eq(sessionTable.userId, auth.session.userId)))
    return NextResponse.json({ data: { hasOrganization: true, activeOrganizationId: existingMembership.organizationId } })
  }

  if (segments[0] === "profile") {
    if (!orgId) return errorResponse("NO_ACTIVE_ORGANIZATION", "Create or select an organization to continue", 403)
    const [org] = await db.select({ id: organization.id, slug: organization.slug, name: organization.name, logo: organization.logo, metadata: organization.metadata })
      .from(organization).where(eq(organization.id, orgId))
    if (!org) return errorResponse("NOT_FOUND", "Organization not found", 404)
    const meta = parseMetadata(org.metadata)
    return NextResponse.json({ data: { id: org.id, slug: org.slug, name: org.name, logo: org.logo, websiteUrl: meta.websiteUrl ?? null, linkedinUrl: meta.linkedinUrl ?? null, tagline: meta.tagline ?? null, about: meta.about ?? null } })
  }

  return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
}

async function updateOrgProfile(request: NextRequest, auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId
  if (!orgId) return errorResponse("NO_ACTIVE_ORGANIZATION", "Create or select an organization to continue", 403)

  const body = await request.json()
  const [existing] = await db.select({ metadata: organization.metadata }).from(organization).where(eq(organization.id, orgId))
  if (!existing) return errorResponse("NOT_FOUND", "Organization not found", 404)

  const currentMetadata = parseMetadata(existing.metadata)
  const nextMetadata = { ...currentMetadata, websiteUrl: body.websiteUrl, linkedinUrl: body.linkedinUrl, tagline: body.tagline, about: body.about }

  const [updated] = await db.update(organization).set({
    ...(body.name ? { name: body.name } : {}), metadata: JSON.stringify(nextMetadata),
  }).where(eq(organization.id, orgId)).returning({ id: organization.id, slug: organization.slug, name: organization.name, logo: organization.logo, metadata: organization.metadata })

  const meta = parseMetadata(updated.metadata)
  return NextResponse.json({ data: { id: updated.id, slug: updated.slug, name: updated.name, logo: updated.logo, websiteUrl: meta.websiteUrl ?? null, linkedinUrl: meta.linkedinUrl ?? null, tagline: meta.tagline ?? null, about: meta.about ?? null } })
}

async function handleOrgPost(request: NextRequest, segments: string[], auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  const orgId = auth.session.activeOrganizationId

  if (segments[0] === "bootstrap") {
    if (orgId) {
      const [existingOrg] = await db.select({ id: organization.id, slug: organization.slug, name: organization.name, logo: organization.logo, metadata: organization.metadata }).from(organization).where(eq(organization.id, orgId))
      if (existingOrg) {
        const meta = parseMetadata(existingOrg.metadata)
        return NextResponse.json({ data: { id: existingOrg.id, slug: existingOrg.slug, name: existingOrg.name, logo: existingOrg.logo, websiteUrl: meta.websiteUrl ?? null, linkedinUrl: meta.linkedinUrl ?? null, tagline: meta.tagline ?? null, about: meta.about ?? null } })
      }
    }

    const [existingMembership] = await db.select({ organizationId: member.organizationId }).from(member).where(eq(member.userId, auth.session.userId))
    if (existingMembership) {
      const [existingOrg] = await db.select({ id: organization.id, slug: organization.slug, name: organization.name, logo: organization.logo, metadata: organization.metadata }).from(organization).where(eq(organization.id, existingMembership.organizationId))
      if (existingOrg) {
        await db.update(sessionTable).set({ activeOrganizationId: existingMembership.organizationId }).where(and(eq(sessionTable.id, auth.session.id), eq(sessionTable.userId, auth.session.userId)))
        const meta = parseMetadata(existingOrg.metadata)
        return NextResponse.json({ data: { id: existingOrg.id, slug: existingOrg.slug, name: existingOrg.name, logo: existingOrg.logo, websiteUrl: meta.websiteUrl ?? null, linkedinUrl: meta.linkedinUrl ?? null, tagline: meta.tagline ?? null, about: meta.about ?? null } })
      }
    }

    const body = await request.json()
    const parsed = z.object({ name: z.string().min(1).max(120), websiteUrl: z.string().url().optional(), linkedinUrl: z.string().url().optional(), tagline: z.string().max(180).optional(), about: z.string().max(2000).optional() }).refine((v) => v.websiteUrl || v.linkedinUrl, { message: "Provide website URL or LinkedIn URL" }).parse(body)

    const organizationId = crypto.randomUUID()
    const now = new Date()
    const metadata = JSON.stringify({ websiteUrl: parsed.websiteUrl, linkedinUrl: parsed.linkedinUrl, tagline: parsed.tagline, about: parsed.about })
    const slug = `${parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50)}-${Date.now().toString(36).slice(-6)}`

    const [created] = await db.insert(organization).values({ id: organizationId, name: parsed.name, slug, createdAt: now, metadata }).returning({ id: organization.id, slug: organization.slug, name: organization.name, logo: organization.logo, metadata: organization.metadata })
    await db.insert(member).values({ id: crypto.randomUUID(), organizationId, userId: auth.session.userId, role: "owner", createdAt: now })
    await db.update(sessionTable).set({ activeOrganizationId: organizationId }).where(and(eq(sessionTable.id, auth.session.id), eq(sessionTable.userId, auth.session.userId)))

    const meta = parseMetadata(created.metadata)
    return NextResponse.json({ data: { id: created.id, slug: created.slug, name: created.name, logo: created.logo, websiteUrl: meta.websiteUrl ?? null, linkedinUrl: meta.linkedinUrl ?? null, tagline: meta.tagline ?? null, about: meta.about ?? null } }, { status: 201 })
  }

  return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
}

async function handleAdminGet(request: NextRequest, segments: string[], auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  if (!isAdminEmail(auth.user.email)) return errorResponse("FORBIDDEN", "Admin access required", 403)

  if (segments[0] === "overview") {
    const [totalUsersRow, totalOrganizationsRow, totalJobsRow, totalApplicationsRow, totalEvaluationsRow, jobsStatusRows, applicationsStatusRows, avgScoreRow, evaluationsLast24HoursRow] = await Promise.all([
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(user),
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(organization),
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(jobs),
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(jobApplications),
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(candidateEvaluations),
      db.select({ status: jobs.status, count: sql<number>`count(*)`.mapWith(Number) }).from(jobs).groupBy(jobs.status).orderBy(jobs.status),
      db.select({ status: jobApplications.status, count: sql<number>`count(*)`.mapWith(Number) }).from(jobApplications).groupBy(jobApplications.status).orderBy(jobApplications.status),
      db.select({ averageScore: sql<number | null>`avg(${candidateEvaluations.score})::numeric` }).from(candidateEvaluations),
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(candidateEvaluations).where(sql`${candidateEvaluations.updatedAt} >= NOW() - INTERVAL '24 hours'`),
    ])

    const avgScoreRaw = avgScoreRow[0]?.averageScore
    const averageScore = typeof avgScoreRaw === "number" ? Number(avgScoreRaw.toFixed(2)) : avgScoreRaw === null ? null : Number(avgScoreRaw)

    return NextResponse.json({
      data: {
        totals: { users: totalUsersRow[0]?.count ?? 0, organizations: totalOrganizationsRow[0]?.count ?? 0, jobs: totalJobsRow[0]?.count ?? 0, applications: totalApplicationsRow[0]?.count ?? 0, evaluations: totalEvaluationsRow[0]?.count ?? 0 },
        jobsByStatus: jobsStatusRows.map((r) => ({ status: r.status ?? "unknown", count: r.count })),
        applicationsByStatus: applicationsStatusRows.map((r) => ({ status: r.status ?? "unknown", count: r.count })),
        evaluations: { averageScore: Number.isFinite(averageScore as number) ? (averageScore as number) : null, completedLast24Hours: evaluationsLast24HoursRow[0]?.count ?? 0 },
        queue: { connected: false, counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 }, oldestWaitingAgeSeconds: null, queuedLast24HoursProxy: 0 },
      },
    })
  }

  if (segments[0] === "users-orgs") {
    const sp = request.nextUrl.searchParams
    const limit = z.coerce.number().int().min(1).max(200).default(50).parse(sp.get("limit") ?? "50")
    const offset = z.coerce.number().int().min(0).default(0).parse(sp.get("offset") ?? "0")

    const [rows, total] = await Promise.all([
      db.select({ membershipId: member.id, role: member.role, createdAt: member.createdAt, userId: user.id, userName: user.name, userEmail: user.email, userImage: user.image, organizationId: organization.id, organizationName: organization.name, organizationSlug: organization.slug })
        .from(member).innerJoin(user, eq(member.userId, user.id)).innerJoin(organization, eq(member.organizationId, organization.id))
        .orderBy(desc(member.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(member),
    ])
    const totalCount = total[0]?.count ?? 0
    return NextResponse.json({
      data: rows.map((r) => ({ membershipId: r.membershipId, role: r.role, createdAt: r.createdAt ? r.createdAt.toISOString() : null, user: { id: r.userId, name: r.userName, email: r.userEmail, image: r.userImage }, organization: { id: r.organizationId, name: r.organizationName, slug: r.organizationSlug } })),
      pagination: { limit, offset, total: totalCount, hasMore: offset + rows.length < totalCount },
    })
  }

  if (segments[0] === "organizations") {
    const sp = request.nextUrl.searchParams
    const limit = z.coerce.number().int().min(1).max(200).default(50).parse(sp.get("limit") ?? "50")
    const offset = z.coerce.number().int().min(0).default(0).parse(sp.get("offset") ?? "0")

    const [rows, total] = await Promise.all([
      db.select({ id: organization.id, name: organization.name, slug: organization.slug, logo: organization.logo, createdAt: organization.createdAt }).from(organization).orderBy(desc(organization.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(organization),
    ])
    const orgIds = rows.map((r) => r.id)
    const jobsRows = orgIds.length ? await db.select({ id: jobs.id, title: jobs.title, status: jobs.status, organizationId: jobs.organizationId, createdAt: jobs.createdAt }).from(jobs).where(sql`${jobs.organizationId} = ANY(${orgIds})`).orderBy(desc(jobs.createdAt)) : []
    const jobsByOrg = jobsRows.reduce<Record<string, typeof jobsRows>>((acc, j) => { (acc[j.organizationId] ??= []).push(j); return acc }, {})
    const totalCount = total[0]?.count ?? 0
    return NextResponse.json({
      data: rows.map((r) => { const orgJobs = jobsByOrg[r.id] ?? []; return { ...r, createdAt: r.createdAt ? r.createdAt.toISOString() : null, jobCount: orgJobs.length, jobs: orgJobs.map((j) => ({ id: j.id, title: j.title, status: j.status ?? "unknown", createdAt: j.createdAt ? j.createdAt.toISOString() : null })) } }),
      pagination: { limit, offset, total: totalCount, hasMore: offset + rows.length < totalCount },
    })
  }

  if (segments[0] === "waitlist") {
    if (segments[1] === "send-live-now") return errorResponse("METHOD_NOT_ALLOWED", "Use POST", 405)
    const sp = request.nextUrl.searchParams
    const limit = z.coerce.number().int().min(1).max(200).default(50).parse(sp.get("limit") ?? "50")
    const offset = z.coerce.number().int().min(0).default(0).parse(sp.get("offset") ?? "0")

    const [rows, total] = await Promise.all([
      db.select({ id: waitlist.id, email: waitlist.email, status: waitlist.status, createdAt: waitlist.createdAt }).from(waitlist).orderBy(desc(waitlist.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(waitlist),
    ])
    const totalCount = total[0]?.count ?? 0
    return NextResponse.json({ data: rows.map((r) => ({ ...r, createdAt: r.createdAt ? r.createdAt.toISOString() : null })), pagination: { limit, offset, total: totalCount, hasMore: offset + rows.length < totalCount } })
  }

  if (segments[0] === "queue") {
    return NextResponse.json({ data: { connected: false, counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 }, oldestWaitingAgeSeconds: null } })
  }

  if (segments[0] === "health") {
    let dbStatus: "ok" | "down" = "ok"
    try { await db.execute(sql`select 1`) } catch { dbStatus = "down" }
    const status = dbStatus === "ok" ? "ok" : "degraded"
    return NextResponse.json({ data: { status, environment: env.NODE_ENV, version: "0.0.13", checks: { db: dbStatus, redis: "not_configured", queue: "not_configured" } } })
  }

  if (segments[0] === "candidates" && segments[2] === "debug") {
    const [application] = await db.select({
      id: jobApplications.id, shortId: jobApplications.shortId, name: jobApplications.name, email: jobApplications.email,
      status: jobApplications.status, createdAt: jobApplications.createdAt, resumeText: jobApplications.resumeText,
      jobId: jobs.id, jobShortId: jobs.shortId, jobTitle: jobs.title,
      organizationId: organization.id, organizationName: organization.name, organizationSlug: organization.slug,
    }).from(jobApplications).innerJoin(jobs, eq(jobApplications.jobId, jobs.id)).innerJoin(organization, eq(jobApplications.organizationId, organization.id)).where(eq(jobApplications.id, segments[1]))

    if (!application) return errorResponse("NOT_FOUND", "Candidate application not found", 404)

    const [evaluation] = await db.select({
      id: candidateEvaluations.id, model: candidateEvaluations.model, score: candidateEvaluations.score,
      summary: candidateEvaluations.summary, recommendation: candidateEvaluations.recommendation,
      resumeTextExcerpt: candidateEvaluations.resumeTextExcerpt, evidenceJson: candidateEvaluations.evidenceJson,
      aiResponseJson: candidateEvaluations.aiResponseJson,
      createdAt: candidateEvaluations.createdAt, updatedAt: candidateEvaluations.updatedAt,
    }).from(candidateEvaluations).innerJoin(jobApplications, eq(candidateEvaluations.applicationId, jobApplications.id))
      .where(and(eq(candidateEvaluations.applicationId, segments[1]), eq(jobApplications.id, segments[1]))).orderBy(desc(candidateEvaluations.updatedAt))

    return NextResponse.json({
      data: {
        application: { id: application.id, shortId: application.shortId, name: application.name, email: application.email, status: application.status, createdAt: application.createdAt.toISOString(), resumeText: application.resumeText, job: { id: application.jobId, shortId: application.jobShortId, title: application.jobTitle }, organization: { id: application.organizationId, name: application.organizationName, slug: application.organizationSlug } },
        evaluation: evaluation ? { id: evaluation.id, model: evaluation.model, score: evaluation.score, summary: evaluation.summary, recommendation: evaluation.recommendation, resumeTextExcerpt: evaluation.resumeTextExcerpt, evidenceJson: evaluation.evidenceJson, aiResponseJson: evaluation.aiResponseJson, createdAt: evaluation.createdAt.toISOString(), updatedAt: evaluation.updatedAt.toISOString() } : null,
      },
    })
  }

  return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
}

async function handleAdminPost(request: NextRequest, segments: string[], auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>) {
  if (!isAdminEmail(auth.user.email)) return errorResponse("FORBIDDEN", "Admin access required", 403)

  if (segments[0] === "waitlist" && segments[1] === "send-live-now") {
    if (!emailService) return errorResponse("CONFIG_ERROR", "Email service not configured", 500)
    const pendingUsers = await db.select().from(waitlist).where(eq(waitlist.status, "pending"))
    if (pendingUsers.length === 0) return NextResponse.json({ success: true, count: 0, message: "No pending users to notify" })

    const usersToNotify = pendingUsers.slice(0, 100)
    let successCount = 0
    for (let i = 0; i < usersToNotify.length; i++) {
      const u = usersToNotify[i]
      try {
        await emailService.sendLiveNowEmail(u.email)
        await db.update(waitlist).set({ status: "invited" }).where(eq(waitlist.id, u.id))
        successCount++
      } catch { continue }
      if (i < usersToNotify.length - 1) await new Promise((r) => setTimeout(r, 400))
    }
    return NextResponse.json({ success: true, count: successCount })
  }

  return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
}

async function handlePublicGet(request: NextRequest, segments: string[]) {
  if (segments[0] === "job" && segments[1]) {
    const shortId = segments[1];
    const [data] = await db.select({
      id: jobs.id, shortId: jobs.shortId, title: jobs.title, slug: jobs.slug, description: jobs.description,
      status: jobs.status, jobType: jobs.jobType, location: jobs.location, salaryRange: jobs.salaryRange,
      questionsJson: jobs.questionsJson, createdAt: jobs.createdAt,
      organization: { id: organization.id, name: organization.name, slug: organization.slug, logo: organization.logo, metadata: organization.metadata },
    }).from(jobs).innerJoin(organization, eq(jobs.organizationId, organization.id)).where(and(eq(jobs.shortId, shortId), ne(jobs.status, "draft")))

    if (!data) return errorResponse("NOT_FOUND", "Job not found", 404)
    const meta = parseMetadata(data.organization.metadata)
    return NextResponse.json({
      data: { ...data, questions: (() => { try { const q = JSON.parse(data.questionsJson ?? "[]"); return Array.isArray(q) ? q : [] } catch { return [] } })(), organization: { id: data.organization.id, name: data.organization.name, slug: data.organization.slug, logo: data.organization.logo, tagline: meta.tagline ?? null, about: meta.about ?? null, websiteUrl: meta.websiteUrl ?? null, linkedinUrl: meta.linkedinUrl ?? null } },
    })
  }

  // Support /api/public/{orgSlug}/job/{shortId} format
  if (segments[1] === "job" && segments[2]) {
    const shortId = segments[2];
    const [data] = await db.select({
      id: jobs.id, shortId: jobs.shortId, title: jobs.title, slug: jobs.slug, description: jobs.description,
      status: jobs.status, jobType: jobs.jobType, location: jobs.location, salaryRange: jobs.salaryRange,
      questionsJson: jobs.questionsJson, createdAt: jobs.createdAt,
      organization: { id: organization.id, name: organization.name, slug: organization.slug, logo: organization.logo, metadata: organization.metadata },
    }).from(jobs).innerJoin(organization, eq(jobs.organizationId, organization.id)).where(and(eq(jobs.shortId, shortId), ne(jobs.status, "draft")))

    if (!data) return errorResponse("NOT_FOUND", "Job not found", 404)
    const meta = parseMetadata(data.organization.metadata)
    return NextResponse.json({
      data: { ...data, questions: (() => { try { const q = JSON.parse(data.questionsJson ?? "[]"); return Array.isArray(q) ? q : [] } catch { return [] } })(), organization: { id: data.organization.id, name: data.organization.name, slug: data.organization.slug, logo: data.organization.logo, tagline: meta.tagline ?? null, about: meta.about ?? null, websiteUrl: meta.websiteUrl ?? null, linkedinUrl: meta.linkedinUrl ?? null } },
    })
  }

  if (segments[1] === "jobs") {
    const [org] = await db.select({ id: organization.id, name: organization.name, slug: organization.slug, logo: organization.logo, metadata: organization.metadata }).from(organization).where(eq(organization.slug, segments[0]))
    if (!org) return errorResponse("NOT_FOUND", "Organization not found", 404)

    const data = await db.select({
      id: jobs.id, shortId: jobs.shortId, title: jobs.title, slug: jobs.slug, description: jobs.description,
      status: jobs.status, jobType: jobs.jobType, location: jobs.location, salaryRange: jobs.salaryRange, createdAt: jobs.createdAt,
    }).from(jobs).where(and(eq(jobs.organizationId, org.id), ne(jobs.status, "draft"))).orderBy(desc(jobs.createdAt))

    const meta = parseMetadata(org.metadata)
    return NextResponse.json({ data, organization: { name: org.name, slug: org.slug, logo: org.logo, tagline: meta.tagline ?? null, about: meta.about ?? null, websiteUrl: meta.websiteUrl ?? null, linkedinUrl: meta.linkedinUrl ?? null } })
  }

  return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
}

async function handlePublicPost(request: NextRequest, segments: string[]) {
  if (segments[segments.length - 1] === "apply") {
    try {
      const body = await request.formData()

    const name = (body.get("name") as string) || ""
    const email = (body.get("email") as string) || ""
    const resumeFile = body.get("resume") as File | null
    const linkedinUrl = (body.get("linkedinUrl") as string) || ""
    const githubUrl = (body.get("githubUrl") as string) || ""
    const portfolioUrl = (body.get("portfolioUrl") as string) || ""
    const coverLetter = (body.get("coverLetter") as string) || ""
    const source = (body.get("source") as string) || "public_link"
    let questionAnswersRaw = (body.get("questionAnswers") as string) || ""

    const parsed = z.object({
      shortId: z.string().min(1), name: z.string().min(1).max(120), email: z.string().email(),
      linkedinUrl: z.string().url().optional().or(z.literal("")),
      githubUrl: z.string().url().optional().or(z.literal("")), portfolioUrl: z.string().url().optional().or(z.literal("")),
      coverLetter: z.string().max(5000).optional(),
      questionAnswers: z.array(z.object({ questionId: z.string().min(1).max(80), answer: z.string().max(2000) })).optional(),
      source: z.enum(["public_link", "embedded_iframe"]).optional(),
    }).parse({
      shortId: segments[2] || "",
      name, email,
      linkedinUrl, githubUrl, portfolioUrl,
      coverLetter: coverLetter || undefined,
      questionAnswers: questionAnswersRaw ? JSON.parse(questionAnswersRaw) : undefined,
      source: source || undefined,
    })

    let resumeText: string | null = null
    if (resumeFile && resumeFile.size > 0) {
      if (resumeFile.type !== "application/pdf") {
        return errorResponse("VALIDATION", "Resume must be a PDF file", 400)
      }
      if (resumeFile.size > 2 * 1024 * 1024) {
        return errorResponse("VALIDATION", "Resume must be under 2MB", 400)
      }
      const arrayBuffer = await resumeFile.arrayBuffer()
      resumeText = await extractPdfText(Buffer.from(arrayBuffer))
    } else {
      return errorResponse("VALIDATION", "Resume file is required", 400)
    }

    const [job] = await db.select({ id: jobs.id, organizationId: jobs.organizationId, questionsJson: jobs.questionsJson }).from(jobs).where(and(eq(jobs.shortId, parsed.shortId), ne(jobs.status, "draft")))
    if (!job) return errorResponse("NOT_FOUND", "Job not found", 404)

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const userAgent = request.headers.get("user-agent") || ""

    const [existing] = await db.select({ id: jobApplications.id }).from(jobApplications).where(and(eq(jobApplications.jobId, job.id), eq(jobApplications.email, parsed.email)))
    if (existing) return errorResponse("DUPLICATE", "You have already applied for this position", 409)

    const shortId = generateShortId()
    const [inserted] = await db.insert(jobApplications).values({
      shortId, jobId: job.id, organizationId: job.organizationId, name: parsed.name, email: parsed.email,
      resumeText, linkedinUrl: parsed.linkedinUrl || null, githubUrl: parsed.githubUrl || null,
      portfolioUrl: parsed.portfolioUrl || null, coverLetter: parsed.coverLetter,
      questionAnswersJson: parsed.questionAnswers ? JSON.stringify(parsed.questionAnswers) : null,
      sourceUrl: parsed.source || "public_link", ip, userAgent, status: "applied",
    }).returning({ id: jobApplications.id, shortId: jobApplications.shortId })

    evaluateCandidate(inserted.id).catch(err =>
      console.error("[handlePublicPost] Auto-evaluation failed:", err)
    )

    return NextResponse.json({ data: inserted }, { status: 201 })
    } catch (error) {
      console.error("[handlePublicPost] Error:", error)
      if (error instanceof z.ZodError) {
        return errorResponse("VALIDATION", "Invalid input", 400, error.issues)
      }
      return errorResponse("INTERNAL_ERROR", "Failed to submit application", 500)
    }
  }

  return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
}

async function handleWaitlistPost(request: NextRequest, segments: string[]) {
  if (segments[0] === "join") {
    const body = await request.json()
    const { email } = z.object({ email: z.string().email() }).parse(body)

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined

    try {
      const [inserted] = await db.insert(waitlist).values({ email, ip }).onConflictDoNothing().returning({ id: waitlist.id })
      if (inserted && emailService) {
        emailService.sendWelcomeEmail(email).catch((err) => console.error("[waitlist] Failed to send welcome email:", err))
      }
      return NextResponse.json({ success: true, message: "Welcome to the waitlist!" })
    } catch {
      return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 })
    }
  }

  return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
}

async function handleWaitlistGet(request: NextRequest, segments: string[]) {
  return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
}
