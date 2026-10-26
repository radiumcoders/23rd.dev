"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  createShaderWatercolor,
  DEFAULT_ASPECT,
  DEFAULT_EDGES,
  DEFAULT_GRAIN,
  DEFAULT_MODE,
  DEFAULT_SCALE,
  DEFAULT_SPEED,
  DEFAULT_SPIN,
  DEFAULT_WETNESS,
  type ShaderWatercolorInstance,
  type ShaderWatercolorOptions,
} from "./shader-watercolor-vanilla"

export {
  DARK_INK,
  DARK_PAPER,
  DEFAULT_ASPECT,
  DEFAULT_EDGES,
  DEFAULT_GRAIN,
  DEFAULT_MODE,
  DEFAULT_SCALE,
  DEFAULT_SPEED,
  DEFAULT_SPIN,
  DEFAULT_WETNESS,
  LIGHT_INK,
  LIGHT_PAPER,
} from "./shader-watercolor-vanilla"
export type {
  ShaderWatercolorInstance,
  ShaderWatercolorKind,
  ShaderWatercolorMode,
  ShaderWatercolorOptions,
  ShaderWatercolorTheme,
} from "./shader-watercolor-vanilla"

export type ShaderWatercolorProps = ShaderWatercolorOptions & {
  /** Accessible description of what's painted. */
  alt?: string
  /** Increment to wet the paper and bloom the paint in again. */
  replayKey?: number
  className?: string
}

/**
 * Paints an image, an SVG, a video, or a 3D model as a calm watercolor: soft washes
 * that bleed and slowly drift, pigment pooled at their edges, granulated by
 * the tooth of the paper. Fills its parent.
 */
export function ShaderWatercolor({
  src,
  media,
  alt = "",
  mode = DEFAULT_MODE,
  ink,
  paper,
  wetness = DEFAULT_WETNESS,
  edges = DEFAULT_EDGES,
  grain = DEFAULT_GRAIN,
  speed = DEFAULT_SPEED,
  spin = DEFAULT_SPIN,
  scale = DEFAULT_SCALE,
  backdrop = true,
  aspect = DEFAULT_ASPECT,
  interactive = true,
  reveal = true,
  theme = "auto",
  replayKey = 0,
  onLoad,
  onError,
  className,
}: ShaderWatercolorProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<ShaderWatercolorInstance | null>(null)
  const replayKeyRef = useRef(replayKey)
  const callbacksRef = useRef({ onLoad, onError })

  useEffect(() => {
    callbacksRef.current = { onLoad, onError }
  }, [onLoad, onError])

  const options = {
    src,
    media,
    mode,
    ink,
    paper,
    wetness,
    edges,
    grain,
    speed,
    spin,
    scale,
    backdrop,
    aspect,
    interactive,
    reveal,
    theme,
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    instanceRef.current = createShaderWatercolor(root, {
      ...options,
      onLoad: (kind) => callbacksRef.current.onLoad?.(kind),
      onError: (error) => callbacksRef.current.onError?.(error),
    })
    return () => {
      instanceRef.current?.destroy()
      instanceRef.current = null
    }
    // Engine reads live options via setOptions; mount once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    instanceRef.current?.setOptions(options)
    // `options` is rebuilt every render; its fields are the real deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    src,
    media,
    mode,
    ink,
    paper,
    wetness,
    edges,
    grain,
    speed,
    spin,
    scale,
    backdrop,
    aspect,
    interactive,
    reveal,
    theme,
  ])

  useEffect(() => {
    if (replayKeyRef.current === replayKey) return
    replayKeyRef.current = replayKey
    instanceRef.current?.replay()
  }, [replayKey])

  return (
    <div
      ref={rootRef}
      data-slot="shader-watercolor"
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      // Firefox can hand a WebGL canvas straight to the system compositor,
      // which ignores rounded clips. The mask keeps it in the page's own
      // layer, so the parent's radius holds.
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] [mask-image:linear-gradient(#000,#000)]",
        className
      )}
    />
  )
}
