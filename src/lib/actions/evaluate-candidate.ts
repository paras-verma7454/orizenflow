"use server"

import { db, candidateEvaluations, jobApplications, jobs } from "@/lib/db"
import { env } from "@/lib/env"
import { isPrivateOrInternalUrl } from "@/lib/url-utils"
import { eq } from "drizzle-orm"
import { SarvamAIClient } from "sarvamai"
import { z } from "zod"
import { parseAiJsonLoose, withRetry } from "@/lib/ai"

const sarvamClient = env.SARVAM_API_KEY ? new SarvamAIClient({ apiSubscriptionKey: env.SARVAM_API_KEY }) : null

export async function evaluateCandidate(applicationId: string) {
  const [application] = await db
    .select({
      id: jobApplications.id,
      jobId: jobApplications.jobId,
      organizationId: jobApplications.organizationId,
      name: jobApplications.name,
      email: jobApplications.email,
      resumeText: jobApplications.resumeText,
      linkedinUrl: jobApplications.linkedinUrl,
      githubUrl: jobApplications.githubUrl,
      portfolioUrl: jobApplications.portfolioUrl,
      coverLetter: jobApplications.coverLetter,
    })
    .from(jobApplications)
    .where(eq(jobApplications.id, applicationId))

  if (!application) throw new Error("Application not found")

  const [job] = await db
    .select({ id: jobs.id, title: jobs.title, description: jobs.description })
    .from(jobs)
    .where(eq(jobs.id, application.jobId))

  if (!job) throw new Error("Job not found")

  const existingEval = await db
    .select({ id: candidateEvaluations.id })
    .from(candidateEvaluations)
    .where(eq(candidateEvaluations.applicationId, applicationId))

  if (existingEval.length > 0) {
    await db
      .update(candidateEvaluations)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(candidateEvaluations.applicationId, applicationId))
  } else {
    await db.insert(candidateEvaluations).values({
      applicationId: application.id,
      jobId: application.jobId,
      organizationId: application.organizationId,
      model: "sarvam",
      status: "processing",
    })
  }

  try {
    const evaluation = await runAiEvaluation(application, job)
    const score = Math.round(evaluation.score)
    const now = new Date()

    const evalUpdate = {
      score,
      status: "completed" as const,
      evaluationMethod: "ai_evaluation",
      skillsJson: JSON.stringify(evaluation.skills),
      summary: evaluation.summary,
      strengthsJson: JSON.stringify(evaluation.strengths),
      weaknessesJson: JSON.stringify(evaluation.weaknesses),
      recommendation: evaluation.recommendation,
      evidenceJson: JSON.stringify(evaluation.evidence),
      aiResponseJson: JSON.stringify(evaluation.rawResponse),
      resumeTextExcerpt: application.resumeText,
      updatedAt: now,
    }

    if (existingEval.length > 0) {
      await db
        .update(candidateEvaluations)
        .set(evalUpdate)
        .where(eq(candidateEvaluations.applicationId, applicationId))
    } else {
      await db
        .update(candidateEvaluations)
        .set(evalUpdate)
        .where(eq(candidateEvaluations.applicationId, applicationId))
    }

    return { success: true, score, summary: evaluation.summary }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    if (existingEval.length > 0) {
      await db
        .update(candidateEvaluations)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(candidateEvaluations.applicationId, applicationId))
    } else {
      await db
        .update(candidateEvaluations)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(candidateEvaluations.applicationId, applicationId))
    }

    return { success: false, error: errorMessage }
  }
}

