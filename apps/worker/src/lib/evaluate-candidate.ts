import { candidateEvaluations, db, jobApplications, jobs } from "@packages/db"
import { and, eq } from "drizzle-orm"
import { SarvamAIClient } from "sarvamai"
import { extractLinksByType, htmlToMarkdownWithCleanup, filterMarkdownForSignal } from "./html-to-markdown"
import { smartScrape } from "./smart-scraper"

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

type GithubFetchStatus = "none" | "success" | "403" | "rate_limited" | "network_error" | "failed"
type ResumeIngestionStatus =
  | "PDF_PARSED"
  | "TEXT_PARSED"
  | "HTML_VIEWER_BLOCKED"
  | "TOO_LARGE"
  | "FETCH_FAILED"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "PDF_PARSE_FAILED"

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
  githubFetchStatus: GithubFetchStatus
  githubUrlProvided: boolean
  githubEnriched: boolean
  portfolioContentPages: number
  resumeIngestionStatus: ResumeIngestionStatus
  resumeContentType: string | null
  resumeSizeBytes: number | null
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

type SkillEvidence = {
  resume: string[]
  github: string[]
  portfolio: string[]
}

type SkillOverlap = {
  jobKeywords: string[]
  candidateSkills: string[]
  matched: string[]
  missing: string[]
  ratio: number
}

type ResumeStructureMetrics = {
  bulletCount: number
  metricCount: number
  hasExperienceSections: boolean
}

type EvaluationMethod = "auto_reject" | "ai_evaluation"

type ProjectSignal = {
  title: string
  description: string
  technologies: string[]
  hasMetrics: boolean
  complexity: "high" | "medium" | "low"
}

const TRACKING_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"]
const MAX_RESUME_BYTES = 10_000_000
const GITHUB_MAX_REPOS = 5
const PORTFOLIO_MAX_PAGES = 6
const REQUEST_TIMEOUT_MS = 5000
const MAX_PROMPT_CHARS = 12_000
const SARVAM_MAX_OUTPUT_TOKENS = 900
const RUBRIC_VERSION = "v2-role-adaptive-2026-02"
const AUTO_REJECT_THRESHOLD = 0.15
const TECH_REGEX = /\b(react|reactjs|next\.?js|node\.?js|express|typescript|javascript|python|java|c\+\+|go|rust|ruby|php|swift|kotlin|bun|elysia|hono|drizzle|prisma|supabase|postgres(?:ql)?|mysql|mongodb|redis|elasticsearch|cassandra|docker|kubernetes|k8s|aws|gcp|azure|vercel|netlify|heroku|render|railway|tailwind(?:css)?|bootstrap|material-ui|chakra|websockets?|socket\.?io|oauth|jwt|assemblyai|openai|anthropic|gemini|graphql|rest|trpc|grpc|zod|yup|joi|vite|webpack|rollup|turbo(?:repo)?|nx|lerna|ci\/cd|jenkins|github\s*actions|gitlab|vue|angular|svelte|solid|astro|remix|django|flask|fastapi|spring|laravel|rails|figma|sketch|adobe\s*xd|photoshop|illustrator|blender|unity|unreal|godot|git|github|gitlab|bitbucket|jira|confluence|notion|slack|linear|asana|trello|salesforce|hubspot|marketo|segment|mixpanel|amplitude|datadog|sentry|newrelic|prometheus|grafana|kibana|tableau|powerbi|looker|snowflake|databricks|airflow|spark|hadoop|kafka|rabbitmq|celery)\b/gi
const TECH_STOPWORDS = new Set([
  "The",
  "This",
  "That",
  "With",
  "From",
  "Using",
  "Built",
  "Project",
  "Projects",
  "Full",
  "Stack",
  "Developer",
  "Engineer",
  "Engineering",
  "Application",
  "Role",
  "Candidate",
  "Summary",
  "Skills",
  "Education",
  "Experience",
  "Work",
  "About",
  "Contact",
  "Languages",
  "Frontend",
  "Backend",
  "Database",
  "DevOps",
  "Tools",
  "Others",
  "Link",
  "Live",
  "Source",
  "Code",
  "Demo",
  "GitHub",
  "Portfolio",
  "Repository",
  "Date",
  "Graduation",
  "Tech",
  "Computer",
  "Science",
  "India",
  "Created",
  "Developed",
  "Designed",
  "Implemented",
  "Integrated",
  "License",
  "Getting",
  "Started",
  "How",
  "Enter",
  "Upload",
  "Ask",
  "You",
  "Our",
  "First",
  "Generating",
  "Open",
  "Modern",
  "Powered",
  "System",
  "Tracking",
  "Evaluation",
  "Flow",
  "Questions",
  "Applicant",
  "Audio",
  "Engine",
  "Logos",
  "Artwork",
  "Chat",
])
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
  if (host.endsWith(".internal")) return true
  if (host === "127.0.0.1" || host === "::1") return true
  if (host.startsWith("10.")) return true
  if (host.startsWith("192.168.")) return true
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
    for (const key of parsed.searchParams.keys()) {
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

const extractDriveFileId = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl)
    const host = url.hostname.toLowerCase()
    if (!["drive.google.com", "docs.google.com", "drive.usercontent.google.com"].includes(host)) return null

    const parts = url.pathname.split("/").filter(Boolean)
    const fileIndex = parts.findIndex((part) => part === "d")
    if (fileIndex >= 0 && parts[fileIndex + 1]) return parts[fileIndex + 1]

    const ucIndex = parts.findIndex((part) => part === "uc")
    if (ucIndex >= 0) {
      const queryId = url.searchParams.get("id")
      if (queryId) return queryId
    }

    const queryId = url.searchParams.get("id")
    if (queryId) return queryId

    return null
  } catch {
    return null
  }
}

