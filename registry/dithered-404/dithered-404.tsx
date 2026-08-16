"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export type Dithered404Props = {
  className?: string
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
  theme?: "light" | "dark" | "auto"
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
const FALLING = 2
const REFORMING = 3

const PHASE_READY = 0
const PHASE_REFORMING = 1
const PHASE_COLLAPSING = 2

const RESET_DELAY_MS = 1200
const REFORM_SNAP_MS = 1800
const COLLAPSE_RATIO = 0.12
const MAX_EMBERS = 900
/** CSS px of foundation; 2 rows at the default `pixelSize` of 4. */
const GROUND_CSS_PX = 8
const MIN_GROUND_ROWS = 2
const GROUND_HEIGHT_RATIO = 0.04

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

function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false
  const root = document.documentElement
  if (root.classList.contains("dark")) return true
  if (root.classList.contains("light")) return false
  const dataTheme = root.getAttribute("data-theme")
  if (dataTheme === "dark") return true
  if (dataTheme === "light") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function resolveDark(theme: "light" | "dark" | "auto"): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

function cellKey(gx: number, gy: number) {
  return gx * 4096 + gy
}

/**
 * Floor for leftover-chunk collapse. Fine Bayer grids (pixel size 2)
 * would otherwise treat a few anti-aliased dots — or one digit of "404" —
 * as the only ground, and the rest of the glyph falls on its own.
 */
function glyphGround(cells: GlyphCell[], pixelSize: number) {
  if (cells.length === 0) {
    return { floorGy: 0, groundRows: MIN_GROUND_ROWS }
  }

  let minGy = Infinity
  let maxGy = -Infinity
  const counts = new Map<number, number>()
  for (const c of cells) {
    if (c.gy < minGy) minGy = c.gy
    if (c.gy > maxGy) maxGy = c.gy
    counts.set(c.gy, (counts.get(c.gy) ?? 0) + 1)
  }

  const height = Math.max(1, maxGy - minGy)
  const groundRows = Math.max(
    MIN_GROUND_ROWS,
    Math.round(GROUND_CSS_PX / Math.max(1, pixelSize)),
    Math.ceil(height * GROUND_HEIGHT_RATIO)
  )

  // Skip 1–2-pixel fringe rows so they don't become the only floor.
  const minMass = 3
  let floorGy = maxGy
  for (let y = maxGy; y >= minGy; y--) {
    if ((counts.get(y) ?? 0) >= minMass) {
      floorGy = y
      break
    }
  }

  return { floorGy, groundRows }
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
    }
  })
}

function markUnsupported(
  particles: Particle[],
  floorGy: number,
  groundRows: number
) {
  const occ = new Map<number, Particle>()
  for (const p of particles) {
    if (p.state !== SOLID) continue
    occ.set(cellKey(p.gx, p.gy), p)
  }
  if (occ.size === 0) return

  const grounded = floorGy - (Math.max(1, groundRows) - 1)
  const seen = new Set<number>()
  const queue: Particle[] = []

  for (const p of occ.values()) {
    if (p.gy >= grounded) {
      const k = cellKey(p.gx, p.gy)
      seen.add(k)
      queue.push(p)
    }
  }

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const

  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!
    for (const [dx, dy] of dirs) {
      const n = occ.get(cellKey(p.gx + dx, p.gy + dy))
      if (!n) continue
      const k = cellKey(n.gx, n.gy)
      if (seen.has(k)) continue
      seen.add(k)
      queue.push(n)
    }
  }

  const islands: Particle[][] = []
  for (const p of occ.values()) {
    if (seen.has(cellKey(p.gx, p.gy))) continue
    const bunch: Particle[] = []
    const q = [p]
    const local = new Set<number>([cellKey(p.gx, p.gy)])
    while (q.length) {
      const cur = q.pop()!
      bunch.push(cur)
      for (const [dx, dy] of dirs) {
        const n = occ.get(cellKey(cur.gx + dx, cur.gy + dy))
        if (!n || seen.has(cellKey(n.gx, n.gy))) continue
        const nk = cellKey(n.gx, n.gy)
        if (local.has(nk)) continue
        local.add(nk)
        q.push(n)
      }
    }
    for (const member of bunch) {
      seen.add(cellKey(member.gx, member.gy))
    }
    islands.push(bunch)
  }

  for (const bunch of islands) {
    const drift = (Math.random() - 0.5) * 1.6
    for (const p of bunch) {
      p.state = FALLING
      p.vx = drift + (Math.random() - 0.5) * 0.35
      p.vy = 0.15 + Math.random() * 0.45
      p.vr = (Math.random() - 0.5) * 0.12
    }
  }
}

