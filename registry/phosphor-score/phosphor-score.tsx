"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  createPhosphorScore,
  DEFAULT_DENSITY,
  DEFAULT_GLOW,
  DEFAULT_SEED,
  DEFAULT_SPEED,
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

/**
 * Vertical phosphor sheet music — a grand staff scrolls down to a playhead,
 * each note blooms and flares as it plays, then fades with an afterglow.
 * Follows light and dark.
 */
export function PhosphorScore({
  className,
  color,
  glow = DEFAULT_GLOW,
  speed = DEFAULT_SPEED,
  density = DEFAULT_DENSITY,
  sway = true,
  seed = DEFAULT_SEED,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  theme = "auto",
}: PhosphorScoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<PhosphorScoreInstance | null>(null)

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
      rotateX,
      rotateY,
      rotateZ,
      theme,
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
      rotateX,
      rotateY,
      rotateZ,
      theme,
    })
  }, [
    color,
    glow,
    speed,
    density,
    sway,
    seed,
    rotateX,
    rotateY,
    rotateZ,
    theme,
  ])

  return (
    <div
      data-slot="phosphor-score"
      role="img"
      aria-label="Falling phosphor sheet music"
      className={cn("absolute inset-0 overflow-hidden", className)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
