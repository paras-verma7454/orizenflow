export const stripThinkBlocks = (value: string) =>
    value
        .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
        .replace(/<think\b[^>]*>[\s\S]*$/gi, "")
        .trim()

export const sanitizeAiJsonText = (value: string) => {
    const withoutCodeFences = value
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/, "")

    return stripThinkBlocks(withoutCodeFences)
}

export const parseAiJsonLoose = (value: string): unknown | null => {
    const cleaned = sanitizeAiJsonText(value)

    try {
        return JSON.parse(cleaned)
    } catch {
        const firstBrace = cleaned.indexOf("{")
        const lastBrace = cleaned.lastIndexOf("}")

        if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
            return null
        }

        try {
            return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
        } catch {
            return null
        }
    }
}