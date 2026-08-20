export type Dithered404Theme = "light" | "dark" | "auto"

export type Dithered404Options = {
  /** Glyph ink (hex). Default follows theme. */
  color?: string
  /** Dither cell size in CSS px. Default `4` */
  pixelSize?: number
  /** Fireball radius in CSS px. Default `28` */
  brush?: number
  /** Follow pointer / replace cursor. Default `true` */
  interactive?: boolean
  /** Ordered Bayer print. Default `true`. Off is a soft realistic fire. */
  dither?: boolean
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class).
   */
  theme?: Dithered404Theme
  /** Fires when the fireball cursor should hide the system pointer. */
  onHideCursor?: (hide: boolean) => void
}

export type Dithered404Instance = {
  setOptions: (options: Partial<Dithered404Options>) => void
  destroy: () => void
}

/** Near-black ink on paper */
export const LIGHT_COLOR = "#18181B"
/** Near-white ink on slate */
export const DARK_COLOR = "#E4E4E7"

const FIRE_EMBER = "#A33A18"
const FIRE_FLAME = "#D4682A"
const FIRE_HIGHLIGHT = "#E8B45A"

const SOLID = 0
const EMBER = 1
const SMOKE = 2
const REFORMING = 3

const PHASE_READY = 0
const PHASE_REFORMING = 1

const RESET_DELAY_MS = 900
const REFORM_SNAP_MS = 1800
const COLLAPSE_RATIO = 0.12
const MAX_EMBERS = 900
const MAX_EMBERS_FINE = 260
const MAX_SMOKE = 420
const MAX_SMOKE_FINE = 160
const CHAR_HEAT_GAIN = 0.2
const CHAR_COOL = 0.01

const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
] as const

type Particle = {
  x: number
  y: number
  homeX: number
  homeY: number
  vx: number
  vy: number
  size: number
  state: 0 | 1 | 2 | 3
  life: number
  rot: number
  vr: number
  gx: number
  gy: number
  fill: string
  alpha: number
  sleep: number
  heat: number
}

type GlyphCell = {
  homeX: number
  homeY: number
  gx: number
  gy: number
  alpha: number
}

function bayerAt(gx: number, gy: number) {
  const x = ((gx % 8) + 8) % 8
  const y = ((gy % 8) + 8) % 8
  return BAYER8[y]![x]! / 64
}

function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return s - Math.floor(s)
}