function burnParticle(
  particles: Particle[],
  p: Particle,
  emberCount: { n: number }
) {
  p.state = EMBER
  p.life = 0.35 + Math.random() * 0.45
  p.size = Math.max(1, p.size * 0.55)
  p.vx = (Math.random() - 0.5) * 2.8
  p.vy = -1.2 - Math.random() * 2.4
  p.fill = fireTint(0.35 + Math.random() * 0.65)
  p.alpha = 1
  emberCount.n++

  const extra = 1 + Math.floor(Math.random() * 3)
  for (let i = 0; i < extra && emberCount.n < MAX_EMBERS; i++) {
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
    })
    emberCount.n++
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

  const cell = pixelSize
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
 * Bayer-pixel 404 section — a fireball cursor burns the glyph
 * into embers until leftover chunks fall, then the type reforms.
 * `dither={false}` is a soft realistic fire, same idea as Shader Fire.
 */
export function Dithered404({
  className,
  color,
  pixelSize = 4,
  brush = 28,
  interactive = true,
  dither = true,
  theme = "auto",
}: Dithered404Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduceRef = useRef(false)
  const darkRef = useRef(false)
  const hoverRef = useRef(false)
  const mouseRef = useRef({ x: 0, y: 0 })
  const targetMouseRef = useRef({ x: 0, y: 0 })
  const [hideCursor, setHideCursor] = useState(false)
  const propsRef = useRef({
    color,
    pixelSize,
    brush,
    interactive,
    dither,
    theme,
  })

  useLayoutEffect(() => {
    propsRef.current = { color, pixelSize, brush, interactive, dither, theme }
  }, [color, pixelSize, brush, interactive, dither, theme])

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    reduceRef.current = mq.matches
    const onChange = () => {
      reduceRef.current = mq.matches
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    const sync = () => {
      darkRef.current = resolveDark(propsRef.current.theme)
    }
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    })
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    mq.addEventListener("change", sync)
    return () => {
      mo.disconnect()
      mq.removeEventListener("change", sync)
    }
  }, [theme])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true })
    if (!ctx) return

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
    let supportTick = 0
    let floorGy = 0
    let groundRows = MIN_GROUND_ROWS
    let phase = PHASE_READY
    let resetAt = 0
    let reformAt = 0
    let lastNow = performance.now()
    const start = lastNow

    const inkOf = () =>
      propsRef.current.color ?? (darkRef.current ? DARK_COLOR : LIGHT_COLOR)

    const rebuild = (assemble: boolean) => {
      const px = Math.max(2, Math.round(propsRef.current.pixelSize))
      const useDither = propsRef.current.dither
      cells = rasterizeGlyph(cssW, cssH, px, dpr, useDither)
      const ground = glyphGround(cells, px)
      floorGy = ground.floorGy
      groundRows = ground.groundRows
      particles = spawnFromCells(cells, px, inkOf(), cssH, assemble)
      phase = assemble ? PHASE_REFORMING : PHASE_READY
      resetAt = 0
      reformAt = assemble ? performance.now() : 0
      lastPixel = px
      lastDither = useDither
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

    const onMove = (e: PointerEvent) => {
      if (!propsRef.current.interactive || reduceRef.current) return
      const rect = wrap.getBoundingClientRect()
      targetMouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
      if (!hoverRef.current) {
        hoverRef.current = true
        setHideCursor(true)
      }
    }
    const onLeave = () => {
      hoverRef.current = false
      setHideCursor(false)
    }

    wrap.addEventListener("pointermove", onMove, { passive: true })
    wrap.addEventListener("pointerenter", onMove, { passive: true })
    wrap.addEventListener("pointerleave", onLeave)

    const tick = (now: number) => {
      if (!running) return
      const dt = Math.min(32, now - lastNow) / 16.67
      lastNow = now
      const t = (now - start) / 1000
      const { pixelSize, brush, interactive, dither } = propsRef.current
      const px = Math.max(2, Math.round(pixelSize))
      const ink = inkOf()

      if ((px !== lastPixel || dither !== lastDither) && cssW > 0) {
        rebuild(false)
      }

      const reduce = reduceRef.current
      const m = mouseRef.current
      const tm = targetMouseRef.current
      m.x += (tm.x - m.x) * 0.28
      m.y += (tm.y - m.y) * 0.28

      if (!reduce) {
        if (resetAt && now >= resetAt) {
          rebuild(true)
        }

        let solidCount = 0
        let emberCount = 0
        let reformingCount = 0

        const canBurn = interactive && hoverRef.current && phase === PHASE_READY

        const burnR = brush * 0.72
        const burnR2 = burnR * burnR

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]!
          if (p.state === SOLID) {
            p.fill = ink
            if (canBurn) {
              const dx = p.x + p.size * 0.5 - m.x
              const dy = p.y + p.size * 0.5 - m.y
              const d2 = dx * dx + dy * dy
              if (d2 < burnR2) {
                const heat = 1 - Math.sqrt(d2) / burnR
                if (Math.random() < heat * 0.42 * dt) {
                  burnParticle(particles, p, { n: emberCount })
                }
              }
            }
          }

          if (p.state === EMBER) {
            p.vy -= 0.09 * dt
            p.vx *= 0.94
            p.vy *= 0.97
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.life -= 0.028 * dt
            p.size = Math.max(0.6, p.size * (1 - 0.02 * dt))
            if (p.life <= 0) {
              particles.splice(i, 1)
              continue
            }
            emberCount++
            continue
          }

          if (p.state === FALLING) {
            p.vy += 0.42 * dt
            p.vx *= 0.994
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.rot += p.vr * dt
            if (p.y > cssH + 48) {
              particles.splice(i, 1)
              continue
            }
            continue
          }

          if (p.state === REFORMING) {
            p.x += (p.homeX - p.x) * 0.18 * dt
            p.y += (p.homeY - p.y) * 0.18 * dt
            p.vx = 0
            p.vy = 0
            p.fill = ink
            if (Math.hypot(p.homeX - p.x, p.homeY - p.y) < 0.7) {
              p.x = p.homeX
              p.y = p.homeY
              p.state = SOLID
              p.size = px
              p.rot = 0
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

        supportTick++
        if (supportTick % 2 === 0 && phase === PHASE_READY) {
          markUnsupported(particles, floorGy, groundRows)
        }

        const initial = cells.length || 1
        if (
          phase === PHASE_READY &&
          solidCount / initial < COLLAPSE_RATIO &&
          solidCount > 0
        ) {
          phase = PHASE_COLLAPSING
          const drift = (Math.random() - 0.5) * 1.1
          for (const p of particles) {
            if (p.state !== SOLID) continue
            p.state = FALLING
            p.vx = drift + (Math.random() - 0.5) * 0.8
            p.vy = 0.2 + Math.random() * 0.6
            p.vr = (Math.random() - 0.5) * 0.16
          }
        }

        if (
          phase === PHASE_COLLAPSING &&
          resetAt === 0 &&
          !particles.some((p) => p.state === SOLID || p.state === FALLING)
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
            }
            phase = PHASE_READY
          }
        }

        if (emberCount > MAX_EMBERS) {
          let extra = emberCount - MAX_EMBERS
          for (let i = particles.length - 1; i >= 0 && extra > 0; i--) {
            if (particles[i]!.state === EMBER) {
              particles.splice(i, 1)
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
            ctx.arc(
              p.x + p.size * 0.5,
              p.y + p.size * 0.5,
              glow,
              0,
              Math.PI * 2
            )
            ctx.fill()
          } else {
            ctx.fillRect(p.x, p.y, p.size, p.size)
          }
          continue
        }
        ctx.fillStyle = ink
        ctx.globalAlpha = dither ? 1 : p.alpha
        const pad = dither ? 0 : 0.35
        if (p.state === FALLING && p.rot !== 0) {
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
      if (interactive && hoverRef.current && !reduce) {
        drawFireball(ctx, m.x, m.y, t, px, brush, dither)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      wrap.removeEventListener("pointermove", onMove)
      wrap.removeEventListener("pointerenter", onMove)
      wrap.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      data-slot="dithered-404"
      className={cn(
        "absolute inset-0 touch-none overflow-hidden",
        hideCursor && interactive && "cursor-none",
        className
      )}
    >
      <span className="sr-only">404</span>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
