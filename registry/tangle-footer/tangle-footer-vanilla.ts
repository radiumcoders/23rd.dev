export const DEFAULT_LINES = [
  "Ship something opinionated — less boilerplate, clearer decisions.",
  "Knows what’s going on. Can you check in with them and see what’s next.",
  "The new timeline should be ready by Friday, although it’s probably going to slip.",
  "Open the docs, grab a component, and make it yours in the codebase.",
  "Radiant lines, shader wash, gooey picker — install what you need and move.",
]

export type Ring = {
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

export type TangleFooterOptions = {
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

export const RING_COUNT = 5

export const K = 0.5522847498
export const STROKE = 28

/** Mulberry32 — deterministic PRNG so rings stay stable across re-renders. */
export function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Perfect circle as four cubics (container clips to the upper half). */
export function circlePath(cx: number, cy: number, r: number): string {
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
export function buildRingCopy(
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
export function buildRings(
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
