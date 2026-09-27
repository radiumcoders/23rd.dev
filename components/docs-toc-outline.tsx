"use client"

import { useLayoutEffect, useRef, useState } from "react"
import type { TOCItemType } from "fumadocs-core/toc"

import { cn } from "@/lib/utils"

/** Rail x per heading depth; the rail steps inward for nested headings. */
function railX(depth: number) {
  if (depth <= 2) return 0.5
  if (depth === 3) return 10.5
  return 18.5
}

/** Room each step's diagonal takes out of the rows it joins. */
const STEP = 6
/** Length of each triad dash in the click pulse. */
const PULSE = 8

type Rail = {
  d: string
  total: number
  /** Where each item's stretch of rail starts and ends, along the path. */
  spans: [number, number][]
  height: number
}

function buildRail(list: HTMLUListElement, items: TOCItemType[]): Rail | null {
  const rows = Array.from(list.children) as HTMLElement[]
  if (rows.length === 0 || rows.length !== items.length) return null
  const xs = items.map((item) => railX(item.depth))
  const points: [number, number][] = []
  const spans: [number, number][] = []
  let total = 0
  const to = (x: number, y: number) => {
    const last = points[points.length - 1]
    if (last) total += Math.hypot(x - last[0], y - last[1])
    points.push([x, y])
    return total
  }
  rows.forEach((row, i) => {
    const x = xs[i]!
    const top = row.offsetTop
    const bottom = top + row.offsetHeight
    const stepIn = i > 0 && xs[i - 1] !== x
    const stepOut = i < rows.length - 1 && xs[i + 1] !== x
    const start = to(x, top + (stepIn ? STEP : 0))
    const end = to(x, bottom - (stepOut ? STEP : 0))
    spans.push([start, end])
  })
  return {
    d: points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(""),
    total,
    spans,
    height: list.offsetHeight,
  }
}

/**
 * The page outline. An SVG rail draws itself in and steps inward for nested
 * headings; a lit segment glides along it to the hovered item, and clicking
 * sends a triad pulse down the rail to the heading you jumped to. No scroll
 * tracking.
 */
export function DocsTocOutline({ items }: { items: TOCItemType[] }) {
  const listRef = useRef<HTMLUListElement>(null)
  const pulseRefs = useRef<(SVGPathElement | null)[]>([])
  const [rail, setRail] = useState<Rail | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [lit, setLit] = useState(0)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => setRail(buildRail(list, items))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    return () => ro.disconnect()
  }, [items])

  function enter(index: number) {
    setHover(index)
    setLit(index)
  }

  function pulse(index: number) {
    const span = rail?.spans[index]
    if (!rail || !span) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const target = (span[0] + span[1]) / 2 + PULSE / 2
    const duration = Math.min(900, 380 + target * 1.2)
    pulseRefs.current.forEach((path, i) => {
      path?.animate(
        [
          { strokeDashoffset: PULSE, opacity: 1 },
          { strokeDashoffset: -(target - PULSE), opacity: 1, offset: 0.75 },
          { strokeDashoffset: -(target - PULSE), opacity: 0 },
        ],
        {
          duration,
          delay: (2 - i) * 45,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards",
        }
      )
    })
  }

  const span = rail?.spans[lit]
  const litLength = span ? Math.max(0, span[1] - span[0]) : 0

  return (
    <nav
      aria-label="On this page"
      className="group/toc"
      onMouseLeave={() => setHover(null)}
    >
      <p className="mb-3 flex items-center gap-2 text-[13px] text-muted-foreground">
        <ScopeTrace />
        On this page
      </p>
      <div className="relative">
        {rail ? (
          <svg
            aria-hidden
            width={20}
            height={rail.height}
            className="pointer-events-none absolute top-0 left-0 overflow-visible"
          >
            <path
              d={rail.d}
              pathLength={1}
              fill="none"
              stroke="var(--rule)"
              strokeDasharray={1}
              className="motion-safe:animate-toc-rail"
            />
            <path
              d={rail.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray={`${litLength} ${rail.total + litLength}`}
              strokeDashoffset={-(span?.[0] ?? 0)}
              className={cn(
                "text-foreground transition-[stroke-dashoffset,stroke-dasharray,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                hover === null && "opacity-0"
              )}
            />
            {["--triad-r", "--triad-g", "--triad-b"].map((color, i) => (
              <path
                key={color}
                ref={(node) => {
                  pulseRefs.current[i] = node
                }}
                d={rail.d}
                fill="none"
                stroke={`var(${color})`}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeDasharray={`${PULSE} ${rail.total + PULSE}`}
                opacity={0}
                className="dark:mix-blend-screen"
              />
            ))}
          </svg>
        ) : null}
        <ul ref={listRef} className="relative flex flex-col">
          {items.map((item, i) => (
            <li
              key={item.url}
              style={{ animationDelay: `${Math.min(i * 45, 540)}ms` }}
              className="motion-safe:animate-toc-item"
            >
              <a
                href={item.url}
                onMouseEnter={() => enter(i)}
                onFocus={() => enter(i)}
                onBlur={() => setHover(null)}
                onClick={() => pulse(i)}
                className={cn(
                  "block py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none",
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
      </div>
    </nav>
  )
}

/**
 * A little oscilloscope trace. It draws in once, then runs while the
 * outline is hovered.
 */
function ScopeTrace() {
  // Two periods of a sine, so sliding by one period loops seamlessly.
  const wave = Array.from({ length: 33 }, (_, i) => {
    const x = i * 0.75
    const y = 5 - Math.sin((i / 16) * Math.PI * 2) * 3.2
    return `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`
  }).join("")
  return (
    <svg
      aria-hidden
      width={14}
      height={10}
      viewBox="0 0 12 10"
      className="shrink-0 overflow-hidden"
    >
      <g className="[animation-play-state:paused] group-hover/toc:[animation-play-state:running] motion-safe:animate-toc-scope">
        <path
          d={wave}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={1}
          className="motion-safe:animate-toc-rail"
        />
      </g>
    </svg>
  )
}
