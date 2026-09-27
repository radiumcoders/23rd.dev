export type TangleFooterOptions = {
  /** Line color, any CSS color. Omit to use the text color (`currentColor`). */
  color?: string
  /** How many vines. Default `3`. */
  vines?: number
  /** Line width in px. Omit to scale with the footer width. */
  thickness?: number
  /** Deterministic tangle. Default `23`. */
  seed?: number
}

export type TangleFooterInstance = {
  setOptions: (options: Partial<TangleFooterOptions>) => void
  destroy: () => void
}

export const DEFAULT_VINES = 3
export const DEFAULT_SEED = 23

/** Spacing of the resampled vine, in px. */
const STEP = 2
/** Vines start and end this share of the width past each side. */
const OVERHANG = 0.12
/** Seconds for the vines to grow in. */
const GROW_S = 1.8

export type Vine = {
  /** x, y pairs spaced `STEP` apart along the vine. */
  points: Float32Array
  /** Where each piece of the vine starts, in samples, plus the end. */
  cuts: number[]
  /** Stacking order of each piece; higher draws on top. */
  depths: number[]
}

export function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function numberOr(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return clamp(value, min, max)
}

/** Smooth wander in −1…1 from three detuned sines. */
function wander(rand: () => number, scale: number) {
  const waves = Array.from({ length: 3 }, (_, i) => ({
    f: ((0.6 + rand() * 0.8) * (i + 1)) / scale,
    p: rand() * Math.PI * 2,
    a: 1 / (i + 1),
  }))
  const total = waves.reduce((sum, w) => sum + w.a, 0)
  return (s: number) =>
    waves.reduce((sum, w) => sum + w.a * Math.sin(w.f * s + w.p), 0) / total
}

/** A pen-line width that suits a footer this wide. */
export function autoThickness(width: number) {
  return clamp(width * 0.0021, 1.75, 3.5)
}

/**
 * Lays out the tangle. Each vine is a wheel rolling left to right with a
 * pen on a spoke longer than the wheel (a prolate trochoid): where the pen
 * outruns the wheel it curls back into a loop, so loops rise off a
 * wandering baseline. Wheel size and spoke length drift along the vine,
 * so some curls are big, some small, some just a wave.
 *
 * Every vine is cut into short pieces with random stacking, so vines pass
 * over and under each other — and themselves — like a real tangle.
 */
export function buildVines(
  width: number,
  height: number,
  options: Pick<TangleFooterOptions, "vines" | "seed"> = {}
): Vine[] {
  const count = Math.round(numberOr(options.vines, DEFAULT_VINES, 1, 12))
  const seed = Math.round(numberOr(options.seed, DEFAULT_SEED, 0, 2 ** 31))
  // Smallest loop the wheel sizes produce (spoke ≈ 2 wheels at the low end).
  const minLoop = height * 0.14
  // Pieces shorter than half the smallest loop, so the two strands of any
  // loop land in different pieces and the loop can cross over itself.
  const piece = minLoop * 1.5

  return Array.from({ length: count }, (_, v) => {
    const rand = mulberry32(seed * 7919 + v * 104729)
    const scale = width * (0.18 + rand() * 0.12)
    const baseline = wander(rand, scale * 1.6)
    const size = wander(rand, scale)
    const curl = wander(rand, scale * 0.8)
    // Spread the vines through the lower band; loops climb from there.
    const floor = height * (0.62 + (v / Math.max(1, count - 1)) * 0.28)
    const wheel0 = height * (0.1 + rand() * 0.05)

    const raw: number[] = []
    let phi = rand() * Math.PI * 2
    const start = -width * OVERHANG
    const end = width * (1 + OVERHANG)
    for (let s = start; s <= end; s += 1) {
      const y0 = floor + height * 0.18 * baseline(s)
      const wheel = wheel0 * (1 + 0.45 * size(s))
      // Past 1 the pen outruns the wheel and curls into a loop; near 2 the
      // loop closes round. Below 1 the vine just waves. The ratio snaps
      // quickly between the two, since loops just past 1 read as thin
      // teardrops and waves just under 1 as sharp cusps.
      const c = curl(s)
      const k = clamp((c + 0.1) / 0.25, 0, 1)
      let spoke = wheel * (0.7 + 1.35 * k * k * (3 - 2 * k) + 0.25 * c)
      // Keep every loop under the top edge.
      spoke = Math.min(spoke, Math.max(minLoop * 0.5, (y0 - height * 0.06) / 2))
      phi += 1 / wheel
      raw.push(s + spoke * Math.sin(phi), y0 - spoke * (1 - Math.cos(phi)))
    }

    // Resample to even spacing so pieces are measured in px.
    const points: number[] = [raw[0]!, raw[1]!]
    let carry = 0
    for (let i = 2; i < raw.length; i += 2) {
      const ax = raw[i - 2]!
      const ay = raw[i - 1]!
      const bx = raw[i]!
      const by = raw[i + 1]!
      const seg = Math.hypot(bx - ax, by - ay)
      let at = STEP - carry
      while (at <= seg) {
        const k = at / seg
        points.push(ax + (bx - ax) * k, ay + (by - ay) * k)
        at += STEP
      }
      carry = seg - (at - STEP)
    }

    const samples = points.length / 2
    const per = Math.max(2, Math.round(piece / STEP))
    const cuts: number[] = []
    for (let i = 0; i < samples - 1; i += per) cuts.push(i)
    cuts.push(samples - 1)

    return {
      points: Float32Array.from(points),
      cuts,
      depths: cuts.slice(0, -1).map(() => rand()),
    }
  })
}

