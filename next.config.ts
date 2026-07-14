import type { NextConfig } from "next"
import { createMDX } from "fumadocs-mdx/next"

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["canvas"],
}

const withMDX = createMDX()
export default withMDX(nextConfig)
