"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  createShaderMetal,
  DEFAULT_IRIDESCENCE,
  DEFAULT_METAL,
  DEFAULT_RIBBONS,
  DEFAULT_SPEED,
  type ShaderMetalInstance,
  type ShaderMetalOptions,
} from "./shader-metal-vanilla"

export {
  DEFAULT_IRIDESCENCE,
  DEFAULT_METAL,
  DEFAULT_RIBBONS,
  DEFAULT_SPEED,
  METALS,
} from "./shader-metal-vanilla"
export type {
  ShaderMetalInstance,
  ShaderMetalMetal,
  ShaderMetalOptions,
  ShaderMetalTheme,
} from "./shader-metal-vanilla"

export type ShaderMetalProps = Omit<ShaderMetalOptions, "onThemeChange"> & {
  className?: string
}

/**
 * Liquid metal ribbons twisting through a studio light rig: brushed,
 * curved strips with soft shadows on a transparent canvas. Theme-aware.
 */
export function ShaderMetal({
  className,
  metal = DEFAULT_METAL,
  color,
  ribbons = DEFAULT_RIBBONS,
  speed = DEFAULT_SPEED,
  iridescence = DEFAULT_IRIDESCENCE,
  interactive = true,
  theme = "auto",
}: ShaderMetalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<ShaderMetalInstance | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    instanceRef.current = createShaderMetal(canvas, {
      metal,
      color,
      ribbons,
      speed,
      iridescence,
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
      metal,
      color,
      ribbons,
      speed,
      iridescence,
      interactive,
      theme,
    })
  }, [metal, color, ribbons, speed, iridescence, interactive, theme])

  return (
    <div
      data-slot="shader-metal"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] [mask-image:linear-gradient(#000,#000)]",
        className
      )}
    >
      {/* Firefox can hand a WebGL canvas straight to the system compositor,
          which ignores rounded clips. The mask on the root keeps it in the
          page's own layer, so the parent's radius holds. */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full rounded-[inherit]"
      />
    </div>
  )
}
