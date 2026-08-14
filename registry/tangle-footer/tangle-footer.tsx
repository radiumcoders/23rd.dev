"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

export type TangleFooterProps = {
  className?: string
  /** Phrases sampled randomly onto rings. */
  lines?: string[]
  /**
   * Ribbon (stroke) color. Omit for theme-aware defaults
   * (near-black in light, soft cream in dark).
   */
  ribbon?: string
  /**
   * Text fill on the ribbons. Omit for theme-aware defaults
   * (cream in light, near-black in dark).
   */
  textColor?: string
  /**
   * Field behind the rings. Omit for theme-aware defaults
   * (warm cream in light, near-black in dark). Pass `"transparent"`
   * when the parent already paints the stage.
   */
  background?: string
  /**
   * Band height in px. Omit to use half the measured width
   * (upper semicircle of a full-width nest). When set shorter
   * than that, the nest scales down to fit so rings stay intact.
   */
  height?: number
  /** Seed for random line / marquee assignment across rings. */
  seed?: number
  /** Accessible label. */
  label?: string
}

const DEFAULT_LINES = [
  "Ship something opinionated — less boilerplate, clearer decisions.",
  "Knows what’s going on. Can you check in with them and see what’s next.",
  "The new timeline should be ready by Friday, although it’s probably going to slip.",
  "Open the docs, grab a component, and make it yours in the codebase.",
  "Radiant lines, shader wash, gooey picker — install what you need and move.",
]

type Ring = {
  d: string
  cx: number
  cy: number
  strokeWidth: number
  fontSize: number
  /** Text repeated enough to blanket the full circumference. */
  text: string
  /** Seconds for one full revolution. */
  duration: number
  /** Fraction of a turn (0–1) to offset the starting rotation. */
  phase: number
  reverse: boolean
}

const RING_COUNT = 5

const K = 0.5522847498
const STROKE = 28

/** Mulberry32 — deterministic PRNG so rings stay stable across re-renders. */
function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Perfect circle as four cubics (container clips to the upper half). */
function circlePath(cx: number, cy: number, r: number): string {
  const o = r * K
  return [
    `M ${(cx + r).toFixed(1)} ${cy.toFixed(1)}`,
    `C ${(cx + r).toFixed(1)} ${(cy + o).toFixed(1)} ${(cx + o).toFixed(1)} ${(cy + r).toFixed(1)} ${cx.toFixed(1)} ${(cy + r).toFixed(1)}`,
    `C ${(cx - o).toFixed(1)} ${(cy + r).toFixed(1)} ${(cx - r).toFixed(1)} ${(cy + o).toFixed(1)} ${(cx - r).toFixed(1)} ${cy.toFixed(1)}`,
    `C ${(cx - r).toFixed(1)} ${(cy - o).toFixed(1)} ${(cx - o).toFixed(1)} ${(cy - r).toFixed(1)} ${cx.toFixed(1)} ${(cy - r).toFixed(1)}`,
    `C ${(cx + o).toFixed(1)} ${(cy - r).toFixed(1)} ${(cx + r).toFixed(1)} ${(cy - o).toFixed(1)} ${(cx + r).toFixed(1)} ${cy.toFixed(1)}`,
  ].join(" ")
}

/**
 * Tile copy so the ring is fully blanketed with no visible gap.
 * Rotation makes the loop seamless, so we only need to cover the
 * circumference — no exact tile-width matching required.
 */
function buildRingCopy(
  line: string,
  other: string,
  mix: boolean,
  circumference: number,
  fontSize: number
): string {
  const unit = mix
    ? `${line}   ·   ${other}   ·   `
    : `${line}   ·   ${line}   ·   ${other}   ·   `
  // Bold + letter-spacing runs wider than 0.5em — over-estimate so we never underfill.
  const unitWidth = Math.max(unit.length * fontSize * 0.72, 1)
  const repeats = Math.max(3, Math.ceil(circumference / unitWidth) + 1)
  return unit.repeat(repeats)
}

/**
 * Five concentric circles nested as an upper semicircle.
 * Outer radius fits both width and band height so a short band
 * still shows complete arches instead of an equatorial clip.
 */
