/**
 * Smart web scraper with SPA detection and Playwright fallback
 * Optimized for free unlimited usage with resource blocking
 */

import { chromium } from "playwright"

const BLOCKED_DOMAINS = new Set([
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "192.168",
    "10.",
    "172.16",
])

const REQUEST_TIMEOUT_MS = 60000 // 60s max
const MAX_PAGE_SIZE_BYTES = 5_000_000 // 5MB max
const MAX_BROWSER_PAGES = Number(process.env.MAX_BROWSER_PAGES ?? "4")
const PLAYWRIGHT_VISIBLE_TEXT_THRESHOLD = Number(process.env.PLAYWRIGHT_VISIBLE_TEXT_THRESHOLD ?? "300")
const PAGE_TIMEOUT_MS = 15000 // 15s page load timeout (more aggressive)
const BROWSER_LAUNCH_TIMEOUT_MS = 45000 // 45s browser launch timeout
const PLAYWRIGHT_COOLDOWN_MS = 10 * 60 * 1000 // 10 min cooldown after launch failure
const ENABLE_PLAYWRIGHT = process.env.ENABLE_PLAYWRIGHT !== "false" // Can disable for testing
const BROWSER_LAUNCH_CANDIDATES: Array<{ name: string; channel?: "msedge" | "chrome" }> = [
    { name: "chromium" },
    { name: "msedge", channel: "msedge" },
    { name: "chrome", channel: "chrome" },
]
let browserPromise: Promise<import("playwright").Browser> | null = null
let activePageCount = 0
let playwrightDisabledUntil = 0

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message
    return String(error)
}

const disablePlaywrightTemporarily = (reason: string) => {
    playwrightDisabledUntil = Date.now() + PLAYWRIGHT_COOLDOWN_MS
    console.warn(`[smart-scraper] Playwright temporarily disabled: ${reason}`)
}

const isPlaywrightTemporarilyDisabled = () => Date.now() < playwrightDisabledUntil

const launchBrowserWithFallback = async () => {
    let lastError: unknown = null

    for (const candidate of BROWSER_LAUNCH_CANDIDATES) {
        try {
            console.log(`[smart-scraper] Launching browser candidate: ${candidate.name}`)
            return await chromium.launch({
                headless: true,
                timeout: BROWSER_LAUNCH_TIMEOUT_MS,
                channel: candidate.channel,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--no-first-run",
                    "--disable-dev-shm-usage",
                ],
            })
        } catch (error) {
            lastError = error
            console.warn(`[smart-scraper] Browser candidate failed: ${candidate.name} ${getErrorMessage(error)}`)
        }
    }

    throw lastError ?? new Error("All browser launch candidates failed")
}

const getBrowser = async () => {
    if (!browserPromise) {
        browserPromise = launchBrowserWithFallback()
        browserPromise
            .then((browser) => {
                console.log("[smart-scraper] Browser launched successfully")
                browser.on("disconnected", () => {
                    console.log("[smart-scraper] Browser disconnected")
                    browserPromise = null
                })
            })
            .catch((error) => {
                const message = getErrorMessage(error)
                console.error("[smart-scraper] Browser launch failed:", message)
                disablePlaywrightTemporarily(message)
                browserPromise = null
            })
    }

    return browserPromise
}

export const closeSmartScraperBrowser = async () => {
    if (!browserPromise) return

    try {
        const browser = await browserPromise
        await browser.close()
    } catch {
    } finally {
        browserPromise = null
    }
}

/**
 * Detect if HTML is likely an SPA that needs JS execution
 */
const isSPA = (html: string): boolean => {
    if (html.length < 1000) return true

    const hasRootDiv =
        /<div\s+id=["'](root|app|__next)["']/i.test(html)

    if (!hasRootDiv) return false

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    if (!bodyMatch) return false

    const bodyContent = bodyMatch[1]
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .trim()

    return bodyContent.length < 200
}

/**
 * Validate URL is safe to scrape
 */
const isValidUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url)

        // Only http/https
        if (!["http:", "https:"].includes(parsed.protocol)) {
            return false
        }

        // Block private/local addresses
        const host = parsed.hostname.toLowerCase()
        let isBlocked = false
        BLOCKED_DOMAINS.forEach((blocked) => {
            if (host.includes(blocked)) {
                isBlocked = true
            }
        })

        if (isBlocked) {
            return false
        }

        return true
    } catch {
        return false
    }
}

/**
 * Fetch HTML with timeout and size limit
 */
