"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  createTypewriter,
  DEFAULT_HOLD,
  DEFAULT_JITTER,
  DEFAULT_SPEED,
  DEFAULT_START_DELAY,
  DEFAULT_TEXT,
  type TypewriterInstance,
  type TypewriterOptions,
} from "./typewriter-vanilla"

export {
  DEFAULT_HOLD,
  DEFAULT_JITTER,
  DEFAULT_SPEED,
  DEFAULT_START_DELAY,
  DEFAULT_TEXT,
  layoutTypewriter,
} from "./typewriter-vanilla"
export type {
  TypewriterInstance,
  TypewriterOptions,
  TypewriterStroke,
} from "./typewriter-vanilla"

export type TypewriterProps = TypewriterOptions & {
  className?: string
}

/**
 * A typewriter on the page — a typeball rides a rail across the frame,
 * spins each letter to the front, strikes, steps right, and at the margin
 * whirls home and drops a line. Ink follows `currentColor`. Honors
 * `prefers-reduced-motion`.
 */
export function Typewriter({
  className,
  text = DEFAULT_TEXT,
  speed = DEFAULT_SPEED,
  humanize = true,
  loop = true,
  hold = DEFAULT_HOLD,
  startDelay = DEFAULT_START_DELAY,
  columns = 0,
  ticks = true,
  jitter = DEFAULT_JITTER,
  sound = false,
  onDone,
}: TypewriterProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<TypewriterInstance | null>(null)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    instanceRef.current = createTypewriter(root, {
      text,
      speed,
      humanize,
      loop,
      hold,
      startDelay,
      columns,
      ticks,
      jitter,
      sound,
      onDone: () => onDoneRef.current?.(),
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
      speed,
      humanize,
      loop,
      hold,
      startDelay,
      columns,
      ticks,
      jitter,
      sound,
    })
  }, [
    text,
    speed,
    humanize,
    loop,
    hold,
    startDelay,
    columns,
    ticks,
    jitter,
    sound,
  ])

  return (
    <div
      ref={rootRef}
      data-slot="typewriter"
      className={cn(
        "relative size-full overflow-hidden bg-background p-6 font-mono text-foreground",
        className
      )}
    />
  )
}
