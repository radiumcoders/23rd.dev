export type AsciiFluidTheme = "light" | "dark" | "auto"

export type AsciiFluidOptions = {
  /**
   * Brightness ramp (sparse → dense). Default is a full letter/symbol map.
   */
  charset?: string
  /** Glyph cell size in CSS pixels. Default `12` */
  cellSize?: number
  /** Ink color (hex). Default follows theme. */
  color?: string
  /** Stage color (hex). Default follows theme. */
  backgroundColor?: string
  /** Mouse trail / fluid force. Default `1` */
  force?: number
  /** How quickly trails fade (higher = vanish sooner). Default `0.05` */
  dissipation?: number
  /** Trail brush size 0–1. Default `0.55` */
  brush?: number
  /** Soft ambient swirl when idle. Default `true` */
  animate?: boolean
  /** Follow pointer. Default `true` */
  interactive?: boolean
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class).
   */
  theme?: AsciiFluidTheme
}

export type AsciiFluidInstance = {
  setOptions: (options: Partial<AsciiFluidOptions>) => void
  destroy: () => void
}

/** Sparse → dense brightness ramp (letters + symbols). */
export const DEFAULT_CHARSET =
  " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"

const LIGHT = { ink: "#18181b", paper: "#fafafa" }
const DARK = { ink: "#e4e4e7", paper: "#09090b" }

const VERT = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// Velocity / dye stored biased in RGBA8: enc(v) = v * 0.05 + 0.5
const FRAG_SPLAT = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_target;
uniform vec2 u_point;
uniform vec3 u_color;
uniform float u_radius;
uniform float u_aspect;
uniform float u_velocityField;

vec2 dec(vec2 e) { return (e - 0.5) / 0.05; }
vec2 enc(vec2 v) { return clamp(v * 0.05 + 0.5, 0.0, 1.0); }

void main() {
  vec2 p = v_uv - u_point;
  p.x *= u_aspect;
  float d = exp(-dot(p, p) / max(u_radius, 0.0001));
  vec3 base = texture2D(u_target, v_uv).xyz;
  if (u_velocityField > 0.5) {
    vec2 next = dec(base.xy) + u_color.xy * d;
    gl_FragColor = vec4(enc(next), 0.5, 1.0);
  } else {
    gl_FragColor = vec4(base + u_color * d, 1.0);
  }
}
`

const FRAG_ADVECT = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform vec2 u_texel;
uniform float u_dt;
uniform float u_dissipation;
uniform float u_velocityField;

vec2 dec(vec2 e) { return (e - 0.5) / 0.05; }
vec2 enc(vec2 v) { return clamp(v * 0.05 + 0.5, 0.0, 1.0); }

void main() {
  vec2 vel = dec(texture2D(u_velocity, v_uv).xy);
  vec2 coord = v_uv - u_dt * vel * u_texel * 110.0;
  vec4 src = texture2D(u_source, clamp(coord, 0.0, 1.0));
  if (u_velocityField > 0.5) {
    vec2 next = dec(src.xy) * u_dissipation;
    gl_FragColor = vec4(enc(next), 0.5, 1.0);
  } else {
    gl_FragColor = vec4(src.xyz * u_dissipation, 1.0);
  }
}
`

const FRAG_DIVERGENCE = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_texel;

vec2 dec(vec2 e) { return (e - 0.5) / 0.05; }

