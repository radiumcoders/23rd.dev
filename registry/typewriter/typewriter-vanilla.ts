export const DEFAULT_TEXT =
  "Dear reader,\nevery letter lands where the carriage stands, then the carriage steps aside for the next one. At the margin it rings, glides home, and drops a line.\n\nYours, 23rd"

/** Characters per second. */
export const DEFAULT_SPEED = 14
/** Pause on the finished page before it feeds out and starts over, in ms. */
export const DEFAULT_HOLD = 2600
/** Wait before the first keystroke, in ms. */
export const DEFAULT_START_DELAY = 600
/** Per-letter baseline, tilt, and ink wobble (0–1). */
export const DEFAULT_JITTER = 0.3

/** Line pitch, in font sizes. Leaves the carriage room under each line. */
const LEADING = 2.2
/** Typeball radius, in font sizes. */
const BALL_R = 1.1
/** Baseline to the top of the typeball, in font sizes. */
const BALL_GAP = 0.2
/** Glyph size on the ball, as a share of its radius. */
const BALL_GLYPH = 0.56
/** Rail thickness, in font sizes. */
const RAIL_H = 0.32
/** Rail clamp width, in font sizes. */
const CLAMP_W = 0.26
/** Gap between the ball and each clamp, in font sizes. */
const CLAMP_GAP = 0.14
/** Bell rings this many cells before the right margin. */
const BELL_CELLS = 6

export type TypewriterOptions = {
  /** What gets typed. `\n` starts a new line; long lines wrap at words. */
  text?: string
  /** Characters per second. Default `14`. */
  speed?: number
  /** Uneven keystrokes, with longer rests after punctuation. Default `true`. */
  humanize?: boolean
  /** Feed the page out and type it again after `hold`. Default `true`. */
  loop?: boolean
  /** Pause on the finished page before looping, in ms. Default `2600`. */
  hold?: number
  /** Wait before the first keystroke, in ms. Default `600`. */
  startDelay?: number
  /** Wrap width in characters. `0` fits the frame. Default `0`. */
  columns?: number
  /** Scale ticks along the rail. Default `true`. */
  ticks?: boolean
  /** Per-letter baseline, tilt, and ink wobble, 0–1. Default `0.3`. */
  jitter?: number
  /** Synthesized key clicks, bell, and return. Default `false`. */
  sound?: boolean
  /** Called each time the last character lands. */
  onDone?: () => void
}

export type TypewriterInstance = {
  setOptions: (options: Partial<TypewriterOptions>) => void
  /** Clear the page and type from the first character. */
  restart: () => void
  destroy: () => void
}

export type TypewriterStroke =
  | { kind: "char"; ch: string; line: number; col: number; src: number }
  | { kind: "return"; line: number; from: number; src: number }

/**
 * The keystrokes that type `text` into `columns`-wide lines: characters
 * with their cell, and carriage returns. Words wrap whole unless a word is
 * wider than the line. `src` orders strokes against the source text, so a
 * relayout can resume at the same point.
 */
export function layoutTypewriter(
  text: string,
  columns: number
): TypewriterStroke[] {
  const width = Math.max(1, Math.floor(columns))
  const source = Array.from(text.replace(/\r\n?/g, "\n").replace(/\t/g, "  "))
  const strokes: TypewriterStroke[] = []
  let line = 0
  let col = 0
  /** Wrap returns wait for the character after them. */
  let pendingWraps: TypewriterStroke[] = []

  const feed = (src: number) => {
    const stroke: TypewriterStroke = {
      kind: "return",
      line: line + 1,
      from: col,
      src,
    }
    strokes.push(stroke)
    line += 1
    col = 0
    return stroke
  }
  const wrap = () => pendingWraps.push(feed(Infinity))
  const type = (ch: string, src: number) => {
    for (const stroke of pendingWraps) stroke.src = src - 0.5
    pendingWraps = []
    strokes.push({ kind: "char", ch, line, col, src })
    col += 1
  }

  let i = 0
  while (i < source.length) {
    const ch = source[i]!
    if (ch === "\n") {
      for (const stroke of pendingWraps) stroke.src = i - 0.5
      pendingWraps = []
      feed(i)
      i += 1
      continue
    }
    if (/\s/.test(ch)) {
      // Spaces past the margin fall off the page.
      if (col < width) type(" ", i)
      i += 1
      continue
    }
    let end = i
    while (end < source.length && !/\s/.test(source[end]!)) end += 1
    const length = end - i
    if (col > 0 && col + length > width) wrap()
    for (let k = i; k < end; k++) {
      if (col >= width) wrap()
      type(source[k]!, k)
    }
    i = end
  }
  return strokes
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function numberOr(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return clamp(value, min, max)
}

/** Stable 0–1 noise per integer, so a letter keeps its wobble on relayout. */
function hash(n: number) {
  let x = Math.imul(n + 1, 0x27d4eb2d) ^ 0x165667b1
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}

const SVG_NS = "http://www.w3.org/2000/svg"

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {}
) {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value))
  }
  return node
}