const fetchWithSafety = async (url: string): Promise<string | null> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            redirect: "follow",
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; OrizenFlow/1.0; +https://orizenflow.com)",
            },
        })

        if (!response.ok || !response.body) {
            return null
        }

        const reader = response.body.getReader()
        let received = 0
        const chunks: Uint8Array[] = []

        while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (!value) continue

            received += value.byteLength
            if (received > MAX_PAGE_SIZE_BYTES) {
                console.warn("[smart-scraper] Page too large:", url, received)
                return null
            }

            chunks.push(value)
        }

        const merged = new Uint8Array(received)
        let offset = 0
        for (const chunk of chunks) {
            merged.set(chunk, offset)
            offset += chunk.byteLength
        }

        return Buffer.from(merged).toString("utf8")
    } catch (error) {
        console.error("[smart-scraper] Fetch failed:", url, error)
        return null
    } finally {
        clearTimeout(timeout)
    }
}

const getVisibleTextLength = (html: string): number => {
    const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()

    return text.length
}

/**
 * Scrape SPA using Playwright with resource blocking
 */
const scrapeSPA = async (url: string): Promise<string | null> => {
    if (isPlaywrightTemporarilyDisabled()) {
        console.log("[smart-scraper] Skipping Playwright (cooldown active)")
        return null
    }

    // Wait for capacity (prevent too many concurrent pages)
    while (activePageCount >= MAX_BROWSER_PAGES) {
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    let page: import("playwright").Page | null = null

    try {
        activePageCount++
        console.log("[smart-scraper] Getting browser for SPA scrape")
        const browser = await getBrowser()
        console.log("[smart-scraper] Creating new page")
        page = await browser.newPage()

        // Block heavy resources to save bandwidth and speed up
        await page.route("**/*", (route) => {
            const type = route.request().resourceType()
            if (["image", "font", "media", "stylesheet"].includes(type)) {
                route.abort()
            } else {
                route.continue()
            }
        })

        console.log("[smart-scraper] Navigating to:", url)
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: PAGE_TIMEOUT_MS,
        })

        // Extract only innerText for lighter payload (better for AI)
        const content = await page.evaluate(() => document.body.innerText)

        await page.close()
        page = null

        return content
    } catch (error) {
        console.error("[smart-scraper] Playwright scrape failed:", url, error)
        const message = getErrorMessage(error)
        if (message.includes("Browser acquire timeout") || message.includes("launch:")) {
            disablePlaywrightTemporarily(message)
            browserPromise = null
        }
        if (page) {
            try {
                await page.close()
            } catch { }
        }
        return null
    } finally {
        activePageCount--
    }
}

/**
 * Smart scraper: Try fetch first, fallback to Playwright for SPAs
 */
export const smartScrape = async (url: string): Promise<{
    content: string | null
    method: "fetch" | "playwright" | "failed"
    isSPA: boolean
}> => {
    // Validate URL
    if (!isValidUrl(url)) {
        console.warn("[smart-scraper] Invalid URL:", url)
        return { content: null, method: "failed", isSPA: false }
    }

    // Try cheap fetch first
    console.log("[smart-scraper] Trying fetch for:", url)
    const html = await fetchWithSafety(url)

    if (!html) {
        return { content: null, method: "failed", isSPA: false }
    }

    // Check if SPA
    const isSPADetected = isSPA(html)

    if (!isSPADetected) {
        // Regular site, return HTML
        console.log("[smart-scraper] ✓ Static site, using fetch result")
        return { content: html, method: "fetch", isSPA: false }
    }

    const visibleTextLength = getVisibleTextLength(html)
    if (visibleTextLength >= PLAYWRIGHT_VISIBLE_TEXT_THRESHOLD) {
        console.log("[smart-scraper] SPA-like page has enough visible text, skipping Playwright")
        return { content: html, method: "fetch", isSPA: true }
    }

    // SPA detected, but Playwright disabled - return fetch result as fallback
    if (!ENABLE_PLAYWRIGHT) {
        console.log("[smart-scraper] SPA detected but Playwright disabled - returning fetch result")
        return { content: html, method: "failed", isSPA: true }
    }

    if (isPlaywrightTemporarilyDisabled()) {
        console.log("[smart-scraper] SPA detected but Playwright is in cooldown - returning fetch result")
        return { content: html, method: "failed", isSPA: true }
    }

    // SPA detected, use Playwright
    console.log("[smart-scraper] SPA detected, using Playwright for:", url)
    const spaContent = await scrapeSPA(url)

    if (!spaContent) {
        // Playwright failed, return original HTML as fallback
        return { content: html, method: "failed", isSPA: true }
    }

    console.log("[smart-scraper] ✓ Playwright extraction successful")
    return { content: spaContent, method: "playwright", isSPA: true }
}
