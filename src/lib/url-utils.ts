const PRIVATE_OR_INTERNAL_RANGES = [
  /^https?:\/\/localhost[:/]/i,
  /^https?:\/\/127\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/169\.254\./,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/\[::1\]/,
  /^https?:\/\/metadata\.google\.internal/i,
  /^https?:\/\/100\./,
]

export function isValidUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function isPrivateOrInternalUrl(value: string): boolean {
  return PRIVATE_OR_INTERNAL_RANGES.some((re) => re.test(value))
}
