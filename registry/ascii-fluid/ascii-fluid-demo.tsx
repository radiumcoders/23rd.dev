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
import { AsciiFluid } from "@/registry/ascii-fluid/ascii-fluid"

/** Matches AsciiFluid theme defaults (uppercase for color inputs). */
const LIGHT = { color: "#18181B", backgroundColor: "#FAFAFA" }
const DARK = { color: "#E4E4E7", backgroundColor: "#09090B" }

type ThemePalette = { color: string; backgroundColor: string }

function norm(hex: string) {
  return hex.trim().toUpperCase()
}

function matchesPalette(
  color: string,
  backgroundColor: string,
  palette: ThemePalette
) {
  return (
    norm(color) === norm(palette.color) &&
    norm(backgroundColor) === norm(palette.backgroundColor)
  )
}

/** True when ink/paper are still one of the built-in theme pairs. */
function isStockThemePalette(color: string, backgroundColor: string) {
  return (
    matchesPalette(color, backgroundColor, LIGHT) ||
    matchesPalette(color, backgroundColor, DARK)
  )
}

export function AsciiFluidDemo() {
  const theme = useHydratedTheme()
  const palette: ThemePalette = theme === "dark" ? DARK : LIGHT

  const defaults = useMemo(
    () => ({
      cellSize: 12,
      force: 1,
      dissipation: 0.05,
      brush: 0.55,
      animate: true,
      color: palette.color,
      backgroundColor: palette.backgroundColor,
    }),
    [palette.color, palette.backgroundColor]
  )

  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)

  // Keep stock ink/paper on the active theme until the user picks custom colors.
  useLayoutEffect(() => {
    setProps((prev) => {
      if (!isStockThemePalette(prev.color, prev.backgroundColor)) return prev
      if (matchesPalette(prev.color, prev.backgroundColor, palette)) return prev
      return {
        ...prev,
        color: palette.color,
        backgroundColor: palette.backgroundColor,
      }
    })
  }, [palette, setProps])

  const useAutoTheme = isStockThemePalette(
    props.color,
    props.backgroundColor
  )

  return (
    <>
      <ComponentPreview
        title="ASCII Fluid"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[56svh] w-full overflow-hidden rounded-[inherit] bg-background">
          <AsciiFluid
            className="absolute inset-0"
            cellSize={props.cellSize}
            force={props.force}
            dissipation={props.dissipation}
            brush={props.brush}
            animate={props.animate}
            color={useAutoTheme ? undefined : props.color}
            backgroundColor={useAutoTheme ? undefined : props.backgroundColor}
            theme="auto"
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="AsciiFluid"
        snippetProps={{
          cellSize: props.cellSize,
          force: props.force,
          dissipation: props.dissipation,
          brush: props.brush,
          animate: props.animate,
          color: useAutoTheme ? undefined : props.color,
          backgroundColor: useAutoTheme ? undefined : props.backgroundColor,
        }}
      >
        <ControlColor
          label="Ink"
          value={props.color}
          onChange={(v) => updateProp("color", v)}
        />
        <ControlColor
          label="Paper"
          value={props.backgroundColor}
          onChange={(v) => updateProp("backgroundColor", v)}
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
          label="Force"
          value={props.force}
          min={0.2}
          max={2.5}
          step={0.1}
          onChange={(v) => updateProp("force", v)}
        />
        <ControlSlider
          label="Dissipation"
          value={props.dissipation}
          min={0.01}
          max={0.2}
          step={0.01}
          onChange={(v) => updateProp("dissipation", v)}
        />
        <ControlSlider
          label="Brush"
          value={props.brush}
          min={0.15}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("brush", v)}
        />
        <ControlSwitch
          label="Animate"
          description="Soft ambient swirl when idle"
          checked={props.animate}
          onChange={(v) => updateProp("animate", v)}
        />
      </ComponentControls>
    </>
  )
}
