import { candidateEvaluations, db, jobApplications, jobs } from "@packages/db"
import { and, eq } from "drizzle-orm"
import { SarvamAIClient } from "sarvamai"
import { convertHtmlToMarkdown, extractLinksByType, resolveUrl } from "./html-to-markdown"

type CandidateJobPayload = {
  applicationId: string
  organizationId: string
  jobId: string
}

type EvidenceKind = "github_profile" | "github_repo" | "portfolio" | "other"

type EvidenceUrl = {
  originalUrl: string
  normalizedUrl: string
  source: "form_github" | "form_portfolio" | "resume_extracted"
  kind: EvidenceKind
  host: string
}

type EvidenceFailure = {
  source: "github" | "portfolio" | "resume"
  url: string
  reason: string
  transient: boolean
}

type EnrichmentResult = {
  github: {
    profile?: {
      login: string
      name?: string
      bio?: string
      followers?: number
      publicRepos?: number
    }
    topRepos: Array<{
      name: string
      url: string
      stars: number
      forks: number
      languages: string[]
      readmeSnippet?: string
    }>
    languages: Record<string, number>
  } | null
  portfolio: {
    rootUrl: string
    pages: Array<{ url: string; title?: string; textSnippet: string }>
  } | null
  failures: EvidenceFailure[]
  usedUrls: EvidenceUrl[]
  extractedResumeLinks: string[]
  resumeTextExcerpt: string | null
}

type GithubProfile = {
  login: string
  name?: string
  bio?: string
  followers?: number
  publicRepos?: number
}

type RoleFamily = "engineering" | "product" | "design" | "marketing" | "sales" | "operations_hr" | "general"

type RubricCriterion = {
  key: string
  label: string
  max: number
  guidance: string
}

type RubricDefinition = {
  family: RoleFamily
  criteria: RubricCriterion[]
  extraInstructions: string[]
}

type ParsedEvaluation = {
  roleFamily: RoleFamily
  rubricVersion: string
  score: number | null
  scoreBreakdown: Array<{ key: string; label: string; score: number; max: number }>
  skills: string[]
  summary: string | null
  strengths: string[]
  weaknesses: string[]
  recommendation: string | null
}

