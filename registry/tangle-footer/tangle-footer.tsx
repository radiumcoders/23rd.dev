"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  createTangleFooter,
  DEFAULT_LINES,
  DEFAULT_SEED,
  DEFAULT_SPEED,
  DEFAULT_VINES,
  type TangleFooterInstance,
  type TangleFooterOptions,
  type TangleFooterTheme,
} from "./tangle-footer-vanilla"

export {
  DARK_BG,
  DARK_RIBBON,
  DARK_TEXT,
  DEFAULT_LINES,
  DEFAULT_SEED,
  DEFAULT_SPEED,
  DEFAULT_VINES,
  LIGHT_BG,
  LIGHT_RIBBON,
  LIGHT_TEXT,
} from "./tangle-footer-vanilla"
export type {
  TangleFooterInstance,
  TangleFooterOptions,
  TangleFooterTheme,
} from "./tangle-footer-vanilla"

export type TangleFooterProps = TangleFooterOptions & {
  className?: string
  /**
   * Field behind the vines. Omit for theme-aware defaults (warm cream on
   * light, near-black on dark). Pass `"transparent"` when the parent
   * already paints the stage.
   */
  background?: string
  /** Footer height in px. Default `320`. */
  height?: number
  /** Accessible label. */
  label?: string
}

/** Stage color before and behind the canvas; hex literals for Tailwind. */
const SURFACE: Record<TangleFooterTheme, string> = {
  auto: "bg-[#EFEAE2] dark:bg-[#121210]",
  dark: "bg-[#121210]",
  light: "bg-[#EFEAE2]",
}

/**
 * A footer of tangled vines — thick ribbons that curl into loops and weave
 * over and under each other, with your copy running along them. The vines
 * grow in the first time the footer is seen.
 */
export function TangleFooter({
  className,
  lines = DEFAULT_LINES,
  ribbon,
  textColor,
  background,
  height = 320,
  vines = DEFAULT_VINES,
  speed = DEFAULT_SPEED,
  thickness,
  seed = DEFAULT_SEED,
  theme = "auto",
  label = "Site footer",
}: TangleFooterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<TangleFooterInstance | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    instanceRef.current = createTangleFooter(canvas, {
      lines,
      ribbon,
      textColor,
      vines,
      speed,
      thickness,
      seed,
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
      lines,
      ribbon,
      textColor,
      vines,
      speed,
      thickness,
      seed,
      theme,
    })
  }, [lines, ribbon, textColor, vines, speed, thickness, seed, theme])

  return (
    <footer
      data-slot="tangle-footer"
      aria-label={label}
      className={cn(
        "relative w-full overflow-hidden",
        background === undefined && (SURFACE[theme] ?? SURFACE.auto),
        className
      )}
      style={{ background, height }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 size-full"
      />
      <p className="sr-only">{lines.join(" ")}</p>
    </footer>
  )
}
