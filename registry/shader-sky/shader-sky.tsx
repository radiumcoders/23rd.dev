"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import {
  createShaderSky,
  skyFallback,
  resolveDark,
  type ShaderSkyInstance,
  type ShaderSkyOptions,
} from "./shader-sky-vanilla"

export {
  DARK_COLORS,
  DARK_FALLBACK,
  LIGHT_COLORS,
  LIGHT_FALLBACK,
} from "./shader-sky-vanilla"
export type {
  ShaderSkyInstance,
  ShaderSkyOptions,
  ShaderSkyTheme,
} from "./shader-sky-vanilla"

export type ShaderSkyProps = Omit<ShaderSkyOptions, "onThemeChange"> & {
  className?: string
}

/**
 * WebGL sky for heroes — clear blue with drifting clouds in light,
 * storm gray in dark. Optional window-glass film.
 */
export function ShaderSky({
  className,
  colors,
  speed = 0.1,
  coverage = 0.5,
  intensity = 0.9,
  amount = 0.5,
  scale = 0.4,
  variation = 0.7,
  interactive = false,
  glass = false,
  glassSize = 7,
  theme = "auto",
}: ShaderSkyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<ShaderSkyInstance | null>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const sync = () => setIsDark(resolveDark(theme))
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
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
    instanceRef.current = createShaderSky(canvas, {
      colors,
      speed,
      coverage,
      intensity,
      amount,
      scale,
      variation,
      interactive,
      glass,
      glassSize,
      theme,
      onThemeChange: setIsDark,
    })
    return () => {
      instanceRef.current?.destroy()
      instanceRef.current = null
    }
    // Engine reads live options via setOptions; mount once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    instanceRef.current?.setOptions({
      colors,
      speed,
      coverage,
      intensity,
      amount,
      scale,
      variation,
      interactive,
      glass,
      glassSize,
      theme,
      onThemeChange: setIsDark,
    })
  }, [
    colors,
    speed,
    coverage,
    intensity,
    amount,
    scale,
    variation,
    interactive,
    glass,
    glassSize,
    theme,
  ])

  const fallback = skyFallback(colors, isDark)

  return (
    <div
      data-slot="shader-sky"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      style={{
        backgroundColor: fallback.backgroundColor,
        backgroundImage: fallback.backgroundImage,
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