const toCanonicalResumeUrl = (rawUrl: string) => {
  const fileId = extractDriveFileId(rawUrl)
  if (!fileId) return { url: rawUrl, driveFileId: null as string | null }
  return {
    url: `https://drive.usercontent.google.com/uc?id=${fileId}&export=download`,
    driveFileId: fileId,
  }
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

const parsePdfText = async (bytes: Uint8Array) => {
  const pdfParseModule = await import("pdf-parse")
  const pdfParse = pdfParseModule.default
  const parsed = await pdfParse(Buffer.from(bytes))
  const text = typeof parsed?.text === "string" ? parsed.text : ""
  return text.replace(/\s+/g, " ").trim()
}

const ingestResumeText = async (resumeUrl: string) => {
  const canonical = toCanonicalResumeUrl(resumeUrl)

  try {
    const res = await fetchWithTimeout(canonical.url, { redirect: "follow" })
    if (!res.ok || !res.body) {
      return {
        text: null,
        status: "FETCH_FAILED" as ResumeIngestionStatus,
        contentType: null,
        sizeBytes: null,
        canonicalUrl: canonical.url,
      }
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase()
    const contentLength = Number(res.headers.get("content-length") ?? 0)
    if (Number.isFinite(contentLength) && contentLength > MAX_RESUME_BYTES) {
      return {
        text: null,
        status: "TOO_LARGE" as ResumeIngestionStatus,
        contentType,
        sizeBytes: contentLength,
        canonicalUrl: canonical.url,
      }
    }

    const reader = res.body.getReader()
    let received = 0
    const chunks: Uint8Array[] = []
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (!value) continue
      received += value.byteLength
      if (received > MAX_RESUME_BYTES) {
        return {
          text: null,
          status: "TOO_LARGE" as ResumeIngestionStatus,
          contentType,
          sizeBytes: received,
          canonicalUrl: canonical.url,
        }
      }
      chunks.push(value)
    }

    const merged = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) {
      const size = Math.min(chunk.length, merged.length - offset)
      merged.set(chunk.slice(0, size), offset)
      offset += size
    }

    if (contentType.includes("text/html")) {
      return {
        text: null,
        status: "HTML_VIEWER_BLOCKED" as ResumeIngestionStatus,
        contentType,
        sizeBytes: received,
        canonicalUrl: canonical.url,
      }
    }

    const shouldParsePdf =
      contentType.includes("application/pdf")
      || contentType.includes("application/octet-stream")
      || canonical.driveFileId !== null

    if (shouldParsePdf) {
      try {
        const pdfText = await parsePdfText(merged)
        if (!pdfText) {
          return {
            text: null,
            status: "PDF_PARSE_FAILED" as ResumeIngestionStatus,
            contentType,
            sizeBytes: received,
            canonicalUrl: canonical.url,
          }
        }
        return {
          text: pdfText.slice(0, 12000),
          status: "PDF_PARSED" as ResumeIngestionStatus,
          contentType,
          sizeBytes: received,
          canonicalUrl: canonical.url,
        }
      } catch {
        return {
          text: null,
          status: "PDF_PARSE_FAILED" as ResumeIngestionStatus,
          contentType,
          sizeBytes: received,
          canonicalUrl: canonical.url,
        }
      }
    }

    if (contentType.includes("text/plain")) {
      const text = Buffer.from(merged).toString("utf8").replace(/\s+/g, " ").trim()
      return {
        text: text.slice(0, 12000),
        status: "TEXT_PARSED" as ResumeIngestionStatus,
        contentType,
        sizeBytes: received,
        canonicalUrl: canonical.url,
      }
    }

    return {
      text: null,
      status: "UNSUPPORTED_CONTENT_TYPE" as ResumeIngestionStatus,
      contentType,
      sizeBytes: received,
      canonicalUrl: canonical.url,
    }
  } catch {
    return {
      text: null,
      status: "FETCH_FAILED" as ResumeIngestionStatus,
      contentType: null,
      sizeBytes: null,
      canonicalUrl: canonical.url,
    }
  }
}

const retryOnce = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn()
  } catch {
    await delay(500)
    return await fn()
  }
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
  const pages: Array<{ url: string; title?: string; textSnippet: string; method?: string }> = []
  const rootHost = new URL(rootUrl).hostname

  while (queue.length > 0 && pages.length < PORTFOLIO_MAX_PAGES) {
    // Sort queue by URL score (higher priority first)
    queue.sort((a, b) => scorePortfolioUrl(b) - scorePortfolioUrl(a))
    const next = queue.shift()
    if (!next || visited.has(next)) continue
    visited.add(next)

    // Use smart scraper with SPA detection and Playwright fallback
    const scraped = await smartScrape(next)
    if (!scraped.content) {
      console.warn("[scrapePortfolio] Failed to scrape:", next)
      continue
    }

    let textSnippet = ""
    let title: string | undefined

    if (scraped.method === "playwright") {
      // Playwright returns innerText directly - already clean text
      textSnippet = scraped.content.slice(0, 1200)
      // Try to extract title from beginning of text
      const lines = scraped.content.split("\n").filter((l) => l.trim().length > 0)
      title = lines[0]?.slice(0, 100)
    } else {
      // Regular HTML - extract title and convert to markdown
      const titleMatch = scraped.content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      title = titleMatch?.[1]?.trim()

      // Convert HTML to markdown with cleanup
      const markdown = htmlToMarkdownWithCleanup(scraped.content)
      const filtered = filterMarkdownForSignal(markdown)
      textSnippet = filtered.slice(0, 1200)
    }

    pages.push({
      url: next,
      title,
      textSnippet,
      method: scraped.method,
    })

    // Only follow links for static sites (not SPAs)
    // SPAs are single-page by nature, no need to crawl
    if (scraped.method === "fetch" && scraped.content.includes("<a")) {
      const allLinks = extractAllLinks(scraped.content, next)
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
  }

  return { rootUrl, pages }
}

const scorePortfolioUrl = (url: string): number => {
  try {
    const path = new URL(url).pathname.toLowerCase()
    if (path.includes("/projects")) return 100
    if (path.includes("/work")) return 90
    if (path.includes("/case-study") || path.includes("/case-studies")) return 90
    if (path.includes("/portfolio")) return 80
    if (path.includes("/github")) return 70
    if (path.includes("/about") || path.includes("/contact")) return 10
    return 50
  } catch {
    return 50
  }
}

