"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"

import { cn } from "@/lib/utils"

import {
  createDitherScan,
  type DitherScanInstance,
  type DitherScanOptions,
} from "./dither-scan-vanilla"

export { DARK_COLORS, LIGHT_COLORS, levelSpec } from "./dither-scan-vanilla"
export type {
  DitherScanFit,
  DitherScanInstance,
  DitherScanOptions,
  DitherScanTheme,
} from "./dither-scan-vanilla"

export type DitherScanProps = Omit<
  DitherScanOptions,
  "onLoad" | "onScanningChange"
> & {
  /** Accessible description of the image. */
  alt?: string
  /** Increment to re-dither and scan again. */
  replayKey?: number
  className?: string
}

/**
 * An image that starts as a 1-bit ordered dither. A diagonal scan line
 * sweeps it `passes` times; each sweep sharpens the cells and returns tone
 * and color, and the last one leaves the source image.
 */
export function DitherScan({
  src,
  alt = "",
  passes = 4,
  duration = 1400,
  pause = 280,
  angle = 45,
  alternate = true,
  pixelSize = 6,
  blur = 6,
  colors,
  lineColor,
  fit = "cover",
  autoPlay = true,
  loop = false,
  loopDelay = 2400,
  reducedMotionProgress,
  theme = "auto",
  replayKey = 0,
  onStart,
  onPass,
  onComplete,
  className,
}: DitherScanProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<DitherScanInstance | null>(null)
  const replayKeyRef = useRef(replayKey)
  const callbacksRef = useRef({ onStart, onPass, onComplete })
  const [ratio, setRatio] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    callbacksRef.current = { onStart, onPass, onComplete }
  }, [onStart, onPass, onComplete])

  const shadow = colors?.[0]
  const highlight = colors?.[1]

  const options = {
    src,
    passes,
    duration,
    pause,
    angle,
    alternate,
    pixelSize,
    blur,
    colors,
    lineColor,
    fit,
    autoPlay,
    loop,
    loopDelay,
    reducedMotionProgress,
    theme,
  }

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    instanceRef.current = createDitherScan(wrap, canvas, {
      ...options,
      onLoad: (w, h) => setRatio(`${w} / ${h}`),
      onScanningChange: setScanning,
      onStart: () => callbacksRef.current.onStart?.(),
      onPass: (pass, total) => callbacksRef.current.onPass?.(pass, total),
      onComplete: () => callbacksRef.current.onComplete?.(),
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
    passes,
    duration,
    pause,
    angle,
    alternate,
    pixelSize,
    blur,
    shadow,
    highlight,
    lineColor,
    fit,
    autoPlay,
    loop,
    loopDelay,
    reducedMotionProgress,
    theme,
  ])

  useEffect(() => {
    if (replayKeyRef.current === replayKey) return
    replayKeyRef.current = replayKey
    instanceRef.current?.replay()
  }, [replayKey])

  return (
    <div
      ref={wrapRef}
      data-slot="dither-scan"
      data-scanning={scanning || undefined}
      role="img"
      aria-label={alt || undefined}
      aria-busy={scanning || undefined}
      style={{ "--dither-scan-ratio": ratio ?? "4 / 3" } as CSSProperties}
      className={cn(
        "relative aspect-(--dither-scan-ratio) w-full overflow-hidden",
        className
      )}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
