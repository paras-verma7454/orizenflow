import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { openAPI as openAPIPlugin, organization as organizationPlugin } from "better-auth/plugins"

import * as schema from "@/lib/db/schema"

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      account: schema.account,
      invitation: schema.invitation,
      member: schema.member,
      organization: schema.organization,
      session: schema.session,
      team: schema.team,
      teamMember: schema.teamMember,
      user: schema.user,
      verification: schema.verification,
    },
  }),
  onAPIError: {
    throw: true,
  },
  plugins: [
    openAPIPlugin(),
    organizationPlugin({
      teams: { enabled: true },
    }),
  ],
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
})

export type Session = typeof auth.$Infer.Session
