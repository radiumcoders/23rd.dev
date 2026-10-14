"use client"

import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { RiAddLine, RiRefreshLine } from "@remixicon/react"
import { createPortal } from "react-dom"

import { PreviewStageContext } from "@/components/component-preview"
import { CopyButton } from "@/components/copy-button"
import { trackEvent } from "@/components/tracwell-analytics"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function toHex6(value: string) {
  const raw = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase()
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [, r, g, b] = raw
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  return "#000000"
}

function norm(hex: string) {
  return toHex6(hex)
}

function colorsEqual(a: string[], b: string[]) {
  return (
    a.length === b.length && a.every((color, i) => norm(color) === norm(b[i]!))
  )
}

function fitPalette(palette: string[], count: number) {
  if (count <= 0) return []
  if (palette.length === count) return palette.map(toHex6)
  return Array.from({ length: count }, (_, i) =>
    toHex6(palette[i % palette.length]!)
  )
}

const DEFAULT_PALETTES = [
  ["#A33A18", "#D4682A", "#E8B45A", "#F3D19A"],
  ["#1D4E89", "#3A7CA5", "#81C3D7", "#D9E8F5"],
  ["#1B4332", "#40916C", "#95D5B2", "#D8F3DC"],
  ["#3D1E6D", "#7B2CBF", "#C77DFF", "#E0AAFF"],
]

