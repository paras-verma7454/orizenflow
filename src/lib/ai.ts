import { env } from "@/lib/env"

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = env.LLM_MAX_RETRIES): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000))
      }
    }
  }
  throw lastError
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim()
}

function stripThinkingBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
}

function fixTrailingCommas(text: string): string {
  return text.replace(/,\s*([\]}])/g, "$1")
}

function findBalancedJson(text: string): string | null {
  let lastValid: string | null = null
  let start = -1
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === "{") {
      if (depth === 0) start = i
      depth++
    } else if (ch === "}") {
      depth--
      if (depth === 0 && start !== -1) {
        const candidate = text.slice(start, i + 1)
        const parsed = tryParse(candidate) ?? tryParse(fixTrailingCommas(candidate))
        if (parsed) lastValid = JSON.stringify(parsed)
        start = -1
      }
    }
  }
  return lastValid
}

function tryParse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

export function extractFirstJson(text: string): Record<string, unknown> | null {
  const cleaned = stripThinkingBlocks(stripCodeFences(text))
  return tryParse(cleaned) ?? tryParse(fixTrailingCommas(cleaned)) ?? tryParse(findBalancedJson(cleaned) ?? "")
}

export const parseAiJsonLoose = extractFirstJson
