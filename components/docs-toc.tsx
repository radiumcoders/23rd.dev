"use client"

import {
  type TOCItemType,
  AnchorProvider,
  TOCItem as PrimitiveTOCItem,
  useItems,
} from "fumadocs-core/toc"
import { useEffect, useRef, useState, type RefObject } from "react"

import { cn } from "@/lib/utils"

export function DocsToc({ items }: { items: TOCItemType[] }) {
  if (items.length === 0) return null

  return (
    <aside className="hidden w-44 shrink-0 xl:block">
      <div className="sticky top-16">
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          On this page
        </p>
        <AnchorProvider toc={items}>
          <TocList items={items} />
        </AnchorProvider>
      </div>
    </aside>
  )
}

function TocList({ items }: { items: TOCItemType[] }) {
  const containerRef = useRef<HTMLElement>(null)

  return (
    <nav ref={containerRef} className="relative ms-0.5">
      <div
        aria-hidden
        className="absolute inset-y-0 start-0 w-0.5 rounded-full bg-foreground/15"
      />
      <TocIndicator containerRef={containerRef} />
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.url}>
            <PrimitiveTOCItem
              href={item.url}
              className={cn(
                "block py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[active=true]:text-foreground",
                item.depth <= 2 && "ps-3.5",
                item.depth === 3 && "ps-5.5",
                item.depth >= 4 && "ps-7.5"
              )}
            >
              {item.title}
            </PrimitiveTOCItem>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function TocIndicator({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement | null>
}) {
  const items = useItems()
  const [thumb, setThumb] = useState({ top: 0, height: 0, visible: false })

  useEffect(() => {
    const container = containerRef.current

    function update() {
      if (!container) {
        setThumb((prev) => ({ ...prev, visible: false }))
        return
      }

      const activeLinks = items
        .filter((item) => item.active)
        .map((item) =>
          container.querySelector<HTMLElement>(`a[href="#${CSS.escape(item.id)}"]`)
        )
        .filter((el): el is HTMLElement => el != null)

      if (activeLinks.length === 0) {
        setThumb((prev) => ({ ...prev, visible: false }))
        return
      }

      const first = activeLinks[0]
      const last = activeLinks[activeLinks.length - 1]
      const top = first.offsetTop
      const height = last.offsetTop + last.offsetHeight - top

      setThumb({ top, height, visible: true })
    }

    update()
    if (!container) return

    const observer = new ResizeObserver(update)
    observer.observe(container)
    return () => observer.disconnect()
  }, [items, containerRef])

  return (
    <div
      aria-hidden
      className="absolute start-0 w-0.5 rounded-full bg-foreground transition-[top,height,opacity] duration-300 ease-out"
      style={{
        top: thumb.top,
        height: thumb.height,
        opacity: thumb.visible ? 1 : 0,
      }}
    />
  )
}
