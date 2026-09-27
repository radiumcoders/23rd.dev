import { findNeighbour } from "fumadocs-core/page-tree"
import type { Item, Root } from "fumadocs-core/page-tree"
import { RiArrowLeftLine, RiArrowRightLine } from "@remixicon/react"
import Link from "next/link"

import { cn } from "@/lib/utils"

function pageName(item: Item): string {
  if (item.name == null) return "Page"
  if (typeof item.name === "string") return item.name
  if (typeof item.name === "number") return String(item.name)
  return "Page"
}

function PagerLink({
  item,
  direction,
}: {
  item: Item
  direction: "previous" | "next"
}) {
  const isPrevious = direction === "previous"

  return (
    <Link
      href={item.url}
      className={cn(
        "group flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border bg-card px-4 py-3.5 transition-colors",
        "hover:border-foreground/30",
        "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        isPrevious ? "items-start" : "items-end text-end"
      )}
    >
      <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
        {isPrevious ? (
          <>
            <RiArrowLeftLine className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            Previous
          </>
        ) : (
          <>
            Next
            <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </span>
      <span className="w-full truncate text-base font-medium">{pageName(item)}</span>
    </Link>
  )
}

export function DocsPager({
  tree,
  url,
}: {
  tree: Root
  url: string
}) {
  const { previous, next } = findNeighbour(tree, url, { separateRoot: false })

  if (!previous && !next) return null

  return (
    <nav
      aria-label="Docs pagination"
      className="mt-16 flex flex-col gap-3 sm:flex-row"
    >
      {previous ? (
        <PagerLink item={previous} direction="previous" />
      ) : (
        <div className="hidden min-w-0 flex-1 sm:block" />
      )}
      {next ? <PagerLink item={next} direction="next" /> : null}
    </nav>
  )
}
