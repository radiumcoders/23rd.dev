"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"

import {
  CLOSE_PATHS,
  clamp,
  PALETTE_PATHS,
  parseColor,
  toCss,
  toHex,
  type GooeyColor,
} from "./gooey-color-picker-vanilla"

export type { GooeyColor } from "./gooey-color-picker-vanilla"
export { parseColor } from "./gooey-color-picker-vanilla"

export type GooeyColorPickerProps = {
  value?: GooeyColor | string
  defaultValue?: GooeyColor | string
  onChange?: (color: GooeyColor, css: string) => void
  className?: string
  /** Accessible name for the trigger */
  label?: string
}

/** Minimal typing for the (still non-standard) EyeDropper API. */
type EyeDropperResult = { sRGBHex: string }
type EyeDropperConstructor = new () => {
  open: (options?: { signal?: AbortSignal }) => Promise<EyeDropperResult>
}

const spring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.85,
}

const pathTransition = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as const,
}

function useControllableColor(
  value: GooeyColorPickerProps["value"],
  defaultValue: GooeyColorPickerProps["defaultValue"],
  onChange: GooeyColorPickerProps["onChange"]
) {
  const [uncontrolled, setUncontrolled] = useState(() =>
    parseColor(defaultValue ?? value)
  )
  const isControlled = value !== undefined
  const color = isControlled ? parseColor(value) : uncontrolled

  const setColor = useCallback(
    (next: GooeyColor) => {
      if (!isControlled) setUncontrolled(next)
      onChange?.(next, toCss(next))
    },
    [isControlled, onChange]
  )

  return [color, setColor] as const
}

function bindDrag(onMove: (clientX: number, clientY: number) => void) {
  return (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    onMove(event.clientX, event.clientY)

    function move(e: PointerEvent) {
      onMove(e.clientX, e.clientY)
    }
    function up(e: PointerEvent) {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      try {
        target.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }
}

function TriggerIcon({ open }: { open: boolean }) {
  const paths = open ? CLOSE_PATHS : PALETTE_PATHS

  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.g
          key={open ? "close" : "palette"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          {paths.map((d, i) => (
            <motion.path
              key={`${open ? "c" : "p"}-${i}`}
              d={d}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ pathLength: 0, opacity: 0 }}
              transition={{
                ...pathTransition,
                delay: i * 0.04,
              }}
            />
          ))}
        </motion.g>
      </AnimatePresence>
    </svg>
  )
}

/** Minimal pipette / eyedropper glyph. */
function EyeDropperIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m3 21 1-1h2.5l8-8" />
      <path d="m13.5 5.5 5 5" />
      <path d="M15 4.5 17.2 2.3a2 2 0 0 1 2.8 0l1.7 1.7a2 2 0 0 1 0 2.8L19.5 9" />
    </svg>
  )
}

