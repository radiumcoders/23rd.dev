"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  createTypewriter,
  DEFAULT_COLUMNS,
  DEFAULT_HOLD,
  DEFAULT_JITTER,
  DEFAULT_SPEED,
  DEFAULT_START_DELAY,
  DEFAULT_TEXT,
  type TypewriterInstance,
  type TypewriterOptions,
} from "./typewriter-vanilla"

export {
  DEFAULT_COLUMNS,
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
 * A typewriter that types — each letter presses its key, swings that key's
 * typebar up to strike the ribbon, and steps the carriage left. At the
 * margin the lever kicks, the platen turns up a line, and the carriage
 * slides home. Ink follows `currentColor`. Honors
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
  columns = DEFAULT_COLUMNS,
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
      jitter,
      sound,
    })
  }, [text, speed, humanize, loop, hold, startDelay, columns, jitter, sound])

  return (
    <div
      ref={rootRef}
      data-slot="typewriter"
      className={cn(
        "relative size-full overflow-hidden bg-background font-mono text-foreground",
        className
      )}
    />
  )
}
