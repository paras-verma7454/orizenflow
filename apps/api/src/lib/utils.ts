export function shortId(value: string, length = 8): string {
    return value.replace(/-/g, "").slice(0, length).toUpperCase()
}

export function generateShortId(length = 8): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    const randomBytes = new Uint8Array(length)
    crypto.getRandomValues(randomBytes)

    for (let i = 0; i < length; i++) {
        result += chars[randomBytes[i] % chars.length]
    }

    return result
}
