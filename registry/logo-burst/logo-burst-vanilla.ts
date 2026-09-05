export type LogoBurstTheme = "light" | "dark" | "auto"

export type LogoBurstOptions = {
  /** Hair-line count. Default `260`. */
  tentacleCount?: number
  /**
   * Filament + particle color. Omit to follow `theme`
   * (`LIGHT_COLOR` / `DARK_COLOR`).
   */
  color?: string
  /**
   * Inner hole in CSS pixels. Lines start just outside this disc.
   * Default `0` (lines meet at the origin). Raise it when you overlay a mark.
   */
  coreSize?: number
  /**
   * Outer reach as a fraction of the shorter canvas edge.
   * Default `0.48`.
   */
  radius?: number
  /** Burst duration in seconds. Default `1.35`. */
  duration?: number
  /** Deterministic tentacle layout. Default `23`. */
  seed?: number
  /** Share of tentacles that grow a tip particle (0–1). Default `0.62`. */
  particleRatio?: number
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class) so filaments swap with the site theme.
   */
  theme?: LogoBurstTheme
  /** Idle inhale after the burst. Default `true`. */
  breathe?: boolean
  /** Fires whenever resolved dark mode changes. */
  onThemeChange?: (dark: boolean) => void
}

export type LogoBurstInstance = {
  setOptions: (options: Partial<LogoBurstOptions>) => void
  replay: () => void
  destroy: () => void
}

/** Bone filament — reads on slate / black */
export const DARK_COLOR = "#D6D2CA"
/** Ink filament — reads on paper / white */
export const LIGHT_COLOR = "#3F3F46"
/** @deprecated Use `DARK_COLOR` or omit `color` and set `theme`. */
export const DEFAULT_COLOR = DARK_COLOR
export const DEFAULT_TENTACLE_COUNT = 260
export const DEFAULT_CORE_SIZE = 0
export const DEFAULT_RADIUS = 0.48
export const DEFAULT_DURATION = 1.35
export const DEFAULT_SEED = 23
export const DEFAULT_PARTICLE_RATIO = 0.62

type Tentacle = {
  angle: number
  length: number
  width: number
  alpha: number
  delay: number
  grow: number
  phase: number
  tip: boolean
  tipSize: number
  tipOvershoot: number
  mids: Array<{ t: number; size: number; alpha: number }>
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function tentacleCountOf(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TENTACLE_COUNT
  }
  return Math.round(clamp(value, 24, 900))
}

function radiusOf(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_RADIUS
  }
  return clamp(value, 0.12, 0.95)
}

function durationOf(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DURATION
  }
  return clamp(value, 0.2, 6)
}

function coreSizeOf(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_CORE_SIZE
  }
  return clamp(value, 0, 480)
}

function seedOf(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_SEED
  }
  return Math.floor(value)
}

function particleRatioOf(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_PARTICLE_RATIO
  }
  return clamp(value, 0, 1)
}

function themeOf(value?: LogoBurstTheme): LogoBurstTheme {
  return value === "light" || value === "dark" || value === "auto"
    ? value
    : "auto"
}