const TRACKING_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"]
const MAX_FETCH_BYTES = 2_000_000
const GITHUB_MAX_REPOS = 5
const PORTFOLIO_MAX_PAGES = 6
const REQUEST_TIMEOUT_MS = 5000
const MAX_PROMPT_CHARS = 12_000
const SARVAM_MAX_CONTEXT_TOKENS = 8192
const SARVAM_MAX_OUTPUT_TOKENS = 700
const SARVAM_THINKING_TEMPERATURE = 0.5
const SARVAM_TOP_P = 1
const RUBRIC_VERSION = "v2-role-adaptive-2026-02"
const ROLE_FAMILY_PRECEDENCE: Array<Exclude<RoleFamily, "general">> = [
  "engineering",
  "product",
  "design",
  "marketing",
  "sales",
  "operations_hr",
]
const ROLE_FAMILY_KEYWORDS: Record<Exclude<RoleFamily, "general">, string[]> = {
  engineering: [
    "software",
    "backend",
    "frontend",
    "full stack",
    "fullstack",
    "engineer",
    "developer",
    "devops",
    "sre",
    "qa",
    "data engineer",
    "mobile",
  ],
  product: ["product manager", "product management", "roadmap", "prioritization", "discovery", "prd", "stakeholder"],
  design: ["ux", "ui", "product designer", "visual designer", "figma", "interaction design", "design system"],
  marketing: ["growth", "seo", "campaign", "performance marketing", "content marketing", "brand", "demand generation"],
  sales: ["sales", "account executive", "business development", "quota", "pipeline", "crm", "lead generation"],
  operations_hr: [
    "operations",
    "people ops",
    "human resources",
    "hr",
    "recruiter",
    "talent acquisition",
    "compliance",
    "process",
  ],
}
const ROLE_RUBRICS: Record<RoleFamily, RubricDefinition> = {
  engineering: {
    family: "engineering",
    criteria: [
      { key: "skills", label: "Skills match with job", max: 30, guidance: "Assess technical skills alignment with role requirements." },
      { key: "projects", label: "Project complexity and technical depth", max: 25, guidance: "Evaluate architecture, complexity, and implementation depth." },
      { key: "impact", label: "Real-world impact and measurable achievements", max: 20, guidance: "Prioritize concrete outcomes and measurable impact." },
      { key: "github", label: "GitHub and portfolio quality", max: 15, guidance: "Evaluate quality of repositories and technical portfolio evidence." },
      { key: "resume", label: "Resume clarity and completeness", max: 10, guidance: "Assess resume structure, clarity, and completeness." },
    ],
    extraInstructions: [
      "Do NOT penalize candidates for missing work experience if projects demonstrate equivalent skills.",
      "If GitHub shows strong projects, modern stack, or multiple repositories, increase score significantly.",
      "If GitHub activity proves real engineering ability, treat it equal to professional experience.",
    ],
  },
  product: {
    family: "product",
    criteria: [
      { key: "product", label: "Product thinking and prioritization", max: 30, guidance: "Evaluate problem framing, prioritization, and strategy." },
      { key: "execution", label: "Execution and cross-functional delivery", max: 25, guidance: "Evaluate delivery quality with engineering/design/stakeholders." },
      { key: "impact", label: "Business impact and measurable outcomes", max: 25, guidance: "Prioritize metrics and business outcomes." },
      { key: "artifacts", label: "Communication quality and product artifacts", max: 10, guidance: "Assess clarity of PRDs, docs, and communication." },
      { key: "resume", label: "Resume clarity and completeness", max: 10, guidance: "Assess resume structure, clarity, and completeness." },
    ],
    extraInstructions: [
      "Do NOT penalize candidates for missing GitHub unless job explicitly requires coding-heavy delivery.",
      "Use portfolio or case-study evidence as strong signal when available.",
    ],
  },
  design: {
    family: "design",
    criteria: [
      { key: "design", label: "Design quality and systems thinking", max: 30, guidance: "Assess visual quality, consistency, and systems thinking." },
      { key: "ux", label: "UX process and problem framing", max: 25, guidance: "Evaluate discovery, research, and problem framing rigor." },
      { key: "portfolio", label: "Portfolio case-study depth", max: 25, guidance: "Prioritize end-to-end case studies with clear rationale." },
      { key: "collaboration", label: "Collaboration and handoff quality", max: 10, guidance: "Assess collaboration with product/engineering and handoff quality." },
      { key: "resume", label: "Resume clarity and completeness", max: 10, guidance: "Assess resume structure, clarity, and completeness." },
    ],
    extraInstructions: [
      "Do NOT penalize candidates for missing GitHub.",
      "Use portfolio evidence as primary signal for design depth.",
    ],
  },
  marketing: {
    family: "marketing",
    criteria: [
      { key: "strategy", label: "Channel expertise and strategy fit", max: 30, guidance: "Assess role-relevant channel and strategy fit." },
      { key: "execution", label: "Campaign execution quality", max: 25, guidance: "Evaluate campaign planning and execution rigor." },
      { key: "impact", label: "Growth impact and measurable outcomes", max: 25, guidance: "Prioritize ROI, growth, and measurable outcomes." },
      { key: "analytics", label: "Experimentation and analytics rigor", max: 10, guidance: "Assess experimentation quality and analytical approach." },
      { key: "resume", label: "Resume clarity and completeness", max: 10, guidance: "Assess resume structure, clarity, and completeness." },
    ],
    extraInstructions: [
      "Do NOT penalize candidates for missing GitHub.",
      "Weight documented campaign outcomes more than tool buzzwords.",
    ],
  },
  sales: {
    family: "sales",
    criteria: [
      { key: "fit", label: "Role and segment fit", max: 30, guidance: "Assess fit for target segment, motion, and sales process." },
      { key: "pipeline", label: "Pipeline generation and execution", max: 25, guidance: "Evaluate pipeline creation and execution consistency." },
      { key: "impact", label: "Quota attainment and deal impact", max: 25, guidance: "Prioritize attainment, deal quality, and measurable outcomes." },
      { key: "communication", label: "Communication and relationship quality", max: 10, guidance: "Assess communication and stakeholder relationship quality." },
      { key: "resume", label: "Resume clarity and completeness", max: 10, guidance: "Assess resume structure, clarity, and completeness." },
    ],
    extraInstructions: [
      "Do NOT penalize candidates for missing GitHub or portfolio.",
      "Prioritize evidence of consistent pipeline and revenue impact.",
    ],
  },
  operations_hr: {
    family: "operations_hr",
    criteria: [
      { key: "operations", label: "Process design and operational excellence", max: 30, guidance: "Assess process design and operational rigor." },
      { key: "delivery", label: "Stakeholder and service delivery quality", max: 25, guidance: "Evaluate cross-functional delivery and service quality." },
      { key: "impact", label: "Measurable outcomes and compliance quality", max: 25, guidance: "Prioritize outcomes, reliability, and compliance quality." },
      { key: "systems", label: "Tools and systems adoption", max: 10, guidance: "Assess practical tooling/systems capability." },
      { key: "resume", label: "Resume clarity and completeness", max: 10, guidance: "Assess resume structure, clarity, and completeness." },
    ],
    extraInstructions: [
      "Do NOT penalize candidates for missing GitHub or portfolio.",
      "Prioritize process improvements and measurable delivery outcomes.",
    ],
  },
  general: {
    family: "general",
    criteria: [
      { key: "fit", label: "Role fit", max: 30, guidance: "Assess fit to responsibilities and requirements." },
      { key: "execution", label: "Execution evidence", max: 25, guidance: "Evaluate practical execution and ownership evidence." },
      { key: "impact", label: "Measurable impact", max: 25, guidance: "Prioritize measurable outcomes and results." },
      { key: "communication", label: "Communication quality", max: 10, guidance: "Assess clarity and communication quality." },
      { key: "resume", label: "Resume clarity and completeness", max: 10, guidance: "Assess resume structure, clarity, and completeness." },
    ],
    extraInstructions: [
      "Do NOT penalize candidates for missing GitHub unless explicitly required by role.",
    ],
  },
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isPrivateHost = (hostname: string) => {
  const host = hostname.toLowerCase()
  if (host === "localhost" || host.endsWith(".local")) return true
  if (host === "127.0.0.1" || host === "::1") return true
  if (/^10\./.test(host)) return true
  if (/^192\.168\./.test(host)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true
  return false
}

const classifyUrl = (url: URL): EvidenceKind => {
  const host = url.hostname.toLowerCase()
  const parts = url.pathname.split("/").filter(Boolean)
  if (host === "github.com") {
    if (parts.length === 1) return "github_profile"
    if (parts.length >= 2) return "github_repo"
  }
  if (host.includes("linkedin.com")) return "other"
  return "portfolio"
}

const normalizeUrl = (raw: string) => {
  try {
    const parsed = new URL(raw.trim())
    if (!["http:", "https:"].includes(parsed.protocol)) return null
    if (isPrivateHost(parsed.hostname)) return null
    parsed.hash = ""
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAMS.includes(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        parsed.searchParams.delete(key)
      }
    }
    let out = parsed.toString()
    if (out.endsWith("/")) out = out.slice(0, -1)
    return out
  } catch {
    return null
  }
}

const extractUrls = (text: string) => {
  const matches = text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? []
  return [...new Set(matches)]
}

const fetchWithTimeout = async (url: string, init?: RequestInit) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const fetchLimitedText = async (url: string) => {
  const res = await fetchWithTimeout(url, { redirect: "follow" })
  if (!res.ok || !res.body) throw new Error(`HTTP_${res.status}`)
  const reader = res.body.getReader()
  let received = 0
  const chunks: Uint8Array[] = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    if (!value) continue
    received += value.byteLength
    if (received > MAX_FETCH_BYTES) break
    chunks.push(value)
  }
  const merged = new Uint8Array(received > MAX_FETCH_BYTES ? MAX_FETCH_BYTES : received)
  let offset = 0
  for (const chunk of chunks) {
    if (offset >= merged.length) break
    const size = Math.min(chunk.length, merged.length - offset)
    merged.set(chunk.slice(0, size), offset)
    offset += size
  }
  return Buffer.from(merged).toString("utf8")
}

