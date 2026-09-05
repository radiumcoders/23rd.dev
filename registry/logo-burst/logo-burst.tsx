"use client"

import { useEffect, useRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"

import {
  createLogoBurst,
  DEFAULT_CORE_SIZE,
  DEFAULT_DURATION,
  DEFAULT_PARTICLE_RATIO,
  DEFAULT_RADIUS,
  DEFAULT_SEED,
  DEFAULT_TENTACLE_COUNT,
  type LogoBurstInstance,
  type LogoBurstOptions,
} from "./logo-burst-vanilla"

export {
  DARK_COLOR,
  DEFAULT_COLOR,
  DEFAULT_CORE_SIZE,
  DEFAULT_DURATION,
  DEFAULT_PARTICLE_RATIO,
  DEFAULT_RADIUS,
  DEFAULT_SEED,
  DEFAULT_TENTACLE_COUNT,
  LIGHT_COLOR,
  resolveColor,
  resolveDark,
} from "./logo-burst-vanilla"
export type {
  LogoBurstInstance,
  LogoBurstOptions,
  LogoBurstTheme,
} from "./logo-burst-vanilla"

export type LogoBurstProps = Omit<LogoBurstOptions, "onThemeChange"> & {
  className?: string
  /** Centered mark. Defaults to a rounded chevron plate. */
  children?: ReactNode
  /**
   * Increment to replay the explosion. Mount already plays once.
   */
  replayKey?: number
  /** Click / Enter on the mark replays the burst. Default `true`. */
  replayOnClick?: boolean
  /** Accessible name. Default `"Logo burst"`. */
  label?: string
}

/** Default centered plate — swap via `children`. Follows the theme. */
export function LogoBurstMark({ className }: { className?: string }) {
  return (
    <span
      data-slot="logo-burst-mark"
      className={cn(
        "flex size-20 items-center justify-center rounded-[22%] bg-foreground text-background ring-1 ring-foreground/12",
        className
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-10">
        <path
          d="M12 5.4 20.4 18.2h-3.7L12 10.3l-4.7 7.9H3.6Z"
          fill="currentColor"
        />
      </svg>
    </span>
  )
}

/**
 * Hair-line tentacles explode from a centered mark, then keep a slow inhale.
 * Transparent canvas over `bg-background`. Theme-aware light / dark.
 */
export function LogoBurst({
  className,
  children,
  tentacleCount = DEFAULT_TENTACLE_COUNT,
  color,
  coreSize,
  radius = DEFAULT_RADIUS,
  duration = DEFAULT_DURATION,
  seed = DEFAULT_SEED,
  particleRatio = DEFAULT_PARTICLE_RATIO,
  theme = "auto",
  breathe = true,
  replayKey = 0,
  replayOnClick = true,
  label = "Logo burst",
}: LogoBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const coreRef = useRef<HTMLElement | null>(null)
  const instanceRef = useRef<LogoBurstInstance | null>(null)
  const replayKeyRef = useRef(replayKey)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    instanceRef.current = createLogoBurst(canvas, {
      tentacleCount,
      color,
      coreSize: coreSize ?? DEFAULT_CORE_SIZE,
      radius,
      duration,
      seed,
      particleRatio,
      theme,
      breathe,
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
      tentacleCount,
      color,
      coreSize,
      radius,
      duration,
      seed,
      particleRatio,
      theme,
      breathe,
    })
  }, [
    tentacleCount,
    color,
    coreSize,
    radius,
    duration,
    seed,
    particleRatio,
    theme,
    breathe,
  ])

  useEffect(() => {
    const core = coreRef.current
    if (!core || coreSize !== undefined) return
    const sync = () => {
      const box = core.getBoundingClientRect()
      const measured = Math.max(box.width, box.height)
      if (measured > 0) {
        instanceRef.current?.setOptions({ coreSize: measured })
      }
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(core)
    return () => ro.disconnect()
  }, [coreSize, children])

  useEffect(() => {
    if (replayKeyRef.current === replayKey) return
    replayKeyRef.current = replayKey
    instanceRef.current?.replay()
  }, [replayKey])

  function replay() {
    instanceRef.current?.replay()
  }

  const mark = children ?? <LogoBurstMark />

  return (
    <div
      data-slot="logo-burst"
      role={replayOnClick ? undefined : "img"}
      aria-label={replayOnClick ? undefined : label}
      className={cn("relative isolate size-full overflow-hidden", className)}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 size-full"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {replayOnClick ? (
          <button
            ref={(node) => {
              coreRef.current = node
            }}
            type="button"
            aria-label="Replay burst"
            onClick={replay}
            className="pointer-events-auto relative cursor-pointer rounded-[22%] border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            {mark}
          </button>
        ) : (
          <div
            ref={(node) => {
              coreRef.current = node
            }}
            className="pointer-events-auto relative"
          >
            {mark}
          </div>
        )}
      </div>
    </div>
  )
}
