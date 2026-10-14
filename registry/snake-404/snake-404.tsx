"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import {
  codeDigits,
  createSnake404,
  type Snake404Instance,
  type Snake404Options,
} from "./snake-404-vanilla"

export {
  DARK_COLOR,
  LCD_INK,
  LCD_SCREEN,
  LIGHT_COLOR,
} from "./snake-404-vanilla"
export type {
  Snake404Direction,
  Snake404Instance,
  Snake404Options,
  Snake404Theme,
} from "./snake-404-vanilla"

export type Snake404Props = Snake404Options & {
  /** Accessible name. Default `"<code>, page not found"`. */
  label?: string
  className?: string
}

/**
 * A dot-matrix 404 where every dot is food. A Nokia-style snake eats its
 * way through the digits, then they come back. Click and use the arrow
 * keys, WASD, or swipe to play.
 */
export function Snake404({
  code = "404",
  color,
  cellSize = 12,
  speed = 14,
  maxLength = 32,
  grid = true,
  lcd = false,
  playable = true,
  score = true,
  smooth = true,
  theme = "auto",
  onEat,
  onClear,
  onPlayChange,
  label,
  className,
}: Snake404Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<Snake404Instance | null>(null)
  const callbacksRef = useRef({ onEat, onClear, onPlayChange })
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    callbacksRef.current = { onEat, onClear, onPlayChange }
  }, [onEat, onClear, onPlayChange])

  const options = {
    code,
    color,
    cellSize,
    speed,
    maxLength,
    grid,
    lcd,
    playable,
    score,
    smooth,
    theme,
  }

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    instanceRef.current = createSnake404(wrap, canvas, {
      ...options,
      onEat: (left, total) => callbacksRef.current.onEat?.(left, total),
      onClear: () => callbacksRef.current.onClear?.(),
      onPlayChange: (next) => {
        setPlaying(next)
        callbacksRef.current.onPlayChange?.(next)
      },
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
    code,
    color,
    cellSize,
    speed,
    maxLength,
    grid,
    lcd,
    playable,
    score,
    smooth,
    theme,
  ])

  const name = label ?? `${codeDigits(code)}, page not found`

  return (
    <div
      ref={wrapRef}
      data-slot="snake-404"
      data-playing={playing || undefined}
      role={playable ? "application" : "img"}
      aria-roledescription={playable ? "Snake game" : undefined}
      aria-label={
        playable ? `${name}. Press an arrow key to steer the snake.` : name
      }
      tabIndex={playable ? 0 : undefined}
      className={cn(
        "absolute inset-0 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        playable && "touch-none",
        className
      )}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
