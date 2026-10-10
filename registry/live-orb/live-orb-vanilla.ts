export type LiveOrbVariant = "white" | "black" | "webgl" | "custom"

export type LiveOrbOptions = {
  /** Material preset. Default `"white"`. */
  variant?: LiveOrbVariant
  /** Body hex, used when `variant="custom"`. */
  color?: string
  /** Eye hex, used when `variant="custom"`. */
  eyeColor?: string
  /** Unlit wash stops, used when `variant="webgl"`. */
  colors?: string[]
  /** Eyes follow the pointer. Default `true`. */
  interactive?: boolean
  /** Occasional blink. Default `true`. */
  blink?: boolean
  /** Fires when WebGL is ready (`true`) or torn down (`false`). */
  onHasGl?: (ok: boolean) => void
}

export type LiveOrbInstance = {
  setOptions: (options: Partial<LiveOrbOptions>) => void
  destroy: () => void
}

export const WHITE = { color: "#F4F4F5", eyeColor: "#09090B" } as const
export const BLACK = { color: "#18181B", eyeColor: "#F4F4F5" } as const
export const CUSTOM_DEFAULT = { color: "#7C5CFF", eyeColor: "#FAFAFA" } as const
/** Violet / foam / dust-rose: stock unlit wash. */
export const WEBGL_COLORS = ["#7C6AF7", "#7DD3C7", "#E8B4D4"]

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
uniform vec2 u_look;
uniform float u_blink;
uniform float u_mode;
uniform vec3 u_body;
uniform vec3 u_eye;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;

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

vec3 orient(vec3 p, vec2 look) {
  float yaw = look.x * 0.92;
  float pitch = -look.y * 0.78;
  float cy = cos(yaw);
  float sy = sin(yaw);
  float cp = cos(pitch);
  float sp = sin(pitch);
  vec3 q = vec3(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);
  return vec3(q.x * cy + q.z * sy, q.y, -q.x * sy + q.z * cy);
}

float eyeMask(vec3 n, vec3 e, vec3 right, vec3 up, float halfH, float rad) {
  float facing = dot(n, e);
  float x = dot(n, right) - dot(e, right);
  float y = dot(n, up) - dot(e, up);
  y -= clamp(y, -halfH, halfH);
  float d = length(vec2(x, y)) - rad;
  float fill = 1.0 - smoothstep(-0.01, 0.01, d);
  return fill * smoothstep(0.12, 0.32, facing);
}

vec3 wash(vec3 n, float t) {
  vec2 q = n.xy * 2.2 + n.z * 0.85;
  vec2 w1 = vec2(
    fbm(q * 1.4 + vec2(t * 0.22, t * 0.18)),
    fbm(q * 1.4 + vec2(-t * 0.16, t * 0.24) + 4.1)
  );
  q += (w1 - 0.5) * 0.72;
  float f = fbm(q * 2.1 + vec2(0.0, t * 0.12));
  float g = fbm(q * 4.6 - vec2(t * 0.2, 0.0));
  vec3 col = mix(u_c1, u_c2, smoothstep(0.28, 0.72, f));
  return mix(col, u_c3, pow(smoothstep(0.42, 0.9, g), 1.4));
}

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  uv.x *= aspect;

  float radius = 0.94;
  vec2 p = uv / radius;
  float r2 = dot(p, p);
  float edge = 1.0 - smoothstep(0.985, 1.012, sqrt(max(r2, 0.0)));
  if (edge <= 0.001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float z = sqrt(max(1.0 - r2, 0.0));
  vec3 n = normalize(vec3(p, z));

  vec2 look = u_look;
  float lm = length(look);
  if (lm > 1.0) look /= lm;

  vec3 right = orient(vec3(1.0, 0.0, 0.0), look);
  vec3 up = orient(vec3(0.0, 1.0, 0.0), look);
  vec3 eL = orient(normalize(vec3(-0.32, 0.08, 1.0)), look);
  vec3 eR = orient(normalize(vec3(0.32, 0.08, 1.0)), look);

  float halfH = mix(0.128, 0.012, u_blink);
  float rad = mix(0.054, 0.062, u_blink);
  float eyes = max(
    eyeMask(n, eL, right, up, halfH, rad),
    eyeMask(n, eR, right, up, halfH, rad)
  );

  vec3 body = u_mode > 0.5 ? wash(n, u_time * u_speed) : u_body;
  vec3 col = mix(body, u_eye, clamp(eyes, 0.0, 1.0));

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), edge);
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
  if (Number.isNaN(n)) return [0.96, 0.96, 0.96]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (isDev()) {
      console.warn(
        "LiveOrb: shader failed to compile\n",
        gl.getShaderInfoLog(shader)
      )
    }
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function resolveVariant(
  variant: LiveOrbVariant,
  color?: string,
  eyeColor?: string,
  colors?: string[]
) {
  let body: string = WHITE.color
  let eye: string = WHITE.eyeColor
  let mode = 0
  let palette: string[] = WEBGL_COLORS

  if (variant === "black") {
    body = BLACK.color
    eye = BLACK.eyeColor
  } else if (variant === "webgl") {
    palette = colors && colors.length > 0 ? colors : WEBGL_COLORS
    body = palette[1] ?? WEBGL_COLORS[1]!
    eye = "#0C0C10"
    mode = 1
  } else if (variant === "custom") {
    body = color ?? CUSTOM_DEFAULT.color
    eye = eyeColor ?? CUSTOM_DEFAULT.eyeColor
  }

  return { body, eye, mode, palette }
}

