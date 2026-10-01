export const DEFAULT_TEXT =
  "Dear reader,\nevery key is wired to a typebar. Press one and its bar swings up out of the basket, strikes the ribbon, and the carriage steps left for the next letter.\n\nYours, 23rd"

/** Enamel of the body and paper rest — a vintage mint. */
export const DEFAULT_COLOR = "#8EC3B5"
/** Characters per second. */
export const DEFAULT_SPEED = 12
/** Line length on the sheet, in characters. */
export const DEFAULT_COLUMNS = 32
/** Pause on the finished page before it feeds out and starts over, in ms. */
export const DEFAULT_HOLD = 2600
/** Wait before the first keystroke, in ms. */
export const DEFAULT_START_DELAY = 600
/** Per-letter baseline, tilt, and ink wobble (0–1). */
export const DEFAULT_JITTER = 0.3

/** Bell rings this many characters before the right margin. */
const BELL_CELLS = 6

export type TypewriterOptions = {
  /** What gets typed. `\n` starts a new line; long lines wrap at words. */
  text?: string
  /** Characters per second. Default `12`. */
  speed?: number
  /** Uneven keystrokes, with longer rests after punctuation. Default `true`. */
  humanize?: boolean
  /** Pull the sheet out and type it again after `hold`. Default `true`. */
  loop?: boolean
  /** Pause on the finished page before looping, in ms. Default `2600`. */
  hold?: number
  /** Wait before the first keystroke, in ms. Default `600`. */
  startDelay?: number
  /** Body enamel, any CSS color. Default `#8EC3B5`. */
  color?: string
  /** Line length on the sheet, in characters (16–60). Default `32`. */
  columns?: number
  /** Per-letter baseline, tilt, and ink wobble, 0–1. Default `0.3`. */
  jitter?: number
  /** Synthesized key clicks, bell, and return. Default `false`. */
  sound?: boolean
  /** Called each time the last character lands. */
  onDone?: () => void
}

export type TypewriterInstance = {
  setOptions: (options: Partial<TypewriterOptions>) => void
  /** Feed a fresh sheet and type from the first character. */
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

// The machine is drawn in one SVG coordinate space, seen from the front and
// a little above. The print point sits at the origin: the line being typed
// has its baseline on y = 0, and the carriage slides so the next column
// always lands at x = 0. Light comes from the upper left.

/** Character pitch on the sheet. */
const CW = 10
/** Line pitch on the sheet. */
const LH = 22
const FONT = 16.5
/** Sheet margin either side of the text. */
const PAD = 30
/** Sheet above the first baseline once it's fed in. */
const TOP_MARGIN = 38
const VIEW_TOP = -178
const VIEW_BOTTOM = 314
/** Where a typebar's slug lands: the middle of the glyph on the print line. */
const STRIKE_Y = -5
/** Centre of the typebar basket, under the print point. */
const BASKET_Y = 42
const PIVOT_R = 56
const REST_R = 27
/** Half the basket's fan, in radians from straight down. */
const SPREAD = (74 * Math.PI) / 180
/** Platen knob radius, for how far it turns per line. */
const KNOB_R = 21
const RIDGES = 11
const SPOOL_Y = 80
const SPOOL_X = 150
const KEY_ROWS = ["1234567890", "qwertyuiop", "asdfghjkl;", "zxcvbnm,./"]
const KEY_Y = [136, 166, 196, 226]
const KEY_PITCH = 35
const KEY_R = 12.5
/** Key tops are circles seen from above: this squashes them. */
const KEY_TILT = 0.64
/** How far a key travels when pressed. */
const KEY_TRAVEL = 4
/** Shifted characters, and the key that types them. */
const SHIFTED: Record<string, string> = {
  "!": "1",
  '"': "2",
  "#": "3",
  $: "4",
  "%": "5",
  _: "6",
  "&": "7",
  "'": "8",
  "(": "9",
  ")": "0",
  ":": ";",
  "?": "/",
  "<": ",",
  ">": ".",
}

const INK = "#24221F"
const LEGEND = "#EFE7D1"
const RIBBON_BLACK = "#16171A"
const RIBBON_RED = "#C4342B"
const CHROME = "#D3D8DC"
const CHROME_EDGE = "#5E656C"
const SHEET = "var(--typewriter-sheet, #FBF9F3)"

/** An SVG element. A `fill` of `"sheet"` paints in the paper tone. */
function draw<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  parent?: Element
) {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "fill" && value === "sheet") node.style.fill = SHEET
    else node.setAttribute(key, String(value))
  }
  parent?.append(node)
  return node
}

type Rgb = [number, number, number]

let swatch: CanvasRenderingContext2D | null = null

/** Any CSS color as RGB, via a one-pixel canvas. */
function rgbOf(color: string, fallback: Rgb): Rgb {
  swatch ??= document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true })
  if (!swatch) return fallback
  swatch.clearRect(0, 0, 1, 1)
  swatch.fillStyle = `rgb(${fallback.join(" ")})`
  swatch.fillStyle = color
  swatch.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = swatch.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

function mix(a: Rgb, b: Rgb, t: number) {
  const c = a.map((v, i) => Math.round(v + (b[i]! - v) * t))
  return `rgb(${c.join(" ")})`
}

const linear = (t: number) => t
const easeIn = (t: number) => t * t * t
const easeOut = (t: number) => 1 - (1 - t) ** 3
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

/** Down fast, hold, ease back up — a key, a typebar, the ribbon. */
function pulse(t: number, from: number, rise: number, hold: number) {
  if (t < rise) return from + (1 - from) * easeOut(t / rise)
  if (t < rise + hold) return 1
  return 1 - easeInOut((t - rise - hold) / Math.max(0.001, 1 - rise - hold))
}

/** A point on the basket, `angle` radians from straight down. */
function polar(r: number, angle: number): [number, number] {
  return [r * Math.sin(angle), BASKET_Y + r * Math.cos(angle)]
}

type Bar = {
  rest: SVGGElement
  strike: SVGGElement
  /** Dark edge under the bar, so it reads over the paper. */
  edge: SVGLineElement
  core: SVGLineElement
  slug: SVGLineElement
  pivot: [number, number]
  tip: [number, number]
  v: number
}

type Key = { cap: SVGGElement; bar: Bar | null; v: number }

type Machine = {
  columns: number
  carriage: SVGGElement
  paper: SVGGElement
  sheet: SVGRectElement
  shadow: SVGRectElement
  ink: SVGGElement
  lever: SVGGElement
  leverPivot: [number, number]
  knobs: { x: number; lines: SVGLineElement[] }[]
  keys: Map<string, Key>
  shifts: Key[]
  space: Key
  basket: SVGGElement
  bars: Bar[]
  ribbon: { path: SVGPathElement; dy: number }[]
  vibrator: SVGGElement
  spools: SVGGElement[]
}