const createEvidenceUrls = ({
  githubUrl,
  portfolioUrl,
}: {
  githubUrl: string | null
  portfolioUrl: string | null
}) => {
  const raw: Array<{ url: string; source: EvidenceUrl["source"] }> = []
  if (githubUrl) raw.push({ url: githubUrl, source: "form_github" })
  if (portfolioUrl) raw.push({ url: portfolioUrl, source: "form_portfolio" })

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

const extractResumeTextExcerpt = async (resumeUrl: string) => {
  const ingested = await ingestResumeText(resumeUrl)
  return ingested
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
    score: 85,
    scoreBreakdown: rubric.criteria.map((item) => ({
      key: item.key,
      label: item.label,
      score: Math.min(item.max, 20),
      max: item.max,
    })),
    skills: ["..."],
    summary: "...",
    strengths: ["..."],
    weaknesses: ["..."],
    recommendation: "Strong Hire | Hire | Hold | No Hire",
  })

const extractJsonFromText = (text: string): string | null => {
  const firstBrace = text.indexOf("{")
  if (firstBrace === -1) return null
  const candidate = text.slice(firstBrace)
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = 0; index < candidate.length; index += 1) {
    const char = candidate[index]
    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === "\\") {
        escaped = true
        continue
      }
      if (char === '"') inString = false
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }
    if (char === "{") {
      depth += 1
      continue
    }
    if (char === "}") {
      depth -= 1
      if (depth === 0) {
        return candidate.slice(0, index + 1)
      }
    }
  }

  return null
}

const repairJson = (jsonText: string) => {
  const withoutTrailingCommas = jsonText.replace(/,\s*([}\]])/g, "$1")
  const withoutControlChars = Array.from(withoutTrailingCommas)
    .filter((char) => {
      const code = char.charCodeAt(0)
      if (char === "\n" || char === "\r" || char === "\t") return true
      return code >= 32
    })
    .join("")
  return withoutControlChars.trim()
}

const recommendationFromScore = (score: number) => {
  if (score >= 80) return "Strong Hire"
  if (score >= 70) return "Hire"
  if (score >= 55) return "Hold"
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

const canonicalizeSkill = (value: string) => {
  const lower = value.trim().toLowerCase()
  if (!lower) return null
  if (lower === "reactjs" || lower.includes("react-like")) return "React"
  if (lower === "node" || lower === "nodejs" || lower === "node.js") return "Node.js"
  if (lower === "nextjs" || lower === "next.js") return "Next.js"
  if (lower === "typescript/javascript") return "TypeScript"
  if (lower === "tailwind" || lower === "tailwindcss") return "TailwindCSS"
  if (lower === "postgres" || lower === "postgresql") return "PostgreSQL"
  if (lower === "socket.io" || lower === "websockets") return "WebSocket"
  if (lower === "ci/cd") return "CI/CD"
  if (lower.includes("modern stack awareness")) return null
  if (lower.includes("awareness") || lower.includes("mindset") || lower.includes("communication")) return null
  if (lower.includes("soft skills") || lower.includes("problem solving")) return null
  return value.trim()
}

const extractAdvancedSkills = (text: string | null | undefined): Set<string> => {
  const skills = new Set<string>()
  if (!text) return skills

  // Only use the specific tech regex, not the generic pattern
  // This avoids noise from section headers and random capitalized words
  TECH_REGEX.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TECH_REGEX.exec(text)) !== null) {
    const normalized = canonicalizeSkill(match[0])
    if (normalized && !TECH_STOPWORDS.has(normalized)) {
      skills.add(normalized)
    }
  }

  return skills
}

const toSortedSkillArray = (skills: Set<string>) => [...skills].sort((a, b) => a.localeCompare(b))

const collectSkillEvidence = (enrichment: EnrichmentResult, resumeTextExcerpt: string | null): SkillEvidence => {
  const resumeSkills = extractAdvancedSkills(resumeTextExcerpt)

  const githubSkills = new Set<string>()
  if (enrichment.github) {
    for (const language of Object.keys(enrichment.github.languages)) {
      const normalized = canonicalizeSkill(language)
      if (normalized) githubSkills.add(normalized)
    }
    for (const repo of enrichment.github.topRepos) {
      for (const language of repo.languages) {
        const normalized = canonicalizeSkill(language)
        if (normalized) githubSkills.add(normalized)
      }
      for (const token of extractAdvancedSkills(repo.readmeSnippet)) githubSkills.add(token)
      for (const token of extractAdvancedSkills(repo.name)) githubSkills.add(token)
    }
  }

  const portfolioSkills = new Set<string>()
  if (enrichment.portfolio) {
    for (const page of enrichment.portfolio.pages) {
      for (const token of extractAdvancedSkills(page.title)) portfolioSkills.add(token)
      for (const token of extractAdvancedSkills(page.textSnippet)) portfolioSkills.add(token)
    }
  }

  return {
    resume: toSortedSkillArray(resumeSkills),
    github: toSortedSkillArray(githubSkills),
    portfolio: toSortedSkillArray(portfolioSkills),
  }
}

const computeSkillOverlap = (jobDescription: string, skillEvidence: SkillEvidence): SkillOverlap => {
  const jobKeywords = extractAdvancedSkills(jobDescription)
  const candidateSkills = new Set<string>([...skillEvidence.resume, ...skillEvidence.github, ...skillEvidence.portfolio])
  const matched = [...candidateSkills].filter((skill) => jobKeywords.has(skill)).sort((a, b) => a.localeCompare(b))
  const missing = [...jobKeywords].filter((skill) => !candidateSkills.has(skill)).sort((a, b) => a.localeCompare(b))
  const ratio = jobKeywords.size > 0 ? matched.length / jobKeywords.size : 0

  return {
    jobKeywords: toSortedSkillArray(jobKeywords),
    candidateSkills: toSortedSkillArray(candidateSkills),
    matched,
    missing,
    ratio,
  }
}

const computeResumeStructureMetrics = (resumeTextExcerpt: string | null): ResumeStructureMetrics => {
  const text = resumeTextExcerpt ?? ""
  const bulletCount = (text.match(/(^\s*[-•*])|\n\s*[-•*]/gm) ?? []).length
  const metricCount = (text.match(/\d+%|\$\d+[\d,]*|\d+x|\d+\s+users?/gi) ?? []).length
  const hasExperienceSections = /experience|work history|employment|projects/i.test(text)

  return {
    bulletCount,
    metricCount,
    hasExperienceSections,
  }
}

const PROJECT_SECTION_KEYWORDS = [
  "projects",
  "personal projects",
  "side projects",
  "technical projects",
  "open source",
  "github projects",
  "portfolio",
]

