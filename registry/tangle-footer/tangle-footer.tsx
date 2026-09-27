"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  createTangleFooter,
  DEFAULT_SEED,
  DEFAULT_VINES,
  type TangleFooterInstance,
  type TangleFooterOptions,
} from "./tangle-footer-vanilla"

export { DEFAULT_SEED, DEFAULT_VINES } from "./tangle-footer-vanilla"
export type {
  TangleFooterInstance,
  TangleFooterOptions,
} from "./tangle-footer-vanilla"

export type TangleFooterProps = TangleFooterOptions & {
  className?: string
  /** Footer height in px. Default `320`. */
  height?: number
}

/**
 * A footer of tangled vines — pen lines that curl into loops and cross over
 * and under each other. Transparent, in the text color, so it sits on any
 * page and follows light and dark. Grows in once when first seen.
 */
export function TangleFooter({
  className,
  color,
  height = 320,
  vines = DEFAULT_VINES,
  thickness,
  seed = DEFAULT_SEED,
}: TangleFooterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<TangleFooterInstance | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    instanceRef.current = createTangleFooter(canvas, {
      color,
      vines,
      thickness,
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
    instanceRef.current?.setOptions({ color, vines, thickness, seed })
  }, [color, vines, thickness, seed])

  return (
    <footer
      data-slot="tangle-footer"
      className={cn("relative w-full overflow-hidden", className)}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 size-full"
      />
    </footer>
  )
}
