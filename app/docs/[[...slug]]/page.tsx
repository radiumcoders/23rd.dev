import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { findNeighbour } from "fumadocs-core/page-tree"
import { Footer } from "fumadocs-ui/layouts/docs/page/slots/footer"

import { getMDXComponents } from "@/mdx-components"
import { source } from "@/lib/source"

export const dynamicParams = false

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = source.getPage(slug)

  if (!page) {
    notFound()
  }

  return {
    title: page.data.title,
    description: page.data.description,
  }
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params
  const page = source.getPage(slug)

  if (!page) {
    notFound()
  }

  const MDX = page.data.body
  const neighbours = findNeighbour(source.pageTree, page.url)

  return (
    <article className="min-h-svh px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col gap-2 border-b border-border/80 pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {page.data.title}
          </h1>
          {page.data.description ? (
            <p className="max-w-2xl text-base text-muted-foreground">
              {page.data.description}
            </p>
          ) : null}
        </div>

        <div className="docs-prose">
          <MDX components={getMDXComponents()} />
        </div>

        <Footer
          className="mt-12"
          items={{
            previous: neighbours.previous
              ? {
                  name: neighbours.previous.name,
                  url: neighbours.previous.url,
                }
              : undefined,
            next: neighbours.next
              ? {
                  name: neighbours.next.name,
                  url: neighbours.next.url,
                }
              : undefined,
          }}
        />
      </div>
    </article>
  )
}
