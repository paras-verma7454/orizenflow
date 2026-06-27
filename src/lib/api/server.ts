import { config } from "@/lib/config"

function isValidBaseUrl(value: string | undefined): value is string {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function resolveApiBase(): string {
  const base = [config.api.internalUrl, config.api.url, config.app.url].find(isValidBaseUrl)
  if (!base) {
    const fallback = "http://localhost:3000"
    console.error("[resolveApiBase] No valid API base URL found; falling back to", fallback)
    return fallback
  }
  return base
}
