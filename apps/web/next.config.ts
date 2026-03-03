import type { NextConfig } from "next"

import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/web-next"
import { createMDX } from "fumadocs-mdx/next"

getSafeEnv(env, "@web/next")

const apiUrl =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"

const nextConfig: NextConfig = {
  reactCompiler: true,
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: "/api/search",
        destination: `${apiUrl}/api/search`,
      },
      {
        source: "/blog/:path*.md",
        destination: "/llms.txt/blog/:path*",
      },
      {
        source: "/blog/:path*.txt",
        destination: "/llms.txt/blog/:path*",
      },
      {
        source: "/docs/:path*.md",
        destination: "/llms.txt/docs/:path*",
      },
      {
        source: "/docs/:path*.txt",
        destination: "/llms.txt/docs/:path*",
      },
    ]
  },
}

const withMDX = createMDX()
export default withMDX(nextConfig)
