import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Draft site landing — not the production homepage yet
      disallow: ["/landing"],
    },
    sitemap: "https://23rd.dev/sitemap.xml",
  }
}
