export type ShaderAnimeFireTheme = "light" | "dark" | "auto"

export type ShaderAnimeFireOptions = {
  /**
   * Three colors, coolest to hottest: ember, flame, core. In dark mode the
   * densest heat still burns past the core toward white.
   */
  colors?: string[]
  /** How fast the flames rise. Default `0.6`. */
  speed?: number
  /** Opacity of the fire and its glow, 0–1. Default `1`. */
  intensity?: number
  /** How far the flames climb, 0–1. Default `0.45`. */
  height?: number
  /** A plume of heat reaches up toward the pointer. Default `true`. */
  interactive?: boolean
  /** Ordered Bayer pixels instead of smooth flames. Default `false`. */
  dither?: boolean
  /** Dither cell size in CSS px. Default `1`. */
  pixelSize?: number
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class) so light and dark swap with the site theme.
   */
  theme?: ShaderAnimeFireTheme
  /** Fires whenever resolved dark mode changes (CSS fallback). */
  onThemeChange?: (dark: boolean) => void
}

export type ShaderAnimeFireInstance = {
  setOptions: (options: Partial<ShaderAnimeFireOptions>) => void
  destroy: () => void
}

/** Brick, flame orange and marigold — saturated enough to hold on paper. */
export const LIGHT_COLORS = ["#D8341A", "#F9731E", "#FFBA3A"]
/** Deep ember, flame and gold; the tonemap carries the core to white-hot. */
export const DARK_COLORS = ["#B4200A", "#FF6512", "#FFC04A"]
const LIGHT_BASE = "#FCFBF9"
const DARK_BASE = "#08090C"

export const DEFAULT_SPEED = 0.6
export const DEFAULT_INTENSITY = 1
export const DEFAULT_HEIGHT = 0.45