async function runAiEvaluation(
  application: {
    name: string; email: string; resumeText: string | null
    linkedinUrl: string | null; githubUrl: string | null; portfolioUrl: string | null
    coverLetter: string | null
  },
  job: { title: string; description: string },
) {
  if (!sarvamClient) throw new Error("SARVAM_API_KEY not configured")

  const resumeText = application.resumeText
  const githubData = application.githubUrl ? await fetchGithubProfile(application.githubUrl) : null
  const portfolioData = application.portfolioUrl ? await fetchPortfolio(application.portfolioUrl) : null

  const evidence: Record<string, unknown> = {}
  if (githubData) evidence.github = githubData
  if (portfolioData) evidence.portfolio = portfolioData

  const prompt = [
    "You are an expert technical recruiter evaluating a candidate for a job posting.",
    "",
    "JOB POSTING:",
    `Title: ${job.title}`,
    `Description: ${job.description}`,
    "",
    "CANDIDATE INFORMATION:",
    `Name: ${application.name}`,
    `Resume: ${resumeText || "Not available"}`,
    application.githubUrl ? `GitHub: ${JSON.stringify(githubData)}` : "GitHub: Not provided",
    application.portfolioUrl ? `Portfolio: ${JSON.stringify(portfolioData)}` : "Portfolio: Not provided",
    application.coverLetter ? `Cover Letter: ${application.coverLetter}` : "Cover Letter: Not provided",
    "",
    "INSTRUCTIONS:",
    "Evaluate the candidate against the job requirements.",
    "Return a JSON object with the following fields:",
    '- "score": A number from 0-100 representing overall fit.',
    '- "summary": A 2-3 sentence summary of the evaluation.',
    '- "skills": An array of identified skills matching the job.',
    '- "strengths": An array of 2-4 key strengths.',
    '- "weaknesses": An array of 1-3 areas for improvement or gaps.',
    '- "recommendation": One of "strong_yes", "yes", "maybe", "no", "strong_no".',
    "",
    "Be objective. Consider the candidate's demonstrated abilities, not just keyword matches.",
  ].join("\n")

  const response = await withRetry(() => sarvamClient.chat.completions({
    model: "sarvam-30b",
    temperature: 0.2,
    messages: [
      { role: "system", content: "You are an expert technical recruiter. Return ONLY valid JSON." },
      { role: "user", content: prompt },
    ],
  }))

  const message = response.choices?.[0]?.message
  const content = message?.reasoning_content ?? message?.content ?? ""
  const parsed = parseAiJsonLoose(content)
  if (!parsed) throw new Error("Failed to parse AI response")

  const schema = z.object({
    score: z.coerce.number().min(0).max(100),
    summary: z.string(),
    skills: z.array(z.string()),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    recommendation: z.enum(["strong_yes", "yes", "maybe", "no", "strong_no"]),
  }).passthrough()

  const result = schema.safeParse(parsed)
  if (!result.success) {
    console.error("[evaluate-candidate] Schema validation failed", { parsed, issues: result.error.issues })
    throw new Error(`AI response failed schema validation: ${result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}`)
  }

  return {
    ...result.data,
    evidence,
    rawResponse: parsed,
  }
}

async function fetchGithubProfile(url: string): Promise<Record<string, unknown> | null> {
  try {
    const match = url.match(/github\.com\/([^/]+)/)
    if (!match) return null
    const username = match[1]

    const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" }
    if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`

    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers, signal: AbortSignal.timeout(10000) }),
      fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`, { headers, signal: AbortSignal.timeout(10000) }),
    ])

    if (!userRes.ok || !reposRes.ok) return null

    const [userData, reposData] = await Promise.all([userRes.json(), reposRes.json()])

    return {
      username,
      name: (userData as Record<string, unknown>).name,
      bio: (userData as Record<string, unknown>).bio,
      publicRepos: (userData as Record<string, unknown>).public_repos,
      followers: (userData as Record<string, unknown>).followers,
      repos: (reposData as Array<Record<string, unknown>>).map((r) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
      })),
    }
  } catch {
    return null
  }
}

async function fetchPortfolio(url: string): Promise<Record<string, unknown> | null> {
  try {
    if (isPrivateOrInternalUrl(url)) return null

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const html = await res.text()
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() || null
    const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1] || null
    const headings = [...html.matchAll(/<h[1-3][^>]*>([^<]*)<\/h[1-3]>/gi)].map((m) => m[1].trim()).filter(Boolean)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    let bodyText = ""
    if (bodyMatch) {
      bodyText = bodyMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000)
    }
    return { title, description, headings: headings.length > 0 ? headings : undefined, bodyText: bodyText || undefined, url }
  } catch {
    return null
  }
}
