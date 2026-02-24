import { MetadataRoute } from "next"

import { config } from "@/lib/config"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = config.app.url

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
  ]

  return staticRoutes
}
