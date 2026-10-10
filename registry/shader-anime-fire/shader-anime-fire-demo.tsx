"use client"

import { useLayoutEffect, useMemo } from "react"

import {
  ComponentControls,
  ControlColors,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { useHydratedTheme } from "@/hooks/use-hydrated-theme"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  DARK_COLORS,
  DEFAULT_HEIGHT,
  DEFAULT_INTENSITY,
  DEFAULT_SPEED,
  LIGHT_COLORS,
  ShaderAnimeFire,
} from "@/registry/shader-anime-fire/shader-anime-fire"

function norm(hex: string) {
  return hex.trim().toUpperCase()
}

function colorsEqual(a: string[], b: string[]) {
  return (
    a.length === b.length && a.every((color, i) => norm(color) === norm(b[i]!))
  )
}

function isStockPalette(colors: string[]) {
  return colorsEqual(colors, LIGHT_COLORS) || colorsEqual(colors, DARK_COLORS)
}

export function ShaderAnimeFireDemo() {
  const theme = useHydratedTheme()
  const palette = theme === "dark" ? DARK_COLORS : LIGHT_COLORS

  const defaults = useMemo(
    () => ({
      speed: DEFAULT_SPEED,
      intensity: DEFAULT_INTENSITY,
      height: DEFAULT_HEIGHT,
      interactive: true,
      dither: false,
      pixelSize: 1,
      colors: palette,
    }),
    [palette]
  )

  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)

  useLayoutEffect(() => {
    setProps((prev) => {
      if (!isStockPalette(prev.colors)) return prev
      if (colorsEqual(prev.colors, palette)) return prev
      return { ...prev, colors: palette }
    })
  }, [palette, setProps])

  const useAutoTheme = isStockPalette(props.colors)

  return (
    <>
      <ComponentPreview
        title="Landing hero"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[56svh] w-full overflow-hidden rounded-[inherit] bg-background">
          <ShaderAnimeFire
            className="absolute inset-0"
            speed={props.speed}
            intensity={props.intensity}
            height={props.height}
            interactive={props.interactive}
            dither={props.dither}
            pixelSize={props.pixelSize}
            colors={useAutoTheme ? undefined : props.colors}
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="ShaderAnimeFire"
        snippetProps={{
          speed: props.speed === DEFAULT_SPEED ? undefined : props.speed,
          intensity:
            props.intensity === DEFAULT_INTENSITY ? undefined : props.intensity,
          height: props.height === DEFAULT_HEIGHT ? undefined : props.height,
          interactive: props.interactive ? undefined : false,
          dither: props.dither || undefined,
          pixelSize: props.pixelSize === 1 ? undefined : props.pixelSize,
          colors: useAutoTheme ? undefined : props.colors,
        }}
      >
        <ControlColors
          label="Palette"
          colors={props.colors}
          palettes={[
            palette,
            // Coolest to hottest: ember, flame, core.
            ["#1D3FD1", "#2F8CFF", "#8EE3FF"],
            ["#0F7A3A", "#3DDC5A", "#D4FF6B"],
            ["#6A1BB0", "#D63FD2", "#FF9DE2"],
          ]}
          onChange={(colors) => updateProp("colors", colors)}
        />
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={0.2}
          max={2}
          step={0.05}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSlider
          label="Intensity"
          value={props.intensity}
          min={0.3}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("intensity", v)}
        />
        <ControlSlider
          label="Height"
          value={props.height}
          min={0.2}
          max={0.85}
          step={0.05}
          onChange={(v) => updateProp("height", v)}
        />
        <ControlSwitch
          label="Interactive"
          description="Flames reach for the pointer"
          checked={props.interactive}
          onChange={(v) => updateProp("interactive", v)}
        />
        <ControlSwitch
          label="Dither"
          description="Ordered Bayer pixels"
          checked={props.dither}
          onChange={(v) => updateProp("dither", v)}
        />
        <ControlSlider
          label="Pixel size"
          value={props.pixelSize}
          min={1}
          max={8}
          step={1}
          onChange={(v) => updateProp("pixelSize", v)}
        />
      </ComponentControls>
    </>
  )
}