const retryOnce = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn()
  } catch (error) {
    await delay(500)
    return await fn()
  }
}

const stripHtml = (html: string) => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const extractAllLinks = (html: string, baseUrl: string): string[] => {
  try {
    const { navigation, pagination, content } = extractLinksByType(html, baseUrl)
    // Prioritize pagination, then navigation, then content links
    const allLinks = [...new Set([...pagination, ...navigation, ...content])]
    return allLinks
  } catch {
    return []
  }
}

const buildGithubHeaders = (token?: string) => {
  const headers: HeadersInit = {
    "User-Agent": "OrizenFlowWorker/1.0",
    Accept: "application/vnd.github+json",
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

const scrapeGithub = async (url: string, token?: string) => {
  const parsed = new URL(url)
  const pathParts = parsed.pathname.split("/").filter(Boolean)
  const owner = pathParts[0]
  if (!owner) return null
  const headers = buildGithubHeaders(token)

  const profileRes = await fetchWithTimeout(`https://api.github.com/users/${owner}`, { headers })
  if (!profileRes.ok) throw new Error(`GITHUB_PROFILE_${profileRes.status}`)
  const profileJson = (await profileRes.json()) as Record<string, unknown>

  const reposRes = await fetchWithTimeout(`https://api.github.com/users/${owner}/repos?sort=updated&per_page=8`, { headers })
  if (!reposRes.ok) throw new Error(`GITHUB_REPOS_${reposRes.status}`)
  const reposJson = (await reposRes.json()) as Array<Record<string, unknown>>
  const repos = reposJson
    .sort((a, b) => Number(b.stargazers_count ?? 0) - Number(a.stargazers_count ?? 0))
    .slice(0, GITHUB_MAX_REPOS)

  const topRepos: Array<{
    name: string
    url: string
    stars: number
    forks: number
    languages: string[]
    readmeSnippet?: string
  }> = []
  const languages: Record<string, number> = {}

  for (const repo of repos) {
    const name = String(repo.name ?? "")
    if (!name) continue
    const repoOwner = String((repo.owner as { login?: string } | undefined)?.login ?? owner)
    const language = typeof repo.language === "string" ? repo.language : null
    if (language) languages[language] = (languages[language] ?? 0) + 1

    let readmeSnippet: string | undefined
    const readmeRes = await fetchWithTimeout(`https://api.github.com/repos/${repoOwner}/${name}/readme`, {
      headers: { ...headers, Accept: "application/vnd.github.raw+json" },
    })
    if (readmeRes.ok) {
      const readmeText = await readmeRes.text()
      readmeSnippet = readmeText.slice(0, 800)
    }

    topRepos.push({
      name,
      url: String(repo.html_url ?? ""),
      stars: Number(repo.stargazers_count ?? 0),
      forks: Number(repo.forks_count ?? 0),
      languages: language ? [language] : [],
      readmeSnippet,
    })
  }

  return {
    profile: {
      login: String(profileJson.login ?? owner),
      name: typeof profileJson.name === "string" ? profileJson.name : undefined,
      bio: typeof profileJson.bio === "string" ? profileJson.bio : undefined,
      followers: Number(profileJson.followers ?? 0),
      publicRepos: Number(profileJson.public_repos ?? 0),
    },
    topRepos,
    languages,
  }
}

const scrapePortfolio = async (rootUrl: string) => {
  const visited = new Set<string>()
  const queue = [rootUrl]
  const pages: Array<{ url: string; title?: string; textSnippet: string }> = []
  const rootHost = new URL(rootUrl).hostname

  while (queue.length > 0 && pages.length < PORTFOLIO_MAX_PAGES) {
    const next = queue.shift()
    if (!next || visited.has(next)) continue
    visited.add(next)

    const html = await fetchLimitedText(next)
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    // Convert HTML to markdown for better LLM context
    const markdown = convertHtmlToMarkdown(html)
    const textSnippet = markdown.slice(0, 1200)
    pages.push({
      url: next,
      title: titleMatch?.[1]?.trim(),
      textSnippet,
    })

    // Extract links with smart categorization (pagination, navigation, content)
    const allLinks = extractAllLinks(html, next)
    for (const link of allLinks) {
      if (visited.has(link)) continue
      const normalized = normalizeUrl(link)
      if (!normalized) continue
      try {
        if (new URL(normalized).hostname !== rootHost) continue
      } catch {
        continue
      }
      queue.push(normalized)
      if (queue.length + pages.length > PORTFOLIO_MAX_PAGES * 2) break
    }
  }

  return { rootUrl, pages }
}

const createEvidenceUrls = ({
  githubUrl,
  portfolioUrl,
  resumeLinks,
}: {
  githubUrl: string | null
  portfolioUrl: string | null
  resumeLinks: string[]
}) => {
  const raw: Array<{ url: string; source: EvidenceUrl["source"] }> = []
  if (githubUrl) raw.push({ url: githubUrl, source: "form_github" })
  if (portfolioUrl) raw.push({ url: portfolioUrl, source: "form_portfolio" })
  for (const link of resumeLinks) raw.push({ url: link, source: "resume_extracted" })

  const dedup = new Map<string, EvidenceUrl>()
  for (const item of raw) {
    const normalized = normalizeUrl(item.url)
    if (!normalized) continue
    const url = new URL(normalized)
    if (url.hostname.includes("linkedin.com")) continue
    const kind = classifyUrl(url)
    if (kind === "other") continue
    if (!dedup.has(normalized)) {
      dedup.set(normalized, {
        originalUrl: item.url,
        normalizedUrl: normalized,
        source: item.source,
        kind,
        host: url.hostname,
      })
    }
  }
  return [...dedup.values()]
}

const extractResumeLinks = async (resumeUrl: string) => {
  try {
    const text = await retryOnce(() => fetchLimitedText(resumeUrl))
    return extractUrls(text).slice(0, 30)
  } catch {
    return []
  }
}

const extractResumeTextExcerpt = async (resumeUrl: string) => {
  try {
    const text = await retryOnce(() => fetchLimitedText(resumeUrl))
    const normalized = text.replace(/\s+/g, " ").trim()
    return normalized.slice(0, 12000)
  } catch {
    return null
  }
}

const trimText = (value: string | null | undefined, max = 600) => {
  if (!value) return null
  return value.replace(/\s+/g, " ").trim().slice(0, max)
}

const compactEnrichment = (enrichment: EnrichmentResult) => {
  const github = enrichment.github
    ? {
      profile: githubProfileCompact(enrichment.github.profile),
      topRepos: enrichment.github.topRepos.slice(0, 3).map((repo) => ({
        name: repo.name,
        url: repo.url,
        stars: repo.stars,
        forks: repo.forks,
        languages: repo.languages.slice(0, 3),
        readmeSnippet: trimText(repo.readmeSnippet, 180),
      })),
      languages: Object.entries(enrichment.github.languages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6),
    }
    : null

  const portfolio = enrichment.portfolio
    ? {
      rootUrl: enrichment.portfolio.rootUrl,
      pages: enrichment.portfolio.pages.slice(0, 3).map((page) => ({
        url: page.url,
        title: trimText(page.title, 100),
        textSnippet: trimText(page.textSnippet, 220),
      })),
    }
    : null

  return {
    github,
    portfolio,
    failures: enrichment.failures.slice(0, 6).map((item) => ({
      source: item.source,
      url: item.url,
      reason: trimText(item.reason, 120),
    })),
    extractedResumeLinks: enrichment.extractedResumeLinks.slice(0, 12),
    usedUrls: enrichment.usedUrls.slice(0, 12).map((item) => ({
      kind: item.kind,
      url: item.normalizedUrl,
      source: item.source,
    })),
    resumeTextExcerpt: trimText(enrichment.resumeTextExcerpt, 4000),
  }
}

const githubProfileCompact = (profile: GithubProfile | undefined) => {
  if (!profile) return null
  return {
    login: profile.login,
    name: trimText(profile.name, 80),
    bio: trimText(profile.bio, 160),
    followers: profile.followers,
    publicRepos: profile.publicRepos,
  }
}

const normalizeMatchText = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ")

const inferRoleFamily = (jobTitle: string, jobDescription: string): RoleFamily => {
  const combined = normalizeMatchText(`${jobTitle} ${jobDescription}`)
  let bestFamily: RoleFamily = "general"
  let bestScore = 0

  for (const family of ROLE_FAMILY_PRECEDENCE) {
    let score = 0
    for (const keyword of ROLE_FAMILY_KEYWORDS[family]) {
      if (combined.includes(keyword)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      bestFamily = family
    }
  }

  return bestScore > 0 ? bestFamily : "general"
}

const getRubric = (family: RoleFamily): RubricDefinition => ROLE_RUBRICS[family] ?? ROLE_RUBRICS.general

const formatRubric = (rubric: RubricDefinition) => rubric.criteria.map((item) => `${item.label}: 0-${item.max} points`).join("\n")

const scoreSchema = (rubric: RubricDefinition) =>
  JSON.stringify({
    roleFamily: rubric.family,
    rubricVersion: RUBRIC_VERSION,
    score: "0-100",
    scoreBreakdown: rubric.criteria.map((item) => ({
      key: item.key,
      label: item.label,
      score: `0-${item.max}`,
      max: item.max,
    })),
    skills: ["..."],
    summary: "...",
    strengths: ["..."],
    weaknesses: ["..."],
    recommendation: "Strong Hire | Hire | Hold | No Hire",
  })

const recommendationFromScore = (score: number) => {
  if (score >= 90) return "Strong Hire"
  if (score >= 70) return "Hire"
  if (score >= 60) return "Hold"
  return "No Hire"
}

const normalizeRecommendation = (value: unknown, score: number) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "strong hire") return "Strong Hire"
    if (normalized === "hire") return "Hire"
    if (normalized === "hold") return "Hold"
    if (normalized === "no hire") return "No Hire"
  }
  return recommendationFromScore(score)
}

