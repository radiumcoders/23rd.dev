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
  DEFAULT_BLUR,
  DEFAULT_GRAIN,
  DEFAULT_INTENSITY,
  DEFAULT_SPEED,
  LIGHT_COLORS,
  ShaderGradient,
} from "@/registry/shader-gradient/shader-gradient"

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

export function ShaderGradientDemo() {
  const theme = useHydratedTheme()
  const palette = theme === "dark" ? DARK_COLORS : LIGHT_COLORS

  const defaults = useMemo(
    () => ({
      speed: DEFAULT_SPEED,
      blur: DEFAULT_BLUR,
      intensity: DEFAULT_INTENSITY,
      grain: DEFAULT_GRAIN,
      interactive: true,
      overlay: true,
      colors: palette,
    }),
    [palette]
  )

  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)

  // Keep the stock wash on the active theme until the user picks custom colors.
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
          <ShaderGradient
            className="absolute inset-0"
            speed={props.speed}
            blur={props.blur}
            intensity={props.intensity}
            grain={props.grain}
            interactive={props.interactive}
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
                  Landing
                </p>
                <h3 className="mt-3 max-w-lg text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
                  A first screen that already feels finished
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-foreground/70">
                  Headline and a primary action sit on the wash. The shader
                  stays in the back.
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
        component="ShaderGradient"
        snippetProps={{
          speed: props.speed === DEFAULT_SPEED ? undefined : props.speed,
          blur: props.blur === DEFAULT_BLUR ? undefined : props.blur,
          intensity:
            props.intensity === DEFAULT_INTENSITY ? undefined : props.intensity,
          grain: props.grain === DEFAULT_GRAIN ? undefined : props.grain,
          interactive: props.interactive ? undefined : false,
          colors: useAutoTheme ? undefined : props.colors,
        }}
      >
        <ControlColors
          label="Palette"
          colors={props.colors}
          palettes={[
            palette,
            // Each cycles back to its first color, so neighbours stay close.
            ["#FF6B6B", "#FFB36B", "#FFE08A", "#FF8FB1"],
            ["#0B3D91", "#1F7A8C", "#6CC4A1", "#2E5EAA"],
            ["#F72585", "#B5179E", "#7209B7", "#4361EE"],
          ]}
          onChange={(colors) => updateProp("colors", colors)}
        />
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={0.02}
          max={0.6}
          step={0.02}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSlider
          label="Blur"
          value={props.blur}
          min={0.2}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("blur", v)}
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
          label="Grain"
          value={props.grain}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("grain", v)}
        />
        <ControlSwitch
          label="Copy"
          description="Headline over the gradient"
          checked={props.overlay}
          onChange={(v) => updateProp("overlay", v)}
        />
        <ControlSwitch
          label="Interactive"
          description="Swirl the flow around the pointer"
          checked={props.interactive}
          onChange={(v) => updateProp("interactive", v)}
        />
      </ComponentControls>
    </>
  )
}
