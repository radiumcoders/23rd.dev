"use client"

import { Button } from "@/components/ui/button"
import {
  ComponentControls,
  ControlColors,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import { ShaderSky } from "@/registry/shader-sky/shader-sky"

const SKY_PALETTES = [
  ["#1D4E89", "#7EB6D9", "#F4F8FC", "#B7D0E6"],
  ["#5C6B78", "#9AA4AB", "#D0D5DA", "#6A7380"],
  ["#C45C26", "#F0A868", "#FFF6E8", "#E8C9A0"],
]

const DEFAULTS = {
  speed: 0.1,
  coverage: 0.5,
  intensity: 0.9,
  amount: 0.5,
  scale: 0.4,
  variation: 0.7,
  interactive: false,
  glass: false,
  glassSize: 7,
  overlay: true,
  colors: SKY_PALETTES[0]!,
}

export function ShaderSkyDemo() {
  const { props, updateProp, resetProps, hasChanges } = usePreviewProps(DEFAULTS)

  return (
    <>
      <ComponentPreview
        title="Landing hero"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[56svh] w-full overflow-hidden rounded-[inherit] bg-background">
          <ShaderSky
            className="absolute inset-0"
            speed={props.speed}
            coverage={props.coverage}
            intensity={props.intensity}
            amount={props.amount}
            scale={props.scale}
            variation={props.variation}
            interactive={props.interactive}
            glass={props.glass}
            glassSize={props.glassSize}
            colors={props.colors}
          />
          {props.overlay ? (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--background)_0%,transparent_62%)] opacity-20 dark:opacity-35"
              />
              <div className="relative z-10 flex size-full flex-col items-center justify-center px-8 text-center">
                <p className="text-xs font-medium tracking-[0.2em] text-foreground/55 uppercase">
                  Weather
                </p>
                <h3 className="mt-3 max-w-lg text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
                  The sky is the theme
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-foreground/70">
                  Clear blue in light. Storm gray in dark. Optional window
                  glass.
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
        component="ShaderSky"
        snippetProps={{
          speed: props.speed,
          coverage: props.coverage,
          intensity: props.intensity,
          amount: props.amount,
          scale: props.scale,
          variation: props.variation,
          interactive: props.interactive ? true : undefined,
          glass: props.glass ? true : undefined,
          glassSize: props.glass ? props.glassSize : undefined,
          colors: props.colors,
        }}
      >
        <ControlColors
          label="Palette"
          colors={props.colors}
          palettes={SKY_PALETTES}
          onChange={(colors) => updateProp("colors", colors)}
        />
        <ControlSlider
          label="Amount"
          value={props.amount}
          min={0.1}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("amount", v)}
        />
        <ControlSlider
          label="Size"
          value={props.scale}
          min={0.15}
          max={0.9}
          step={0.05}
          onChange={(v) => updateProp("scale", v)}
        />
        <ControlSlider
          label="Mix"
          value={props.variation}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("variation", v)}
        />
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={0.02}
          max={0.4}
          step={0.02}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSlider
          label="Coverage"
          value={props.coverage}
          min={0.15}
          max={0.9}
          step={0.05}
          onChange={(v) => updateProp("coverage", v)}
        />
        <ControlSlider
          label="Intensity"
          value={props.intensity}
          min={0.35}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("intensity", v)}
        />
        <ControlSwitch
          label="Copy"
          description="Headline over the sky"
          checked={props.overlay}
          onChange={(v) => updateProp("overlay", v)}
        />
        <ControlSwitch
          label="Interactive"
          description="Clouds follow the pointer"
          checked={props.interactive}
          onChange={(v) => updateProp("interactive", v)}
        />
        <ControlSwitch
          label="Glass"
          description="Window film over the sky"
          checked={props.glass}
          onChange={(v) => updateProp("glass", v)}
        />
        <ControlSlider
          label="Glass size"
          value={props.glassSize}
          min={3}
          max={16}
          step={1}
          onChange={(v) => updateProp("glassSize", v)}
        />
      </ComponentControls>
    </>
  )
}
