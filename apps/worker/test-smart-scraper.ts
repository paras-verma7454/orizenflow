import { closeSmartScraperBrowser, smartScrape } from "./src/lib/smart-scraper"

const target = "https://www.luffytaro.me"

try {
    const startTime = performance.now()
    const result = await smartScrape(target)
    const endTime = performance.now()
    const duration = endTime - startTime

    console.log("SMART_SCRAPE_RESULT")
    console.log(
        JSON.stringify(
            {
                url: target,
                method: result.method,
                isSPA: result.isSPA,
                contentLength: result.content?.length ?? 0,
                durationMs: duration.toFixed(2),
                durationSec: (duration / 1000).toFixed(2),
                preview: (result.content ?? "").slice(0, 300),
            },
            null,
            2,
        ),
    )
    await closeSmartScraperBrowser()
    process.exit(0)
} catch (error) {
    console.error("SMART_SCRAPE_ERROR")
    console.error(error)
    await closeSmartScraperBrowser()
    process.exit(1)
}
