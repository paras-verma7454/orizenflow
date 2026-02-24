import type { Session } from "@packages/auth"

import { createMiddleware } from "hono/factory"

import { isPlatformAdmin } from "@/lib/admin"

export const adminMiddleware = createMiddleware<{ Variables: Session }>(async (c, next) => {
  const user = c.get("user")

  if (!user) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, 401)
  }

  if (!isPlatformAdmin(user.email)) {
    return c.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, 403)
  }

  await next()
})