function valueNoise(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const d = hash2(ix + 1, iy + 1)
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

function fbm(x: number, y: number) {
  let v = 0
  let a = 0.5
  let f = 1
  for (let i = 0; i < 3; i++) {
    v += valueNoise(x * f, y * f) * a
    a *= 0.5
    f *= 2.05
  }
  return v
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

export function resolveDark(theme: Dithered404Theme): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

function cellKey(gx: number, gy: number) {
  return gx * 4096 + gy
}

function fireTint(field: number) {
  if (field > 0.72) return FIRE_HIGHLIGHT
  if (field > 0.4) return FIRE_FLAME
  return FIRE_EMBER
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim()
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.padEnd(6, "0").slice(0, 6)
  const n = Number.parseInt(full, 16)
  if (Number.isNaN(n)) return [163, 58, 24]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgba(hex: string, a: number) {
  const [r, g, b] = hexRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

function scorchedInk(ink: string, heat: number): string {
  if (heat <= 0.02) return ink
  const [r, g, b] = hexRgb(ink)
  const h = heat > 1 ? 1 : heat
  const lum = (r + g + b) / 3
  let nr: number
  let ng: number
  let nb: number
  if (lum >= 130) {
    const k = 1 - h * 0.9
    nr = r * k
    ng = g * k * (1 - h * 0.12)
    nb = b * k * (1 - h * 0.22)
    if (h > 0.5) {
      const g2 = (h - 0.5) / 0.5
      nr = nr * (1 - g2 * 0.35) + 163 * g2 * 0.55
      ng = ng * (1 - g2 * 0.35) + 58 * g2 * 0.4
      nb = nb * (1 - g2 * 0.35) + 24 * g2 * 0.25
    }
  } else {
    nr = r * (1 - h * 0.22) + 52 * h
    ng = g * (1 - h * 0.38) + 18 * h
    nb = b * (1 - h * 0.52) + 8 * h
    if (h > 0.55) {
      const g2 = (h - 0.55) / 0.45
      nr = nr * (1 - g2 * 0.4) + 163 * g2 * 0.7
      ng = ng * (1 - g2 * 0.4) + 58 * g2 * 0.5
      nb = nb * (1 - g2 * 0.4) + 24 * g2 * 0.3
    }
  }
  return `rgb(${nr | 0},${ng | 0},${nb | 0})`
}

function rasterizeGlyph(
  cssW: number,
  cssH: number,
  pixelSize: number,
  dpr: number,
  dither: boolean
): GlyphCell[] {
  const w = Math.max(1, Math.floor(cssW * dpr))
  const h = Math.max(1, Math.floor(cssH * dpr))
  const cell = Math.max(1, Math.round(pixelSize * dpr))
  const off = document.createElement("canvas")
  off.width = w
  off.height = h
  const ctx = off.getContext("2d", { willReadFrequently: true })
  if (!ctx) return []

  const family = getComputedStyle(document.body).fontFamily || "ui-sans-serif"
  const fontSize = Math.min(cssW * 0.54, cssH * 0.5) * dpr
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = "#fff"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `800 ${fontSize}px ${family}`
  if ("letterSpacing" in ctx) {
    ;(
      ctx as CanvasRenderingContext2D & { letterSpacing: string }
    ).letterSpacing = `${-fontSize * 0.045}px`
  }
  ctx.fillText("404", w / 2, h / 2)

  const data = ctx.getImageData(0, 0, w, h).data
  const cells: GlyphCell[] = []

  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      let cover = 0
      let samples = 0
      const step = Math.max(1, Math.floor(cell / 3))
      for (let sy = 0; sy < cell; sy += step) {
        for (let sx = 0; sx < cell; sx += step) {
          const px = x + sx
          const py = y + sy
          if (px >= w || py >= h) continue
          cover += data[(py * w + px) * 4 + 3]!
          samples++
        }
      }
      const alpha = samples > 0 ? cover / (samples * 255) : 0
      if (alpha < (dither ? 0.18 : 0.08)) continue
      const gx = Math.floor(x / cell)
      const gy = Math.floor(y / cell)
      if (dither && alpha < bayerAt(gx, gy) * 0.92 + 0.08) continue
      cells.push({
        homeX: x / dpr,
        homeY: y / dpr,
        gx,
        gy,
        alpha: dither ? 1 : Math.min(1, alpha * 1.15),
      })
    }
  }

  return cells
}

function spawnFromCells(
  cells: GlyphCell[],
  pixelSize: number,
  ink: string,
  cssH: number,
  assemble: boolean
): Particle[] {
  return cells.map((cell) => {
    const fromBelow = assemble
    return {
      x: fromBelow ? cell.homeX + (Math.random() - 0.5) * 28 : cell.homeX,
      y: fromBelow ? cssH + 12 + Math.random() * 90 : cell.homeY,
      homeX: cell.homeX,
      homeY: cell.homeY,
      vx: 0,
      vy: fromBelow ? -2.2 - Math.random() * 1.4 : 0,
      size: pixelSize,
      state: fromBelow ? REFORMING : SOLID,
      life: 1,
      rot: 0,
      vr: 0,
      gx: cell.gx,
      gy: cell.gy,
      fill: ink,
      alpha: cell.alpha,
      sleep: 0,
      heat: 0,
    }
  })
}

function smokeFill(dark: boolean) {
  if (dark) {
    return Math.random() > 0.45 ? "#A1A1AA" : "#71717A"
  }
  return Math.random() > 0.45 ? "#52525B" : "#3F3F46"
}

function burnParticle(
  particles: Particle[],
  p: Particle,
  emberCount: { n: number },
  smokeCount: { n: number },
  pixelSize: number,
  maxEmbers: number,
  maxSmoke: number,
  dark: boolean
) {
  p.state = EMBER
  p.life = 0.28 + Math.random() * (pixelSize <= 2 ? 0.28 : 0.45)
  p.size = Math.max(1, p.size * 0.55)
  p.vx = (Math.random() - 0.5) * 2.8
  p.vy = -1.2 - Math.random() * 2.4
  p.fill = fireTint(0.35 + Math.random() * 0.65)
  p.alpha = 1
  p.heat = 0
  emberCount.n++

  const extra =
    pixelSize <= 2
      ? Math.random() < 0.22
        ? 1
        : 0
      : 1 + Math.floor(Math.random() * 3)
  for (let i = 0; i < extra && emberCount.n < maxEmbers; i++) {
    particles.push({
      x: p.x + (Math.random() - 0.5) * p.size,
      y: p.y + (Math.random() - 0.5) * p.size,
      homeX: p.homeX,
      homeY: p.homeY,
      vx: (Math.random() - 0.5) * 3.4,
      vy: -1.6 - Math.random() * 2.8,
      size: Math.max(1, p.size * (0.35 + Math.random() * 0.4)),
      state: EMBER,
      life: 0.22 + Math.random() * 0.4,
      rot: 0,
      vr: 0,
      gx: p.gx,
      gy: p.gy,
      fill: fireTint(0.25 + Math.random() * 0.75),
      alpha: 1,
      sleep: 0,
      heat: 0,
    })
    emberCount.n++
  }

  const puffs =
    pixelSize <= 2
      ? Math.random() < 0.55
        ? 1
        : 0
      : 1 + (Math.random() < 0.55 ? 1 : 0)
  for (let i = 0; i < puffs && smokeCount.n < maxSmoke; i++) {
    const puff = pixelSize * (1.6 + Math.random() * 1.8)
    particles.push({
      x: p.x + (Math.random() - 0.5) * p.size * 0.8,
      y: p.y + (Math.random() - 0.5) * p.size * 0.8,
      homeX: p.homeX,
      homeY: p.homeY,
      vx: (Math.random() - 0.5) * 0.55,
      vy: -0.45 - Math.random() * 0.85,
      size: puff,
      state: SMOKE,
      life: 0.75 + Math.random() * 0.95,
      rot: 0,
      vr: (Math.random() - 0.5) * 0.04,
      gx: p.gx,
      gy: p.gy,
      fill: smokeFill(dark),
      alpha: 0.42,
      sleep: 0,
      heat: 0,
    })
    smokeCount.n++
  }
}

function fireFieldAt(
  x: number,
  y: number,
  mx: number,
  my: number,
  r: number,
  t: number
) {
  const dx = (x - mx) / r
  const dy = (y - my) / r
  const px = dx
  const py = dy > 0 ? dy * 1.4 : dy * 0.72
  const dist = Math.hypot(px, py)
  if (dist > 1.12) return 0
  const n = fbm(x * 0.055 + t * 1.7, y * 0.06 - t * 2.6)
  return Math.max(0, (1 - dist) * (0.38 + 0.62 * n))
}

function drawFireball(
  ctx: CanvasRenderingContext2D,
  mx: number,
  my: number,
  t: number,
  pixelSize: number,
  brush: number,
  dither: boolean
) {
  const r = brush
  const minX = mx - r
  const maxX = mx + r
  const minY = my - r * 1.35
  const maxY = my + r * 0.85

  if (!dither) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    const glow = ctx.createRadialGradient(
      mx,
      my - r * 0.22,
      r * 0.04,
      mx,
      my - r * 0.08,
      r * 1.05
    )
    glow.addColorStop(0, rgba(FIRE_HIGHLIGHT, 0.95))
    glow.addColorStop(0.28, rgba(FIRE_FLAME, 0.72))
    glow.addColorStop(0.62, rgba(FIRE_EMBER, 0.32))
    glow.addColorStop(1, rgba(FIRE_EMBER, 0))
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.ellipse(mx, my - r * 0.18, r * 0.78, r * 1.12, 0, 0, Math.PI * 2)
    ctx.fill()

    const cell = 2
    for (let y = minY; y <= maxY; y += cell) {
      for (let x = minX; x <= maxX; x += cell) {
        const field = fireFieldAt(x + 1, y + 1, mx, my, r, t)
        if (field < 0.08) continue
        ctx.globalAlpha = Math.min(0.9, field * 1.05)
        ctx.fillStyle = fireTint(field)
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5)
      }
    }
    ctx.restore()
    return
  }

  const cell = Math.max(3, pixelSize)
  for (let y = minY; y <= maxY; y += cell) {
    for (let x = minX; x <= maxX; x += cell) {
      const cx = Math.floor(x / cell) * cell
      const cy = Math.floor(y / cell) * cell
      const field = fireFieldAt(cx + cell * 0.5, cy + cell * 0.5, mx, my, r, t)
      if (field < 0.1) continue
      if (
        field <
        bayerAt(Math.floor(cx / cell), Math.floor(cy / cell)) * 0.9 + 0.06
      ) {
        continue
      }
      ctx.fillStyle = fireTint(field)
      ctx.fillRect(cx, cy, cell, cell)
    }
  }
}

