"use client"

import { useCallback, useLayoutEffect, useMemo, useState } from "react"

import {
  ComponentControls,
  ControlColor,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { useHydratedTheme } from "@/hooks/use-hydrated-theme"
import { usePreviewProps } from "@/hooks/use-preview-props"
import { cn } from "@/lib/utils"
import {
  DARK_COLOR,
  LCD_INK,
  LIGHT_COLOR,
  Snake404,
} from "@/registry/snake-404/snake-404"

const CODES = ["404", "500", "403"] as const

function norm(hex: string) {
  return hex.trim().toUpperCase()
}

function isStockColor(color: string) {
  const value = norm(color)
  return (
    value === norm(LIGHT_COLOR) ||
    value === norm(DARK_COLOR) ||
    value === norm(LCD_INK)
  )
}

export function Snake404Demo() {
  const theme = useHydratedTheme()
  const palette = theme === "dark" ? DARK_COLOR : LIGHT_COLOR

  const defaults = useMemo(
    () => ({
      code: "404" as string,
      color: palette,
      cellSize: 12,
      speed: 14,
      maxLength: 32,
      lcd: false,
      grid: true,
      smooth: true,
      score: true,
      playable: true,
    }),
    [palette]
  )

  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)
  const [playing, setPlaying] = useState(false)
  const [left, setLeft] = useState<number | null>(null)

  useLayoutEffect(() => {
    setProps((prev) => {
      if (!isStockColor(prev.color)) return prev
      const stock = prev.lcd ? LCD_INK : palette
      if (norm(prev.color) === norm(stock)) return prev
      return { ...prev, color: stock }
    })
  }, [palette, props.lcd, setProps])

  const onEat = useCallback((n: number) => setLeft(n), [])
  const onClear = useCallback(() => setLeft(null), [])

  const useAutoColor = isStockColor(props.color)

  return (
    <>
      <ComponentPreview
        title="Lost page"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[var(--preview-h,56svh)] w-full overflow-hidden rounded-[inherit] bg-background">
          <Snake404
            code={props.code}
            color={useAutoColor ? undefined : props.color}
            cellSize={props.cellSize}
            speed={props.speed}
            maxLength={props.maxLength}
            lcd={props.lcd}
            grid={props.grid}
            smooth={props.smooth}
            score={props.score}
            playable={props.playable}
            onEat={onEat}
            onClear={onClear}
            onPlayChange={setPlaying}
          />
          <p
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-5 px-6 text-center text-sm",
              props.lcd ? "text-[#43523D]" : "text-muted-foreground"
            )}
          >
            {!props.playable
              ? "This page could not be found."
              : playing
                ? "Esc hands the snake back."
                : "Click, then steer with the arrow keys."}
          </p>
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="Snake404"
        snippetProps={{
          code: props.code === "404" ? undefined : props.code,
          color: useAutoColor ? undefined : props.color,
          cellSize: props.cellSize,
          speed: props.speed,
          maxLength: props.maxLength,
          lcd: props.lcd || undefined,
          grid: props.grid ? undefined : false,
          smooth: props.smooth ? undefined : false,
          score: props.score ? undefined : false,
          playable: props.playable ? undefined : false,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground/90">Code</span>
          <div className="flex gap-1.5" role="group" aria-label="Code">
            {CODES.map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={props.code === code}
                onClick={() => updateProp("code", code)}
                className={cn(
                  "h-7 rounded-md px-2 text-xs font-medium tabular-nums ring-offset-2 ring-offset-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  props.code === code
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm font-medium text-foreground/90 tabular-nums">
          <span aria-live="polite">{playing ? "You're steering" : "Autopilot"}</span>
          <span className="text-muted-foreground">
            {left === null ? "Full" : `${left} left`}
          </span>
        </div>
        <ControlColor
          label="Color"
          value={props.color}
          onChange={(v) => updateProp("color", v)}
        />
        <ControlSlider
          label="Cell size"
          value={props.cellSize}
          min={6}
          max={24}
          step={1}
          onChange={(v) => updateProp("cellSize", v)}
        />
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={4}
          max={30}
          step={1}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSlider
          label="Max length"
          value={props.maxLength}
          min={4}
          max={96}
          step={1}
          onChange={(v) => updateProp("maxLength", v)}
        />
        <ControlSwitch
          label="Nokia LCD"
          description="Green screen with LCD-ink pixels"
          checked={props.lcd}
          onChange={(v) => updateProp("lcd", v)}
        />
        <ControlSwitch
          label="Grid"
          description="Faint unlit cells behind the field"
          checked={props.grid}
          onChange={(v) => updateProp("grid", v)}
        />
        <ControlSwitch
          label="Smooth"
          description="Glide between cells; off steps like the phone"
          checked={props.smooth}
          onChange={(v) => updateProp("smooth", v)}
        />
        <ControlSwitch
          label="Score"
          description="Pellets eaten, top left"
          checked={props.score}
          onChange={(v) => updateProp("score", v)}
        />
        <ControlSwitch
          label="Playable"
          description="Arrow keys, WASD, or a swipe take over"
          checked={props.playable}
          onChange={(v) => updateProp("playable", v)}
        />
      </ComponentControls>
    </>
  )
}
