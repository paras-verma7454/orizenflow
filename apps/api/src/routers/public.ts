import { findIp } from "@arcjet/ip"
import { db, jobApplications, jobs, organization } from "@packages/db"
import { env } from "@packages/env/api-hono"
import { createCandidateEvaluationBrowserQueue, createCandidateEvaluationFetchQueue } from "@packages/queue"
import { and, desc, eq, ne } from "drizzle-orm"
import { Hono } from "hono"
import { validator } from "hono/validator"
import { z } from "zod"

import { generateShortId } from "@/lib/utils"

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

type JobQuestion = {
    id: string
    prompt: string
    required: boolean
}

type QuestionAnswer = {
    questionId: string
    answer: string
}

const parseJobQuestions = (raw: string | null): JobQuestion[] => {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw) as unknown
        if (!Array.isArray(parsed)) return []
        return parsed
            .filter((item): item is JobQuestion => {
                if (!item || typeof item !== "object") return false
                const record = item as Record<string, unknown>
                return (
                    typeof record.id === "string"
                    && typeof record.prompt === "string"
                    && typeof record.required === "boolean"
                )
            })
            .map((item) => ({
                id: item.id,
                prompt: item.prompt,
                required: item.required,
            }))
    } catch {
        return []
    }
}

const normalizeQuestionAnswers = (answers: QuestionAnswer[] | undefined) => {
    if (!answers || answers.length === 0) return [] as QuestionAnswer[]
    return answers
        .map((answer) => ({
            questionId: answer.questionId.trim(),
            answer: answer.answer.trim(),
        }))
        .filter((answer) => answer.questionId.length > 0)
}

const validateRequiredQuestionAnswers = (questions: JobQuestion[], answers: QuestionAnswer[]) => {
    const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.answer]))
    for (const question of questions) {
        if (!question.required) continue
        if (!answerMap.get(question.id)?.trim()) {
            return `Answer is required for: ${question.prompt}`
        }
    }
    return null
}

const applySchema = z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    resumeUrl: z.string().url(),
    linkedinUrl: z.string().url().optional().or(z.literal("")),
    githubUrl: z.string().url().optional().or(z.literal("")),
    portfolioUrl: z.string().url().optional().or(z.literal("")),
    coverLetter: z.string().max(5000).optional(),
    questionAnswers: z
        .array(
            z.object({
                questionId: z.string().min(1).max(80),
                answer: z.string().max(2000),
            }),
        )
        .optional(),
    source: z.enum(["public_link", "embedded_iframe"]).optional(),
    captchaToken: z.string().min(1),
    honeypot: z.string().optional(),
})

const resolveApplicationSource = (
    source: "public_link" | "embedded_iframe" | undefined,
    referer: string | null,
) => {
    const sourceLabel = source === "embedded_iframe" ? "embedded_iframe" : "public_link"
    if (referer) return `${sourceLabel}:${referer}`
    return sourceLabel
}

const extractHostname = (rawUrl: string | null) => {
    if (!rawUrl) return null
    try {
        return new URL(rawUrl).hostname
    } catch {
        return null
    }
}

const turnstileActionForSource = (source: "public_link" | "embedded_iframe" | undefined) => {
    return source === "embedded_iframe" ? "embedded_apply" : "public_apply"
}

const verifyTurnstileToken = async (
    captchaToken: string,
    ip: string | null,
    expectedAction: string,
    expectedHostname: string | null,
) => {
    if (!captchaToken || captchaToken.length > 2048) {
        return { ok: false as const, errorCodes: ["invalid-input-response"] }
    }

    if (!env.TURNSTILE_SECRET_KEY) {
        console.error("[public] TURNSTILE_SECRET_KEY is not configured")
        return { ok: false as const, errorCodes: ["missing-input-secret"] }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    try {
        const body = new URLSearchParams()
        body.set("secret", env.TURNSTILE_SECRET_KEY)
        body.set("response", captchaToken)
        if (ip) body.set("remoteip", ip)
        body.set("idempotency_key", crypto.randomUUID())

        const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: body.toString(),
            signal: controller.signal,
        })
        if (!res.ok) return { ok: false as const, errorCodes: ["bad-request"] }

        const json = (await res.json().catch(() => null)) as
            | {
                success?: boolean
                action?: string
                hostname?: string
                "error-codes"?: string[]
            }
            | null

        if (!json?.success) {
            return { ok: false as const, errorCodes: json?.["error-codes"] ?? ["invalid-input-response"] }
        }

        if (json.action !== expectedAction) {
            return { ok: false as const, errorCodes: ["action-mismatch"] }
        }

        if (expectedHostname && json.hostname !== expectedHostname) {
            return { ok: false as const, errorCodes: ["hostname-mismatch"] }
        }

        return { ok: true as const }
    } catch {
        return { ok: false as const, errorCodes: ["internal-error"] }
    } finally {
        clearTimeout(timeoutId)
    }
}