function buildRings(
  width: number,
  bandHeight: number,
  lines: string[],
  seed: number
): Ring[] {
  const rand = mulberry32(seed)
  const cx = width / 2
  const cy = bandHeight
  const strokePad = STROKE / 2 + 2
  // Full-width nest needs height ≈ width/2; if the band is shorter,
  // shrink the nest so the upper semicircle stays fully visible.
  const outer = Math.max(
    Math.min(width / 2 - strokePad, bandHeight - strokePad),
    STROKE * 4
  )
  const radii = Array.from(
    { length: RING_COUNT },
    (_, i) => (outer * (i + 1)) / RING_COUNT
  )

  const fontSize = Math.min(24, Math.max(16, width * 0.022))
  const pool = lines.length > 0 ? lines : DEFAULT_LINES

  return radii.map((r, i) => {
    const line = pool[Math.floor(rand() * pool.length)]!
    const other = pool[Math.floor(rand() * pool.length)]!
    const circumference = 2 * Math.PI * r
    const text = buildRingCopy(
      line,
      other,
      rand() > 0.45,
      circumference,
      fontSize
    )

    return {
      d: circlePath(cx, cy, r),
      cx,
      cy,
      strokeWidth: STROKE,
      fontSize,
      text,
      // Keep angular pace lively but readable; outer rings a touch slower.
      duration: 42 + i * 8 + rand() * 10,
      phase: rand(),
      // Alternate direction each ring (inner → outer)
      reverse: i % 2 === 1,
    }
  })
}

/**
 * Footer of five nested text rings — full-width upper semicircle.
 * The marquee is a continuous rotation of each ring around its center.
 * A full turn is inherently seamless, so it runs on GPU-friendly CSS
 * transforms with no per-frame layout work.
 */
export function TangleFooter({
  className,
  lines = DEFAULT_LINES,
  ribbon,
  textColor,
  background,
  height,
  seed = 23,
  label = "Site footer",
}: TangleFooterProps) {
  const reduce = useReducedMotion() ?? false
  const uid = useId().replace(/:/g, "")
  const rootRef = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const measure = () => {
      setWidth(el.clientWidth)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Pause the animation while off-screen so it never wastes frames.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => setPaused(!(entry?.isIntersecting ?? true)),
      { rootMargin: "64px", threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const bandHeight = height ?? (width > 0 ? width / 2 : 0)
  const rings = useMemo(
    () =>
      width > 0 && bandHeight > 0
        ? buildRings(width, bandHeight, lines, seed)
        : [],
    [width, bandHeight, lines, seed]
  )

  const spinName = `tangle-spin-${uid}`

  return (
    <footer
      ref={rootRef}
      data-slot="tangle-footer"
      aria-label={label}
      className={cn(
        "relative w-full overflow-hidden",
        // Theme tokens — skipped when explicit color props are passed
        background === undefined && "bg-[#EFEAE2] dark:bg-[#121210]",
        ribbon == null &&
          "[--tangle-ribbon:#141414] dark:[--tangle-ribbon:#E8E4DC]",
        textColor == null &&
          "[--tangle-text:#F4F0E8] dark:[--tangle-text:#161616]",
        className
      )}
      style={{
        background,
        height: bandHeight > 0 ? bandHeight : undefined,
        aspectRatio: height == null ? "2 / 1" : undefined,
      }}
    >
      <style>{`@keyframes ${spinName}{to{transform:rotate(360deg)}}`}</style>

      {width > 0 && bandHeight > 0 ? (
        <motion.svg
          className="absolute inset-0 size-full"
          viewBox={`0 0 ${width} ${bandHeight}`}
          preserveAspectRatio="xMidYMax slice"
          xmlns="http://www.w3.org/2000/svg"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <defs>
            {rings.map((ring, i) => (
              <path
                key={`def-${i}`}
                id={`${uid}-path-${i}`}
                d={ring.d}
                fill="none"
              />
            ))}
          </defs>

          {rings.map((ring, i) => {
            const pathId = `${uid}-path-${i}`
            return (
              <g
                key={`ring-${i}`}
                style={
                  reduce
                    ? undefined
                    : {
                        transformBox: "view-box",
                        transformOrigin: `${ring.cx}px ${ring.cy}px`,
                        animation: `${spinName} ${ring.duration}s linear infinite`,
                        animationDirection: ring.reverse ? "reverse" : "normal",
                        animationDelay: `${-ring.phase * ring.duration}s`,
                        animationPlayState: paused ? "paused" : "running",
                        willChange: "transform",
                      }
                }
              >
                <use
                  href={`#${pathId}`}
                  strokeWidth={ring.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  style={{
                    // Live CSS so `var(--tangle-ribbon)` tracks `html.dark`.
                    stroke: ribbon ?? "var(--tangle-ribbon)",
                  }}
                />
                <text
                  fontSize={ring.fontSize}
                  fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
                  fontWeight={700}
                  letterSpacing="0.05em"
                  dominantBaseline="central"
                  style={{
                    fill: textColor ?? "var(--tangle-text)",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  <textPath href={`#${pathId}`} startOffset="0" method="align">
                    {ring.text}
                  </textPath>
                </text>
              </g>
            )
          })}
        </motion.svg>
      ) : null}

      <p className="sr-only">{lines.join(" ")}</p>
    </footer>
  )
}
