"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  createAsciiLogo,
  DEFAULT_CHARSET,
  clampAsciiLogoText,
  type AsciiLogoInstance,
  type AsciiLogoOptions,
} from "./ascii-logo-vanilla"

export {
  DEFAULT_CHARSET,
  MAX_TEXT_LETTERS,
  clampAsciiLogoText,
} from "./ascii-logo-vanilla"
export type {
  AsciiLogoInstance,
  AsciiLogoOptions,
  AsciiLogoPhase,
  AsciiLogoTheme,
} from "./ascii-logo-vanilla"

export type AsciiLogoProps = AsciiLogoOptions & {
  className?: string
  /** Accessible name. Default is `text` or `"ASCII logo"`. */
  label?: string
}

/**
 * Interactive ASCII wordmark — glyphs shove away from the cursor, then
 * click-cycle through scatter, gravity drop, and reassemble. Zero deps.
 */
export function AsciiLogo({
  className,
  text = "23rd",
  src,
  fit = 0.82,
  cellSize = 11,
  cellGap = 2,
  charset = DEFAULT_CHARSET,
  threshold = 0.2,
  invert,
  color,
  backgroundColor,
  hoverRadius = 7,
  hoverPush = 2.6,
  hoverEase = 0.18,
  scatterRange = 16,
  scatterEase = 0.055,
  gravity = 0.14,
  bounce = 0.28,
  resetEase = 0.08,
  staggerFrames = 18,
  interactive = true,
  theme = "auto",
  label,
  onPhaseChange,
}: AsciiLogoProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<AsciiLogoInstance | null>(null)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    instanceRef.current = createAsciiLogo(root, canvas, {
      text,
      src,
      fit,
      cellSize,
      cellGap,
      charset,
      threshold,
      invert,
      color,
      backgroundColor,
      hoverRadius,
      hoverPush,
      hoverEase,
      scatterRange,
      scatterEase,
      gravity,
      bounce,
      resetEase,
      staggerFrames,
      interactive,
      theme,
      onPhaseChange,
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
      text,
      src,
      fit,
      cellSize,
      cellGap,
      charset,
      threshold,
      invert,
      color,
      backgroundColor,
      hoverRadius,
      hoverPush,
      hoverEase,
      scatterRange,
      scatterEase,
      gravity,
      bounce,
      resetEase,
      staggerFrames,
      interactive,
      theme,
      onPhaseChange,
    })
  }, [
    text,
    src,
    fit,
    cellSize,
    cellGap,
    charset,
    threshold,
    invert,
    color,
    backgroundColor,
    hoverRadius,
    hoverPush,
    hoverEase,
    scatterRange,
    scatterEase,
    gravity,
    bounce,
    resetEase,
    staggerFrames,
    interactive,
    theme,
    onPhaseChange,
  ])

  const aria = label ?? (src ? "ASCII logo" : clampAsciiLogoText(text))

  return (
    <div
      ref={rootRef}
      data-slot="ascii-logo"
      role="img"
      aria-label={aria}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        "relative size-full overflow-hidden",
        interactive &&
          "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 size-full touch-none"
      />
    </div>
  )
}
