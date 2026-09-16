export type ShaderSkyTheme = "light" | "dark" | "auto"

export type ShaderSkyOptions = {
  /** Zenith / horizon / cloud / shade hex */
  colors?: string[]
  /** Drift speed. Default 0.1 */
  speed?: number
  /** How thick the clouds read 0–1. Default 0.5 */
  coverage?: number
  /** Cloud strength 0–1. Default 0.9 */
  intensity?: number
  /** How many distinct clouds 0–1. Default 0.5 */
  amount?: number
  /** Cloud size 0–1. Default 0.4 */
  scale?: number
  /** Mix of big and small clouds 0–1. Default 0.7 */
  variation?: number
  /** Follow the pointer gently. Default false */
  interactive?: boolean
  /**
   * Window glass — a transparent dotted film over the sky.
   * Default false
   */
  glass?: boolean
  /** Glass texture cell size in CSS px. Default `7` */
  glassSize?: number
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class) **only when `colors` is omitted**, so the stock
   * clear-sky / rain palettes swap with the site theme. A custom palette
   * stays put.
   */
  theme?: ShaderSkyTheme
  /** Fires whenever resolved dark mode changes (CSS fallback). */
  onThemeChange?: (dark: boolean) => void
}

export type ShaderSkyInstance = {
  setOptions: (options: Partial<ShaderSkyOptions>) => void
  destroy: () => void
}

/** Open daylight — zenith / horizon / white smoke / cool shade */
export const LIGHT_COLORS = ["#2478C8", "#8ECBF2", "#F7FBFF", "#C5D8EC"]
/** Storm ceiling — light slate / rain horizon / mid cloud / cool shade */
export const DARK_COLORS = ["#9AA3AD", "#C8CED4", "#5C6570", "#3F4750"]

export const LIGHT_FALLBACK = {
  backgroundColor: "#5BA3DC",
  backgroundImage: [
    "linear-gradient(180deg, #2478C8 0%, #5BA3DC 48%, #8ECBF2 100%)",
    "radial-gradient(28% 18% at 22% 68%, #F7FBFF 0%, transparent 70%)",
    "radial-gradient(24% 16% at 74% 42%, #F7FBFF 0%, transparent 68%)",
    "radial-gradient(20% 14% at 88% 76%, #C5D8EC 0%, transparent 70%)",
  ].join(", "),
} as const

export const DARK_FALLBACK = {
  backgroundColor: "#A8B0B8",
  backgroundImage: [
    "linear-gradient(180deg, #9AA3AD 0%, #B0B7BF 46%, #C8CED4 100%)",
    "radial-gradient(32% 22% at 24% 62%, #5C6570 0%, transparent 70%)",
    "radial-gradient(26% 18% at 76% 34%, #3F4750 0%, transparent 68%)",
    "radial-gradient(22% 16% at 58% 80%, #5C6570 0%, transparent 70%)",
  ].join(", "),
} as const

export function skyFallback(colors: string[] | undefined, dark: boolean) {
  if (colors && colors.length > 0) {
    const c1 = colors[0] ?? LIGHT_COLORS[0]!
    const c2 = colors[1] ?? LIGHT_COLORS[1]!
    const c3 = colors[2] ?? LIGHT_COLORS[2]!
    const c4 = colors[3] ?? LIGHT_COLORS[3]!
    return {
      backgroundColor: c2,
      backgroundImage: [
        `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)`,
        `radial-gradient(28% 18% at 22% 68%, ${c3} 0%, transparent 70%)`,
        `radial-gradient(24% 16% at 74% 42%, ${c3} 0%, transparent 68%)`,
        `radial-gradient(20% 14% at 88% 76%, ${c4} 0%, transparent 70%)`,
      ].join(", "),
    }
  }
  return dark ? DARK_FALLBACK : LIGHT_FALLBACK
}

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
uniform float u_coverage;
uniform float u_intensity;
uniform float u_amount;
uniform float u_scale;
uniform float u_variation;
uniform float u_glass;
uniform float u_glassSize;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_c4;
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
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

