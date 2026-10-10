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
   * Storm flashes that light the clouds from inside, every few seconds.
   * Off under reduced motion. Default false
   */
  lightning?: boolean
  /**
   * Window glass: a transparent dotted film over the sky.
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

/** Open daylight: zenith / horizon / white smoke / cool shade */
export const LIGHT_COLORS = ["#2478C8", "#8ECBF2", "#F7FBFF", "#C5D8EC"]
/** Storm ceiling: light slate / rain horizon / mid cloud / cool shade */
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

/**
 * Volumetric cumulus: rays from the viewer march through a slab of cloud
 * between BASE and TOP. Density is 3D noise shaped by a height profile and
 * cut back to a slow 2D coverage map, so clouds billow with clear sky
 * between them. Sunlight is attenuated
 * toward the sun (Beer–Lambert) and scattered with a two-lobe phase, so
 * edges near the sun glow and thick cores go gray underneath.
 */
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
uniform float u_flash;
uniform vec2 u_flashPos;
uniform sampler2D u_noise;

// Cloud slab, in world units above the viewer.
const float BASE = 1.0;
const float TOP = 1.9;
// Past this distance the layer is haze, not clouds.
const float FAR = 34.0;
const int STEPS = 36;
const int LIGHT_STEPS = 3;
// Horizon just inside the bottom edge, like a photo taken from a hill.
const float TILT = 0.46;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Value noise from a 256² random texture: one lookup per sample.
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return texture2D(u_noise, (i + f + 0.5) / 256.0).x;
}

// 3D value noise: the texture's green channel is red offset by (37, 239),
// so one lookup returns two neighbouring z slices.
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec2 uv = i.xy + vec2(37.0, 239.0) * i.z + f.xy;
  vec2 rg = texture2D(u_noise, (uv + 0.5) / 256.0).yx;
  return mix(rg.x, rg.y, f.z);
}

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// Henyey–Greenstein, scaled so isotropic scattering is 1.
float phaseHG(float mu, float g) {
  float g2 = g * g;
  return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * mu, 1.5);
}

// Local coverage: a slow 2D weather map splits the sky into distinct
// clouds with clear gaps between them.
float coverageAt(vec2 xz) {
  float weather = noise2(xz * mix(0.14, 0.32, u_amount) + 13.7);
  float cov = mix(0.22, 0.72, u_coverage);
  return clamp(cov + (weather - 0.5) * mix(1.0, 0.55, u_amount), 0.0, 1.0);
}

