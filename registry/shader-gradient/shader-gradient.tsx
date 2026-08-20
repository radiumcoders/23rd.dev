"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import {
  createShaderGradient,
  DARK_FALLBACK,
  LIGHT_FALLBACK,
  type ShaderGradientInstance,
  type ShaderGradientOptions,
} from "./shader-gradient-vanilla"

export {
  DARK_COLORS,
  DARK_FALLBACK,
  LIGHT_COLORS,
  LIGHT_FALLBACK,
} from "./shader-gradient-vanilla"
export type {
  ShaderGradientInstance,
  ShaderGradientOptions,
  ShaderGradientTheme,
} from "./shader-gradient-vanilla"

export type ShaderGradientProps = ShaderGradientOptions & {
  className?: string
}

/**
 * Quiet WebGL atmosphere for heroes and empty states — soft-focus color
 * fields behind UI. Theme-aware light / dusk.
 */
export function ShaderGradient({
  className,
  colors,
  speed = 0.14,
  blur = 0.7,
  intensity = 0.95,
  interactive = true,
  theme = "auto",
}: ShaderGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<ShaderGradientInstance | null>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    instanceRef.current = createShaderGradient(canvas, {
      colors,
      speed,
      blur,
      intensity,
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
      interactive,
      theme,
      onThemeChange: setIsDark,
    })
  }, [colors, speed, blur, intensity, interactive, theme])

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
