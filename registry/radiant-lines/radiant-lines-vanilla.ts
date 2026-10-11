export type RadiantLinesTheme = "light" | "dark" | "auto"

export type RadiantLinesOptions = {
  /** Star / streak colors. Default follows the theme. */
  colors?: string[]
  /**
   * Palette mode when `colors` is unset. `auto` (the default) reads
   * `html.dark` / `html.light`, then `data-theme`, then
   * `prefers-color-scheme`, and keeps up with changes.
   */
  theme?: RadiantLinesTheme
  /** How many stars. Default 420 */
  starCount?: number
  /**
   * How far each star jumps when warping (idle drift and scroll).
   * `1` matches the original ~60fps travel; higher values lengthen streaks.
   * Default `1`.
   */
  displacement?: number
  /**
   * Scroll container. Omit / `null` to use the window.
   * Pass the overflow scroller when the component lives inside one.
   */
  container?: HTMLElement | null
}

export type RadiantLinesInstance = {
  setOptions: (options: Partial<RadiantLinesOptions>) => void
  destroy: () => void
}

/** Dark-page palette: bright streaks on black. */
export const DEFAULT_COLORS = [
  "#FF6B4A",
  "#2DD4BF",
  "#FBBF24",
  "#60A5FA",
  "#F472B6",
  "#A3E635",
  "#94A3B8",
]

/** Light-page palette: the same hues, deep enough to read on white. */
export const LIGHT_COLORS = [
  "#E0472A",
  "#0E9484",
  "#C98A00",
  "#2A66D1",
  "#D2347F",
  "#5E8F0B",
  "#5B6B80",
]

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

export function resolveDark(theme: RadiantLinesTheme = "auto"): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

/**
 * Calls `onChange` whenever the page theme may have changed (the `html`
 * class, `data-theme` or `style`, or the system preference). Returns the
 * unsubscribe.
 */
export function watchTheme(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => {}
  const mo = new MutationObserver(onChange)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  })
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", onChange)
  return () => {
    mo.disconnect()
    mq.removeEventListener("change", onChange)
  }
}

const DEPTH = 1000
const STIFFNESS = 70
const DAMPING = 32
const MASS = 0.5
/** Original per-frame coefficient (`2.4`) converted to per-second at 60fps. */
const TRAVEL_PER_SEC = 2.4 * 60
/** Draw streaks as a 60fps step so filled heads keep a visible tail at any fps. */
const TRAIL_DT = 1 / 60

type Star = {
  x: number
  y: number
  z: number
  pz: number
  color: string
}

function paletteOf(colors: string[] | undefined, dark: boolean) {
  if (colors && colors.length > 0) return colors
  return dark ? DEFAULT_COLORS : LIGHT_COLORS
}

function displacementOf(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1
  return Math.max(0, value)
}

function createStars(count: number, colors: string[]): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    const z = Math.random() * DEPTH
    stars.push({
      x: (Math.random() - 0.5) * DEPTH,
      y: (Math.random() - 0.5) * DEPTH,
      z,
      pz: z,
      color: colors[i % colors.length]!,
    })
  }
  return stars
}

/**
 * Hyperspace starfield: colored streaks radiate from the center.
 * Transparent canvas over `bg-background` (shadcn theme). Warp speed follows
 * scroll velocity (down → inward, up → outward). `displacement` scales how
 * far each star travels (and how long the filled heads' streaks get).
 * The loop pauses off screen and in hidden tabs. Under reduced motion it
 * draws a still field, redrawn only when size or options change.
 */