const clampInt = (value: unknown, min: number, max: number) => {
  const num = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(num)) return min
  return Math.max(min, Math.min(max, Math.round(num)))
}

const buildPrompt = ({
  roleFamily,
  rubric,
  jobTitle,
  jobDescription,
  candidateName,
  candidateEmail,
  coverLetter,
  resumeUrl,
  resumeTextExcerpt,
  extractedResumeLinks,
  githubEvidence,
  portfolioEvidence,
  failures,
}: {
  roleFamily: RoleFamily
  rubric: RubricDefinition
  jobTitle: string
  jobDescription: string
  candidateName: string
  candidateEmail: string
  coverLetter: string | null
  resumeUrl: string
  resumeTextExcerpt: string | null
  extractedResumeLinks: string[]
  githubEvidence: unknown
  portfolioEvidence: unknown
  failures: unknown
}) => {
  const roleAwareInstruction =
    roleFamily === "engineering"
      ? "Treat GitHub and project depth as major evidence."
      : "For non-engineering roles, GitHub/portfolio are optional signals and must not be required for a strong score."

  const prompt = [
    "You are evaluating a candidate for a role using a strict role-adaptive scoring rubric.",
    `Detected role family: ${roleFamily}`,
    `Rubric version: ${RUBRIC_VERSION}`,
    "Scoring rubric:",
    formatRubric(rubric),
    "",
    "Score must follow:",
    "90-100: Exceptional candidate (Strong Hire)",
    "80-89: Very strong candidate (Hire)",
    "70-79: Good candidate (Hire)",
    "60-69: Average candidate (Hold)",
    "<60: Weak candidate (No Hire)",
    "",
    roleAwareInstruction,
    ...rubric.extraInstructions,
    "When evidence is missing, score neutrally for unrelated criteria instead of penalizing unfairly.",
    "",
    "Return strict JSON only with this schema:",
    scoreSchema(rubric),
    "",
    `Job title: ${trimText(jobTitle, 180)}`,
    `Job description: ${trimText(jobDescription, 2200)}`,
    "",
    `Candidate: ${trimText(candidateName, 120)} (${candidateEmail})`,
    `Cover letter: ${trimText(coverLetter, 800) ?? "N/A"}`,
    "",
    `Resume URL: ${resumeUrl}`,
    `Resume text excerpt: ${trimText(resumeTextExcerpt, 4000) ?? "N/A"}`,
    `Extracted links from resume: ${JSON.stringify(extractedResumeLinks.slice(0, 12))}`,
    "",
    `GitHub evidence: ${JSON.stringify(githubEvidence)}`,
    `Portfolio evidence: ${JSON.stringify(portfolioEvidence)}`,
    `Evidence failures: ${JSON.stringify(failures)}`,
  ].join("\n")

  return prompt.length > MAX_PROMPT_CHARS ? prompt.slice(0, MAX_PROMPT_CHARS) : prompt
}

