"use client"

import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

import {
  createStretchyFooter,
  DEFAULT_BLUR,
  DEFAULT_COLORS,
  DEFAULT_COLUMNS,
  DEFAULT_DAMPING,
  DEFAULT_GLOW,
  DEFAULT_MAX_STRETCH,
  DEFAULT_STIFFNESS,
  type StretchyFooterInstance,
  type StretchyFooterOptions,
} from "./stretchy-footer-vanilla"

export {
  DEFAULT_BLUR,
  DEFAULT_COLORS,
  DEFAULT_COLUMNS,
  DEFAULT_DAMPING,
  DEFAULT_GLOW,
  DEFAULT_MAX_STRETCH,
  DEFAULT_STIFFNESS,
  playStretchyFooterDemo,
  STRETCHY_FOOTER_PLAY,
} from "./stretchy-footer-vanilla"
export type {
  StretchyFooterInstance,
  StretchyFooterOptions,
  StretchyFooterPlayDetail,
} from "./stretchy-footer-vanilla"

export type StretchyFooterProps = StretchyFooterOptions & {
  className?: string
  /**
   * Page content inside the overflow scroller.
   * Ignored when `scrollRef` / `windowScroll` paint overlay-only.
   */
  children?: ReactNode
  /**
   * External scroll container. When set, this component only paints the
   * aurora overlay and binds overscroll to that element.
   * When omitted (and `windowScroll` is false), this component *is* the scroller.
   */
  scrollRef?: RefObject<HTMLElement | null>
  /**
   * Bind overscroll to the window and paint a fixed bottom aurora.
   * Use on full pages instead of a nested scroller.
   */
  windowScroll?: boolean
  /**
   * Element that lifts with the stretch (CSS selector).
   * Used with `windowScroll` / `scrollRef`. Default `[data-stretchy-page]`.
   */
  contentSelector?: string
  /** Accessible label for the scroll region. */
  label?: string
}

const noopSubscribe = () => () => {}

/**
 * Dia-style stretchy overflow — overscroll past the bottom and a rainbow
 * aurora stretches up from the floor while the page lifts with it, then
 * springs back with a wobble. Honors `prefers-reduced-motion`.
 */
export function StretchyFooter({
  className,
  children,
  scrollRef,
  windowScroll = false,
  contentSelector = "[data-stretchy-page]",
  maxStretch = DEFAULT_MAX_STRETCH,
  colors = DEFAULT_COLORS,
  stiffness = DEFAULT_STIFFNESS,
  damping = DEFAULT_DAMPING,
  columns = DEFAULT_COLUMNS,
  blur = DEFAULT_BLUR,
  glow = DEFAULT_GLOW,
  label = "Stretchy overflow",
  demoId,
}: StretchyFooterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<StretchyFooterInstance | null>(null)
  // The window aurora portals to <body>, which only exists on the client.
  const onClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
  const portalHost = windowScroll && onClient ? document.body : null

  useEffect(() => {
    const canvas = canvasRef.current
    const scroller = windowScroll
      ? window
      : (scrollRef?.current ?? scrollerRef.current)
    if (!canvas || !scroller) return
    const content =
      windowScroll || scrollRef ? contentSelector : contentRef.current
    instanceRef.current = createStretchyFooter(
      { canvas, scroller, content },
      { maxStretch, colors, stiffness, damping, columns, blur, glow, demoId }
    )
    return () => {
      instanceRef.current?.destroy()
      instanceRef.current = null
    }
    // Options stream in through setOptions; only the wiring remounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowScroll, scrollRef, contentSelector, portalHost])

  useEffect(() => {
    instanceRef.current?.setOptions({
      maxStretch,
      colors,
      stiffness,
      damping,
      columns,
      blur,
      glow,
      demoId,
    })
  }, [maxStretch, colors, stiffness, damping, columns, blur, glow, demoId])

  const aurora = (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 overflow-hidden"
      style={{ height: maxStretch }}
    >
      <canvas ref={canvasRef} className="invisible absolute" />
    </div>
  )

  if (windowScroll) {
    if (!portalHost) return null
    // Portal so `fixed` stays on the viewport — the lifted page is
    // transformed and would otherwise pin it to the content.
    return createPortal(
      <div
        data-slot="stretchy-footer"
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-50",
          className
        )}
        style={{ height: maxStretch }}
      >
        {aurora}
      </div>,
      portalHost
    )
  }

  if (scrollRef) {
    return (
      <div
        data-slot="stretchy-footer"
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0",
          className
        )}
        style={{ height: maxStretch }}
      >
        {aurora}
      </div>
    )
  }

  // The aurora sits beside the scroller, not in it, so it stays on the
  // viewport floor instead of scrolling away with the content.
  return (
    <div
      data-slot="stretchy-footer"
      className={cn("relative isolate overflow-hidden", className)}
    >
      <div
        ref={scrollerRef}
        role="region"
        aria-label={label}
        className="h-full overflow-x-hidden overflow-y-auto"
      >
        <div ref={contentRef} className="relative z-10 min-h-full">
          {children}
        </div>
      </div>
      {aurora}
    </div>
  )
}
