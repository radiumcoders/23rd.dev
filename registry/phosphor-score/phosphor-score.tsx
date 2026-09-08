"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import {
  createPhosphorScore,
  DARK_BG,
  DEFAULT_DENSITY,
  DEFAULT_GLOW,
  DEFAULT_ROTATE_X,
  DEFAULT_ROTATE_Y,
  DEFAULT_ROTATE_Z,
  DEFAULT_SEED,
  DEFAULT_SPEED,
  LIGHT_BG,
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
  DEFAULT_ROTATE_X,
  DEFAULT_ROTATE_Y,
  DEFAULT_ROTATE_Z,
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

/**
 * Vertical phosphor sheet music — notes fall toward a playhead, bloom,
 * then exit in a flare. Follows light and dark.
 */
export function PhosphorScore({
  className,
  color,
  glow = DEFAULT_GLOW,
  rotateX = DEFAULT_ROTATE_X,
  rotateY = DEFAULT_ROTATE_Y,
  rotateZ = DEFAULT_ROTATE_Z,
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
      rotateX,
      rotateY,
      rotateZ,
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
      rotateX,
      rotateY,
      rotateZ,
      speed,
      density,
      sway,
      seed,
      theme,
      onThemeChange: setIsDark,
    })
  }, [
    color,
    glow,
    rotateX,
    rotateY,
    rotateZ,
    speed,
    density,
    sway,
    seed,
    theme,
  ])

  return (
    <div
      data-slot="phosphor-score"
      role="img"
      aria-label="Falling phosphor sheet music"
      className={cn("absolute inset-0 overflow-hidden", className)}
      style={{ backgroundColor: isDark ? DARK_BG : LIGHT_BG }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
