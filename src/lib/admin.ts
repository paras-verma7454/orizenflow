import { env } from "@/lib/env"

export const isAdminEmail = (email: string | undefined | null): boolean => {
  if (!email) return false
  return env.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase())
}

export const isPlatformAdmin = (email: string | undefined | null): boolean => {
  return isAdminEmail(email)
}
