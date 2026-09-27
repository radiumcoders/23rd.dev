"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import {
  createShaderGradient,
  DARK_FALLBACK,
  DEFAULT_BLUR,
  DEFAULT_GRAIN,
  DEFAULT_INTENSITY,
  DEFAULT_SPEED,
  LIGHT_FALLBACK,
  resolveDark,
  type ShaderGradientInstance,
  type ShaderGradientOptions,
} from "./shader-gradient-vanilla"

export {
  DARK_COLORS,
  DARK_FALLBACK,
  DEFAULT_BLUR,
  DEFAULT_GRAIN,
  DEFAULT_INTENSITY,
  DEFAULT_SPEED,
  LIGHT_COLORS,
  LIGHT_FALLBACK,
} from "./shader-gradient-vanilla"
export type {
  ShaderGradientInstance,
  ShaderGradientOptions,
  ShaderGradientTheme,
} from "./shader-gradient-vanilla"

export type ShaderGradientProps = Omit<
  ShaderGradientOptions,
  "onThemeChange"
> & {
  className?: string
}

/**
 * A grainy liquid gradient for heroes and empty states — the palette flows
 * through slow warped noise under a film grain. Theme-aware.
 */
export function ShaderGradient({
  className,
  colors,
  speed = DEFAULT_SPEED,
  blur = DEFAULT_BLUR,
  intensity = DEFAULT_INTENSITY,
  grain = DEFAULT_GRAIN,
  interactive = true,
  theme = "auto",
}: ShaderGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<ShaderGradientInstance | null>(null)
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
    instanceRef.current = createShaderGradient(canvas, {
      colors,
      speed,
      blur,
      intensity,
      grain,
      interactive,
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
      blur,
      intensity,
      grain,
      interactive,
      theme,
      onThemeChange: setIsDark,
    })
  }, [colors, speed, blur, intensity, grain, interactive, theme])

  const fallback = isDark ? DARK_FALLBACK : LIGHT_FALLBACK

  return (
    <div
      data-slot="shader-gradient"
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
