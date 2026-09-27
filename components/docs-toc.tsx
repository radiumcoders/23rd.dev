"use client"

import type { TOCItemType } from "fumadocs-core/toc"
import { TOCProvider, TOCScrollArea } from "fumadocs-ui/components/toc"
import { TOCItem, TOCItems } from "fumadocs-ui/components/toc/clerk"
import Link from "next/link"
import { RiArrowRightUpLine, RiHeartFill } from "@remixicon/react"

/**
 * Right rail on the bench, outside the page sheet: the page outline, with
 * the sponsor slot underneath.
 */
export function DocsToc({ items }: { items: TOCItemType[] }) {
  return (
    <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col gap-6 pt-14 pb-6 xl:flex">
      {items.length > 0 ? (
        <TOCProvider toc={items}>
          <div className="flex min-h-0 flex-col">
            <p className="mb-1 text-[13px] text-muted-foreground">
              On this page
            </p>
            <TOCScrollArea>
              <TOCItems>
                {items.map((item) => (
                  <TOCItem
                    key={item.url}
                    item={item}
                    className="text-[13px] data-[active=true]:text-foreground"
                  />
                ))}
              </TOCItems>
            </TOCScrollArea>
          </div>
        </TOCProvider>
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
