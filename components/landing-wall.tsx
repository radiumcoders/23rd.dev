"use client"

import Link from "next/link"
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { RiArrowRightUpLine } from "@remixicon/react"

import { useHydratedTheme } from "@/hooks/use-hydrated-theme"
import { cn } from "@/lib/utils"
import { LiveOrb } from "@/registry/live-orb/live-orb"
import { LogoBurst } from "@/registry/logo-burst/logo-burst"
import { PhosphorScore } from "@/registry/phosphor-score/phosphor-score"
import { RadiantLines } from "@/registry/radiant-lines/radiant-lines"
import { ShaderAnimeFire } from "@/registry/shader-anime-fire/shader-anime-fire"
import { ShaderFire } from "@/registry/shader-fire/shader-fire"
import { ShaderGradient } from "@/registry/shader-gradient/shader-gradient"
import { ShaderMetal } from "@/registry/shader-metal/shader-metal"
import { ShaderSky } from "@/registry/shader-sky/shader-sky"

export type WallItem = { slug: string; title: string; url: string }

/** How long one shift to the next card takes. */
const SHIFT_MS = 1400

/** A white orb on dark screens and a black one on light, as in the docs. */
function OrbPreview() {
  const theme = useHydratedTheme()
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <LiveOrb
        size={150}
        variant={theme === "dark" ? "white" : "black"}
        interactive={false}
      />
    </div>
  )
}

/**
 * Each preview, plus a tint that stands in for it until it mounts (and
 * whenever its column is off screen), so the wall never reads as empty.
 */
const PREVIEWS: Record<string, { render: () => ReactNode; tint: string }> = {
  "shader-metal": {
    render: () => <ShaderMetal interactive={false} />,
    tint: "radial-gradient(90% 70% at 65% 55%, rgb(170 176 188 / 0.4), transparent 70%)",
  },
  "shader-gradient": {
    render: () => (
      <ShaderGradient className="absolute inset-0" interactive={false} />
    ),
    tint: "radial-gradient(80% 70% at 25% 30%, rgb(255 122 92 / 0.45), transparent 65%), radial-gradient(80% 70% at 80% 75%, rgb(96 120 255 / 0.4), transparent 65%)",
  },
  "shader-anime-fire": {
    render: () => (
      <ShaderAnimeFire className="absolute inset-0" interactive={false} />
    ),
    tint: "radial-gradient(90% 65% at 50% 100%, rgb(255 96 32 / 0.55), transparent 70%)",
  },
  "shader-fire": {
    render: () => (
      <ShaderFire className="absolute inset-0" interactive={false} />
    ),
    tint: "radial-gradient(100% 70% at 50% 100%, rgb(255 140 60 / 0.45), transparent 70%)",
  },
  "shader-sky": {
    render: () => <ShaderSky className="absolute inset-0" />,
    tint: "linear-gradient(to bottom, rgb(104 156 228 / 0.45), rgb(232 214 204 / 0.3))",
  },
  "logo-burst": {
    render: () => <LogoBurst replayOnClick={false} />,
    tint: "radial-gradient(45% 40% at 50% 50%, rgb(128 128 128 / 0.3), transparent 70%)",
  },
  "radiant-lines": {
    render: () => <RadiantLines starCount={260} />,
    tint: "radial-gradient(60% 50% at 50% 50%, rgb(96 165 250 / 0.22), transparent 70%)",
  },
  "live-orb": {
    render: () => <OrbPreview />,
    tint: "radial-gradient(28% 28% at 50% 50%, rgb(128 128 128 / 0.35), transparent 70%)",
  },
  "phosphor-score": {
    render: () => <PhosphorScore />,
    tint: "linear-gradient(to bottom, transparent, rgb(128 128 128 / 0.18))",
  },
}

/** Inside a card, `bg-background` is the screen, not the sheet. */
const screenTokens = { "--background": "var(--screen)" } as CSSProperties

/**
 * Mounts a running preview, and frees its WebGL context when it goes. The
 * engines only stop drawing on destroy, and browsers cap live contexts at
 * about 16, so a wall that swaps cards every few seconds would soon have
 * the browser dropping the oldest ones, visible previews included.
 */