/**
 * Bayer-pixel 404 section — a fireball cursor scorches and burns
 * the glyph into embers and smoke, then the type reforms.
 * `dither={false}` is a soft realistic fire, same idea as Shader Fire.
 */
export function createDithered404(
  wrap: HTMLElement,
  canvas: HTMLCanvasElement,
  initial: Dithered404Options = {}
): Dithered404Instance | null {
  let options: Required<
    Pick<
      Dithered404Options,
      "pixelSize" | "brush" | "interactive" | "dither" | "theme"
    >
  > &
    Dithered404Options = {
    pixelSize: 4,
    brush: 28,
    interactive: true,
    dither: true,
    theme: "auto",
    ...initial,
  }

  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true })
  if (!ctx) return null

  let reduce = false
  let dark = resolveDark(options.theme ?? "auto")
  let hover = false
  const mouse = { x: 0, y: 0 }
  const targetMouse = { x: 0, y: 0 }

  let raf = 0
  let running = true
  let cssW = 0
  let cssH = 0
  let dpr = 1
  let cells: GlyphCell[] = []
  let particles: Particle[] = []
  let lastPixel = -1
  let lastDither: boolean | null = null
  let lastW = 0
  let lastH = 0
  let phase = PHASE_READY
  let resetAt = 0
  let reformAt = 0
  let lastNow = performance.now()
  const start = lastNow

  const inkOf = () => options.color ?? (dark ? DARK_COLOR : LIGHT_COLOR)

  const rebuild = (assemble: boolean) => {
    const px = Math.max(2, Math.round(options.pixelSize))
    const useDither = options.dither
    cells = rasterizeGlyph(cssW, cssH, px, dpr, useDither)
    particles = spawnFromCells(cells, px, inkOf(), cssH, assemble)
    phase = assemble ? PHASE_REFORMING : PHASE_READY
    resetAt = 0
    reformAt = assemble ? performance.now() : 0
    lastPixel = px
    lastDither = useDither
  }

  const startReform = (now: number, px: number, ink: string) => {
    const have = new Set<number>()
    for (const p of particles) {
      if (p.state === EMBER || p.state === SMOKE) continue
      p.state = REFORMING
      p.size = px
      p.fill = ink
      p.vx = 0
      p.vy = 0
      p.vr = 0
      p.sleep = 0
      p.life = 1
      p.heat = 0
      have.add(cellKey(p.gx, p.gy))
    }
    for (const cell of cells) {
      if (have.has(cellKey(cell.gx, cell.gy))) continue
      particles.push({
        x: cell.homeX + (Math.random() - 0.5) * 22,
        y: cssH - px - Math.random() * 52,
        homeX: cell.homeX,
        homeY: cell.homeY,
        vx: 0,
        vy: 0,
        size: px,
        state: REFORMING,
        life: 1,
        rot: 0,
        vr: 0,
        gx: cell.gx,
        gy: cell.gy,
        fill: ink,
        alpha: cell.alpha,
        sleep: 0,
        heat: 0,
      })
    }
    phase = PHASE_REFORMING
    resetAt = 0
    reformAt = now
  }

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = wrap.clientWidth
    const h = wrap.clientHeight
    if (w <= 0 || h <= 0) return
    cssW = w
    cssH = h
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(h * dpr))
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    if (w !== lastW || h !== lastH) {
      lastW = w
      lastH = h
      rebuild(false)
    }
  }

  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(wrap)

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const onReduce = () => {
    reduce = mqReduce.matches
  }
  onReduce()
  mqReduce.addEventListener("change", onReduce)

  const syncTheme = () => {
    dark = resolveDark(options.theme ?? "auto")
  }
  const mo = new MutationObserver(syncTheme)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  })
  const mqDark = window.matchMedia("(prefers-color-scheme: dark)")
  mqDark.addEventListener("change", syncTheme)

  const onMove = (e: PointerEvent) => {
    if (!options.interactive || reduce) return
    const rect = wrap.getBoundingClientRect()
    targetMouse.x = e.clientX - rect.left
    targetMouse.y = e.clientY - rect.top
    if (!hover) {
      hover = true
      options.onHideCursor?.(true)
    }
  }
  const onLeave = () => {
    hover = false
    options.onHideCursor?.(false)
  }

  wrap.addEventListener("pointermove", onMove, { passive: true })
  wrap.addEventListener("pointerenter", onMove, { passive: true })
  wrap.addEventListener("pointerleave", onLeave)

  const tick = (now: number) => {
    if (!running) return
    const dt = Math.min(32, now - lastNow) / 16.67
    lastNow = now
    const t = (now - start) / 1000
    const { pixelSize, brush, interactive, dither } = options
    const px = Math.max(2, Math.round(pixelSize))
    const ink = inkOf()

    if ((px !== lastPixel || dither !== lastDither) && cssW > 0) {
      rebuild(false)
    }

    mouse.x += (targetMouse.x - mouse.x) * 0.28
    mouse.y += (targetMouse.y - mouse.y) * 0.28

    if (!reduce) {
      if (resetAt && now >= resetAt) {
        startReform(now, px, ink)
      }

      let solidCount = 0
      let emberCount = 0
      let smokeCount = 0
      let reformingCount = 0
      const emberBudget = { n: 0 }
      const smokeBudget = { n: 0 }
      const maxEmbers = px <= 2 ? MAX_EMBERS_FINE : MAX_EMBERS
      const maxSmoke = px <= 2 ? MAX_SMOKE_FINE : MAX_SMOKE

      const canBurn = interactive && hover && phase === PHASE_READY

      const scorchR = brush * 0.92
      const scorchR2 = scorchR * scorchR
      const burnR = brush * 0.62
      const burnR2 = burnR * burnR

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!
        if (p.state === SOLID) {
          if (canBurn) {
            const dx = p.x + p.size * 0.5 - mouse.x
            const dy = p.y + p.size * 0.5 - mouse.y
            const d2 = dx * dx + dy * dy
            if (d2 < scorchR2) {
              const heat = 1 - Math.sqrt(d2) / scorchR
              p.heat = Math.min(1, p.heat + heat * CHAR_HEAT_GAIN * dt)
              if (
                p.heat > 0.58 &&
                d2 < burnR2 &&
                Math.random() < heat * 0.28 * dt
              ) {
                burnParticle(
                  particles,
                  p,
                  emberBudget,
                  smokeBudget,
                  px,
                  maxEmbers,
                  maxSmoke,
                  dark
                )
              }
            } else if (p.heat > 0) {
              p.heat = Math.max(0, p.heat - CHAR_COOL * dt)
            }
          } else if (p.heat > 0) {
            p.heat = Math.max(0, p.heat - CHAR_COOL * dt)
          }
          if (p.state === SOLID) {
            p.fill = p.heat > 0 ? scorchedInk(ink, p.heat) : ink
          }
        }

        if (p.state === EMBER) {
          p.vy -= 0.09 * dt
          p.vx *= 0.94
          p.vy *= 0.97
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.life -= (px <= 2 ? 0.04 : 0.028) * dt
          p.size = Math.max(0.6, p.size * (1 - 0.02 * dt))
          if (p.life <= 0) {
            const last = particles.pop()
            if (last && i < particles.length) particles[i] = last
            continue
          }
          emberCount++
          continue
        }

        if (p.state === SMOKE) {
          p.vy -= 0.018 * dt
          p.vx += Math.sin((now + p.x * 12) * 0.002) * 0.012 * dt
          p.vx *= 0.985
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.size += 0.12 * dt
          p.life -= (px <= 2 ? 0.018 : 0.012) * dt
          p.alpha = Math.max(0, p.life * 0.5)
          if (p.life <= 0 || p.y + p.size < -40) {
            const last = particles.pop()
            if (last && i < particles.length) particles[i] = last
            continue
          }
          smokeCount++
          continue
        }

        if (p.state === REFORMING) {
          p.x += (p.homeX - p.x) * 0.16 * dt
          p.y += (p.homeY - p.y) * 0.16 * dt
          p.rot += (0 - p.rot) * 0.22 * dt
          p.vx = 0
          p.vy = 0
          p.fill = ink
          p.heat = 0
          if (Math.hypot(p.homeX - p.x, p.homeY - p.y) < 0.7) {
            p.x = p.homeX
            p.y = p.homeY
            p.state = SOLID
            p.size = px
            p.rot = 0
            p.sleep = 0
            p.heat = 0
            solidCount++
          } else {
            reformingCount++
          }
          continue
        }

        if (p.state === SOLID) {
          solidCount++
        }
      }

      const initialCount = cells.length || 1
      if (
        phase === PHASE_READY &&
        cells.length > 0 &&
        solidCount / initialCount < COLLAPSE_RATIO &&
        resetAt === 0
      ) {
        resetAt = now + RESET_DELAY_MS
      }

      if (phase === PHASE_REFORMING) {
        if (reformingCount === 0) {
          phase = PHASE_READY
        } else if (reformAt && now - reformAt > REFORM_SNAP_MS) {
          for (const p of particles) {
            if (p.state !== REFORMING) continue
            p.x = p.homeX
            p.y = p.homeY
            p.state = SOLID
            p.size = px
            p.rot = 0
            p.sleep = 0
            p.heat = 0
            p.fill = ink
          }
          phase = PHASE_READY
        }
      }

      if (emberCount > maxEmbers) {
        let extra = emberCount - maxEmbers
        for (let i = particles.length - 1; i >= 0 && extra > 0; i--) {
          if (particles[i]!.state === EMBER) {
            const last = particles.pop()
            if (last && i < particles.length) particles[i] = last
            extra--
          }
        }
      }

      if (smokeCount > maxSmoke) {
        let extra = smokeCount - maxSmoke
        for (let i = particles.length - 1; i >= 0 && extra > 0; i--) {
          if (particles[i]!.state === SMOKE) {
            const last = particles.pop()
            if (last && i < particles.length) particles[i] = last
            extra--
          }
        }
      }
    }

    ctx.clearRect(0, 0, cssW, cssH)
    ctx.imageSmoothingEnabled = !dither

    for (const p of particles) {
      if (p.state === EMBER) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4))
        ctx.fillStyle = p.fill
        if (!dither) {
          const glow = Math.max(1.2, p.size * 0.55)
          ctx.beginPath()
          ctx.arc(p.x + p.size * 0.5, p.y + p.size * 0.5, glow, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(p.x, p.y, p.size, p.size)
        }
        continue
      }
      if (p.state === SMOKE) {
        ctx.globalAlpha = Math.max(0, Math.min(0.45, p.alpha))
        ctx.fillStyle = p.fill
        const half = p.size * 0.5
        if (!dither) {
          ctx.beginPath()
          ctx.arc(p.x + half, p.y + half, Math.max(1.2, half), 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(p.x, p.y, p.size, p.size)
        }
        continue
      }
      ctx.fillStyle = p.fill
      ctx.globalAlpha = dither ? 1 : p.alpha
      const pad = dither ? 0 : 0.35
      if (p.state === REFORMING && Math.abs(p.rot) > 0.04) {
        const half = p.size * 0.5
        ctx.save()
        ctx.translate(p.x + half, p.y + half)
        ctx.rotate(p.rot)
        ctx.fillRect(
          -half - pad,
          -half - pad,
          p.size + pad * 2,
          p.size + pad * 2
        )
        ctx.restore()
      } else {
        ctx.fillRect(p.x - pad, p.y - pad, p.size + pad * 2, p.size + pad * 2)
      }
    }

    ctx.globalAlpha = 1
    if (interactive && hover && !reduce) {
      drawFireball(ctx, mouse.x, mouse.y, t, px, brush, dither)
    }

    raf = requestAnimationFrame(tick)
  }

  raf = requestAnimationFrame(tick)

  return {
    setOptions(next) {
      options = { ...options, ...next }
      syncTheme()
    },
    destroy() {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo.disconnect()
      mqReduce.removeEventListener("change", onReduce)
      mqDark.removeEventListener("change", syncTheme)
      wrap.removeEventListener("pointermove", onMove)
      wrap.removeEventListener("pointerenter", onMove)
      wrap.removeEventListener("pointerleave", onLeave)
      options.onHideCursor?.(false)
    },
  }
}
