export type PhosphorScoreTheme = "light" | "dark" | "auto"

export type PhosphorScoreOptions = {
  /**
   * Ink / phosphor color. Omit to follow `theme`
   * (`LIGHT_COLOR` / `DARK_COLOR`).
   */
  color?: string
  /**
   * Bloom amount, 0–100. Default `50`. Scales the playhead halo
   * and exit flare — kept small so it sits on the note, not a disc.
   */
  glow?: number
  /**
   * Tilt the score plane back, in degrees. Default `16`.
   */
  rotateX?: number
  /**
   * Yaw the score plane, in degrees. Default `-12`.
   */
  rotateY?: number
  /**
   * Roll the score plane, in degrees. Default `0`.
   */
  rotateZ?: number
  /** Scroll speed in beats per second. Default `1.35`. */
  speed?: number
  /** How packed the notation is. Default `1`. */
  density?: number
  /** Slow camera drift. Default `true`. */
  sway?: boolean
  /** Deterministic score. Default `23`. */
  seed?: number
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class).
   */
  theme?: PhosphorScoreTheme
  /** Fires whenever resolved dark mode changes. */
  onThemeChange?: (dark: boolean) => void
}

export type PhosphorScoreInstance = {
  setOptions: (options: Partial<PhosphorScoreOptions>) => void
  destroy: () => void
}

/** Phosphor on black */
export const DARK_COLOR = "#4DFF6A"
/** Forest ink on paper */
export const LIGHT_COLOR = "#147A3A"
/** @deprecated Use `DARK_COLOR` or omit `color` and set `theme`. */
export const DEFAULT_COLOR = DARK_COLOR
export const DARK_BG = "#050505"
export const LIGHT_BG = "#F4F1E8"
export const DEFAULT_GLOW = 50
export const DEFAULT_ROTATE_X = 16
export const DEFAULT_ROTATE_Y = -12
export const DEFAULT_ROTATE_Z = 0
export const DEFAULT_SPEED = 1.35
export const DEFAULT_DENSITY = 1
export const DEFAULT_SEED = 23

const LOOP_BEATS = 48
const DYNAMICS = ["pp", "p", "mp", "mf", "f", "ff"] as const

type Note = {
  t: number
  pitch: number
  dur: number
  staff: 0 | 1
  beam: number
  acc: -1 | 0 | 1
}

type Mark = {
  t: number
  staff: 0 | 1
  text: string
  pitch: number
}

type Hairpin = {
  t: number
  dur: number
  staff: 0 | 1
  open: boolean
}

type Slur = {
  t0: number
  t1: number
  p0: number
  p1: number
  staff: 0 | 1
}

type Link = {
  t: number
  p0: number
  p1: number
}

type Dust = {
  x: number
  y: number
  z: number
  s: number
  a: number
}

type Flare = {
  x: number
  y: number
  age: number
  life: number
  size: number
}

type Rgb = [number, number, number]

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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function wrapDelta(t: number, now: number, loop: number) {
  let d = t - now
  d = ((((d + loop / 2) % loop) + loop) % loop) - loop / 2
  return d
}

function parseColor(input?: string): Rgb {
  const raw = (input ?? DEFAULT_COLOR).trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return [
      parseInt(raw.slice(1, 3), 16),
      parseInt(raw.slice(3, 5), 16),
      parseInt(raw.slice(5, 7), 16),
    ]
  }
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    return [
      parseInt(raw[1]! + raw[1], 16),
      parseInt(raw[2]! + raw[2], 16),
      parseInt(raw[3]! + raw[3], 16),
    ]
  }
  return [77, 255, 106]
}