function LivePreview({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    return () => {
      // Still in the page means React is only replaying effects (Strict
      // Mode), not unmounting. On a real unmount React detaches this node
      // but leaves its subtree, so the canvases are still inside it.
      if (!el || el.isConnected) return
      el.querySelectorAll("canvas").forEach((canvas) => {
        const gl = canvas.getContext("webgl") ?? canvas.getContext("webgl2")
        gl?.getExtension("WEBGL_lose_context")?.loseContext()
      })
    }
  }, [])

  return (
    <div
      ref={ref}
      className="absolute inset-0 animate-in rounded-[inherit] bg-background duration-700 fade-in"
    >
      {children}
    </div>
  )
}

function Card({
  item,
  live,
  style,
}: {
  item: WallItem
  live: boolean
  style: CSSProperties
}) {
  const preview = PREVIEWS[item.slug]

  return (
    <Link
      href={item.url}
      tabIndex={-1}
      style={style}
      className="group absolute inset-x-0 flex h-(--card-h) flex-col rounded-[1.25rem] border bg-card p-1 transition-colors hover:border-foreground/25"
    >
      <div
        style={{ ...screenTokens, backgroundImage: preview?.tint }}
        className="relative isolate flex-1 overflow-hidden rounded-[1rem] bg-background [clip-path:inset(0_round_1rem)] after:pointer-events-none after:absolute after:inset-0 after:z-50 after:rounded-[inherit] after:ring-1 after:ring-border after:ring-inset"
      >
        {live && preview ? <LivePreview>{preview.render()}</LivePreview> : null}
      </div>
      <div className="flex h-9 shrink-0 items-center justify-between px-2.5 text-[13px]">
        <span className="font-medium">{item.title}</span>
        <RiArrowRightUpLine className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  )
}

type ColumnConfig = {
  /** Where the column's window starts, from the top of its layer. */
  offset: string
  dir: "up" | "down"
  /** Time between shifts. */
  hold: number
  /** Time before the first shift, so the columns never move together. */
  delay: number
}

/** Seven slots, centred. The middle three sit under the hero. */
const COLUMNS: Record<number, ColumnConfig> = {
  [-3]: { offset: "-11rem", dir: "up", hold: 5600, delay: 2600 },
  [-2]: { offset: "-4rem", dir: "down", hold: 4800, delay: 900 },
  [-1]: { offset: "-3rem", dir: "up", hold: 4400, delay: 1700 },
  [0]: { offset: "2rem", dir: "down", hold: 5000, delay: 3200 },
  [1]: { offset: "-3rem", dir: "up", hold: 4600, delay: 500 },
  [2]: { offset: "-8rem", dir: "down", hold: 5200, delay: 2200 },
  [3]: { offset: "-2rem", dir: "up", hold: 4400, delay: 3800 },
}

const SLOTS = [-3, -2, -1, 0, 1, 2, 3]

/**
 * Past this much blur a column shows each card's tint instead of running
 * it. Nobody can tell at that blur, and it keeps the wall under the
 * browser's WebGL context limit.
 */
const LIVE_BLUR_LIMIT = 6

/** Cards each column opens with. Later ones are picked as they scroll in. */
const OPENING_ROWS = 4

type Shown = { slugs: string[]; sharp: boolean }

/**
 * What each column has on screen right now, so a column picking its next
 * card can choose one that isn't already showing nearby. One wall per page.
 */
const onScreen = new Map<number, Shown>()

/**
 * How badly a preview would repeat: already in this column is worst, then
 * a sharp column beside it, then anywhere sharp on screen, then the blurred
 * edges.
 */
function clash(
  slug: string,
  slot: number,
  own: string[],
  shown: Map<number, Shown>
) {
  let score = own.includes(slug) ? 1000 : 0
  for (const [other, entry] of shown) {
    if (other === slot || !entry.slugs.includes(slug)) continue
    const beside = Math.abs(other - slot) === 1
    score += entry.sharp ? (beside ? 200 : 100) : beside ? 20 : 10
  }
  return score
}

/** The least repeated preview, with ties broken by a rotating `seed`. */
function pick(
  items: WallItem[],
  slot: number,
  own: string[],
  shown: Map<number, Shown>,
  seed: number
) {
  let best = items[0]!.slug
  let bestScore = Infinity
  for (let k = 0; k < items.length; k++) {
    const slug = items[(seed + k) % items.length]!.slug
    const score = clash(slug, slot, own, shown)
    if (score < bestScore) {
      best = slug
      bestScore = score
    }
  }
  return best
}

/**
 * The opening wall, filled centre-out by the same rule. It is pure, so the
 * server and the client lay out the same cards.
 */
