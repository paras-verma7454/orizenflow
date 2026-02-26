import { BUILD_VERSION } from "@packages/env"
import { env } from "@packages/env/web-next"

// Server-only env vars
const getInternalApiUrl = () => {
  if (typeof window === "undefined") {
    return env.INTERNAL_API_URL
  }
  return undefined
}

export const config = {
  // Application configuration
  app: {
    name: "Orizen Flow",
    description:
      "Evidence-based hiring CRM. Automatically analyze resumes, portfolios, and GitHub with technical precision.",
    tagline: "Evidence-based hiring",
    url: env.NEXT_PUBLIC_APP_URL,
    version: BUILD_VERSION,
  },

  // API configuration
  api: {
    url: env.NEXT_PUBLIC_API_URL,
    internalUrl: getInternalApiUrl(),
  },

  // Social links
  social: {
    github: "https://github.com/paras-verma7454/orizenflow",
  },

  // Feature flags
  features: {
    authDisabled: env.NEXT_PUBLIC_NODE_ENV === "production",
  },

  // Sidebar navigation configuration (minimalist for now)
  sidebar: {
    groups: [
      {
        label: "Recruitment",
        items: [
          {
            title: "Dashboard",
            url: "/dashboard",
          },
          {
            title: "Jobs",
            url: "/dashboard/jobs",
          },
          {
            title: "Candidates",
            url: "/dashboard/candidates",
          },
          {
            title: "Account",
            url: "/dashboard/account",
          },
        ],
      },
    ],
  },
} as const

export type Config = typeof config
