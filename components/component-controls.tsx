"use client"

import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { RiAddLine, RiRefreshLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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

export type ComponentControlsProps = {
  children: ReactNode
  /** Label in the figcaption — matches CliCommand / ComponentPreview */
  title?: string
  hasChanges?: boolean
  onReset?: () => void
  className?: string
}

/**
 * Docs section for live prop controls — same chrome as CliCommand, tables,
 * and ComponentPreview (`rounded-2xl bg-muted/50` figure + ringed stage).
 */
export function ComponentControls({
  children,
  title = "Props",
  hasChanges = false,
  onReset,
  className,
}: ComponentControlsProps) {
  return (
    <figure
      data-slot="component-controls"
      className={cn(
        "not-prose my-6 w-full overflow-hidden rounded-2xl bg-muted/50",
        className
      )}
    >
      <figcaption className="flex items-center justify-between gap-3 px-3.5 py-0.5">
        <span className="text-sm font-medium text-foreground/90">{title}</span>
        {onReset ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onReset}
            disabled={!hasChanges}
            aria-label="Reset props"
            className="text-muted-foreground"
          >
            <RiRefreshLine data-icon="inline-start" />
            Reset
          </Button>
        ) : null}
      </figcaption>

      <div className="p-1 pt-0">
        <div className="flex flex-col gap-4 rounded-[calc(var(--radius-2xl)-2px)] bg-background px-3.5 py-3.5 ring-1 ring-border/80 sm:px-4">
          {children}
        </div>
      </div>
    </figure>
  )
}

function formatValue(value: number) {
  if (Number.isInteger(value)) return String(value)
  const abs = Math.abs(value)
  if (abs >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

function tickCount(min: number, max: number, step: number) {
  if (step <= 0 || max <= min) return 9
  const steps = Math.round((max - min) / step)
  if (steps <= 12) return steps + 1
  return 9
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

const THUMB_WIDTH = 4

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
  const pillRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [fillWidth, setFillWidth] = useState(0)

  const progress = max === min ? 0 : (value - min) / (max - min)
  const ticks = tickCount(min, max, step)

  const syncMetrics = useCallback(() => {
    const pill = pillRef.current
    const track = trackRef.current
    if (!pill || !track) return
    const pillBox = pill.getBoundingClientRect()
    const trackBox = track.getBoundingClientRect()
    const travel = Math.max(0, trackBox.width - THUMB_WIDTH)
    const offset = progress * travel
    setFillWidth(trackBox.left - pillBox.left + offset + THUMB_WIDTH)
  }, [progress])

  useLayoutEffect(() => {
    syncMetrics()
    const pill = pillRef.current
    if (!pill || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(syncMetrics)
    observer.observe(pill)
    return () => observer.disconnect()
  }, [syncMetrics])

  const commitFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return
      const { left, width } = track.getBoundingClientRect()
      const travel = Math.max(0, width - THUMB_WIDTH)
      if (travel <= 0) return
      const ratio = Math.min(1, Math.max(0, (clientX - left - THUMB_WIDTH / 2) / travel))
      onChange(snapToStep(min + ratio * (max - min), min, max, step))
    },
    [max, min, onChange, step]
  )

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    commitFromClientX(event.clientX)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    commitFromClientX(event.clientX)
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        ref={pillRef}
        className="relative flex h-9 min-w-0 flex-1 cursor-ew-resize select-none items-center overflow-hidden rounded-xl bg-muted focus-within:ring-2 focus-within:ring-ring/30"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-end rounded-xl bg-foreground/10 pe-0.5"
          style={{ width: Math.max(fillWidth, 18) }}
        >
          <span className="h-3.5 w-1 rounded-sm bg-foreground/45" />
        </div>

        <span className="pointer-events-none relative w-[4.75rem] shrink-0 truncate ps-3 text-sm text-muted-foreground">
          {label}
        </span>

        <div ref={trackRef} className="relative mx-2 h-full min-w-0 flex-1 pe-2">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between"
          >
            {Array.from({ length: ticks }, (_, i) => (
              <span key={i} className="h-2 w-px bg-foreground/20" />
            ))}
          </div>
        </div>

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(event) => onChange(Number(event.target.value))}
          className="sr-only"
        />
      </div>

      <span className="w-8 shrink-0 text-right text-sm text-foreground tabular-nums">
        {format(value)}
      </span>
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

export function ControlSwitch({
  label,
  checked,
  onChange,
  description,
  className,
}: ControlSwitchProps) {
  const id = useId()

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground/90">
          {label}
        </label>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        size="sm"
      />
    </div>
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
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground/90">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-2xl ring-1 ring-border/80 transition-[box-shadow] hover:ring-ring/40 focus-within:ring-3 focus-within:ring-ring/30">
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
        </label>
        <span className="font-mono text-xs text-muted-foreground uppercase tabular-nums">
          {hex}
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
    () => palettes.slice(0, 4).map((palette) => fitPalette(palette, colors.length)),
    [palettes, colors.length]
  )

  const activeIndex = fitted.findIndex((palette) => colorsEqual(palette, colors))
  const [customOpen, setCustomOpen] = useState(activeIndex === -1)

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <span className="text-sm font-medium text-foreground/90">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
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
                "flex h-9 overflow-hidden rounded-2xl ring-1 transition-[box-shadow]",
                selected
                  ? "ring-2 ring-ring"
                  : "ring-border/80 hover:ring-ring/40"
              )}
            >
              {palette.map((color, colorIndex) => (
                <span
                  key={`${color}-${colorIndex}`}
                  className="h-full w-3.5"
                  style={{ backgroundColor: color }}
                />
              ))}
            </button>
          )
        })}

        <Button
          type="button"
          variant={customOpen ? "secondary" : "outline"}
          size="xs"
          aria-pressed={customOpen}
          onClick={() => setCustomOpen((open) => !open)}
        >
          <RiAddLine data-icon="inline-start" />
          Custom
        </Button>
      </div>

      {customOpen ? (
        <div className="flex flex-wrap gap-2">
          {colors.map((color, index) => {
            const hex = toHex6(color)
            return (
              <label
                key={`${hex}-${index}`}
                className="relative size-9 cursor-pointer overflow-hidden rounded-2xl ring-1 ring-border/80 transition-[box-shadow] hover:ring-ring/40 focus-within:ring-3 focus-within:ring-ring/30"
              >
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{ backgroundColor: hex }}
                />
                <input
                  type="color"
                  value={hex}
                  aria-label={`${label} ${index + 1}`}
                  onChange={(e) => {
                    const next = colors.map((c, i) =>
                      i === index ? e.target.value.toUpperCase() : c
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
