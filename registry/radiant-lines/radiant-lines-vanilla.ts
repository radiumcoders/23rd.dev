export type RadiantLinesOptions = {
  /** Star / streak colors */
  colors?: string[]
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

export const DEFAULT_COLORS = [
  "#FF6B4A",
  "#2DD4BF",
  "#FBBF24",
  "#60A5FA",
  "#F472B6",
  "#A3E635",
  "#94A3B8",
]

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

function paletteOf(colors?: string[]) {
  return colors && colors.length > 0 ? colors : DEFAULT_COLORS
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
 * Hyperspace starfield — colored streaks radiate from the center.
 * Transparent canvas over `bg-background` (shadcn theme). Warp speed follows
 * scroll velocity (down → inward, up → outward). `displacement` scales how
 * far each star travels (and how long the filled heads' streaks get).
 */
export function createRadiantLines(
  canvas: HTMLCanvasElement,
  initial: RadiantLinesOptions = {}
): RadiantLinesInstance | null {
  let options: RadiantLinesOptions = {
    starCount: 420,
    colors: DEFAULT_COLORS,
    displacement: 1,
    container: null,
    ...initial,
  }

  const ctx = canvas.getContext("2d", { alpha: true })
  if (!ctx) return null

  let stars = createStars(options.starCount ?? 420, paletteOf(options.colors))
  const size = { w: 0, h: 0 }
  let speed = 0.28
  let speedVel = 0
  let speedTarget = 0.28
  let dir = -1
  let reduce = false
  let raf = 0
  let running = true
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
  }

  resize()
  const ro = new ResizeObserver(resize)
  if (canvas.parentElement) ro.observe(canvas.parentElement)

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const onReduce = () => {
    reduce = mqReduce.matches
    if (reduce) {
      speedTarget = 0.06
      dir = -1
    }
  }
  onReduce()
  mqReduce.addEventListener("change", onReduce)

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

  const tick = (now: number) => {
    if (!running) return

    const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000))
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
      raf = requestAnimationFrame(tick)
      return
    }

    const cx = w / 2
    const cy = h / 2
    const warp = reduce ? 0.05 : speed
    const focal = Math.max(w, h) * 0.5
    const colors = paletteOf(options.colors)
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
      const lineW = Math.max(0.8, near * (1.8 + warp * 0.12))
      const alpha = 0.35 + near * 0.65

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
    raf = requestAnimationFrame(tick)
  }

  raf = requestAnimationFrame(tick)

  return {
    setOptions(next) {
      const prevCount = options.starCount ?? 420
      const prevColors = paletteOf(options.colors).join(",")
      options = { ...options, ...next }
      const nextCount = options.starCount ?? 420
      const nextColors = paletteOf(options.colors).join(",")
      if (nextCount !== prevCount || nextColors !== prevColors) {
        stars = createStars(nextCount, paletteOf(options.colors))
      }
      bindScroll()
    },
    destroy() {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      unbindScroll()
      mqReduce.removeEventListener("change", onReduce)
    },
  }
}