const HIGH_COMPLEXITY_KEYWORDS = [
  "architecture",
  "microservice",
  "distributed",
  "scalable",
  "real-time",
  "streaming",
  "kubernetes",
  "docker",
  "aws",
  "gcp",
  "azure",
  "machine learning",
  "ai",
  "neural",
  "pipeline",
  "etl",
  "data pipeline",
  "grpc",
  "websocket",
  "graphql",
]

const extractResumeProjects = (resumeText: string | null): ProjectSignal[] => {
  if (!resumeText) return []

  const projects: ProjectSignal[] = []
  const lines = resumeText.split("\n")
  const text = resumeText.toLowerCase()

  let inProjectSection = false
  let currentProject: Partial<ProjectSignal> | null = null
  let currentProjectLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineLower = line.toLowerCase().trim()

    const isSectionHeader = PROJECT_SECTION_KEYWORDS.some((keyword) => {
      const headerMatch = line.match(/^(#{1,6}\s+)?([A-Z][A-Za-z\s]+?)(?:\s*[-:]|)$/)
      return headerMatch && lineLower.includes(keyword)
    })

    if (isSectionHeader && !inProjectSection) {
      inProjectSection = true
      continue
    }

    if (inProjectSection) {
      const nextLineLower = lines[i + 1]?.toLowerCase().trim() || ""
      const isNextSection = nextLineLower.match(/^(education|experience|skills|summary|certifications|languages|interests)/)

      if (isNextSection) {
        if (currentProject && currentProject.title) {
          const techSet = new Set<string>()
          const projectText = currentProject.description || ""
          const allText = [currentProject.title, projectText, currentProjectLines.join(" ")].join(" ")

          const techMatches = allText.match(TECH_REGEX)
          if (techMatches) {
            for (const match of techMatches) {
              const normalized = canonicalizeSkill(match)
              if (normalized) techSet.add(normalized)
            }
          }

          const hasMetrics = /\d+%|\$\d+[\d,]*|\d+x|\d+\s+(users?|customers?|requests?|views?|performance|speed|improvement)/i.test(
            currentProjectLines.join(" ")
          )

          const complexityScore = HIGH_COMPLEXITY_KEYWORDS.filter((kw) => allText.toLowerCase().includes(kw)).length
          const hasManyTech = techSet.size >= 3
          const complexity: "high" | "medium" | "low" =
            (complexityScore >= 2 && hasMetrics) || (complexityScore >= 3) ? "high" : complexityScore >= 1 ? "medium" : "low"

          projects.push({
            title: currentProject.title,
            description: currentProject.description || currentProjectLines.slice(0, 2).join(" "),
            technologies: [...techSet],
            hasMetrics,
            complexity,
          })
        }
        inProjectSection = false
        currentProject = null
        currentProjectLines = []
        continue
      }

      const bulletMatch = line.match(/^[-•*]\s*(.+)/)
      if (bulletMatch) {
        if (!currentProject) {
          currentProject = { title: bulletMatch[1].slice(0, 100), description: "", technologies: [], hasMetrics: false, complexity: "low" }
        } else {
          currentProjectLines.push(bulletMatch[1])
        }
      } else if (line.trim() && currentProject) {
        currentProjectLines.push(line.trim())
      }
    }
  }

  if (currentProject && currentProject.title) {
    const techSet = new Set<string>()
    const projectText = currentProject.description || ""
    const allText = [currentProject.title, projectText, currentProjectLines.join(" ")].join(" ")

    const techMatches = allText.match(TECH_REGEX)
    if (techMatches) {
      for (const match of techMatches) {
        const normalized = canonicalizeSkill(match)
        if (normalized) techSet.add(normalized)
      }
    }

    const hasMetrics = /\d+%|\$\d+[\d,]*|\d+x|\d+\s+(users?|customers?|requests?|views?|performance|speed|improvement)/i.test(
      currentProjectLines.join(" ")
    )

    const complexityScore = HIGH_COMPLEXITY_KEYWORDS.filter((kw) => allText.toLowerCase().includes(kw)).length
    const hasManyTech = techSet.size >= 3
    const complexity: "high" | "medium" | "low" =
      (complexityScore >= 2 && hasMetrics) || (complexityScore >= 3) ? "high" : complexityScore >= 1 ? "medium" : "low"

    projects.push({
      title: currentProject.title,
      description: currentProject.description || currentProjectLines.slice(0, 2).join(" "),
      technologies: [...techSet],
      hasMetrics,
      complexity,
    })
  }

  return projects.slice(0, 5)
}

const normalizeSkillLabels = (skills: string[]) => {
  const unique = new Set<string>()
  for (const skill of skills) {
    const mapped = canonicalizeSkill(skill)
    if (!mapped) continue
    unique.add(mapped)
  }
  return [...unique].slice(0, 20)
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
    "Return strict JSON only with this schema:",
    scoreSchema(rubric),
    "",
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
    "Skills list must contain concrete tools/platforms/frameworks only (e.g., React, Node.js, AWS, Docker, PostgreSQL, Figma, Salesforce, HubSpot, Google Analytics, Jira).",
    "Do NOT include abstract phrases like 'modern stack awareness', 'communication', or 'problem solving' in skills.",
    "For non-engineering roles also return tool/platform names (not generic descriptors).",
    "",
    roleAwareInstruction,
    ...rubric.extraInstructions,
    "When evidence is missing, score neutrally for unrelated criteria instead of penalizing unfairly.",
    "",
    `Job title: ${trimText(jobTitle, 180)}`,
    `Job description: ${trimText(jobDescription, 2200)}`,
    "",
    `Candidate: ${trimText(candidateName, 120)} (${candidateEmail})`,
    `Cover letter: ${trimText(coverLetter, 800) ?? "N/A"}`,
    "",
    `Resume URL: ${resumeUrl}`,
    `Resume text excerpt: ${trimText(resumeTextExcerpt, 6000) ?? "N/A"}`,
    `Extracted links from resume: ${JSON.stringify(extractedResumeLinks.slice(0, 12))}`,
    "",
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
  skillOverlap,
  resumeStructureMetrics,
  projectSignals,
}: {
  roleFamily: RoleFamily
  rubric: RubricDefinition
  jobTitle: string
  jobDescription: string
  candidateName: string
  candidateEmail: string
  coverLetter: string | null
  resumeTextExcerpt: string | null
  skillOverlap: SkillOverlap
  resumeStructureMetrics: ResumeStructureMetrics
  projectSignals: ProjectSignal[]
}) => {
  const strongProjects = projectSignals.filter((p) => p.complexity === "high" && p.hasMetrics)
  const projectInfo = projectSignals.length > 0
    ? `Resume projects: ${projectSignals.length} found (${strongProjects.length} strong with metrics/complexity). ${projectSignals.slice(0, 3).map((p) => `${p.title}: ${p.technologies.slice(0, 4).join(", ")}`).join("; ")}`
    : "Resume projects: None found"

  return [
    "Evaluate this candidate using the strict role-adaptive rubric. Output JSON only.",
    "Return JSON with this exact structure:",
    scoreSchema(rubric),
    `Detected role family: ${roleFamily}`,
    `Rubric: ${rubric.criteria.map((item) => `${item.key}(0-${item.max})`).join(", ")}.`,
    "Skills must be concrete tool/platform names only (examples: React, Node.js, AWS, Docker, Figma, Salesforce, HubSpot, Google Analytics, Jira).",
    "Avoid abstract skill phrases.",
    roleFamily === "engineering"
      ? "Do NOT penalize missing formal experience when project/GitHub evidence is strong."
      : "Do NOT penalize missing GitHub for non-engineering roles.",
    `Role: ${trimText(jobTitle, 160)}`,
    `Job: ${trimText(jobDescription, 1400)}`,
    `Candidate: ${trimText(candidateName, 120)} (${candidateEmail})`,
    `Cover letter: ${trimText(coverLetter, 500) ?? "N/A"}`,
    `Resume excerpt: ${trimText(resumeTextExcerpt, 3000) ?? "N/A"}`,
    `Resume structure: bullets=${resumeStructureMetrics.bulletCount}, quantified=${resumeStructureMetrics.metricCount}, experience_sections=${resumeStructureMetrics.hasExperienceSections ? "Yes" : "No"}`,
    projectInfo,
    `Skill overlap with job: ${skillOverlap.matched.length}/${skillOverlap.jobKeywords.length} matched (${Math.round(skillOverlap.ratio * 100)}%)`,
  ].join("\n")
}

