"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import {
  createPhosphorScore,
  DARK_BG,
  DEFAULT_DENSITY,
  DEFAULT_GLOW,
  DEFAULT_SEED,
  DEFAULT_SPEED,
  resolveDark,
  type PhosphorScoreInstance,
  type PhosphorScoreOptions,
} from "./phosphor-score-vanilla"

export {
  DARK_BG,
  DARK_COLOR,
  DEFAULT_COLOR,
  DEFAULT_DENSITY,
  DEFAULT_GLOW,
  DEFAULT_SEED,
  DEFAULT_SPEED,
  LIGHT_BG,
  LIGHT_COLOR,
  resolveColor,
  resolveDark,
} from "./phosphor-score-vanilla"
export type {
  PhosphorScoreInstance,
  PhosphorScoreOptions,
  PhosphorScoreTheme,
} from "./phosphor-score-vanilla"

export type PhosphorScoreProps = Omit<PhosphorScoreOptions, "onThemeChange"> & {
  className?: string
}

function PhosphorEdgeFade({
  edge,
  dark,
}: {
  edge: "top" | "bottom"
  dark: boolean
}) {
  const isTop = edge === "top"
  const pos = isTop ? "top-0" : "bottom-0"
  const mask = isTop
    ? "mask-[linear-gradient(to_bottom,black,transparent)]"
    : "mask-[linear-gradient(to_top,black,transparent)]"
  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 z-10 h-40 backdrop-blur-xl",
          pos,
          mask
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 z-10 h-24 backdrop-blur-md",
          pos,
          mask
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 z-10 h-28",
          pos,
          !dark &&
            (isTop
              ? "bg-linear-to-b from-background/65 to-transparent"
              : "bg-linear-to-t from-background/65 to-transparent")
        )}
        style={
          dark
            ? {
                backgroundImage: isTop
                  ? `linear-gradient(to bottom, rgba(5,5,5,0.7), transparent)`
                  : `linear-gradient(to top, rgba(5,5,5,0.7), transparent)`,
              }
            : undefined
        }
      />
    </>
  )
}

/**
 * Vertical phosphor sheet music — notes fall toward a playhead, bloom,
 * then exit in a flare. Follows light and dark.
 */
export function PhosphorScore({
  className,
  color,
  glow = DEFAULT_GLOW,
  speed = DEFAULT_SPEED,
  density = DEFAULT_DENSITY,
  sway = true,
  seed = DEFAULT_SEED,
  theme = "auto",
}: PhosphorScoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<PhosphorScoreInstance | null>(null)
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
    instanceRef.current = createPhosphorScore(canvas, {
      color,
      glow,
      speed,
      density,
      sway,
      seed,
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
      color,
      glow,
      speed,
      density,
      sway,
      seed,
      theme,
      onThemeChange: setIsDark,
    })
  }, [color, glow, speed, density, sway, seed, theme])

  return (
    <div
      data-slot="phosphor-score"
      role="img"
      aria-label="Falling phosphor sheet music"
      className={cn("absolute inset-0 overflow-hidden bg-background", className)}
      style={isDark ? { backgroundColor: DARK_BG } : undefined}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <PhosphorEdgeFade edge="top" dark={isDark} />
      <PhosphorEdgeFade edge="bottom" dark={isDark} />
    </div>
  )
}
