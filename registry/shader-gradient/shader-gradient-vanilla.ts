export type ShaderGradientTheme = "light" | "dark" | "auto"

export type ShaderGradientOptions = {
  /**
   * Up to 4 colors, any CSS hex. The flow cycles through them in order and
   * back to the first, so neighbours should sit well together.
   */
  colors?: string[]
  /** Flow speed. Default `0.14`. */
  speed?: number
  /** Softness, 0–1: higher is broader, calmer bands. Default `0.7`. */
  blur?: number
  /** Color strength, 0–1; lower lets the paper / ink show through. Default `0.95`. */
  intensity?: number
  /** Film grain, 0–1. `0` turns it off. Default `0.35`. */
  grain?: number
  /** The flow swirls gently around the pointer. Default `true`. */
  interactive?: boolean
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class) so light and dark swap with the site theme.
   */
  theme?: ShaderGradientTheme
  /** Fires whenever resolved dark mode changes (CSS fallback). */
  onThemeChange?: (dark: boolean) => void
}

export type ShaderGradientInstance = {
  setOptions: (options: Partial<ShaderGradientOptions>) => void
  destroy: () => void
}

/** Peach, butter, sky and lilac, flowing over warm paper. */
export const LIGHT_COLORS = ["#F7A48B", "#F9D78E", "#9FCBF0", "#BBA9EE"]
/**
 * Blue, violet, magenta and coral over near-black ink — a narrow hue arc,
 * so every blend on the cycle stays rich instead of passing through grey.
 */
export const DARK_COLORS = ["#3D52F2", "#9150F2", "#E0479F", "#FF7B60"]
const LIGHT_BASE = "#FBF8F4"
const DARK_BASE = "#07080B"

export const DEFAULT_SPEED = 0.14
export const DEFAULT_BLUR = 0.7
export const DEFAULT_INTENSITY = 0.95
export const DEFAULT_GRAIN = 0.35

/** Film grain for the CSS fallback — the same idea, as an SVG turbulence tile. */
const GRAIN_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.16 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

function fallback(colors: string[], base: string) {
  const [a, b, c, d] = colors
  return {
    backgroundColor: base,
    backgroundImage: [
      GRAIN_TILE,
      `radial-gradient(70% 60% at 18% 22%, ${a} 0%, transparent 70%)`,
      `radial-gradient(60% 60% at 82% 30%, ${b} 0%, transparent 70%)`,
      `radial-gradient(70% 60% at 70% 88%, ${c} 0%, transparent 70%)`,
      `radial-gradient(55% 55% at 12% 86%, ${d} 0%, transparent 70%)`,
    ].join(", "),
  } as const
}

/** Shown before the first frame and wherever WebGL isn't available. */
export const LIGHT_FALLBACK = fallback(LIGHT_COLORS, LIGHT_BASE)
export const DARK_FALLBACK = fallback(DARK_COLORS, DARK_BASE)

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_blur;
uniform float u_intensity;
uniform float u_grain;
uniform float u_grainSeed;
uniform float u_pixel;
uniform float u_pointer;
uniform vec2 u_mouse;
// Palette stops and the paper / ink underneath, in OKLab.
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_base;

// Dave Hoskins' hash — no sin(), so it stays stable on mobile GPUs.
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

// Weight of the stop at 'at' on a cyclic 0–1 track: a smoothed hat, so any
// two neighbouring weights always sum to one.
float stop(float v, float at) {
  float d = abs(v - at);
  d = min(d, 1.0 - d);
  return smoothstep(0.0, 1.0, 1.0 - clamp(d * 4.0, 0.0, 1.0));
}

vec3 palette(float v) {
  return u_c0 * stop(v, 0.0) + u_c1 * stop(v, 0.25) +
         u_c2 * stop(v, 0.5) + u_c3 * stop(v, 0.75);
}

