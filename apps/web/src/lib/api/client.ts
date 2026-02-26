import type { AppType } from "@api/hono"

import { hc } from "hono/client"

import { config } from "@/lib/config"

const url = config.api.internalUrl ? config.api.internalUrl : config.api.url

const honoClient = hc<AppType>(url, {
  init: {
    credentials: "include",
  },
})

export const apiClient = honoClient.api
