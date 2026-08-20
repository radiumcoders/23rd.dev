import { notFound } from "next/navigation"

import { renderDocsOgImage } from "@/lib/og-image"
import { docsOgImageSegments, SITE_NAME, SITE_TAGLINE } from "@/lib/seo"
import { source } from "@/lib/source"

export const dynamic = "force-static"
export const dynamicParams = false

export function generateStaticParams() {
  return source.generateParams().map((param) => ({
    slug: docsOgImageSegments(param.slug),
  }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  const pageSlug = slug.at(-1) === "image.png" ? slug.slice(0, -1) : slug
  const page = source.getPage(pageSlug.length ? pageSlug : undefined)

  if (!page && pageSlug.length) notFound()

  const isIndex = pageSlug.length === 0

  return renderDocsOgImage({
    title: isIndex ? SITE_NAME : (page?.data.title ?? SITE_NAME),
    description: isIndex
      ? SITE_TAGLINE
      : (page?.data.description ?? SITE_TAGLINE),
  })
}
