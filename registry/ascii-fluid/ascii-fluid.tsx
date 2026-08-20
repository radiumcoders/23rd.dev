"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  createAsciiFluid,
  DEFAULT_CHARSET,
  type AsciiFluidInstance,
  type AsciiFluidOptions,
} from "./ascii-fluid-vanilla"

export { DEFAULT_CHARSET } from "./ascii-fluid-vanilla"
export type {
  AsciiFluidInstance,
  AsciiFluidOptions,
  AsciiFluidTheme,
} from "./ascii-fluid-vanilla"

export type AsciiFluidProps = AsciiFluidOptions & {
  className?: string
}

/**
 * ASCII fluid background — pointer trails leave ink that swirls and
 * quantizes to a clean brightness-mapped glyph field. Zero deps.
 */
export function AsciiFluid({
  className,
  charset = DEFAULT_CHARSET,
  cellSize = 12,
  color,
  backgroundColor,
  force = 1,
  dissipation = 0.05,
  brush = 0.55,
  animate = true,
  interactive = true,
  theme = "auto",
}: AsciiFluidProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<AsciiFluidInstance | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    instanceRef.current = createAsciiFluid(canvas, {
      charset,
      cellSize,
      color,
      backgroundColor,
      force,
      dissipation,
      brush,
      animate,
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
      charset,
      cellSize,
      color,
      backgroundColor,
      force,
      dissipation,
      brush,
      animate,
      interactive,
      theme,
    })
  }, [
    charset,
    cellSize,
    color,
    backgroundColor,
    force,
    dissipation,
    brush,
    animate,
    interactive,
    theme,
  ])

  return (
    <div
      data-slot="ascii-fluid"
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