vec2 skyField(vec2 uv, float aspect, float t) {
  vec2 st = vec2(uv.x * aspect, uv.y);
  st -= (u_mouse - 0.5) * 0.04;

  float amount = clamp(u_amount, 0.0, 1.0);
  float scale = clamp(u_scale, 0.0, 1.0);
  float variation = clamp(u_variation, 0.0, 1.0);
  float cover = clamp(u_coverage, 0.0, 1.0);

  float freq = mix(2.65, 1.05, scale);
  vec2 wind = vec2(t * 0.18, t * 0.012);
  vec2 p = vec2(st.x, st.y * 1.18) * freq + vec2(wind.x, 0.0);

  vec2 q = vec2(
    fbm(p + vec2(0.0, wind.y)),
    fbm(p + vec2(5.2, 1.3) - wind.yx)
  );
  vec2 r = vec2(
    fbm(p + q * 1.35 + vec2(1.7, 9.2) + wind * 0.4),
    fbm(p + q * 1.35 + vec2(8.3, 2.8) - wind * 0.28)
  );

  vec2 base = p * 0.58 + r * 1.15 + wind * 0.2;
  float big = fbm(base);
  float small = fbm(p * mix(2.2, 1.35, scale) + q * 0.7 + vec2(t * 0.26, 0.1));
  float n = mix(big, mix(big, small, 0.55), variation);
  n = n * n * (3.0 - 2.0 * n);

  float lo = mix(0.42, 0.24, amount) - (cover - 0.5) * 0.10;
  float hi = lo + mix(0.20, 0.13, amount);
  float density = smoothstep(lo, hi, n);

  float far = fbm(st * freq * 0.38 + vec2(t * 0.09, 0.3) + 3.1);
  far = far * far * (3.0 - 2.0 * far);
  float farC = smoothstep(lo - 0.04, hi - 0.02, far) * mix(0.16, 0.42, amount);
  density = clamp(density + farC * (1.0 - density * 0.4), 0.0, 1.0);
  density *= mix(0.78, 1.14, cover);

  // Sun from upper-right: denser along the light ray = self-shadow.
  vec2 sun = vec2(0.22, 0.28);
  float nLit = fbm(base + sun);
  nLit = nLit * nLit * (3.0 - 2.0 * nLit);
  float lift = clamp((n - nLit) * 2.6, -1.0, 1.0);

  float mottling = fbm(p * 3.15 + q * 0.35 + vec2(2.4, -1.1));
  float under = smoothstep(0.22, 0.86, n) * (1.0 - st.y * 0.48);
  float shade = 0.40 + lift * 0.50 - under * 0.30;
  shade = mix(shade, shade * mix(0.58, 1.32, mottling), 0.52);
  shade = clamp(shade, 0.0, 1.0);

  return vec2(clamp(density, 0.0, 1.0), shade);
}

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float cell = max(u_glassSize, 2.0);

  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 glassLocal = fract(gl_FragCoord.xy / cell) - 0.5;
  if (u_glass > 0.5) {
    uv += glassLocal * 0.0032;
  }

  vec2 field = skyField(uv, aspect, t);
  float density = field.x;
  float shade = field.y;

  float h = pow(clamp(uv.y, 0.0, 1.0), 0.76);
  vec3 sky = mix(u_c2, u_c1, h);

  vec3 belly = mix(u_c4, u_c1, 0.32) * 0.76;
  vec3 body = mix(u_c4, u_c3, 0.58);
  vec3 top = mix(u_c3, vec3(1.0), 0.52);
  vec3 lit = mix(belly, body, smoothstep(0.12, 0.58, shade));
  lit = mix(lit, top, smoothstep(0.55, 0.98, shade) * 0.72);
  lit = mix(lit, belly, (1.0 - shade) * 0.22 * density);

  float alpha = density * mix(0.55, 1.12, clamp(u_intensity, 0.0, 1.0));
  alpha = clamp(alpha, 0.0, 1.0);
  vec3 col = mix(sky, lit, alpha);

  if (u_glass > 0.5) {
    float pane = smoothstep(0.50, 0.22, length(glassLocal));
    col *= mix(0.93, 1.0, pane);
    vec2 hl = glassLocal - vec2(-0.16, 0.18);
    col += exp(-dot(hl, hl) * 55.0) * 0.035;
    col = mix(col, vec3(dot(col, vec3(0.299, 0.587, 0.114))), 0.04);
    col += (hash(gl_FragCoord.xy) - 0.5) * 0.008;
  } else {
    col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.008;
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function isDev() {
  return (
    typeof process !== "undefined" && process.env?.NODE_ENV !== "production"
  )
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
  if (Number.isNaN(n)) return [0.14, 0.47, 0.78]
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

export function resolveDark(theme: ShaderSkyTheme): boolean {
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
        "ShaderSky: shader failed to compile\n",
        gl.getShaderInfoLog(shader)
      )
    }
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * WebGL sky for heroes — clear blue with drifting clouds in light,
 * storm gray in dark. Optional window-glass film.
 */
export function createShaderSky(
  canvas: HTMLCanvasElement,
  initial: ShaderSkyOptions = {}
): ShaderSkyInstance | null {
  let options: Required<
    Pick<
      ShaderSkyOptions,
      | "speed"
      | "coverage"
      | "intensity"
      | "amount"
      | "scale"
      | "variation"
      | "interactive"
      | "glass"
      | "glassSize"
      | "theme"
    >
  > &
    ShaderSkyOptions = {
    speed: 0.1,
    coverage: 0.5,
    intensity: 0.9,
    amount: 0.5,
    scale: 0.4,
    variation: 0.7,
    interactive: false,
    glass: false,
    glassSize: 7,
    theme: "auto",
    ...initial,
  }

  const mouse = { x: 0.5, y: 0.5 }
  const targetMouse = { x: 0.5, y: 0.5 }
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
        "ShaderSky: program failed to link\n",
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

  const uResolution = gl.getUniformLocation(program, "u_resolution")
  const uTime = gl.getUniformLocation(program, "u_time")
  const uSpeed = gl.getUniformLocation(program, "u_speed")
  const uCoverage = gl.getUniformLocation(program, "u_coverage")
  const uIntensity = gl.getUniformLocation(program, "u_intensity")
  const uAmount = gl.getUniformLocation(program, "u_amount")
  const uScale = gl.getUniformLocation(program, "u_scale")
  const uVariation = gl.getUniformLocation(program, "u_variation")
  const uGlass = gl.getUniformLocation(program, "u_glass")
  const uGlassSize = gl.getUniformLocation(program, "u_glassSize")
  const uC1 = gl.getUniformLocation(program, "u_c1")
  const uC2 = gl.getUniformLocation(program, "u_c2")
  const uC3 = gl.getUniformLocation(program, "u_c3")
  const uC4 = gl.getUniformLocation(program, "u_c4")
  const uMouse = gl.getUniformLocation(program, "u_mouse")

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
    const palette = [0, 1, 2, 3].map((i) =>
      hexToRgb(paletteSrc[i % paletteSrc.length] ?? LIGHT_COLORS[i]!)
    )

    mouse.x += (targetMouse.x - mouse.x) * 0.03
    mouse.y += (targetMouse.y - mouse.y) * 0.03

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const glassPx = Math.max(2, options.glassSize ?? 7) * dpr

    gl.uniform2f(uResolution, canvas.width, canvas.height)
    gl.uniform1f(uTime, time)
    gl.uniform1f(uSpeed, reduce ? 0 : (options.speed ?? 0.1))
    gl.uniform1f(uCoverage, Math.min(1, Math.max(0, options.coverage ?? 0.5)))
    gl.uniform1f(uIntensity, Math.min(1, Math.max(0, options.intensity ?? 0.9)))
    gl.uniform1f(uAmount, Math.min(1, Math.max(0, options.amount ?? 0.5)))
    gl.uniform1f(uScale, Math.min(1, Math.max(0, options.scale ?? 0.4)))
    gl.uniform1f(uVariation, Math.min(1, Math.max(0, options.variation ?? 0.7)))
    gl.uniform1f(uGlass, options.glass ? 1 : 0)
    gl.uniform1f(uGlassSize, glassPx)
    gl.uniform3f(uC1, palette[0]![0], palette[0]![1], palette[0]![2])
    gl.uniform3f(uC2, palette[1]![0], palette[1]![1], palette[1]![2])
    gl.uniform3f(uC3, palette[2]![0], palette[2]![1], palette[2]![2])
    gl.uniform3f(uC4, palette[3]![0], palette[3]![1], palette[3]![2])
    gl.uniform2f(
      uMouse,
      options.interactive ? mouse.x : 0.5,
      options.interactive ? mouse.y : 0.5
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
