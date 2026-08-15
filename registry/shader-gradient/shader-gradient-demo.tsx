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
  const { resolvedTheme } = useTheme()
  const palette = resolvedTheme === "dark" ? DARK_COLORS : LIGHT_COLORS

  const defaults = useMemo(
    () => ({
      speed: 0.14,
      blur: 0.7,
      intensity: 0.95,
      interactive: true,
      colors: palette,
    }),
    [palette]
  )

  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)

  // Keep the stock wash on the active theme until the user picks custom colors.
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
          <ShaderGradient
            className="absolute inset-0"
            speed={props.speed}
            blur={props.blur}
            intensity={props.intensity}
            interactive={props.interactive}
            colors={useAutoTheme ? undefined : props.colors}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--background)_0%,transparent_58%)] opacity-40 dark:opacity-65"
          />
          <div className="relative z-10 flex size-full flex-col items-center justify-center px-8 text-center">
            <p className="text-xs font-medium tracking-[0.2em] text-foreground/55 uppercase">
              Landing
            </p>
            <h3 className="mt-3 max-w-lg text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              A first screen that already feels finished
            </h3>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-foreground/70">
              Headline and a primary action sit on the wash. The shader stays
              in the back.
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
        <ControlSwitch
          label="Interactive"
          description="Follow the pointer"
          checked={props.interactive}
          onChange={(v) => updateProp("interactive", v)}
        />
      </ComponentControls>
    </>
  )
}
