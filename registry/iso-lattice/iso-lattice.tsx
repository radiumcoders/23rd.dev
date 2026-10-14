"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  createIsoLattice,
  DEFAULT_GLOW,
  DEFAULT_INTERVAL,
  DEFAULT_SIZE,
  DEFAULT_SPACING,
  DEFAULT_SPEED,
  SHAPES,
  type IsoLatticeInstance,
  type IsoLatticeOptions,
} from "./iso-lattice-vanilla"

export {
  DARK_COLOR,
  DEFAULT_GLOW,
  DEFAULT_INTERVAL,
  DEFAULT_SIZE,
  DEFAULT_SPACING,
  DEFAULT_SPEED,
  LIGHT_COLOR,
  SHAPES,
} from "./iso-lattice-vanilla"
export type {
  IsoLatticeInstance,
  IsoLatticeOptions,
  IsoLatticeShape,
  IsoLatticeTheme,
} from "./iso-lattice-vanilla"

export type IsoLatticeProps = Omit<IsoLatticeOptions, "onThemeChange"> & {
  className?: string
}

/**
 * A lattice of glowing isometric tiles that builds solid figures, one over
 * the last, from the floor up. Transparent; theme-aware.
 */
export function IsoLattice({
  className,
  shapes = SHAPES,
  interval = DEFAULT_INTERVAL,
  color,
  size = DEFAULT_SIZE,
  spacing = DEFAULT_SPACING,
  glow = DEFAULT_GLOW,
  speed = DEFAULT_SPEED,
  floor = true,
  interactive = true,
  theme = "auto",
}: IsoLatticeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<IsoLatticeInstance | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    instanceRef.current = createIsoLattice(canvas, {
      shapes,
      interval,
      color,
      size,
      spacing,
      glow,
      speed,
      floor,
      interactive,
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
      shapes,
      interval,
      color,
      size,
      spacing,
      glow,
      speed,
      floor,
      interactive,
      theme,
    })
  }, [
    shapes,
    interval,
    color,
    size,
    spacing,
    glow,
    speed,
    floor,
    interactive,
    theme,
  ])

  return (
    <div
      data-slot="iso-lattice"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
