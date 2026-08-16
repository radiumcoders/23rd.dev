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
  Dithered404,
  LIGHT_COLOR,
} from "@/registry/dithered-404/dithered-404"

function norm(hex: string) {
  return hex.trim().toUpperCase()
}

function isStockColor(color: string) {
  const value = norm(color)
  return value === norm(LIGHT_COLOR) || value === norm(DARK_COLOR)
}

export function Dithered404Demo() {
  const theme = useHydratedTheme()
  const palette = theme === "dark" ? DARK_COLOR : LIGHT_COLOR

  const defaults = useMemo(
    () => ({
      color: palette,
      pixelSize: 4,
      interactive: true,
      dither: true,
    }),
    [palette]
  )

  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)

  useLayoutEffect(() => {
    setProps((prev) => {
      if (!isStockColor(prev.color)) return prev
      if (norm(prev.color) === norm(palette)) return prev
      return { ...prev, color: palette }
    })
  }, [palette, setProps])

  const useAutoTheme = isStockColor(props.color)

  return (
    <>
      <ComponentPreview
        title="Lost page"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[56svh] w-full overflow-hidden rounded-[inherit] bg-background">
          <Dithered404
            className="absolute inset-0"
            color={useAutoTheme ? undefined : props.color}
            pixelSize={props.pixelSize}
            interactive={props.interactive}
            dither={props.dither}
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="Dithered404"
        snippetProps={{
          color: useAutoTheme ? undefined : props.color,
          pixelSize: props.pixelSize,
          interactive: props.interactive,
          dither: props.dither ? undefined : false,
        }}
      >
        <ControlColor
          label="Color"
          value={props.color}
          onChange={(v) => updateProp("color", v)}
        />
        <ControlSlider
          label="Pixel size"
          value={props.pixelSize}
          min={2}
          max={10}
          step={1}
          onChange={(v) => updateProp("pixelSize", v)}
        />
        <ControlSwitch
          label="Dither"
          description="Ordered Bayer pixels — off is a soft realistic fire"
          checked={props.dither}
          onChange={(v) => updateProp("dither", v)}
        />
        <ControlSwitch
          label="Interactive"
          description="Fireball follows the pointer"
          checked={props.interactive}
          onChange={(v) => updateProp("interactive", v)}
        />
      </ComponentControls>
    </>
  )
}
