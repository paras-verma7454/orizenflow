export type ApplyPayload = {
  name: string
  email: string
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  coverLetter?: string
  questionAnswers?: Array<{ questionId: string; answer: string }>
  source?: "public_link" | "embedded_iframe"
  honeypot?: string
}

export type JobQuestion = {
  id: string
  prompt: string
  required: boolean
}

export function isValidUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}
