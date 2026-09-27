export const DEFAULT_LINES = [
  "Ship something opinionated — less boilerplate, clearer decisions.",
  "Knows what’s going on. Can you check in with them and see what’s next.",
  "The new timeline should be ready by Friday, although it’s probably going to slip.",
  "Open the docs, grab a component, and make it yours in the codebase.",
  "Radiant lines, shader wash, gooey picker — install what you need and move.",
]

export type TangleFooterTheme = "light" | "dark" | "auto"

export type TangleFooterOptions = {
  /** Phrases that run along the vines. */
  lines?: string[]
  /** Ribbon color. Omit to follow `theme` (ink on light, cream on dark). */
  ribbon?: string
  /** Lettering on the ribbons. Omit to follow `theme`. */
  textColor?: string
  /** How many vines. Default `4`. */
  vines?: number
  /** Marquee speed along the vines, in px per second. Default `36`. */
  speed?: number
  /** Ribbon width in px. Omit to scale with the footer width. */
  thickness?: number
  /** Deterministic tangle. Default `23`. */
  seed?: number
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class).
   */
  theme?: TangleFooterTheme
}

export type TangleFooterInstance = {
  setOptions: (options: Partial<TangleFooterOptions>) => void
  destroy: () => void
}

export const LIGHT_RIBBON = "#141414"
export const LIGHT_TEXT = "#F4F0E8"
export const LIGHT_BG = "#EFEAE2"
export const DARK_RIBBON = "#E8E4DC"
export const DARK_TEXT = "#161616"
export const DARK_BG = "#121210"
export const DEFAULT_VINES = 4
export const DEFAULT_SPEED = 36
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
  /** Arc length in px. */
  length: number
  /** Where each piece of the vine starts, in samples, plus the end. */
  cuts: number[]
  /** Stacking order of each piece; higher draws on top. */
  depths: number[]
  /** The copy that repeats along this vine. */
  text: string
  /** Marquee speed multiplier and starting offset (0–1 of the copy). */
  pace: number
  phase: number
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

/** Ribbon width that suits a footer this wide. */
export function autoThickness(width: number) {
  return clamp(width * 0.019, 16, 28)
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
  options: {
    vines?: number
    thickness?: number
    seed?: number
    lines?: string[]
  } = {}
): Vine[] {
  const count = Math.round(numberOr(options.vines, DEFAULT_VINES, 1, 12))
  const w = numberOr(options.thickness, autoThickness(width), 6, 80)
  const seed = Math.round(numberOr(options.seed, DEFAULT_SEED, 0, 2 ** 31))
  const pool = options.lines?.filter((line) => line.trim()) ?? []
  const lines = pool.length ? pool : DEFAULT_LINES
  // Pieces short enough that the two strands of any loop land in different
  // pieces, so a loop can cross over itself.
  const piece = w * 4

  return Array.from({ length: count }, (_, v) => {
    const rand = mulberry32(seed * 7919 + v * 104729)
    const scale = width * (0.18 + rand() * 0.12)
    const baseline = wander(rand, scale * 1.6)
    const size = wander(rand, scale)
    const curl = wander(rand, scale * 0.8)
    // Spread the vines through the lower band; loops climb from there.
    const floor = height * (0.6 + (v / Math.max(1, count - 1)) * 0.3)
    const wheel0 = Math.max(w * 1.2, height * (0.07 + rand() * 0.04))

    const raw: number[] = []
    let phi = rand() * Math.PI * 2
    const start = -width * OVERHANG
    const end = width * (1 + OVERHANG)
    for (let s = start; s <= end; s += 1) {
      const y0 = floor + height * 0.2 * baseline(s)
      const wheel = wheel0 * (1 + 0.45 * size(s))
      // Past 1 the pen outruns the wheel and curls into a loop; near 2 the
      // loop closes round. Below 1 the vine just waves.
      let spoke = wheel * (1.5 + 1.05 * curl(s))
      // Open any loop too tight to read, then keep it under the top edge.
      if (spoke > wheel) spoke = Math.max(spoke, w * 2.3)
      spoke = Math.min(spoke, Math.max(w, (y0 - w * 0.6) / 2))
      phi += 1 / wheel
      raw.push(s + spoke * Math.sin(phi), y0 - spoke * (1 - Math.cos(phi)))
    }

    // Resample to even spacing so text and pieces are measured in px.
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
    const depths = cuts.slice(0, -1).map(() => rand())

    const line = lines[Math.floor(rand() * lines.length)]!
    const other = lines[Math.floor(rand() * lines.length)]!
    const text =
      line === other ? `${line}   ·   ` : `${line}   ·   ${other}   ·   `

    return {
      points: Float32Array.from(points),
      length: (samples - 1) * STEP,
      cuts,
      depths,
      text,
      pace: 0.8 + rand() * 0.4,
      phase: rand(),
    }
  })
}