function formatJsxLiteral(value: unknown): string {
  if (typeof value === "string") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatJsxLiteral(item)).join(", ")}]`
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined)
    if (entries.length === 0) return "{}"
    const body = entries
      .map(([key, v]) => {
        const name = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)
        return `${name}: ${formatJsxLiteral(v)}`
      })
      .join(", ")
    return `{ ${body} }`
  }
  return JSON.stringify(value)
}

function formatJsxAttr(value: unknown): string {
  if (typeof value === "string") return formatJsxLiteral(value)
  return `{${formatJsxLiteral(value)}}`
}

/** Live control values as a pasteable JSX element. `undefined` props are omitted. */
export function formatComponentSnippet(
  name: string,
  props: Record<string, unknown>
) {
  const lines: string[] = []
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue
    if (value === true) {
      lines.push(`  ${key}`)
      continue
    }
    if (value === false) {
      lines.push(`  ${key}={false}`)
      continue
    }
    lines.push(`  ${key}=${formatJsxAttr(value)}`)
  }
  if (lines.length === 0) return `<${name} />`
  return `<${name}\n${lines.join("\n")}\n/>`
}

export type ComponentControlsProps = {
  children: ReactNode
  /** Heading for the props strip */
  title?: string
  hasChanges?: boolean
  onReset?: () => void
  className?: string
  /** Component tag for the copy snippet, e.g. `"ShaderAnimeFire"` */
  component?: string
  /** Props included in the copied JSX. `undefined` values are omitted. */
  snippetProps?: Record<string, unknown>
}

/** Row chrome shared by every control, and applied to custom rows demos pass in. */
const rowClassName = "rounded-lg bg-background"

/**
 * Live prop controls. On a component page they move into the props panel
 * beside the stage (a portal, so they keep driving the demo you watch).
 * Anywhere else, directly after ComponentPreview they join the preview's
 * frame, so the props read as the screen's control strip.
 */
export function ComponentControls({
  children,
  title = "Props",
  hasChanges = false,
  onReset,
  className,
  component,
  snippetProps,
}: ComponentControlsProps) {
  const stage = useContext(PreviewStageContext)
  const onControls = stage?.onControls
  useEffect(() => {
    if (!onControls) return
    onControls(true)
    return () => onControls(false)
  }, [onControls])

  const snippet = component
    ? formatComponentSnippet(component, snippetProps ?? {})
    : ""
  const docked = !!stage

  const controls = (
    <figure
      data-slot="component-controls"
      className={cn(
        "not-prose",
        docked
          ? "m-0"
          : [
              "my-8 rounded-2xl border bg-card",
              "[[data-slot=component-preview]+&]:mt-0 [[data-slot=component-preview]+&]:rounded-t-none [[data-slot=component-preview]+&]:border-t-0",
            ],
        className
      )}
    >
      <figcaption
        className={cn(
          "flex h-12 items-center justify-between gap-3 border-b border-border/60 px-6",
          // The panel scrolls on its own; its header stays put, and keeps
          // the panel's rounded corners while it sits over them.
          docked &&
            "sticky top-0 z-10 rounded-t-[inherit] bg-sheet/90 backdrop-blur-md"
        )}
      >
        <span className="text-[13px] font-medium text-foreground">{title}</span>
        {snippet || onReset ? (
          <div className="-me-2 flex items-center">
            {onReset ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={onReset}
                disabled={!hasChanges}
                aria-label="Reset props"
                className="rounded-md text-muted-foreground"
              >
                <RiRefreshLine data-icon="inline-start" />
                Reset
              </Button>
            ) : null}
            {snippet ? (
              <CopyButton
                size="xs"
                text={snippet}
                label="Copy JSX"
                className="rounded-md"
                onCopied={() =>
                  trackEvent("code_copied", {
                    source: "component_snippet",
                    ...(component ? { component } : {}),
                  })
                }
              />
            ) : null}
          </div>
        ) : null}
      </figcaption>

      <div
        className={cn(
          "flex flex-col gap-2 px-3 py-3",
          // Under the stage on a mid-width screen the panel is wide; two
          // columns keep each label near its control. Beside it, one.
          docked && "md:grid md:grid-cols-2 md:gap-x-3 xl:flex",
          "[&>:not([data-control])]:rounded-lg [&>:not([data-control])]:bg-background [&>:not([data-control])]:px-3 [&>:not([data-control])]:py-2"
        )}
      >
        {children}
      </div>
    </figure>
  )

  if (!stage) return controls
  if (!stage.controlsSlot) return null
  return createPortal(controls, stage.controlsSlot)
}

function formatValue(value: number) {
  if (Number.isInteger(value)) return String(value)
  const abs = Math.abs(value)
  if (abs >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

export type ControlSliderProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (value: number) => string
  onChange: (value: number) => void
  className?: string
}

function snapToStep(raw: number, min: number, max: number, step: number) {
  const snapped = min + Math.round((raw - min) / step) * step
  const precision = step < 1 ? Math.ceil(-Math.log10(step)) + 1 : 0
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(precision))
}

/**
 * How far, in px, the row can stretch past its end; it never quite gets
 * there. The rows' side padding leaves exactly this much room, so a scroll
 * container around them never clips the stretch.
 */
const STRETCH_MAX = 12
/** Release spring: a quick overshoot, then rest. */
const STRETCH_RELEASE = "transform 520ms cubic-bezier(0.34, 1.56, 0.64, 1)"

/**
 * Rubber band: the further past the end, the less each extra pixel pulls,
 * easing toward STRETCH_MAX.
 */
function rubberBand(overshoot: number) {
  return (
    Math.sign(overshoot) *
    STRETCH_MAX *
    (1 - Math.exp(-Math.abs(overshoot) / 60))
  )
}

/**
 * A whole-row slider: drag anywhere on the row; the fill is the value.
 * Dragged past either end, the row stretches after the pointer like
 * rubber, then springs back on release.
 */
export function ControlSlider({
  label,
  value,
  min,
  max,
  step = 1,
  format = formatValue,
  onChange,
  className,
}: ControlSliderProps) {
  const id = useId()
  const progress = max === min ? 0 : (value - min) / (max - min)
  const rowRef = useRef<HTMLDivElement>(null)
  // The row's box when the drag began. Measured once: while stretched the
  // live box is scaled, and measuring it would feed the stretch back in.
  const boxRef = useRef<{ left: number; width: number } | null>(null)

  const stretch = useCallback((px: number, width: number) => {
    const row = rowRef.current
    if (!row) return
    if (px === 0 || width <= 0) {
      row.style.transform = ""
      return
    }
    const k = Math.abs(px) / width
    row.style.transition = "none"
    row.style.transformOrigin = px > 0 ? "left center" : "right center"
    row.style.transform = `scale(${1 + k}, ${1 - k * 0.6})`
  }, [])

  const commitFromClientX = useCallback(
    (clientX: number) => {
      const box = boxRef.current
      if (!box || box.width <= 0) return
      const raw = (clientX - box.left) / box.width
      const ratio = Math.min(1, Math.max(0, raw))
      onChange(snapToStep(min + ratio * (max - min), min, max, step))
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      const overshoot =
        raw < 0
          ? clientX - box.left
          : raw > 1
            ? clientX - (box.left + box.width)
            : 0
      stretch(rubberBand(overshoot), box.width)
    },
    [max, min, onChange, step, stretch]
  )

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const { left, width } = event.currentTarget.getBoundingClientRect()
    boxRef.current = { left, width }
    commitFromClientX(event.clientX)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    commitFromClientX(event.clientX)
  }

  function onRelease() {
    boxRef.current = null
    const row = rowRef.current
    if (!row || !row.style.transform) return
    row.style.transition = STRETCH_RELEASE
    row.style.transform = ""
  }

  return (
    <div
      ref={rowRef}
      data-control="slider"
      className={cn(
        rowClassName,
        "relative flex h-10 cursor-ew-resize touch-none items-center overflow-hidden select-none focus-within:ring-2 focus-within:ring-ring/40",
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onLostPointerCapture={onRelease}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 border-e border-foreground/25 bg-foreground/[0.07]"
        style={{ width: `${progress * 100}%` }}
      />
      <label
        htmlFor={id}
        className="pointer-events-none relative truncate ps-3 text-sm text-foreground/85"
      >
        {label}
      </label>
      <span className="pointer-events-none relative ms-auto ps-3 pe-3 font-mono text-[12.5px] text-foreground tabular-nums">
        {format(value)}
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="sr-only"
      />
    </div>
  )
}

export type ControlSwitchProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  description?: string
  className?: string
}

/**
 * A toggle row: the whole row is the switch. The knob widens while pressed
 * and springs across, like the sliders' stretch.
 */
export function ControlSwitch({
  label,
  checked,
  onChange,
  description,
  className,
}: ControlSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-control="switch"
      data-checked={checked || undefined}
      onClick={() => onChange(!checked)}
      className={cn(
        rowClassName,
        "group/switch flex min-h-10 w-full cursor-pointer items-center justify-between gap-4 px-3 py-2 text-start transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring/40",
        className
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-foreground/85">{label}</span>
        {description ? (
          <span className="text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <span
        aria-hidden
        className="relative flex h-5 w-9 shrink-0 items-center rounded-full bg-foreground/10 p-0.5 transition-colors duration-200 group-data-checked/switch:bg-foreground/25"
      >
        {/* Quiet by design: the knob carries the state, dim when off and
            full ink when on, rather than the whole pill lighting up. */}
        <span className="block h-4 w-4 rounded-full bg-foreground/35 shadow-sm transition-[translate,width,background-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active/switch:w-5 group-data-checked/switch:translate-x-4 group-data-checked/switch:bg-foreground group-data-checked/switch:group-active/switch:translate-x-3" />
      </span>
    </button>
  )
}

export type ControlColorProps = {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ControlColor({
  label,
  value,
  onChange,
  className,
}: ControlColorProps) {
  const id = useId()
  const hex = toHex6(value)

  return (
    <div
      data-control="color"
      className={cn(
        rowClassName,
        "flex h-10 items-center justify-between gap-4 ps-3 pe-2",
        className
      )}
    >
      <label htmlFor={id} className="text-sm text-foreground/85">
        {label}
      </label>
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[12.5px] text-foreground tabular-nums">
          {hex.toLowerCase()}
        </span>
        <span className="relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-md ring-1 ring-border transition-[box-shadow] focus-within:ring-2 focus-within:ring-ring hover:ring-foreground/30">
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundColor: hex }}
          />
          <input
            id={id}
            type="color"
            value={hex}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
      </div>
    </div>
  )
}

export type ControlColorsProps = {
  label: string
  colors: string[]
  onChange: (colors: string[]) => void
  palettes?: string[][]
  className?: string
}

export function ControlColors({
  label,
  colors,
  onChange,
  palettes = DEFAULT_PALETTES,
  className,
}: ControlColorsProps) {
  const fitted = useMemo(
    () =>
      palettes.slice(0, 4).map((palette) => fitPalette(palette, colors.length)),
    [palettes, colors.length]
  )

  const activeIndex = fitted.findIndex((palette) =>
    colorsEqual(palette, colors)
  )
  const [customOpen, setCustomOpen] = useState(activeIndex === -1)

  return (
    <div
      data-control="colors"
      className={cn(rowClassName, "flex flex-col gap-2.5 px-3 py-2", className)}
    >
      <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-sm text-foreground/85">{label}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {fitted.map((palette, index) => {
            const selected = index === activeIndex && !customOpen
            return (
              <button
                key={palette.join("-")}
                type="button"
                aria-label={`${label} palette ${index + 1}`}
                aria-pressed={selected}
                onClick={() => {
                  setCustomOpen(false)
                  onChange(palette)
                }}
                className={cn(
                  "flex h-6 overflow-hidden rounded-md ring-1 transition-[box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "ring-2 ring-foreground ring-offset-1 ring-offset-background"
                    : "ring-border hover:ring-foreground/30"
                )}
              >
                {palette.map((color, colorIndex) => (
                  <span
                    key={`${color}-${colorIndex}`}
                    className="h-full w-3"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </button>
            )
          })}

          <Button
            type="button"
            variant={customOpen ? "secondary" : "ghost"}
            size="xs"
            aria-pressed={customOpen}
            onClick={() => setCustomOpen((open) => !open)}
            className="rounded-md"
          >
            <RiAddLine data-icon="inline-start" />
            Custom
          </Button>
        </div>
      </div>

      {customOpen ? (
        <div className="flex flex-wrap justify-end gap-1.5">
          {colors.map((color, index) => {
            const hex = toHex6(color)
            return (
              <label
                key={index}
                className="relative size-7 cursor-pointer overflow-hidden rounded-md ring-1 ring-border transition-[box-shadow] focus-within:ring-2 focus-within:ring-ring hover:ring-foreground/30"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{ backgroundColor: hex }}
                />
                <input
                  type="color"
                  value={hex.toLowerCase()}
                  aria-label={`${label} ${index + 1}`}
                  onChange={(e) => {
                    const next = colors.map((c, i) =>
                      i === index ? toHex6(e.target.value) : c
                    )
                    onChange(next)
                  }}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default ComponentControls
