export type PhosphorScoreTheme = "light" | "dark" | "auto"

export type PhosphorScoreOptions = {
  /**
   * Ink / phosphor color, any CSS color. Omit to follow `theme`
   * (`LIGHT_COLOR` / `DARK_COLOR`).
   */
  color?: string
  /**
   * Bloom amount, 0–100. Default `50`. Scales the playhead halo and the
   * flare a note leaves as it plays.
   */
  glow?: number
  /** Scroll speed in beats per second. Default `1.35`. */
  speed?: number
  /** How packed the notation is, `0.35`–`1.85`. Default `1`. */
  density?: number
  /** Slow camera drift. Default `true`. */
  sway?: boolean
  /** Deterministic score. Default `23`. */
  seed?: number
  /**
   * Tilt the plane about its horizontal axis, in degrees, `-70`–`70`.
   * Positive tips the incoming notes away. Default `0`.
   */
  rotateX?: number
  /**
   * Turn the plane about its vertical axis, in degrees, `-70`–`70`.
   * Positive swings the right side away. Default `0`.
   */
  rotateY?: number
  /** Spin the plane in place, in degrees. Positive is clockwise. Default `0`. */
  rotateZ?: number
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
/** Forest ink on the page background */
export const LIGHT_COLOR = "#147A3A"
/** @deprecated Use `DARK_COLOR` or omit `color` and set `theme`. */
export const DEFAULT_COLOR = DARK_COLOR
/** Transparent in both themes — the parent's background shows through. */
export const DARK_BG = "transparent"
/** Transparent in both themes — the parent's background shows through. */
export const LIGHT_BG = "transparent"
export const DEFAULT_GLOW = 50
export const DEFAULT_SPEED = 1.35
export const DEFAULT_DENSITY = 1
export const DEFAULT_SEED = 23

/** Length of the generated score; it loops seamlessly. */
const LOOP_BEATS = 48
/** Nothing is written in the last half beat, so the loop seam never collides. */
const LOOP_END = LOOP_BEATS - 0.5
/** Stem length in half-spaces (3.5 staff spaces). */
const STEM = 7
/** Playhead height as a share of the canvas; the rest below is afterglow. */
const PLAYHEAD = 0.7
/** Share of the height faded out at the top and bottom edges. */
const EDGE_FADE = 0.16
/** Seconds to crossfade when `seed` or `density` regenerates the score. */
const REBUILD_FADE = 0.35
/** Seconds a flare lasts after its note plays. */
const FLARE_LIFE = 0.5
const MAX_FLARES = 48
/** `rotateX` / `rotateY` stop short of edge-on. */
const MAX_TILT = 70
/** Camera distance as a multiple of the canvas' longer side. */
const PERSPECTIVE = 1.2
/** Depth scale where the plane has fully faded into the distance. */
const FAR_SCALE = 0.12
/** Depth-scale range over which the plane fades in from `FAR_SCALE`. */
const FOG_RANGE = 0.3
const DYNAMICS = ["pp", "p", "mp", "mf", "f", "ff"] as const

type Staff = 0 | 1
type Rgb = [number, number, number]

type Note = {
  t: number
  /** Staff position in half-spaces; the five lines sit on 0, 2, 4, 6, 8. */
  pitch: number
  staff: Staff
  /** Half notes and longer draw hollow heads. */
  hollow: boolean
  acc: -1 | 0 | 1
}

/**
 * A stem carrier: a beamed group, a chord, or a lone note. Stems point
 * away from the middle of the system, so beams sit on the outer side and
 * dynamics have the space between the staves to themselves.
 */
type Stem = {
  staff: Staff
  notes: Note[]
  t0: number
  t1: number
  /** Where the stems end (and the beam runs), in half-spaces. */
  tip: number
  /** 0 for chords and lone notes, 1 for eighths, 2 for sixteenths. */
  beams: 0 | 1 | 2
  chord: boolean
}

type Mark = { t: number; text: string }
type Hairpin = { t: number; dur: number; opening: boolean }
type Slur = { staff: Staff; first: Note; last: Note }

type Score = {
  notes: Note[]
  stems: Stem[]
  marks: Mark[]
  hairpins: Hairpin[]
  slurs: Slur[]
}

type Dust = { x: number; y: number; z: number; s: number; a: number }
type Flare = { staff: Staff; pitch: number; age: number }

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

/** Signed beats from `now` to `t`, taking the shorter way round the loop. */
function wrapDelta(t: number, now: number) {
  const d = t - now
  return (
    ((((d + LOOP_BEATS / 2) % LOOP_BEATS) + LOOP_BEATS) % LOOP_BEATS) -
    LOOP_BEATS / 2
  )
}

function numberOr(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return clamp(value, min, max)
}

const glowOf = (value?: number) => numberOr(value, DEFAULT_GLOW, 0, 100)
const speedOf = (value?: number) => numberOr(value, DEFAULT_SPEED, 0.15, 4)
const densityOf = (value?: number) =>
  numberOr(value, DEFAULT_DENSITY, 0.35, 1.85)
const seedOf = (value?: number) =>
  Math.round(numberOr(value, DEFAULT_SEED, 0, 2 ** 32 - 1)) >>> 0

const tiltOf = (value?: number) => numberOr(value, 0, -MAX_TILT, MAX_TILT)
const spinOf = (value?: number) => {
  const deg = numberOr(value, 0, -Infinity, Infinity)
  return ((((deg + 180) % 360) + 360) % 360) - 180
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

/** Any CSS color → rgb, using the canvas' own parser. */
function parseColor(
  ctx: CanvasRenderingContext2D,
  input: string,
  fallback: string
): Rgb {
  ctx.fillStyle = fallback
  ctx.fillStyle = input
  const value = String(ctx.fillStyle)
  if (value.startsWith("#") && value.length === 7) {
    return [
      parseInt(value.slice(1, 3), 16),
      parseInt(value.slice(3, 5), 16),
      parseInt(value.slice(5, 7), 16),
    ]
  }
  const parts = value.match(/[\d.]+/g)?.map(Number) ?? []
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

function rgba(rgb: Rgb, a: number) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(a, 0, 1)})`
}

function generateScore(seed: number, density: number): Score {
  const rng = mulberry32(seed)
  const notes: Note[] = []
  const stems: Stem[] = []
  const marks: Mark[] = []
  const hairpins: Hairpin[] = []
  const slurs: Slur[] = []

  const note = (t: number, pitch: number, staff: Staff, hollow = false) => {
    const n: Note = {
      t,
      pitch: clamp(Math.round(pitch), -3, 11),
      staff,
      hollow,
      acc: rng() < 0.08 ? (rng() < 0.5 ? -1 : 1) : 0,
    }
    notes.push(n)
    return n
  }

  const addStem = (
    staff: Staff,
    list: Note[],
    beams: Stem["beams"],
    chord = false
  ) => {
    const pitches = list.map((n) => n.pitch)
    const tip =
      staff === 0 ? Math.min(...pitches) - STEM : Math.max(...pitches) + STEM
    stems.push({
      staff,
      notes: list,
      t0: list[0]!.t,
      t1: list[list.length - 1]!.t,
      tip,
      beams: list.length > 1 && !chord ? beams : 0,
      chord,
    })
  }

  const run = (
    staff: Staff,
    start: number,
    pitch: number,
    count: number,
    step: number
  ) => {
    let dir = rng() < 0.5 ? 1 : -1
    let p = pitch
    const list: Note[] = []
    for (let i = 0; i < count; i++) {
      if (i === 0 || rng() > 0.12 / density)
        list.push(note(start + i * step, p, staff))
      p += dir * (rng() < 0.18 ? 2 : 1)
      if (p >= 10 || p <= -2) {
        dir = -dir
        p = clamp(p, -2, 10)
      }
    }
    // A run thinned down to one note is drawn as a lone quarter.
    addStem(staff, list, step <= 0.25 ? 2 : 1)
    if (list.length >= 4 && rng() < 0.45) {
      slurs.push({ staff, first: list[0]!, last: list[list.length - 1]! })
    }
  }

  const arpeggio = (
    staff: Staff,
    start: number,
    root: number,
    step: number
  ) => {
    const shape = [0, 2, 4, 7, 4, 2, 0, -1]
    const list = shape.map((offset, i) =>
      note(start + i * step, root + offset, staff)
    )
    addStem(staff, list, step <= 0.25 ? 2 : 1)
  }

  const chord = (staff: Staff, t: number, root: number, hollow: boolean) => {
    const list = [
      note(t, root, staff, hollow),
      note(t, root + 2, staff, hollow),
    ]
    if (rng() < 0.7) list.push(note(t, root + 4, staff, hollow))
    addStem(staff, list, 0, true)
  }

  let t = 0
  while (t < LOOP_END) {
    const room = LOOP_END - t
    const kind = rng()
    const lead: Staff = rng() < 0.55 ? 0 : 1
    const other: Staff = lead === 0 ? 1 : 0
    const phraseStart = t

    if (kind < 0.5) {
      const count = rng() < 0.4 ? 8 : rng() < 0.55 ? 6 : 4
      const step = rng() < 0.35 * density ? 0.25 : 0.5
      const length = count * step
      if (length > room) break
      run(lead, t, Math.floor(rng() * 7) + 1, count, step)
      if (rng() < 0.55 * density) {
        chord(other, t, 1 + Math.floor(rng() * 4), length >= 2 && rng() < 0.5)
      }
      t += length
    } else if (kind < 0.72) {
      if (room < 2) break
      arpeggio(lead, t, 1 + Math.floor(rng() * 4), 0.25)
      if (rng() < 0.7 * density)
        run(other, t, Math.floor(rng() * 4) + 1, 4, 0.5)
      t += 2
    } else if (kind < 0.88) {
      const hollow = rng() < 0.45
      const length = hollow ? 2 : 1
      if (length > room) break
      chord(0, t, 2 + Math.floor(rng() * 4), hollow)
      chord(1, t, Math.floor(rng() * 4), hollow)
      t += length
    } else {
      // A rest. Sparser scores rest longer.
      t += density < 0.8 ? 1 : 0.5
      continue
    }

    if (rng() < 0.2)
      marks.push({
        t: phraseStart,
        text: DYNAMICS[Math.floor(rng() * DYNAMICS.length)]!,
      })
    if (rng() < 0.14) {
      const dur = Math.min(2 + Math.floor(rng() * 3), LOOP_END - phraseStart)
      if (dur >= 1) hairpins.push({ t: phraseStart, dur, opening: rng() < 0.5 })
    }
  }

  return { notes, stems, marks, hairpins, slurs }
}

function makeDust(seed: number): Dust[] {
  const rng = mulberry32(seed ^ 0x9e3779b9)
  return Array.from({ length: 90 }, () => ({
    x: rng(),
    y: rng(),
    z: rng(),
    s: 0.4 + rng() * 1.4,
    a: 0.08 + rng() * 0.22,
  }))
}

/** A soft round glow in `rgb`, drawn once and stamped with `drawImage`. */
function makeGlowSprite(rgb: Rgb) {
  const size = 64
  const sprite = document.createElement("canvas")
  sprite.width = size
  sprite.height = size
  const g = sprite.getContext("2d")
  if (!g) return sprite
  const grad = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  )
  grad.addColorStop(0, rgba(rgb, 1))
  grad.addColorStop(0.25, rgba(rgb, 0.45))
  grad.addColorStop(0.6, rgba(rgb, 0.1))
  grad.addColorStop(1, rgba(rgb, 0))
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  return sprite
}

/** Brightness at the playhead: ramps in just before, decays after (phosphor persistence). */
function litAt(d: number) {
  if (d > 0.3) return 0
  if (d >= 0) {
    const k = 1 - d / 0.3
    return k * k
  }
  return Math.exp(d * 2.4)
}

/**
 * How the score plane sits in front of the camera. Plane coordinates are
 * the unrotated canvas pixels; it turns about the playhead, which is also
 * where perspective converges.
 */
type View = {
  /** `rotateX · rotateY · rotateZ`, row-major, CSS axes (y down, z toward you). */
  m: number[]
  ox: number
  oy: number
  /** Camera distance. */
  cam: number
  /** No depth variation across the plane, so nothing foreshortens or fogs. */
  depthless: boolean
  /** Bounds of the plane that are on screen and not lost in the distance. */
  x0: number
  x1: number
  y0: number
  y1: number
}

function makeView(
  w: number,
  h: number,
  rotateX: number,
  rotateY: number,
  rotateZ: number
): View {
  const rad = Math.PI / 180
  const [cx, sx] = [Math.cos(rotateX * rad), Math.sin(rotateX * rad)]
  const [cy, sy] = [Math.cos(rotateY * rad), Math.sin(rotateY * rad)]
  const [cz, sz] = [Math.cos(rotateZ * rad), Math.sin(rotateZ * rad)]
  // Rx · Ry · Rz, the order CSS applies `rotateX() rotateY() rotateZ()`.
  const m = [
    cy * cz,
    -cy * sz,
    sy,
    sx * sy * cz + cx * sz,
    -sx * sy * sz + cx * cz,
    -sx * cy,
    -cx * sy * cz + sx * sz,
    cx * sy * sz + sx * cz,
    cx * cy,
  ]
  const ox = w / 2
  const oy = h * PLAYHEAD
  const cam = Math.max(w, h) * PERSPECTIVE
  const view: View = {
    m,
    ox,
    oy,
    cam,
    depthless: Math.abs(m[6]!) + Math.abs(m[7]!) < 1e-6,
    x0: 0,
    x1: w,
    y0: 0,
    y1: h,
  }
  if (rotateX === 0 && rotateY === 0 && rotateZ === 0) return view

  // The screen, less whatever lies beyond FAR_SCALE, traced back onto the
  // plane. Along a ray through screen point (u, v) the plane is hit at
  // t = m22·cam / (m22·cam − m02·u − m12·v), with depth scale 1 / t — so
  // "not too far" is a straight line on screen and clips the rectangle.
  const [m02, m12, m22] = [m[2]!, m[5]!, m[8]!]
  const far = (u: number, v: number) =>
    m22 * cam * (1 - FAR_SCALE) - m02 * u - m12 * v
  const corners: [number, number][] = [
    [-ox, -oy],
    [w - ox, -oy],
    [w - ox, h - oy],
    [-ox, h - oy],
  ]
  const kept: [number, number][] = []
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length]!
    const fa = far(a[0], a[1])
    const fb = far(b[0], b[1])
    if (fa >= 0) kept.push(a)
    if (fa >= 0 !== fb >= 0) {
      const k = fa / (fa - fb)
      kept.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k])
    }
  })

  view.x0 = view.y0 = Infinity
  view.x1 = view.y1 = -Infinity
  for (const [u, v] of kept) {
    const t = (m22 * cam) / (m22 * cam - m02 * u - m12 * v)
    const [wx, wy, wz] = [t * u, t * v, cam - t * cam]
    const px = m[0]! * wx + m[3]! * wy + m[6]! * wz + ox
    const py = m[1]! * wx + m[4]! * wy + m[7]! * wz + oy
    view.x0 = Math.min(view.x0, px)
    view.x1 = Math.max(view.x1, px)
    view.y0 = Math.min(view.y0, py)
    view.y1 = Math.max(view.y1, py)
  }
  return view
}

/** Fades the plane out as it recedes toward `FAR_SCALE`. */
function fogOf(scale: number) {
  const k = clamp((scale - FAR_SCALE) / FOG_RANGE, 0, 1)
  return k * k * (3 - 2 * k)
}

/**
 * Vertical phosphor sheet music: a grand staff scrolls down toward a
 * playhead, each note blooms and flares as it plays, then fades with a
 * phosphor afterglow. Canvas 2D; pauses off-screen and in hidden tabs, and
 * holds a still frame under `prefers-reduced-motion`.
 */
export function createPhosphorScore(
  canvas: HTMLCanvasElement,
  initial: PhosphorScoreOptions = {}
): PhosphorScoreInstance | null {
  let options: PhosphorScoreOptions = {
    glow: DEFAULT_GLOW,
    speed: DEFAULT_SPEED,
    density: DEFAULT_DENSITY,
    seed: DEFAULT_SEED,
    ...initial,
    sway: initial.sway ?? true,
    theme: themeOf(initial.theme),
  }

  const ctx = canvas.getContext("2d", { alpha: true })
  if (!ctx) return null

  let score = generateScore(seedOf(options.seed), densityOf(options.density))
  let previous: Score | null = null
  let rebuildAge = REBUILD_FADE
  let dust = makeDust(seedOf(options.seed))

  let dark = resolveDark(themeOf(options.theme))
  let rgb: Rgb = [0, 0, 0]
  let glowSprite = document.createElement("canvas")
  const recolor = () => {
    rgb = parseColor(
      ctx,
      resolveColor(options.color, dark),
      dark ? DARK_COLOR : LIGHT_COLOR
    )
    glowSprite = makeGlowSprite(rgb)
  }
  recolor()
  options.onThemeChange?.(dark)

  const flares: Flare[] = []
  const size = { w: 0, h: 0, dpr: 1 }
  let reduce = false
  let onScreen = true
  let running = true
  let raf = 0
  let lastFrame = 0
  // Start a few bars in, so the first frame already has notes at the playhead.
  let beat = 8
  let clock = 0
  let view = makeView(1, 1, 0, 0, 0)

  const resize = () => {
    const parent = canvas.parentElement
    if (!parent) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = parent.clientWidth
    const h = parent.clientHeight
    if (w === size.w && h === size.h && dpr === size.dpr) return
    size.w = w
    size.h = h
    size.dpr = dpr
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(h * dpr))
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    wake()
  }

  const shouldAnimate = () =>
    running && onScreen && !reduce && document.visibilityState !== "hidden"

  function wake() {
    if (!running || raf) return
    lastFrame = performance.now()
    raf = requestAnimationFrame(tick)
  }

  const syncTheme = () => {
    const next = resolveDark(themeOf(options.theme))
    if (next === dark) return
    dark = next
    recolor()
    options.onThemeChange?.(dark)
    wake()
  }

  const ro = new ResizeObserver(resize)
  if (canvas.parentElement) ro.observe(canvas.parentElement)

  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true
    wake()
  })
  io.observe(canvas)

  const onVisibility = () => wake()
  document.addEventListener("visibilitychange", onVisibility)

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const onReduce = () => {
    reduce = mqReduce.matches
    wake()
  }
  reduce = mqReduce.matches
  mqReduce.addEventListener("change", onReduce)

  const mo = new MutationObserver(syncTheme)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  })
  const mqDark = window.matchMedia("(prefers-color-scheme: dark)")
  mqDark.addEventListener("change", syncTheme)

  function tick(now: number) {
    raf = 0
    if (!running) return
    if (Math.min(window.devicePixelRatio || 1, 2) !== size.dpr) resize()

    const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000))
    lastFrame = now
    const animate = shouldAnimate()
    const before = beat
    if (animate) {
      clock += dt
      beat = (beat + dt * speedOf(options.speed)) % LOOP_BEATS
      rebuildAge += dt
      spawnFlares(before, beat)
    } else {
      rebuildAge = REBUILD_FADE
      flares.length = 0
    }
    for (let i = flares.length - 1; i >= 0; i--) {
      flares[i]!.age += dt
      if (flares[i]!.age >= FLARE_LIFE) flares.splice(i, 1)
    }

    draw()
    if (animate) raf = requestAnimationFrame(tick)
  }

  /** Every note whose time was crossed since the last frame flares once — no frame can skip one. */
  function spawnFlares(from: number, to: number) {
    const span = wrapDelta(to, from)
    if (span <= 0) return
    for (const n of score.notes) {
      const d = wrapDelta(n.t, from)
      if (d > 0 && d <= span) {
        if (flares.length >= MAX_FLARES) flares.shift()
        flares.push({ staff: n.staff, pitch: n.pitch, age: 0 })
      }
    }
  }

  function draw() {
    const { w, h, dpr } = size
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx!.globalCompositeOperation = "source-over"
    ctx!.globalAlpha = 1
    ctx!.clearRect(0, 0, w, h)
    if (w < 2 || h < 2) return

    view = makeView(
      w,
      h,
      tiltOf(options.rotateX),
      tiltOf(options.rotateY),
      spinOf(options.rotateZ)
    )
    const swayOn = options.sway !== false && !reduce
    const cam = {
      x: swayOn ? Math.cos(clock * 0.23) * 10 : 0,
      y: swayOn ? Math.sin(clock * 0.31) * 8 : 0,
    }
    const sp = clamp(Math.min(w, h) * 0.021, 5, 11)
    const layout = {
      sp,
      gap: clamp(w * 0.16, sp * 6.5, sp * 12),
      ppb: clamp(h * 0.15, sp * 5.2, sp * 11),
      cx: w / 2 + cam.x,
      playY: h * PLAYHEAD + cam.y,
    }
    const bloom = glowOf(options.glow) / 50

    // Dust drifts in screen space, beneath everything.
    for (const d of dust) {
      const px = (d.x + clock * 0.01 * d.z) % 1
      const py = (d.y + beat * 0.004 * (0.3 + d.z)) % 1
      ctx!.fillStyle = rgba(rgb, dark ? d.a : d.a * 0.35)
      ctx!.fillRect(px * w, py * h, d.s, d.s)
    }

    drawStaves(layout)

    const fade = previous ? clamp(rebuildAge / REBUILD_FADE, 0, 1) : 1
    if (previous && fade >= 1) previous = null
    if (previous) drawScore(previous, layout, 1 - fade, 0)
    drawScore(score, layout, fade, bloom)

    drawPlayhead(layout, bloom)
    drawFlares(layout, bloom)
    drawEdgeFade(w, h)
  }

  type Layout = {
    sp: number
    gap: number
    ppb: number
    cx: number
    playY: number
  }

  const xOf = (l: Layout, staff: Staff, pitch: number) =>
    l.cx + (staff === 0 ? -l.gap : l.gap) + (pitch - 4) * (l.sp / 2)
  const yOf = (l: Layout, d: number) => l.playY - d * l.ppb

  /**
   * Every beat offset at which something at time `t`, lasting `len` beats,
   * is in view. Usually one; a steep tilt can see several loops ahead.
   */
  function spots(l: Layout, t: number, len = 0) {
    const minD = (l.playY - view.y1 - l.ppb) / l.ppb
    const maxD = (l.playY - view.y0 + l.ppb) / l.ppb
    const first = wrapDelta(t, beat)
    const out: number[] = []
    const from = Math.ceil((minD - len - first) / LOOP_BEATS)
    const to = Math.floor((maxD - first) / LOOP_BEATS)
    for (let k = from; k <= to; k++) out.push(first + k * LOOP_BEATS)
    return out
  }

  /**
   * Plane point → screen `[x, y, scale]`, where scale is how much the
   * perspective enlarges it there. Scale is `0` behind the camera.
   */
  function project(x: number, y: number): [number, number, number] {
    const { m, ox, oy, cam } = view
    const px = x - ox
    const py = y - oy
    const z = m[6]! * px + m[7]! * py
    if (cam - z < cam * 0.02) return [0, 0, 0]
    const s = cam / (cam - z)
    return [
      ox + (m[0]! * px + m[1]! * py) * s,
      oy + (m[3]! * px + m[4]! * py) * s,
      s,
    ]
  }

  /**
   * Moves the canvas into the plane at `(x, y)`, so a notehead, glyph or
   * glow drawn around the origin tilts and foreshortens with the score.
   * Returns the distance fog there; `leave()` restores screen space.
   */
  function enter(x: number, y: number) {
    const { m, ox, oy, cam } = view
    const { dpr } = size
    const px = x - ox
    const py = y - oy
    const qx = m[0]! * px + m[1]! * py
    const qy = m[3]! * px + m[4]! * py
    const z = m[6]! * px + m[7]! * py
    if (cam - z < cam * 0.02) return 0
    const s = cam / (cam - z)
    // Jacobian of the projection: how a unit step along the plane lands on screen.
    const k = (s * s) / cam
    ctx!.setTransform(
      dpr * (s * m[0]! + qx * k * m[6]!),
      dpr * (s * m[3]! + qy * k * m[6]!),
      dpr * (s * m[1]! + qx * k * m[7]!),
      dpr * (s * m[4]! + qy * k * m[7]!),
      dpr * (ox + qx * s),
      dpr * (oy + qy * s)
    )
    return fogOf(s)
  }

  function leave() {
    const { dpr } = size
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx!.globalAlpha = 1
  }

  /** Plane stroke width; `line` and `polyline` scale it with depth. */
  let lw = 1

  /**
   * A straight stroke on the plane. Long ones pass `segments` so the fog
   * can thin them as they recede.
   */
  function line(x0: number, y0: number, x1: number, y1: number, segments = 1) {
    const n = view.depthless ? 1 : segments
    for (let i = 0; i < n; i++) {
      const a = i / n
      const b = (i + 1) / n
      polyline([
        [x0 + (x1 - x0) * a, y0 + (y1 - y0) * a],
        [x0 + (x1 - x0) * b, y0 + (y1 - y0) * b],
      ])
    }
  }

  function polyline(points: [number, number][]) {
    let scale = 0
    ctx!.beginPath()
    for (const [i, [x, y]] of points.entries()) {
      const p = project(x, y)
      if (p[2] <= 0) return
      scale += p[2]
      if (i === 0) ctx!.moveTo(p[0], p[1])
      else ctx!.lineTo(p[0], p[1])
    }
    scale /= points.length
    const fog = fogOf(scale)
    if (fog <= 0) return
    ctx!.globalAlpha = fog
    ctx!.lineWidth = lw * scale
    ctx!.stroke()
    ctx!.globalAlpha = 1
  }

  /** A quadratic curve on the plane; its control point is projected too. */
  function curve(
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number
  ) {
    const a = project(x0, y0)
    const c = project(cx, cy)
    const b = project(x1, y1)
    if (a[2] <= 0 || b[2] <= 0 || c[2] <= 0) return
    const scale = (a[2] + b[2]) / 2
    const fog = fogOf(scale)
    if (fog <= 0) return
    ctx!.globalAlpha = fog
    ctx!.lineWidth = lw * scale
    ctx!.beginPath()
    ctx!.moveTo(a[0], a[1])
    ctx!.quadraticCurveTo(c[0], c[1], b[0], b[1])
    ctx!.stroke()
    ctx!.globalAlpha = 1
  }

  /** The glow sprite, stretched to `rx` × `ry` around `(x, y)` on the plane. */
  function glow(x: number, y: number, rx: number, ry: number, alpha: number) {
    const fog = enter(x, y)
    if (fog > 0) {
      ctx!.globalAlpha = alpha * fog
      ctx!.drawImage(glowSprite, -rx, -ry, rx * 2, ry * 2)
    }
    leave()
  }

  function drawStaves(l: Layout) {
    ctx!.lineCap = "butt"
    lw = 1
    ctx!.strokeStyle = rgba(rgb, dark ? 0.2 : 0.24)
    for (const staff of [0, 1] as const) {
      for (let p = 0; p <= 8; p += 2) {
        const x = Math.round(xOf(l, staff, p)) + 0.5
        line(x, view.y0, x, view.y1, 16)
      }
    }
    // Bar lines every four beats, through both staves like a grand staff.
    for (let bar = 0; bar < LOOP_BEATS; bar += 4) {
      for (const d of spots(l, bar)) {
        const y = yOf(l, d)
        ctx!.strokeStyle = rgba(rgb, (dark ? 0.16 : 0.2) + litAt(d) * 0.3)
        line(xOf(l, 0, 0), y, xOf(l, 1, 8), y)
      }
    }
  }

  function drawScore(s: Score, l: Layout, opacity: number, bloom: number) {
    if (opacity <= 0) return
    const base = (d: number) =>
      d >= 0 ? (dark ? 0.46 : 0.58) : dark ? 0.22 : 0.3
    const alphaAt = (d: number) => {
      const b = base(d)
      return (b + (1 - b) * litAt(d)) * opacity
    }
    const sp = l.sp
    const rx = sp * 0.5
    const ry = sp * 0.64

    ctx!.lineCap = "butt"

    // Dynamics and hairpins share the space between the staves.
    ctx!.font = `italic ${Math.round(clamp(sp * 1.3, 10, 17))}px Georgia, "Times New Roman", serif`
    ctx!.textAlign = "center"
    ctx!.textBaseline = "middle"
    for (const mark of s.marks) {
      for (const d of spots(l, mark.t)) {
        const fog = enter(l.cx, yOf(l, d) + sp * 0.9)
        if (fog > 0) {
          ctx!.globalAlpha = fog
          ctx!.fillStyle = rgba(rgb, alphaAt(d) * 0.85)
          ctx!.fillText(mark.text, 0, 0)
        }
        leave()
      }
    }
    lw = 1
    for (const pin of s.hairpins) {
      for (const d0 of spots(l, pin.t, pin.dur)) {
        const d1 = d0 + pin.dur
        const narrow = pin.opening ? d0 : d1
        const wide = pin.opening ? d1 : d0
        const half = sp * 0.9
        ctx!.strokeStyle = rgba(
          rgb,
          alphaAt(Math.min(Math.abs(d0), Math.abs(d1))) * 0.6
        )
        polyline([
          [l.cx - half, yOf(l, wide)],
          [l.cx, yOf(l, narrow)],
          [l.cx + half, yOf(l, wide)],
        ])
      }
    }

    // Slurs curve on the inner side, opposite the stems.
    lw = Math.max(1, sp * 0.1)
    for (const slur of s.slurs) {
      const len = slur.last.t - slur.first.t
      for (const d0 of spots(l, slur.first.t, len)) {
        const d1 = d0 + len
        const inward = slur.staff === 0 ? 1 : -1
        const y0 = yOf(l, d0)
        const y1 = yOf(l, d1)
        const x0 = xOf(l, slur.staff, slur.first.pitch + inward * 2)
        const x1 = xOf(l, slur.staff, slur.last.pitch + inward * 2)
        const edge =
          inward > 0
            ? Math.max(slur.first.pitch, slur.last.pitch) + 3.5
            : Math.min(slur.first.pitch, slur.last.pitch) - 3.5
        ctx!.strokeStyle = rgba(
          rgb,
          alphaAt(d1 < 0 ? d1 : Math.max(0, d0)) * 0.5
        )
        curve(x0, y0, xOf(l, slur.staff, edge), (y0 + y1) / 2, x1, y1)
      }
    }

    // Stems and beams. A stem runs along the pitch axis from the side of its
    // head (the time axis is "across" here), out to the beam.
    const stemW = Math.max(1, sp * 0.11)
    const side = -ry * 0.8
    for (const stem of s.stems) {
      const len = stem.t1 - stem.t0
      for (const d0 of spots(l, stem.t0, len)) {
        const d1 = d0 + len
        const out = stem.staff === 0 ? -1 : 1
        const tipX = xOf(l, stem.staff, stem.tip)
        lw = stemW
        if (stem.chord) {
          // One stem through the chord, from the innermost head out to the tip.
          const inner =
            out < 0
              ? Math.max(...stem.notes.map((n) => n.pitch))
              : Math.min(...stem.notes.map((n) => n.pitch))
          const y = yOf(l, d0) + side
          ctx!.strokeStyle = rgba(rgb, alphaAt(d0))
          line(xOf(l, stem.staff, inner), y, tipX, y)
          continue
        }
        for (const n of stem.notes) {
          const d = d0 + (n.t - stem.t0)
          const y = yOf(l, d) + side
          ctx!.strokeStyle = rgba(rgb, alphaAt(d))
          line(xOf(l, stem.staff, n.pitch), y, tipX, y)
        }
        if (stem.beams === 0) continue
        const nearest = d1 < 0 ? d1 : d0 > 0 ? d0 : 0
        ctx!.strokeStyle = rgba(rgb, alphaAt(nearest))
        lw = sp * 0.36
        const yA = yOf(l, d0) + side + stemW / 2
        const yB = yOf(l, d1) + side - stemW / 2
        const offset = sp * 0.18 * out
        line(tipX - offset, yA, tipX - offset, yB)
        if (stem.beams === 2) {
          const x2 = tipX - offset - out * sp * 0.75
          line(x2, yA, x2, yB)
        }
      }
    }

    // Ledger lines, parallel to the staff lines.
    lw = 1
    for (const n of s.notes) {
      if (n.pitch > -2 && n.pitch < 10) continue
      for (const d of spots(l, n.t)) {
        const y = yOf(l, d)
        ctx!.strokeStyle = rgba(rgb, alphaAt(d) * 0.7)
        const from = n.pitch < 0 ? -2 : 10
        const step = n.pitch < 0 ? -2 : 2
        for (let p = from; step < 0 ? p >= n.pitch : p <= n.pitch; p += step) {
          const x = xOf(l, n.staff, p)
          line(x, y - ry * 1.7, x, y + ry * 1.7)
        }
      }
    }

    // Glow under the heads that are playing.
    if (bloom > 0) {
      ctx!.globalCompositeOperation = dark ? "lighter" : "source-over"
      for (const n of s.notes) {
        for (const d of spots(l, n.t)) {
          const lit = litAt(d)
          if (lit < 0.03) continue
          const r = sp * (1.1 + lit * 1.5) * bloom
          glow(
            xOf(l, n.staff, n.pitch),
            yOf(l, d),
            r,
            r,
            lit * (dark ? 0.7 : 0.32) * Math.min(1, bloom) * opacity
          )
        }
      }
      ctx!.globalCompositeOperation = "source-over"
    }

    // Noteheads, with accidentals just before them in reading order (below).
    ctx!.font = `${Math.round(sp * 1.5)}px Georgia, "Times New Roman", serif`
    for (const n of s.notes) {
      for (const d of spots(l, n.t)) {
        const fog = enter(xOf(l, n.staff, n.pitch), yOf(l, d))
        if (fog <= 0) {
          leave()
          continue
        }
        ctx!.globalAlpha = fog
        const color = rgba(rgb, alphaAt(d))
        ctx!.beginPath()
        ctx!.ellipse(0, 0, rx, ry, 0.35, 0, Math.PI * 2)
        if (n.hollow) {
          ctx!.strokeStyle = color
          ctx!.lineWidth = Math.max(1.2, sp * 0.16)
          ctx!.stroke()
        } else {
          ctx!.fillStyle = color
          ctx!.fill()
        }
        if (n.acc !== 0) {
          ctx!.fillStyle = color
          ctx!.fillText(n.acc > 0 ? "♯" : "♭", 0, ry + sp * 0.95)
        }
        leave()
      }
    }
  }

  function drawPlayhead(l: Layout, bloom: number) {
    const y = Math.round(l.playY) + 0.5
    if (bloom > 0) {
      ctx!.globalCompositeOperation = dark ? "lighter" : "source-over"
      const alpha = (dark ? 0.35 : 0.12) * Math.min(1, bloom)
      const band = l.sp * 1.4 * Math.max(0.6, bloom)
      // In slices, so the band follows the perspective across the plane.
      const slices = view.depthless ? 1 : 24
      const span = (view.x1 - view.x0) / slices
      const src = glowSprite.width / slices
      for (let i = 0; i < slices; i++) {
        const fog = enter(view.x0 + (i + 0.5) * span, y)
        if (fog > 0) {
          ctx!.globalAlpha = alpha * fog
          ctx!.drawImage(
            glowSprite,
            i * src,
            0,
            src,
            glowSprite.height,
            -span / 2,
            -band,
            span,
            band * 2
          )
        }
        leave()
      }
      ctx!.globalCompositeOperation = "source-over"
    }
    ctx!.strokeStyle = rgba(rgb, dark ? 0.75 : 0.55)
    lw = 1
    line(view.x0, y, view.x1, y, 12)
  }

  function drawFlares(l: Layout, bloom: number) {
    if (flares.length === 0 || bloom <= 0) return
    ctx!.globalCompositeOperation = dark ? "lighter" : "source-over"
    for (const f of flares) {
      const k = f.age / FLARE_LIFE
      const fade = (1 - k) * (1 - k)
      const x = xOf(l, f.staff, f.pitch)
      const r = l.sp * (1.6 + k * 1.4) * bloom
      glow(x, l.playY, r, r, fade * (dark ? 0.8 : 0.4))
      // A streak along the playhead.
      const streak = l.sp * (2.5 + k * 3) * bloom
      glow(x, l.playY, streak, 1.5, fade * (dark ? 0.9 : 0.5))
    }
    ctx!.globalCompositeOperation = "source-over"
  }

  /** Top and bottom fade into the background — in the canvas, so it costs nothing and blurs nothing. */
  function drawEdgeFade(w: number, h: number) {
    const f = h * EDGE_FADE
    // Erase toward the edges rather than paint over them, so the fade
    // lands on whatever background the parent has.
    const solid = "rgba(0,0,0,1)"
    const clear = "rgba(0,0,0,0)"
    ctx!.globalCompositeOperation = "destination-out"
    const top = ctx!.createLinearGradient(0, 0, 0, f)
    top.addColorStop(0, solid)
    top.addColorStop(1, clear)
    ctx!.fillStyle = top
    ctx!.fillRect(0, 0, w, f)
    const bottom = ctx!.createLinearGradient(0, h - f, 0, h)
    bottom.addColorStop(0, clear)
    bottom.addColorStop(1, solid)
    ctx!.fillStyle = bottom
    ctx!.fillRect(0, h - f, w, f)
    ctx!.globalCompositeOperation = "source-over"
  }

  resize()
  wake()

  return {
    setOptions(next) {
      const prevSeed = seedOf(options.seed)
      const prevDensity = densityOf(options.density)
      const prevColor = options.color
      options = {
        ...options,
        ...next,
        sway: next.sway ?? options.sway,
        theme: themeOf(next.theme ?? options.theme),
      }
      syncTheme()
      if (options.color !== prevColor) recolor()
      if (
        seedOf(options.seed) !== prevSeed ||
        densityOf(options.density) !== prevDensity
      ) {
        // Crossfade from the old score instead of cutting.
        previous = reduce ? null : score
        rebuildAge = reduce ? REBUILD_FADE : 0
        score = generateScore(seedOf(options.seed), densityOf(options.density))
        dust = makeDust(seedOf(options.seed))
        flares.length = 0
      }
      wake()
    },
    destroy() {
      running = false
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