// Cumulus density: 3D fbm shaped by a height profile (flat-ish base,
// billowing top), then cut back to the local coverage.
float density(vec3 q, float hf, float cov, float t, float fine) {
  float shape = smoothstep(0.0, 0.14, hf) * (1.0 - smoothstep(0.35, 1.0, hf));
  float n = noise3(q) * 0.52;
  n += noise3(q * 2.03 + 3.1) * 0.27;
  n += noise3(q * 4.07 + 7.7) * 0.14;
  n += fine * noise3(q * 8.3 + 1.9) * 0.1;
  n /= 0.93 + fine * 0.1;
  float d = n * shape;
  d = clamp((d - (1.0 - cov)) / max(cov, 0.05), 0.0, 1.0);
  if (fine > 0.5 && d > 0.0) {
    // Wispy erosion at the rims, rising slowly like convection.
    float e = noise3(q * 6.1 + vec3(0.0, -t * 0.6, 0.0));
    d = clamp(d - e * mix(0.08, 0.26, u_variation) * (1.0 - d), 0.0, 1.0);
  }
  return d;
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

  vec2 s = (uv - 0.5) * vec2(aspect, 1.0);
  s += (u_mouse - 0.5) * vec2(0.06, 0.03);
  vec3 dir = normalize(vec3(s.x, s.y + TILT, 1.0));
  vec3 sunDir = normalize(vec3(0.85, 0.95, 1.0));
  float mu = dot(dir, sunDir);

  // Storm palettes (cloud darker than the horizon) mute the sun.
  float storm = smoothstep(0.02, -0.12, luma(u_c3) - luma(u_c2));
  float sunAmt = 1.0 - storm * 0.75;
  vec3 sunTint = mix(vec3(1.0, 0.96, 0.88), u_c3, 0.3);

  // --- Sky ---------------------------------------------------------------
  // Below the horizon there is only haze.
  float up = clamp(dir.y, 0.0, 1.0);
  vec3 sky = mix(u_c2, u_c1, pow(smoothstep(0.0, 0.85, up), 0.6));
  vec3 haze = mix(u_c2, vec3(1.0), 0.3 * luma(u_c2));
  sky = mix(sky, haze, exp(-up * 9.0) * 0.6);
  float glow = pow(max(mu, 0.0), 8.0) * 0.14 + pow(max(mu, 0.0), 120.0) * 0.3;
  sky += sunTint * glow * sunAmt;

  // --- Clouds ------------------------------------------------------------
  float freq = mix(2.2, 0.9, u_scale);
  // Wind carries the field sideways and toward the viewer.
  vec3 drift = vec3(t * 0.5, 0.0, t * 0.2);
  float sigma = mix(10.0, 26.0, u_intensity);
  vec3 sunLight = u_c3 * mix(1.12, 1.0, storm) * mix(vec3(1.0), sunTint, sunAmt * 0.5);
  float phase = mix(phaseHG(mu, -0.2), phaseHG(mu, 0.7), 0.12);

  vec3 L = vec3(0.0);
  float T = 1.0;
  float hitAt = 0.0;
  if (dir.y > 0.02) {
    float t0 = BASE / dir.y;
    if (t0 < FAR) {
      float t1 = min(TOP / dir.y, t0 + 5.0);
      float dt = (t1 - t0) / float(STEPS);
      // Jitter the start per pixel so the steps don't band.
      float tt = t0 + dt * hash(gl_FragCoord.xy);
      for (int i = 0; i < STEPS; i++) {
        vec3 p = dir * tt;
        vec3 q = p * freq + drift;
        float hf = (p.y - BASE) / (TOP - BASE);
        float cov = coverageAt(q.xz);
        float d = cov > 0.02 ? density(q, hf, cov, t, 1.0) : 0.0;
        if (d > 0.003) {
          if (hitAt == 0.0) hitAt = tt;
          // March toward the sun for self-shadowing.
          float od = 0.0;
          for (int j = 0; j < LIGHT_STEPS; j++) {
            vec3 lp = p + sunDir * (0.05 + float(j) * 0.12);
            float lh = (lp.y - BASE) / (TOP - BASE);
            od += density(lp * freq + drift, lh, cov, t, 0.0);
          }
          od *= 0.12 * sigma * 0.5;
          // Beer–Lambert with a softer tail standing in for multiple scattering.
          float beer = max(exp(-od), exp(-od * 0.25) * 0.6);
          float powder = 1.0 - exp(-d * 5.0);
          vec3 ambient = mix(u_c4 * mix(0.82, 0.62, storm), mix(u_c1, u_c3, 0.6), hf);
          vec3 lum = sunLight * beer * phase * mix(1.0, powder, 0.35) + ambient * 0.72;
          float dT = exp(-d * sigma * dt);
          L += T * (1.0 - dT) * lum;
          T *= dT;
          if (T < 0.02) break;
        }
        tt += dt;
      }
      // Aerial perspective: distant clouds melt into the horizon haze.
      float fog = 1.0 - exp(-max(hitAt, t0) * 0.05);
      L = mix(L, haze * (1.0 - T), fog * 0.85);
    }
  }

  vec3 col = sky * T + L;

  // Lightning, lit from inside the clouds it hits.
  if (u_flash > 0.0) {
    vec2 fp = vec2(u_flashPos.x * aspect, u_flashPos.y - 0.5);
    float bloom = exp(-dot(s - fp, s - fp) * 3.2);
    vec3 bolt = vec3(0.86, 0.9, 1.0);
    col += bolt * u_flash * (bloom * (1.0 - T) * 0.95 + 0.05);
  }

  if (u_glass > 0.5) {
    float pane = smoothstep(0.50, 0.22, length(glassLocal));
    col *= mix(0.93, 1.0, pane);
    vec2 hl = glassLocal - vec2(-0.16, 0.18);
    col += exp(-dot(hl, hl) * 55.0) * 0.035;
    col = mix(col, vec3(luma(col)), 0.04);
  }
  col += (hash(gl_FragCoord.xy + fract(u_time) * 91.0) - 0.5) * 0.008;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

/** Soft clouds hide resolution, so cap the canvas to keep the march cheap. */
const MAX_PIXELS = 720_000
const NOISE_SIZE = 256

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

/**
 * Seeded random texture for the shader's value noise. Green repeats red
 * offset by (37, 239), which lets one lookup serve two 3D noise slices.
 * Seeded so every visit gets the same sky.
 */
function noiseTexels() {
  const size = NOISE_SIZE
  const data = new Uint8Array(size * size * 4)
  let seed = 0x23d
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = Math.floor(rand() * 256)
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const from = ((y - 239) & (size - 1)) * size + ((x - 37) & (size - 1))
      const i = (y * size + x) * 4
      data[i + 1] = data[from * 4]!
      data[i + 2] = 0
      data[i + 3] = 255
    }
  }
  return data
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
 * WebGL sky for heroes: volumetric clouds drifting across clear blue in
 * light, storm gray in dark, with optional lightning. Optional
 * window-glass film. Pauses off screen and in hidden tabs, and holds a still
 * frame under reduced motion. Recovers from a lost WebGL context.
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
      | "lightning"
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
    lightning: false,
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

  let vs: WebGLShader | null = null
  let fs: WebGLShader | null = null
  let program: WebGLProgram | null = null
  let buf: WebGLBuffer | null = null
  let noiseTex: WebGLTexture | null = null
  let uResolution: WebGLUniformLocation | null = null
  let uTime: WebGLUniformLocation | null = null
  let uSpeed: WebGLUniformLocation | null = null
  let uCoverage: WebGLUniformLocation | null = null
  let uIntensity: WebGLUniformLocation | null = null
  let uAmount: WebGLUniformLocation | null = null
  let uScale: WebGLUniformLocation | null = null
  let uVariation: WebGLUniformLocation | null = null
  let uGlass: WebGLUniformLocation | null = null
  let uGlassSize: WebGLUniformLocation | null = null
  let uC1: WebGLUniformLocation | null = null
  let uC2: WebGLUniformLocation | null = null
  let uC3: WebGLUniformLocation | null = null
  let uC4: WebGLUniformLocation | null = null
  let uMouse: WebGLUniformLocation | null = null
  let uFlash: WebGLUniformLocation | null = null
  let uFlashPos: WebGLUniformLocation | null = null

  // Builds every GL resource; runs at startup and again after a lost context
  // comes back, since a restored context starts empty.
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
          "ShaderSky: program failed to link\n",
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

    noiseTex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, noiseTex)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      NOISE_SIZE,
      NOISE_SIZE,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      noiseTexels()
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.uniform1i(gl.getUniformLocation(program, "u_noise"), 0)

    uResolution = gl.getUniformLocation(program, "u_resolution")
    uTime = gl.getUniformLocation(program, "u_time")
    uSpeed = gl.getUniformLocation(program, "u_speed")
    uCoverage = gl.getUniformLocation(program, "u_coverage")
    uIntensity = gl.getUniformLocation(program, "u_intensity")
    uAmount = gl.getUniformLocation(program, "u_amount")
    uScale = gl.getUniformLocation(program, "u_scale")
    uVariation = gl.getUniformLocation(program, "u_variation")
    uGlass = gl.getUniformLocation(program, "u_glass")
    uGlassSize = gl.getUniformLocation(program, "u_glassSize")
    uC1 = gl.getUniformLocation(program, "u_c1")
    uC2 = gl.getUniformLocation(program, "u_c2")
    uC3 = gl.getUniformLocation(program, "u_c3")
    uC4 = gl.getUniformLocation(program, "u_c4")
    uMouse = gl.getUniformLocation(program, "u_mouse")
    uFlash = gl.getUniformLocation(program, "u_flash")
    uFlashPos = gl.getUniformLocation(program, "u_flashPos")
    return true
  }
  if (!initGl()) return null

  let raf = 0
  let destroyed = false
  // The browser dropped the GL context; nothing touches gl until it returns.
  let lost = false
  let onScreen = true
  let last = 0
  // Seconds of motion so far; it only advances while the sky is moving, so it
  // resumes where it left off.
  let clock = 0

  // One strike = a bright flicker and a softer echo, then 4–10s of quiet.
  const strike = { at: 0, next: 0, x: 0, y: 0 }
  const pulse = (s: number) => (s < 0 ? 0 : Math.exp(-s * 14))
  const flashAt = (now: number) => {
    if (!options.lightning || reduce) {
      strike.next = 0
      return 0
    }
    if (strike.next === 0) strike.next = now + 1500 + Math.random() * 2500
    if (now >= strike.next) {
      strike.at = now
      strike.next = now + 4000 + Math.random() * 6000
      strike.x = (Math.random() - 0.5) * 0.9
      strike.y = 0.55 + Math.random() * 0.35
    }
    if (strike.at === 0) return 0
    const s = (now - strike.at) / 1000
    return Math.min(1, pulse(s) + 0.65 * pulse(s - 0.16))
  }

  const shown = () => onScreen && document.visibilityState !== "hidden"
  const moving = () => shown() && !reduce

  function wake() {
    if (raf || destroyed || lost) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  // Device pixels per CSS pixel actually rendered (after the pixel cap).
  let pixelScale = 1
  const resize = () => {
    const parent = canvas.parentElement
    if (!parent) return
    const w = parent.clientWidth
    const h = parent.clientHeight
    if (w <= 0 || h <= 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    pixelScale = Math.min(dpr, Math.sqrt(MAX_PIXELS / (w * h)))
    canvas.width = Math.max(1, Math.floor(w * pixelScale))
    canvas.height = Math.max(1, Math.floor(h * pixelScale))
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    if (!lost) gl.viewport(0, 0, canvas.width, canvas.height)
    wake()
  }

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const onReduce = () => {
    reduce = mqReduce.matches
    wake()
  }
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
    if (!options.interactive) return
    const parent = canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    targetMouse.x = (e.clientX - rect.left) / rect.width
    targetMouse.y = 1 - (e.clientY - rect.top) / rect.height
    if (shown()) wake()
  }
  window.addEventListener("pointermove", onMove, { passive: true })

  const tick = (now: number) => {
    raf = 0
    if (destroyed || lost) return
    // Capped so a frame queued before the tab was hidden doesn't jump ahead,
    // but loose enough that slow devices still keep real time.
    const dt = Math.min(0.25, Math.max(0, (now - last) / 1000))
    last = now
    const live = moving()
    if (live) clock += dt

    const time = clock
    const paletteSrc = options.colors ?? (dark ? DARK_COLORS : LIGHT_COLORS)
    const palette = [0, 1, 2, 3].map((i) =>
      hexToRgb(paletteSrc[i % paletteSrc.length] ?? LIGHT_COLORS[i]!)
    )

    mouse.x += (targetMouse.x - mouse.x) * 0.03
    mouse.y += (targetMouse.y - mouse.y) * 0.03
    // The pointer shifts the clouds, so a still frame keeps easing toward it.
    const easing =
      options.interactive &&
      Math.abs(targetMouse.x - mouse.x) + Math.abs(targetMouse.y - mouse.y) >
        0.001

    const glassPx = Math.max(2, options.glassSize ?? 7) * pixelScale

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

    gl.uniform1f(uFlash, flashAt(clock * 1000))
    gl.uniform2f(uFlashPos, strike.x, strike.y)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
    if (live || (easing && shown())) raf = requestAnimationFrame(tick)
  }

  // Run after `tick` exists, since both can wake the loop.
  resize()
  const ro = new ResizeObserver(resize)
  if (canvas.parentElement) ro.observe(canvas.parentElement)
  onReduce()
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true
    wake()
  })
  io.observe(canvas)
  const onVisibility = () => wake()
  document.addEventListener("visibilitychange", onVisibility)

  // Without preventDefault the browser never restores a lost context.
  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
    cancelAnimationFrame(raf)
    raf = 0
  }
  const onRestored = () => {
    if (destroyed || !initGl()) return
    lost = false
    gl.viewport(0, 0, canvas.width, canvas.height)
    wake()
  }
  canvas.addEventListener("webglcontextlost", onLost)
  canvas.addEventListener("webglcontextrestored", onRestored)

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
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
      gl.deleteTexture(noiseTex)
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
