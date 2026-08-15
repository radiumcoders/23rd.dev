import type { MetadataRoute } from "next"

import { source } from "@/lib/source"

export default function sitemap(): MetadataRoute.Sitemap {
  const params = source.generateParams()

  return [
    {
      url: "https://23rd.dev/docs",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...params.map((param) => {
      const slug = param.slug?.join("/") ?? ""
      if (!slug) return null
      return {
        url: `https://23rd.dev/docs/${slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }
    }).filter((entry): entry is NonNullable<typeof entry> => entry != null),
  ]
}