const buildMinimalPrompt = ({
  roleFamily,
  rubric,
  jobTitle,
  jobDescription,
  candidateName,
  candidateEmail,
  coverLetter,
  resumeTextExcerpt,
}: {
  roleFamily: RoleFamily
  rubric: RubricDefinition
  jobTitle: string
  jobDescription: string
  candidateName: string
  candidateEmail: string
  coverLetter: string | null
  resumeTextExcerpt: string | null
}) => [
  "Evaluate this candidate using the strict role-adaptive rubric. Output JSON only.",
  `Detected role family: ${roleFamily}`,
  `Rubric: ${rubric.criteria.map((item) => `${item.key}(0-${item.max})`).join(", ")}.`,
  roleFamily === "engineering"
    ? "Do NOT penalize missing formal experience when project/GitHub evidence is strong."
    : "Do NOT penalize missing GitHub for non-engineering roles.",
  scoreSchema(rubric),
  `Role: ${trimText(jobTitle, 160)}`,
  `Job: ${trimText(jobDescription, 1400)}`,
  `Candidate: ${trimText(candidateName, 120)} (${candidateEmail})`,
  `Cover letter: ${trimText(coverLetter, 500) ?? "N/A"}`,
  `Resume excerpt: ${trimText(resumeTextExcerpt, 1800) ?? "N/A"}`,
].join("\n")

