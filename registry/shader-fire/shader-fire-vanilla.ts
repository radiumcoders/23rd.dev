export type ShaderFireTheme = "light" | "dark" | "auto"

export type ShaderFireOptions = {
  /** Ember / flame / highlight hex */
  colors?: string[]
  /** Rise speed. Default 0.55 */
  speed?: number
  /** Coverage 0–1. Default 0.55 */
  intensity?: number
  /** How far tongues climb 0–1. Default 0.45 */
  height?: number
  /** Local heat under the pointer. Default true */
  interactive?: boolean
  /** Ordered Bayer pixels instead of a soft wash. Default false */
  dither?: boolean
  /** Dither cell size in CSS px. Default `1` */
  pixelSize?: number
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class) so light and dark swap with the site theme.
   */
  theme?: ShaderFireTheme
  /** Fires whenever resolved dark mode changes (CSS fallback). */
  onThemeChange?: (dark: boolean) => void
}

export type ShaderFireInstance = {
  setOptions: (options: Partial<ShaderFireOptions>) => void
  destroy: () => void
}

/** Warm ink on paper — sienna / amber / dusty peach */
export const LIGHT_COLORS = ["#9C3A24", "#C96A32", "#E6C4A0"]
/** Visible coals on slate — ember / flame / highlight */
export const DARK_COLORS = ["#A33A18", "#D4682A", "#E8B45A"]

export const LIGHT_FALLBACK = {
  backgroundColor: "#FCFBF9",
  backgroundImage: [
    "radial-gradient(80% 42% at 50% 108%, #9C3A24 0%, transparent 70%)",
    "radial-gradient(36% 28% at 22% 100%, #C96A32 0%, transparent 72%)",
    "radial-gradient(32% 24% at 78% 100%, #C96A32 0%, transparent 72%)",
    "radial-gradient(22% 16% at 50% 100%, #E6C4A0 0%, transparent 70%)",
  ].join(", "),
} as const

export const DARK_FALLBACK = {
  backgroundColor: "#08090C",
  backgroundImage: [
    "radial-gradient(80% 42% at 50% 108%, #A33A18 0%, transparent 70%)",
    "radial-gradient(36% 28% at 22% 100%, #D4682A 0%, transparent 72%)",
    "radial-gradient(32% 24% at 78% 100%, #D4682A 0%, transparent 72%)",
    "radial-gradient(22% 16% at 50% 100%, #E8B45A 0%, transparent 70%)",
  ].join(", "),
} as const

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
uniform float u_speed;
uniform float u_intensity;
uniform float u_height;
uniform float u_dark;
uniform float u_dither;
uniform float u_pixelSize;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec2 u_mouse;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

// Classic Bayer (WebGL1-safe, no bitwise ops)
float bayer2(vec2 c) {
  return mod(c.x * 2.0 + c.y * 3.0, 4.0);
}

float bayer4(vec2 p) {
  vec2 c = mod(floor(p), 4.0);
  vec2 hi = floor(c * 0.5);
  vec2 lo = mod(c, 2.0);
  return bayer2(lo) * 4.0 + bayer2(hi);
}

float bayer8(vec2 p) {
  vec2 c = mod(floor(p), 8.0);
  vec2 hi = floor(c * 0.5);
  vec2 lo = mod(c, 2.0);
  return (bayer4(hi) * 4.0 + bayer2(lo) + 0.5) / 64.0;
}