export function GooeyColorPicker({
  value,
  defaultValue,
  onChange,
  className,
  label = "Color picker",
}: GooeyColorPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const wheelRef = useRef<HTMLDivElement>(null)
  const alphaRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [color, setColor] = useControllableColor(value, defaultValue, onChange)
  const colorRef = useRef(color)
  colorRef.current = color
  const css = toCss(color)
  const opaque = toCss({ ...color, a: 1 })
  const hex = toHex(color)
  const [hexDraft, setHexDraft] = useState(hex)
  const hexFocused = useRef(false)
  const [supportsEyeDropper, setSupportsEyeDropper] = useState(false)

  useEffect(() => {
    if (!hexFocused.current) setHexDraft(hex)
  }, [hex])

  useEffect(() => {
    setSupportsEyeDropper(typeof window !== "undefined" && "EyeDropper" in window)
  }, [])

  // Commit a color from any picker surface (wheel, alpha, eyedropper) and keep
  // the code field in sync — even while the input is focused.
  const applyColor = useCallback(
    (next: GooeyColor) => {
      setColor(next)
      setHexDraft(toHex(next))
    },
    [setColor]
  )

  const pickWithEyeDropper = useCallback(async () => {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperConstructor })
      .EyeDropper
    if (!Ctor) return
    try {
      const { sRGBHex } = await new Ctor().open()
      applyColor({ ...parseColor(sRGBHex), a: colorRef.current.a })
    } catch {
      // user dismissed the eyedropper — no-op
    }
  }, [applyColor])

  function commitHex(raw: string) {
    const next = parseColor(raw.startsWith("#") ? raw : `#${raw}`)
    const normalized = toHex(next)
    if (/^#?[0-9a-f]{3,8}$/i.test(raw.trim())) {
      setColor({ ...next })
      setHexDraft(normalized)
      return
    }
    setHexDraft(hex)
  }

  function togglePicker() {
    setOpen((v) => !v)
  }

  function closePicker() {
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePicker()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closePicker()
      }
    }
    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  const updateWheelFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = wheelRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = clientX - cx
      const dy = clientY - cy
      const radius = rect.width / 2
      const dist = Math.min(Math.hypot(dx, dy) / radius, 1)
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI
      const h = (angle + 90 + 360) % 360
      const s = clamp(dist * 100, 0, 100)
      applyColor({ ...colorRef.current, h, s, l: 55 })
    },
    [applyColor]
  )

  const updateAlphaFromPointer = useCallback(
    (clientX: number) => {
      const el = alphaRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const t = clamp((clientX - rect.left) / rect.width, 0, 1)
      applyColor({ ...colorRef.current, a: t })
    },
    [applyColor]
  )

  const wheelThumb = {
    x: 50 + Math.sin((color.h * Math.PI) / 180) * color.s * 0.42,
    y: 50 - Math.cos((color.h * Math.PI) / 180) * color.s * 0.42,
  }

  return (
    <div
      ref={rootRef}
      data-slot="gooey-color-picker"
      data-open={open ? "true" : "false"}
      className={cn(
        "relative inline-flex h-12 w-48 items-end justify-center select-none",
        className
      )}
    >
      <motion.div
        data-gcp-panel
        aria-hidden={!open}
        className="absolute bottom-15 left-1/2 z-10 flex w-48 flex-col items-center overflow-hidden border border-white/15 bg-black p-3 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.65)]"
        style={{
          borderRadius: "6rem 6rem 1.35rem 1.35rem",
          transformOrigin: "bottom center",
          x: "-50%",
        }}
        initial={false}
        animate={
          open
            ? {
                opacity: 1,
                scaleX: 1,
                scaleY: 1,
                y: 0,
                filter: "blur(0px)",
                pointerEvents: "auto" as const,
              }
            : {
                opacity: 0,
                scaleX: 0.22,
                scaleY: 0.14,
                y: 12,
                filter: "blur(12px)",
                pointerEvents: "none" as const,
              }
        }
        transition={{
          ...spring,
          filter: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
        }}
      >
        <div
          ref={wheelRef}
          role="slider"
          tabIndex={open ? 0 : -1}
          aria-label="Color"
          aria-valuetext={`hue ${Math.round(color.h)}, saturation ${Math.round(color.s)}`}
          className={cn(
            "relative size-40 shrink-0 touch-none rounded-full outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          )}
          style={{
            background: `
              radial-gradient(circle at center, #fff 0%, transparent 62%),
              conic-gradient(
                from 0deg,
                hsl(0 100% 50%),
                hsl(60 100% 50%),
                hsl(120 100% 50%),
                hsl(180 100% 50%),
                hsl(240 100% 50%),
                hsl(300 100% 50%),
                hsl(360 100% 50%)
              )
            `,
          }}
          onPointerDown={bindDrag((x, y) => updateWheelFromPointer(x, y))}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault()
              applyColor({ ...color, h: (color.h + 350) % 360 })
            }
            if (event.key === "ArrowRight") {
              event.preventDefault()
              applyColor({ ...color, h: (color.h + 10) % 360 })
            }
            if (event.key === "ArrowUp") {
              event.preventDefault()
              applyColor({ ...color, s: clamp(color.s + 5, 0, 100) })
            }
            if (event.key === "ArrowDown") {
              event.preventDefault()
              applyColor({ ...color, s: clamp(color.s - 5, 0, 100) })
            }
          }}
        >
          <span
            className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
            style={{
              left: `${wheelThumb.x}%`,
              top: `${wheelThumb.y}%`,
              background: opaque,
            }}
          />
        </div>

        <div
          ref={alphaRef}
          role="slider"
          tabIndex={open ? 0 : -1}
          aria-label="Opacity"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(color.a * 100)}
          className={cn(
            "relative mt-3 h-9 w-full shrink-0 touch-none overflow-hidden rounded-xl outline-none ring-1 ring-white/10",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          )}
          style={{
            background: `linear-gradient(to right, transparent, ${opaque})`,
          }}
          onPointerDown={bindDrag((x) => updateAlphaFromPointer(x))}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault()
              applyColor({ ...color, a: clamp(color.a + 0.05, 0, 1) })
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault()
              applyColor({ ...color, a: clamp(color.a - 0.05, 0, 1) })
            }
          }}
        >
          <span
            className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
            style={{
              left: `${color.a * 100}%`,
              background: css,
            }}
          />
        </div>

        <div className="mt-3 flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
          <span
            className="size-3.5 shrink-0 rounded-full ring-1 ring-white/25"
            style={{ background: css }}
            aria-hidden
          />
          <input
            type="text"
            spellCheck={false}
            aria-label="Hex color"
            tabIndex={open ? 0 : -1}
            value={hexDraft}
            onFocus={() => {
              hexFocused.current = true
            }}
            onChange={(event) => setHexDraft(event.target.value)}
            onBlur={() => {
              hexFocused.current = false
              commitHex(hexDraft)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur()
              }
              if (event.key === "Escape") {
                setHexDraft(hex)
                event.currentTarget.blur()
              }
            }}
            className="min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/40"
          />
          {supportsEyeDropper ? (
            <button
              type="button"
              aria-label="Pick color from screen"
              tabIndex={open ? 0 : -1}
              onClick={pickWithEyeDropper}
              className={cn(
                "-mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-white/60 outline-none",
                "transition-colors hover:bg-white/10 hover:text-white",
                "focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <EyeDropperIcon />
            </button>
          ) : null}
        </div>
      </motion.div>

      <motion.button
        type="button"
        aria-label={open ? "Close color picker" : label}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "relative z-20 flex size-12 items-center justify-center rounded-full border border-white/20 bg-black text-white outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        whileTap={{ scale: 0.94 }}
        transition={spring}
        onClick={togglePicker}
      >
        <TriggerIcon open={open} />
      </motion.button>
    </div>
  )
}

export default GooeyColorPicker
