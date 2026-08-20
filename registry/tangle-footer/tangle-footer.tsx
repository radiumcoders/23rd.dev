"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

import {
  buildRings,
  DEFAULT_LINES,
  type TangleFooterOptions,
} from "./tangle-footer-vanilla"

export type TangleFooterProps = TangleFooterOptions & {
  className?: string
}

/**
 * Footer of five nested text rings — full-width upper semicircle.
 * The marquee is a continuous rotation of each ring around its center.
 * A full turn is inherently seamless, so it runs on GPU-friendly CSS
 * transforms with no per-frame layout work.
 */
export function TangleFooter({
  className,
  lines = DEFAULT_LINES,
  ribbon,
  textColor,
  background,
  height,
  seed = 23,
  label = "Site footer",
}: TangleFooterProps) {
  const reduce = useReducedMotion() ?? false
  const uid = useId().replace(/:/g, "")
  const rootRef = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const measure = () => {
      setWidth(el.clientWidth)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Pause the animation while off-screen so it never wastes frames.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => setPaused(!(entry?.isIntersecting ?? true)),
      { rootMargin: "64px", threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const bandHeight = height ?? (width > 0 ? width / 2 : 0)
  const rings = useMemo(
    () =>
      width > 0 && bandHeight > 0
        ? buildRings(width, bandHeight, lines, seed)
        : [],
    [width, bandHeight, lines, seed]
  )

  const spinName = `tangle-spin-${uid}`

  return (
    <footer
      ref={rootRef}
      data-slot="tangle-footer"
      aria-label={label}
      className={cn(
        "relative w-full overflow-hidden",
        // Theme tokens — skipped when explicit color props are passed
        background === undefined && "bg-[#EFEAE2] dark:bg-[#121210]",
        ribbon == null &&
          "[--tangle-ribbon:#141414] dark:[--tangle-ribbon:#E8E4DC]",
        textColor == null &&
          "[--tangle-text:#F4F0E8] dark:[--tangle-text:#161616]",
        className
      )}
      style={{
        background,
        height: bandHeight > 0 ? bandHeight : undefined,
        aspectRatio: height == null ? "2 / 1" : undefined,
      }}
    >
      <style>{`@keyframes ${spinName}{to{transform:rotate(360deg)}}`}</style>

      {width > 0 && bandHeight > 0 ? (
        <motion.svg
          className="absolute inset-0 size-full"
          viewBox={`0 0 ${width} ${bandHeight}`}
          preserveAspectRatio="xMidYMax slice"
          xmlns="http://www.w3.org/2000/svg"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <defs>
            {rings.map((ring, i) => (
              <path
                key={`def-${i}`}
                id={`${uid}-path-${i}`}
                d={ring.d}
                fill="none"
              />
            ))}
          </defs>

          {rings.map((ring, i) => {
            const pathId = `${uid}-path-${i}`
            return (
              <g
                key={`ring-${i}`}
                style={
                  reduce
                    ? undefined
                    : {
                        transformBox: "view-box",
                        transformOrigin: `${ring.cx}px ${ring.cy}px`,
                        animation: `${spinName} ${ring.duration}s linear infinite`,
                        animationDirection: ring.reverse ? "reverse" : "normal",
                        animationDelay: `${-ring.phase * ring.duration}s`,
                        animationPlayState: paused ? "paused" : "running",
                        willChange: "transform",
                      }
                }
              >
                <use
                  href={`#${pathId}`}
                  strokeWidth={ring.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  style={{
                    // Live CSS so `var(--tangle-ribbon)` tracks `html.dark`.
                    stroke: ribbon ?? "var(--tangle-ribbon)",
                  }}
                />
                <text
                  fontSize={ring.fontSize}
                  fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
                  fontWeight={700}
                  letterSpacing="0.05em"
                  dominantBaseline="central"
                  style={{
                    fill: textColor ?? "var(--tangle-text)",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  <textPath href={`#${pathId}`} startOffset="0" method="align">
                    {ring.text}
                  </textPath>
                </text>
              </g>
            )
          })}
        </motion.svg>
      ) : null}

      <p className="sr-only">{lines.join(" ")}</p>
    </footer>
  )
}
