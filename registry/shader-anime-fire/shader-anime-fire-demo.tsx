"use client"

import { useLayoutEffect, useMemo } from "react"

import { Button } from "@/components/ui/button"
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
  DEFAULT_EMBERS,
  DEFAULT_HEIGHT,
  DEFAULT_INTENSITY,
  DEFAULT_SPEED,
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
  const theme = useHydratedTheme()
  const palette = theme === "dark" ? DARK_COLORS : LIGHT_COLORS

  const defaults = useMemo(
    () => ({
      speed: DEFAULT_SPEED,
      intensity: DEFAULT_INTENSITY,
      height: DEFAULT_HEIGHT,
      embers: DEFAULT_EMBERS,
      interactive: true,
      overlay: true,
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
          <ShaderFire
            className="absolute inset-0"
            speed={props.speed}
            intensity={props.intensity}
            height={props.height}
            embers={props.embers}
            interactive={props.interactive}
            dither={props.dither}
            pixelSize={props.pixelSize}
            colors={useAutoTheme ? undefined : props.colors}
          />
          {props.overlay ? (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--background)_0%,transparent_58%)] opacity-30 dark:opacity-40"
              />
              <div className="relative z-10 flex size-full flex-col items-center justify-center px-8 text-center">
                <p className="text-xs font-medium tracking-[0.2em] text-foreground/55 uppercase">
                  Now burning
                </p>
                <h3 className="mt-3 max-w-lg text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
                  Ship something that catches
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-foreground/70">
                  Flames lick up from the floor and sparks drift past the copy.
                  Move the pointer and the fire reaches for it.
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
            </>
          ) : null}
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="ShaderFire"
        snippetProps={{
          speed: props.speed === DEFAULT_SPEED ? undefined : props.speed,
          intensity:
            props.intensity === DEFAULT_INTENSITY ? undefined : props.intensity,
          height: props.height === DEFAULT_HEIGHT ? undefined : props.height,
          embers: props.embers === DEFAULT_EMBERS ? undefined : props.embers,
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
        <ControlSlider
          label="Embers"
          value={props.embers}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("embers", v)}
        />
        <ControlSwitch
          label="Copy"
          description="Headline over the fire"
          checked={props.overlay}
          onChange={(v) => updateProp("overlay", v)}
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