float fireField(vec2 uv, float aspect, float t) {
  float climb = mix(0.22, 0.82, clamp(u_height, 0.0, 1.0));

  // Column space — sway as they rise
  vec2 q = vec2(uv.x * aspect * 1.85, uv.y * 1.55 - t * 0.48);
  q.x += sin(uv.y * 7.0 + t * 1.6) * 0.045 * (0.25 + uv.y);

  // Two-pass domain warp — curling tongues, not blobs
  vec2 w1 = vec2(
    fbm(q * 1.7 + vec2(t * 0.28, t * 0.22)),
    fbm(q * 1.7 + vec2(-t * 0.24, t * 0.31) + 5.2)
  );
  q += (w1 - 0.5) * 0.58;
  vec2 w2 = vec2(
    fbm(q * 3.4 - vec2(t * 0.52, 0.0)),
    fbm(q * 3.4 + vec2(0.0, t * 0.44) + 2.7)
  );
  q += (w2 - 0.5) * 0.26;

  float shape = fbm(q * 2.35);
  float detail = fbm(q * 7.2 + vec2(0.0, t * 1.7));
  float flicker = 0.9 + 0.1 * sin(t * 13.0 + uv.x * 9.0 + shape * 6.0);
  float field = (shape * 0.68 + detail * 0.32) * flicker;

  // Hotter, wider base; thinner breakaways as they climb
  float taper = pow(clamp(1.0 - uv.y / max(climb, 0.05), 0.0, 1.0), 1.35);
  float core = pow(clamp(1.0 - uv.y / max(climb * 0.42, 0.04), 0.0, 1.0), 2.1);
  field = field * taper + core * shape * 0.38;

  float md = length((uv - u_mouse) * vec2(aspect, 1.0));
  field += exp(-md * 6.8) * 0.28 * (0.55 + 0.45 * shape);

  field *= smoothstep(0.0, 0.05, uv.y + 0.015);
  field = smoothstep(0.22, 0.74, field);

  float intensity = mix(0.34, 1.18, clamp(u_intensity, 0.0, 1.0));
  return clamp(field * intensity, 0.0, 1.0);
}

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float px = max(u_pixelSize, 1.0);

  vec2 sampleUv = gl_FragCoord.xy / u_resolution.xy;
  vec2 cell = floor(gl_FragCoord.xy / px);
  if (u_dither > 0.5) {
    sampleUv = (cell + 0.5) * px / u_resolution.xy;
  }

  float field = fireField(sampleUv, aspect, t);

  if (u_dither > 0.5) {
    float bit = step(bayer8(cell), field);
    field = bit * mix(0.45, 1.0, field);
  }

  vec3 ember = u_c1;
  vec3 flame = u_c2;
  vec3 highlight = u_c3;
  vec3 tint = mix(ember, flame, smoothstep(0.08, 0.48, field));
  tint = mix(tint, highlight, pow(smoothstep(0.42, 0.96, field), 1.55));

  vec3 paper = u_dark < 0.5
    ? vec3(0.992, 0.986, 0.978)
    : vec3(0.03, 0.032, 0.042);
  // Light: watercolor on paper — more air, less orange stain
  float cover = u_dither > 0.5
    ? field
    : field * (u_dark < 0.5 ? 0.68 : 0.84);
  vec3 col = mix(paper, tint, clamp(cover, 0.0, 1.0));
  if (u_dark < 0.5 && u_dither < 0.5) {
    float haze = field * (1.0 - field) * 0.12;
    col = mix(col, paper, haze);
  }

  if (u_dither < 0.5) {
    col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.01;
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function isDev() {
  return typeof process !== "undefined" && process.env?.NODE_ENV !== "production"
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
  if (Number.isNaN(n)) return [0.77, 0.38, 0.18]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
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

export function resolveDark(theme: ShaderFireTheme): boolean {
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
        "ShaderFire: shader failed to compile\n",
        gl.getShaderInfoLog(shader)
      )
    }
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * Sparse 2D fire wash — tongues rise from the bottom behind UI.
 * Theme-aware light / dusk.
 */
export function createShaderFire(
  canvas: HTMLCanvasElement,
  initial: ShaderFireOptions = {}
): ShaderFireInstance | null {
  let options: Required<
    Pick<
      ShaderFireOptions,
      | "speed"
      | "intensity"
      | "height"
      | "interactive"
      | "dither"
      | "pixelSize"
      | "theme"
    >
  > &
    ShaderFireOptions = {
    speed: 0.55,
    intensity: 0.55,
    height: 0.45,
    interactive: true,
    dither: false,
    pixelSize: 1,
    theme: "auto",
    ...initial,
  }

  const mouse = { x: 0.5, y: 0.12 }
  const targetMouse = { x: 0.5, y: 0.12 }
  let reduce = false
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
  if (!vs || !fs) return null

  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (isDev()) {
      console.warn(
        "ShaderFire: program failed to link\n",
        gl.getProgramInfoLog(program)
      )
    }
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

  const uResolution = gl.getUniformLocation(program, "u_resolution")
  const uTime = gl.getUniformLocation(program, "u_time")
  const uSpeed = gl.getUniformLocation(program, "u_speed")
  const uIntensity = gl.getUniformLocation(program, "u_intensity")
  const uHeight = gl.getUniformLocation(program, "u_height")
  const uDark = gl.getUniformLocation(program, "u_dark")
  const uC1 = gl.getUniformLocation(program, "u_c1")
  const uC2 = gl.getUniformLocation(program, "u_c2")
  const uC3 = gl.getUniformLocation(program, "u_c3")
  const uMouse = gl.getUniformLocation(program, "u_mouse")
  const uDither = gl.getUniformLocation(program, "u_dither")
  const uPixelSize = gl.getUniformLocation(program, "u_pixelSize")

  let raf = 0
  let running = true
  const start = performance.now()
  let frozenTime = 0

  const resize = () => {
    const parent = canvas.parentElement
    if (!parent) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = parent.clientWidth
    const h = parent.clientHeight
    if (w <= 0 || h <= 0) return
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(h * dpr))
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    gl.viewport(0, 0, canvas.width, canvas.height)
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
    const next = resolveDark(options.theme ?? "auto")
    if (next === dark) return
    dark = next
    options.onThemeChange?.(dark)
  }
  const mo = new MutationObserver(syncTheme)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  })
  const mqDark = window.matchMedia("(prefers-color-scheme: dark)")
  mqDark.addEventListener("change", syncTheme)

  const onMove = (e: PointerEvent) => {
    if (!options.interactive) return
    const parent = canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    targetMouse.x = (e.clientX - rect.left) / rect.width
    targetMouse.y = 1 - (e.clientY - rect.top) / rect.height
  }
  window.addEventListener("pointermove", onMove, { passive: true })

  const tick = (now: number) => {
    if (!running) return

    if (reduce) {
      if (frozenTime === 0) frozenTime = (now - start) / 1000
    } else {
      frozenTime = 0
    }

    const time = reduce ? frozenTime : (now - start) / 1000
    const paletteSrc = options.colors ?? (dark ? DARK_COLORS : LIGHT_COLORS)
    const palette = [0, 1, 2].map((i) =>
      hexToRgb(paletteSrc[i % paletteSrc.length] ?? LIGHT_COLORS[i]!)
    )

    mouse.x += (targetMouse.x - mouse.x) * 0.05
    mouse.y += (targetMouse.y - mouse.y) * 0.05

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const px = Math.max(1, options.pixelSize ?? 1) * dpr

    gl.uniform2f(uResolution, canvas.width, canvas.height)
    gl.uniform1f(uTime, time)
    gl.uniform1f(uSpeed, reduce ? 0 : (options.speed ?? 0.55))
    gl.uniform1f(uIntensity, Math.min(1, Math.max(0, options.intensity ?? 0.55)))
    gl.uniform1f(uHeight, Math.min(1, Math.max(0, options.height ?? 0.45)))
    gl.uniform1f(uDark, dark ? 1 : 0)
    gl.uniform1f(uDither, options.dither ? 1 : 0)
    gl.uniform1f(uPixelSize, px)
    gl.uniform3f(uC1, palette[0]![0], palette[0]![1], palette[0]![2])
    gl.uniform3f(uC2, palette[1]![0], palette[1]![1], palette[1]![2])
    gl.uniform3f(uC3, palette[2]![0], palette[2]![1], palette[2]![2])
    gl.uniform2f(
      uMouse,
      options.interactive ? mouse.x : 0.5,
      options.interactive ? mouse.y : 0.12
    )

    gl.drawArrays(gl.TRIANGLES, 0, 6)
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
      window.removeEventListener("pointermove", onMove)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    },
  }
}
