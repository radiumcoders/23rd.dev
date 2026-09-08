"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  createPhosphorScore,
  DEFAULT_COLOR,
  DEFAULT_DENSITY,
  DEFAULT_ROTATE_X,
  DEFAULT_ROTATE_Y,
  DEFAULT_ROTATE_Z,
  DEFAULT_SEED,
  DEFAULT_SPEED,
  type PhosphorScoreInstance,
  type PhosphorScoreOptions,
} from "./phosphor-score-vanilla"

export {
  DEFAULT_COLOR,
  DEFAULT_DENSITY,
  DEFAULT_ROTATE_X,
  DEFAULT_ROTATE_Y,
  DEFAULT_ROTATE_Z,
  DEFAULT_SEED,
  DEFAULT_SPEED,
} from "./phosphor-score-vanilla"
export type {
  PhosphorScoreInstance,
  PhosphorScoreOptions,
} from "./phosphor-score-vanilla"

export type PhosphorScoreProps = PhosphorScoreOptions & {
  className?: string
}

/**
 * Vertical phosphor sheet music — notes fall toward a playhead, bloom,
 * then exit in a flare. Transparent to layout; fills the parent.
 */
export function PhosphorScore({
  className,
  color = DEFAULT_COLOR,
  rotateX = DEFAULT_ROTATE_X,
  rotateY = DEFAULT_ROTATE_Y,
  rotateZ = DEFAULT_ROTATE_Z,
  speed = DEFAULT_SPEED,
  density = DEFAULT_DENSITY,
  sway = true,
  seed = DEFAULT_SEED,
}: PhosphorScoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<PhosphorScoreInstance | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    instanceRef.current = createPhosphorScore(canvas, {
      color,
      rotateX,
      rotateY,
      rotateZ,
      speed,
      density,
      sway,
      seed,
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
      rotateX,
      rotateY,
      rotateZ,
      speed,
      density,
      sway,
      seed,
    })
  }, [color, rotateX, rotateY, rotateZ, speed, density, sway, seed])

  return (
    <div
      data-slot="phosphor-score"
      role="img"
      aria-label="Falling phosphor sheet music"
      className={cn("absolute inset-0 overflow-hidden bg-black", className)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