type Piece = { vine: number; index: number; depth: number }

/**
 * Tangled pen-line vines on a transparent canvas, in the text color by
 * default. They grow in from the left the first time they're seen, then
 * hold still — nothing runs after that. Redraws on resize and theme change.
 */
export function createTangleFooter(
  canvas: HTMLCanvasElement,
  initial: TangleFooterOptions = {}
): TangleFooterInstance | null {
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  let options: TangleFooterOptions = { ...initial }
  const size = { w: 0, h: 0, dpr: 1 }
  let vines: Vine[] = []
  let order: Piece[] = []
  /** Cached gap and line paths per piece; the geometry never moves. */
  let paths: { gap: Path2D; line: Path2D }[][] = []
  let thickness = 2
  let grow = 0
  let seen = false
  let raf = 0
  let last = 0

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")

  /** The stretch of a vine from sample `a` to `b` as a path. */
  function tracePath(vine: Vine, a: number, b: number) {
    const p = vine.points
    const end = p.length / 2 - 1
    const from = clamp(Math.floor(a), 0, end)
    const to = clamp(Math.ceil(b), 0, end)
    const path = new Path2D()
    path.moveTo(p[from * 2]!, p[from * 2 + 1]!)
    for (let i = from + 1; i <= to; i++) path.lineTo(p[i * 2]!, p[i * 2 + 1]!)
    return path
  }

  const rebuild = () => {
    const { w, h } = size
    if (w < 2 || h < 2) return
    thickness = numberOr(options.thickness, autoThickness(w), 0.5, 24)
    vines = buildVines(w, h, options)
    paths = vines.map((vine) =>
      vine.depths.map((_, k) => ({
        gap: tracePath(vine, vine.cuts[k]!, vine.cuts[k + 1]!),
        // A sample past each end hides the seam between pieces.
        line: tracePath(vine, vine.cuts[k]! - 1, vine.cuts[k + 1]! + 1),
      }))
    )
    order = vines
      .flatMap((vine, v) =>
        vine.depths.map((depth, index) => ({ vine: v, index, depth }))
      )
      .sort((a, b) => a.depth - b.depth)
  }

  const resize = () => {
    const parent = canvas.parentElement
    if (!parent) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = parent.clientWidth
    const h = parent.clientHeight
    if (w === size.w && h === size.h && dpr === size.dpr) return
    Object.assign(size, { w, h, dpr })
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(h * dpr))
    rebuild()
    wake()
  }

  function draw() {
    const { w, h, dpr } = size
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx!.clearRect(0, 0, w, h)
    if (!vines.length || grow <= 0) return

    const eased = 1 - (1 - grow) ** 3
    // Clear space each side of a line where it crosses over another.
    const gap = thickness + Math.max(2, thickness * 1.1) * 2
    ctx!.strokeStyle =
      options.color?.trim() || getComputedStyle(canvas).color || "#000"
    ctx!.lineJoin = "round"
    ctx!.lineCap = "round"

    for (const { vine: v, index } of order) {
      const vine = vines[v]!
      const reach = ((vine.points.length / 2 - 1) * eased) | 0
      const a = vine.cuts[index]!
      if (a >= reach) continue
      const b = vine.cuts[index + 1]!
      // Only the growing tip needs a fresh path.
      const path =
        b <= reach
          ? paths[v]![index]!
          : {
              gap: tracePath(vine, a, reach),
              line: tracePath(vine, a - 1, reach),
            }

      ctx!.globalCompositeOperation = "destination-out"
      ctx!.lineWidth = gap
      ctx!.lineCap = "butt"
      ctx!.stroke(path.gap)
      ctx!.globalCompositeOperation = "source-over"
      ctx!.lineWidth = thickness
      ctx!.lineCap = "round"
      ctx!.stroke(path.line)
    }
  }

  function wake() {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  function tick(now: number) {
    raf = 0
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    if (mqReduce.matches) grow = seen ? 1 : grow
    else if (seen && document.visibilityState !== "hidden")
      grow = Math.min(1, grow + dt / GROW_S)
    draw()
    // Frames only while growing; afterwards it's a still drawing.
    if (seen && grow < 1) raf = requestAnimationFrame(tick)
  }

  const ro = new ResizeObserver(resize)
  if (canvas.parentElement) ro.observe(canvas.parentElement)
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting || seen) return
      seen = true
      io.disconnect()
      wake()
    },
    { threshold: 0.25 }
  )
  io.observe(canvas)
  const onVisibility = () => wake()
  document.addEventListener("visibilitychange", onVisibility)
  // `currentColor` follows the theme; redraw when it flips.
  const mo = new MutationObserver(() => wake())
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  })
  const mqDark = window.matchMedia("(prefers-color-scheme: dark)")
  mqDark.addEventListener("change", wake)

  resize()
  wake()

  return {
    setOptions(next) {
      const prev = options
      options = { ...options, ...next }
      if (
        prev.vines !== options.vines ||
        prev.seed !== options.seed ||
        prev.thickness !== options.thickness
      ) {
        rebuild()
        // A new tangle grows in again.
        if (!mqReduce.matches) grow = 0
      }
      wake()
    },
    destroy() {
      cancelAnimationFrame(raf)
      raf = 0
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      mqDark.removeEventListener("change", wake)
    },
  }
}