const extractDriveFileId = (rawUrl: string) => {
    try {
        const url = new URL(rawUrl)
        if (url.hostname !== "drive.google.com") return null
        const parts = url.pathname.split("/").filter(Boolean)
        const fileIndex = parts.findIndex((part) => part === "d")
        if (fileIndex >= 0 && parts[fileIndex + 1]) return parts[fileIndex + 1]
        const queryId = url.searchParams.get("id")
        return queryId || null
    } catch {
        return null
    }
}

const isDirectPdfLink = (rawUrl: string) => {
    try {
        const url = new URL(rawUrl)
        return url.pathname.toLowerCase().endsWith(".pdf")
    } catch {
        return false
    }
}

const isReachableUrl = async (url: string) => {
    try {
        const driveFileId = extractDriveFileId(url)
        if (driveFileId) {
            const probe = await fetch(`https://drive.usercontent.google.com/uc?id=${driveFileId}&export=download`, {
                method: "GET",
                redirect: "follow",
                headers: { Range: "bytes=0-1024" },
            })
            if (!probe.ok) return false
            const contentType = probe.headers.get("content-type")?.toLowerCase() ?? ""
            if (contentType.includes("text/html")) return false
            return true
        }

        const headRes = await fetch(url, { method: "HEAD", redirect: "follow" })
        if (headRes.ok) {
            const contentType = headRes.headers.get("content-type")?.toLowerCase() ?? ""
            if (contentType.includes("application/pdf")) return true
            return isDirectPdfLink(url)
        }

        const rangeRes = await fetch(url, {
            method: "GET",
            redirect: "follow",
            headers: { Range: "bytes=0-1024" },
        })
        if (!rangeRes.ok) return false
        const rangeType = rangeRes.headers.get("content-type")?.toLowerCase() ?? ""
        if (rangeType.includes("text/html")) return false
        return rangeType.includes("application/pdf") || isDirectPdfLink(url)
    } catch {
        return false
    }
}

const isValidResumeLink = (url: string) => {
    return extractDriveFileId(url) !== null || isDirectPdfLink(url)
}

const candidateEvaluationQueues = (() => {
    if (!process.env.REDIS_URL) {
        console.warn("[public] Redis not configured - candidate evaluation queue unavailable")
        return null
    }
    try {
        return {
            fetch: createCandidateEvaluationFetchQueue(process.env.REDIS_URL),
            browser: createCandidateEvaluationBrowserQueue(process.env.REDIS_URL),
        }
    } catch (error) {
        console.error("[public] Failed to create candidate evaluation queue:", error)
        return null
    }
})()

const selectEvaluationQueue = (portfolioUrl: string | null | undefined) => {
    if (!candidateEvaluationQueues) return null
    return portfolioUrl?.trim()
        ? candidateEvaluationQueues.browser
        : candidateEvaluationQueues.fetch
}