export function createRadiantLines(
  canvas: HTMLCanvasElement,
  initial: RadiantLinesOptions = {}
): RadiantLinesInstance | null {
  let options: RadiantLinesOptions = {
    starCount: 420,
    displacement: 1,
    container: null,
    theme: "auto",
    ...initial,
  }

  const ctx = canvas.getContext("2d", { alpha: true })
  if (!ctx) return null

  let dark = resolveDark(options.theme)
  let stars = createStars(
    options.starCount ?? 420,
    paletteOf(options.colors, dark)
  )

  // Theme or palette changes recolor the field in place, so the stars keep
  // flying instead of jumping to new positions.
  const recolor = () => {
    const colors = paletteOf(options.colors, dark)
    for (let i = 0; i < stars.length; i++) {
      stars[i]!.color = colors[i % colors.length]!
    }
  }
  const size = { w: 0, h: 0 }
  let speed = 0.28
  let speedVel = 0
  let speedTarget = 0.28
  let dir = -1
  let reduce = false
  let raf = 0
  let destroyed = false
  let onScreen = true
  let lastFrame = performance.now()
  let lastScrollY = 0
  let lastScrollT = performance.now()
  let attached: Window | HTMLElement | null = null

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
    // Resizing clears the canvas, so a paused field needs a fresh frame.
    wake()
  }

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const onReduce = () => {
    reduce = mqReduce.matches
    if (reduce) {
      speedTarget = 0.06
      dir = -1
    }
    wake()
  }

  const readScrollY = () => {
    if (options.container) return options.container.scrollTop
    return window.scrollY
  }

  const applyWarp = (v: number) => {
    if (reduce) {
      speedTarget = 0.06
      dir = -1
      return
    }
    // Flipped: scroll down → inward; scroll up → outward
    if (Math.abs(v) > 2) {
      dir = v > 0 ? 1 : -1
    }
    const boost = Math.min(8, Math.abs(v) / 80)
    speedTarget = 0.22 + boost
  }

  const onScroll = () => {
    const now = performance.now()
    const y = readScrollY()
    const dt = now - lastScrollT
    const v = dt > 0 ? ((y - lastScrollY) / dt) * 1000 : 0
    lastScrollY = y
    lastScrollT = now
    applyWarp(v)
  }

  const unbindScroll = () => {
    if (!attached) return
    attached.removeEventListener("scroll", onScroll)
    attached = null
  }

  const bindScroll = () => {
    const next: Window | HTMLElement = options.container ?? window
    if (attached === next) return
    unbindScroll()
    attached = next
    lastScrollY = readScrollY()
    lastScrollT = performance.now()
    attached.addEventListener("scroll", onScroll, { passive: true })
  }

  bindScroll()

  const moving = () =>
    onScreen && !reduce && document.visibilityState !== "hidden"

  function wake() {
    if (raf || destroyed) return
    lastFrame = performance.now()
    raf = requestAnimationFrame(tick)
  }

  // An arrow, not a declaration, so TypeScript keeps `ctx` narrowed inside.
  const tick = (now: number) => {
    raf = 0
    if (destroyed) return

    const live = moving()
    // A paused frame redraws the field in place without advancing it.
    const dt = live ? Math.min(0.05, Math.max(0, (now - lastFrame) / 1000)) : 0
    lastFrame = now

    if (now - lastScrollT > 40 && !reduce) {
      applyWarp(0)
    }

    const accel =
      (STIFFNESS * (speedTarget - speed) - DAMPING * speedVel) / MASS
    speedVel += accel * dt
    speed += speedVel * dt

    const { w, h } = size
    if (w === 0 || h === 0) {
      if (live) raf = requestAnimationFrame(tick)
      return
    }

    const cx = w / 2
    const cy = h / 2
    // Reduced motion: no travel and no streaks, just still points.
    const warp = reduce ? 0 : speed
    const focal = Math.max(w, h) * 0.5
    const colors = paletteOf(options.colors, dark)
    const travel = warp * TRAVEL_PER_SEC * displacementOf(options.displacement)

    ctx.clearRect(0, 0, w, h)

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i]!
      star.z -= dir * travel * dt

      if (star.z <= 1) {
        star.z = DEPTH
        star.pz = DEPTH
        star.x = (Math.random() - 0.5) * DEPTH
        star.y = (Math.random() - 0.5) * DEPTH
        star.color = colors[Math.floor(Math.random() * colors.length)]!
      } else if (star.z >= DEPTH) {
        star.z = 1.5
        star.pz = 1.5
        star.x = (Math.random() - 0.5) * DEPTH
        star.y = (Math.random() - 0.5) * DEPTH
        star.color = colors[Math.floor(Math.random() * colors.length)]!
      } else {
        // FPS-independent tail so filled heads keep a visible streak.
        star.pz = Math.min(
          DEPTH,
          Math.max(1.01, star.z + dir * travel * TRAIL_DT)
        )
      }

      const k = focal / star.z
      const x = cx + star.x * k
      const y = cy + star.y * k

      const pk = focal / star.pz
      const px = cx + star.x * pk
      const py = cy + star.y * pk

      if (
        (x < -50 && px < -50) ||
        (x > w + 50 && px > w + 50) ||
        (y < -50 && py < -50) ||
        (y > h + 50 && py > h + 50)
      ) {
        continue
      }

      const near = 1 - star.z / DEPTH
      // Thin pale streaks vanish on white, so light pages get a higher
      // floor on both width and opacity.
      const lineW = Math.max(dark ? 0.8 : 1, near * (1.8 + warp * 0.12))
      const alpha = dark ? 0.35 + near * 0.65 : 0.55 + near * 0.45

      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(x, y)
      ctx.strokeStyle = star.color
      ctx.globalAlpha = alpha
      ctx.lineWidth = lineW
      ctx.lineCap = "round"
      ctx.stroke()

      if (near > 0.45) {
        ctx.beginPath()
        ctx.arc(x, y, lineW * 0.9, 0, Math.PI * 2)
        ctx.fillStyle = star.color
        ctx.fill()
      }
    }

    ctx.globalAlpha = 1
    if (live) raf = requestAnimationFrame(tick)
  }

  resize()
  const ro = new ResizeObserver(resize)
  if (canvas.parentElement) ro.observe(canvas.parentElement)
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true
    wake()
  })
  io.observe(canvas)
  const onVisibility = () => wake()
  document.addEventListener("visibilitychange", onVisibility)
  onReduce()
  mqReduce.addEventListener("change", onReduce)
  const syncTheme = () => {
    const next = resolveDark(options.theme)
    if (next === dark) return
    dark = next
    recolor()
    wake()
  }
  const unwatchTheme = watchTheme(syncTheme)

  wake()

  return {
    setOptions(next) {
      const prevCount = options.starCount ?? 420
      const prevColors = paletteOf(options.colors, dark).join(",")
      options = { ...options, ...next }
      dark = resolveDark(options.theme)
      const nextCount = options.starCount ?? 420
      const nextColors = paletteOf(options.colors, dark).join(",")
      if (nextCount !== prevCount) {
        stars = createStars(nextCount, paletteOf(options.colors, dark))
      } else if (nextColors !== prevColors) {
        recolor()
      }
      bindScroll()
      wake()
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      raf = 0
      ro.disconnect()
      io.disconnect()
      unbindScroll()
      document.removeEventListener("visibilitychange", onVisibility)
      mqReduce.removeEventListener("change", onReduce)
      unwatchTheme()
    },
  }
}