function div(style: Partial<CSSStyleDeclaration>) {
  const node = document.createElement("div")
  Object.assign(node.style, style)
  return node
}

type Sound = {
  key: (space: boolean) => void
  bell: () => void
  carriage: (ms: number) => void
  close: () => void
}

/** Key clicks, the margin bell, and the return ratchet, all synthesized. */
function createSound(): Sound | null {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctx) return null
  let audio: AudioContext | null = null
  let out: GainNode | null = null
  let noise: AudioBuffer | null = null

  const ready = () => {
    if (!audio) {
      audio = new Ctx()
      out = audio.createGain()
      out.gain.value = 0.55
      out.connect(audio.destination)
      noise = audio.createBuffer(
        1,
        Math.floor(audio.sampleRate * 0.4),
        audio.sampleRate
      )
      const data = noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    }
    if (audio.state === "suspended") void audio.resume().catch(() => {})
    return audio.state === "running" ? audio : null
  }

  const burst = (
    a: AudioContext,
    at: number,
    freq: number,
    q: number,
    peak: number,
    decay: number
  ) => {
    const src = a.createBufferSource()
    src.buffer = noise
    const band = a.createBiquadFilter()
    band.type = "bandpass"
    band.frequency.value = freq
    band.Q.value = q
    const gain = a.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay)
    src.connect(band).connect(gain).connect(out!)
    src.start(at, Math.random() * 0.2)
    src.stop(at + decay + 0.02)
  }

  const thump = (a: AudioContext, at: number, freq: number, peak: number) => {
    const osc = a.createOscillator()
    osc.frequency.setValueAtTime(freq, at)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, at + 0.05)
    const gain = a.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.06)
    osc.connect(gain).connect(out!)
    osc.start(at)
    osc.stop(at + 0.08)
  }

  return {
    key(space) {
      const a = ready()
      if (!a) return
      const at = a.currentTime
      if (space) {
        burst(a, at, 900, 0.9, 0.22, 0.05)
        thump(a, at, 110, 0.3)
      } else {
        burst(a, at, 2600 + Math.random() * 900, 1.3, 0.34, 0.035)
        thump(a, at, 150 + Math.random() * 30, 0.2)
      }
    },
    bell() {
      const a = ready()
      if (!a) return
      const at = a.currentTime
      for (const [freq, peak] of [
        [2093, 0.16],
        [5776, 0.05],
      ] as const) {
        const osc = a.createOscillator()
        osc.frequency.value = freq
        const gain = a.createGain()
        gain.gain.setValueAtTime(0.0001, at)
        gain.gain.exponentialRampToValueAtTime(peak, at + 0.004)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.1)
        osc.connect(gain).connect(out!)
        osc.start(at)
        osc.stop(at + 1.2)
      }
    },
    carriage(ms) {
      const a = ready()
      if (!a) return
      const at = a.currentTime
      const seconds = ms / 1000
      // Ratchet clicks as the line feeds, then the glide home.
      for (let i = 0; i < 3; i++) burst(a, at + i * 0.028, 1800, 2, 0.16, 0.02)
      const src = a.createBufferSource()
      src.buffer = noise
      src.loop = true
      const low = a.createBiquadFilter()
      low.type = "bandpass"
      low.Q.value = 0.8
      low.frequency.setValueAtTime(700, at)
      low.frequency.linearRampToValueAtTime(1400, at + seconds)
      const gain = a.createGain()
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.07, at + seconds * 0.3)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds)
      src.connect(low).connect(gain).connect(out!)
      src.start(at)
      src.stop(at + seconds + 0.02)
      thump(a, at + seconds, 120, 0.28)
    },
    close() {
      void audio?.close().catch(() => {})
      audio = null
    },
  }
}

const TAU = Math.PI * 2

/** The ball's glyph rows, top to bottom — the keyboard's three letter rows. */
const BALL_FACES = ["qwertyuiop", "asdfghjkl;", "zxcvbnm,.?"]
/** Latitude of each row on the ball, in radians. */
const BALL_ROWS = [0.66, 0, -0.66]
/** Glyphs sit a little inside the silhouette, so the limb stays clean. */
const BALL_INSET = 0.8
/** Idle spin, in radians per second. */
const BALL_DRIFT = 0.55

type Tween = {
  from: number
  to: number
  start: number
  ms: number
  ease: (t: number) => number
}

