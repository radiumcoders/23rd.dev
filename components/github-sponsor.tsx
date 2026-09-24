import Link from "next/link"

import { SPONSOR_CHECKOUT_COMING_SOON } from "@/lib/sponsors"
import { cn } from "@/lib/utils"

export function GithubSponsor({ className }: { className?: string }) {
  return (
    <Link
      href="/sponsors"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
        className
      )}
    >
      <span>Sponsor</span>
      {SPONSOR_CHECKOUT_COMING_SOON ? (
        <span className="font-mono text-[10px] font-medium tracking-wide uppercase">
          Soon
        </span>
      ) : null}
    </Link>
  )
}
