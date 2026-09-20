import { RiHeart3Line } from "@remixicon/react"
import Link from "next/link"

import { cn } from "@/lib/utils"

export function GithubSponsor({ className }: { className?: string }) {
  return (
    <Link
      href="/sponsors"
      aria-label="Sponsor 23rd"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
        className
      )}
    >
      <RiHeart3Line className="size-4" />
      <span className="hidden sm:inline">Sponsor</span>
    </Link>
  )
}
