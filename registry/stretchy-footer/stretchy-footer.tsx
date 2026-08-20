"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react"
import { createPortal } from "react-dom"
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"

import { cn } from "@/lib/utils"

import {
  applyResistance,
  columnScale,
  DEFAULT_COLORS,
  DEFAULT_COLUMNS,
  elementAtBottom,
  hexToRgba,
  POP_BOOST,
  PULL_GAIN,
  STRETCHY_FOOTER_PLAY,
  WHEEL_IDLE_MS,
  windowAtBottom,
  type StretchyFooterPlayDetail,
} from "./stretchy-footer-vanilla"

export {
  playStretchyFooterDemo,
  STRETCHY_FOOTER_PLAY,
} from "./stretchy-footer-vanilla"
export type { StretchyFooterPlayDetail } from "./stretchy-footer-vanilla"

export type StretchyFooterProps = {
  className?: string
  /**
   * Page content inside the overflow scroller.
   * Ignored when `scrollRef` / `windowScroll` paint overlay-only.
   */
  children?: ReactNode
  /**
   * External scroll container. When set, this component only paints the
   * aurora overlay and binds overscroll listeners to that element.
   * When omitted (and `windowScroll` is false), this component *is* the scroller.
   */
  scrollRef?: RefObject<HTMLElement | null>
  /**
   * Bind overscroll to the window and paint a fixed bottom aurora.
   * Use on full pages (e.g. the component docs) instead of a nested scroller.
   */
  windowScroll?: boolean
  /**
   * Element that lifts with the stretch (CSS selector).
   * Used with `windowScroll` / `scrollRef`. Default `[data-stretchy-page]`.
   */
  contentSelector?: string
  /** Peak stretch in px. Default `280`. */
  maxStretch?: number
  /** Spectrum stops across the aurora columns. */
  colors?: string[]
  /** Spring stiffness. Default `380`. */
  stiffness?: number
  /** Spring damping. Default `32`. */
  damping?: number
  /** How many vertical aurora bars. Default `48`. */
  columns?: number
  /** Accessible label for the decorative field. */
  label?: string
  /**
   * Optional id for docs demos. `playStretchyFooterDemo({ target })` only
   * animates footers whose `demoId` matches.
   */
  demoId?: string
}

type OverscrollTarget =
  | { kind: "element"; el: HTMLElement }
  | { kind: "window" }

/**
 * Dia-style stretchy overflow — overscroll past the bottom and a rainbow
 * field scaleY-stretches from the floor while the page lifts with it.
 * GPU transforms only (no height animation) for a clean, snappy rubber band.
 */
