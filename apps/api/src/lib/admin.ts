import { env } from "@packages/env/api-hono"

const platformAdminEmails = new Set(
  env.ADMIN_EMAILS
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
)

export const isPlatformAdmin = (email: string | null | undefined) => {
  if (!email) return false
  return platformAdminEmails.has(email.trim().toLowerCase())
}

