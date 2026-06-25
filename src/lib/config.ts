export const config = {
  app: {
    name: "Orizen Flow",
    description:
      "Evidence-based hiring CRM. Automatically analyze resumes, portfolios, and GitHub with technical precision.",
    tagline: "Evidence-based hiring",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "0.0.13",
  },

  api: {
    url: "",
    internalUrl: undefined as string | undefined,
  },

  captcha: {
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },

  // Social links
  social: {
    github: "https://github.com/paras-verma7454/orizenflow",
  },

  // Feature flags
  features: {
    authDisabled: false,
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
