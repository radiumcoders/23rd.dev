import type { MetadataRoute } from "next"

import { absoluteUrl, docsPath } from "@/lib/seo"
import { source } from "@/lib/source"

export default function sitemap(): MetadataRoute.Sitemap {
  const seen = new Set<string>()
  const entries: MetadataRoute.Sitemap = []

  const add = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly"
  ) => {
    const url = absoluteUrl(path)
    if (seen.has(url)) return
    seen.add(url)
    entries.push({ url, changeFrequency, priority })
  }

  add("/docs", 1)

  for (const param of source.generateParams()) {
    const page = source.getPage(param.slug)
    const path = page?.url || docsPath(param.slug)
    const isIndex = !param.slug?.length
    const isComponent = param.slug?.[0] === "components"

    add(path, isIndex ? 1 : isComponent ? 0.8 : 0.7)
  }

  return entries
}