void main() {
  float L = dec(texture2D(u_velocity, v_uv - vec2(u_texel.x, 0.0)).xy).x;
  float R = dec(texture2D(u_velocity, v_uv + vec2(u_texel.x, 0.0)).xy).x;
  float B = dec(texture2D(u_velocity, v_uv - vec2(0.0, u_texel.y)).xy).y;
  float T = dec(texture2D(u_velocity, v_uv + vec2(0.0, u_texel.y)).xy).y;
  float div = 0.5 * ((R - L) + (T - B));
  gl_FragColor = vec4(div * 0.05 + 0.5, 0.0, 0.0, 1.0);
}
`

const FRAG_PRESSURE = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_pressure;
uniform sampler2D u_divergence;
uniform vec2 u_texel;

float dec1(float e) { return (e - 0.5) / 0.05; }
float enc1(float v) { return clamp(v * 0.05 + 0.5, 0.0, 1.0); }

void main() {
  float L = dec1(texture2D(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x);
  float R = dec1(texture2D(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x);
  float B = dec1(texture2D(u_pressure, v_uv - vec2(0.0, u_texel.y)).x);
  float T = dec1(texture2D(u_pressure, v_uv + vec2(0.0, u_texel.y)).x);
  float C = dec1(texture2D(u_divergence, v_uv).x);
  float p = (L + R + B + T - C) * 0.25;
  gl_FragColor = vec4(enc1(p), 0.0, 0.0, 1.0);
}
`

const FRAG_GRADIENT = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_pressure;
uniform sampler2D u_velocity;
uniform vec2 u_texel;

float dec1(float e) { return (e - 0.5) / 0.05; }
vec2 dec(vec2 e) { return (e - 0.5) / 0.05; }
vec2 enc(vec2 v) { return clamp(v * 0.05 + 0.5, 0.0, 1.0); }

