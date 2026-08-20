export type ShaderGradientTheme = "light" | "dark" | "auto"

export type ShaderGradientOptions = {
  /** Up to 4 hex colors — order: sky, sage, cream, lavender */
  colors?: string[]
  /** Drift speed. Default 0.14 */
  speed?: number
  /** Wash softness / size 0–1. Default 0.7 */
  blur?: number
  /** Color strength 0–1. Default 0.95 */
  intensity?: number
  /** Follow pointer gently. Default true */
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

/** Airy hero wash — sky / sage / cream / lavender on paper */
export const LIGHT_COLORS = ["#7CB4E0", "#B4D8C4", "#EFE4BC", "#D2D7EC"]
/**
 * Dusk hues that still read on slate — sky / sage / amber / lilac.
 * Bright enough to see, dark enough not to go pastel neon.
 */
export const DARK_COLORS = ["#3A6FA0", "#2F6B52", "#8A6B32", "#4A4D7A"]

export const LIGHT_FALLBACK = {
  backgroundColor: "#FCFBF9",
  backgroundImage: [
    "radial-gradient(60% 45% at 60% 20%, #8FC0E4 0%, transparent 70%)",
    "radial-gradient(40% 50% at 90% 46%, #8FC0E4 0%, transparent 70%)",
    "radial-gradient(30% 40% at 100% 60%, #BEDCCA 0%, transparent 70%)",
    "radial-gradient(38% 46% at 4% 56%, #F0E7C4 0%, transparent 70%)",
    "radial-gradient(28% 24% at 90% 74%, #F0E7C4 0%, transparent 70%)",
    "radial-gradient(40% 38% at 32% 38%, #D5D9EC 0%, transparent 70%)",
  ].join(", "),
} as const

export const DARK_FALLBACK = {
  backgroundColor: "#08090C",
  backgroundImage: [
    "radial-gradient(60% 45% at 60% 20%, #3A6FA0 0%, transparent 70%)",
    "radial-gradient(40% 50% at 90% 46%, #3A6FA0 0%, transparent 70%)",
    "radial-gradient(30% 40% at 100% 60%, #2F6B52 0%, transparent 70%)",
    "radial-gradient(38% 46% at 4% 56%, #8A6B32 0%, transparent 70%)",
    "radial-gradient(28% 24% at 90% 74%, #8A6B32 0%, transparent 70%)",
    "radial-gradient(40% 38% at 32% 38%, #4A4D7A 0%, transparent 70%)",
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
uniform float u_blur;
uniform float u_intensity;
uniform float u_dark;
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

// Super-gaussian field — elliptical, rotatable, flat-topped.
// The flat top is what stops each wash from showing a bright center dot.
float smear(vec2 p, vec2 c, vec2 r, float ang, float plateau) {
  vec2 d = p - c;
  float s = sin(ang);
  float co = cos(ang);
  d = vec2(d.x * co + d.y * s, -d.x * s + d.y * co) / r;
  return exp(-pow(dot(d, d) + 0.0001, plateau));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);

  // Square-ish space so washes keep their shape on any container
  vec2 st = vec2(uv.x * aspect, uv.y);

  float t = u_time * u_speed;

  // Low-frequency warp — gives the wash a watercolor edge instead of a clean ellipse
  vec2 warp = vec2(
    fbm(st * 1.2 + vec2(t * 0.22, t * 0.16)),
    fbm(st * 1.2 + vec2(-t * 0.18, t * 0.2) + 5.3)
  ) - 0.5;
  st += warp * (0.07 + u_blur * 0.08);
  st -= (u_mouse - 0.5) * 0.05;

  float grow = 0.85 + u_blur * 0.4;

  // Slow drift — long periods so it never reads as looping
  vec2 d1 = vec2(sin(t * 0.71), cos(t * 0.53)) * 0.045;
  vec2 d2 = vec2(cos(t * 0.61), sin(t * 0.83)) * 0.04;
  vec2 d3 = vec2(sin(t * 0.49), cos(t * 0.77)) * 0.05;
  vec2 d4 = vec2(cos(t * 0.87), sin(t * 0.59)) * 0.045;

  // Big sky sweep across the upper right — the dominant mass
  float g1 = smear(st, vec2((0.54 + d1.x) * aspect, 0.84 + d1.y),
                   vec2(0.54, 0.30) * grow, -0.5, 1.9);
  // Broad reinforcement, pulled toward the middle of the sweep
  float g2 = smear(st, vec2((0.66 + d2.x) * aspect, 0.72 + d2.y),
                   vec2(0.42, 0.30) * grow, -0.45, 1.9);
  // Sky trailing down the right edge
  float g3 = smear(st, vec2((0.92 + d2.y) * aspect, 0.50 + d2.x),
                   vec2(0.26, 0.32) * grow, 0.3, 1.7);
  // Sage green hugging the right edge
  float g4 = smear(st, vec2((0.99 + d3.x) * aspect, 0.44 + d3.y),
                   vec2(0.28, 0.34) * grow, 0.0, 1.7);
  // Butter cream on the left and low right
  float g5 = smear(st, vec2((0.06 + d4.x) * aspect, 0.44 + d4.y),
                   vec2(0.34, 0.38) * grow, 0.4, 1.8);
  float g6 = smear(st, vec2((0.86 + d1.y) * aspect, 0.22 + d1.x),
                   vec2(0.28, 0.22) * grow, -0.2, 1.6);
  // Lavender transition between the sky and the cream
  float g7 = smear(st, vec2((0.32 + d3.y) * aspect, 0.60 + d3.x),
                   vec2(0.32, 0.28) * grow, 0.2, 1.6);
  // Very wide base tint so the middle never falls back to bare white
  float g8 = smear(st, vec2((0.50 + d4.y) * aspect, 0.40 + d4.x),
                   vec2(0.95, 0.80) * grow, 0.0, 1.2);

  float w1 = g1 * 1.00;
  float w2 = g2 * 0.45;
  float w3 = g3 * 0.70;
  float w4 = g4 * 0.95;
  float w5 = g5 * 0.95;
  float w6 = g6 * 0.85;
  float w7 = g7 * 0.50;
  float w8 = g8 * 0.30;

  float sum = w1 + w2 + w3 + w4 + w5 + w6 + w7 + w8;

  // Neutral pale cast — keeps the open middle from going dead white
  vec3 base = mix(u_c4, u_c3, 0.5);

  // Weighted average keeps hues clean — no successive-mix muddiness
  vec3 tint =
    (u_c1 * w1 + u_c1 * w2 + u_c1 * w3 + u_c2 * w4 +
     u_c3 * w5 + u_c3 * w6 + u_c4 * w7 + base * w8) /
    max(sum, 0.0001);

  // Screen-style coverage so overlaps deepen smoothly instead of clipping
  float cover = 1.0 -
    (1.0 - clamp(w1, 0.0, 1.0)) * (1.0 - clamp(w2, 0.0, 1.0)) *
    (1.0 - clamp(w3, 0.0, 1.0)) * (1.0 - clamp(w4, 0.0, 1.0)) *
    (1.0 - clamp(w5, 0.0, 1.0)) * (1.0 - clamp(w6, 0.0, 1.0)) *
    (1.0 - clamp(w7, 0.0, 1.0)) * (1.0 - clamp(w8, 0.0, 1.0));

  // Let the lower left breathe back to bare paper / slate
  float fade = smoothstep(-0.35, 0.55, uv.x * 0.42 + uv.y * 0.72);
  cover *= fade * clamp(u_intensity, 0.0, 1.0);

  vec3 col;
  if (u_dark < 0.5) {
    vec3 paper = vec3(0.988, 0.986, 0.982);
    col = mix(paper, tint, clamp(cover, 0.0, 1.0));
  } else {
    // Near-black ink — dusk hues lift off the void without going neon
    vec3 slate = vec3(0.03, 0.032, 0.042);
    float glow = clamp(cover * 0.72, 0.0, 1.0);
    col = mix(slate, tint, glow);
  }

  // Dither — kills banding across these very low-contrast ramps
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.005;

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
  if (Number.isNaN(n)) return [0.72, 0.86, 0.94]
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
 * Quiet WebGL atmosphere for heroes and empty states — soft-focus color
 * fields behind UI. Theme-aware light / dusk.
 */
export function createShaderGradient(
  canvas: HTMLCanvasElement,
  initial: ShaderGradientOptions = {}
): ShaderGradientInstance | null {
  let options: Required<
    Pick<
      ShaderGradientOptions,
      "speed" | "blur" | "intensity" | "interactive" | "theme"
    >
  > &
    ShaderGradientOptions = {
    speed: 0.14,
    blur: 0.7,
    intensity: 0.95,
    interactive: true,
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
  if (!vs || !fs) return null

  const program = gl.createProgram()
  if (!program) return null
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
  const uBlur = gl.getUniformLocation(program, "u_blur")
  const uIntensity = gl.getUniformLocation(program, "u_intensity")
  const uDark = gl.getUniformLocation(program, "u_dark")
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

    gl.uniform2f(uResolution, canvas.width, canvas.height)
    gl.uniform1f(uTime, time)
    gl.uniform1f(uSpeed, reduce ? 0 : (options.speed ?? 0.14))
    gl.uniform1f(uBlur, Math.min(1, Math.max(0, options.blur ?? 0.7)))
    gl.uniform1f(uIntensity, Math.min(1, Math.max(0, options.intensity ?? 0.95)))
    gl.uniform1f(uDark, dark ? 1 : 0)
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