const easeOut = (t: number) => 1 - (1 - t) ** 3
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

/** Nearest turn of `angle` to `from`, so the ball spins the short way. */
function nearest(from: number, angle: number) {
  return from + ((((angle - from) % TAU) + TAU * 1.5) % TAU) - Math.PI
}

type Typeball = {
  el: SVGSVGElement
  /**
   * Size the ball; `radius` and the glyph size are in px. `font` is the
   * page's computed style — mask content doesn't inherit it everywhere.
   */
  layout: (radius: number, glyph: number, font: CSSStyleDeclaration) => void
  /** Spin and tilt until `ch` faces the paper. */
  select: (ch: string, ms: number) => void
  /** Spin whole turns, for the glide home. */
  whirl: (turns: number, ms: number) => void
  /** Turn slowly while nothing is being typed. */
  drift: (on: boolean) => void
  destroy: () => void
}

let ballIds = 0

/**
 * The type element: a sphere wearing the keyboard in three rows. It spins
 * about its axis and tilts to bring a glyph to the front — the letters are
 * cut through the ink, so the page shows through them.
 */
function createTypeball(): Typeball {
  const id = `typewriter-ball-${++ballIds}`
  const el = svgEl("svg", { overflow: "visible" })
  el.style.position = "absolute"
  el.style.overflow = "visible"
  const defs = svgEl("defs")
  const shade = svgEl("radialGradient", {
    id: `${id}-shade`,
    cx: 0.36,
    cy: 0.3,
    r: 0.8,
  })
  for (const [offset, alpha] of [
    [0, 0.5],
    [0.5, 0.86],
    [1, 1],
  ] as const) {
    shade.append(
      svgEl("stop", {
        offset,
        "stop-color": "currentColor",
        "stop-opacity": alpha,
      })
    )
  }
  const mask = svgEl("mask", { id: `${id}-cut`, maskUnits: "userSpaceOnUse" })
  const paper = svgEl("rect", { fill: "#fff" })
  const letters = svgEl("g", {
    fill: "#000",
    "text-anchor": "middle",
    "dominant-baseline": "central",
  })
  mask.append(paper, letters)
  defs.append(shade, mask)
  const sphere = svgEl("circle", {
    fill: `url(#${id}-shade)`,
    mask: `url(#${id}-cut)`,
  })
  el.append(defs, sphere)

  const cols = BALL_FACES[0]!.length
  const slots = BALL_FACES.flatMap((face, row) =>
    Array.from(face, (glyph, col) => {
      const node = svgEl("text")
      node.textContent = glyph
      letters.append(node)
      return { row, col, glyph, node }
    })
  )

  let radius = 16
  let lon = 0
  let tilt = 0
  let lonTween: Tween | null = null
  let tiltTween: Tween | null = null
  let drifting = false
  let raf = 0
  let last = 0
  let swapped: (typeof slots)[number] | null = null

  const render = () => {
    const r = radius * BALL_INSET
    const sin = Math.sin(tilt)
    const cos = Math.cos(tilt)
    for (const slot of slots) {
      const lat = BALL_ROWS[slot.row]!
      const theta = (slot.col / cols) * TAU - lon
      const x = Math.cos(lat) * Math.sin(theta)
      const y0 = Math.sin(lat)
      const z0 = Math.cos(lat) * Math.cos(theta)
      const y = y0 * cos - z0 * sin
      const z = y0 * sin + z0 * cos
      const seen = clamp((z - 0.12) / 0.4, 0, 1)
      if (seen <= 0) {
        slot.node.setAttribute("fill-opacity", "0")
        continue
      }
      const sx = Math.sqrt(Math.max(0.02, 1 - x * x))
      const sy = Math.sqrt(Math.max(0.02, 1 - y * y))
      slot.node.setAttribute("fill-opacity", (seen * 0.86).toFixed(3))
      slot.node.setAttribute(
        "transform",
        `translate(${(x * r).toFixed(2)} ${(-y * r).toFixed(2)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`
      )
    }
  }

  const valueOf = (tween: Tween, now: number) => {
    const t = clamp((now - tween.start) / Math.max(1, tween.ms), 0, 1)
    return tween.from + (tween.to - tween.from) * tween.ease(t)
  }

  const frame = (now: number) => {
    raf = 0
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    if (lonTween) {
      lon = valueOf(lonTween, now)
      if (now - lonTween.start >= lonTween.ms) lonTween = null
    } else if (drifting) {
      lon += BALL_DRIFT * dt
    }
    if (tiltTween) {
      tilt = valueOf(tiltTween, now)
      if (now - tiltTween.start >= tiltTween.ms) tiltTween = null
    }
    render()
    if (lonTween || tiltTween || drifting) raf = requestAnimationFrame(frame)
  }

  const wake = () => {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  const tweenTo = (current: number, to: number, ms: number, ease = easeOut) => {
    const now = performance.now()
    return { from: current, to, start: now, ms, ease }
  }

  const settle = () => {
    const now = performance.now()
    if (lonTween) lon = valueOf(lonTween, now)
    if (tiltTween) tilt = valueOf(tiltTween, now)
  }

  return {
    el,
    layout(nextRadius, glyph, font) {
      radius = nextRadius
      const box = radius + 2
      el.setAttribute("width", String(box * 2))
      el.setAttribute("height", String(box * 2))
      el.setAttribute("viewBox", `${-box} ${-box} ${box * 2} ${box * 2}`)
      sphere.setAttribute("r", String(radius))
      for (const [key, value] of Object.entries({
        x: -box,
        y: -box,
        width: box * 2,
        height: box * 2,
      })) {
        mask.setAttribute(key, String(value))
        paper.setAttribute(key, String(value))
      }
      letters.setAttribute("font-size", glyph.toFixed(2))
      Object.assign(letters.style, {
        fontFamily: font.fontFamily,
        fontStretch: font.fontStretch,
        fontWeight: font.fontWeight,
        fontVariationSettings: font.fontVariationSettings,
      })
      render()
    },
    select(ch, ms) {
      const key = ch.toLowerCase()
      let slot = slots.find((s) => s.glyph === key)
      if (!slot) {
        const code = ch.codePointAt(0) ?? 0
        slot = slots[(code * 7) % slots.length]!
      }
      // Capitals and symbols borrow a slot's face until the next letter.
      if (swapped && swapped !== slot) swapped.node.textContent = swapped.glyph
      swapped = ch === slot.glyph ? null : slot
      slot.node.textContent = ch
      settle()
      const target = nearest(lon, (slot.col / cols) * TAU)
      lonTween = tweenTo(lon, target, ms)
      tiltTween = tweenTo(tilt, BALL_ROWS[slot.row]!, ms)
      wake()
    },
    whirl(turns, ms) {
      settle()
      lonTween = tweenTo(lon, lon + turns * TAU, ms, easeInOut)
      tiltTween = tweenTo(tilt, 0, ms, easeInOut)
      wake()
    },
    drift(on) {
      drifting = on
      if (on) wake()
    },
    destroy() {
      cancelAnimationFrame(raf)
      raf = 0
    },
  }
}

/**
 * A typewriter on the page. A rail spans the frame and a typeball rides it:
 * for every letter the ball spins that glyph to the front, strikes, and
 * steps one cell right. At the end of a line it whirls home and drops to
 * the next, and when the page is full the paper feeds up. Idle when
 * finished, off-screen, or under `prefers-reduced-motion` (which prints the
 * whole page at once).
 */
export function createTypewriter(
  root: HTMLElement,
  initial: TypewriterOptions = {}
): TypewriterInstance {
  let options: TypewriterOptions = { ...initial }
  const textOf = () => options.text ?? DEFAULT_TEXT
  const speedOf = () => numberOr(options.speed, DEFAULT_SPEED, 1, 120)
  const holdOf = () => numberOr(options.hold, DEFAULT_HOLD, 0, 60000)
  const startOf = () =>
    numberOr(options.startDelay, DEFAULT_START_DELAY, 0, 60000)
  const jitterOf = () => numberOr(options.jitter, DEFAULT_JITTER, 0, 1)

  // Screen readers get the whole text once; the machine is decoration.
  const spoken = document.createElement("span")
  Object.assign(spoken.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    margin: "-1px",
    padding: "0",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: "0",
  })

  const stage = div({
    position: "absolute",
    inset: "0",
    overflow: "hidden",
    borderRadius: "inherit",
    pointerEvents: "none",
  })
  stage.setAttribute("aria-hidden", "true")
  const viewport = div({ position: "absolute", inset: "0" })
  const page = div({
    position: "absolute",
    left: "0",
    top: "0",
    right: "0",
    whiteSpace: "pre",
    willChange: "transform",
  })
  const carriage = div({
    position: "absolute",
    left: "0",
    top: "0",
    width: "100%",
    willChange: "transform",
  })
  const rail = svgEl("svg", { overflow: "visible" })
  rail.style.position = "absolute"
  rail.style.left = "0"
  rail.style.overflow = "visible"
  const head = div({
    position: "absolute",
    left: "0",
    top: "0",
    willChange: "transform",
  })
  const clamps = svgEl("svg", { overflow: "visible" })
  clamps.style.position = "absolute"
  clamps.style.overflow = "visible"
  const ball = createTypeball()

  head.append(clamps, ball.el)
  carriage.append(rail, head)
  viewport.append(page)
  stage.append(viewport, carriage)
  root.append(spoken, stage)

  // Font metrics and frame, refreshed by `measure`.
  const m = {
    fs: 16,
    cw: 9.6,
    lh: 35,
    base: 22,
    width: 0,
    height: 0,
    padT: 0,
    padB: 0,
    margin: 0,
    columns: 1,
    radius: 16,
    /** Baseline to the ball's centre, which is also the rail's. */
    axis: 20,
    /** Cell centre to the outer edge of a rail clamp. */
    half: 24,
  }

  let strokes: TypewriterStroke[] = []
  /** Strokes on the page. */
  let pos = 0
  let cursor = { line: 0, col: 0 }
  let scroll = 0
  let lines: HTMLDivElement[] = []
  let phase: "waiting" | "typing" | "done" | "feeding" = "waiting"
  let rang = false
  let destroyed = false
  let reduce = false
  let onScreen = true
  let sound: Sound | null = null

  // One pending step, paused while the machine can't be seen.
  let pending: (() => void) | null = null
  let timer = 0
  let remaining = 0
  let dueAt = 0
  const active = () =>
    !destroyed && onScreen && !reduce && document.visibilityState !== "hidden"
  const arm = () => {
    dueAt = performance.now() + remaining
    timer = window.setTimeout(() => {
      timer = 0
      const run = pending
      pending = null
      run?.()
    }, remaining)
  }
  const schedule = (run: () => void, ms: number) => {
    window.clearTimeout(timer)
    timer = 0
    pending = run
    remaining = Math.max(0, ms)
    if (active()) arm()
  }
  const cancel = () => {
    window.clearTimeout(timer)
    timer = 0
    pending = null
  }
  /** The ball turns idly between pages, but only while anyone can see it. */
  const idle = () =>
    ball.drift((phase === "waiting" || phase === "done") && active())
  const sync = () => {
    if (active()) {
      if (pending && !timer) arm()
    } else if (timer) {
      window.clearTimeout(timer)
      timer = 0
      remaining = Math.max(0, dueAt - performance.now())
    }
    idle()
  }
  const setPhase = (next: typeof phase) => {
    phase = next
    idle()
  }

  const soundOn = () => {
    if (!options.sound) return null
    sound ??= createSound()
    return sound
  }

  const cellX = (col: number) => m.margin + col * m.cw
  const lineTop = (line: number) => m.padT + line * m.lh
  /** How far the paper must feed up to keep the carriage on `line` in frame. */
  const scrollFor = (line: number) => {
    const floor = m.height - Math.min(m.padB, m.fs * 0.6)
    return Math.max(0, lineTop(line) + m.base + m.axis + m.radius - floor)
  }

  const setTransition = (
    el: HTMLElement,
    ms: number,
    ease: string,
    delay = 0
  ) => {
    el.style.transition =
      ms > 0 ? `transform ${ms}ms ${ease} ${Math.round(delay)}ms` : "none"
  }
  const placeHead = (col: number, ms = 0, ease = "linear", delay = 0) => {
    setTransition(head, ms, ease, delay)
    head.style.transform = `translate3d(${cellX(col)}px,0,0)`
  }
  const placeCarriage = (line: number, ms = 0, ease = "linear") => {
    setTransition(carriage, ms, ease)
    const y = Math.round(lineTop(line) - scroll + m.base)
    carriage.style.transform = `translate3d(0,${y}px,0)`
  }
  const placePage = (ms = 0, ease = "linear") => {
    page.style.transition =
      ms > 0 ? `transform ${ms}ms ${ease}, opacity ${ms}ms ${ease}` : "none"
    page.style.transform = `translate3d(0,${-scroll}px,0)`
    viewport.style.maskImage = viewport.style.webkitMaskImage =
      scroll > 0
        ? `linear-gradient(to bottom, transparent 0, #000 ${Math.max(m.padT, m.lh * 0.8)}px)`
        : ""
  }

  const lineEl = (index: number) => {
    while (lines.length <= index) {
      const el = div({
        position: "absolute",
        left: "0",
        right: "0",
        top: `${lineTop(lines.length)}px`,
        height: `${m.lh}px`,
      })
      page.append(el)
      lines.push(el)
    }
    return lines[index]!
  }

  const letter = (stroke: Extract<TypewriterStroke, { kind: "char" }>) => {
    const jitter = jitterOf()
    const n = Math.floor(stroke.src) * 4
    const el = document.createElement("span")
    el.textContent = stroke.ch
    Object.assign(el.style, {
      position: "absolute",
      top: "0",
      left: `${cellX(stroke.col)}px`,
      width: `${m.cw}px`,
      height: `${m.lh}px`,
      lineHeight: `${m.lh}px`,
      textAlign: "center",
    })
    if (jitter > 0) {
      const dx = (hash(n) - 0.5) * jitter * 0.07 * m.fs
      const dy = (hash(n + 1) - 0.5) * jitter * 0.1 * m.fs
      const tilt = (hash(n + 2) - 0.5) * jitter * 3.2
      el.style.transform = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)`
      el.style.opacity = (1 - hash(n + 3) * jitter * 0.42).toFixed(3)
    }
    lineEl(stroke.line).append(el)
    return el
  }

  const after = (stroke: TypewriterStroke | undefined) => {
    if (!stroke) return { line: 0, col: 0 }
    return stroke.kind === "char"
      ? { line: stroke.line, col: stroke.col + 1 }
      : { line: stroke.line, col: 0 }
  }

  /** Paint the first `pos` strokes and park the carriage, without motion. */
  const paint = () => {
    page.replaceChildren()
    lines = []
    for (let i = 0; i < pos; i++) {
      const stroke = strokes[i]!
      if (stroke.kind === "char" && stroke.ch !== " ") letter(stroke)
    }
    cursor = after(strokes[pos - 1])
    scroll = scrollFor(cursor.line)
    placePage()
    placeCarriage(cursor.line)
    placeHead(cursor.col)
    rang = cursor.col >= m.columns - BELL_CELLS
  }

  const drawRail = () => {
    const { width, fs, cw, columns } = m
    const h = Math.max(3, Math.round(RAIL_H * fs))
    rail.setAttribute("width", String(width))
    rail.setAttribute("height", String(h + 1))
    rail.setAttribute("viewBox", `0 0 ${width} ${h + 1}`)
    rail.style.top = `${Math.round(m.axis - h / 2)}px`
    rail.replaceChildren()
    const g = svgEl("g", { fill: "none", stroke: "currentColor" })
    g.append(
      svgEl("path", {
        d: `M0 0.5H${width}M0 ${h + 0.5}H${width}`,
        "stroke-opacity": 0.3,
        "stroke-width": 1,
      })
    )
    if (options.ticks ?? true) {
      let minor = ""
      let major = ""
      for (let c = 0; c <= columns; c++) {
        const x = Math.round(m.margin + c * cw + cw / 2) + 0.5
        if (c % 5 === 0) major += `M${x} 1V${c % 10 === 0 ? h : h * 0.62}`
        else minor += `M${x} 1V${h * 0.36}`
      }
      g.append(
        svgEl("path", { d: minor, "stroke-opacity": 0.22, "stroke-width": 1 }),
        svgEl("path", { d: major, "stroke-opacity": 0.42, "stroke-width": 1 })
      )
    }
    // Margin stops: where the carriage returns to, and where the bell rings.
    const stopW = Math.max(2, Math.round(fs * 0.14))
    const stopH = h + Math.round(fs * 0.32)
    for (const x of [m.margin, m.margin + columns * cw]) {
      g.append(
        svgEl("rect", {
          x: Math.round(x - stopW / 2),
          y: Math.round((h - stopH) / 2) + 0.5,
          width: stopW,
          height: stopH,
          rx: stopW / 2,
          fill: "currentColor",
          "fill-opacity": 0.55,
          stroke: "none",
        })
      )
    }
    rail.append(g)
  }

  /** The ball, and the two clamps that hold it on the rail. */
  const drawHead = () => {
    const { fs, cw, radius, axis, half } = m
    const box = radius + 2
    ball.layout(radius, radius * BALL_GLYPH, getComputedStyle(root))
    ball.el.style.left = `${cw / 2 - box}px`
    ball.el.style.top = `${axis - box}px`

    const railH = Math.max(3, Math.round(RAIL_H * fs))
    const w = Math.max(3, Math.round(CLAMP_W * fs))
    const h = railH + Math.round(fs * 0.42)
    const gap = Math.round(CLAMP_GAP * fs)
    clamps.setAttribute("width", String(half * 2))
    clamps.setAttribute("height", String(h))
    clamps.setAttribute("viewBox", `${-half} ${-h / 2} ${half * 2} ${h}`)
    clamps.style.left = `${cw / 2 - half}px`
    clamps.style.top = `${axis - h / 2}px`
    clamps.replaceChildren()
    for (const side of [-1, 1]) {
      const inner = radius + gap
      const x = side < 0 ? -inner - w : inner
      clamps.append(
        // The collar that grips the rail…
        svgEl("rect", {
          x,
          y: -h / 2,
          width: w,
          height: h,
          rx: Math.min(w / 2, fs * 0.12),
          fill: "currentColor",
        }),
        // …and the axle stub it holds the ball by.
        svgEl("rect", {
          x: side < 0 ? -inner : radius - 1,
          y: -Math.max(1, railH * 0.25),
          width: gap + 1,
          height: Math.max(2, railH * 0.5),
          fill: "currentColor",
        })
      )
    }
  }

  const measure = () => {
    const cs = getComputedStyle(root)
    const fs = parseFloat(cs.fontSize) || 16
    const probe = document.createElement("span")
    probe.textContent = "0000000000"
    Object.assign(probe.style, {
      position: "absolute",
      visibility: "hidden",
      whiteSpace: "pre",
    })
    const marker = document.createElement("span")
    Object.assign(marker.style, {
      display: "inline-block",
      width: "0",
      height: "0",
      verticalAlign: "baseline",
    })
    const lh = Math.round(fs * LEADING)
    const row = div({
      position: "absolute",
      visibility: "hidden",
      lineHeight: `${lh}px`,
      height: `${lh}px`,
    })
    row.append("x", marker)
    stage.append(probe, row)
    const cw = probe.getBoundingClientRect().width / 10 || fs * 0.6
    const base = marker.offsetTop
    probe.remove()
    row.remove()

    const width = root.clientWidth
    const height = root.clientHeight
    const padL = parseFloat(cs.paddingLeft) || 0
    const padR = parseFloat(cs.paddingRight) || 0
    const radius = Math.round(fs * BALL_R)
    const half = Math.ceil(
      radius + Math.round(CLAMP_GAP * fs) + Math.round(CLAMP_W * fs)
    )
    const reach = half - cw / 2
    const edge = fs * 0.5
    // The carriage never hangs off the frame, even at the margins.
    const margin = Math.max(padL, Math.ceil(reach + edge))
    const fit = Math.floor(
      Math.min(width - padR - margin, width - edge - reach - cw - margin) / cw
    )
    const wanted = Math.floor(numberOr(options.columns, 0, 0, 1000))
    const columns = Math.max(1, wanted > 0 ? Math.min(wanted, fit) : fit)

    const changed =
      fs !== m.fs ||
      cw !== m.cw ||
      lh !== m.lh ||
      columns !== m.columns ||
      width !== m.width
    Object.assign(m, {
      fs,
      cw,
      lh,
      base,
      width,
      height,
      padT: parseFloat(cs.paddingTop) || 0,
      padB: parseFloat(cs.paddingBottom) || 0,
      margin,
      columns,
      radius,
      axis: Math.round(BALL_GAP * fs + radius),
      half,
    })
    return changed
  }

  /** Lay the text out again for the current frame, keeping the place. */
  const relayout = () => {
    const at = strokes[pos - 1]?.src ?? -1
    strokes = layoutTypewriter(textOf(), m.columns)
    pos = phase === "done" ? strokes.length : 0
    if (phase !== "done") {
      while (pos < strokes.length && strokes[pos]!.src <= at) pos += 1
    }
    drawRail()
    drawHead()
    paint()
  }

  const pace = (ch: string) => {
    const base = 1000 / speedOf()
    if (!(options.humanize ?? true)) return base
    let factor = 0.55 + Math.random() * 0.9
    if (ch === " ") factor *= 1.15
    else if (/[,;:]/.test(ch)) factor *= 2.4
    else if (/[.!?]/.test(ch)) factor *= 3.4
    if (Math.random() < 0.04) factor *= 2.6
    return base * factor
  }

  /** Spin the glyph round, strike, then step the carriage a cell right. */
  const strike = (stroke: Extract<TypewriterStroke, { kind: "char" }>) => {
    const base = 1000 / speedOf()
    const spin = stroke.ch === " " ? 0 : clamp(base * 0.4, 16, 70)
    const step = Math.min(90, base * 0.7)
    if (stroke.ch !== " ") {
      ball.select(stroke.ch, spin)
      letter(stroke).animate([{ opacity: 0 }, {}], {
        duration: Math.min(70, step),
        delay: spin,
        easing: "ease-out",
        fill: "backwards",
      })
      ball.el.animate(
        [
          { transform: "translateY(0)" },
          { transform: `translateY(${(-m.fs * 0.22).toFixed(2)}px)` },
          { transform: "translateY(0)" },
        ],
        {
          duration: Math.min(110, base * 0.9),
          delay: spin * 0.55,
          easing: "cubic-bezier(.3,.7,.4,1)",
        }
      )
    }
    cursor = { line: stroke.line, col: stroke.col + 1 }
    placeHead(cursor.col, step, "cubic-bezier(.2,.8,.2,1)", spin)
    const audio = soundOn()
    audio?.key(stroke.ch === " ")
    if (
      !rang &&
      cursor.col >= m.columns - BELL_CELLS &&
      m.columns > BELL_CELLS * 2
    ) {
      rang = true
      audio?.bell()
    }
  }

  /** Whirl home along the rail and drop a line. */
  const carriageReturn = (
    stroke: Extract<TypewriterStroke, { kind: "return" }>
  ) => {
    const glide = clamp(200 + stroke.from * 7, 240, 620)
    const drop = 260
    cursor = { line: stroke.line, col: 0 }
    rang = false
    const next = Math.max(scroll, scrollFor(cursor.line))
    if (next !== scroll) {
      scroll = next
      placePage(drop, "cubic-bezier(.3,.7,.2,1)")
    }
    placeCarriage(cursor.line, drop, "cubic-bezier(.3,.7,.2,1)")
    placeHead(0, glide, "cubic-bezier(.65,0,.25,1)")
    if (stroke.from > 0) {
      ball.whirl(-(0.5 + stroke.from / Math.max(1, m.columns)), glide)
    }
    soundOn()?.carriage(glide)
    return glide
  }

  const finish = () => {
    setPhase("done")
    options.onDone?.()
    if (options.loop ?? true) schedule(feedOut, holdOf())
  }

  const step = () => {
    if (pos >= strokes.length) {
      finish()
      return
    }
    if (phase !== "typing") setPhase("typing")
    const stroke = strokes[pos++]!
    if (stroke.kind === "char") {
      strike(stroke)
      schedule(step, pace(stroke.ch))
    } else {
      const glide = carriageReturn(stroke)
      schedule(step, glide + pace(" ") * 0.8)
    }
  }

  /** Pull the finished sheet up and out, bring the carriage home, go again. */
  const feedOut = () => {
    setPhase("feeding")
    const ms = 820
    const pull = "cubic-bezier(.55,0,.75,.2)"
    const lift = lineTop(cursor.line + 1) + m.lh
    page.style.transition = `transform ${ms}ms ${pull}, opacity ${ms}ms ease-in`
    page.style.transform = `translate3d(0,${-scroll - lift}px,0)`
    page.style.opacity = "0"
    scroll = 0
    // Same curve as the sheet, which travels further, so the carriage rises
    // behind the last line instead of through it.
    placeCarriage(0, ms, pull)
    placeHead(0, ms, "cubic-bezier(.65,0,.35,1)")
    if (cursor.col > 0) ball.whirl(-1, ms)
    schedule(() => {
      pos = 0
      page.style.opacity = ""
      paint()
      setPhase("waiting")
      schedule(step, startOf() * 0.6)
    }, ms + 60)
  }

  const start = () => {
    cancel()
    page.style.opacity = ""
    strokes = layoutTypewriter(textOf(), m.columns)
    spoken.textContent = textOf()
    if (reduce) {
      pos = strokes.length
      setPhase("done")
      paint()
      return
    }
    pos = 0
    setPhase("waiting")
    paint()
    schedule(step, startOf())
  }

  measure()
  drawRail()
  drawHead()

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  reduce = mqReduce.matches
  const onReduce = () => {
    reduce = mqReduce.matches
    start()
  }
  mqReduce.addEventListener("change", onReduce)

  start()

  const onResize = () => {
    if (measure()) relayout()
    else {
      scroll = Math.max(scroll, scrollFor(cursor.line))
      placePage()
      placeCarriage(cursor.line)
    }
  }
  const ro = new ResizeObserver(onResize)
  ro.observe(root)
  // Webfonts can land after mount and change the cell width.
  void document.fonts?.ready.then(() => {
    if (!destroyed) onResize()
  })

  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true
    sync()
  })
  io.observe(root)
  const onVisibility = () => sync()
  document.addEventListener("visibilitychange", onVisibility)

  return {
    setOptions(next) {
      const prev = options
      options = { ...options, ...next }
      if (textOf() !== (prev.text ?? DEFAULT_TEXT)) {
        start()
        return
      }
      if (options.columns !== prev.columns) {
        measure()
        relayout()
      } else if (options.jitter !== prev.jitter) {
        paint()
      }
      if (options.ticks !== prev.ticks) drawRail()
      const loop = options.loop ?? true
      if (loop !== (prev.loop ?? true) && phase === "done") {
        if (loop) schedule(feedOut, holdOf())
        else cancel()
      }
    },
    restart: start,
    destroy() {
      destroyed = true
      cancel()
      ball.destroy()
      ro.disconnect()
      io.disconnect()
      mqReduce.removeEventListener("change", onReduce)
      document.removeEventListener("visibilitychange", onVisibility)
      sound?.close()
      spoken.remove()
      stage.remove()
    },
  }
}