/** Resolves shadcn / next-themes dark mode (`attribute="class"` → `html.dark`). */
export function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false
  const root = document.documentElement
  if (root.classList.contains("dark")) return true
  if (root.classList.contains("light")) return false
  const dataTheme = root.getAttribute("data-theme")
  if (dataTheme === "dark") return true
  if (dataTheme === "light") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function resolveDark(theme: TangleFooterTheme = "auto"): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

type Glyph = { ch: string; adv: number }
type Piece = { vine: number; index: number; depth: number }

/**
 * Tangled text vines on a canvas. The vines grow in from the left the first
 * time they're seen, then the copy runs along them. Pauses off-screen and in
 * hidden tabs; holds still under `prefers-reduced-motion`.
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
  let glyphs: Glyph[][] = []
  let units: number[] = []
  /** Cached gap and ribbon paths per piece; the geometry never moves. */
  let paths: { gap: Path2D; ribbon: Path2D }[][] = []
  let thickness = 20
  let font = ""
  let dark = resolveDark(options.theme)
  let grow = 0
  let clock = 0
  let seen = false
  let onScreen = false
  let raf = 0
  let last = 0

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  let reduce = mqReduce.matches

  const rebuild = () => {
    const { w, h } = size
    if (w < 2 || h < 2) return
    thickness = numberOr(options.thickness, autoThickness(w), 6, 80)
    vines = buildVines(w, h, { ...options, thickness })
    paths = vines.map((vine) =>
      vine.depths.map((_, k) => ({
        gap: tracePath(vine, vine.cuts[k]!, vine.cuts[k + 1]!),
        ribbon: tracePath(vine, vine.cuts[k]! - 1, vine.cuts[k + 1]! + 1),
      }))
    )
    order = vines
      .flatMap((vine, v) =>
        vine.depths.map((depth, index) => ({ vine: v, index, depth }))
      )
      .sort((a, b) => a.depth - b.depth)
    const family = getComputedStyle(canvas).fontFamily || "sans-serif"
    font = `700 ${Math.round(thickness * 0.5)}px ${family}`
    ctx.font = font
    const widths = new Map<string, number>()
    glyphs = vines.map((vine) =>
      Array.from(vine.text).map((ch) => {
        let adv = widths.get(ch)
        if (adv === undefined) {
          adv = ctx.measureText(ch).width
          widths.set(ch, adv)
        }
        return { ch, adv }
      })
    )
    units = glyphs.map((list) => list.reduce((sum, g) => sum + g.adv, 0))
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

  /** The stretch of a vine from sample `a` to `b` as a path. */
  function tracePath(vine: Vine, a: number, b: number) {
    const p = vine.points
    const last = p.length / 2 - 1
    const from = clamp(Math.floor(a), 0, last)
    const to = clamp(Math.ceil(b), 0, last)
    const path = new Path2D()
    path.moveTo(p[from * 2]!, p[from * 2 + 1]!)
    for (let i = from + 1; i <= to; i++) path.lineTo(p[i * 2]!, p[i * 2 + 1]!)
    return path
  }

  function draw() {
    const { w, h, dpr } = size
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx!.clearRect(0, 0, w, h)
    if (!vines.length) return

    const ribbon = options.ribbon?.trim() || (dark ? DARK_RIBBON : LIGHT_RIBBON)
    const ink = options.textColor?.trim() || (dark ? DARK_TEXT : LIGHT_TEXT)
    const halo = Math.max(2.5, thickness * 0.16)
    const speed = numberOr(options.speed, DEFAULT_SPEED, 0, 400)
    const eased = 1 - (1 - grow) ** 3

    // Lay the copy along each vine and hand every glyph to the pieces it
    // touches, so a piece drawn on top never clips a neighbour's letters.
    const placed: [number, number][][][] = vines.map((vine) =>
      vine.depths.map(() => [])
    )
    vines.forEach((vine, v) => {
      const list = glyphs[v]!
      const unit = units[v]!
      if (!list.length || unit <= 0) return
      const reach = vine.length * eased
      const shift = (clock * speed * vine.pace + vine.phase * unit) % unit
      let at = -shift
      let i = 0
      while (at < reach) {
        const adv = list[i]!.adv
        if (at + adv > 0 && list[i]!.ch !== " ") {
          const mid = at + adv / 2
          if (mid < reach) {
            // Pieces are evenly spaced, so the ones a glyph spans are direct.
            const per = vine.cuts[1]! - vine.cuts[0]!
            const lastPiece = vine.depths.length - 1
            const k0 = Math.min(
              lastPiece,
              Math.floor(Math.max(0, at) / STEP / per)
            )
            const k1 = Math.min(lastPiece, Math.floor((at + adv) / STEP / per))
            for (let k = k0; k <= k1; k++) placed[v]![k]!.push([mid, i])
          }
        }
        at += adv
        i = (i + 1) % list.length
      }
    })

    ctx!.lineJoin = "round"
    ctx!.lineCap = "butt"
    ctx!.font = font
    ctx!.textBaseline = "middle"
    ctx!.textAlign = "center"
    for (const { vine: v, index } of order) {
      const vine = vines[v]!
      const reach = (vine.length * eased) / STEP
      const a = vine.cuts[index]!
      if (a >= reach) continue
      const b = vine.cuts[index + 1]!
      // Only the growing tip needs a fresh path.
      const whole = b <= reach
      const path = whole
        ? paths[v]![index]!
        : {
            gap: tracePath(vine, a, reach),
            ribbon: tracePath(vine, a - 1, reach),
          }

      // Cut a gap around this piece, so whatever it crosses reads as beneath.
      ctx!.globalCompositeOperation = "destination-out"
      ctx!.lineWidth = thickness + halo * 2
      ctx!.stroke(path.gap)
      ctx!.globalCompositeOperation = "source-over"
      ctx!.strokeStyle = ribbon
      ctx!.lineWidth = thickness
      // The ribbon runs a sample past each end, hiding the seam between pieces.
      ctx!.stroke(path.ribbon)

      ctx!.fillStyle = ink
      const p = vine.points
      const lastSample = p.length / 2 - 1
      for (const [mid, gi] of placed[v]![index]!) {
        const s = mid / STEP
        const i0 = clamp(Math.floor(s), 0, lastSample - 1)
        const k = s - i0
        const x0 = p[i0 * 2]!
        const y0 = p[i0 * 2 + 1]!
        const x1 = p[i0 * 2 + 2]!
        const y1 = p[i0 * 2 + 3]!
        const angle = Math.atan2(y1 - y0, x1 - x0)
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        ctx!.setTransform(
          dpr * cos,
          dpr * sin,
          -dpr * sin,
          dpr * cos,
          dpr * (x0 + (x1 - x0) * k),
          dpr * (y0 + (y1 - y0) * k)
        )
        ctx!.fillText(glyphs[v]![gi]!.ch, 0, 0)
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }

  const animating = () =>
    onScreen && !reduce && document.visibilityState !== "hidden"

  function wake() {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  function tick(now: number) {
    raf = 0
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    const moving = animating()
    if (reduce) grow = 1
    else if (seen && moving) grow = Math.min(1, grow + dt / GROW_S)
    if (moving) clock += dt
    draw()
    if (moving) raf = requestAnimationFrame(tick)
  }

  const syncTheme = () => {
    const next = resolveDark(options.theme)
    if (next === dark) return
    dark = next
    wake()
  }

  const ro = new ResizeObserver(resize)
  if (canvas.parentElement) ro.observe(canvas.parentElement)
  const io = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry?.isIntersecting ?? true
      if (onScreen) seen = true
      wake()
    },
    { rootMargin: "64px" }
  )
  io.observe(canvas)
  const onVisibility = () => wake()
  document.addEventListener("visibilitychange", onVisibility)
  const onReduce = () => {
    reduce = mqReduce.matches
    wake()
  }
  mqReduce.addEventListener("change", onReduce)
  const mo = new MutationObserver(syncTheme)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  })
  const mqDark = window.matchMedia("(prefers-color-scheme: dark)")
  mqDark.addEventListener("change", syncTheme)
  // Canvas text can't wait on a web font by itself.
  document.fonts?.ready.then(() => {
    rebuild()
    wake()
  })

  resize()
  wake()

  return {
    setOptions(next) {
      const prev = options
      options = { ...options, ...next }
      syncTheme()
      if (
        prev.lines !== options.lines ||
        prev.vines !== options.vines ||
        prev.seed !== options.seed ||
        prev.thickness !== options.thickness
      ) {
        rebuild()
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
      mqReduce.removeEventListener("change", onReduce)
      mqDark.removeEventListener("change", syncTheme)
    },
  }
}