export const publicRouter = new Hono()
    .get("/job/:shortId", async (c) => {
        const shortId = c.req.param("shortId")

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

        if (!data) {
            return c.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, 404)
        }

        const metadata = parseMetadata(data.organization.metadata)

        return c.json({
            data: {
                ...data,
                questions: parseJobQuestions(data.questionsJson),
                organization: {
                    id: data.organization.id,
                    name: data.organization.name,
                    slug: data.organization.slug,
                    logo: data.organization.logo,
                    tagline: typeof metadata.tagline === "string" ? metadata.tagline : null,
                    about: typeof metadata.about === "string" ? metadata.about : null,
                    websiteUrl: typeof metadata.websiteUrl === "string" ? metadata.websiteUrl : null,
                    linkedinUrl: typeof metadata.linkedinUrl === "string" ? metadata.linkedinUrl : null,
                },
            },
        })
    })
    .get("/:orgSlug/jobs", async (c) => {
        const orgSlug = c.req.param("orgSlug")

        const [org] = await db
            .select({ id: organization.id, name: organization.name, slug: organization.slug, logo: organization.logo, metadata: organization.metadata })
            .from(organization)
            .where(eq(organization.slug, orgSlug))

        if (!org) {
            return c.json({ error: { code: "NOT_FOUND", message: "Organization not found" } }, 404)
        }

        const data = await db
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
                createdAt: jobs.createdAt,
            })
            .from(jobs)
            .where(and(eq(jobs.organizationId, org.id), ne(jobs.status, "draft")))
            .orderBy(desc(jobs.createdAt))

        const metadata = parseMetadata(org.metadata)

        return c.json({
            data,
            organization: {
                id: org.id,
                name: org.name,
                slug: org.slug,
                logo: org.logo,
                tagline: typeof metadata.tagline === "string" ? metadata.tagline : null,
                about: typeof metadata.about === "string" ? metadata.about : null,
                websiteUrl: typeof metadata.websiteUrl === "string" ? metadata.websiteUrl : null,
                linkedinUrl: typeof metadata.linkedinUrl === "string" ? metadata.linkedinUrl : null,
            },
        })
    })
    .get("/:orgSlug/job/by-slug/:slug", async (c) => {
        const orgSlug = c.req.param("orgSlug")
        const slug = c.req.param("slug")

        // Look up by slug for backward compatibility
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
            .where(and(eq(jobs.slug, slug), eq(organization.slug, orgSlug), ne(jobs.status, "draft")))

        if (!data) {
            return c.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, 404)
        }

        const metadata = parseMetadata(data.organization.metadata)

        return c.json({
            data: {
                ...data,
                questions: parseJobQuestions(data.questionsJson),
                organization: {
                    id: data.organization.id,
                    name: data.organization.name,
                    slug: data.organization.slug,
                    logo: data.organization.logo,
                    tagline: typeof metadata.tagline === "string" ? metadata.tagline : null,
                    about: typeof metadata.about === "string" ? metadata.about : null,
                    websiteUrl: typeof metadata.websiteUrl === "string" ? metadata.websiteUrl : null,
                    linkedinUrl: typeof metadata.linkedinUrl === "string" ? metadata.linkedinUrl : null,
                },
            },
        })
    })
    .get("/:orgSlug/job/:shortId", async (c) => {
        const orgSlug = c.req.param("orgSlug")
        const shortId = c.req.param("shortId")

        // Look up by shortId (the unique identifier)
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
            .where(and(eq(jobs.shortId, shortId), eq(organization.slug, orgSlug), ne(jobs.status, "draft")))

        if (!data) {
            return c.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, 404)
        }

        const metadata = parseMetadata(data.organization.metadata)

        return c.json({
            data: {
                ...data,
                questions: parseJobQuestions(data.questionsJson),
                organization: {
                    id: data.organization.id,
                    name: data.organization.name,
                    slug: data.organization.slug,
                    logo: data.organization.logo,
                    tagline: typeof metadata.tagline === "string" ? metadata.tagline : null,
                    about: typeof metadata.about === "string" ? metadata.about : null,
                    websiteUrl: typeof metadata.websiteUrl === "string" ? metadata.websiteUrl : null,
                    linkedinUrl: typeof metadata.linkedinUrl === "string" ? metadata.linkedinUrl : null,
                },
            },
        })
    })
    .post(
        "/:orgSlug/job/:shortId/apply",
        validator("json", (value, c) => {
            const parsed = applySchema.safeParse(value)
            if (!parsed.success) {
                return c.json(
                    { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
                    400,
                )
            }
            return parsed.data
        }),
        async (c) => {
            const orgSlug = c.req.param("orgSlug")
            const shortId = c.req.param("shortId")
            const payload = c.req.valid("json")
            const ip = findIp(c.req.raw) || null
            const referer = c.req.header("referer") || null
            const expectedHostname = extractHostname(referer)
            const expectedAction = turnstileActionForSource(payload.source)

            if (payload.honeypot && payload.honeypot.trim().length > 0) {
                return c.json({ success: true, message: "Application submitted" })
            }

            const captchaResult = await verifyTurnstileToken(payload.captchaToken, ip, expectedAction, expectedHostname)
            if (!captchaResult.ok) {
                console.warn("[public] Turnstile verification failed:", captchaResult.errorCodes)
                const isExpired = captchaResult.errorCodes.includes("timeout-or-duplicate")
                return c.json(
                    {
                        error: {
                            code: "CAPTCHA_VERIFICATION_FAILED",
                            message: isExpired
                                ? "Captcha expired or was already used. Please complete it again."
                                : "Captcha verification failed. Please try again.",
                            errors: captchaResult.errorCodes,
                        },
                    },
                    400,
                )
            }

            if (!isValidResumeLink(payload.resumeUrl)) {
                return c.json(
                    {
                        error: {
                            code: "INVALID_RESUME_URL",
                            message: "Resume must be a Google Drive file link or direct .pdf link",
                        },
                    },
                    400,
                )
            }

            const canReachResume = await isReachableUrl(payload.resumeUrl)
            if (!canReachResume) {
                return c.json(
                    {
                        error: {
                            code: "RESUME_LINK_PRIVATE",
                            message: "Resume is not publicly accessible. For Google Drive, set sharing to Anyone with link - Viewer.",
                        },
                    },
                    400,
                )
            }

            const [jobData] = await db
                .select({ id: jobs.id, organizationId: jobs.organizationId, questionsJson: jobs.questionsJson })
                .from(jobs)
                .innerJoin(organization, eq(jobs.organizationId, organization.id))
                .where(and(eq(jobs.shortId, shortId), eq(organization.slug, orgSlug), ne(jobs.status, "draft")))

            if (!jobData) {
                return c.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, 404)
            }

            const jobQuestions = parseJobQuestions(jobData.questionsJson)
            const questionAnswers = normalizeQuestionAnswers(payload.questionAnswers)
            const questionAnswerError = validateRequiredQuestionAnswers(jobQuestions, questionAnswers)
            if (questionAnswerError) {
                return c.json({ error: { code: "VALIDATION_ERROR", message: questionAnswerError } }, 400)
            }

            const userAgent = c.req.header("user-agent") || null
            const sourceUrl = resolveApplicationSource(payload.source, referer)

            const [inserted] = await db
                .insert(jobApplications)
                .values({
                    shortId: generateShortId(),
                    jobId: jobData.id,
                    organizationId: jobData.organizationId,
                    name: payload.name,
                    email: payload.email,
                    resumeUrl: payload.resumeUrl,
                    linkedinUrl: payload.linkedinUrl || null,
                    githubUrl: payload.githubUrl || null,
                    portfolioUrl: payload.portfolioUrl || null,
                    coverLetter: payload.coverLetter || null,
                    questionAnswersJson: questionAnswers.length > 0 ? JSON.stringify(questionAnswers) : null,
                    sourceUrl,
                    ip,
                    userAgent,
                })
                .onConflictDoNothing()
                .returning({ id: jobApplications.id })

            if (!inserted) {
                return c.json({ error: { code: "DUPLICATE", message: "You have already applied for this job" } }, 409)
            }

            const candidateEvaluationQueue = selectEvaluationQueue(payload.portfolioUrl)
            if (candidateEvaluationQueue) {
                try {
                    await candidateEvaluationQueue.add("evaluate-candidate", {
                        applicationId: inserted.id,
                        organizationId: jobData.organizationId,
                        jobId: jobData.id,
                        enqueuedAt: new Date().toISOString(),
                    })
                } catch (error) {
                    const reason = error instanceof Error ? error.message : "QUEUE_ERROR"
                    console.error("[queue] Failed to enqueue candidate evaluation (by-slug):", reason, error)
                }
            } else {
                console.warn("[queue] Skipping candidate evaluation - Redis not configured")
            }

            return c.json({ success: true, message: "Application submitted" }, 201)
        },
    )
    .get("/:orgSlug/job/:id", async (c) => {
        const orgSlug = c.req.param("orgSlug")
        const id = c.req.param("id")

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
            .where(and(eq(jobs.id, id), eq(organization.slug, orgSlug), ne(jobs.status, "draft")))

        if (!data) {
            return c.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, 404)
        }

        const metadata = parseMetadata(data.organization.metadata)

        return c.json({
            data: {
                ...data,
                questions: parseJobQuestions(data.questionsJson),
                organization: {
                    id: data.organization.id,
                    name: data.organization.name,
                    slug: data.organization.slug,
                    logo: data.organization.logo,
                    tagline: typeof metadata.tagline === "string" ? metadata.tagline : null,
                    about: typeof metadata.about === "string" ? metadata.about : null,
                    websiteUrl: typeof metadata.websiteUrl === "string" ? metadata.websiteUrl : null,
                    linkedinUrl: typeof metadata.linkedinUrl === "string" ? metadata.linkedinUrl : null,
                },
            },
        })
    })
    .post(
        "/:orgSlug/job/:id/apply",
        validator("json", (value, c) => {
            const parsed = applySchema.safeParse(value)
            if (!parsed.success) {
                return c.json(
                    { error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: parsed.error.issues } },
                    400,
                )
            }
            return parsed.data
        }),
        async (c) => {
            const orgSlug = c.req.param("orgSlug")
            const id = c.req.param("id")
            const payload = c.req.valid("json")
            const ip = findIp(c.req.raw) || null
            const referer = c.req.header("referer") || null
            const expectedHostname = extractHostname(referer)
            const expectedAction = turnstileActionForSource(payload.source)

            if (payload.honeypot && payload.honeypot.trim().length > 0) {
                return c.json({ success: true, message: "Application submitted" })
            }

            const captchaResult = await verifyTurnstileToken(payload.captchaToken, ip, expectedAction, expectedHostname)
            if (!captchaResult.ok) {
                console.warn("[public] Turnstile verification failed (by-id):", captchaResult.errorCodes)
                const isExpired = captchaResult.errorCodes.includes("timeout-or-duplicate")
                return c.json(
                    {
                        error: {
                            code: "CAPTCHA_VERIFICATION_FAILED",
                            message: isExpired
                                ? "Captcha expired or was already used. Please complete it again."
                                : "Captcha verification failed. Please try again.",
                            errors: captchaResult.errorCodes,
                        },
                    },
                    400,
                )
            }

            if (!isValidResumeLink(payload.resumeUrl)) {
                return c.json(
                    {
                        error: {
                            code: "INVALID_RESUME_URL",
                            message: "Resume must be a Google Drive file link or direct .pdf link",
                        },
                    },
                    400,
                )
            }

            const canReachResume = await isReachableUrl(payload.resumeUrl)
            if (!canReachResume) {
                return c.json(
                    {
                        error: {
                            code: "RESUME_LINK_PRIVATE",
                            message: "Resume is not publicly accessible. For Google Drive, set sharing to Anyone with link - Viewer.",
                        },
                    },
                    400,
                )
            }

            const [job] = await db
                .select({ id: jobs.id, organizationId: jobs.organizationId, questionsJson: jobs.questionsJson })
                .from(jobs)
                .innerJoin(organization, eq(jobs.organizationId, organization.id))
                .where(and(eq(jobs.id, id), eq(organization.slug, orgSlug), ne(jobs.status, "draft")))

            if (!job) {
                return c.json({ error: { code: "NOT_FOUND", message: "Job not found" } }, 404)
            }

            const jobQuestions = parseJobQuestions(job.questionsJson)
            const questionAnswers = normalizeQuestionAnswers(payload.questionAnswers)
            const questionAnswerError = validateRequiredQuestionAnswers(jobQuestions, questionAnswers)
            if (questionAnswerError) {
                return c.json({ error: { code: "VALIDATION_ERROR", message: questionAnswerError } }, 400)
            }

            const userAgent = c.req.header("user-agent") || null
            const sourceUrl = resolveApplicationSource(payload.source, referer)

            const [inserted] = await db
                .insert(jobApplications)
                .values({
                    shortId: generateShortId(),
                    jobId: job.id,
                    organizationId: job.organizationId,
                    name: payload.name,
                    email: payload.email,
                    resumeUrl: payload.resumeUrl,
                    linkedinUrl: payload.linkedinUrl || null,
                    githubUrl: payload.githubUrl || null,
                    portfolioUrl: payload.portfolioUrl || null,
                    coverLetter: payload.coverLetter || null,
                    questionAnswersJson: questionAnswers.length > 0 ? JSON.stringify(questionAnswers) : null,
                    sourceUrl,
                    ip,
                    userAgent,
                })
                .onConflictDoNothing()
                .returning({ id: jobApplications.id })

            if (!inserted) {
                return c.json({ error: { code: "DUPLICATE", message: "You have already applied for this job" } }, 409)
            }

            const candidateEvaluationQueue = selectEvaluationQueue(payload.portfolioUrl)
            if (candidateEvaluationQueue) {
                try {
                    await candidateEvaluationQueue.add("evaluate-candidate", {
                        applicationId: inserted.id,
                        organizationId: job.organizationId,
                        jobId: job.id,
                        enqueuedAt: new Date().toISOString(),
                    })
                } catch (error) {
                    const reason = error instanceof Error ? error.message : "QUEUE_ERROR"
                    console.error("[queue] Failed to enqueue candidate evaluation (by-id):", reason, error)
                }
            } else {
                console.warn("[queue] Skipping candidate evaluation - Redis not configured")
            }

            return c.json({ success: true, message: "Application submitted" }, 201)
        },
    )
