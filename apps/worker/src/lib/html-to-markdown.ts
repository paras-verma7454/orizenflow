import TurndownService from "turndown"
import { load } from "cheerio"

const turndownService = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
})

// Configure turndown to handle code blocks better
turndownService.addRule("strikethrough", {
    filter: (node: any) => ["S", "STRIKE", "DEL"].includes(node.nodeName),
    replacement: (content: string) => `~~${content}~~`,
})

turndownService.addRule("code-block", {
    filter: (node: any) => {
        return node.nodeName === "PRE" && node.parentNode?.nodeName !== "TABLE"
    },
    replacement: (content: string) => {
        return `\`\`\`\n${content}\n\`\`\``
    },
})

/**
 * Convert HTML to Markdown while preserving structure
 */
export const convertHtmlToMarkdown = (html: string): string => {
    try {
        let markdown = turndownService.turndown(html)

        // Clean up excessive whitespace
        markdown = markdown
            .replace(/\n{3,}/g, "\n\n") // Max 2 newlines
            .replace(/^ +/gm, "") // Remove leading spaces
            .trim()

        return markdown
    } catch (error) {
        console.error("Error converting HTML to markdown:", error)
        return ""
    }
}

/**
 * Extract main content from HTML using cheerio
 * Removes navigation, ads, footers, sidebars to keep semantic content
 */
export const extractMainContent = (html: string): string => {
    try {
        const $ = load(html)

        // Remove elements that are typically not main content
        const removeSelectors = [
            "script",
            "style",
            "noscript",
            "meta",
            "link",
            "nav",
            "aside",
            "footer",
            "header",
            "[role='navigation']",
            "[role='complementary']",
            ".nav",
            ".navbar",
            ".sidebar",
            ".advertisement",
            ".ads",
            "[data-ad-slot]",
            ".social-share",
            ".breadcrumb",
            ".newsletter-signup",
        ]

        removeSelectors.forEach((selector) => {
            $(selector).remove()
        })

        // Try to find main content area
        const mainContent =
            $("main").length > 0
                ? $("main")
                : $("article").length > 0
                    ? $("article")
                    : $("[role='main']").length > 0
                        ? $("[role='main']")
                        : $(".content, .post-content, .entry-content").length > 0
                            ? $(".content, .post-content, .entry-content")
                            : $("body")

        return mainContent.html() || ""
    } catch (error) {
        console.error("Error extracting main content:", error)
        return html
    }
}

/**
 * Normalize and resolve relative URLs
 */
export const resolveUrl = (url: string, baseUrl: string): string | null => {
    try {
        return new URL(url, baseUrl).toString()
    } catch {
        return null
    }
}

/**
 * Detect pagination links (next page, page numbers, etc)
 */
export const detectPaginationLinks = (html: string, baseUrl: string): string[] => {
    try {
        const $ = load(html)
        const paginationLinks: Set<string> = new Set()

        // Common pagination patterns
        const patterns = [
            "a[href*='?page=']",
            "a[href*='&page=']",
            "a[href*='/page/']",
            "a[href*='/p/']",
            "a[rel='next']",
            "a[aria-label*='next' i]",
            "a[title*='next' i]",
            "li.next a",
            "li.pagination-next a",
            "nav[role='navigation'] a",
        ]

        patterns.forEach((selector) => {
            $(selector).each((_, element) => {
                const href = $(element).attr("href")
                if (href) {
                    const resolved = resolveUrl(href, baseUrl)
                    if (resolved) {
                        paginationLinks.add(resolved)
                    }
                }
            })
        })

        return Array.from(paginationLinks)
    } catch (error) {
        console.error("Error detecting pagination links:", error)
        return []
    }
}

/**
 * Extract all links from HTML, prioritizing semantic navigation
 * Returns both pagination links and content section links
 */
export const extractLinksByType = (
    html: string,
    baseUrl: string,
): {
    navigation: string[] // Menu, breadcrumbs, section navigation
    pagination: string[] // Next page, page numbers
    content: string[] // Links within the main content
} => {
    try {
        const $ = load(html)
        const navigation: Set<string> = new Set()
        const pagination: Set<string> = new Set()
        const content: Set<string> = new Set()

        // Pagination links
        const paginationSelectors = [
            "a[href*='?page=']",
            "a[href*='&page=']",
            "a[href*='/page/']",
            "a[rel='next']",
            "a[rel='prev']",
            ".pagination a",
            ".pager a",
        ]

        paginationSelectors.forEach((selector) => {
            $(selector).each((_, el) => {
                const href = $(el).attr("href")
                if (href) {
                    const resolved = resolveUrl(href, baseUrl)
                    if (resolved) pagination.add(resolved)
                }
            })
        })

        // Navigation links (menus, breadcrumbs, etc)
        const navSelectors = ["nav a", "[role='navigation'] a", ".breadcrumb a", ".menu a"]
        navSelectors.forEach((selector) => {
            $(selector).each((_, el) => {
                const href = $(el).attr("href")
                if (href) {
                    const resolved = resolveUrl(href, baseUrl)
                    if (resolved) navigation.add(resolved)
                }
            })
        })

        // Filter out already-added links from main content links
        $("main, article, [role='main'], .content").find("a").each((_, el) => {
            const href = $(el).attr("href")
            if (href) {
                const resolved = resolveUrl(href, baseUrl)
                if (resolved && !pagination.has(resolved) && !navigation.has(resolved)) {
                    content.add(resolved)
                }
            }
        })

        return {
            navigation: Array.from(navigation),
            pagination: Array.from(pagination),
            content: Array.from(content),
        }
    } catch (error) {
        console.error("Error extracting links by type:", error)
        return { navigation: [], pagination: [], content: [] }
    }
}

/**
 * Convert HTML to Markdown with cleaned main content
 */
export const htmlToMarkdownWithCleanup = (html: string): string => {
    const cleanedHtml = extractMainContent(html)
    return convertHtmlToMarkdown(cleanedHtml)
}
