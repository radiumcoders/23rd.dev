import type { ReactNode } from "react"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { getGithubStars } from "@/lib/github"

export async function SiteShell({ children }: { children: ReactNode }) {
  const githubStars = await getGithubStars()

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <SiteHeader githubStars={githubStars} />
      {children}
      <SiteFooter />
    </div>
  )
}