const parseAiJson = (content: string, rubric: RubricDefinition, fallbackRoleFamily: RoleFamily): ParsedEvaluation => {
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "")
  const parsed = JSON.parse(cleaned) as {
    roleFamily?: string
    rubricVersion?: string
    score?: number
    scoreBreakdown?: Array<{ key?: string; label?: string; score?: number; max?: number }> | Record<string, unknown>
    skills?: string[]
    summary?: string
    strengths?: string[]
    weaknesses?: string[]
    recommendation?: string
  }

  const parsedRoleFamily = (parsed.roleFamily ?? "").toLowerCase() as RoleFamily
  const roleFamily: RoleFamily = parsedRoleFamily in ROLE_RUBRICS ? parsedRoleFamily : fallbackRoleFamily

  const fromArray = Array.isArray(parsed.scoreBreakdown) ? parsed.scoreBreakdown : null
  const fromObject =
    !Array.isArray(parsed.scoreBreakdown) && parsed.scoreBreakdown && typeof parsed.scoreBreakdown === "object"
      ? (parsed.scoreBreakdown as Record<string, unknown>)
      : null

  const breakdown = rubric.criteria.map((criterion) => {
    let rawScore: unknown = 0

    if (fromArray) {
      const found = fromArray.find((item) => {
        const key = String(item.key ?? "").toLowerCase()
        const label = String(item.label ?? "").toLowerCase()
        return key === criterion.key.toLowerCase() || label === criterion.label.toLowerCase()
      })
      rawScore = found?.score ?? 0
    } else if (fromObject) {
      rawScore = fromObject[criterion.key] ?? 0
    }

    return {
      key: criterion.key,
      label: criterion.label,
      score: clampInt(rawScore, 0, criterion.max),
      max: criterion.max,
    }
  })

  const breakdownScore = breakdown.reduce((sum, item) => sum + item.score, 0)
  const directScore = typeof parsed.score === "number" ? clampInt(parsed.score, 0, 100) : null
  const score = fromArray || fromObject ? breakdownScore : directScore

  return {
    roleFamily,
    rubricVersion: typeof parsed.rubricVersion === "string" ? parsed.rubricVersion : RUBRIC_VERSION,
    score,
    scoreBreakdown: breakdown,
    skills: Array.isArray(parsed.skills) ? parsed.skills.filter((item): item is string => typeof item === "string").slice(0, 20) : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : null,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((item): item is string => typeof item === "string").slice(0, 8) : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.filter((item): item is string => typeof item === "string").slice(0, 8) : [],
    recommendation: normalizeRecommendation(parsed.recommendation, score ?? 0),
  }
}

