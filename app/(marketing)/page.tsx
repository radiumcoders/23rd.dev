import type { Root } from "fumadocs-core/page-tree"

import { Landing, type CatalogSection } from "@/components/landing"
import { getGithubRepoUrl } from "@/lib/github"
import { buildPageMetadata, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo"
import { source } from "@/lib/source"
import { sectionPageTree } from "@/lib/tree"

export const metadata = buildPageMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
})

const COMPONENTS = "/docs/components/"

/** The component catalogue, grouped the way the docs sidebar groups it. */
function catalog(): CatalogSection[] {
  return sectionPageTree(source.getPageTree() as Root)
    .map((section) => ({
      name: section.name ?? "",
      items: section.items
        .filter((item) => item.url.startsWith(COMPONENTS))
        .map((item) => {
          const slug = item.url.slice(COMPONENTS.length)
          const page = source.getPage(["components", slug])
          return {
            title: item.title,
            url: item.url,
            slug,
            description: page?.data.description ?? "",
          }
        }),
    }))
    .filter((section) => section.name && section.items.length > 0)
}

export default function HomePage() {
  const sections = catalog()
  return (
    <main className="flex-1 overflow-x-clip">
      <Landing
        sections={sections}
        initial="shader-gradient"
        repoUrl={getGithubRepoUrl()}
      />
    </main>
  )
}