function rgba(rgb: Rgb, a: number) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamp(a, 0, 1)})`
}

function glowOf(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_GLOW
  return clamp(value, 0, 100)
}

function rotateOf(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return clamp(value, -80, 80)
}

function speedOf(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_SPEED
  return clamp(value, 0.15, 4)
}

function densityOf(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DENSITY
  }
  return clamp(value, 0.35, 1.85)
}

function seedOf(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_SEED
  return Math.round(value) >>> 0
}

function themeOf(value?: PhosphorScoreTheme): PhosphorScoreTheme {
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

export function resolveDark(theme: PhosphorScoreTheme): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

export function resolveColor(color: string | undefined, dark: boolean) {
  const custom = optionalColor(color)
  if (custom) return custom
  return dark ? DARK_COLOR : LIGHT_COLOR
}

export function resolveBg(dark: boolean) {
  return dark ? DARK_BG : LIGHT_BG
}

type Score = {
  notes: Note[]
  marks: Mark[]
  hairpins: Hairpin[]
  slurs: Slur[]
  links: Link[]
}

function generateScore(seed: number, density: number): Score {
  const rng = mulberry32(seed)
  const notes: Note[] = []
  const marks: Mark[] = []
  const hairpins: Hairpin[] = []
  const slurs: Slur[] = []
  const links: Link[] = []
  let group = 1
  const dens = densityOf(density)

  const pick = <T>(list: readonly T[]) => list[Math.floor(rng() * list.length)]!

  const pushNote = (
    t: number,
    pitch: number,
    dur: number,
    staff: 0 | 1,
    beam: number
  ) => {
    notes.push({
      t,
      pitch: clamp(pitch, -3, 11),
      dur,
      staff,
      beam,
      acc: rng() < 0.08 ? (rng() < 0.5 ? -1 : 1) : 0,
    })
  }

  const addRun = (
    staff: 0 | 1,
    start: number,
    pitch: number,
    count: number,
    step: number,
    dir: number
  ) => {
    const beam = group++
    let p = pitch
    for (let i = 0; i < count; i++) {
      if (rng() > 0.12 / dens) pushNote(start + i * step, p, step, staff, beam)
      const hop = rng() < 0.18 ? 2 : 1
      p += dir * hop
      if (p > 10 || p < -2) dir *= -1
    }
    if (count >= 4 && rng() < 0.45) {
      slurs.push({
        t0: start,
        t1: start + (count - 1) * step,
        p0: pitch,
        p1: p,
        staff,
      })
    }
  }

  const addArp = (staff: 0 | 1, start: number, root: number, step: number) => {
    const pattern = [0, 2, 4, 7, 4, 2, 0, -1]
    const beam = group++
    for (let i = 0; i < pattern.length; i++) {
      pushNote(start + i * step, root + pattern[i]!, step, staff, beam)
    }
  }

  const addChord = (staff: 0 | 1, t: number, root: number) => {
    const beam = -group++
    pushNote(t, root, 1, staff, beam)
    pushNote(t, root + 2, 1, staff, beam)
    if (rng() < 0.7) pushNote(t, root + 4, 1, staff, beam)
  }

  let t = 0
  while (t < LOOP_BEATS - 1) {
    const kind = rng()
    const leftBusy = rng() < 0.55 + dens * 0.15
    const runLen = rng() < 0.4 ? 8 : rng() < 0.55 ? 6 : 4
    const step = rng() < 0.28 * dens ? 0.125 : 0.25
    const startPitch = Math.floor(rng() * 7) + (leftBusy ? 1 : 0)

    if (kind < 0.5) {
      addRun(
        leftBusy ? 0 : 1,
        t,
        startPitch,
        runLen,
        step,
        rng() < 0.5 ? 1 : -1
      )
      if (rng() < 0.55 * dens) {
        addChord(leftBusy ? 1 : 0, t, 2 + Math.floor(rng() * 4))
      }
      t += runLen * step
    } else if (kind < 0.72) {
      addArp(0, t, 1 + Math.floor(rng() * 5), 0.25)
      if (rng() < 0.7 * dens) {
        addRun(1, t, 0 + Math.floor(rng() * 4), 4, 0.5, rng() < 0.5 ? 1 : -1)
      }
      t += 2
    } else if (kind < 0.86) {
      addChord(0, t, 3 + Math.floor(rng() * 4))
      addChord(1, t, Math.floor(rng() * 4))
      if (rng() < 0.5) {
        links.push({
          t,
          p0: 4,
          p1: 4,
        })
      }
      t += rng() < 0.5 ? 1 : 2
    } else {
      t += rng() < 0.5 ? 0.5 : 1
    }

    if (rng() < 0.18) {
      marks.push({
        t,
        staff: rng() < 0.5 ? 0 : 1,
        text: pick(DYNAMICS),
        pitch: rng() < 0.5 ? -3.6 : 11.4,
      })
    }
    if (rng() < 0.12) {
      hairpins.push({
        t,
        dur: 2 + Math.floor(rng() * 3),
        staff: rng() < 0.5 ? 0 : 1,
        open: rng() < 0.5,
      })
    }
  }

  return { notes, marks, hairpins, slurs, links }
}

function makeDust(seed: number): Dust[] {
  const rng = mulberry32(seed ^ 0x9e3779b9)
  const dust: Dust[] = []
  for (let i = 0; i < 90; i++) {
    dust.push({
      x: (rng() - 0.5) * 2,
      y: (rng() - 0.5) * 2,
      z: rng(),
      s: 0.4 + rng() * 1.4,
      a: 0.08 + rng() * 0.22,
    })
  }
  return dust
}

/**
 * Vertical phosphor sheet music — notation falls toward a playhead,
 * blooms, then exits in a flare. Canvas 2D, CRT-green by default.
 */
export function createPhosphorScore(
  canvas: HTMLCanvasElement,
  initial: PhosphorScoreOptions = {}
): PhosphorScoreInstance | null {
  let options: PhosphorScoreOptions = {
    glow: DEFAULT_GLOW,
    rotateX: DEFAULT_ROTATE_X,
    rotateY: DEFAULT_ROTATE_Y,
    rotateZ: DEFAULT_ROTATE_Z,
    speed: DEFAULT_SPEED,
    density: DEFAULT_DENSITY,
    seed: DEFAULT_SEED,
    ...initial,
    sway: initial.sway ?? true,
    theme: themeOf(initial.theme),
  }

  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) return null

  const size = { w: 0, h: 0 }
  let score = generateScore(seedOf(options.seed), densityOf(options.density))
  let dust = makeDust(seedOf(options.seed))
  let dark = resolveDark(themeOf(options.theme))
  let rgb = parseColor(resolveColor(options.color, dark))
  options.onThemeChange?.(dark)
  const flares: Flare[] = []
  const hit = new Set<number>()
  let reduce = false
  let raf = 0
  let running = true
  let lastFrame = performance.now()
  let elapsed = 8
  let clock = 0

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
  }
  onReduce()
  mqReduce.addEventListener("change", onReduce)

  const syncTheme = () => {
    const next = resolveDark(themeOf(options.theme))
    if (next === dark) return
    dark = next
    rgb = parseColor(resolveColor(options.color, dark))
    options.onThemeChange?.(dark)
  }
  const mo = new MutationObserver(syncTheme)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  })
  const mqDark = window.matchMedia("(prefers-color-scheme: dark)")
  mqDark.addEventListener("change", syncTheme)

  const rebuild = () => {
    score = generateScore(seedOf(options.seed), densityOf(options.density))
    dust = makeDust(seedOf(options.seed))
    rgb = parseColor(resolveColor(options.color, dark))
    hit.clear()
    flares.length = 0
  }

  type Pt = { x: number; y: number; s: number; z: number }

  const cam = { x: 0, y: 0, z: 0 }

  const project = (x: number, y: number): Pt => {
    const cosX = Math.cos(cam.x)
    const sinX = Math.sin(cam.x)
    const cosY = Math.cos(cam.y)
    const sinY = Math.sin(cam.y)
    const cosZ = Math.cos(cam.z)
    const sinZ = Math.sin(cam.z)
    const xz = x * cosZ - y * sinZ
    const yz = x * sinZ + y * cosZ
    const y1 = yz * cosX
    const z1 = yz * sinX
    const x2 = xz * cosY - z1 * sinY
    const z2 = xz * sinY + z1 * cosY
    const fov = Math.max(size.h, 420) * 2.4
    const persp = fov / (fov + z2)
    const tilt = Math.abs(cam.x) + Math.abs(cam.y) + Math.abs(cam.z)
    const fit = 0.78 / (1 + tilt * 0.35)
    return {
      x: size.w * 0.5 + x2 * persp * fit,
      y: size.h * 0.5 + y1 * persp * fit,
      s: persp * fit,
      z: z2,
    }
  }

  const staffCenter = (staff: 0 | 1, gap: number) => (staff === 0 ? -gap : gap)

  const pitchX = (staff: 0 | 1, pitch: number, gap: number, sp: number) =>
    staffCenter(staff, gap) + (pitch - 4) * (sp * 0.5)

  const timeY = (delta: number, ppb: number, playY: number) =>
    playY - delta * ppb

  const nearPlay = (delta: number) => {
    if (delta > 0.55) return 0
    if (delta > 0) return 1 - delta / 0.55
    if (delta > -0.28) return 1
    if (delta > -1.35) return 1 - (-delta - 0.28) / 1.07
    return 0
  }

  const drawOval = (pt: Pt, r: number, fill: string) => {
    ctx.save()
    ctx.translate(pt.x, pt.y)
    ctx.rotate(-0.38)
    ctx.scale(1, 0.7)
    ctx.beginPath()
    ctx.arc(0, 0, r * pt.s, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.restore()
  }

  const glowBlob = (pt: Pt, radius: number, alpha: number) => {
    const r = Math.max(1.2, radius * pt.s)
    const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r)
    g.addColorStop(0, rgba(rgb, alpha))
    g.addColorStop(0.28, rgba(rgb, alpha * 0.42))
    g.addColorStop(0.62, rgba(rgb, alpha * 0.1))
    g.addColorStop(1, rgba(rgb, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const frame = (now: number) => {
    if (!running) return
    const dt = Math.min(0.05, (now - lastFrame) / 1000)
    lastFrame = now
    clock += dt
    if (!reduce) elapsed += dt * speedOf(options.speed)
    const beat = elapsed % LOOP_BEATS

    const w = size.w
    const h = size.h
    const sp = clamp(Math.min(w, h) * 0.014, 7, 13)
    const gap = clamp(w * 0.16, 52, 96)
    const ppb = clamp(h * 0.075, 28, 64)
    const playY = h * 0.12
    const swayOn = options.sway !== false && !reduce
    cam.x =
      (rotateOf(options.rotateX, DEFAULT_ROTATE_X) * Math.PI) / 180 +
      (swayOn ? Math.sin(clock * 0.33) * 0.11 : 0)
    cam.y =
      (rotateOf(options.rotateY, DEFAULT_ROTATE_Y) * Math.PI) / 180 +
      (swayOn ? Math.cos(clock * 0.21) * 0.16 : 0)
    cam.z =
      (rotateOf(options.rotateZ, DEFAULT_ROTATE_Z) * Math.PI) / 180 +
      (swayOn ? Math.sin(clock * 0.17) * 0.08 : 0)
    const bloom = glowOf(options.glow) / 50
    const color = parseColor(resolveColor(options.color, dark))
    rgb = color

    ctx.imageSmoothingEnabled = true
    ctx.globalCompositeOperation = "source-over"
    ctx.fillStyle = resolveBg(dark)
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.globalAlpha = 1
    for (const d of dust) {
      const px = ((d.x + 1) * 0.5 + clock * 0.01 * d.z) % 1
      const py = ((d.y + 1) * 0.5 + elapsed * 0.004 * (0.3 + d.z)) % 1
      ctx.fillStyle = rgba(color, dark ? d.a : d.a * 0.28)
      ctx.fillRect(px * w, py * h, d.s, d.s)
    }
    ctx.restore()

    const visMin = -8
    const visMax = h / ppb + 8

    const inView = (t: number) => {
      const d = wrapDelta(t, beat, LOOP_BEATS)
      return d < visMax && d > visMin
    }

    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    for (const staff of [0, 1] as const) {
      for (let line = 0; line < 5; line++) {
        const pitch = line * 2
        const x = pitchX(staff, pitch, gap, sp)
        ctx.beginPath()
        let started = false
        const steps = 56
        for (let i = 0; i <= steps; i++) {
          const d = lerp(visMax, visMin, i / steps)
          const hitAmt = nearPlay(d)
          const pt = project(x, timeY(d, ppb, playY))
          if (!started) {
            ctx.moveTo(pt.x, pt.y)
            started = true
          } else ctx.lineTo(pt.x, pt.y)
          if (i === Math.floor(steps * 0.62)) {
            ctx.strokeStyle = rgba(color, 0.16 + hitAmt * 0.28 * bloom)
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(pt.x, pt.y)
          }
        }
        ctx.strokeStyle = rgba(color, 0.22)
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    for (let bar = 0; bar < LOOP_BEATS; bar += 4) {
      if (!inView(bar)) continue
      const d = wrapDelta(bar, beat, LOOP_BEATS)
      const y = timeY(d, ppb, playY)
      for (const staff of [0, 1] as const) {
        const a = project(pitchX(staff, 0, gap, sp), y)
        const b = project(pitchX(staff, 8, gap, sp), y)
        ctx.strokeStyle = rgba(color, 0.14 + nearPlay(d) * 0.2)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }

    ctx.font = `italic ${Math.round(clamp(sp * 1.15, 9, 14))}px Georgia, "Times New Roman", serif`
    ctx.textBaseline = "middle"
    for (const mark of score.marks) {
      if (!inView(mark.t)) continue
      const d = wrapDelta(mark.t, beat, LOOP_BEATS)
      const pt = project(
        pitchX(mark.staff, mark.pitch, gap, sp),
        timeY(d, ppb, playY)
      )
      ctx.fillStyle = rgba(color, 0.28 + nearPlay(d) * 0.45)
      ctx.fillText(mark.text, pt.x, pt.y)
    }

    for (const pin of score.hairpins) {
      const t1 = pin.t + pin.dur
      if (!inView(pin.t) && !inView(t1)) continue
      const d0 = wrapDelta(pin.t, beat, LOOP_BEATS)
      const d1 = wrapDelta(t1, beat, LOOP_BEATS)
      const staff = pin.staff
      const outer = staff === 0 ? -4.6 : 12.6
      const inner = staff === 0 ? -3.4 : 11.4
      const y0 = timeY(d0, ppb, playY)
      const y1 = timeY(d1, ppb, playY)
      const xOuter0 = pitchX(staff, pin.open ? outer : inner, gap, sp)
      const xOuter1 = pitchX(staff, pin.open ? inner : outer, gap, sp)
      const xMid = pitchX(staff, (outer + inner) / 2, gap, sp)
      const a = project(xOuter0, y0)
      const b = project(xOuter1, y1)
      const c = project(xMid, y0)
      const e = project(xMid, y1)
      ctx.strokeStyle = rgba(color, 0.22)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.moveTo(c.x, c.y)
      ctx.lineTo(e.x, e.y)
      ctx.stroke()
    }

    for (const slur of score.slurs) {
      if (!inView(slur.t0) && !inView(slur.t1)) continue
      const d0 = wrapDelta(slur.t0, beat, LOOP_BEATS)
      const d1 = wrapDelta(slur.t1, beat, LOOP_BEATS)
      const side = slur.staff === 0 ? -1.8 : 1.8
      const a = project(
        pitchX(slur.staff, slur.p0 + side, gap, sp),
        timeY(d0, ppb, playY)
      )
      const b = project(
        pitchX(slur.staff, slur.p1 + side, gap, sp),
        timeY(d1, ppb, playY)
      )
      const midT = (slur.t0 + slur.t1) / 2
      const midP = (slur.p0 + slur.p1) / 2 + side * 1.6
      const c = project(
        pitchX(slur.staff, midP, gap, sp),
        timeY(wrapDelta(midT, beat, LOOP_BEATS), ppb, playY)
      )
      ctx.strokeStyle = rgba(color, 0.2)
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.quadraticCurveTo(c.x, c.y, b.x, b.y)
      ctx.stroke()
    }

    for (const link of score.links) {
      if (!inView(link.t)) continue
      const d = wrapDelta(link.t, beat, LOOP_BEATS)
      const y = timeY(d, ppb, playY)
      const a = project(pitchX(0, link.p0, gap, sp), y)
      const b = project(pitchX(1, link.p1, gap, sp), y)
      ctx.strokeStyle = rgba(color, 0.12 + nearPlay(d) * 0.18)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    const groups = new Map<number, Note[]>()
    for (const note of score.notes) {
      if (note.beam <= 0) continue
      if (!inView(note.t)) continue
      const list = groups.get(note.beam)
      if (list) list.push(note)
      else groups.set(note.beam, [note])
    }

    const stemTip = (note: Note, d: number) => {
      const dir = note.staff === 0 ? -1 : 1
      const y = timeY(d, ppb, playY)
      const x0 = pitchX(note.staff, note.pitch, gap, sp)
      const x1 = pitchX(note.staff, note.pitch + dir * 6.4, gap, sp)
      return {
        head: project(x0, y),
        tip: project(x1, y),
        d,
      }
    }

    for (const note of score.notes) {
      if (!inView(note.t)) continue
      const d = wrapDelta(note.t, beat, LOOP_BEATS)
      const { head, tip } = stemTip(note, d)
      const intens = nearPlay(d)
      ctx.strokeStyle = rgba(color, 0.22 + intens * 0.45)
      ctx.lineWidth = 1 * head.s
      ctx.beginPath()
      ctx.moveTo(head.x, head.y)
      ctx.lineTo(tip.x, tip.y)
      ctx.stroke()
    }

    for (const [, groupNotes] of groups) {
      if (groupNotes.length < 2) continue
      groupNotes.sort((a, b) => a.t - b.t)
      const first = groupNotes[0]!
      const last = groupNotes[groupNotes.length - 1]!
      const a = stemTip(first, wrapDelta(first.t, beat, LOOP_BEATS))
      const b = stemTip(last, wrapDelta(last.t, beat, LOOP_BEATS))
      const intens = Math.max(nearPlay(a.d), nearPlay(b.d))
      ctx.strokeStyle = rgba(color, 0.28 + intens * 0.5)
      ctx.lineWidth = Math.max(1.6, sp * 0.18) * ((a.tip.s + b.tip.s) * 0.5)
      ctx.beginPath()
      ctx.moveTo(a.tip.x, a.tip.y)
      ctx.lineTo(b.tip.x, b.tip.y)
      ctx.stroke()
      if (first.dur <= 0.13) {
        const oy = (first.staff === 0 ? -1 : 1) * 3.2
        ctx.beginPath()
        ctx.moveTo(a.tip.x, a.tip.y + oy)
        ctx.lineTo(b.tip.x, b.tip.y + oy)
        ctx.stroke()
      }
    }

    const playheadPts: Pt[] = []
    for (let i = 0; i <= 18; i++) {
      const x = lerp(-gap - sp * 18, gap + sp * 18, i / 18)
      playheadPts.push(project(x, playY))
    }
    ctx.strokeStyle = rgba(color, 0.28 * Math.min(1, bloom))
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(playheadPts[0]!.x, playheadPts[0]!.y)
    for (let i = 1; i < playheadPts.length; i++) {
      ctx.lineTo(playheadPts[i]!.x, playheadPts[i]!.y)
    }
    ctx.stroke()

    const bloomOp = dark ? "lighter" : "source-over"
    ctx.globalCompositeOperation = bloomOp

    for (const note of score.notes) {
      const d = wrapDelta(note.t, beat, LOOP_BEATS)
      if (d > visMax || d < visMin) continue
      const y = timeY(d, ppb, playY)
      const x = pitchX(note.staff, note.pitch, gap, sp)
      const pt = project(x, y)
      const intens = nearPlay(d)
      const upcoming = d > 0 ? clamp(1 - d / 10, 0.18, 0.55) : 0.2
      const headR = Math.max(2.4, sp * 0.38)
      const alpha = upcoming + intens * 0.8

      if (note.acc !== 0 && d > -0.4) {
        const accPt = project(x, y - sp * 0.9)
        ctx.fillStyle = rgba(color, 0.25 + intens * 0.5)
        ctx.font = `${Math.round(sp * 1.1)}px Georgia, serif`
        ctx.fillText(note.acc > 0 ? "#" : "b", accPt.x - 4, accPt.y)
      }

      if (note.pitch < 0 || note.pitch > 8) {
        const ledgerPitch = note.pitch < 0 ? -2 : 10
        const lx0 = pitchX(note.staff, ledgerPitch - 0.9, gap, sp)
        const lx1 = pitchX(note.staff, ledgerPitch + 0.9, gap, sp)
        const la = project(lx0, y)
        const lb = project(lx1, y)
        ctx.strokeStyle = rgba(color, 0.2 + intens * 0.3)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(la.x, la.y)
        ctx.lineTo(lb.x, lb.y)
        ctx.stroke()
      }

      if (intens > 0.04 && bloom > 0) {
        const halo = (5 + intens * 9) * bloom
        glowBlob(pt, halo, (dark ? 0.55 : 0.28) * intens * Math.min(1, bloom))
      }

      ctx.globalCompositeOperation = "source-over"
      ctx.save()
      if (intens > 0.2 && bloom > 0) {
        ctx.shadowColor = rgba(color, dark ? 0.9 : 0.45)
        ctx.shadowBlur = (3.5 + intens * 5) * bloom
      }
      drawOval(pt, headR, rgba(color, clamp(alpha, 0.2, 1)))
      ctx.restore()
      ctx.globalCompositeOperation = bloomOp

      if (d <= 0 && d > -0.08 && intens > 0.7) {
        const id = (note.t * 1000 + note.staff * 17 + note.pitch) | 0
        if (!hit.has(id)) {
          hit.add(id)
          flares.push({
            x,
            y: playY,
            age: 0,
            life: 0.38,
            size: 10,
          })
          if (hit.size > 400) hit.clear()
        }
      }
    }

    for (let i = flares.length - 1; i >= 0; i--) {
      const flare = flares[i]!
      flare.age += dt
      const t = flare.age / flare.life
      if (t >= 1) {
        flares.splice(i, 1)
        continue
      }
      const pt = project(flare.x, flare.y)
      const fade = Math.sin((1 - t) * Math.PI)
      glowBlob(pt, (7 + t * 6) * bloom, (dark ? 0.55 : 0.28) * fade)
      ctx.save()
      ctx.translate(pt.x, pt.y)
      ctx.rotate(cam.z)
      const flareW = 22 * bloom * (1 + t * 0.4) * pt.s
      const flareH = 1.4 * pt.s
      const fg = ctx.createLinearGradient(-flareW, 0, flareW, 0)
      fg.addColorStop(0, rgba(color, 0))
      fg.addColorStop(0.5, rgba(color, (dark ? 0.7 : 0.4) * fade))
      fg.addColorStop(1, rgba(color, 0))
      ctx.fillStyle = fg
      ctx.fillRect(-flareW, -flareH, flareW * 2, flareH * 2)
      ctx.restore()
    }

    ctx.globalCompositeOperation = "source-over"

    raf = requestAnimationFrame(frame)
  }

  raf = requestAnimationFrame(frame)

  return {
    setOptions(next) {
      const prevSeed = seedOf(options.seed)
      const prevDens = densityOf(options.density)
      options = {
        ...options,
        ...next,
        sway: next.sway ?? options.sway,
        theme: themeOf(next.theme ?? options.theme),
      }
      syncTheme()
      rgb = parseColor(resolveColor(options.color, dark))
      if (
        seedOf(options.seed) !== prevSeed ||
        densityOf(options.density) !== prevDens
      ) {
        rebuild()
      }
    },
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
