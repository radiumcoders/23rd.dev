import { createRelativeLink } from "fumadocs-ui/mdx"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DocsPager } from "@/components/docs-pager"
import { DocsToc } from "@/components/docs-toc"
import { JsonLd } from "@/components/json-ld"
import { getMDXComponents } from "@/components/mdx"
import {
  buildPageMetadata,
  docsJsonLd,
  docsPath,
  isComponentPage,
  isDocsIndex,
  SITE_TITLE,
} from "@/lib/seo"
import { source } from "@/lib/source"

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const MDX = page.data.body
  const isStretchyFooter =
    params.slug?.join("/") === "components/stretchy-footer"

  return (
    <div
      className="relative w-full px-6 py-10 md:py-14"
      {...(isStretchyFooter ? { "data-stretchy-page": "" } : {})}
    >
      <article className="mx-auto w-full max-w-2xl">
        <JsonLd
          data={docsJsonLd({
            title: page.data.title,
            description: page.data.description,
            path: docsPath(params.slug),
            slug: params.slug,
          })}
        />
        <h1 className="text-3xl font-semibold tracking-tight">
          {page.data.title}
        </h1>
        {page.data.description ? (
          <p className="mt-3 text-lg text-muted-foreground">
            {page.data.description}
          </p>
        ) : null}
        <div className="prose mt-8">
          <MDX
            components={getMDXComponents({
              a: createRelativeLink(source, page),
            })}
          />
        </div>
        <DocsPager tree={source.getPageTree()} url={page.url} />
      </article>
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
