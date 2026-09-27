"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import Link from "next/link"

import { CliCommand } from "@/components/cli-command"
import { MonitorFeed } from "@/components/docs-monitor-feeds"
import { Triad } from "@/components/triad"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CatalogItem = {
  title: string
  url: string
  /** Registry item name, e.g. `shader-sky`. */
  slug: string
  description: string
}

export type CatalogSection = { name: string; items: CatalogItem[] }

/** Pointer hover waits this long before switching feeds, so sweeping the list doesn't boot every engine. */
const HOVER_DELAY_MS = 140

const screenTokens = { "--background": "var(--screen)" } as CSSProperties

/**
 * Docs home: the component index beside one live monitor. Hovering or
 * focusing a name puts that component on the screen; clicking opens its page.
 */
export function DocsHome({
  sections,
  initial,
}: {
  sections: CatalogSection[]
  initial: string
}) {
  const items = sections.flatMap((section) => section.items)
  const [selected, setSelected] = useState(initial)
  const timer = useRef<number | null>(null)
  const current = items.find((item) => item.slug === selected) ?? items[0]

  function cancel() {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
  }

  function select(slug: string, delay = 0) {
    cancel()
    if (delay === 0) {
      setSelected(slug)
      return
    }
    timer.current = window.setTimeout(() => setSelected(slug), delay)
  }

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  if (!current) return null

  return (
    <div className="grid grid-cols-1 gap-x-14 gap-y-10 @4xl/page:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @4xl/page:grid-rows-[auto_1fr]">
      <header className="@4xl/page:col-start-1 @4xl/page:row-start-1">
        <h1 className="font-display text-[clamp(5.5rem,16cqw,10rem)] leading-[0.78]">
          23rd
        </h1>
        <p className="mt-8 max-w-md text-lg leading-relaxed text-muted-foreground">
          Components that render: shaders, ASCII, dithering and motion for
          shadcn/ui. Install one with the CLI, then own the source. React and
          Svelte 5.
        </p>
      </header>

      <figure
        aria-label="Live preview"
        className="self-start @4xl/page:sticky @4xl/page:top-6 @4xl/page:col-start-2 @4xl/page:row-span-2 @4xl/page:row-start-1"
      >
        <div
          style={screenTokens}
          className="relative aspect-[4/3] overflow-hidden rounded-(--radius-screen) bg-background ring-1 ring-border @4xl/page:aspect-auto @4xl/page:h-[min(58svh,600px)]"
        >
          <MonitorFeed
            key={current.slug}
            slug={current.slug}
            fallback={
              <div className="flex size-full flex-col items-center justify-center gap-4 px-8 text-center">
                <span className="font-display text-5xl leading-none">
                  {current.title}
                </span>
                <span className="max-w-xs text-sm text-muted-foreground">
                  This one reacts to page scroll. Open its page to try it.
                </span>
              </div>
            }
          />
        </div>

        <figcaption className="mt-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <p className="flex items-center gap-2.5 text-base font-medium">
              <Triad />
              {current.title}
            </p>
            <Link
              href={current.url}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg")}
            >
              Open {current.title}
            </Link>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {current.description}
          </p>
          <CliCommand item={current.slug} className="my-0 mt-1" />
        </figcaption>
      </figure>

      <nav
        aria-label="Components"
        className="flex flex-col gap-9 @4xl/page:col-start-1 @4xl/page:row-start-2"
      >
        {sections.map((section) => (
          <section key={section.name} aria-labelledby={`index-${section.name}`}>
            <h2
              id={`index-${section.name}`}
              className="mb-3 font-mono text-[10.5px] tracking-[0.18em] text-muted-foreground/80 uppercase"
            >
              {section.name}
            </h2>
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const on = item.slug === current.slug
                return (
                  <li key={item.slug}>
                    <Link
                      href={item.url}
                      data-on={on || undefined}
                      onPointerEnter={(event) => {
                        if (event.pointerType === "mouse") {
                          select(item.slug, HOVER_DELAY_MS)
                        }
                      }}
                      onPointerLeave={cancel}
                      onFocus={() => select(item.slug)}
                      className="group -mx-1 flex items-center gap-3 rounded-md px-1 py-1 font-display text-[clamp(1.75rem,3.4cqw,2.25rem)] leading-none text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-on:text-foreground"
                    >
                      <span className="min-w-0">{item.title}</span>
                      {on ? <Triad className="h-3.5 [&>span]:w-1" /> : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </nav>
    </div>
  )
}
