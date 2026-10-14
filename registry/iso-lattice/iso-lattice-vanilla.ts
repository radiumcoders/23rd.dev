export type IsoLatticeTheme = "light" | "dark" | "auto"

/** The figures the lattice can light up, all drawn in isometric. */
export type IsoLatticeShape = "cube" | "steps" | "pillars" | "coil"

export type IsoLatticeOptions = {
  /**
   * Figures to cycle through, in order. One figure holds still.
   * Default `["cube", "steps", "pillars", "coil"]`.
   */
  shapes?: IsoLatticeShape[]
  /** Seconds each figure holds before the next one builds. Default `4`. */
  interval?: number
  /** Tile color, any CSS hex. Omit to follow the theme. */
  color?: string
  /** Figure size as a share of the shorter side, 0.2–1. Default `0.6`. */
  size?: number
  /** Distance between lattice tiles in CSS px, 4–24. Default `8`. */
  spacing?: number
  /** Halo behind the figure, 0–1. `0` turns it off. Default `0.6`. */
  glow?: number
  /** Speed of the glint and the shimmer. Default `1`. */
  speed?: number
  /** A faint isometric floor grid under the figure. Default `true`. */
  floor?: boolean
  /** The pointer lights the lattice like a lamp. Default `true`. */
  interactive?: boolean
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class) so light and dark swap with the site theme.
   */
  theme?: IsoLatticeTheme
  /** Fires whenever resolved dark mode changes. */
  onThemeChange?: (dark: boolean) => void
}

export type IsoLatticeInstance = {
  setOptions: (options: Partial<IsoLatticeOptions>) => void
  destroy: () => void
}

/** Warm amber that glows on a dark page. */
export const DARK_COLOR = "#FFB25B"
/** A burnt orange that holds its contrast on paper. */
export const LIGHT_COLOR = "#C2560C"

export const SHAPES: IsoLatticeShape[] = ["cube", "steps", "pillars", "coil"]
export const DEFAULT_INTERVAL = 4
export const DEFAULT_SIZE = 0.6
export const DEFAULT_SPACING = 8
export const DEFAULT_GLOW = 0.6
export const DEFAULT_SPEED = 1

/** How long one figure takes to build over the last, in seconds. */
const MORPH_SECONDS = 1.6
/** Each figure is drawn once into a square mask this many pixels wide. */
const MASK = 512
/** Half the width of the mask in figure units; a figure's radius is 1. */
const EXTENT = 1.6
const COS30 = Math.cos(Math.PI / 6)

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_spacing;
uniform float u_pixel;
// Red is the figure, green its blurred halo, blue the floor grid.
uniform sampler2D u_maskA;
uniform sampler2D u_maskB;
uniform float u_progress;
uniform float u_time;
uniform float u_sweep;
uniform float u_glow;
uniform float u_floor;
uniform vec2 u_mouse;
uniform float u_pointer;
uniform float u_dark;
uniform vec3 u_color;
uniform vec3 u_deep;
uniform vec3 u_hot;

const float SQ3 = 1.7320508;
const float EXTENT = ${EXTENT.toFixed(2)};

// Dave Hoskins' hash: no sin(), so it stays stable on mobile GPUs.
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 toUv(vec2 q) {
  return vec2(q.x, -q.y) / (2.0 * EXTENT) + 0.5;
}

vec2 sampleShape(vec2 q, float k) {
  vec2 uv = toUv(q);
  return mix(texture2D(u_maskA, uv).rg, texture2D(u_maskB, uv).rg, k);
}

// Whether a whole tile fits on the figure: its four tips, pulled in a touch,
// must all land on it. A cell whose centre is inside but whose tips are not
// would poke past the silhouette as a ragged half-lit column.
float fits(sampler2D mask, vec2 q, vec2 tip) {
  float c = 1.0;
  c = min(c, texture2D(mask, toUv(q + vec2(tip.x, 0.0))).r);
  c = min(c, texture2D(mask, toUv(q - vec2(tip.x, 0.0))).r);
  c = min(c, texture2D(mask, toUv(q + vec2(0.0, tip.y))).r);
  c = min(c, texture2D(mask, toUv(q - vec2(0.0, tip.y))).r);
  return step(0.08, c);
}

