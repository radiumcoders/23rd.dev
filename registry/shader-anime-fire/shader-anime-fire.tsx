"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import {
  createShaderAnimeFire,
  DARK_FALLBACK,
  DEFAULT_HEIGHT,
  DEFAULT_INTENSITY,
  DEFAULT_SPEED,
  LIGHT_FALLBACK,
  resolveDark,
  type ShaderAnimeFireInstance,
  type ShaderAnimeFireOptions,
} from "./shader-anime-fire-vanilla"

export {
  DARK_COLORS,
  DARK_FALLBACK,
  DEFAULT_HEIGHT,
  DEFAULT_INTENSITY,
  DEFAULT_SPEED,
  LIGHT_COLORS,
  LIGHT_FALLBACK,
} from "./shader-anime-fire-vanilla"
export type {
  ShaderAnimeFireInstance,
  ShaderAnimeFireOptions,
  ShaderAnimeFireTheme,
} from "./shader-anime-fire-vanilla"

export type ShaderAnimeFireProps = Omit<
  ShaderAnimeFireOptions,
  "onThemeChange"
> & {
  className?: string
}

/**
 * Cel-shaded flames licking up from the bottom edge, over a warm flickering
 * glow. Heat reaches for the pointer. Theme-aware.
 */
export function ShaderAnimeFire({
  className,
  colors,
  speed = DEFAULT_SPEED,
  intensity = DEFAULT_INTENSITY,
  height = DEFAULT_HEIGHT,
  interactive = true,
  dither = false,
  pixelSize = 1,
  theme = "auto",
}: ShaderAnimeFireProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<ShaderAnimeFireInstance | null>(null)
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
    instanceRef.current = createShaderAnimeFire(canvas, {
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
      data-slot="shader-anime-fire"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] [mask-image:linear-gradient(#000,#000)]",
        className
      )}
      style={{
        backgroundColor: fallback.backgroundColor,
        backgroundImage: fallback.backgroundImage,
      }}
    >
      {/* Firefox can hand an opaque WebGL canvas straight to the system
          compositor, which ignores rounded clips. The mask on the root keeps
          it in the page's own layer, so the parent's radius holds. */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full rounded-[inherit]"
      />
    </div>
  )
}
