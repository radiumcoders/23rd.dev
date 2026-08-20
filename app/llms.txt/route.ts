import { source } from "@/lib/source"
import { getGithubRepoUrl } from "@/lib/github"
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  absoluteUrl,
  docsPath,
} from "@/lib/seo"

export const dynamic = "force-static"

export function GET() {
  const pages = source.generateParams().map((param) => {
    const page = source.getPage(param.slug)
    if (!page) return null
    return {
      title: page.data.title,
      description: page.data.description,
      url: absoluteUrl(page.url || docsPath(param.slug)),
      slug: param.slug ?? [],
    }
  })

  const docs = pages.filter(
    (page): page is NonNullable<(typeof pages)[number]> => page != null
  )
  const components = docs.filter((page) => page.slug[0] === "components")
  const guides = docs.filter((page) => page.slug[0] !== "components")

  const list = (items: typeof docs) =>
    items
      .map((page) => {
        const desc = page.description ? `: ${page.description}` : ""
        return `- [${page.title}](${page.url})${desc}`
      })
      .join("\n")

  const body = `# ${SITE_NAME}

> ${SITE_TAGLINE}

${SITE_DESCRIPTION}

Site: ${SITE_URL}
Docs: ${absoluteUrl("/docs")}
Registry: ${absoluteUrl("/r/registry.json")}
GitHub: ${getGithubRepoUrl()}

## Docs

${list(guides)}

## Components

${list(components)}

## Optional

- [Full documentation](${absoluteUrl("/docs")})
- [Install with shadcn CLI](${absoluteUrl("/docs/getting-started")})
`

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