void main() {
  vec2 frag = gl_FragCoord.xy;

  // Hex lattice in vertical columns, so its rows run at 30 degrees, the
  // same angles as an isometric edge. Each pixel finds its nearest cell.
  vec2 p = frag - 0.5 * u_resolution;
  vec2 period = vec2(SQ3, 1.0) * u_spacing;
  vec2 a = mod(p, period) - 0.5 * period;
  vec2 b = mod(p - 0.5 * period, period) - 0.5 * period;
  vec2 off = dot(a, a) < dot(b, b) ? a : b;
  vec2 cell = p - off;
  vec2 id = floor(cell / (0.5 * period) + 0.5);

  vec2 cellPx = cell + 0.5 * u_resolution;
  vec2 q = (cellPx - u_center) / u_radius;

  // The next figure builds from the floor up: each cell turns over when the
  // build front passes its height, give or take a little.
  float rise = clamp((q.y + 1.3) / 2.6, 0.0, 1.0);
  float delay = 0.62 * rise + 0.08 * hash(id);
  float k = smoothstep(0.0, 1.0, clamp((u_progress - delay) / 0.3, 0.0, 1.0));
  vec3 shapeA = texture2D(u_maskA, toUv(q)).rgb;
  vec3 shapeB = texture2D(u_maskB, toUv(q)).rgb;
  // The mask's soft outline would leave half-strength specks along every
  // edge; a cell is either on the figure or off it, and only when the whole
  // tile (at full size, so the call never depends on brightness) fits.
  vec2 tip = vec2(1.0, 1.0 / SQ3) * u_spacing * 0.866 * 0.84 * 0.85 / u_radius;
  shapeA.r *= smoothstep(0.12, 0.26, shapeA.r) * fits(u_maskA, q, tip);
  shapeB.r *= smoothstep(0.12, 0.26, shapeB.r) * fits(u_maskB, q, tip);
  float m = mix(shapeA.r, shapeB.r, k);
  // The build front burns brighter as it passes.
  float flare = 4.0 * k * (1.0 - k) * max(shapeA.r, shapeB.r);

  // A level band of light rises through the figure, then rests.
  float glint = exp(-pow((q.y - u_sweep) / 0.14, 2.0));
  float shimmer = 0.93 + 0.07 * sin(u_time * (1.1 + 1.6 * hash(id + 7.1)) + 6.2832 * hash(id + 3.7));

  // The pointer is a lamp: it raises the bare lattice and the figure under it.
  vec2 lamp = (cellPx - u_mouse) / (150.0 * u_pixel);
  float lit = exp(-dot(lamp, lamp)) * u_pointer;

  // Size follows only what the figure is, so tiles never pulse in and out;
  // the shimmer, the glint and the build front change light, not size.
  float floorLevel = shapeA.b * u_floor;
  float body = max(m, floorLevel) + lit * (0.14 + 0.3 * m);
  float level = max(m * shimmer * (1.0 + 0.6 * glint) + 0.7 * flare, floorLevel);
  level += lit * (0.14 + 0.45 * m);

  // Each cell is an isometric diamond; at full strength neighbours meet, so
  // lit faces read as solid tiles and dim ones break into a dotted grain.
  float fill = clamp(body, 0.0, 1.0);
  float w = u_spacing * 0.866 * mix(0.2, 0.84, sqrt(fill));
  float n = abs(off.x) + abs(off.y) * SQ3;
  float dotA = 1.0 - smoothstep(w - 0.9, w + 0.9, n);
  dotA *= smoothstep(0.015, 0.08, body);
  dotA *= mix(0.35, 1.0, smoothstep(0.0, 0.7, clamp(level, 0.0, 1.0)));
  vec3 dotC = mix(u_deep, u_color, smoothstep(0.0, 0.8, level));
  dotC = mix(dotC, u_hot, smoothstep(0.85, 1.6, level));

  // Halo: the blurred figure where this pixel sits, plus a broad wash.
  vec2 qp = (frag - u_center) / u_radius;
  float halo = sampleShape(qp, u_progress).g;
  float wash = exp(-dot(qp, qp) * 0.8);
  float glowA = u_glow * (halo * mix(0.18, 0.5, u_dark) + wash * mix(0.04, 0.16, u_dark));
  // Interleaved gradient noise, half a step, so the dark falloff never bands.
  float ign = fract(52.9829189 * fract(dot(frag, vec2(0.06711056, 0.00583715))));
  glowA = clamp(glowA + (ign - 0.5) / 255.0, 0.0, 1.0);

  // Dot over halo, premultiplied for a transparent canvas.
  float outA = dotA + glowA * (1.0 - dotA);
  vec3 outC = dotC * dotA + u_color * glowA * (1.0 - dotA);
  gl_FragColor = vec4(outC, outA);
}
`

type Ctx = CanvasRenderingContext2D
type Point = [number, number]

/** Isometric projection: x runs down-right, z down-left, y straight up. */
function iso(x: number, y: number, z: number): Point {
  return [(x - z) * COS30, y - (x + z) * 0.5]
}

function gray(level: number) {
  const v = Math.round(clamp(level, 0, 1) * 255)
  return `rgb(${v},${v},${v})`
}

function polyline(ctx: Ctx, points: Point[], close = false) {
  ctx.beginPath()
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  if (close) ctx.closePath()
}

function stroke(ctx: Ctx, points: Point[], level: number, width: number) {
  polyline(ctx, points)
  ctx.strokeStyle = gray(level)
  ctx.lineWidth = width
  ctx.stroke()
}

function fill(ctx: Ctx, points: Point[], level: number) {
  polyline(ctx, points, true)
  ctx.fillStyle = gray(level)
  ctx.fill()
}

/** Every figure stands on this floor. */
const FLOOR = -0.4

/**
 * A solid box lit from above: bright top, half-lit left, shaded right, with
 * the near edges picked out. Draw far boxes first; nearer ones cover them.
 */
function box(ctx: Ctx, [x0, x1]: Point, [y0, y1]: Point, [z0, z1]: Point) {
  ctx.globalCompositeOperation = "source-over"
  // Butt caps: a round cap pokes past the corner as a stray tile.
  ctx.lineCap = "butt"
  ctx.lineJoin = "round"
  fill(
    ctx,
    [iso(x1, y1, z1), iso(x0, y1, z1), iso(x0, y0, z1), iso(x1, y0, z1)],
    0.6
  )
  fill(
    ctx,
    [iso(x1, y1, z1), iso(x1, y1, z0), iso(x1, y0, z0), iso(x1, y0, z1)],
    0.42
  )
  fill(
    ctx,
    [iso(x1, y1, z1), iso(x1, y1, z0), iso(x0, y1, z0), iso(x0, y1, z1)],
    0.78
  )
  stroke(ctx, [iso(x0, y1, z1), iso(x1, y1, z1), iso(x1, y1, z0)], 1, 0.035)
  stroke(ctx, [iso(x1, y1, z1), iso(x1, y0, z1)], 0.7, 0.035)
}

/** One solid cube, a unit tall. */
function drawCube(ctx: Ctx) {
  box(ctx, [-0.5, 0.5], [FLOOR, FLOOR + 1], [-0.5, 0.5])
}

/** Four steps climbing away from the viewer. */
function drawSteps(ctx: Ctx) {
  for (let i = 3; i >= 0; i--) {
    const near = 0.5 - i * 0.25
    box(ctx, [-0.5, 0.5], [FLOOR, FLOOR + (i + 1) * 0.25], [near - 0.25, near])
  }
}

/** A three-by-three bar chart; heights are fixed so it reads as data. */
function drawPillars(ctx: Ctx) {
  const heights = [
    [0.35, 0.6, 1],
    [0.55, 0.85, 0.45],
    [0.9, 0.3, 0.65],
  ]
  const cells: Array<[number, number, number]> = []
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      cells.push([(i - 1) * 0.34, (j - 1) * 0.34, heights[i]![j]!])
    }
  }
  // Painter's order: the far corner of the grid first.
  cells.sort((a, b) => a[0] + a[1] - (b[0] + b[1]))
  const half = 0.13
  for (const [x, z, height] of cells) {
    box(
      ctx,
      [x - half, x + half],
      [FLOOR, FLOOR + height],
      [z - half, z + half]
    )
  }
}

/** A coil rising off the floor; the near side of each turn is the bright one. */
function drawCoil(ctx: Ctx) {
  ctx.globalCompositeOperation = "source-over"
  ctx.lineCap = "round"
  const turns = 3.5
  const steps = 280
  const radius = 0.5
  const points: Array<[Point, number]> = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * Math.PI * 2
    const x = radius * Math.cos(t)
    const z = radius * Math.sin(t)
    const y = FLOOR + 0.06 + (i / steps) * 0.92
    points.push([iso(x, y, z), x + z])
  }
  polyline(ctx, ellipse(radius + 0.1, FLOOR), true)
  ctx.strokeStyle = gray(0.22)
  ctx.lineWidth = 0.04
  ctx.stroke()
  // Far half first, then the near half over it.
  for (const near of [false, true]) {
    for (let i = 1; i < points.length; i++) {
      const [a, depth] = points[i - 1]!
      const [b] = points[i]!
      if (depth > 0 !== near) continue
      stroke(ctx, [a, b], near ? 1 : 0.38, 0.085)
    }
  }
}

/** A flat circle on the floor plane, as a projected outline. */
function ellipse(radius: number, y: number): Point[] {
  const out: Point[] = []
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * Math.PI * 2
    out.push(iso(radius * Math.cos(t), y, radius * Math.sin(t)))
  }
  return out
}

/** A faint floor tile with a coarse grid, the same under every figure. */
function drawFloor(ctx: Ctx) {
  const r = 0.8
  ctx.globalCompositeOperation = "source-over"
  fill(
    ctx,
    [
      iso(r, FLOOR, r),
      iso(r, FLOOR, -r),
      iso(-r, FLOOR, -r),
      iso(-r, FLOOR, r),
    ],
    0.05
  )
  for (let i = -2; i <= 2; i++) {
    const v = (i / 2) * r
    // Wide enough that every grid line lands on a full row of cells.
    stroke(ctx, [iso(v, FLOOR, -r), iso(v, FLOOR, r)], 0.15, 0.07)
    stroke(ctx, [iso(-r, FLOOR, v), iso(r, FLOOR, v)], 0.15, 0.07)
  }
}

const DRAW: Record<IsoLatticeShape, (ctx: Ctx) => void> = {
  cube: drawCube,
  steps: drawSteps,
  pillars: drawPillars,
  coil: drawCoil,
}

/** Box-blurs by halving and growing back, where `ctx.filter` is missing. */
function softBlur(source: HTMLCanvasElement, into: Ctx) {
  let current = source
  for (let size = MASK / 2; size >= MASK / 16; size /= 2) {
    const next = document.createElement("canvas")
    next.width = next.height = size
    const ctx = next.getContext("2d")!
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(current, 0, 0, size, size)
    current = next
  }
  into.imageSmoothingQuality = "high"
  into.drawImage(current, 0, 0, MASK, MASK)
}

// Figures don't depend on color or theme, so every instance shares them.
const maskCache = new Map<IsoLatticeShape, Uint8Array>()

/** A black square canvas set up in figure units: y up, origin centered. */
function figureCanvas(draw: (ctx: Ctx) => void) {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = MASK
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, MASK, MASK)
  const unit = MASK / (2 * EXTENT)
  ctx.setTransform(unit, 0, 0, -unit, MASK / 2, MASK / 2)
  draw(ctx)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  return { canvas, ctx }
}

let floorPixels: Uint8ClampedArray | null = null

/**
 * Draws a figure once: red is the crisp figure, green a soft halo, blue the
 * floor grid (the same in every mask, so it never changes in a build).
 */
function renderMask(shape: IsoLatticeShape): Uint8Array {
  const cached = maskCache.get(shape)
  if (cached) return cached

  const { canvas: sharp, ctx } = figureCanvas(DRAW[shape])
  floorPixels ??= figureCanvas(drawFloor).ctx.getImageData(
    0,
    0,
    MASK,
    MASK
  ).data

  const soft = document.createElement("canvas")
  soft.width = soft.height = MASK
  const sctx = soft.getContext("2d", { willReadFrequently: true })!
  sctx.fillStyle = "#000"
  sctx.fillRect(0, 0, MASK, MASK)
  if (typeof sctx.filter === "string") {
    sctx.filter = `blur(${MASK / 36}px)`
    sctx.drawImage(sharp, 0, 0)
  } else {
    softBlur(sharp, sctx)
  }

  const a = ctx.getImageData(0, 0, MASK, MASK).data
  const b = sctx.getImageData(0, 0, MASK, MASK).data
  const out = new Uint8Array(MASK * MASK * 4)
  for (let i = 0; i < out.length; i += 4) {
    out[i] = a[i]!
    out[i + 1] = b[i]!
    out[i + 2] = floorPixels[i]!
    out[i + 3] = 255
  }
  maskCache.set(shape, out)
  return out
}

function isDev() {
  return (
    typeof process !== "undefined" && process.env?.NODE_ENV !== "production"
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function numberOr(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return clamp(value, min, max)
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim()
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.padEnd(6, "0").slice(0, 6)
  const n = Number.parseInt(full, 16)
  if (Number.isNaN(n)) return [1, 0.7, 0.36]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function shapesOf(value: unknown): IsoLatticeShape[] {
  if (!Array.isArray(value)) return SHAPES
  const valid = value.filter((s): s is IsoLatticeShape => s in DRAW)
  return valid.length ? valid : SHAPES
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

export function resolveDark(theme: IsoLatticeTheme): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (isDev()) {
      console.warn(
        "IsoLattice: shader failed to compile\n",
        gl.getShaderInfoLog(shader)
      )
    }
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * A lattice of isometric tiles that lights up solid figures (a cube, a
 * staircase, a bar chart, a coil) on a faint floor grid, and builds each
 * one over the last from the floor up. A level glint rises through the
 * figure, and the pointer lights the lattice like a lamp. Transparent, theme-aware; pauses
 * off-screen and in hidden tabs; holds the first figure still under
 * `prefers-reduced-motion`. Recovers from a lost WebGL context.
 */
export function createIsoLattice(
  canvas: HTMLCanvasElement,
  initial: IsoLatticeOptions = {}
): IsoLatticeInstance | null {
  let options: IsoLatticeOptions = {
    floor: true,
    interactive: true,
    theme: "auto",
    ...initial,
  }

  const mouse = { x: 0, y: 0 }
  const target = { x: 0, y: 0 }
  // The lamp eases in and out, so leaving the canvas never snaps it off.
  let lamp = 0
  let lampTarget = 0
  let dark = resolveDark(options.theme ?? "auto")
  options.onThemeChange?.(dark)

  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  })
  if (!gl) return null

  type Loc = WebGLUniformLocation | null
  let vs: WebGLShader | null = null
  let fs: WebGLShader | null = null
  let program: WebGLProgram | null = null
  let buf: WebGLBuffer | null = null
  let textures = new Map<IsoLatticeShape, WebGLTexture>()
  const u: Record<string, Loc> = {}

  const texture = (shape: IsoLatticeShape) => {
    const existing = textures.get(shape)
    if (existing) return existing
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      MASK,
      MASK,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      renderMask(shape)
    )
    textures.set(shape, tex)
    return tex
  }

  // Builds every GL resource. Runs at startup and again when the browser
  // restores a lost context, since the old objects die with it.
  const initGl = () => {
    vs = compile(gl, gl.VERTEX_SHADER, VERT)
    fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs)
      if (fs) gl.deleteShader(fs)
      return false
    }

    program = gl.createProgram()
    if (!program) {
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      return false
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (isDev()) {
        console.warn(
          "IsoLattice: program failed to link\n",
          gl.getProgramInfoLog(program)
        )
      }
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      return false
    }
    gl.useProgram(program)

    buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )
    const loc = gl.getAttribLocation(program, "a_position")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.viewport(0, 0, canvas.width, canvas.height)

    const linked = program
    for (const name of [
      "resolution",
      "center",
      "radius",
      "spacing",
      "pixel",
      "maskA",
      "maskB",
      "progress",
      "time",
      "sweep",
      "glow",
      "floor",
      "mouse",
      "pointer",
      "dark",
      "color",
      "deep",
      "hot",
    ]) {
      u[name] = gl.getUniformLocation(linked, `u_${name}`)
    }
    gl.uniform1i(u.maskA!, 0)
    gl.uniform1i(u.maskB!, 1)
    textures = new Map()
    return true
  }
  if (!initGl()) return null

  let pixel = 1
  /**
   * Sizes the canvas to its parent; true when the backing store changed.
   * Assigning the same size still clears the canvas, so it only assigns on
   * a real change.
   */
  const resize = () => {
    const parent = canvas.parentElement
    if (!parent) return false
    const w = parent.clientWidth
    const h = parent.clientHeight
    if (w <= 0 || h <= 0) return false
    pixel = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.floor(w * pixel))
    const height = Math.max(1, Math.floor(h * pixel))
    if (canvas.width === width && canvas.height === height) return false
    canvas.width = width
    canvas.height = height
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    gl.viewport(0, 0, canvas.width, canvas.height)
    wake()
    return true
  }

  let colorKey = ""
  const syncColor = () => {
    const hex = options.color || (dark ? DARK_COLOR : LIGHT_COLOR)
    const key = `${hex}|${dark}`
    if (key === colorKey) return
    colorKey = key
    const base = hexToRgb(hex)
    const white: [number, number, number] = [1, 1, 1]
    const black: [number, number, number] = [0, 0, 0]
    // Dim dots sink toward the page; hot dots move away from it.
    const deep = mixRgb(base, dark ? black : white, 0.55)
    const hot = mixRgb(base, dark ? white : black, dark ? 0.62 : 0.5)
    gl.uniform3fv(u.color!, base)
    gl.uniform3fv(u.deep!, deep)
    gl.uniform3fv(u.hot!, hot)
    gl.uniform1f(u.dark!, dark ? 1 : 0)
  }

  // Which figure is showing, and how far the morph to the next one has got.
  let shapes = shapesOf(options.shapes)
  let index = 0
  let held = 0
  let progress = 0

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  let onScreen = true
  let raf = 0
  let destroyed = false
  let lost = false
  let last = 0
  let clock = 0

  const moving = () =>
    onScreen && !mqReduce.matches && document.visibilityState !== "hidden"

  function wake() {
    // An observer callback can still arrive after destroy.
    if (raf || destroyed || lost) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  /** Draws in place now, without advancing; the tick carries on if live. */
  function redraw() {
    if (destroyed || lost) return
    cancelAnimationFrame(raf)
    raf = 0
    last = performance.now()
    tick(last)
  }

  const advance = (dt: number) => {
    if (shapes.length < 2) {
      progress = 0
      return
    }
    if (
      progress > 0 ||
      held >= numberOr(options.interval, DEFAULT_INTERVAL, 0.5, 60)
    ) {
      progress += dt / MORPH_SECONDS
      if (progress >= 1) {
        index = (index + 1) % shapes.length
        progress = 0
        held = 0
      }
    } else {
      held += dt
    }
  }

  // An arrow, not a declaration, so TypeScript keeps `gl` narrowed inside.
  const tick = (now: number) => {
    raf = 0
    if (lost) return
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
    last = now
    const live = moving()
    const speed = numberOr(options.speed, DEFAULT_SPEED, 0, 4)
    if (live) {
      clock += dt * speed
      advance(dt)
    }
    // Under reduced motion the first figure holds, with no lamp.
    const still = mqReduce.matches
    if (still) {
      index = 0
      progress = 0
    }

    const ease = 1 - Math.exp(-dt * 6)
    mouse.x += (target.x - mouse.x) * ease
    mouse.y += (target.y - mouse.y) * ease
    lamp += (lampTarget - lamp) * (1 - Math.exp(-dt * 3))

    syncColor()
    const w = canvas.width
    const h = canvas.height
    const radius =
      (numberOr(options.size, DEFAULT_SIZE, 0.2, 1) * Math.min(w, h)) / 2
    const pointer = options.interactive === false || still ? 0 : lamp
    // The figure stays put: any drift would slide it across the lattice and
    // make the tiles along its edges blink.
    const cx = w / 2
    const cy = h / 2

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture(shapes[index % shapes.length]!))
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, texture(shapes[(index + 1) % shapes.length]!))

    gl.uniform2f(u.resolution!, w, h)
    gl.uniform2f(u.center!, cx, cy)
    gl.uniform1f(u.radius!, radius)
    gl.uniform1f(
      u.spacing!,
      numberOr(options.spacing, DEFAULT_SPACING, 4, 24) * pixel
    )
    gl.uniform1f(u.pixel!, pixel)
    gl.uniform1f(u.progress!, progress)
    gl.uniform1f(u.time!, clock)
    // The glint rises through the figure, then rests above it a while.
    gl.uniform1f(u.sweep!, still ? -9 : -1.6 + 4.2 * ((clock / 4.2) % 1))
    gl.uniform1f(u.glow!, numberOr(options.glow, DEFAULT_GLOW, 0, 1))
    gl.uniform1f(u.floor!, options.floor === false ? 0 : 1)
    gl.uniform2f(u.mouse!, mouse.x, mouse.y)
    gl.uniform1f(u.pointer!, pointer)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    const settling = Math.abs(lampTarget - lamp) > 0.002
    if (live || (settling && !still)) raf = requestAnimationFrame(tick)
  }

  // A GPU reset, a driver update or too many live contexts can drop ours.
  // preventDefault asks the browser to restore it; until then gl is off limits.
  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
    cancelAnimationFrame(raf)
    raf = 0
    vs = fs = program = buf = null
    textures = new Map()
  }
  const onRestored = () => {
    if (destroyed || !initGl()) return
    lost = false
    // Uniforms reset with the context, so the colors go up again.
    colorKey = ""
    wake()
  }
  canvas.addEventListener("webglcontextlost", onLost)
  canvas.addEventListener("webglcontextrestored", onRestored)

  // Resizing cleared the canvas; draw now, or it shows blank for a frame.
  const ro = new ResizeObserver(() => {
    if (resize()) redraw()
  })
  if (canvas.parentElement) ro.observe(canvas.parentElement)
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true
    wake()
  })
  io.observe(canvas)
  const onVisibility = () => wake()
  document.addEventListener("visibilitychange", onVisibility)
  const onReduce = () => wake()
  mqReduce.addEventListener("change", onReduce)

  const syncTheme = () => {
    const next = resolveDark(options.theme ?? "auto")
    if (next === dark) return
    dark = next
    options.onThemeChange?.(dark)
    wake()
  }
  const mo = new MutationObserver(syncTheme)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  })
  const mqDark = window.matchMedia("(prefers-color-scheme: dark)")
  mqDark.addEventListener("change", syncTheme)

  const onMove = (e: PointerEvent) => {
    if (options.interactive === false) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const x = (e.clientX - rect.left) / rect.width
    const y = 1 - (e.clientY - rect.top) / rect.height
    const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1
    if (inside) {
      // The first touch puts the lamp where the pointer is, not at a corner.
      if (lamp < 0.01) {
        mouse.x = x * canvas.width
        mouse.y = y * canvas.height
      }
      target.x = x * canvas.width
      target.y = y * canvas.height
    }
    const next = inside ? 1 : 0
    if (next !== lampTarget) {
      lampTarget = next
      wake()
    }
  }
  const onLeave = () => {
    lampTarget = 0
    wake()
  }
  window.addEventListener("pointermove", onMove, { passive: true })
  document.documentElement.addEventListener("pointerleave", onLeave)

  resize()
  wake()

  return {
    setOptions(next) {
      options = { ...options, ...next }
      const nextShapes = shapesOf(options.shapes)
      if (nextShapes.join() !== shapes.join()) {
        shapes = nextShapes
        index = 0
        held = 0
        progress = 0
      }
      syncTheme()
      wake()
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      raf = 0
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      mqReduce.removeEventListener("change", onReduce)
      mqDark.removeEventListener("change", syncTheme)
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      for (const tex of textures.values()) gl.deleteTexture(tex)
      textures.clear()
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
      // Free the GPU context once the canvas has left the page; browsers cap
      // live contexts at about 16. A canvas still in the page (a React
      // Strict Mode replay) keeps it, so a new engine can reuse it.
      const lose = gl.getExtension("WEBGL_lose_context")
      queueMicrotask(() => {
        if (!canvas.isConnected && !gl.isContextLost()) lose?.loseContext()
      })
    },
  }
}