const applyRoleAwareScoreAdjustments = (baseScore: number, roleFamily: RoleFamily, enrichment: EnrichmentResult) => {
  let score = baseScore

  if (roleFamily === "engineering") {
    if ((enrichment.github?.profile?.publicRepos ?? 0) > 10) score += 5
    if (enrichment.github?.topRepos?.some((repo) => repo.stars > 10)) score += 5
  }

  if ((roleFamily === "product" || roleFamily === "design") && (enrichment.portfolio?.pages.length ?? 0) >= 2) {
    score += 3
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

export async function evaluateCandidateJob(
  payload: CandidateJobPayload,
  options: {
    sarvamApiKey: string
    githubToken?: string
    enableEvidenceScraping: boolean
    llmMaxRetries: number
  },
) {
  const [application] = await db
    .select({
      id: jobApplications.id,
      organizationId: jobApplications.organizationId,
      jobId: jobApplications.jobId,
      name: jobApplications.name,
      email: jobApplications.email,
      resumeUrl: jobApplications.resumeUrl,
      githubUrl: jobApplications.githubUrl,
      portfolioUrl: jobApplications.portfolioUrl,
      coverLetter: jobApplications.coverLetter,
      jobTitle: jobs.title,
      jobDescription: jobs.description,
    })
    .from(jobApplications)
    .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
    .where(
      and(
        eq(jobApplications.id, payload.applicationId),
        eq(jobApplications.organizationId, payload.organizationId),
        eq(jobApplications.jobId, payload.jobId),
      ),
    )

  if (!application) throw new Error("APPLICATION_NOT_FOUND")

  const failures: EvidenceFailure[] = []
  const resumeTextExcerpt = await extractResumeTextExcerpt(application.resumeUrl)
  const extractedResumeLinks = await extractResumeLinks(application.resumeUrl)
  const evidenceUrls = createEvidenceUrls({
    githubUrl: application.githubUrl,
    portfolioUrl: application.portfolioUrl,
    resumeLinks: extractedResumeLinks,
  })

  const githubTarget = evidenceUrls.find((item) => item.kind === "github_profile" || item.kind === "github_repo")
  const portfolioTarget = evidenceUrls.find((item) => item.kind === "portfolio")

  let github: EnrichmentResult["github"] = null
  let portfolio: EnrichmentResult["portfolio"] = null

  if (options.enableEvidenceScraping && githubTarget) {
    try {
      github = await retryOnce(() => scrapeGithub(githubTarget.normalizedUrl, options.githubToken))
    } catch (error) {
      failures.push({
        source: "github",
        url: githubTarget.normalizedUrl,
        reason: error instanceof Error ? error.message : "GITHUB_SCRAPE_FAILED",
        transient: true,
      })
    }
  }

  if (options.enableEvidenceScraping && portfolioTarget) {
    try {
      portfolio = await retryOnce(() => scrapePortfolio(portfolioTarget.normalizedUrl))
    } catch (error) {
      failures.push({
        source: "portfolio",
        url: portfolioTarget.normalizedUrl,
        reason: error instanceof Error ? error.message : "PORTFOLIO_SCRAPE_FAILED",
        transient: true,
      })
    }
  }

  const enrichment: EnrichmentResult = {
    github,
    portfolio,
    failures,
    usedUrls: evidenceUrls,
    extractedResumeLinks,
    resumeTextExcerpt,
  }

  const roleFamily = inferRoleFamily(application.jobTitle, application.jobDescription)
  const rubric = getRubric(roleFamily)
  const sarvamClient = new SarvamAIClient({ apiSubscriptionKey: options.sarvamApiKey })
  const compact = compactEnrichment(enrichment)
  const fullPrompt = buildPrompt({
    roleFamily,
    rubric,
    jobTitle: application.jobTitle,
    jobDescription: application.jobDescription,
    candidateName: application.name,
    candidateEmail: application.email,
    coverLetter: application.coverLetter,
    resumeUrl: application.resumeUrl,
    resumeTextExcerpt,
    extractedResumeLinks,
    githubEvidence: compact.github,
    portfolioEvidence: compact.portfolio,
    failures: compact.failures,
  })
  const minimalPrompt = buildMinimalPrompt({
    roleFamily,
    rubric,
    jobTitle: application.jobTitle,
    jobDescription: application.jobDescription,
    candidateName: application.name,
    candidateEmail: application.email,
    coverLetter: application.coverLetter,
    resumeTextExcerpt,
  })

  const parseRetryAfterMs = (error: unknown) => {
    const maybe = error as { response?: { headers?: { get?: (name: string) => string | null } } }
    const headerValue = maybe.response?.headers?.get?.("retry-after")
    if (!headerValue) return null
    const numeric = Number(headerValue)
    if (!Number.isNaN(numeric) && numeric > 0) return numeric * 1000
    return null
  }

  const isTransientAiError = (error: unknown) => {
    const text = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
    return text.includes("429") || text.includes("rate") || text.includes("timeout") || text.includes("503")
  }

  const isPromptTooLongError = (error: unknown) => {
    const text = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
    return text.includes("prompt is too long") || text.includes("max length")
  }

  const runCompletion = async (content: string) =>
    sarvamClient.chat.completions({
      temperature: SARVAM_THINKING_TEMPERATURE,
      top_p: SARVAM_TOP_P,
      reasoning_effort: "low",
      wiki_grounding: false,
      max_tokens: SARVAM_MAX_OUTPUT_TOKENS,
      messages: [
        {
          role: "system",
          content: `You are an expert role-adaptive hiring evaluator. Be concise, evidence-driven, and output valid JSON only. Keep response within ${SARVAM_MAX_OUTPUT_TOKENS} tokens.`,
        },
        {
          role: "user",
          content: `Context window limit is ${SARVAM_MAX_CONTEXT_TOKENS} tokens. ${content}`,
        },
      ],
    })

  let completion: Awaited<ReturnType<typeof runCompletion>>
  let attempt = 0
  let useMinimalPrompt = false
  // Global limiter throttles throughput; this retry handles transient provider failures.
  while (true) {
    try {
      completion = await runCompletion(useMinimalPrompt ? minimalPrompt : fullPrompt)
      break
    } catch (error) {
      if (!useMinimalPrompt && isPromptTooLongError(error)) {
        useMinimalPrompt = true
        continue
      }
      if (attempt >= options.llmMaxRetries || !isTransientAiError(error)) throw error
      const retryAfterMs = parseRetryAfterMs(error) ?? 1000 * 2 ** attempt
      await delay(Math.min(retryAfterMs, 15000))
      attempt += 1
    }
  }

  const content = completion.choices?.[0]?.message?.content
  if (!content) throw new Error("AI_EMPTY_RESPONSE")
  const parsed = parseAiJson(content, rubric, roleFamily)
  const finalScore = applyRoleAwareScoreAdjustments(parsed.score ?? 0, roleFamily, enrichment)
  parsed.score = finalScore
  parsed.roleFamily = roleFamily
  parsed.rubricVersion = RUBRIC_VERSION
  parsed.recommendation = normalizeRecommendation(parsed.recommendation, finalScore)

  const persistedEvidence = {
    ...enrichment,
    evaluationMeta: {
      roleFamily,
      rubricVersion: RUBRIC_VERSION,
    },
  }

  await db
    .insert(candidateEvaluations)
    .values({
      applicationId: application.id,
      jobId: application.jobId,
      organizationId: application.organizationId,
      model: "sarvam",
      score: finalScore,
      skillsJson: JSON.stringify(parsed.skills),
      resumeTextExcerpt,
      summary: parsed.summary,
      strengthsJson: JSON.stringify(parsed.strengths),
      weaknessesJson: JSON.stringify(parsed.weaknesses),
      recommendation: parsed.recommendation,
      evidenceJson: JSON.stringify(persistedEvidence),
      aiResponseJson: JSON.stringify(parsed),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: candidateEvaluations.applicationId,
      set: {
        jobId: application.jobId,
        organizationId: application.organizationId,
        model: "sarvam",
        score: finalScore,
        skillsJson: JSON.stringify(parsed.skills),
        resumeTextExcerpt,
        summary: parsed.summary,
        strengthsJson: JSON.stringify(parsed.strengths),
        weaknessesJson: JSON.stringify(parsed.weaknesses),
        recommendation: parsed.recommendation,
        evidenceJson: JSON.stringify(persistedEvidence),
        aiResponseJson: JSON.stringify(parsed),
        updatedAt: new Date(),
      },
    })
}