function openingLayout(items: WallItem[]) {
  const layout = new Map<number, Record<number, string>>()
  const shown = new Map<number, Shown>()
  for (const slot of [0, -1, 1, -2, 2, -3, 3]) {
    const cards: Record<number, string> = {}
    const own: string[] = []
    for (let s = 0; s < OPENING_ROWS; s++) {
      const slug = pick(items, slot, own, shown, (slot + 3) * 3 + s)
      own.push(slug)
      cards[s] = slug
    }
    layout.set(slot, cards)
    shown.set(slot, { slugs: own.slice(0, 3), sharp: Math.abs(slot) <= 1 })
  }
  return layout
}

type Fit = {
  /** Cards that fit in the window at once. */
  rows: number
  /** The window's height and the distance from one card to the next. */
  height: number
  pitch: number
  /** SVG blur, growing toward the frame's sides. */
  blur: number
  onscreen: boolean
}

/**
 * One vertical marquee. It holds, then shifts a whole card, forever: the
 * position only counts up (or down), and just the cards in view render, so
 * nothing ever snaps back and a preview never restarts mid-scroll.
 */
function Column({
  items,
  slot,
  opening,
  fade,
}: {
  items: WallItem[]
  slot: number
  opening: Record<number, string>
  fade: boolean
}) {
  const { offset, dir, hold, delay } = COLUMNS[slot]!
  const ref = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const indexRef = useRef(0)
  const [index, setIndex] = useState(0)
  const [trail, setTrail] = useState<number | null>(null)
  const [fit, setFit] = useState<Fit>({
    rows: 3,
    height: 0,
    pitch: 1,
    blur: 0,
    onscreen: false,
  })
  const [cards, setCards] = useState(opening)
  const cardsRef = useRef(cards)
  const fitRef = useRef(fit)
  const seedRef = useRef(slot + 3)
  const filterId = `wall-blur-${useId().replace(/[^\w-]/g, "")}`

  useEffect(() => {
    const el = ref.current
    const probe = probeRef.current
    if (!el || !probe) return
    const frame = el.closest<HTMLElement>("[data-landing-frame]")
    if (!frame) return

    const measure = () => {
      const box = el.getBoundingClientRect()
      const area = frame.getBoundingClientRect()
      const pitch = probe.offsetHeight || 1
      const half = area.width / 2
      const reach =
        Math.abs(box.left + box.width / 2 - (area.left + half)) / half
      const next: Fit = {
        rows: Math.floor(box.height / pitch) + 1,
        height: Math.round(box.height),
        pitch,
        blur:
          Math.round(Math.min(1, Math.max(0, (reach - 0.6) / 0.45)) * 20) / 2,
        onscreen: box.right > area.left && box.left < area.right,
      }
      setFit((prev) =>
        prev.rows === next.rows &&
        prev.height === next.height &&
        prev.pitch === next.pitch &&
        prev.blur === next.blur &&
        prev.onscreen === next.onscreen
          ? prev
          : next
      )
    }

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const n = items.length
  const slugAt = (map: Record<number, string>, s: number) =>
    map[s] ?? items[(((s + slot * 3) % n) + n) % n]!.slug
  /** Whether card `s` shows more than a sliver while the column rests at `at`. */
  const inView = ({ height, pitch }: Fit, s: number, at: number) => {
    if (height === 0) return true // not measured yet, so assume it shows
    const top = (s - at) * pitch
    return top < height - 24 && top + pitch * 0.9 > 24
  }

  // Tell the other columns what this one shows, while it is on screen.
  useEffect(() => {
    cardsRef.current = cards
    fitRef.current = fit
    if (!fit.onscreen || n === 0) return
    // Only where the column is headed: a card sliding out is gone in a
    // moment, and counting it starves the neighbours of choices.
    const slugs: string[] = []
    for (let s = index; s < index + fit.rows; s++) {
      if (inView(fit, s, index)) slugs.push(slugAt(cards, s))
    }
    onScreen.set(slot, { slugs, sharp: fit.blur === 0 })
    return () => {
      onScreen.delete(slot)
    }
    // slugAt only reads props and its arguments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, index, fit, slot, n])

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    const step = dir === "up" ? 1 : -1
    let settle: number | undefined
    let timer: number

    const tick = () => {
      if (!pausedRef.current && !document.hidden && !reduced.matches) {
        const from = indexRef.current
        const to = from + step
        const now = fitRef.current
        const rows = now.rows
        // Pick every card coming into view (the new one, and any that sat
        // as a sliver at the bottom) against everything in view during the
        // shift, the card sliding out included. Earlier picks were made
        // against what the other columns showed back then.
        const incoming = step > 0 ? to + rows - 1 : to
        const entering: number[] = []
        const own: string[] = []
        for (let s = Math.min(from, to); s < Math.max(from, to) + rows; s++) {
          if (s === incoming || (!inView(now, s, from) && inView(now, s, to))) {
            entering.push(s)
          } else if (inView(now, s, from) || inView(now, s, to)) {
            own.push(slugAt(cardsRef.current, s))
          }
        }
        const picks: Record<number, string> = {}
        for (const s of entering) {
          picks[s] = pick(items, slot, own, onScreen, seedRef.current++)
          own.push(picks[s])
        }
        // Publish the new view now: a column shifting in the same moment
        // would otherwise check this one before React has rendered it.
        if (now.onscreen) {
          const slugs: string[] = []
          for (let s = to; s < to + rows; s++) {
            if (inView(now, s, to)) {
              slugs.push(picks[s] ?? slugAt(cardsRef.current, s))
            }
          }
          onScreen.set(slot, { slugs, sharp: now.blur === 0 })
        }
        setCards((prev) => {
          const next: Record<number, string> = { ...picks }
          for (const key of Object.keys(prev)) {
            const s = Number(key)
            if (s >= to - rows - 2 && s <= to + rows * 2 + 2) {
              next[s] ??= prev[s]!
            }
          }
          return next
        })
        indexRef.current = to
        setIndex(to)
        setTrail(from)
        window.clearTimeout(settle)
        settle = window.setTimeout(() => setTrail(null), SHIFT_MS + 100)
      }
      timer = window.setTimeout(tick, hold)
    }

    timer = window.setTimeout(tick, delay)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(settle)
    }
    // slugAt only reads props and its arguments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir, hold, delay, items, slot])

  // The cards in the window, plus the one leaving it during a shift.
  const first = Math.min(index, trail ?? index)
  const last = Math.max(index, trail ?? index) + fit.rows - 1
  const positions: number[] = []
  for (let s = first; s <= last; s++) positions.push(s)

  const bySlug = new Map(items.map((item) => [item.slug, item]))

  return (
    <>
      {fit.blur > 0 ? (
        <svg aria-hidden className="pointer-events-none absolute size-0">
          <filter
            id={filterId}
            x="-25%"
            y="-5%"
            width="150%"
            height="110%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation={fit.blur} />
          </filter>
        </svg>
      ) : null}
      <div
        ref={ref}
        onPointerEnter={() => {
          pausedRef.current = true
        }}
        onPointerLeave={() => {
          pausedRef.current = false
        }}
        style={{
          marginTop: offset,
          height: `calc(100% - (${offset}))`,
          filter: fit.blur > 0 ? `url(#${filterId})` : undefined,
        }}
        className={cn(
          "pointer-events-auto relative w-(--card-w) shrink-0 overflow-hidden",
          fade && "mask-[linear-gradient(to_bottom,transparent,#000_4rem)]"
        )}
      >
        <div
          ref={probeRef}
          aria-hidden
          className="invisible absolute h-(--step) w-0"
        />
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `translate3d(0, calc(var(--step) * ${-index}), 0)`,
            transition: `transform ${SHIFT_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`,
          }}
        >
          {n > 0
            ? positions.map((s) => (
                <Card
                  key={s}
                  item={bySlug.get(slugAt(cards, s))!}
                  live={fit.onscreen && fit.blur < LIVE_BLUR_LIMIT}
                  style={{ top: `calc(var(--step) * ${s})` }}
                />
              ))
            : null}
        </div>
      </div>
    </>
  )
}

/**
 * The wall of live previews. "edges" fills the frame's full height on both
 * sides; "middle" is the three columns that rise under the hero.
 */
export function LandingWall({
  items,
  layer,
}: {
  items: WallItem[]
  layer: "edges" | "middle"
}) {
  const opening = useMemo(() => openingLayout(items), [items])

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none flex justify-center gap-(--gap)",
        layer === "edges" ? "absolute inset-0" : "relative min-h-0 flex-1"
      )}
    >
      {SLOTS.map((slot) => {
        const middle = Math.abs(slot) <= 1
        return middle === (layer === "middle") ? (
          <Column
            key={slot}
            items={items}
            slot={slot}
            opening={opening.get(slot)!}
            fade={middle}
          />
        ) : (
          <div key={slot} className="w-(--card-w) shrink-0" />
        )
      })}
    </div>
  )
}
