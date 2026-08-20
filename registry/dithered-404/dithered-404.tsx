"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import {
  createDithered404,
  type Dithered404Instance,
  type Dithered404Options,
} from "./dithered-404-vanilla"

export { DARK_COLOR, LIGHT_COLOR } from "./dithered-404-vanilla"
export type {
  Dithered404Instance,
  Dithered404Options,
  Dithered404Theme,
} from "./dithered-404-vanilla"

export type Dithered404Props = Dithered404Options & {
  className?: string
}

/**
 * Bayer-pixel 404 section — a fireball cursor scorches and burns
 * the glyph into embers and smoke, then the type reforms.
 * `dither={false}` is a soft realistic fire, same idea as Shader Fire.
 */
export function Dithered404({
  className,
  color,
  pixelSize = 4,
  brush = 28,
  interactive = true,
  dither = true,
  theme = "auto",
}: Dithered404Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<Dithered404Instance | null>(null)
  const [hideCursor, setHideCursor] = useState(false)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    instanceRef.current = createDithered404(wrap, canvas, {
      color,
      pixelSize,
      brush,
      interactive,
      dither,
      theme,
      onHideCursor: setHideCursor,
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
      pixelSize,
      brush,
      interactive,
      dither,
      theme,
      onHideCursor: setHideCursor,
    })
  }, [color, pixelSize, brush, interactive, dither, theme])

  return (
    <div
      ref={wrapRef}
      data-slot="dithered-404"
      className={cn(
        "absolute inset-0 touch-none overflow-hidden",
        hideCursor && interactive && "cursor-none",
        className
      )}
    >
      <span className="sr-only">404</span>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
