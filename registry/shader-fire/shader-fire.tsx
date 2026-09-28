"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import {
  createShaderFire,
  DARK_FALLBACK,
  LIGHT_FALLBACK,
  resolveDark,
  type ShaderFireInstance,
  type ShaderFireOptions,
} from "./shader-fire-vanilla"

export {
  DARK_COLORS,
  DARK_FALLBACK,
  LIGHT_COLORS,
  LIGHT_FALLBACK,
} from "./shader-fire-vanilla"
export type {
  ShaderFireInstance,
  ShaderFireOptions,
  ShaderFireTheme,
} from "./shader-fire-vanilla"

export type ShaderFireProps = Omit<ShaderFireOptions, "onThemeChange"> & {
  className?: string
}

/**
 * Sparse 2D fire wash — tongues rise from the bottom behind UI.
 * Theme-aware light / dusk.
 */
export function ShaderFire({
  className,
  colors,
  speed = 0.55,
  intensity = 0.55,
  height = 0.45,
  interactive = true,
  dither = false,
  pixelSize = 1,
  theme = "auto",
}: ShaderFireProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<ShaderFireInstance | null>(null)
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
    instanceRef.current = createShaderFire(canvas, {
      colors,
      speed,
      intensity,
      height,
      interactive,
      dither,
      pixelSize,
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
      intensity,
      height,
      interactive,
      dither,
      pixelSize,
      theme,
      onThemeChange: setIsDark,
    })
  }, [colors, speed, intensity, height, interactive, dither, pixelSize, theme])

  const fallback = isDark ? DARK_FALLBACK : LIGHT_FALLBACK

  return (
    <div
      data-slot="shader-fire"
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
