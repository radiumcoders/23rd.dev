"use client"

import { useEffect, useRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"

import {
  createFolio,
  type FolioInstance,
  type FolioRuntimeOptions,
} from "./folio-vanilla"

export { FOLIO_PLAY, applyFolioFrame, playFolioDemo } from "./folio-vanilla"
export type { FolioPlayDetail, FolioRuntimeOptions } from "./folio-vanilla"

export type FolioProps = FolioRuntimeOptions & {
  className?: string
  /** Page content that leans while you scroll. */
  children?: ReactNode
  /**
   * Bind to the window and tilt `contentSelector` instead of wrapping
   * children. Default `false` — this component *is* the scroller.
   */
  windowScroll?: boolean
  /**
   * Element to tilt when `windowScroll` is set.
   * Default `[data-folio-page]`.
   */
  contentSelector?: string
  /** Accessible name for the tilting page. */
  label?: string
  /**
   * Optional id for docs demos. `playFolioDemo({ target })` only
   * animates instances whose `demoId` matches.
   */
  demoId?: string
}

/**
 * The whole page leans in perspective while you scroll, with a matching
 * blur. When scroll stops, it springs to flat.
 */
export function Folio({
  className,
  children,
  blur = 4,
  perspective = 1000,
  returnMs = 520,
  windowScroll = false,
  contentSelector = "[data-folio-page]",
  label = "Tilting page",
  demoId,
}: FolioProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<FolioInstance | null>(null)

  useEffect(() => {
    const scroller = windowScroll ? window : scrollerRef.current
    const plane = windowScroll
      ? document.querySelector<HTMLElement>(contentSelector)
      : planeRef.current
    if (!scroller || !plane) return

    instanceRef.current = createFolio({
      plane,
      scroller,
      demoId,
      blur,
      perspective,
      returnMs,
    })

    return () => {
      instanceRef.current?.destroy()
      instanceRef.current = null
    }
    // Engine reads live options via setOptions; bind once per scroller mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowScroll, contentSelector, demoId])

  useEffect(() => {
    instanceRef.current?.setOptions({ blur, perspective, returnMs })
  }, [blur, perspective, returnMs])

  if (windowScroll) return null

  return (
    <div
      ref={scrollerRef}
      data-slot="folio"
      data-folio-demo={demoId}
      className={cn(
        "relative h-full overflow-x-hidden overflow-y-auto overscroll-contain",
        className
      )}
    >
      <div
        ref={planeRef}
        data-slot="folio-plane"
        aria-label={label}
        className="relative min-h-full overflow-x-clip [contain:paint]"
      >
        {children}
      </div>
    </div>
  )
}
