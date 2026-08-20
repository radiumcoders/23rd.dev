"use client"

import { useEffect, useRef, type RefObject } from "react"

import { cn } from "@/lib/utils"

import {
  createRadiantLines,
  type RadiantLinesInstance,
  type RadiantLinesOptions,
} from "./radiant-lines-vanilla"

export { DEFAULT_COLORS } from "./radiant-lines-vanilla"
export type {
  RadiantLinesInstance,
  RadiantLinesOptions,
} from "./radiant-lines-vanilla"

export type RadiantLinesProps = Omit<RadiantLinesOptions, "container"> & {
  className?: string
  /**
   * Scroll container. Omit to use the window.
   * Pass a ref when the component lives inside an overflow scroller.
   */
  containerRef?: RefObject<HTMLElement | null>
}

/**
 * Hyperspace starfield — colored streaks radiate from the center.
 * Transparent canvas over `bg-background` (shadcn theme).
 */
export function RadiantLines({
  className,
  colors,
  starCount = 420,
  displacement = 1,
  containerRef,
}: RadiantLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<RadiantLinesInstance | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    instanceRef.current = createRadiantLines(canvas, {
      colors,
      starCount,
      displacement,
      container: containerRef?.current ?? null,
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
      starCount,
      displacement,
      container: containerRef?.current ?? null,
    })
  }, [colors, starCount, displacement, containerRef])

  return (
    <div
      data-slot="radiant-lines"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden bg-background",
        className
      )}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
