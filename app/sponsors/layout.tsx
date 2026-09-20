import type { ReactNode } from "react"

import { SponsorsHeader } from "@/components/sponsors-header"
import { getGithubStars } from "@/lib/github"

export default async function SponsorsLayout({
  children,
}: {
  children: ReactNode
}) {
  const githubStars = await getGithubStars()

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <SponsorsHeader githubStars={githubStars} />
      {children}
    </div>
  )
}
