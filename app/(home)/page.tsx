import { Landing } from "@/components/landing"
import type { WallItem } from "@/components/landing-wall"
import { getGithubStars } from "@/lib/github"
import { buildPageMetadata, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo"
import { source } from "@/lib/source"

export const metadata = buildPageMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
})

/** The components running on the wall behind the hero. */
const FEATURED = [
  "shader-metal",
  "shader-gradient",
  "logo-burst",
  "radiant-lines",
  "shader-anime-fire",
  "live-orb",
  "shader-sky",
  "ascii-fluid",
  "phosphor-score",
  "shader-fire",
]

export default async function HomePage() {
  const githubStars = await getGithubStars()
  const items = FEATURED.flatMap((slug): WallItem[] => {
    const page = source.getPage(["components", slug])
    return page ? [{ slug, title: page.data.title, url: page.url }] : []
  })

  return <Landing items={items} githubStars={githubStars} />
}
