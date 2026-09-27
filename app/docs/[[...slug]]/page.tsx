import { createRelativeLink } from "fumadocs-ui/mdx"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DocsHome, type CatalogSection } from "@/components/docs-home"
import { DocsPager } from "@/components/docs-pager"
import { DocsToc } from "@/components/docs-toc"
import { JsonLd } from "@/components/json-ld"
import { getMDXComponents } from "@/components/mdx"
import { PageActions } from "@/components/page-actions"
import { getGithubRepoUrl } from "@/lib/github"
import {
  absoluteUrl,
  buildPageMetadata,
  docsJsonLd,
  docsPath,
  isComponentPage,
  isDocsIndex,
  SITE_TITLE,
} from "@/lib/seo"
import { source } from "@/lib/source"
import { sectionPageTree } from "@/lib/tree"
import { cn } from "@/lib/utils"

/** Component pages grouped by their sidebar section, for the docs home index. */
function componentCatalog(): CatalogSection[] {
  const pages = new Map(source.getPages().map((page) => [page.url, page]))

  return sectionPageTree(source.getPageTree()).flatMap((section) => {
    if (!section.name) return []
    const items = section.items.map((item) => ({
      ...item,
      slug: item.url.split("/").at(-1) ?? item.url,
      description: pages.get(item.url)?.data.description ?? "",
    }))
    return [{ name: section.name, items }]
  })
}

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const MDX = page.data.body
  const home = isDocsIndex(params.slug)
  const component = isComponentPage(params.slug)
  const markdown = home ? "" : await page.data.getText("processed")

  return (
    <div className="flex w-full items-start gap-8 px-2 md:ps-0 md:pe-3 md:pt-3 xl:pe-8">
      <div
        data-slot="docs-sheet"
        className="@container/page min-h-[calc(100svh-0.75rem)] min-w-0 flex-1 rounded-t-2xl border border-b-0 bg-background [--background:var(--sheet)] px-5 py-10 md:px-10 md:py-12"
      >
        <JsonLd
          data={docsJsonLd({
            title: page.data.title,
            description: page.data.description,
            path: docsPath(params.slug),
            slug: params.slug,
          })}
        />
        {home ? (
          <DocsHome sections={componentCatalog()} initial="ascii-logo" />
        ) : null}
        <article
          className={cn(
            "mx-auto w-full min-w-0 max-w-[52rem]",
            home && "mt-24 max-w-2xl border-t pt-12"
          )}
        >
          {home ? null : (
            <header className="mb-12">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
                <h1
                  className={cn(
                    "min-w-0",
                    component
                      ? "font-display text-[clamp(2.5rem,6.5cqw,3.75rem)] leading-[0.92]"
                      : "text-4xl font-semibold tracking-tight"
                  )}
                >
                  {page.data.title}
                </h1>
                <PageActions
                  markdown={markdown}
                  pageUrl={absoluteUrl(page.url)}
                  sourceUrl={`${getGithubRepoUrl()}/blob/main/content/docs/${page.path}`}
                  className="sm:mt-1"
                />
              </div>
              {page.data.description ? (
                <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
                  {page.data.description}
                </p>
              ) : null}
            </header>
          )}
          <div className="prose">
            <MDX
              components={getMDXComponents({
                a: createRelativeLink(source, page),
              })}
            />
          </div>
          <DocsPager tree={source.getPageTree()} url={page.url} />
        </article>
      </div>
      {home ? null : <DocsToc items={page.data.toc} />}
    </div>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const path = docsPath(params.slug)
  const extraKeywords = isComponentPage(params.slug)
    ? [page.data.title, "shadcn component", "React component", "Svelte component"]
    : [page.data.title]

  return buildPageMetadata({
    title: isDocsIndex(params.slug) ? SITE_TITLE : page.data.title,
    description: page.data.description,
    path,
    slug: params.slug,
    keywords: extraKeywords,
    type: "article",
    absoluteTitle: isDocsIndex(params.slug),
  })
}