function optionalColor(value?: string) {
  const next = value?.trim()
  return next ? next : undefined
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

export function resolveDark(theme: LogoBurstTheme): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

export function resolveColor(color: string | undefined, dark: boolean) {
  const custom = optionalColor(color)
  if (custom) return custom
  return dark ? DARK_COLOR : LIGHT_COLOR
}

function parseRgb(color: string): [number, number, number] {
  const raw = color.trim()
  if (raw.startsWith("#")) {
    const hex = raw.slice(1)
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex.padEnd(6, "0").slice(0, 6)
    const n = Number.parseInt(full, 16)
    if (Number.isNaN(n)) return darkFallbackRgb(false)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const rgb = raw.match(/rgba?\(\s*([.\d]+)\s*,\s*([.\d]+)\s*,\s*([.\d]+)/i)
  if (rgb) {
    return [
      Number.parseFloat(rgb[1]!),
      Number.parseFloat(rgb[2]!),
      Number.parseFloat(rgb[3]!),
    ]
  }
  return darkFallbackRgb(false)
}

function darkFallbackRgb(dark: boolean): [number, number, number] {
  return dark ? [214, 210, 202] : [63, 63, 70]
}

function rgba(rgb: [number, number, number], alpha: number) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamp(alpha, 0, 1)})`
}

function easeOutQuart(t: number) {
  const p = 1 - clamp(t, 0, 1)
  return 1 - p * p * p * p
}

function createTentacles(
  count: number,
  seed: number,
  particleRatio: number
): Tentacle[] {
  const rand = mulberry32(seed)
  const tentacles: Tentacle[] = []

  for (let i = 0; i < count; i++) {
    const base = (i / count) * Math.PI * 2
    const angle = base + (rand() - 0.5) * (Math.PI * 2 * 0.018)
    const roll = rand()
    // Power curve: more mid-length rays, a few long outliers, some stubs.
    const length =
      roll < 0.12
        ? 0.22 + rand() * 0.18
        : roll < 0.78
          ? 0.48 + rand() * 0.32
          : 0.78 + rand() * 0.22
    const tip = rand() < particleRatio
    const midCount = rand() < 0.22 ? 2 : rand() < 0.48 ? 1 : 0
    const mids: Tentacle["mids"] = []
    for (let m = 0; m < midCount; m++) {
      mids.push({
        t: 0.28 + rand() * 0.52,
        size: 0.55 + rand() * 0.7,
        alpha: 0.28 + rand() * 0.38,
      })
    }

    tentacles.push({
      angle,
      length: clamp(length, 0.16, 1),
      width: 0.35 + rand() * 0.85,
      alpha: 0.22 + rand() * 0.55,
      delay: rand() * 0.42 + (i / count) * 0.08,
      grow: 0.55 + rand() * 0.7,
      phase: rand() * Math.PI * 2,
      tip,
      tipSize: 0.85 + rand() * 1.35,
      tipOvershoot: tip && rand() < 0.35 ? 0.018 + rand() * 0.05 : 0,
      mids,
    })
  }

  return tentacles
}

/**
 * Hair-line tentacle burst — filaments explode from the center, then
 * keep a slow inhale. Transparent canvas over `bg-background`.
 */
export function createLogoBurst(
  canvas: HTMLCanvasElement,
  initial: LogoBurstOptions = {}
): LogoBurstInstance | null {
  let options: LogoBurstOptions = {
    tentacleCount: tentacleCountOf(initial.tentacleCount),
    color: optionalColor(initial.color),
    coreSize: coreSizeOf(initial.coreSize),
    radius: radiusOf(initial.radius),
    duration: durationOf(initial.duration),
    seed: seedOf(initial.seed),
    particleRatio: particleRatioOf(initial.particleRatio),
    theme: themeOf(initial.theme),
    breathe: initial.breathe !== false,
    onThemeChange: initial.onThemeChange,
  }

  const ctx = canvas.getContext("2d", { alpha: true })
  if (!ctx) return null

  let tentacles = createTentacles(
    tentacleCountOf(options.tentacleCount),
    seedOf(options.seed),
    particleRatioOf(options.particleRatio)
  )
  const size = { w: 0, h: 0 }
  let reduce = false
  let raf = 0
  let running = true
  let startedAt = performance.now()
  let settled = false
  let dark = resolveDark(themeOf(options.theme))
  options.onThemeChange?.(dark)

  const resize = () => {
    const parent = canvas.parentElement
    if (!parent) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = parent.clientWidth
    const h = parent.clientHeight
    size.w = w
    size.h = h
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  resize()
  const ro = new ResizeObserver(resize)
  if (canvas.parentElement) ro.observe(canvas.parentElement)

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const onReduce = () => {
    reduce = mqReduce.matches
    if (reduce) settled = true
  }
  onReduce()
  mqReduce.addEventListener("change", onReduce)

  const syncTheme = () => {
    const next = resolveDark(themeOf(options.theme))
    if (next === dark) return
    dark = next
    options.onThemeChange?.(dark)
  }
  const mo = new MutationObserver(syncTheme)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  })
  const mqDark = window.matchMedia("(prefers-color-scheme: dark)")
  mqDark.addEventListener("change", syncTheme)

  const progressOf = (now: number, tentacle: Tentacle) => {
    if (reduce || settled) return 1
    const elapsed = (now - startedAt) / 1000
    const span = durationOf(options.duration) * tentacle.grow
    const t = (elapsed - tentacle.delay * durationOf(options.duration)) / span
    return easeOutQuart(t)
  }

  const paint = (now: number) => {
    if (!running) return

    const { w, h } = size
    if (w === 0 || h === 0) {
      raf = requestAnimationFrame(paint)
      return
    }

    const cx = w / 2
    const cy = h / 2
    const maxR = Math.min(w, h) * radiusOf(options.radius)
    const inner = Math.min(maxR * 0.92, coreSizeOf(options.coreSize) * 0.42)
    const rgb = parseRgb(resolveColor(options.color, dark))
    const seconds = now / 1000
    const breathing = settled && !reduce && options.breathe !== false
    const field = breathing ? Math.sin(seconds * 0.92) * 0.015 : 0

    ctx.clearRect(0, 0, w, h)
    ctx.lineCap = "round"

    let allDone = true

    for (let i = 0; i < tentacles.length; i++) {
      const tentacle = tentacles[i]!
      const p = progressOf(now, tentacle)
      if (p < 1) allDone = false

      const line = breathing
        ? Math.sin(seconds * 1.28 + tentacle.phase) * 0.018
        : 0
      const scale = 1 + field + line
      const reach = inner + (maxR - inner) * tentacle.length * p * scale
      if (reach <= inner + 0.4) continue

      const fade = breathing
        ? 0.9 + 0.1 * Math.sin(seconds * 0.92 + tentacle.phase * 0.35)
        : 1
      const cos = Math.cos(tentacle.angle)
      const sin = Math.sin(tentacle.angle)
      const x0 = cx + cos * inner
      const y0 = cy + sin * inner
      const x1 = cx + cos * reach
      const y1 = cy + sin * reach

      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.strokeStyle = rgba(rgb, tentacle.alpha * (0.55 + p * 0.45) * fade)
      ctx.lineWidth = tentacle.width
      ctx.stroke()

      for (const mid of tentacle.mids) {
        if (p < mid.t) continue
        const mr = inner + (maxR - inner) * tentacle.length * mid.t * scale
        ctx.beginPath()
        ctx.arc(cx + cos * mr, cy + sin * mr, mid.size, 0, Math.PI * 2)
        ctx.fillStyle = rgba(rgb, mid.alpha * fade)
        ctx.fill()
      }

      if (tentacle.tip && p > 0.92) {
        const tipR =
          inner +
          (maxR - inner) * tentacle.length * (1 + tentacle.tipOvershoot) * scale
        const appear = clamp((p - 0.92) / 0.08, 0, 1)
        const tipPulse = breathing
          ? 1 + 0.1 * Math.sin(seconds * 1.28 + tentacle.phase)
          : 1
        ctx.beginPath()
        ctx.arc(
          cx + cos * tipR,
          cy + sin * tipR,
          tentacle.tipSize * tipPulse,
          0,
          Math.PI * 2
        )
        ctx.fillStyle = rgba(rgb, 0.78 * appear * fade)
        ctx.fill()
      }
    }

    if (!reduce && allDone) settled = true

    if (running && !reduce) {
      raf = requestAnimationFrame(paint)
    }
  }

  raf = requestAnimationFrame(paint)

  const replay = () => {
    if (reduce) {
      settled = true
      raf = requestAnimationFrame(paint)
      return
    }
    settled = false
    startedAt = performance.now()
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(paint)
  }

  return {
    setOptions(next) {
      const prevCount = tentacleCountOf(options.tentacleCount)
      const prevSeed = seedOf(options.seed)
      const prevRatio = particleRatioOf(options.particleRatio)
      options = {
        ...options,
        ...next,
        tentacleCount: tentacleCountOf(
          next.tentacleCount ?? options.tentacleCount
        ),
        color: "color" in next ? optionalColor(next.color) : options.color,
        coreSize: coreSizeOf(next.coreSize ?? options.coreSize),
        radius: radiusOf(next.radius ?? options.radius),
        duration: durationOf(next.duration ?? options.duration),
        seed: seedOf(next.seed ?? options.seed),
        particleRatio: particleRatioOf(
          next.particleRatio ?? options.particleRatio
        ),
        theme: themeOf(next.theme ?? options.theme),
        breathe: next.breathe ?? options.breathe,
      }
      syncTheme()
      const rebuilt =
        tentacleCountOf(options.tentacleCount) !== prevCount ||
        seedOf(options.seed) !== prevSeed ||
        particleRatioOf(options.particleRatio) !== prevRatio
      if (rebuilt) {
        tentacles = createTentacles(
          tentacleCountOf(options.tentacleCount),
          seedOf(options.seed),
          particleRatioOf(options.particleRatio)
        )
        replay()
      } else if (reduce) {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(paint)
      }
    },
    replay,
    destroy() {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo.disconnect()
      mqReduce.removeEventListener("change", onReduce)
      mqDark.removeEventListener("change", syncTheme)
    },
  }
}
