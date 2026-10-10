"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  createRingTower,
  DEFAULT_BACKFACE,
  DEFAULT_PARALLAX,
  DEFAULT_RINGS,
  DEFAULT_SPEED,
  type RingTowerInstance,
  type RingTowerOptions,
} from "./ring-tower-vanilla"

export {
  DEFAULT_BACKFACE,
  DEFAULT_PARALLAX,
  DEFAULT_RINGS,
  DEFAULT_SPEED,
} from "./ring-tower-vanilla"
export type {
  RingTowerInstance,
  RingTowerOptions,
  RingTowerTheme,
} from "./ring-tower-vanilla"

export type RingTowerProps = RingTowerOptions & {
  className?: string
}

/**
 * A tower of tilted bands wrapped in your images. The images crawl around
 * the bands, dragging spins the tower, and the pointer turns neighboring
 * bands opposite ways. Transparent; the parent paints the background.
 * Theme-aware.
 */
export function RingTower({
  className,
  images,
  rings = DEFAULT_RINGS,
  speed = DEFAULT_SPEED,
  draggable = true,
  parallax = DEFAULT_PARALLAX,
  backface = DEFAULT_BACKFACE,
  theme = "auto",
}: RingTowerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<RingTowerInstance | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    instanceRef.current = createRingTower(root, {
      images,
      rings,
      speed,
      draggable,
      parallax,
      backface,
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
      images,
      rings,
      speed,
      draggable,
      parallax,
      backface,
      theme,
    })
  }, [images, rings, speed, draggable, parallax, backface, theme])

  return (
    <div
      ref={rootRef}
      data-slot="ring-tower"
      aria-hidden
      className={cn(
        "absolute inset-0 overflow-hidden rounded-[inherit] [mask-image:linear-gradient(#000,#000)]",
        className
      )}
    />
  )
}