export function StretchyFooter({
  className,
  children,
  scrollRef,
  windowScroll = false,
  contentSelector = "[data-stretchy-page]",
  maxStretch = 280,
  colors = DEFAULT_COLORS,
  stiffness = 380,
  damping = 32,
  columns = DEFAULT_COLUMNS,
  label = "Stretchy overflow",
  demoId,
}: StretchyFooterProps) {
  const reduceMotion = useReducedMotion() ?? false
  const internalRef = useRef<HTMLDivElement>(null)
  const pull = useMotionValue(0)
  const stretch = useSpring(pull, {
    stiffness,
    damping,
    mass: 0.35,
    restDelta: 0.2,
    restSpeed: 0.2,
  })
  const touchStartY = useRef(0)
  const touchStretch0 = useRef(0)
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const demoPlayingRef = useRef(false)
  const rolledEl = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(false)
  /** User-triggered demo — plays even when prefers-reduced-motion is on. */
  const [demoPlaying, setDemoPlaying] = useState(false)
  demoPlayingRef.current = demoPlaying
  // Gate on `mounted` so prefers-reduced-motion can't mismatch SSR HTML.
  const reduce = mounted && reduceMotion && !demoPlaying

  useEffect(() => {
    setMounted(true)
  }, [])

  // 0 → 1 progress drives scaleY (compositor-friendly).
  const progress = useTransform(stretch, (v) =>
    maxStretch <= 0 ? 0 : Math.min(1, Math.max(0, v / maxStretch))
  )
  const pageY = useTransform(stretch, (v) => -v)
  const fieldOpacity = useTransform(progress, [0, 0.08, 0.2], [0, 1, 1])

  const bars = useMemo(() => {
    const count = Math.max(8, Math.min(96, Math.floor(columns)))
    return Array.from({ length: count }, (_, i) => {
      const color = colors[i % colors.length]!
      const heightPct = Math.max(28, columnScale(i, count) * 100).toFixed(2)
      return {
        key: i,
        height: `${heightPct}%`,
        backgroundImage: `linear-gradient(to top, ${hexToRgba(color, 1)} 0%, ${hexToRgba(color, 0.6)} 45%, rgba(0, 0, 0, 0) 100%)`,
      }
    })
  }, [colors, columns])

  // Lift the page in lockstep with the stretch — translate only, no 3D.
  useMotionValueEvent(stretch, "change", (v) => {
    if (reduceMotion && !demoPlayingRef.current) return
    if (!windowScroll && !scrollRef) return

    if (!rolledEl.current?.isConnected) {
      rolledEl.current = document.querySelector(
        contentSelector
      ) as HTMLElement | null
    }
    const el = rolledEl.current
    if (!el) return

    const y = -Math.max(0, v)
    el.style.transformOrigin = "50% 100%"
    el.style.willChange = "transform"
    el.style.transform = `translate3d(0, ${y}px, 0)`

    if (v < 0.2) {
      el.style.transform = "translate3d(0, 0, 0)"
      el.style.willChange = ""
    }
  })

  useEffect(() => {
    return () => {
      const el = rolledEl.current
      if (!el) return
      el.style.transform = ""
      el.style.transformOrigin = ""
      el.style.willChange = ""
    }
  }, [])

  // Always listen for docs "Show effect" — drives pull directly (no fake wheels).
  useEffect(() => {
    const clearDemoTimer = () => {
      if (demoTimer.current) {
        clearTimeout(demoTimer.current)
        demoTimer.current = null
      }
    }

    const onPlay = (event: Event) => {
      const detail =
        (event as CustomEvent<StretchyFooterPlayDetail>).detail ?? {}
      if (detail.target != null && detail.target !== demoId) return
      // Scoped footers ignore broadcast plays without a target.
      if (detail.target == null && demoId != null) return

      const amount = detail.amount ?? 0.82
      const holdMs = detail.holdMs ?? 700

      if (wheelTimer.current) {
        clearTimeout(wheelTimer.current)
        wheelTimer.current = null
      }
      clearDemoTimer()
      demoPlayingRef.current = true
      setDemoPlaying(true)
      pull.set(Math.min(maxStretch, Math.max(0, maxStretch * amount)))
      demoTimer.current = setTimeout(() => {
        demoTimer.current = null
        pull.set(0)
        // Wait for the spring to settle before re-honoring reduced motion.
        window.setTimeout(() => {
          demoPlayingRef.current = false
          setDemoPlaying(false)
        }, 500)
      }, holdMs)
    }

    window.addEventListener(STRETCHY_FOOTER_PLAY, onPlay)
    return () => {
      clearDemoTimer()
      window.removeEventListener(STRETCHY_FOOTER_PLAY, onPlay)
    }
  }, [demoId, maxStretch, pull])

  useEffect(() => {
    if (reduceMotion) return

    let target: OverscrollTarget | null = null
    if (windowScroll) {
      target = { kind: "window" }
    } else {
      const el = scrollRef?.current ?? internalRef.current
      if (el) target = { kind: "element", el }
    }
    if (!target) return

    // Kill browser rubber-band so it doesn't fight ours.
    const prevOverscroll =
      target.kind === "window"
        ? document.documentElement.style.overscrollBehaviorY
        : target.el.style.overscrollBehaviorY
    if (target.kind === "window") {
      document.documentElement.style.overscrollBehaviorY = "none"
    } else {
      target.el.style.overscrollBehaviorY = "none"
    }

    const isAtBottom = () =>
      target.kind === "window" ? windowAtBottom() : elementAtBottom(target.el)

    const clearWheelTimer = () => {
      if (wheelTimer.current) {
        clearTimeout(wheelTimer.current)
        wheelTimer.current = null
      }
    }

    const pullTo = (next: number) => {
      pull.set(next)
    }

    const snapBack = () => {
      clearWheelTimer()
      pull.set(0)
    }

    const onWheel = (event: WheelEvent) => {
      if (demoTimer.current) {
        clearTimeout(demoTimer.current)
        demoTimer.current = null
        setDemoPlaying(false)
      }
      const current = pull.get()
      const scrollingDown = event.deltaY > 0
      const scrollingUp = event.deltaY < 0

      if (current > 0.5 || stretch.get() > 0.5) {
        event.preventDefault()
        if (scrollingUp) {
          const next = Math.max(0, current + event.deltaY * PULL_GAIN)
          if (next <= 0.5) {
            snapBack()
            return
          }
          pullTo(next)
        } else if (scrollingDown) {
          pullTo(applyResistance(current, event.deltaY, maxStretch))
        }
        clearWheelTimer()
        wheelTimer.current = setTimeout(snapBack, WHEEL_IDLE_MS)
        return
      }

      if (scrollingDown && isAtBottom()) {
        event.preventDefault()
        pullTo(applyResistance(0, event.deltaY, maxStretch))
        clearWheelTimer()
        wheelTimer.current = setTimeout(snapBack, WHEEL_IDLE_MS)
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      const t = event.touches[0]
      if (!t) return
      if (demoTimer.current) {
        clearTimeout(demoTimer.current)
        demoTimer.current = null
        setDemoPlaying(false)
      }
      touchStartY.current = t.clientY
      touchStretch0.current = pull.get()
    }

    const onTouchMove = (event: TouchEvent) => {
      const t = event.touches[0]
      if (!t) return
      const dy = touchStartY.current - t.clientY
      const current = pull.get()

      if (current > 0.5 || stretch.get() > 0.5 || (dy > 0 && isAtBottom())) {
        if (event.cancelable) event.preventDefault()
        const boost = current < 40 ? POP_BOOST : 1
        const fromRest = touchStretch0.current + dy * PULL_GAIN * boost
        pullTo(Math.min(maxStretch, Math.max(0, fromRest)))
      }
    }

    const onTouchEnd = () => {
      if (pull.get() > 0.5 || stretch.get() > 0.5) snapBack()
    }

    const optsWheel = { passive: false } as const
    const optsTouchStart = { passive: true } as const
    const optsTouchMove = { passive: false } as const

    if (target.kind === "window") {
      window.addEventListener("wheel", onWheel, optsWheel)
      window.addEventListener("touchstart", onTouchStart, optsTouchStart)
      window.addEventListener("touchmove", onTouchMove, optsTouchMove)
      window.addEventListener("touchend", onTouchEnd)
      window.addEventListener("touchcancel", onTouchEnd)
    } else {
      const el = target.el
      el.addEventListener("wheel", onWheel, optsWheel)
      el.addEventListener("touchstart", onTouchStart, optsTouchStart)
      el.addEventListener("touchmove", onTouchMove, optsTouchMove)
      el.addEventListener("touchend", onTouchEnd)
      el.addEventListener("touchcancel", onTouchEnd)
    }

    return () => {
      clearWheelTimer()
      if (target.kind === "window") {
        document.documentElement.style.overscrollBehaviorY = prevOverscroll
        window.removeEventListener("wheel", onWheel)
        window.removeEventListener("touchstart", onTouchStart)
        window.removeEventListener("touchmove", onTouchMove)
        window.removeEventListener("touchend", onTouchEnd)
        window.removeEventListener("touchcancel", onTouchEnd)
      } else {
        target.el.style.overscrollBehaviorY = prevOverscroll
        const el = target.el
        el.removeEventListener("wheel", onWheel)
        el.removeEventListener("touchstart", onTouchStart)
        el.removeEventListener("touchmove", onTouchMove)
        el.removeEventListener("touchend", onTouchEnd)
        el.removeEventListener("touchcancel", onTouchEnd)
      }
    }
  }, [reduceMotion, scrollRef, windowScroll, maxStretch, pull, stretch])

  const aurora = (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 overflow-hidden"
      style={{ height: maxStretch }}
    >
      <motion.div
        className="absolute inset-x-0 bottom-0 h-full w-full origin-bottom will-change-transform"
        style={{
          scaleY: reduce ? 0 : progress,
          opacity: reduce ? 0 : fieldOpacity,
        }}
      >
        {/* Single blur layer — cheaper than per-bar filters */}
        <div
          className="absolute inset-0 flex items-end justify-stretch"
          style={{ filter: "blur(14px)", transform: "scaleY(1.08)" }}
        >
          {bars.map((bar) => (
            <div
              key={bar.key}
              className="min-w-0 flex-1"
              style={{
                height: bar.height,
                backgroundImage: bar.backgroundImage,
              }}
            />
          ))}
        </div>

        {/* Soft floor bloom */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 100% at 50% 100%, rgba(255,255,255,0.22), rgba(0, 0, 0, 0) 70%)",
          }}
        />
      </motion.div>
    </div>
  )

  if (windowScroll) {
    if (!mounted) return null

    // Portal to body so `fixed` stays on the viewport — a transformed
    // ancestor (the rolling page) would otherwise pin it to the content.
    return createPortal(
      <div
        data-slot="stretchy-footer"
        aria-label={label}
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-50",
          className
        )}
        style={{ height: maxStretch }}
      >
        {aurora}
      </div>,
      document.body
    )
  }

  if (scrollRef) {
    return (
      <div
        data-slot="stretchy-footer"
        aria-label={label}
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

  return (
    <div
      ref={internalRef}
      data-slot="stretchy-footer"
      aria-label={label}
      className={cn(
        "relative isolate overflow-y-auto overflow-x-hidden overscroll-none",
        className
      )}
    >
      <motion.div
        className="relative z-10 min-h-full will-change-transform"
        style={{ y: pageY }}
      >
        {children}
      </motion.div>
      {aurora}
    </div>
  )
}
