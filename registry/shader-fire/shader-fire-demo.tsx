"use client"

import { useEffect, useMemo } from "react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  ComponentControls,
  ControlColors,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  DARK_COLORS,
  LIGHT_COLORS,
  ShaderFire,
} from "@/registry/shader-fire/shader-fire"

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

export function ShaderFireDemo() {
  const { resolvedTheme } = useTheme()
  const palette = resolvedTheme === "dark" ? DARK_COLORS : LIGHT_COLORS

  const defaults = useMemo(
    () => ({
      speed: 0.55,
      intensity: 0.55,
      height: 0.45,
      interactive: true,
      dither: false,
      pixelSize: 1,
      colors: palette,
    }),
    [palette]
  )

  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)

  useEffect(() => {
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
          <ShaderFire
            className="absolute inset-0"
            speed={props.speed}
            intensity={props.intensity}
            height={props.height}
            interactive={props.interactive}
            dither={props.dither}
            pixelSize={props.pixelSize}
            colors={useAutoTheme ? undefined : props.colors}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--background)_0%,transparent_58%)] opacity-40 dark:opacity-65"
          />
          <div className="relative z-10 flex size-full flex-col items-center justify-center px-8 text-center">
            <p className="text-xs font-medium tracking-[0.2em] text-foreground/55 uppercase">
              Atmosphere
            </p>
            <h3 className="mt-3 max-w-lg text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              Heat under the headline
            </h3>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-foreground/70">
              Sparse tongues rise from the bottom. Copy stays in the quiet
              middle; the fire stays a wash.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button type="button">Install</Button>
              <Button
                type="button"
                variant="outline"
                className="bg-background/70 backdrop-blur-sm"
              >
                View API
              </Button>
            </div>
          </div>
        </div>
      </ComponentPreview>

      <ComponentControls hasChanges={hasChanges} onReset={resetProps}>
        <ControlColors
          label="Palette"
          colors={props.colors}
          palettes={[
            palette,
            ["#1E3A5F", "#4A90A4", "#C5E4E7"],
            ["#5B1E6E", "#C44569", "#FFA07A"],
            ["#1A1A1A", "#6B4F3A", "#E8E4DC"],
          ]}
          onChange={(colors) => updateProp("colors", colors)}
        />
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={0.1}
          max={1.4}
          step={0.05}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSlider
          label="Intensity"
          value={props.intensity}
          min={0.2}
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
          description="Heat follows the pointer"
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
