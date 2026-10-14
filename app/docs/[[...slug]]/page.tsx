import { createRelativeLink } from "fumadocs-ui/mdx"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DocsPager } from "@/components/docs-pager"
import { DocsStage } from "@/components/docs-stage"
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
} from "@/lib/seo"
import { source } from "@/lib/source"
import { cn } from "@/lib/utils"

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const MDX = page.data.body
  const component = isComponentPage(params.slug)
  const markdown = await page.data.getText("processed")

  const jsonLd = (
    <JsonLd
      data={docsJsonLd({
        title: page.data.title,
        description: page.data.description,
        path: docsPath(params.slug),
        slug: params.slug,
      })}
    />
  )

  const article = (
    <article className="mx-auto w-full max-w-[52rem] min-w-0">
      <header className={component ? "mb-10" : "mb-12"}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <h1
            className={cn(
              "min-w-0",
              component
                ? "font-display text-[clamp(2.5rem,6.5cqw,3.6rem)] leading-[0.95]"
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
      <div className="prose">
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </div>
      <DocsPager tree={source.getPageTree()} url={page.url} />
    </article>
  )

  // A component page: the preview fills a stage at the top, then the page.
  // The outline rides inside the sheet, beside the article.
  if (component) {
    return (
      <DocsStage>
        {/* Same gutter and radius as the stage above it. */}
        <div className="px-2 md:px-3">
          <div
            data-slot="docs-sheet"
            className="@container/page min-h-svh rounded-t-[1.25rem] bg-background px-5 pt-10 pb-10 [--background:var(--sheet)] md:px-10 md:pt-12 md:pb-12"
          >
            {jsonLd}
            <div className="flex items-start gap-10">
              {article}
              <DocsToc items={page.data.toc} className="top-6 pt-1" />
            </div>
          </div>
        </div>
      </DocsStage>
    )
  }

  return (
    <div className="flex w-full items-start gap-8 px-2 md:px-3 md:pt-3 xl:pe-8">
      <div
        data-slot="docs-sheet"
        className="@container/page min-h-[calc(100svh-0.75rem)] min-w-0 flex-1 rounded-t-2xl border border-b-0 bg-background px-5 py-10 [--background:var(--sheet)] md:px-10 md:py-12"
      >
        {jsonLd}
        {article}
      </div>
      <DocsToc items={page.data.toc} />
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
    ? [
        page.data.title,
        "shadcn component",
        "React component",
        "Svelte component",
      ]
    : [page.data.title]

  return buildPageMetadata({
    title: page.data.title,
    description: page.data.description,
    path,
    slug: params.slug,
    keywords: extraKeywords,
    type: "article",
  })
}