const parseAiJson = (content: string, rubric: RubricDefinition, fallbackRoleFamily: RoleFamily): ParsedEvaluation => {
  let cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "")
  cleaned = cleaned.replace(/<think[\s\S]*?>[\s\S]*?(<\/think>|$)/gi, "").trim()
  const extracted = extractJsonFromText(cleaned)
  if (!extracted) {
    throw new Error("AI_NO_JSON_FOUND")
  }
  const repaired = repairJson(extracted)

  let parsed: {
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

  try {
    parsed = JSON.parse(repaired)
  } catch (parseError) {
    console.error("[parseAiJson] JSON parse failed:", {
      error: parseError instanceof Error ? parseError.message : String(parseError),
      contentLength: repaired.length,
      contentStart: repaired.slice(0, 100),
    })
    throw new Error(`AI_JSON_PARSE_ERROR: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
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
    skills: Array.isArray(parsed.skills)
      ? normalizeSkillLabels(parsed.skills.filter((item): item is string => typeof item === "string"))
      : [],
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

const applyProjectQualityBoost = (
  baseScore: number,
  roleFamily: RoleFamily,
  projectSignals: ProjectSignal[],
): { score: number; boostApplied: boolean } => {
  if (roleFamily !== "engineering") {
    return { score: baseScore, boostApplied: false }
  }

  const strongProjects = projectSignals.filter((p) => p.complexity === "high" && p.hasMetrics)

  if (strongProjects.length >= 2) {
    return { score: Math.min(100, baseScore + 8), boostApplied: true }
  }
  if (strongProjects.length === 1) {
    return { score: Math.min(100, baseScore + 4), boostApplied: true }
  }

  return { score: baseScore, boostApplied: false }
}

const applyDeterministicCaps = ({
  parsed,
  overlapRatio,
  githubEvidencePresent,
  resumeStructureMetrics,
  portfolioContentPages,
}: {
  parsed: ParsedEvaluation
  overlapRatio: number
  githubEvidencePresent: boolean
  resumeStructureMetrics: ResumeStructureMetrics
  portfolioContentPages: number
}) => {
  const capsApplied: string[] = []
  const breakdown = parsed.scoreBreakdown.map((item) => ({ ...item }))

  const githubItem = breakdown.find((item) => item.key === "github")
  if (githubItem && !githubEvidencePresent) {
    if (githubItem.score !== 0) capsApplied.push("GITHUB_NO_EVIDENCE")
    githubItem.score = 0
  }

  const resumeItem = breakdown.find((item) => item.key === "resume")
  if (resumeItem && resumeStructureMetrics.bulletCount < 2 && resumeItem.score > 5) {
    resumeItem.score = 5
    capsApplied.push("RESUME_LOW_STRUCTURE")
  }

  const portfolioItem = breakdown.find((item) => item.key === "portfolio")
  if (portfolioItem && portfolioContentPages === 0 && portfolioItem.score > 5) {
    portfolioItem.score = 5
    capsApplied.push("PORTFOLIO_NO_CONTENT")
  }

  let total = breakdown.reduce((sum, item) => sum + item.score, 0)
  if (overlapRatio === 0 && total > 60) {
    total = 60
    capsApplied.push("ZERO_SKILL_OVERLAP")
  }

  parsed.scoreBreakdown = breakdown
  parsed.score = total
  parsed.recommendation = normalizeRecommendation(parsed.recommendation, total)

  return capsApplied
}

const computeEvidenceIntegrityScore = ({
  resumeIngestionStatus,
  githubEnriched,
  portfolioContentPages,
  skillOverlap,
  failuresCount,
}: {
  resumeIngestionStatus: ResumeIngestionStatus
  githubEnriched: boolean
  portfolioContentPages: number
  skillOverlap: SkillOverlap
  failuresCount: number
}) => {
  const resumeEvidenceValid = resumeIngestionStatus === "PDF_PARSED" || resumeIngestionStatus === "TEXT_PARSED" ? 1 : 0
  const githubEvidenceValid = githubEnriched ? 1 : 0
  const portfolioEvidenceValid = portfolioContentPages > 0 ? 1 : 0
  const overlapEvidencePresent = skillOverlap.jobKeywords.length > 0 ? 1 : 0
  const sourceChecks = 3
  const sourceSuccess = resumeEvidenceValid + githubEvidenceValid + portfolioEvidenceValid
  const fetchSuccessRate = sourceSuccess / sourceChecks
  const penalty = Math.min(20, failuresCount * 4)

  const raw = 100
    * (0.30 * resumeEvidenceValid
      + 0.25 * githubEvidenceValid
      + 0.20 * portfolioEvidenceValid
      + 0.15 * overlapEvidencePresent
      + 0.10 * fetchSuccessRate)
    - penalty

  const score = Math.max(0, Math.min(100, Math.round(raw)))
  const tier = score >= 80 ? "high" : score >= 60 ? "medium" : "low"
  return { score, tier }
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
  const resumeIngestion = await extractResumeTextExcerpt(application.resumeUrl)
  const trimmedResumeTextExcerpt = resumeIngestion.text?.slice(0, 6000) ?? null
  const extractedResumeLinks: string[] = []
  const evidenceUrls = createEvidenceUrls({
    githubUrl: application.githubUrl,
    portfolioUrl: application.portfolioUrl,
  })

  const githubTarget = evidenceUrls.find((item) => item.kind === "github_profile" || item.kind === "github_repo")
  const portfolioTarget = evidenceUrls.find((item) => item.kind === "portfolio")

  if (resumeIngestion.status !== "PDF_PARSED" && resumeIngestion.status !== "TEXT_PARSED") {
    failures.push({
      source: "resume",
      url: resumeIngestion.canonicalUrl,
      reason: resumeIngestion.status,
      transient: false,
    })
  }

  const autoRejectRoleFamily = inferRoleFamily(application.jobTitle, application.jobDescription)
  const autoRejectRubric = getRubric(autoRejectRoleFamily)

  const resumeSkillsInitial = extractAdvancedSkills(trimmedResumeTextExcerpt)
  const skillEvidenceInitial: SkillEvidence = {
    resume: resumeSkillsInitial.size > 0 ? toSortedSkillArray(resumeSkillsInitial) : [],
    github: [],
    portfolio: [],
  }
  const skillOverlapInitial = computeSkillOverlap(application.jobDescription, skillEvidenceInitial)

  if (skillOverlapInitial.ratio < AUTO_REJECT_THRESHOLD) {
    console.log("[evaluateCandidateJob] Auto-reject: skill overlap too low", {
      applicationId: application.id,
      ratio: skillOverlapInitial.ratio,
      threshold: AUTO_REJECT_THRESHOLD,
    })

    const autoRejectEvaluation = {
      roleFamily: autoRejectRoleFamily,
      rubricVersion: RUBRIC_VERSION,
      score: 35,
      recommendation: "No Hire",
      summary: "Insufficient skill alignment with job requirements",
      skills: skillEvidenceInitial.resume.slice(0, 10),
      strengths: [] as string[],
      weaknesses: ["Minimal overlap with required skills"],
      scoreBreakdown: autoRejectRubric.criteria.map((c) => ({ key: c.key, label: c.label, score: 0, max: c.max })),
    }

    const persistedEvidence = {
      github: null,
      portfolio: null,
      failures,
      usedUrls: evidenceUrls,
      extractedResumeLinks,
      resumeTextExcerpt: trimmedResumeTextExcerpt,
      githubFetchStatus: "none" as GithubFetchStatus,
      githubUrlProvided: !!application.githubUrl,
      githubEnriched: false,
      portfolioContentPages: 0,
      resumeIngestionStatus: resumeIngestion.status,
      resumeContentType: resumeIngestion.contentType,
      resumeSizeBytes: resumeIngestion.sizeBytes,
      projectSignals: [] as ProjectSignal[],
      evaluationMeta: {
        roleFamily: autoRejectRoleFamily,
        rubricVersion: RUBRIC_VERSION,
        evidenceIntegrityScore: 20,
        evidenceIntegrityTier: "low" as const,
        capRulesApplied: [] as string[],
        projectBoostApplied: false,
        autoRejected: true,
        autoRejectReason: "LOW_SKILL_OVERLAP",
      },
    }

    await db
      .insert(candidateEvaluations)
      .values({
        applicationId: application.id,
        jobId: application.jobId,
        organizationId: application.organizationId,
        model: "sarvam",
        score: autoRejectEvaluation.score,
        status: "completed",
        evaluationMethod: "auto_reject",
        skillsJson: JSON.stringify(autoRejectEvaluation.skills),
        resumeTextExcerpt: trimmedResumeTextExcerpt,
        summary: autoRejectEvaluation.summary,
        strengthsJson: JSON.stringify(autoRejectEvaluation.strengths),
        weaknessesJson: JSON.stringify(autoRejectEvaluation.weaknesses),
        recommendation: autoRejectEvaluation.recommendation,
        evidenceJson: JSON.stringify(persistedEvidence),
        aiResponseJson: JSON.stringify(autoRejectEvaluation),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: candidateEvaluations.applicationId,
        set: {
          jobId: application.jobId,
          organizationId: application.organizationId,
          model: "sarvam",
          score: autoRejectEvaluation.score,
          status: "completed",
          evaluationMethod: "auto_reject",
          skillsJson: JSON.stringify(autoRejectEvaluation.skills),
          resumeTextExcerpt: trimmedResumeTextExcerpt,
          summary: autoRejectEvaluation.summary,
          strengthsJson: JSON.stringify(autoRejectEvaluation.strengths),
          weaknessesJson: JSON.stringify(autoRejectEvaluation.weaknesses),
          recommendation: autoRejectEvaluation.recommendation,
          evidenceJson: JSON.stringify(persistedEvidence),
          aiResponseJson: JSON.stringify(autoRejectEvaluation),
          updatedAt: new Date(),
        },
      })

    console.log("[evaluateCandidateJob] Auto-reject persisted:", {
      applicationId: application.id,
      score: autoRejectEvaluation.score,
      recommendation: autoRejectEvaluation.recommendation,
    })
    return
  }

  let github: EnrichmentResult["github"] = null
  let portfolio: EnrichmentResult["portfolio"] = null
  let githubFetchStatus: GithubFetchStatus = githubTarget ? "failed" : "none"

  if (options.enableEvidenceScraping) {
    const [githubResult, portfolioResult] = await Promise.allSettled([
      githubTarget ? retryOnce(() => scrapeGithub(githubTarget.normalizedUrl, options.githubToken)) : Promise.resolve(null),
      portfolioTarget ? retryOnce(() => scrapePortfolio(portfolioTarget.normalizedUrl)) : Promise.resolve(null),
    ])

    if (githubResult.status === "fulfilled" && githubResult.value) {
      github = githubResult.value
      githubFetchStatus = "success"
    } else if (githubResult.status === "rejected" && githubTarget) {
      const reason = githubResult.reason instanceof Error ? githubResult.reason.message : "GITHUB_SCRAPE_FAILED"
      if (reason.includes("403")) githubFetchStatus = "403"
      else if (reason.includes("429")) githubFetchStatus = "rate_limited"
      else if (reason.includes("FETCH") || reason.includes("NETWORK")) githubFetchStatus = "network_error"
      else githubFetchStatus = "failed"
      failures.push({
        source: "github",
        url: githubTarget.normalizedUrl,
        reason,
        transient: githubFetchStatus !== "403",
      })
    }

    if (portfolioResult.status === "fulfilled" && portfolioResult.value) {
      portfolio = portfolioResult.value
    } else if (portfolioResult.status === "rejected" && portfolioTarget) {
      failures.push({
        source: "portfolio",
        url: portfolioTarget.normalizedUrl,
        reason: portfolioResult.reason instanceof Error ? portfolioResult.reason.message : "PORTFOLIO_SCRAPE_FAILED",
        transient: true,
      })
    }
  }

  const portfolioContentPages = portfolio?.pages.filter((page) => page.textSnippet.trim().length > 0).length ?? 0

  const extractedProjects = extractResumeProjects(trimmedResumeTextExcerpt)
  console.log("[evaluateCandidateJob] Extracted resume projects:", {
    applicationId: application.id,
    projectCount: extractedProjects.length,
    strongProjects: extractedProjects.filter((p) => p.complexity === "high" && p.hasMetrics).length,
    projects: extractedProjects.map((p) => ({ title: p.title, complexity: p.complexity, hasMetrics: p.hasMetrics })),
  })

  const enrichment: EnrichmentResult = {
    github,
    portfolio,
    failures,
    usedUrls: evidenceUrls,
    extractedResumeLinks,
    resumeTextExcerpt: trimmedResumeTextExcerpt,
    githubFetchStatus,
    githubUrlProvided: !!application.githubUrl,
    githubEnriched: !!github,
    portfolioContentPages,
    resumeIngestionStatus: resumeIngestion.status,
    resumeContentType: resumeIngestion.contentType,
    resumeSizeBytes: resumeIngestion.sizeBytes,
  }

  const roleFamily = inferRoleFamily(application.jobTitle, application.jobDescription)
  const rubric = getRubric(roleFamily)
  const sarvamClient = new SarvamAIClient({ apiSubscriptionKey: options.sarvamApiKey })
  const compact = compactEnrichment(enrichment)
  const skillEvidence = collectSkillEvidence(enrichment, trimmedResumeTextExcerpt)
  const skillOverlap = computeSkillOverlap(application.jobDescription, skillEvidence)
  const resumeStructureMetrics = computeResumeStructureMetrics(trimmedResumeTextExcerpt)

  const integrity = computeEvidenceIntegrityScore({
    resumeIngestionStatus: resumeIngestion.status,
    githubEnriched: !!github,
    portfolioContentPages,
    skillOverlap,
    failuresCount: failures.length,
  })

  // Log the evidence metadata (NOT sent to AI - just for diagnostics)
  console.log("[evaluateCandidateJob] Evidence metadata collected (not in prompt):", {
    applicationId: application.id,
    roleFamily,
    githubUrlProvided: !!application.githubUrl,
    githubFetchStatus,
    githubEnriched: !!github,
    portfolioContentPages,
    resumeIngestionStatus: resumeIngestion.status,
    resumeExcerptLength: trimmedResumeTextExcerpt?.length ?? 0,
    evidenceIntegrityScore: integrity.score,
    evidenceIntegrityTier: integrity.tier,
  })

  const fullPrompt = buildPrompt({
    roleFamily,
    rubric,
    jobTitle: application.jobTitle,
    jobDescription: application.jobDescription,
    candidateName: application.name,
    candidateEmail: application.email,
    coverLetter: application.coverLetter,
    resumeUrl: application.resumeUrl,
    resumeTextExcerpt: trimmedResumeTextExcerpt,
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
    resumeTextExcerpt: trimmedResumeTextExcerpt,
    skillOverlap,
    resumeStructureMetrics,
    projectSignals: extractedProjects,
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
      temperature: 0,
      top_p: 1,
      wiki_grounding: false,
      max_tokens: SARVAM_MAX_OUTPUT_TOKENS,
      messages: [
        {
          role: "system",
          content:
            "You are a JSON API. Respond with a single valid JSON object. Do NOT output explanations. Do NOT output <think>. Do NOT output text before or after JSON. The first character must be { and the last character must be }.",
        },
        {
          role: "user",
          content,
        },
      ],
    })

  const runStrictJsonRecovery = async (context: string) =>
    sarvamClient.chat.completions({
      temperature: 0,
      top_p: 1,
      wiki_grounding: false,
      max_tokens: SARVAM_MAX_OUTPUT_TOKENS,
      messages: [
        {
          role: "system",
          content:
            "You are a JSON API. Respond with a single valid JSON object. Do NOT output explanations. Do NOT output <think>. Do NOT output text before or after JSON. The first character must be { and the last character must be }.",
        },
        {
          role: "user",
          content: [
            "Output the final JSON only.",
            "Do not explain.",
            "Start with { and end with }.",
            "Use this exact schema:",
            scoreSchema(rubric),
            "",
            "Candidate context:",
            context,
          ].join("\n"),
        },
      ],
    })

  let completion: Awaited<ReturnType<typeof runCompletion>>
  let attempt = 0
  let useMinimalPrompt = false
  // Global limiter throttles throughput; this retry handles transient provider failures.
  while (true) {
    try {
      const promptToUse = useMinimalPrompt ? minimalPrompt : fullPrompt
      console.log("[evaluateCandidateJob] ===== FULL PROMPT TO AI =====")
      console.log(promptToUse)
      console.log("[evaluateCandidateJob] ===== END PROMPT (length:", promptToUse.length, ") =====")
      completion = await runCompletion(promptToUse)
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

  let parsed: ParsedEvaluation

  if (!content.includes("{")) {
    console.warn("[evaluateCandidateJob] First response has no JSON brace, running strict JSON recovery", {
      applicationId: application.id,
    })
    const recoveryCompletion = await runStrictJsonRecovery(minimalPrompt)
    const recoveryContent = recoveryCompletion.choices?.[0]?.message?.content
    if (!recoveryContent) throw new Error("AI_EMPTY_RECOVERY_RESPONSE")
    parsed = parseAiJson(recoveryContent, rubric, roleFamily)
  } else {

    // Log AI response for debugging
    console.log("[evaluateCandidateJob] ===== FULL AI RESPONSE =====")
    console.log(content)
    console.log("[evaluateCandidateJob] ===== END RESPONSE (length:", content.length, ") =====")

    // Log first chars to debug unexpected responses
    if (content.startsWith("<")) {
      console.error("[evaluateCandidateJob] AI response starts with markup/think instead of JSON:", {
        contentLength: content.length,
        firstChars: content.slice(0, 150),
        applicationId: application.id,
      })
    }

    try {
      parsed = parseAiJson(content, rubric, roleFamily)
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : String(parseError)
      if (message.includes("AI_NO_JSON_FOUND")) {
        console.warn("[evaluateCandidateJob] No JSON found in first response, running strict JSON recovery", {
          applicationId: application.id,
        })

        const recoveryCompletion = await runStrictJsonRecovery(minimalPrompt)
        const recoveryContent = recoveryCompletion.choices?.[0]?.message?.content
        if (!recoveryContent) throw new Error("AI_EMPTY_RECOVERY_RESPONSE")

        console.log("[evaluateCandidateJob] Recovery AI response received:", {
          applicationId: application.id,
          contentLength: recoveryContent.length,
          content: recoveryContent.slice(0, 500),
        })

        parsed = parseAiJson(recoveryContent, rubric, roleFamily)
      } else {
        console.error("[evaluateCandidateJob] Failed to parse AI response:", {
          error: message,
          applicationId: application.id,
        })
        throw parseError
      }
    }
  }

  // Log parsed evaluation
  console.log("[evaluateCandidateJob] Parsed evaluation:", {
    applicationId: application.id,
    score: parsed.score,
    recommendation: parsed.recommendation,
    roleFamily: parsed.roleFamily,
    skillsCount: parsed.skills?.length ?? 0,
    strengths: parsed.strengths,
    weaknesses: parsed.weaknesses,
    summary: parsed.summary?.slice(0, 200),
  })
  const finalScore = applyRoleAwareScoreAdjustments(parsed.score ?? 0, roleFamily, enrichment)
  const rawAiScore = parsed.score ?? 0
  parsed.score = finalScore
  parsed.roleFamily = roleFamily
  parsed.rubricVersion = RUBRIC_VERSION
  parsed.recommendation = normalizeRecommendation(parsed.recommendation, finalScore)
  const capRulesApplied = applyDeterministicCaps({
    parsed,
    overlapRatio: skillOverlap.ratio,
    githubEvidencePresent: !!github,
    resumeStructureMetrics,
    portfolioContentPages,
  })

  const { score: scoreAfterProjectBoost, boostApplied: projectBoostApplied } = applyProjectQualityBoost(
    parsed.score ?? finalScore,
    roleFamily,
    extractedProjects,
  )
  parsed.score = scoreAfterProjectBoost
  parsed.recommendation = normalizeRecommendation(parsed.recommendation, scoreAfterProjectBoost)

  const persistedEvidence = {
    ...enrichment,
    projectSignals: extractedProjects,
    evaluationMeta: {
      roleFamily,
      rubricVersion: RUBRIC_VERSION,
      evidenceIntegrityScore: integrity.score,
      evidenceIntegrityTier: integrity.tier,
      capRulesApplied,
      projectBoostApplied,
      autoRejected: false,
    },
  }

  const persistedScore = parsed.score ?? scoreAfterProjectBoost

  console.log("[evaluateCandidateJob] Score transition:", {
    applicationId: application.id,
    rawAiScore,
    scoreAfterRoleAdjustments: finalScore,
    scoreAfterDeterministicCaps: parsed.score,
    scoreAfterProjectBoost: scoreAfterProjectBoost,
    persistedScore,
    capRulesApplied,
    projectBoostApplied,
    evidenceIntegrityScore: integrity.score,
    evidenceIntegrityTier: integrity.tier,
  })

  const [persistedEvaluation] = await db
    .insert(candidateEvaluations)
    .values({
      applicationId: application.id,
      jobId: application.jobId,
      organizationId: application.organizationId,
      model: "sarvam",
      score: persistedScore,
      status: "completed",
      evaluationMethod: "ai_evaluation",
      skillsJson: JSON.stringify(parsed.skills),
      resumeTextExcerpt: trimmedResumeTextExcerpt,
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
        score: persistedScore,
        status: "completed",
        evaluationMethod: "ai_evaluation",
        skillsJson: JSON.stringify(parsed.skills),
        resumeTextExcerpt: trimmedResumeTextExcerpt,
        summary: parsed.summary,
        strengthsJson: JSON.stringify(parsed.strengths),
        weaknessesJson: JSON.stringify(parsed.weaknesses),
        recommendation: parsed.recommendation,
        evidenceJson: JSON.stringify(persistedEvidence),
        aiResponseJson: JSON.stringify(parsed),
        updatedAt: new Date(),
      },
    })
    .returning({
      id: candidateEvaluations.id,
      applicationId: candidateEvaluations.applicationId,
      score: candidateEvaluations.score,
      recommendation: candidateEvaluations.recommendation,
      updatedAt: candidateEvaluations.updatedAt,
    })

  console.log("[evaluateCandidateJob] Persisted evaluation row:", {
    applicationId: persistedEvaluation?.applicationId,
    evaluationId: persistedEvaluation?.id,
    score: persistedEvaluation?.score,
    recommendation: persistedEvaluation?.recommendation,
    updatedAt: persistedEvaluation?.updatedAt,
  })
}