vec3 oklabToLinear(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 linearToSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  float scale = mix(2.0, 0.8, u_blur);
  vec2 p = vec2(uv.x * aspect, uv.y) * scale;
  float t = u_time;

  // A soft swirl around the pointer.
  vec2 d = p - vec2(u_mouse.x * aspect, u_mouse.y) * scale;
  p += vec2(-d.y, d.x) * exp(-dot(d, d) * 1.4) * 0.4 * u_pointer;

  // Domain warping: noise fed back through itself twice gives slow,
  // liquid bands that never read as a loop.
  vec2 q = vec2(
    fbm(p + vec2(0.0, 0.12 * t)),
    fbm(p + vec2(5.2, 1.3) - 0.1 * t)
  );
  vec2 r = vec2(
    fbm(p + 2.2 * q + vec2(1.7, 9.2) + 0.07 * t),
    fbm(p + 2.2 * q + vec2(8.3, 2.8) - 0.06 * t)
  );
  float f = fbm(p + 2.0 * r);

  // Where on the palette this pixel sits. The track is cyclic, so wrapping
  // past the last color flows back into the first without a seam.
  float v = fract(f * 2.4 + 0.35 * r.x + 0.02 * t);
  vec3 lab = palette(v);

  // Some of the paper / ink breathes through, so it isn't wall-to-wall color.
  // Ink dulls far faster than paper does, so on a dark base only a little
  // shows, and the color gets a chroma lift to glow against it.
  float air = smoothstep(0.28, 0.72, fbm(p * 0.6 - q + 13.0 + 0.03 * t));
  float floorMix = mix(0.82, 0.45, u_base.x);
  lab.yz *= mix(1.15, 1.0, u_base.x);
  lab = mix(u_base, lab, u_intensity * mix(floorMix, 1.0, air));

  vec3 col = linearToSrgb(oklabToLinear(lab));

  // Film grain on a CSS-pixel grid: two hashes averaged for a softer,
  // more photographic distribution than flat white noise.
  vec2 cell = floor(gl_FragCoord.xy / u_pixel);
  float g = (hash(cell + u_grainSeed) + hash(cell.yx - u_grainSeed * 1.7)) * 0.5;
  col += (g - 0.5) * u_grain * 0.2;
  // Always a hair of dither, so the smooth ramps never band.
  col += (hash(cell * 1.31 + u_grainSeed) - 0.5) * 0.004;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

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

/** Hex → OKLab, so the shader can blend without going muddy. */
function hexToOklab(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim()
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.padEnd(6, "0").slice(0, 6)
  const n = Number.parseInt(full, 16)
  const srgb = Number.isNaN(n)
    ? [0.5, 0.5, 0.5]
    : [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  const [r, g, b] = srgb.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  ) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
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

export function resolveDark(theme: ShaderGradientTheme): boolean {
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
        "ShaderGradient: shader failed to compile\n",
        gl.getShaderInfoLog(shader)
      )
    }
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * A grainy liquid gradient for heroes and empty states. The palette flows
 * through slow domain-warped noise, blends in OKLab so neighbours never go
 * muddy, and carries a film grain. Theme-aware; pauses off-screen and in
 * hidden tabs; holds a still frame under `prefers-reduced-motion`.
 */
export function createShaderGradient(
  canvas: HTMLCanvasElement,
  initial: ShaderGradientOptions = {}
): ShaderGradientInstance | null {
  let options: ShaderGradientOptions = {
    interactive: true,
    theme: "auto",
    ...initial,
  }

  const mouse = { x: 0.5, y: 0.5 }
  const target = { x: 0.5, y: 0.5 }
  // Pointer pull eases in and out, so leaving the hero never snaps.
  let pull = 0
  let pullTarget = 0
  let dark = resolveDark(options.theme ?? "auto")
  options.onThemeChange?.(dark)

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  })
  if (!gl) return null

  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs)
    if (fs) gl.deleteShader(fs)
    return null
  }

  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    return null
  }
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (isDev()) {
      console.warn(
        "ShaderGradient: program failed to link\n",
        gl.getProgramInfoLog(program)
      )
    }
    gl.deleteProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    return null
  }
  gl.useProgram(program)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  )
  const loc = gl.getAttribLocation(program, "a_position")
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const u = (name: string) => gl.getUniformLocation(program, name)
  const uResolution = u("u_resolution")
  const uTime = u("u_time")
  const uBlur = u("u_blur")
  const uIntensity = u("u_intensity")
  const uGrain = u("u_grain")
  const uGrainSeed = u("u_grainSeed")
  const uPixel = u("u_pixel")
  const uPointer = u("u_pointer")
  const uMouse = u("u_mouse")
  const uStops = [u("u_c0"), u("u_c1"), u("u_c2"), u("u_c3")]
  const uBase = u("u_base")

  // The gradient is soft enough that one sample per CSS pixel is plenty;
  // it also keeps the grain the same size on every screen.
  let pixel = 1
  const resize = () => {
    const parent = canvas.parentElement
    if (!parent) return
    const w = parent.clientWidth
    const h = parent.clientHeight
    if (w <= 0 || h <= 0) return
    pixel = Math.min(window.devicePixelRatio || 1, 1)
    canvas.width = Math.max(1, Math.floor(w * pixel))
    canvas.height = Math.max(1, Math.floor(h * pixel))
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    gl.viewport(0, 0, canvas.width, canvas.height)
    wake()
  }

  let colorsKey = ""
  const syncColors = () => {
    const source = options.colors?.length
      ? options.colors
      : dark
        ? DARK_COLORS
        : LIGHT_COLORS
    const key = `${source.join()}|${dark}`
    if (key === colorsKey) return
    colorsKey = key
    uStops.forEach((loc, i) => {
      gl.uniform3fv(loc, hexToOklab(source[i % source.length]!))
    })
    gl.uniform3fv(uBase, hexToOklab(dark ? DARK_BASE : LIGHT_BASE))
  }

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  let onScreen = true
  let raf = 0
  let last = 0
  let clock = 0

  const moving = () =>
    onScreen && !mqReduce.matches && document.visibilityState !== "hidden"

  function wake() {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  // An arrow, not a declaration, so TypeScript keeps `gl` narrowed inside.
  const tick = (now: number) => {
    raf = 0
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    const live = moving()
    if (live) clock += dt

    mouse.x += (target.x - mouse.x) * 0.05
    mouse.y += (target.y - mouse.y) * 0.05
    pull += (pullTarget - pull) * 0.04

    syncColors()
    const speed = numberOr(options.speed, DEFAULT_SPEED, 0, 4)
    gl.uniform2f(uResolution, canvas.width, canvas.height)
    gl.uniform1f(uTime, clock * speed * 4)
    gl.uniform1f(uBlur, numberOr(options.blur, DEFAULT_BLUR, 0, 1))
    gl.uniform1f(
      uIntensity,
      numberOr(options.intensity, DEFAULT_INTENSITY, 0, 1)
    )
    gl.uniform1f(uGrain, numberOr(options.grain, DEFAULT_GRAIN, 0, 1))
    // Grain re-rolls at 24 fps, like film, and holds still when paused.
    gl.uniform1f(uGrainSeed, (Math.floor(clock * 24) % 997) * 13.7)
    gl.uniform1f(uPixel, pixel)
    gl.uniform1f(uPointer, options.interactive === false ? 0 : pull)
    gl.uniform2f(uMouse, mouse.x, mouse.y)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    if (live) raf = requestAnimationFrame(tick)
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
    pullTarget = inside ? 1 : 0
    if (inside) {
      target.x = x
      target.y = y
    }
  }
  window.addEventListener("pointermove", onMove, { passive: true })

  resize()
  wake()

  return {
    setOptions(next) {
      options = { ...options, ...next }
      syncTheme()
      wake()
    },
    destroy() {
      cancelAnimationFrame(raf)
      raf = 0
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      mqReduce.removeEventListener("change", onReduce)
      mqDark.removeEventListener("change", syncTheme)
      window.removeEventListener("pointermove", onMove)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    },
  }
}
