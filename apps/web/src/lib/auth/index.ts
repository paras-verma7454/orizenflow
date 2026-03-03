import type { Session } from "@packages/auth"

import { headers } from "next/headers"

import { apiClient } from "@/lib/api/client"
import { config } from "@/lib/config"

export const auth = {
  api: {
    getSession: async () => {
      try {
        const requestHeaders = Object.fromEntries((await headers()).entries())
        const fetchSession = async () => {
          const response = await apiClient.auth["get-session"].$get(undefined, {
            headers: requestHeaders,
          })
          if (!response.ok) return null
          const text = await response.text()
          if (!text) return null
          return JSON.parse(text) as Session | null
        }

        const session = await fetchSession()
        if (!session) return null
        if (session.session.activeOrganizationId) return session

        const apiBase = config.api.internalUrl || config.api.url
        const ensureActiveResponse = await fetch(`${apiBase}/api/v1/organization/ensure-active`, {
          method: "POST",
          headers: requestHeaders,
        })

        if (!ensureActiveResponse.ok) return session

        const ensureActiveResult = (await ensureActiveResponse.json()) as {
          data?: { hasOrganization?: boolean }
        }

        if (!ensureActiveResult.data?.hasOrganization) return session

        return await fetchSession()
      } catch {
        return null
      }
    },
  },
}
