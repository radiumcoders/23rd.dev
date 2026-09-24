import { RiHeart3Line } from "@remixicon/react"

import { cn } from "@/lib/utils"

export function GithubSponsor({ className }: { className?: string }) {
  return (
    <span
      role="status"
      title="On the way to approval"
      aria-label="Sponsorship is on the way to approval"
      className={cn(
        "inline-flex h-8 cursor-default select-none items-center gap-1.5 rounded-xl px-2.5 text-sm text-muted-foreground",
        className
      )}
    >
      <RiHeart3Line className="size-4 shrink-0" aria-hidden />
      <span className="hidden whitespace-nowrap sm:inline">
        On the way to approval
      </span>
    </span>
  )
}