void main() {
  float L = dec1(texture2D(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x);
  float R = dec1(texture2D(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x);
  float B = dec1(texture2D(u_pressure, v_uv - vec2(0.0, u_texel.y)).x);
  float T = dec1(texture2D(u_pressure, v_uv + vec2(0.0, u_texel.y)).x);
  vec2 vel = dec(texture2D(u_velocity, v_uv).xy);
  vel -= vec2(R - L, T - B) * 0.5;
  gl_FragColor = vec4(enc(vel), 0.5, 1.0);
}
`

const FRAG_DISPLAY = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_dye;
uniform sampler2D u_atlas;
uniform vec2 u_resolution;
uniform vec2 u_cell;
uniform float u_charCount;
uniform vec3 u_ink;
uniform vec3 u_paper;
uniform float u_time;
uniform float u_animate;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 pixel = v_uv * u_resolution;
  vec2 cell = floor(pixel / u_cell);
  vec2 cellUv = (cell + 0.5) * u_cell / u_resolution;

  float dens = clamp(texture2D(u_dye, cellUv).x, 0.0, 1.0);

  // Soft neighborhood sample for a low-res glow halo under the glyphs
  vec2 texel = u_cell / u_resolution;
  float glow =
    dens * 0.40 +
    texture2D(u_dye, cellUv + vec2( texel.x, 0.0)).x * 0.15 +
    texture2D(u_dye, cellUv - vec2( texel.x, 0.0)).x * 0.15 +
    texture2D(u_dye, cellUv + vec2(0.0,  texel.y)).x * 0.15 +
    texture2D(u_dye, cellUv - vec2(0.0,  texel.y)).x * 0.15;
  glow = clamp(glow, 0.0, 1.0);
  glow = pow(glow, 1.35);

  float lit = dens;
  if (u_animate > 0.5) {
    float flicker = hash21(cell + floor(u_time * 10.0)) - 0.5;
    lit = clamp(lit + flicker * 0.05, 0.0, 1.0);
  }

  float idx = min(floor(lit * (u_charCount - 0.001)), u_charCount - 1.0);
  vec2 local = fract(pixel / u_cell);
  float u0 = (idx + local.x) / u_charCount;
  float glyph = texture2D(u_atlas, vec2(u0, local.y)).r;

  float alpha = glyph * smoothstep(0.02, 0.12, dens);

  // Paper → soft ink wash → sharp ASCII on top
  float wash = glow * 0.22;
  vec3 col = mix(u_paper, u_ink, wash);
  col = mix(col, u_ink, clamp(alpha, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
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
  if (Number.isNaN(n)) return [0.1, 0.1, 0.12]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false
  const root = document.documentElement
  if (root.classList.contains("dark")) return true
  if (root.classList.contains("light")) return false
  const dataTheme = root.getAttribute("data-theme")
  if (dataTheme === "dark") return true
  if (dataTheme === "light") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function resolveDark(theme: AsciiFluidTheme): boolean {
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
        "AsciiFluid: shader failed to compile\n",
        gl.getShaderInfoLog(shader)
      )
    }
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(
  gl: WebGLRenderingContext,
  vs: WebGLShader,
  fragSource: string
) {
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSource)
  if (!fs) return null
  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(fs)
    return null
  }
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (isDev()) {
      console.warn(
        "AsciiFluid: program failed to link\n",
        gl.getProgramInfoLog(program)
      )
    }
    gl.deleteProgram(program)
    gl.deleteShader(fs)
    return null
  }
  return { program, fs }
}

type FBO = {
  tex: WebGLTexture
  fbo: WebGLFramebuffer
  w: number
  h: number
}

function createFBO(
  gl: WebGLRenderingContext,
  w: number,
  h: number,
  filter: number
): FBO | null {
  const tex = gl.createTexture()
  const fbo = gl.createFramebuffer()
  if (!tex || !fbo) return null
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    w,
    h,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  )
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  )
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return { tex, fbo, w, h }
}

function createDoubleFBO(
  gl: WebGLRenderingContext,
  w: number,
  h: number,
  filter: number
) {
  const a = createFBO(gl, w, h, filter)
  const b = createFBO(gl, w, h, filter)
  if (!a || !b) return null
  return {
    read: a,
    write: b,
    swap() {
      const t = this.read
      this.read = this.write
      this.write = t
    },
  }
}

function buildAtlas(
  gl: WebGLRenderingContext,
  charset: string
): { tex: WebGLTexture; count: number } | null {
  const count = Math.max(charset.length, 1)
  const size = 64
  const atlasCanvas = document.createElement("canvas")
  atlasCanvas.width = size * count
  atlasCanvas.height = size
  const ctx = atlasCanvas.getContext("2d")
  if (!ctx) return null
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, atlasCanvas.width, atlasCanvas.height)
  ctx.fillStyle = "#fff"
  ctx.font = `700 ${Math.floor(size * 0.72)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  for (let i = 0; i < count; i++) {
    const ch = charset[i] ?? " "
    if (ch === " ") continue
    ctx.fillText(ch, size * (i + 0.5), size * 0.55)
  }

  const tex = gl.createTexture()
  if (!tex) return null
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    atlasCanvas
  )
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
  return { tex, count }
}

/**
 * ASCII fluid background — pointer trails leave ink that swirls and
 * quantizes to a clean brightness-mapped glyph field. Zero deps.
 */
export function createAsciiFluid(
  canvas: HTMLCanvasElement,
  initial: AsciiFluidOptions = {}
): AsciiFluidInstance | null {
  let options: Required<
    Pick<
      AsciiFluidOptions,
      | "charset"
      | "cellSize"
      | "force"
      | "dissipation"
      | "brush"
      | "animate"
      | "interactive"
      | "theme"
    >
  > &
    AsciiFluidOptions = {
    charset: DEFAULT_CHARSET,
    cellSize: 12,
    force: 1,
    dissipation: 0.05,
    brush: 0.55,
    animate: true,
    interactive: true,
    theme: "auto",
    ...initial,
  }

  const mouse = {
    x: 0.5,
    y: 0.5,
    dx: 0,
    dy: 0,
    moved: false,
    inside: false,
  }
  let reduce = false
  let currentCharset = ""

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  })
  if (!gl) return null

  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  if (!vs) return null

  const splat = createProgram(gl, vs, FRAG_SPLAT)
  const advect = createProgram(gl, vs, FRAG_ADVECT)
  const divergence = createProgram(gl, vs, FRAG_DIVERGENCE)
  const pressure = createProgram(gl, vs, FRAG_PRESSURE)
  const gradient = createProgram(gl, vs, FRAG_GRADIENT)
  const display = createProgram(gl, vs, FRAG_DISPLAY)
  if (!splat || !advect || !divergence || !pressure || !gradient || !display) {
    return null
  }

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  )

  const bindQuad = (program: WebGLProgram) => {
    gl.useProgram(program)
    const loc = gl.getAttribLocation(program, "a_position")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  }

  const SIM = 180
  const velocity = createDoubleFBO(gl, SIM, SIM, gl.LINEAR)
  const dye = createDoubleFBO(gl, SIM, SIM, gl.LINEAR)
  const pressureFbo = createDoubleFBO(gl, SIM, SIM, gl.NEAREST)
  const divergenceFbo = createFBO(gl, SIM, SIM, gl.NEAREST)
  if (!velocity || !dye || !pressureFbo || !divergenceFbo) return null

  const initialAtlas = buildAtlas(gl, options.charset)
  if (!initialAtlas) return null
  let atlas = initialAtlas
  currentCharset = options.charset

  const blit = (target: FBO | null) => {
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
      gl.viewport(0, 0, target.w, target.h)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  const clearFbo = (fbo: FBO, r = 0, g = 0, b = 0) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fbo)
    gl.viewport(0, 0, fbo.w, fbo.h)
    gl.clearColor(r, g, b, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  clearFbo(velocity.read, 0.5, 0.5, 0.5)
  clearFbo(velocity.write, 0.5, 0.5, 0.5)
  clearFbo(dye.read)
  clearFbo(dye.write)

  let raf = 0
  let running = true
  let last = performance.now()
  const start = last

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

  const onPointer = (e: PointerEvent) => {
    if (!options.interactive) return
    const parent = canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const x = (e.clientX - rect.left) / rect.width
    const y = 1 - (e.clientY - rect.top) / rect.height
    mouse.inside = x >= 0 && x <= 1 && y >= 0 && y <= 1
    mouse.dx = x - mouse.x
    mouse.dy = y - mouse.y
    mouse.x = x
    mouse.y = y
    mouse.moved = true
  }
  const onLeave = () => {
    mouse.inside = false
  }

  window.addEventListener("pointermove", onPointer, { passive: true })
  const parentEl = canvas.parentElement
  parentEl?.addEventListener("pointerleave", onLeave, { passive: true })

  const tick = (now: number) => {
    if (!running) return
    const dt = Math.min((now - last) / 1000, 0.033)
    last = now
    const time = (now - start) / 1000
    const p = options

    if (p.charset !== currentCharset) {
      const next = buildAtlas(gl, p.charset)
      if (next) {
        gl.deleteTexture(atlas.tex)
        atlas = next
        currentCharset = p.charset
      }
    }

    const dark = resolveDark(p.theme)
    const ink = hexToRgb(p.color ?? (dark ? DARK.ink : LIGHT.ink))
    const paper = hexToRgb(
      p.backgroundColor ?? (dark ? DARK.paper : LIGHT.paper)
    )
    const texel = [1 / SIM, 1 / SIM] as const
    const aspect = canvas.width / Math.max(canvas.height, 1)
    const brushR = 0.00012 + Math.max(0.05, Math.min(1, p.brush)) * 0.0011

    if (p.interactive && mouse.moved && mouse.inside && !reduce) {
      const speed = Math.hypot(mouse.dx, mouse.dy)
      const strength = p.force * (18 + speed * 120)

      // Velocity trail
      bindQuad(splat.program)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex)
      gl.uniform1i(gl.getUniformLocation(splat.program, "u_target"), 0)
      gl.uniform2f(
        gl.getUniformLocation(splat.program, "u_point"),
        mouse.x,
        mouse.y
      )
      gl.uniform3f(
        gl.getUniformLocation(splat.program, "u_color"),
        mouse.dx * strength,
        mouse.dy * strength,
        0
      )
      gl.uniform1f(gl.getUniformLocation(splat.program, "u_radius"), brushR)
      gl.uniform1f(gl.getUniformLocation(splat.program, "u_aspect"), aspect)
      gl.uniform1f(gl.getUniformLocation(splat.program, "u_velocityField"), 1)
      blit(velocity.write)
      velocity.swap()

      // Dye trail — denser with speed so fast moves write brighter glyphs
      const dyeAmt = Math.min(1.4, 0.45 + speed * 8) * p.force
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, dye.read.tex)
      gl.uniform1i(gl.getUniformLocation(splat.program, "u_target"), 0)
      gl.uniform2f(
        gl.getUniformLocation(splat.program, "u_point"),
        mouse.x,
        mouse.y
      )
      gl.uniform3f(
        gl.getUniformLocation(splat.program, "u_color"),
        dyeAmt,
        0,
        0
      )
      gl.uniform1f(
        gl.getUniformLocation(splat.program, "u_radius"),
        brushR * 1.15
      )
      gl.uniform1f(gl.getUniformLocation(splat.program, "u_aspect"), aspect)
      gl.uniform1f(gl.getUniformLocation(splat.program, "u_velocityField"), 0)
      blit(dye.write)
      dye.swap()

      mouse.moved = false
      mouse.dx = 0
      mouse.dy = 0
    }

    // Soft ambient swirl so the field never fully dies when idle
    if (p.animate && !reduce && !mouse.inside) {
      const ax = Math.sin(time * 0.55) * 0.22
      const ay = Math.cos(time * 0.42) * 0.22
      bindQuad(splat.program)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex)
      gl.uniform1i(gl.getUniformLocation(splat.program, "u_target"), 0)
      gl.uniform2f(
        gl.getUniformLocation(splat.program, "u_point"),
        0.5 + Math.sin(time * 0.23) * 0.22,
        0.5 + Math.cos(time * 0.19) * 0.18
      )
      gl.uniform3f(gl.getUniformLocation(splat.program, "u_color"), ax, ay, 0)
      gl.uniform1f(gl.getUniformLocation(splat.program, "u_radius"), 0.0018)
      gl.uniform1f(gl.getUniformLocation(splat.program, "u_aspect"), aspect)
      gl.uniform1f(gl.getUniformLocation(splat.program, "u_velocityField"), 1)
      blit(velocity.write)
      velocity.swap()
    }

    if (!reduce) {
      bindQuad(advect.program)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex)
      gl.uniform1i(gl.getUniformLocation(advect.program, "u_velocity"), 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex)
      gl.uniform1i(gl.getUniformLocation(advect.program, "u_source"), 1)
      gl.uniform2f(
        gl.getUniformLocation(advect.program, "u_texel"),
        texel[0],
        texel[1]
      )
      gl.uniform1f(gl.getUniformLocation(advect.program, "u_dt"), dt)
      gl.uniform1f(
        gl.getUniformLocation(advect.program, "u_dissipation"),
        1 - Math.min(0.18, p.dissipation * 2.5)
      )
      gl.uniform1f(gl.getUniformLocation(advect.program, "u_velocityField"), 1)
      blit(velocity.write)
      velocity.swap()

      bindQuad(divergence.program)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex)
      gl.uniform1i(gl.getUniformLocation(divergence.program, "u_velocity"), 0)
      gl.uniform2f(
        gl.getUniformLocation(divergence.program, "u_texel"),
        texel[0],
        texel[1]
      )
      blit(divergenceFbo)

      clearFbo(pressureFbo.read, 0.5, 0.5, 0.5)
      clearFbo(pressureFbo.write, 0.5, 0.5, 0.5)
      bindQuad(pressure.program)
      for (let i = 0; i < 14; i++) {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, pressureFbo.read.tex)
        gl.uniform1i(gl.getUniformLocation(pressure.program, "u_pressure"), 0)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, divergenceFbo.tex)
        gl.uniform1i(gl.getUniformLocation(pressure.program, "u_divergence"), 1)
        gl.uniform2f(
          gl.getUniformLocation(pressure.program, "u_texel"),
          texel[0],
          texel[1]
        )
        blit(pressureFbo.write)
        pressureFbo.swap()
      }

      bindQuad(gradient.program)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, pressureFbo.read.tex)
      gl.uniform1i(gl.getUniformLocation(gradient.program, "u_pressure"), 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex)
      gl.uniform1i(gl.getUniformLocation(gradient.program, "u_velocity"), 1)
      gl.uniform2f(
        gl.getUniformLocation(gradient.program, "u_texel"),
        texel[0],
        texel[1]
      )
      blit(velocity.write)
      velocity.swap()

      bindQuad(advect.program)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex)
      gl.uniform1i(gl.getUniformLocation(advect.program, "u_velocity"), 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, dye.read.tex)
      gl.uniform1i(gl.getUniformLocation(advect.program, "u_source"), 1)
      gl.uniform2f(
        gl.getUniformLocation(advect.program, "u_texel"),
        texel[0],
        texel[1]
      )
      gl.uniform1f(gl.getUniformLocation(advect.program, "u_dt"), dt)
      gl.uniform1f(
        gl.getUniformLocation(advect.program, "u_dissipation"),
        1 - Math.min(0.22, Math.max(0.02, p.dissipation))
      )
      gl.uniform1f(gl.getUniformLocation(advect.program, "u_velocityField"), 0)
      blit(dye.write)
      dye.swap()
    }

    bindQuad(display.program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, dye.read.tex)
    gl.uniform1i(gl.getUniformLocation(display.program, "u_dye"), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, atlas.tex)
    gl.uniform1i(gl.getUniformLocation(display.program, "u_atlas"), 1)
    gl.uniform2f(
      gl.getUniformLocation(display.program, "u_resolution"),
      canvas.width,
      canvas.height
    )
    const cell =
      Math.max(7, p.cellSize) * Math.min(window.devicePixelRatio || 1, 2)
    gl.uniform2f(gl.getUniformLocation(display.program, "u_cell"), cell, cell)
    gl.uniform1f(
      gl.getUniformLocation(display.program, "u_charCount"),
      atlas.count
    )
    gl.uniform3f(
      gl.getUniformLocation(display.program, "u_ink"),
      ink[0],
      ink[1],
      ink[2]
    )
    gl.uniform3f(
      gl.getUniformLocation(display.program, "u_paper"),
      paper[0],
      paper[1],
      paper[2]
    )
    gl.uniform1f(gl.getUniformLocation(display.program, "u_time"), time)
    gl.uniform1f(
      gl.getUniformLocation(display.program, "u_animate"),
      p.animate && !reduce ? 1 : 0
    )
    blit(null)

    raf = requestAnimationFrame(tick)
  }

  raf = requestAnimationFrame(tick)

  return {
    setOptions(next) {
      options = { ...options, ...next }
    },
    destroy() {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      mqReduce.removeEventListener("change", onReduce)
      window.removeEventListener("pointermove", onPointer)
      parentEl?.removeEventListener("pointerleave", onLeave)
      gl.deleteProgram(splat.program)
      gl.deleteProgram(advect.program)
      gl.deleteProgram(divergence.program)
      gl.deleteProgram(pressure.program)
      gl.deleteProgram(gradient.program)
      gl.deleteProgram(display.program)
      gl.deleteShader(vs)
      gl.deleteShader(splat.fs)
      gl.deleteShader(advect.fs)
      gl.deleteShader(divergence.fs)
      gl.deleteShader(pressure.fs)
      gl.deleteShader(gradient.fs)
      gl.deleteShader(display.fs)
      gl.deleteBuffer(buf)
      gl.deleteTexture(atlas.tex)
      for (const f of [
        velocity.read,
        velocity.write,
        dye.read,
        dye.write,
        pressureFbo.read,
        pressureFbo.write,
        divergenceFbo,
      ]) {
        gl.deleteTexture(f.tex)
        gl.deleteFramebuffer(f.fbo)
      }
    },
  }
}
