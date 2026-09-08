"use client"

import { useLayoutEffect, useMemo } from "react"

import {
  ComponentControls,
  ControlColor,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { useHydratedTheme } from "@/hooks/use-hydrated-theme"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  DARK_COLOR,
  DEFAULT_DENSITY,
  DEFAULT_GLOW,
  DEFAULT_SPEED,
  LIGHT_COLOR,
  PhosphorScore,
} from "@/registry/phosphor-score/phosphor-score"

function norm(hex: string) {
  return hex.trim().toUpperCase()
}

function isStockColor(color: string) {
  return norm(color) === norm(LIGHT_COLOR) || norm(color) === norm(DARK_COLOR)
}

export function PhosphorScoreDemo() {
  const theme = useHydratedTheme()
  const stock = theme === "dark" ? DARK_COLOR : LIGHT_COLOR

  const defaults = useMemo(
    () => ({
      color: stock,
      glow: DEFAULT_GLOW,
      speed: DEFAULT_SPEED,
      density: DEFAULT_DENSITY,
      sway: true,
    }),
    [stock]
  )

  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)

  useLayoutEffect(() => {
    setProps((prev) => {
      if (!isStockColor(prev.color)) return prev
      if (norm(prev.color) === norm(stock)) return prev
      return { ...prev, color: stock }
    })
  }, [setProps, stock])

  const useAutoColor = isStockColor(props.color)

  return (
    <>
      <ComponentPreview
        title="Phosphor Score"
        stageClassName="min-h-0 overflow-hidden bg-background p-0"
      >
        <div className="relative h-[56svh] w-full bg-background">
          <PhosphorScore
            color={useAutoColor ? undefined : props.color}
            glow={props.glow}
            speed={props.speed}
            density={props.density}
            sway={props.sway}
            theme="auto"
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="PhosphorScore"
        snippetProps={{
          color: useAutoColor ? undefined : props.color,
          glow: props.glow === DEFAULT_GLOW ? undefined : props.glow,
          speed: props.speed === DEFAULT_SPEED ? undefined : props.speed,
          density:
            props.density === DEFAULT_DENSITY ? undefined : props.density,
          sway: props.sway ? undefined : false,
        }}
      >
        <ControlColor
          label="Phosphor"
          value={props.color}
          onChange={(v) => updateProp("color", v)}
        />
        <ControlSlider
          label="Glow"
          value={props.glow}
          min={0}
          max={100}
          step={1}
          onChange={(v) => updateProp("glow", v)}
        />
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={0.3}
          max={3}
          step={0.05}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSlider
          label="Density"
          value={props.density}
          min={0.4}
          max={1.8}
          step={0.05}
          onChange={(v) => updateProp("density", v)}
        />
        <ControlSwitch
          label="Sway"
          description="Slow camera drift around the plane"
          checked={props.sway}
          onChange={(v) => updateProp("sway", v)}
        />
      </ComponentControls>
    </>
  )
}
