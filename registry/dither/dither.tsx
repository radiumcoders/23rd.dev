"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export type DitherVariant = "still" | "fire" | "wind"

export type DitherProps = {
  className?: string
  /** Motion preset. Default `"still"` */
  variant?: DitherVariant
  /** Dither cell size in CSS px. Default `3` */
  pixelSize?: number
  /** Animation speed. Default `1` */
  speed?: number
  /** Field contrast / coverage 0–1. Default `0.55` */
  intensity?: number
  /** Ink hex. Default theme foreground. */
  color?: string
  /** Paper hex. Default theme background. */
  backgroundColor?: string
  /** Keep the field drifting. Default `true` */
  animate?: boolean
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class).
   */
  theme?: "light" | "dark" | "auto"
}

const LIGHT = { ink: "#18181b", paper: "#fafafa" }
const DARK = { ink: "#e4e4e7", paper: "#09090b" }

const VARIANT_ID: Record<DitherVariant, number> = {
  still: 0,
  fire: 1,
  wind: 2,
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
uniform float u_pixelSize;
uniform float u_intensity;
uniform float u_variant;
uniform float u_animate;
uniform vec3 u_ink;
uniform vec3 u_paper;

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

// Classic Bayer ordered dither (WebGL1-safe, no bitwise ops)
float bayer2(vec2 c) {
  // [[0,2],[3,1]]
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

float stillField(vec2 uv, float t) {
  vec2 p = uv * vec2(1.6, 1.2);
  p += vec2(t * 0.04, t * 0.03);
  float n = fbm(p * 1.8 + 2.1);
  float n2 = fbm(p * 3.4 - t * 0.05);
  float field = n * 0.65 + n2 * 0.35;
  // Soft vignette — keep the center quieter for UI
  float vig = smoothstep(0.15, 0.95, length(uv - 0.5) * 1.35);
  field *= mix(0.35, 1.0, vig);
  return field;
}

float fireField(vec2 uv, float t) {
  // Upward advection from the bottom
  float rise = t * 0.55;
  vec2 p = vec2(uv.x * 2.4, uv.y * 1.8 - rise);
  // Domain warp for flickering tongues
  float w = fbm(p * 1.5 + vec2(0.0, t * 0.8));
  p.x += (w - 0.5) * 0.45;
  p.y += (fbm(p + 3.7) - 0.5) * 0.2;
  float n = fbm(p * 2.2);
  float n2 = noise(p * 6.0 + vec2(t * 1.4, 0.0));
  float field = n * 0.75 + n2 * 0.35;
  // Density hugs the bottom, fades before mid-frame
  float mask = pow(clamp(1.0 - uv.y, 0.0, 1.0), 1.65);
  mask *= smoothstep(0.0, 0.12, uv.y + 0.02);
  // Sparse tongues — soft threshold before dither
  field = smoothstep(0.28, 0.78, field) * mask;
  return field;
}

float windField(vec2 uv, float t) {
  // Horizontal streaks with light vertical shear
  float drift = t * 0.7;
  float shear = (uv.y - 0.5) * 0.35;
  vec2 p = vec2(uv.x * 0.55 - drift + shear, uv.y * 2.8);
  float n = fbm(p * 2.0 + 1.3);
  float n2 = fbm(vec2(uv.x * 1.1 - drift * 1.3, uv.y * 5.0) + 4.2);
  float field = n * 0.55 + n2 * 0.45;
  // Keep coverage light — air, not fog
  field = smoothstep(0.42, 0.72, field) * 0.85;
  float edge = smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);
  return field * mix(0.55, 1.0, edge);
}

void main() {
  float px = max(u_pixelSize, 1.0);
  vec2 cell = floor(gl_FragCoord.xy / px);
  // Sample field at cell centers for chunky pixels
  vec2 uv = (cell + 0.5) * px / u_resolution.xy;
  // Flip Y so uv.y = 0 is bottom (matches fire rising intuition)
  uv.y = 1.0 - uv.y;

  float t = u_time * u_speed * u_animate;

  float field = 0.0;
  if (u_variant < 0.5) {
    field = stillField(uv, t);
  } else if (u_variant < 1.5) {
    field = fireField(uv, t);
  } else {
    field = windField(uv, t);
  }

  float intensity = clamp(u_intensity, 0.0, 1.0);
  // Remap so mid intensity stays sparse and readable
  field *= mix(0.35, 1.15, intensity);

  float threshold = bayer8(cell);
  float bit = step(threshold, clamp(field, 0.0, 1.0));

  vec3 col = mix(u_paper, u_ink, bit);
  gl_FragColor = vec4(col, 1.0);
}
`

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

function resolveDark(theme: "light" | "dark" | "auto"): boolean {
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
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Dither: shader failed to compile\n",
        gl.getShaderInfoLog(shader)
      )
    }
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * Retro 1-bit dither background — ordered Bayer pixels in ink/paper,
 * with still / fire / wind motion. Theme-aware. Zero deps.
 */
export function Dither({
  className,
  variant = "still",
  pixelSize = 3,
  speed = 1,
  intensity = 0.55,
  color,
  backgroundColor,
  animate = true,
  theme = "auto",
}: DitherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduceRef = useRef(false)
  const darkRef = useRef(false)
  const [isDark, setIsDark] = useState(false)
  const propsRef = useRef({
    variant,
    pixelSize,
    speed,
    intensity,
    color,
    backgroundColor,
    animate,
    theme,
  })
  propsRef.current = {
    variant,
    pixelSize,
    speed,
    intensity,
    color,
    backgroundColor,
    animate,
    theme,
  }

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    reduceRef.current = mq.matches
    const onChange = () => {
      reduceRef.current = mq.matches
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    const sync = () => {
      const dark = resolveDark(propsRef.current.theme)
      darkRef.current = dark
      setIsDark(dark)
    }
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    })
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    mq.addEventListener("change", sync)
    return () => {
      mo.disconnect()
      mq.removeEventListener("change", sync)
    }
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    })
    if (!gl) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "Dither: program failed to link\n",
          gl.getProgramInfoLog(program)
        )
      }
      return
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
    const uPixelSize = gl.getUniformLocation(program, "u_pixelSize")
    const uIntensity = gl.getUniformLocation(program, "u_intensity")
    const uVariant = gl.getUniformLocation(program, "u_variant")
    const uAnimate = gl.getUniformLocation(program, "u_animate")
    const uInk = gl.getUniformLocation(program, "u_ink")
    const uPaper = gl.getUniformLocation(program, "u_paper")

    let raf = 0
    let running = true
    let start = performance.now()
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

    const tick = (now: number) => {
      if (!running) return

      const p = propsRef.current
      const reduce = reduceRef.current
      if (reduce) {
        if (frozenTime === 0) frozenTime = (now - start) / 1000
      } else {
        frozenTime = 0
      }

      const dark = darkRef.current
      const inkHex = p.color ?? (dark ? DARK.ink : LIGHT.ink)
      const paperHex = p.backgroundColor ?? (dark ? DARK.paper : LIGHT.paper)
      const ink = hexToRgb(inkHex)
      const paper = hexToRgb(paperHex)

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const px = Math.max(1, p.pixelSize) * dpr
      const time = reduce ? frozenTime : (now - start) / 1000
      const moving = p.animate && !reduce ? 1 : 0

      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform1f(uTime, time)
      gl.uniform1f(uSpeed, Math.max(0, p.speed))
      gl.uniform1f(uPixelSize, px)
      gl.uniform1f(uIntensity, Math.min(1, Math.max(0, p.intensity)))
      gl.uniform1f(uVariant, VARIANT_ID[p.variant] ?? 0)
      gl.uniform1f(uAnimate, moving)
      gl.uniform3f(uInk, ink[0], ink[1], ink[2])
      gl.uniform3f(uPaper, paper[0], paper[1], paper[2])

      gl.drawArrays(gl.TRIANGLES, 0, 6)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    }
  }, [])

  const fallbackPaper = isDark ? DARK.paper : LIGHT.paper

  return (
    <div
      data-slot="dither"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      style={{ backgroundColor: fallbackPaper }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