function fallback(colors: string[], base: string) {
  const [ember, flame, core] = colors
  return {
    backgroundColor: base,
    backgroundImage: [
      `radial-gradient(24% 18% at 50% 100%, ${core} 0%, transparent 70%)`,
      `radial-gradient(36% 30% at 24% 100%, ${flame} 0%, transparent 72%)`,
      `radial-gradient(34% 28% at 76% 100%, ${flame} 0%, transparent 72%)`,
      `radial-gradient(90% 50% at 50% 110%, ${ember} 0%, transparent 72%)`,
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
uniform float u_intensity;
uniform float u_height;
uniform float u_ignite;
uniform float u_dark;
uniform float u_dither;
uniform float u_pixel;
uniform float u_pointer;
uniform vec2 u_mouse;
// Ember, flame, core and the paper / ink underneath, in linear light.
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
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
  return v / 0.875;
}

// Classic Bayer (WebGL1-safe, no bitwise ops)
float bayer2(vec2 c) {
  return mod(c.x * 2.0 + c.y * 3.0, 4.0);
}

float bayer4(vec2 p) {
  vec2 c = mod(floor(p), 4.0);
  return bayer2(mod(c, 2.0)) * 4.0 + bayer2(floor(c * 0.5));
}

float bayer8(vec2 p) {
  vec2 c = mod(floor(p), 8.0);
  return (bayer4(floor(c * 0.5)) * 4.0 + bayer2(mod(c, 2.0)) + 0.5) / 64.0;
}

float climbOf() {
  return mix(0.18, 0.78, u_height) * u_ignite;
}

// Temperature: below 0 is air, around 1 is the white-hot bed of the fire.
float temperature(vec2 uv, float aspect, float t, float plume) {
  float x = uv.x * aspect;
  float climb = max(climbOf(), 0.001);
  float y = uv.y / climb;

  // Slow swells along the bed, so the flame line is never flat.
  y /= mix(0.6, 1.3, fbm(vec2(x * 1.1 + 3.1, t * 0.16)));
  // Under the pointer the fire stretches up toward it.
  y /= 1.0 + plume * max(u_mouse.y / climb - 0.4, 0.3);

  // Turbulence rising through the flame: stretched tall so it reads as
  // tongues, and swept sideways harder the higher it climbs.
  // Few octaves on purpose: smooth, graphic tongues rather than ragged,
  // photographic ones.
  vec2 q = vec2(x * 4.4, uv.y * 1.5 - t * 1.1);
  vec2 w = vec2(
    fbm(q * vec2(0.5, 0.8) + vec2(0.0, -t * 0.3)),
    fbm(q * 0.6 + vec2(5.2, 1.3 - t * 0.25))
  );
  q += (w - 0.5) * vec2(2.4, 0.8) * (0.3 + y);
  float body = fbm(q) - 0.5;
  // Ridged: where the finer noise crosses its midpoint it peaks sharply,
  // which curls the bands into licks instead of flat stripes.
  float licks = 0.2 - abs(fbm(q * vec2(1.5, 2.0) + vec2(0.0, -t * 1.6)) - 0.5) * 2.0;
  float turb = body * 0.8 + licks * 0.45;

  float T = 1.0 - y * 1.1 + turb * 2.6 * min(0.5 + y, 1.2);
  // Nothing burns far above the tips, however the noise rolls.
  return T - smoothstep(1.0, 1.7, y);
}

// Flat cel bands, hottest innermost. 'hot' is the core pushed toward white.
vec3 bands(float T, vec3 hot) {
  float w = 0.012;
  vec3 c = mix(u_c0, u_c1, smoothstep(0.3 - w, 0.3 + w, T));
  c = mix(c, u_c2, smoothstep(0.6 - w, 0.6 + w, T));
  return mix(c, hot, smoothstep(1.02 - w, 1.02 + w, T));
}

vec3 linearToSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  float t = u_time;

  vec2 cell = floor(gl_FragCoord.xy / u_pixel);
  vec2 uv = gl_FragCoord.xy / u_resolution;
  if (u_dither > 0.5) uv = (cell + 0.5) * u_pixel / u_resolution;

  float dx = (uv.x - u_mouse.x) * aspect;
  float plume = exp(-dx * dx * 26.0) * u_pointer;

  float T = temperature(uv, aspect, t, plume);
  // Dither shakes the band edges by the Bayer threshold, so each boundary
  // prints as an ordered-dot blend instead of a hard line.
  float q = u_dither > 0.5 ? bayer8(cell) - 0.5 : 0.0;
  T += q * 0.14;
  float edge = u_dither > 0.5 ? 0.001 : 0.012;
  float cover = smoothstep(0.0, edge, T) * mix(0.35, 1.0, u_intensity);

  // The whole fire breathes a little, like a real one lighting a room.
  float flicker = 0.86 + 0.14 * noise(vec2(t * 2.3, 4.7));
  float glow = exp(-uv.y / max(climbOf() * 1.7, 0.02) * 3.4) * flicker;
  glow += plume * exp(-length(vec2(dx, uv.y - u_mouse.y)) * 5.0) * 0.5;
  glow *= u_intensity;
  if (u_dither > 0.5) glow = step(0.52 + q * 0.98, glow * 2.0) * 0.5;

  // On ink the core goes near white; on paper white would vanish into the
  // page, so it stops at a pale gold.
  vec3 hot = mix(u_c2, vec3(1.0), u_dark > 0.5 ? 0.75 : 0.4);
  vec3 col = mix(u_base, mix(u_c0, u_c1, 0.4), glow * (u_dark > 0.5 ? 0.08 : 0.12));
  col = mix(col, bands(T, hot), cover);

  vec3 srgb = linearToSrgb(col);
  if (u_dither < 0.5) srgb += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.006;
  gl_FragColor = vec4(clamp(srgb, 0.0, 1.0), 1.0);
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

/** Hex → linear sRGB, so the shader can add light the way light adds. */
function hexToLinear(hex: string): [number, number, number] {
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
    ? [0.77, 0.38, 0.18]
    : [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  return srgb.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  ) as [number, number, number]
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

export function resolveDark(theme: ShaderAnimeFireTheme): boolean {
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
        "ShaderAnimeFire: shader failed to compile\n",
        gl.getShaderInfoLog(shader)
      )
    }
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * A wall of cel-shaded fire along the bottom edge: turbulent tongues in
 * flat bands of heat over a warm, flickering glow. Theme-aware; pauses
 * off-screen and in hidden tabs; holds a still frame under
 * `prefers-reduced-motion`.
 */
export function createShaderAnimeFire(
  canvas: HTMLCanvasElement,
  initial: ShaderAnimeFireOptions = {}
): ShaderAnimeFireInstance | null {
  let options: ShaderAnimeFireOptions = {
    interactive: true,
    theme: "auto",
    ...initial,
  }

  const mouse = { x: 0.5, y: 0.5 }
  const target = { x: 0.5, y: 0.5 }
  // The plume eases in and out, so leaving the hero never snaps.
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
        "ShaderAnimeFire: program failed to link\n",
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
  const uIntensity = u("u_intensity")
  const uHeight = u("u_height")
  const uIgnite = u("u_ignite")
  const uDark = u("u_dark")
  const uDither = u("u_dither")
  const uPixel = u("u_pixel")
  const uPointer = u("u_pointer")
  const uMouse = u("u_mouse")
  const uStops = [u("u_c0"), u("u_c1"), u("u_c2")]
  const uBase = u("u_base")

  // Flame edges are crisp, so render a bit past 1x — but not a full 2x,
  // which would quadruple the fbm work on retina screens.
  let dpr = 1
  const resize = () => {
    const parent = canvas.parentElement
    if (!parent) return
    const w = parent.clientWidth
    const h = parent.clientHeight
    if (w <= 0 || h <= 0) return
    dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(h * dpr))
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
      gl.uniform3fv(loc, hexToLinear(source[i % source.length]!))
    })
    gl.uniform3fv(uBase, hexToLinear(dark ? DARK_BASE : LIGHT_BASE))
  }

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  let onScreen = true
  let raf = 0
  let destroyed = false
  let last = 0
  let clock = 0
  // Seconds since the fire first caught; drives the ignite.
  let lit = mqReduce.matches ? 10 : 0

  const moving = () =>
    onScreen && !mqReduce.matches && document.visibilityState !== "hidden"

  function wake() {
    // An observer callback can still arrive after destroy.
    if (raf || destroyed) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  // An arrow, not a declaration, so TypeScript keeps `gl` narrowed inside.
  const tick = (now: number) => {
    raf = 0
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    const live = moving()
    if (live) {
      clock += dt
      lit += dt
    } else if (mqReduce.matches) {
      lit = 10
    }

    mouse.x += (target.x - mouse.x) * 0.08
    mouse.y += (target.y - mouse.y) * 0.08
    pull += (pullTarget - pull) * 0.05

    syncColors()
    const speed = numberOr(options.speed, DEFAULT_SPEED, 0, 4)
    const ignite = 1 - (1 - Math.min(lit / 1.1, 1)) ** 3
    const px = Math.max(1, numberOr(options.pixelSize, 1, 1, 64)) * dpr
    gl.uniform2f(uResolution, canvas.width, canvas.height)
    gl.uniform1f(uTime, clock * speed)
    gl.uniform1f(
      uIntensity,
      numberOr(options.intensity, DEFAULT_INTENSITY, 0, 1)
    )
    gl.uniform1f(uHeight, numberOr(options.height, DEFAULT_HEIGHT, 0, 1))
    gl.uniform1f(uIgnite, Math.max(ignite, 0.001))
    gl.uniform1f(uDark, dark ? 1 : 0)
    gl.uniform1f(uDither, options.dither ? 1 : 0)
    gl.uniform1f(uPixel, options.dither ? px : dpr)
    gl.uniform1f(uPointer, options.interactive === false ? 0 : pull)
    gl.uniform2f(uMouse, mouse.x, mouse.y)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    const settling =
      Math.abs(pull - pullTarget) > 0.002 ||
      Math.abs(target.x - mouse.x) > 0.001 ||
      Math.abs(target.y - mouse.y) > 0.001
    if (live || (settling && !mqReduce.matches)) {
      raf = requestAnimationFrame(tick)
    }
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
    wake()
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