/**
 * Draw the whole typewriter into `svg`: the carriage (rail, paper rest,
 * platen, knobs, return lever, sheet, scale) and the body (enamel shell,
 * typebar basket, ribbon spools, ribbon, keyboard). `color` is the enamel;
 * its lights and shadows are mixed from it.
 */
function drawMachine(
  svg: SVGSVGElement,
  id: string,
  columns: number,
  color: string
): Machine {
  const span = columns * CW
  const platenL = -PAD - 22
  const platenR = span + PAD + 22
  const knobW = 15
  const leverX = platenL - knobW - 4
  // Room for the carriage at both ends of its travel, and the body.
  const left = leverX - 56 - (span + CW / 2)
  const right = platenR + knobW - CW / 2
  const half = Math.ceil(Math.max(-left, right, 262) + 14)
  svg.replaceChildren()
  svg.setAttribute(
    "viewBox",
    `${-half} ${VIEW_TOP} ${half * 2} ${VIEW_BOTTOM - VIEW_TOP}`
  )

  const base = rgbOf(color, [142, 195, 181])
  const white: Rgb = [255, 255, 255]
  const black: Rgb = [0, 0, 0]
  const enamel = {
    shine: mix(base, white, 0.62),
    hi: mix(base, white, 0.34),
    light: mix(base, white, 0.14),
    mid: mix(base, base, 0),
    low: mix(base, black, 0.16),
    deep: mix(base, black, 0.34),
    edge: mix(base, black, 0.55),
  }

  /* Gradients. */
  const defs = draw("defs", {}, svg)
  const gradient = (
    name: string,
    kind: "linearGradient" | "radialGradient",
    attrs: Record<string, string | number>,
    stops: [number, string, number?][]
  ) => {
    const el = draw(kind, { id: `${id}-${name}`, ...attrs }, defs)
    for (const [offset, stopColor, alpha = 1] of stops) {
      draw(
        "stop",
        { offset, "stop-color": stopColor, "stop-opacity": alpha },
        el
      )
    }
    return `url(#${id}-${name})`
  }
  const down = { x1: 0, y1: 0, x2: 0, y2: 1 }
  const across = { x1: 0, y1: 0, x2: 1, y2: 0 }
  const fills = {
    body: gradient("body", "linearGradient", down, [
      [0, enamel.hi],
      [0.18, enamel.light],
      [0.62, enamel.mid],
      [1, enamel.low],
    ]),
    sides: gradient("sides", "linearGradient", across, [
      [0, "#000", 0.26],
      [0.1, "#000", 0.04],
      [0.5, "#fff", 0.05],
      [0.9, "#000", 0.04],
      [1, "#000", 0.3],
    ]),
    front: gradient("front", "linearGradient", down, [
      [0, enamel.low],
      [1, enamel.deep],
    ]),
    rest: gradient("rest", "linearGradient", down, [
      [0, enamel.hi],
      [0.5, enamel.light],
      [1, enamel.low],
    ]),
    chrome: gradient("chrome", "linearGradient", down, [
      [0, "#FDFEFE"],
      [0.38, "#D2D7DB"],
      [0.52, "#8B9298"],
      [0.7, "#C3C8CC"],
      [1, "#EEF0F2"],
    ]),
    chromeV: gradient("chrome-v", "linearGradient", across, [
      [0, "#8B9298"],
      [0.35, "#F4F6F7"],
      [0.6, "#BFC4C9"],
      [1, "#737A80"],
    ]),
    rubber: gradient("rubber", "linearGradient", down, [
      [0, "#55595E"],
      [0.16, "#2A2D31"],
      [0.55, "#0D0E10"],
      [0.85, "#050607"],
      [1, "#1E2124"],
    ]),
    bakelite: gradient("bakelite", "linearGradient", down, [
      [0, "#62666C"],
      [0.2, "#2C2F33"],
      [0.6, "#111214"],
      [1, "#2A2D31"],
    ]),
    capTop: gradient(
      "cap-top",
      "radialGradient",
      { cx: 0.38, cy: 0.3, r: 0.75 },
      [
        [0, "#575C63"],
        [0.55, "#202326"],
        [1, "#0C0D0F"],
      ]
    ),
    capSide: gradient("cap-side", "linearGradient", down, [
      [0, "#9AA1A7"],
      [0.5, "#4B5157"],
      [1, "#2A2E32"],
    ]),
    well: gradient("well", "linearGradient", down, [
      [0, "#08090A"],
      [0.18, "#151719"],
      [1, "#24272A"],
    ]),
    recess: gradient("recess", "radialGradient", { cx: 0.5, cy: 0, r: 1 }, [
      [0, "#030304"],
      [0.7, "#141618"],
      [1, "#24272A"],
    ]),
    spoolRibbon: gradient(
      "spool-ribbon",
      "radialGradient",
      { cx: 0.42, cy: 0.38, r: 0.7 },
      [
        [0, "#3B3E43"],
        [0.7, "#151618"],
        [1, "#060607"],
      ]
    ),
    flange: gradient(
      "flange",
      "radialGradient",
      { cx: 0.36, cy: 0.3, r: 0.85 },
      [
        [0, "#FFFFFF"],
        [0.45, "#CDD2D6"],
        [1, "#7D848A"],
      ]
    ),
    ground: gradient("ground", "radialGradient", { cx: 0.5, cy: 0.5, r: 0.5 }, [
      [0, "#000", 0.34],
      [0.6, "#000", 0.12],
      [1, "#000", 0],
    ]),
    keyShadow: gradient(
      "key-shadow",
      "radialGradient",
      { cx: 0.5, cy: 0.5, r: 0.5 },
      [
        [0, "#000", 0.7],
        [1, "#000", 0],
      ]
    ),
    curl: gradient(
      "curl",
      "linearGradient",
      { gradientUnits: "userSpaceOnUse", x1: 0, y1: 12, x2: 0, y2: 41 },
      [
        [0, "#3A2E1C", 0],
        [0.55, "#3A2E1C", 0.1],
        [1, "#3A2E1C", 0.34],
      ]
    ),
  }

  // The sheet fades out at the top of the frame and tucks behind the
  // platen at the bottom.
  const fade = gradient(
    "fade-g",
    "linearGradient",
    {
      gradientUnits: "userSpaceOnUse",
      x1: 0,
      x2: 0,
      y1: VIEW_TOP,
      y2: 41,
    },
    [
      [0, "#fff", 0],
      [84 / (41 - VIEW_TOP), "#fff", 1],
      [0.998, "#fff", 1],
      [1, "#fff", 0],
    ]
  )
  const box = { x: -4000, y: VIEW_TOP - 4, width: 8000, height: 50 - VIEW_TOP }
  const mask = draw(
    "mask",
    { id: `${id}-fade`, maskUnits: "userSpaceOnUse", ...box },
    defs
  )
  draw("rect", { ...box, fill: fade }, mask)

  // Ground shadow.
  draw("ellipse", { cx: 0, cy: 302, rx: 300, ry: 15, fill: fills.ground }, svg)

  /* ---------------- Carriage ---------------- */

  const carriage = draw("g", {}, svg)
  // Rail it rides on.
  draw(
    "rect",
    {
      x: platenL - knobW - 8,
      y: 40,
      width: platenR - platenL + knobW * 2 + 16,
      height: 6,
      rx: 3,
      fill: fills.chrome,
    },
    carriage
  )
  // Paper rest behind the sheet.
  const tL = -PAD - 16
  const tR = span + PAD + 16
  draw(
    "path",
    {
      d: `M${tL} 10V-80Q${tL} -98 ${tL + 18} -98H${tR - 18}Q${tR} -98 ${tR} -80V10Z`,
      fill: fills.rest,
    },
    carriage
  )
  draw(
    "path",
    {
      d: `M${tL + 1} -80Q${tL + 1} -97 ${tL + 18} -97H${tR - 18}Q${tR - 1} -97 ${tR - 1} -80`,
      fill: "none",
      stroke: enamel.shine,
      "stroke-width": 1.4,
      "stroke-opacity": 0.85,
    },
    carriage
  )
  // Platen, with chrome collars at its ends.
  draw(
    "rect",
    {
      x: platenL,
      y: 6,
      width: platenR - platenL,
      height: 34,
      rx: 4,
      fill: fills.rubber,
    },
    carriage
  )
  draw(
    "rect",
    {
      x: platenL + 4,
      y: 10.5,
      width: platenR - platenL - 8,
      height: 1.6,
      rx: 0.8,
      fill: "#fff",
      "fill-opacity": 0.22,
    },
    carriage
  )
  for (const x of [platenL - 4, platenR]) {
    draw(
      "rect",
      { x, y: 9, width: 4, height: 28, rx: 1, fill: fills.chrome },
      carriage
    )
  }
  // Knobs: bakelite with knurling that turns with the platen.
  const knobs = [platenL - 4 - knobW, platenR + 4].map((x) => {
    draw(
      "rect",
      { x, y: 1, width: knobW, height: 44, rx: 6, fill: fills.bakelite },
      carriage
    )
    const lines = Array.from({ length: RIDGES }, () =>
      draw(
        "line",
        {
          x1: x + 2.5,
          x2: x + knobW - 2.5,
          stroke: "#B8BEC4",
          "stroke-width": 1,
          "stroke-linecap": "round",
        },
        carriage
      )
    )
    draw(
      "rect",
      {
        x: x + 2,
        y: 3,
        width: knobW - 4,
        height: 6,
        rx: 3,
        fill: "#fff",
        "fill-opacity": 0.12,
      },
      carriage
    )
    return { x, lines }
  })
  // Carriage return lever: chrome arm, bakelite grip.
  const lever = draw("g", {}, carriage)
  const leverPivot: [number, number] = [leverX, 30]
  draw(
    "rect",
    {
      x: leverX - 5,
      y: 20,
      width: 10,
      height: 22,
      rx: 3,
      fill: fills.chromeV,
    },
    lever
  )
  const arm = `M${leverX} 28L${leverX - 13} 4L${leverX - 36} -14`
  for (const [stroke, width] of [
    [CHROME_EDGE, 6.4],
    [CHROME, 4],
  ] as const) {
    draw(
      "path",
      {
        d: arm,
        fill: "none",
        stroke,
        "stroke-width": width,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      },
      lever
    )
  }
  draw(
    "path",
    {
      d: `M${leverX - 1} 26L${leverX - 13} 4.5L${leverX - 34} -12`,
      fill: "none",
      stroke: "#fff",
      "stroke-width": 1.2,
      "stroke-opacity": 0.8,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    lever
  )
  draw(
    "rect",
    {
      x: leverX - 56,
      y: -25,
      width: 28,
      height: 11,
      rx: 5.5,
      fill: fills.bakelite,
      transform: `rotate(-24 ${leverX - 42} -19.5)`,
    },
    lever
  )

  // The sheet, masked so it fades at the top and wraps under the platen.
  const wrap = draw("g", { mask: `url(#${id}-fade)` }, carriage)
  const paper = draw("g", {}, wrap)
  const shadow = draw(
    "rect",
    {
      x: -PAD + 3,
      y: -TOP_MARGIN + 3,
      width: span + PAD * 2,
      height: 600,
      fill: "#000",
      "fill-opacity": 0.12,
    },
    paper
  )
  const sheet = draw(
    "rect",
    {
      x: -PAD,
      y: -TOP_MARGIN,
      width: span + PAD * 2,
      height: 600,
      fill: "sheet",
      stroke: "#000",
      "stroke-opacity": 0.07,
      "stroke-width": 0.8,
    },
    paper
  )
  const ink = draw(
    "g",
    { "text-anchor": "middle", "font-size": FONT, fill: INK },
    paper
  )
  // Where the sheet curls round the platen.
  draw(
    "rect",
    {
      x: -PAD,
      y: 12,
      width: span + PAD * 2,
      height: 30,
      fill: fills.curl,
    },
    wrap
  )

  // Paper scale under the print line.
  draw(
    "rect",
    {
      x: -PAD + 2,
      y: 8.5,
      width: span + PAD * 2 - 4,
      height: 6,
      rx: 3,
      fill: fills.chrome,
    },
    carriage
  )
  let ticks = ""
  for (let c = 0; c <= columns; c++) {
    const x = c * CW
    ticks += `M${x} 9.4V${c % 10 === 0 ? 13.6 : c % 5 === 0 ? 12.4 : 11.2}`
  }
  draw(
    "path",
    {
      d: ticks,
      stroke: "#3E444A",
      "stroke-width": 0.7,
      fill: "none",
    },
    carriage
  )

  /* ---------------- Body ---------------- */

  const body = draw("g", {}, svg)
  const shell =
    "M-192 42Q-214 42 -219 62C-228 120 -240 190 -247 246Q-249 262 -232 264H232Q249 262 247 246C240 190 228 120 219 62Q214 42 192 42Z"
  draw("path", { d: shell, fill: fills.body }, body)
  draw("path", { d: shell, fill: fills.sides }, body)
  // Front face, below the top surfaces, with a chrome trim.
  draw(
    "path",
    {
      d: "M-247 248Q-249 262 -232 264H232Q249 262 247 248L245 284Q243 296 227 296H-227Q-243 296 -245 284Z",
      fill: fills.front,
    },
    body
  )
  draw(
    "path",
    {
      d: "M-240 264.5H240",
      stroke: enamel.shine,
      "stroke-width": 1.2,
      "stroke-opacity": 0.7,
    },
    body
  )
  draw(
    "rect",
    {
      x: -236,
      y: 274,
      width: 472,
      height: 3,
      rx: 1.5,
      fill: fills.chrome,
    },
    body
  )
  for (const x of [-228, 188]) {
    draw(
      "rect",
      { x, y: 293, width: 40, height: 10, rx: 4, fill: "#151618" },
      body
    )
  }
  const sheen = gradient("sheen", "linearGradient", across, [
    [0, "#fff", 0.34],
    [0.55, "#fff", 0.1],
    [1, "#fff", 0],
  ])
  draw(
    "path",
    { d: "M-210 48H-96L-150 110H-224Q-222 82 -210 48Z", fill: sheen },
    body
  )
  // Glossy rim along the top of the shell.
  draw(
    "path",
    {
      d: "M-194 43.4H194",
      stroke: enamel.shine,
      "stroke-width": 1.6,
      "stroke-linecap": "round",
    },
    body
  )
  draw(
    "path",
    {
      d: "M-208 56Q-212 70 -216 96",
      stroke: enamel.shine,
      "stroke-width": 2.4,
      "stroke-linecap": "round",
      "stroke-opacity": 0.55,
      fill: "none",
    },
    body
  )

  // Typebar basket, sunk in the deck.
  draw(
    "path",
    {
      d: `M-68 ${BASKET_Y}A68 68 0 0 0 68 ${BASKET_Y}Z`,
      fill: fills.recess,
    },
    body
  )
  draw(
    "path",
    {
      d: `M-68 ${BASKET_Y}A68 68 0 0 0 68 ${BASKET_Y}`,
      fill: "none",
      stroke: enamel.shine,
      "stroke-width": 1.3,
      "stroke-opacity": 0.75,
    },
    body
  )
  const basket = draw("g", {}, body)
  const [ax, ay] = polar(62, -SPREAD - 0.12)
  const [bx, by] = polar(62, SPREAD + 0.12)
  const [cx, cy] = polar(53, SPREAD + 0.12)
  const [dx, dy] = polar(53, -SPREAD - 0.12)
  draw(
    "path",
    {
      d: `M${ax} ${ay}A62 62 0 0 0 ${bx} ${by}L${cx} ${cy}A53 53 0 0 1 ${dx} ${dy}Z`,
      fill: fills.chrome,
    },
    basket
  )

  // Ribbon spools: black ribbon wound under a turning chrome flange.
  const spools = [-SPOOL_X, SPOOL_X].map((x) => {
    draw(
      "circle",
      { cx: x, cy: SPOOL_Y + 2, r: 27, fill: "#000", "fill-opacity": 0.22 },
      body
    )
    draw("circle", { cx: x, cy: SPOOL_Y, r: 26, fill: fills.flange }, body)
    draw("circle", { cx: x, cy: SPOOL_Y, r: 22, fill: fills.spoolRibbon }, body)
    const turn = draw("g", {}, body)
    let windows = ""
    for (let i = 0; i < 3; i++) {
      const a0 = (i / 3) * TAU + 0.25
      const a1 = a0 + 1.35
      const p = (r: number, a: number) =>
        `${(x + Math.cos(a) * r).toFixed(2)} ${(SPOOL_Y + Math.sin(a) * r).toFixed(2)}`
      windows += `M${p(19, a0)}A19 19 0 0 1 ${p(19, a1)}L${p(8.5, a1)}A8.5 8.5 0 0 0 ${p(8.5, a0)}Z`
    }
    draw(
      "path",
      {
        d: `M${x - 21} ${SPOOL_Y}a21 21 0 1 0 42 0a21 21 0 1 0 -42 0Z${windows}`,
        fill: fills.flange,
        "fill-rule": "evenodd",
      },
      turn
    )
    draw("circle", { cx: x, cy: SPOOL_Y, r: 5, fill: fills.chrome }, turn)
    draw("circle", { cx: x, cy: SPOOL_Y, r: 1.6, fill: "#2A2D31" }, turn)
    return turn
  })

  // The type guide either side of the print point.
  for (const x of [-23, 17]) {
    draw(
      "rect",
      {
        x,
        y: 0,
        width: 6,
        height: 16,
        rx: 1.6,
        fill: fills.chromeV,
        stroke: CHROME_EDGE,
        "stroke-width": 0.8,
      },
      body
    )
  }

  // Two-tone ribbon, black over red, through the vibrator.
  const ribbon = [
    {
      path: draw(
        "path",
        {
          fill: "none",
          stroke: RIBBON_BLACK,
          "stroke-width": 5.8,
          "stroke-linejoin": "round",
        },
        body
      ),
      dy: 0,
    },
    {
      path: draw(
        "path",
        {
          fill: "none",
          stroke: RIBBON_RED,
          "stroke-width": 2.6,
          "stroke-linejoin": "round",
        },
        body
      ),
      dy: 1.5,
    },
  ]
  const vibrator = draw("g", {}, body)
  for (const [stroke, width] of [
    [CHROME_EDGE, 3.8],
    [CHROME, 2],
  ] as const) {
    draw(
      "path",
      {
        d: "M-12 2.5V11.5H12V2.5",
        fill: "none",
        stroke,
        "stroke-width": width,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
      },
      vibrator
    )
  }

  // Keyboard well.
  draw(
    "path",
    {
      d: "M-204 112H204Q217 112 219 125L233 240Q235 254 220 254H-220Q-235 254 -233 240L-219 125Q-217 112 -204 112Z",
      fill: fills.well,
    },
    body
  )
  draw(
    "path",
    {
      d: "M-219.5 126Q-217.5 111 -204 111H204Q217.5 111 219.5 126",
      fill: "none",
      stroke: enamel.shine,
      "stroke-width": 1.3,
      "stroke-opacity": 0.8,
    },
    body
  )
  draw(
    "path",
    {
      d: "M-226 254.6H226",
      stroke: enamel.shine,
      "stroke-width": 1.2,
      "stroke-opacity": 0.6,
    },
    body
  )

  const ry = KEY_R * KEY_TILT
  const height = 4.5
  /** A round key on its stem, seen from above: rim, cap, legend, shadow. */
  const keyAt = (x: number, y: number, label: string) => {
    draw(
      "ellipse",
      {
        cx: x + 2,
        cy: y + 21,
        rx: 11,
        ry: 4,
        fill: fills.keyShadow,
      },
      body
    )
    draw(
      "rect",
      {
        x: x - 1.5,
        y: y + 4,
        width: 3,
        height: 19,
        rx: 1,
        fill: fills.chromeV,
      },
      body
    )
    const cap = draw("g", {}, body)
    draw(
      "path",
      {
        d: `M${x - KEY_R} ${y}V${y + height}A${KEY_R} ${ry} 0 0 0 ${x + KEY_R} ${y + height}V${y}A${KEY_R} ${ry} 0 0 1 ${x - KEY_R} ${y}Z`,
        fill: fills.capSide,
      },
      cap
    )
    draw("ellipse", { cx: x, cy: y, rx: KEY_R, ry, fill: fills.chrome }, cap)
    draw(
      "ellipse",
      {
        cx: x,
        cy: y + 0.3,
        rx: KEY_R - 2.3,
        ry: ry - 1.6,
        fill: fills.capTop,
      },
      cap
    )
    draw(
      "ellipse",
      {
        cx: x - 3.4,
        cy: y - 2.6,
        rx: 4.4,
        ry: 1.6,
        fill: "#fff",
        "fill-opacity": 0.2,
      },
      cap
    )
    const text = draw(
      "text",
      {
        x,
        y: y + 0.7,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-size": 9.6,
        "font-weight": 600,
        fill: LEGEND,
        transform: `matrix(1 0 0 0.74 0 ${(y * 0.26).toFixed(2)})`,
      },
      cap
    )
    text.textContent = label
    return cap
  }

  const keys = new Map<string, Key>()
  const placed: { x: number; key: Key }[] = []
  KEY_ROWS.forEach((row, r) => {
    Array.from(row).forEach((ch, i) => {
      const x = -157.5 + (r - 1.5) * 9 + i * KEY_PITCH
      const key: Key = {
        cap: keyAt(x, KEY_Y[r]!, ch.toUpperCase()),
        bar: null,
        v: 0,
      }
      keys.set(ch, key)
      placed.push({ x, key })
    })
  })

  /** A pill key (shift, space): same rim and cap, stretched. */
  const pill = (x: number, y: number, w: number, legend?: string) => {
    for (const sx of [x - w * 0.3, x + w * 0.3]) {
      draw(
        "rect",
        {
          x: sx - 1.5,
          y: y + 4,
          width: 3,
          height: 17,
          rx: 1,
          fill: fills.chromeV,
        },
        body
      )
    }
    draw(
      "ellipse",
      {
        cx: x + 2,
        cy: y + 19,
        rx: w / 2 + 2,
        ry: 4,
        fill: fills.keyShadow,
      },
      body
    )
    const cap = draw("g", {}, body)
    const r = ry
    draw(
      "rect",
      {
        x: x - w / 2,
        y: y - r + height,
        width: w,
        height: r * 2,
        rx: r,
        fill: fills.capSide,
      },
      cap
    )
    draw(
      "rect",
      {
        x: x - w / 2,
        y: y - r,
        width: w,
        height: r * 2,
        rx: r,
        fill: fills.chrome,
      },
      cap
    )
    draw(
      "rect",
      {
        x: x - w / 2 + 2.3,
        y: y - r + 1.6,
        width: w - 4.6,
        height: r * 2 - 3.2,
        rx: r - 1.6,
        fill: fills.capTop,
      },
      cap
    )
    if (legend) {
      draw("path", { d: legend, fill: LEGEND }, cap)
    }
    return cap
  }
  const y3 = KEY_Y[3]!
  const shifts = [-1, 1].map((side) => {
    const x = side * 201
    const arrow = `M${x} ${y3 - 3.6}L${x + 4} ${y3 + 0.6}H${x + 1.6}V${y3 + 3.4}H${x - 1.6}V${y3 + 0.6}H${x - 4}Z`
    return { cap: pill(x, y3, 30, arrow), bar: null, v: 0 } satisfies Key
  })

  // Space bar: a chrome bar on two arms.
  for (const sx of [-80, 80]) {
    draw(
      "rect",
      {
        x: sx - 1.5,
        y: 247,
        width: 3,
        height: 7,
        fill: fills.chromeV,
      },
      body
    )
  }
  const spaceCap = draw("g", {}, body)
  draw(
    "rect",
    {
      x: -112,
      y: 242,
      width: 224,
      height: 9,
      rx: 4.5,
      fill: "#4E555B",
    },
    spaceCap
  )
  draw(
    "rect",
    {
      x: -112,
      y: 239.5,
      width: 224,
      height: 8,
      rx: 4,
      fill: fills.chrome,
    },
    spaceCap
  )
  const space: Key = { cap: spaceCap, bar: null, v: 0 }

  // One typebar per key, fanned left to right in key order.
  const overlay = draw("g", {}, svg)
  placed.sort((a, b) => a.x - b.x)
  const bars = placed.map(({ key }, i) => {
    const angle = -SPREAD + (2 * SPREAD * i) / (placed.length - 1)
    const pivot = polar(PIVOT_R, angle)
    const tip = polar(REST_R, angle)
    const rest = draw("g", {}, basket)
    draw(
      "line",
      {
        x1: pivot[0],
        y1: pivot[1],
        x2: tip[0],
        y2: tip[1],
        stroke: i % 2 ? "#C4C9CE" : "#E6E9EC",
        "stroke-width": 1.25,
        "stroke-linecap": "round",
      },
      rest
    )
    const [sx, sy] = polar(REST_R + 3.4, angle)
    draw(
      "line",
      {
        x1: sx,
        y1: sy,
        x2: tip[0],
        y2: tip[1],
        stroke: "#7D848A",
        "stroke-width": 2.6,
        "stroke-linecap": "round",
      },
      rest
    )
    const strike = draw("g", { display: "none" }, overlay)
    const line = (stroke: string, width: number) =>
      draw(
        "line",
        { stroke, "stroke-width": width, "stroke-linecap": "round" },
        strike
      )
    const edge = line("#1C1E21", 3.9)
    const core = line("#E2E5E8", 1.8)
    const slug = line("#2A2D31", 5.6)
    const bar: Bar = { rest, strike, edge, core, slug, pivot, tip, v: 0 }
    key.bar = bar
    return bar
  })

  return {
    columns,
    carriage,
    paper,
    sheet,
    shadow,
    ink,
    lever,
    leverPivot,
    knobs,
    keys,
    shifts,
    space,
    basket,
    bars,
    ribbon,
    vibrator,
    spools,
  }
}

type Motion = {
  key: string
  start: number
  ms: number
  ease: (t: number) => number
  run: (v: number) => void
  begin?: () => void
}

let machineIds = 0

/**
 * A typewriter that types. Each letter presses its key, swings that key's
 * typebar up out of the basket to strike the ribbon, and the carriage
 * steps one character left. Capitals hold shift, which drops the basket. At
 * the margin the return lever kicks, the platen turns up a line, and the
 * carriage slides home. With `loop`, the finished sheet is pulled out and
 * a fresh one rolls in. `color` is the enamel; chrome, rubber, and the
 * ivory sheet are fixed. `prefers-reduced-motion` prints the whole page at
 * once.
 */
export function createTypewriter(
  root: HTMLElement,
  initial: TypewriterOptions = {}
): TypewriterInstance {
  let options: TypewriterOptions = { ...initial }
  const textOf = () => options.text ?? DEFAULT_TEXT
  const speedOf = () => numberOr(options.speed, DEFAULT_SPEED, 1, 60)
  const holdOf = () => numberOr(options.hold, DEFAULT_HOLD, 0, 60000)
  const startOf = () =>
    numberOr(options.startDelay, DEFAULT_START_DELAY, 0, 60000)
  const jitterOf = () => numberOr(options.jitter, DEFAULT_JITTER, 0, 1)
  const columnsOf = () =>
    Math.round(numberOr(options.columns, DEFAULT_COLUMNS, 16, 60))
  const id = `typewriter-${++machineIds}`

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
  const svg = draw("svg", {
    width: "100%",
    height: "100%",
    preserveAspectRatio: "xMidYMid meet",
    "aria-hidden": "true",
  })
  svg.style.display = "block"
  root.append(spoken, svg)

  let M!: Machine

  /* ---------------------------------------------------------------- */
  /* Drawing                                                           */
  /* ---------------------------------------------------------------- */

  const build = () => {
    M = drawMachine(svg, id, columnsOf(), options.color ?? DEFAULT_COLOR)
  }

  /* ---------------------------------------------------------------- */
  /* Poses                                                             */
  /* ---------------------------------------------------------------- */

  const pose = {
    carriage: 0,
    paper: 0,
    knob: 0,
    spool: 0,
    lever: 0,
    shift: 0,
    ribbon: 0,
  }

  const carriageAt = (col: number) => -(col * CW + CW / 2)

  const setCarriage = (x: number) => {
    pose.carriage = x
    M.carriage.setAttribute("transform", `translate(${x.toFixed(2)} 0)`)
  }
  const setPaper = (y: number) => {
    pose.paper = y
    M.paper.setAttribute("transform", `translate(0 ${y.toFixed(2)})`)
  }
  /** Knurling on the platen knobs, scrolling as the platen turns. */
  const setKnob = (phase: number) => {
    pose.knob = phase
    for (const knob of M.knobs) {
      knob.lines.forEach((line, i) => {
        const a = phase + (i / RIDGES) * TAU
        const facing = Math.cos(a)
        if (facing <= 0.05) {
          line.setAttribute("stroke-opacity", "0")
          return
        }
        const y = (23 + Math.sin(a) * 19).toFixed(2)
        line.setAttribute("y1", y)
        line.setAttribute("y2", y)
        line.setAttribute("stroke-opacity", (0.18 + facing * 0.42).toFixed(2))
      })
    }
  }
  const setSpool = (deg: number) => {
    pose.spool = deg
    M.spools.forEach((spool, i) => {
      const x = i === 0 ? -SPOOL_X : SPOOL_X
      spool.setAttribute(
        "transform",
        `rotate(${(i === 0 ? -deg : deg).toFixed(1)} ${x} ${SPOOL_Y})`
      )
    })
  }
  const setLever = (deg: number) => {
    pose.lever = deg
    const [x, y] = M.leverPivot
    M.lever.setAttribute("transform", `rotate(${deg.toFixed(2)} ${x} ${y})`)
  }
  const setShift = (v: number) => {
    pose.shift = v
    M.basket.setAttribute("transform", `translate(0 ${(v * 4).toFixed(2)})`)
    for (const key of M.shifts) setKey(key, v)
  }
  /** The ribbon vibrator lifts the ribbon over the print point. */
  const setRibbon = (v: number) => {
    pose.ribbon = v
    const lift = v * 13
    const y = 7.5 - lift
    const top = SPOOL_Y - 24
    for (const { path, dy } of M.ribbon) {
      path.setAttribute(
        "d",
        `M${-SPOOL_X} ${top + dy}L-12 ${(y + dy).toFixed(2)}H12L${SPOOL_X} ${top + dy}`
      )
    }
    M.vibrator.setAttribute("transform", `translate(0 ${(-lift).toFixed(2)})`)
  }
  const setKey = (key: Key, v: number) => {
    key.v = v
    key.cap.setAttribute(
      "transform",
      v > 0.001 ? `translate(0 ${(v * KEY_TRAVEL).toFixed(2)})` : ""
    )
  }
  /** 0 rests in the basket; 1 is the slug on the paper. */
  const setBar = (bar: Bar, v: number) => {
    bar.v = v
    if (v <= 0.001) {
      bar.rest.removeAttribute("display")
      bar.strike.setAttribute("display", "none")
      return
    }
    bar.rest.setAttribute("display", "none")
    bar.strike.removeAttribute("display")
    const drop = pose.shift * 4
    const [px, py0] = bar.pivot
    const py = py0 + drop
    const tx = bar.tip[0] + (0 - bar.tip[0]) * v
    const ty = bar.tip[1] + drop + (STRIKE_Y - bar.tip[1] - drop) * v
    const len = Math.hypot(tx - px, ty - py) || 1
    const ux = (tx - px) / len
    const uy = (ty - py) / len
    for (const line of [bar.edge, bar.core]) {
      line.setAttribute("x1", px.toFixed(2))
      line.setAttribute("y1", py.toFixed(2))
      line.setAttribute("x2", tx.toFixed(2))
      line.setAttribute("y2", ty.toFixed(2))
    }
    bar.slug.setAttribute("x1", (tx - ux * 6).toFixed(2))
    bar.slug.setAttribute("y1", (ty - uy * 6).toFixed(2))
    bar.slug.setAttribute("x2", tx.toFixed(2))
    bar.slug.setAttribute("y2", ty.toFixed(2))
  }

  /** Everything at rest, the carriage and sheet where the text has got to. */
  const restPose = () => {
    setCarriage(carriageAt(cursor.col))
    setPaper(-cursor.line * LH)
    setKnob(pose.knob)
    setSpool(pose.spool)
    setLever(0)
    setShift(0)
    setRibbon(0)
    for (const key of M.keys.values()) setKey(key, 0)
    setKey(M.space, 0)
    for (const bar of M.bars) setBar(bar, 0)
  }

  /* ---------------------------------------------------------------- */
  /* Motion                                                            */
  /* ---------------------------------------------------------------- */

  const queued: Motion[] = []
  const running = new Map<string, Motion>()
  let raf = 0

  const frame = (now: number) => {
    raf = 0
    queued.sort((a, b) => a.start - b.start)
    while (queued.length && queued[0]!.start <= now) {
      const motion = queued.shift()!
      motion.begin?.()
      running.set(motion.key, motion)
    }
    for (const [key, motion] of running) {
      const t = clamp((now - motion.start) / motion.ms, 0, 1)
      motion.run(motion.ease(t))
      if (t >= 1) running.delete(key)
    }
    if (queued.length || running.size) raf = requestAnimationFrame(frame)
  }
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(frame)
  }
  /** Run `run(0…1)` over `ms`. A motion with the same key replaces it. */
  const play = (
    key: string,
    ms: number,
    run: (v: number) => void,
    {
      delay = 0,
      ease = linear,
      begin,
    }: {
      delay?: number
      ease?: (t: number) => number
      begin?: () => void
    } = {}
  ) => {
    queued.push({
      key,
      start: performance.now() + delay,
      ms: Math.max(1, ms),
      ease,
      run,
      begin,
    })
    wake()
  }
  /** Ease a pose from wherever it is when the motion starts. */
  const tween = (
    key: string,
    get: () => number,
    set: (v: number) => void,
    to: number,
    ms: number,
    opts: { delay?: number; ease?: (t: number) => number } = {}
  ) => {
    let from = 0
    play(key, ms, (v) => set(from + (to - from) * v), {
      ...opts,
      begin: () => {
        from = get()
      },
    })
  }
  const stopMotion = () => {
    queued.length = 0
    running.clear()
    cancelAnimationFrame(raf)
    raf = 0
  }

  const press = (name: string, key: Key, ms: number, delay = 0) => {
    let from = 0
    play(name, ms, (t) => setKey(key, pulse(t, from, 0.22, 0.28)), {
      delay,
      begin: () => {
        from = key.v
      },
    })
  }

  /* ---------------------------------------------------------------- */
  /* Typing                                                            */
  /* ---------------------------------------------------------------- */

  let strokes: TypewriterStroke[] = []
  /** Strokes on the page. */
  let pos = 0
  let cursor = { line: 0, col: 0 }
  let sheetH = 600
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
  const sync = () => {
    if (active()) {
      if (pending && !timer) arm()
    } else if (timer) {
      window.clearTimeout(timer)
      timer = 0
      remaining = Math.max(0, dueAt - performance.now())
    }
  }

  const soundOn = () => {
    if (!options.sound) return null
    sound ??= createSound()
    return sound
  }

  const after = (stroke: TypewriterStroke | undefined) => {
    if (!stroke) return { line: 0, col: 0 }
    return stroke.kind === "char"
      ? { line: stroke.line, col: stroke.col + 1 }
      : { line: stroke.line, col: 0 }
  }

  const letter = (stroke: Extract<TypewriterStroke, { kind: "char" }>) => {
    const jitter = jitterOf()
    const n = Math.floor(stroke.src) * 4
    const x = stroke.col * CW + CW / 2
    const y = stroke.line * LH
    const el = draw("text", { x, y }, M.ink)
    el.textContent = stroke.ch
    let ink = 1
    if (jitter > 0) {
      const dx = (hash(n) - 0.5) * jitter * 1.1
      const dy = (hash(n + 1) - 0.5) * jitter * 1.6
      const tilt = (hash(n + 2) - 0.5) * jitter * 3.2
      el.setAttribute(
        "transform",
        `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${tilt.toFixed(2)} ${x} ${y})`
      )
      ink = 1 - hash(n + 3) * jitter * 0.42
    }
    el.setAttribute("fill-opacity", ink.toFixed(3))
    return { el, ink }
  }

  const sizeSheet = () => {
    const lines = (strokes.at(-1)?.line ?? 0) + 1
    sheetH = Math.max(
      TOP_MARGIN + lines * LH + 60,
      (M.columns * CW + PAD * 2) * 1.3
    )
    M.sheet.setAttribute("height", sheetH.toFixed(0))
    M.shadow.setAttribute("height", sheetH.toFixed(0))
  }

  /** Print the first `pos` strokes and park the machine, without motion. */
  const paint = () => {
    M.ink.replaceChildren()
    for (let i = 0; i < pos; i++) {
      const stroke = strokes[i]!
      if (stroke.kind === "char" && stroke.ch !== " ") letter(stroke)
    }
    cursor = after(strokes[pos - 1])
    rang = cursor.col >= M.columns - BELL_CELLS
    restPose()
  }

  const keyFor = (ch: string) => {
    const lower = ch.toLowerCase()
    const own = M.keys.get(lower)
    if (own) return { key: own, shift: ch !== lower }
    const base = SHIFTED[ch]
    if (base) return { key: M.keys.get(base)!, shift: true }
    // Anything the keyboard doesn't have borrows a key.
    const all = [...M.keys.values()]
    return {
      key: all[(ch.codePointAt(0) ?? 0) % all.length]!,
      shift: false,
    }
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

  /** Press the key, swing its bar into the ribbon, step the carriage. */
  const strike = (stroke: Extract<TypewriterStroke, { kind: "char" }>) => {
    const base = 1000 / speedOf()
    const ms = clamp(base * 1.7, 90, 170)
    const audio = soundOn()
    const step = carriageAt(stroke.col + 1)
    cursor = { line: stroke.line, col: stroke.col + 1 }

    if (stroke.ch === " ") {
      press("space", M.space, ms)
      tween("carriage", () => pose.carriage, setCarriage, step, ms * 0.4, {
        delay: ms * 0.2,
        ease: easeOut,
      })
      audio?.key(true)
    } else {
      const { key, shift } = keyFor(stroke.ch)
      const lead = shift ? ms * 0.25 : 0
      const impact = lead + ms * 0.42
      if (shift) {
        let from = 0
        play("shift", ms * 1.6, (t) => setShift(pulse(t, from, 0.16, 0.5)), {
          begin: () => {
            from = pose.shift
          },
        })
      }
      press(`key-${stroke.ch.toLowerCase()}`, key, ms * 1.1, lead)
      const bar = key.bar
      if (bar) {
        let from = 0
        play(
          `bar-${M.bars.indexOf(bar)}`,
          ms,
          (t) => {
            const v =
              t < 0.42
                ? from + (1 - from) * easeIn(t / 0.42)
                : 1 - easeOut((t - 0.42) / 0.58)
            setBar(bar, v)
          },
          {
            delay: lead,
            begin: () => {
              from = bar.v
            },
          }
        )
      }
      let lifted = 0
      play("ribbon", ms * 0.9, (t) => setRibbon(pulse(t, lifted, 0.4, 0.08)), {
        delay: lead + ms * 0.08,
        begin: () => {
          lifted = pose.ribbon
        },
      })
      const { el, ink } = letter(stroke)
      el.setAttribute("fill-opacity", "0")
      play(
        `ink-${stroke.src}`,
        60,
        (v) => {
          el.setAttribute("fill-opacity", (v * ink).toFixed(3))
        },
        { delay: impact }
      )
      tween("carriage", () => pose.carriage, setCarriage, step, ms * 0.36, {
        delay: impact + 6,
        ease: easeOut,
      })
      tween("spool", () => pose.spool, setSpool, pose.spool + 5, ms * 0.3, {
        delay: impact,
      })
      if (audio) window.setTimeout(() => audio.key(false), impact)
    }

    if (
      !rang &&
      cursor.col >= M.columns - BELL_CELLS &&
      M.columns > BELL_CELLS * 2
    ) {
      rang = true
      audio?.bell()
    }
  }

  /** Kick the lever, turn up a line, slide the carriage home. */
  const carriageReturn = (
    stroke: Extract<TypewriterStroke, { kind: "return" }>
  ) => {
    const glide = clamp(220 + stroke.from * 8, 260, 640)
    cursor = { line: stroke.line, col: 0 }
    rang = false
    play("lever", 420, (t) => setLever(-24 * pulse(t, 0, 0.3, 0.12)))
    tween("paper", () => pose.paper, setPaper, -stroke.line * LH, 220, {
      delay: 60,
      ease: easeInOut,
    })
    tween("knob", () => pose.knob, setKnob, pose.knob + LH / KNOB_R, 220, {
      delay: 60,
      ease: easeInOut,
    })
    tween("carriage", () => pose.carriage, setCarriage, carriageAt(0), glide, {
      delay: 130,
      ease: easeInOut,
    })
    soundOn()?.carriage(glide)
    return glide + 130
  }

  const setPhase = (next: typeof phase) => {
    phase = next
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
    setPhase("typing")
    const stroke = strokes[pos++]!
    if (stroke.kind === "char") {
      strike(stroke)
      schedule(step, pace(stroke.ch))
    } else {
      const ms = carriageReturn(stroke)
      schedule(step, ms + pace(" ") * 0.8)
    }
  }

  /** Roll a fresh sheet up from behind the platen. */
  const feedIn = (then: () => void) => {
    setPaper(40 + TOP_MARGIN)
    tween("paper", () => pose.paper, setPaper, 0, 900, { ease: easeOut })
    tween("knob", () => pose.knob, setKnob, pose.knob + 5, 900, {
      ease: easeOut,
    })
    schedule(then, 940)
  }

  /** Pull the finished sheet up and out, bring the carriage home, go again. */
  const feedOut = () => {
    setPhase("feeding")
    const ms = 950
    tween("paper", () => pose.paper, setPaper, VIEW_TOP - sheetH - 20, ms, {
      ease: easeIn,
    })
    tween("knob", () => pose.knob, setKnob, pose.knob + 7, ms, {
      ease: easeIn,
    })
    tween("carriage", () => pose.carriage, setCarriage, carriageAt(0), 720, {
      ease: easeInOut,
    })
    if (cursor.col > 0) {
      play("lever", 420, (t) => setLever(-24 * pulse(t, 0, 0.3, 0.12)))
    }
    schedule(() => {
      pos = 0
      paint()
      setPhase("waiting")
      feedIn(() => schedule(step, startOf() * 0.5))
    }, ms + 40)
  }

  const start = () => {
    cancel()
    stopMotion()
    strokes = layoutTypewriter(textOf(), M.columns)
    spoken.textContent = textOf()
    sizeSheet()
    if (reduce) {
      pos = strokes.length
      setPhase("done")
      paint()
      return
    }
    pos = 0
    setPhase("waiting")
    paint()
    feedIn(() => schedule(step, startOf()))
  }

  /** Redraw for a new line length, keeping the place in the text. */
  const rebuild = () => {
    const at = strokes[pos - 1]?.src ?? -1
    stopMotion()
    build()
    strokes = layoutTypewriter(textOf(), M.columns)
    if (phase === "done") pos = strokes.length
    else {
      pos = 0
      while (pos < strokes.length && strokes[pos]!.src <= at) pos += 1
    }
    sizeSheet()
    paint()
    if (phase === "typing" || phase === "feeding") {
      setPhase("typing")
      schedule(step, 200)
    } else if (phase === "waiting") schedule(step, startOf())
  }

  /* ---------------------------------------------------------------- */
  /* Theme                                                             */
  /* ---------------------------------------------------------------- */

  const isDark = () => {
    const html = document.documentElement
    if (html.classList.contains("dark")) return true
    if (html.classList.contains("light")) return false
    const attr = html.getAttribute("data-theme")
    if (attr === "dark") return true
    if (attr === "light") return false
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  }
  /** Ivory in light, a touch dimmer in dark so it doesn't glare. */
  const applyTheme = () => {
    root.style.setProperty(
      "--typewriter-sheet",
      isDark() ? "#ECE7DA" : "#FBF9F3"
    )
  }

  build()
  applyTheme()

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  reduce = mqReduce.matches
  const onReduce = () => {
    reduce = mqReduce.matches
    start()
  }
  mqReduce.addEventListener("change", onReduce)

  start()

  const theme = new MutationObserver(applyTheme)
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  })
  const mqDark = window.matchMedia("(prefers-color-scheme: dark)")
  mqDark.addEventListener("change", applyTheme)

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
      if (columnsOf() !== M.columns || options.color !== prev.color) rebuild()
      else if (options.jitter !== prev.jitter) {
        for (const motion of running.values()) motion.run(1)
        stopMotion()
        paint()
      }
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
      stopMotion()
      theme.disconnect()
      mqDark.removeEventListener("change", applyTheme)
      io.disconnect()
      mqReduce.removeEventListener("change", onReduce)
      document.removeEventListener("visibilitychange", onVisibility)
      sound?.close()
      root.style.removeProperty("--typewriter-sheet")
      spoken.remove()
      svg.remove()
    },
  }
}
