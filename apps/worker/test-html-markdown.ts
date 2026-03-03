// Test script for HTML to Markdown conversion
// Run with: bun run test-html-markdown.ts

import { htmlToMarkdownWithCleanup, filterMarkdownForSignal, extractMainContent, convertHtmlToMarkdown } from "./src/lib/html-to-markdown"

const testUrl = "https://www.luffytaro.me"

console.log("=".repeat(80))
console.log("TESTING HTML TO MARKDOWN CONVERSION")
console.log("URL:", testUrl)
console.log("=".repeat(80))

try {
    console.log("\n[1] Fetching HTML...")
    const response = await fetch(testUrl)
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    console.log("   ✓ Fetched", html.length, "bytes")

    console.log("\n[2] Extracting main content...")
    const mainContent = extractMainContent(html)
    console.log("   ✓ Main content extracted:", mainContent.length, "bytes")
    console.log("   Preview (first 300 chars):")
    console.log("   ", mainContent.slice(0, 300).replace(/\n/g, " "))

    console.log("\n[3] Converting to markdown...")
    const markdown = convertHtmlToMarkdown(mainContent)
    console.log("   ✓ Markdown generated:", markdown.length, "chars")
    console.log("\n--- RAW MARKDOWN OUTPUT ---")
    console.log(markdown)
    console.log("--- END RAW MARKDOWN ---")

    console.log("\n[4] Applying signal filtering...")
    const filtered = filterMarkdownForSignal(markdown)
    console.log("   ✓ Filtered markdown:", filtered.length, "chars")
    console.log("\n--- FILTERED MARKDOWN OUTPUT ---")
    console.log(filtered)
    console.log("--- END FILTERED MARKDOWN ---")

    console.log("\n[5] Using full cleanup pipeline...")
    const cleaned = htmlToMarkdownWithCleanup(html)
    console.log("   ✓ Cleaned markdown:", cleaned.length, "chars")
    console.log("\n--- FULL CLEANUP PIPELINE OUTPUT ---")
    console.log(cleaned)
    console.log("--- END FULL CLEANUP ---")

    console.log("\n[6] With signal filtering on cleanup output...")
    const cleanedFiltered = filterMarkdownForSignal(cleaned)
    console.log("   ✓ Cleaned + filtered:", cleanedFiltered.length, "chars")
    console.log("\n--- CLEANED + FILTERED OUTPUT (what goes to AI) ---")
    console.log(cleanedFiltered)
    console.log("--- END CLEANED + FILTERED ---")

    console.log("\n" + "=".repeat(80))
    console.log("SUMMARY")
    console.log("=".repeat(80))
    console.log("Original HTML size:        ", html.length, "bytes")
    console.log("Main content size:         ", mainContent.length, "bytes")
    console.log("Raw markdown size:         ", markdown.length, "chars")
    console.log("Filtered markdown size:    ", filtered.length, "chars")
    console.log("Cleaned markdown size:     ", cleaned.length, "chars")
    console.log("Final output size:         ", cleanedFiltered.length, "chars")
    console.log("Reduction ratio:           ", Math.round((1 - cleanedFiltered.length / html.length) * 100), "%")

} catch (error) {
    console.error("\n❌ Error:", error)
    process.exit(1)
}
