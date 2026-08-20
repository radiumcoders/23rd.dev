"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import {
  createLiveOrb,
  resolveVariant,
  type LiveOrbInstance,
  type LiveOrbOptions,
} from "./live-orb-vanilla"

export {
  BLACK,
  CUSTOM_DEFAULT,
  resolveVariant,
  WEBGL_COLORS,
  WHITE,
} from "./live-orb-vanilla"
export type {
  LiveOrbInstance,
  LiveOrbOptions,
  LiveOrbVariant,
} from "./live-orb-vanilla"

export type LiveOrbProps = LiveOrbOptions & {
  className?: string
  /** Edge length in CSS pixels. Default `280`. */
  size?: number
}

/**
 * Matte (or iridescent) sphere with two capsule eyes that follow the pointer.
 * The orb stays put — only the gaze moves.
 */
export function LiveOrb({
  className,
  size = 280,
  variant = "white",
  color,
  eyeColor,
  colors,
  interactive = true,
  blink = true,
}: LiveOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<LiveOrbInstance | null>(null)
  const [hasGl, setHasGl] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    instanceRef.current = createLiveOrb(canvas, {
      variant,
      color,
      eyeColor,
      colors,
      interactive,
      blink,
      onHasGl: setHasGl,
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
      variant,
      color,
      eyeColor,
      colors,
      interactive,
      blink,
      onHasGl: setHasGl,
    })
  }, [variant, color, eyeColor, colors, interactive, blink])

  const resolved = resolveVariant(variant, color, eyeColor, colors)

  return (
    <div
      data-slot="live-orb"
      role="img"
      aria-label="Orb character"
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {!hasGl ? (
        <div
          aria-hidden
          className="absolute inset-[7%] overflow-hidden rounded-full"
          style={{
            backgroundImage: `radial-gradient(circle at 38% 30%, ${resolved.highlight} 0%, ${resolved.body} 52%, ${resolved.shade} 100%)`,
          }}
        >
          <span
            className="absolute rounded-full"
            style={{
              backgroundColor: resolved.eye,
              width: "11%",
              height: "26%",
              left: "32%",
              top: "34%",
            }}
          />
          <span
            className="absolute rounded-full"
            style={{
              backgroundColor: resolved.eye,
              width: "11%",
              height: "26%",
              left: "57%",
              top: "34%",
            }}
          />
        </div>
      ) : null}
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
