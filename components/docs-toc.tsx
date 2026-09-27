import type { TOCItemType } from "fumadocs-core/toc"
import Link from "next/link"
import { RiArrowRightUpLine, RiHeartFill } from "@remixicon/react"

import { cn } from "@/lib/utils"

/**
 * Right rail on the bench, outside the page sheet: a plain page outline (no
 * scroll tracking), with the sponsor slot underneath.
 */
export function DocsToc({ items }: { items: TOCItemType[] }) {
  return (
    <aside className="sticky top-0 hidden w-56 shrink-0 flex-col gap-6 pt-14 xl:flex">
      {items.length > 0 ? (
        <nav aria-label="On this page">
          <p className="mb-3 text-[13px] text-muted-foreground">
            On this page
          </p>
          <ul className="flex flex-col border-s">
            {items.map((item) => (
              <li key={item.url}>
                <a
                  href={item.url}
                  className={cn(
                    "-ms-px block border-s border-transparent py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground",
                    item.depth <= 2 && "ps-3.5",
                    item.depth === 3 && "ps-6",
                    item.depth >= 4 && "ps-8"
                  )}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <Link
        href="/sponsors"
        className="group flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-foreground/25"
      >
        <RiHeartFill className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13px] text-foreground">Sponsor 23rd</span>
          <span className="text-xs text-muted-foreground">
            Your logo and link on 23rd.dev/sponsors
          </span>
        </span>
        <RiArrowRightUpLine className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100" />
      </Link>
    </aside>
  )
}