export function fallbackFaceStyle(
  resolved: ReturnType<typeof resolveVariant>
): {
  backgroundColor?: string
  backgroundImage?: string
} {
  if (resolved.mode === 1) {
    const a = resolved.palette[0] ?? WEBGL_COLORS[0]
    const b = resolved.palette[1] ?? WEBGL_COLORS[1]
    const c = resolved.palette[2] ?? WEBGL_COLORS[2]
    return {
      backgroundImage: `linear-gradient(135deg, ${a}, ${b}, ${c})`,
    }
  }
  return { backgroundColor: resolved.body }
}

/**
 * Evenly lit sphere with two capsule eyes that follow the pointer.
 * The orb stays put; only the gaze moves. Frames are drawn only while the
 * canvas is on screen and the tab is visible. Under reduced motion it holds a
 * still, settled frame and redraws it when its inputs change. It recovers
 * from a lost WebGL context.
 */
export function createLiveOrb(
  canvas: HTMLCanvasElement,
  initial: LiveOrbOptions = {}
): LiveOrbInstance | null {
  let options: Required<
    Pick<LiveOrbOptions, "variant" | "interactive" | "blink">
  > &
    LiveOrbOptions = {
    variant: "white",
    interactive: true,
    blink: true,
    ...initial,
  }

  const look = { x: 0, y: 0.08 }
  const targetLook = { x: 0, y: 0.08 }

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  })
  if (!gl) return null

  let vs: WebGLShader | null = null
  let fs: WebGLShader | null = null
  let program: WebGLProgram | null = null
  let buf: WebGLBuffer | null = null
  let uResolution: WebGLUniformLocation | null = null
  let uTime: WebGLUniformLocation | null = null
  let uSpeed: WebGLUniformLocation | null = null
  let uLook: WebGLUniformLocation | null = null
  let uBlink: WebGLUniformLocation | null = null
  let uMode: WebGLUniformLocation | null = null
  let uBody: WebGLUniformLocation | null = null
  let uEye: WebGLUniformLocation | null = null
  let uC1: WebGLUniformLocation | null = null
  let uC2: WebGLUniformLocation | null = null
  let uC3: WebGLUniformLocation | null = null

  // Builds every GL resource. Runs at startup and again after a context restore.
  const initGl = () => {
    vs = compile(gl, gl.VERTEX_SHADER, VERT)
    fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return false

    const prog = gl.createProgram()
    if (!prog) return false
    program = prog
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      if (isDev()) {
        console.warn(
          "LiveOrb: program failed to link\n",
          gl.getProgramInfoLog(prog)
        )
      }
      return false
    }
    gl.useProgram(prog)

    buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )
    const loc = gl.getAttribLocation(prog, "a_position")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    uResolution = gl.getUniformLocation(prog, "u_resolution")
    uTime = gl.getUniformLocation(prog, "u_time")
    uSpeed = gl.getUniformLocation(prog, "u_speed")
    uLook = gl.getUniformLocation(prog, "u_look")
    uBlink = gl.getUniformLocation(prog, "u_blink")
    uMode = gl.getUniformLocation(prog, "u_mode")
    uBody = gl.getUniformLocation(prog, "u_body")
    uEye = gl.getUniformLocation(prog, "u_eye")
    uC1 = gl.getUniformLocation(prog, "u_c1")
    uC2 = gl.getUniformLocation(prog, "u_c2")
    uC3 = gl.getUniformLocation(prog, "u_c3")

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.viewport(0, 0, canvas.width, canvas.height)
    return true
  }

  if (!initGl()) return null
  options.onHasGl?.(true)

  let raf = 0
  let destroyed = false
  // Set while the GPU context is gone; nothing touches gl until it returns.
  let lost = false
  let onScreen = true
  let last = 0
  // Milliseconds of motion so far; only advances while the orb is moving.
  let clock = 0
  let nextBlink = 1800 + Math.random() * 2400
  let blinkAt = -10_000

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
    // Resizing clears the canvas, so a still frame needs a redraw.
    wake()
  }

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")

  const moving = () =>
    onScreen && !mqReduce.matches && document.visibilityState !== "hidden"

  function wake() {
    if (raf || destroyed || lost) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  const onMove = (e: PointerEvent) => {
    if (!options.interactive) return
    const parent = canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    const dy = (rect.top + rect.height / 2 - e.clientY) / (rect.height / 2)
    targetLook.x = Math.min(1, Math.max(-1, dx))
    targetLook.y = Math.min(1, Math.max(-1, dy))
    // While moving the loop is already queued; a still frame follows the gaze.
    if (onScreen) wake()
  }
  window.addEventListener("pointermove", onMove, { passive: true })

  const tick = (now: number) => {
    raf = 0
    if (lost) return
    const dt = Math.min(50, Math.max(0, now - last))
    last = now
    const live = moving()
    if (live) clock += dt
    const reduce = mqReduce.matches

    const resolved = resolveVariant(
      options.variant,
      options.color,
      options.eyeColor,
      options.colors
    )
    const time = clock / 1000

    // A still frame skips the easing and shows where the gaze settles.
    const follow = live ? 0.16 : 1
    const rest = live ? 0.12 : 1
    if (options.interactive) {
      look.x += (targetLook.x - look.x) * follow
      look.y += (targetLook.y - look.y) * follow
    } else {
      look.x += (0 - look.x) * rest
      look.y += (0.08 - look.y) * rest
    }

    if (!reduce && options.blink && clock >= nextBlink) {
      blinkAt = clock
      nextBlink = clock + 2200 + Math.random() * 3800
    }
    const bt = (clock - blinkAt) / 1000
    let b = 0
    if (!reduce && options.blink) {
      if (bt < 0.055) b = bt / 0.055
      else if (bt < 0.1) b = 1
      else if (bt < 0.18) b = 1 - (bt - 0.1) / 0.08
    }
    const body = hexToRgb(resolved.body)
    const eye = hexToRgb(resolved.eye)
    const palette = [0, 1, 2].map((i) =>
      hexToRgb(
        resolved.palette[i % resolved.palette.length] ?? WEBGL_COLORS[i]!
      )
    )

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(uResolution, canvas.width, canvas.height)
    gl.uniform1f(uTime, reduce ? 0 : time)
    gl.uniform1f(uSpeed, reduce ? 0 : 0.55)
    gl.uniform2f(uLook, look.x, look.y)
    gl.uniform1f(uBlink, b)
    gl.uniform1f(uMode, resolved.mode)
    gl.uniform3f(uBody, body[0], body[1], body[2])
    gl.uniform3f(uEye, eye[0], eye[1], eye[2])
    gl.uniform3f(uC1, palette[0]![0], palette[0]![1], palette[0]![2])
    gl.uniform3f(uC2, palette[1]![0], palette[1]![1], palette[1]![2])
    gl.uniform3f(uC3, palette[2]![0], palette[2]![1], palette[2]![2])

    gl.drawArrays(gl.TRIANGLES, 0, 6)
    if (live && !destroyed) raf = requestAnimationFrame(tick)
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

  // Without preventDefault the browser never hands the context back.
  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
    cancelAnimationFrame(raf)
    raf = 0
    // A lost canvas paints a broken-image icon over the CSS fallback.
    canvas.style.visibility = "hidden"
    options.onHasGl?.(false)
  }
  const onRestored = () => {
    if (destroyed) return
    // A failed rebuild leaves the orb on its CSS fallback.
    if (!initGl()) return
    lost = false
    canvas.style.visibility = ""
    options.onHasGl?.(true)
    wake()
  }
  canvas.addEventListener("webglcontextlost", onLost)
  canvas.addEventListener("webglcontextrestored", onRestored)

  resize()
  wake()

  return {
    setOptions(next) {
      options = { ...options, ...next }
      wake()
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      raf = 0
      ro.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      mqReduce.removeEventListener("change", onReduce)
      window.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      if (lost) canvas.style.visibility = ""
      options.onHasGl?.(false)
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
