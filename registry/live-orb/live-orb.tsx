"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import {
  createLiveOrb,
  fallbackFaceStyle,
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

export type LiveOrbProps = Omit<LiveOrbOptions, "onHasGl"> & {
  className?: string
  /** Edge length in CSS pixels. Default `280`. */
  size?: number
}

/**
 * Evenly lit sphere with two capsule eyes that follow the pointer.
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
          className="absolute inset-[2%] overflow-hidden rounded-full"
          style={fallbackFaceStyle(resolved)}
        >
          <span
            className="absolute rounded-full"
            style={{
              backgroundColor: resolved.eye,
              width: "13%",
              height: "28%",
              left: "31%",
              top: "34%",
            }}
          />
          <span
            className="absolute rounded-full"
            style={{
              backgroundColor: resolved.eye,
              width: "13%",
              height: "28%",
              left: "56%",
              top: "34%",
            }}
          />
        </div>
      ) : null}
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
