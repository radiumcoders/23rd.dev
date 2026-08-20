import type { Metadata } from "next"

import { getGithubRepoUrl } from "@/lib/github"

export const SITE_URL = "https://23rd.dev"
export const SITE_NAME = "23rd"
export const SITE_TAGLINE = "Opinionated UI components for shippers"
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`
export const SITE_DESCRIPTION =
  "A shadcn/ui registry of opinionated React components — shaders, backgrounds, footers, and interactive UI. Install with the CLI, own the source, and ship."

export const SITE_KEYWORDS = [
  "23rd",
  "shadcn",
  "shadcn registry",
  "shadcn/ui",
  "React components",
  "UI components",
  "Next.js",
  "Tailwind CSS",
  "WebGL",
  "shaders",
  "Motion",
  "open source",
]

export const SITE_AUTHOR = {
  name: "radiumcoders (Jay)",
  url: "https://github.com/radiumcoders",
}

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const normalized = path.startsWith("/") ? path : `/${path}`
  return new URL(normalized, SITE_URL).toString()
}

export function docsPath(slug?: string[]): string {
  if (!slug?.length) return "/docs"
  return `/docs/${slug.join("/")}`
}

export function isDocsIndex(slug?: string[]): boolean {
  return !slug?.length
}

export function isComponentPage(slug?: string[]): boolean {
  return slug?.[0] === "components" && (slug?.length ?? 0) > 1
}

export function buildPageMetadata({
  title,
  description,
  path,
  keywords = [],
  type = "website",
  absoluteTitle = false,
}: {
  title: string
  description?: string
  path: string
  keywords?: string[]
  type?: "website" | "article"
  absoluteTitle?: boolean
}): Metadata {
  const desc = description?.trim() || SITE_DESCRIPTION
  const ogTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    keywords: [...SITE_KEYWORDS, ...keywords],
    authors: [SITE_AUTHOR],
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: ogTitle,
      description: desc,
      url: path,
      siteName: SITE_NAME,
      locale: "en_US",
      type,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: desc,
    },
  }
}

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo.svg"),
    },
    sameAs: [getGithubRepoUrl(), "https://github.com/radiumcoders"],
  }
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#organization` },
  }
}

export function softwareJsonLd() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#app`,
    name: SITE_NAME,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    url: absoluteUrl("/docs"),
    description: SITE_DESCRIPTION,
    author: {
      "@type": "Person",
      name: SITE_AUTHOR.name,
      url: SITE_AUTHOR.url,
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
  }
}

export function rootJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(), websiteJsonLd(), softwareJsonLd()],
  }
}

export function docsJsonLd({
  title,
  description,
  path,
  slug,
}: {
  title: string
  description?: string
  path: string
  slug?: string[]
}) {
  const url = absoluteUrl(path)
  const desc = description?.trim() || SITE_DESCRIPTION
  const breadcrumbs = docsBreadcrumbs(slug, title)
  const graph: Record<string, unknown>[] = [
    {
      "@type": "TechArticle",
      headline: title,
      name: title,
      description: desc,
      url,
      inLanguage: "en",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      author: {
        "@type": "Person",
        name: SITE_AUTHOR.name,
        url: SITE_AUTHOR.url,
      },
      publisher: { "@id": `${SITE_URL}/#organization` },
      mainEntityOfPage: url,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: absoluteUrl(crumb.path),
      })),
    },
  ]

  if (isComponentPage(slug)) {
    graph.push({
      "@type": "SoftwareSourceCode",
      name: title,
      description: desc,
      url,
      codeRepository: getGithubRepoUrl(),
      programmingLanguage: ["TypeScript", "React"],
      runtimePlatform: "React",
      isPartOf: { "@id": `${SITE_URL}/#app` },
    })
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  }
}

function docsBreadcrumbs(slug: string[] | undefined, title: string) {
  const crumbs: { name: string; path: string }[] = [
    { name: SITE_NAME, path: "/docs" },
  ]

  if (isDocsIndex(slug)) return crumbs

  crumbs.push({ name: title, path: docsPath(slug) })
  return crumbs
}
