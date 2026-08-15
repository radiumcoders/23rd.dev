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
import { ShaderGradient } from "@/registry/shader-gradient/shader-gradient"

const DEFAULTS = {
  speed: 0.14,
  blur: 0.7,
  intensity: 0.95,
  interactive: true,
  colors: ["#7CB4E0", "#B4D8C4", "#EFE4BC", "#D2D7EC"],
}

export function ShaderGradientDemo() {
  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(DEFAULTS)

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
            colors={props.colors}
          />
          <div className="relative z-10 flex size-full flex-col items-center justify-center px-8 text-center">
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Atmosphere
            </p>
            <h3 className="mt-3 max-w-md text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              Soft wash behind the work
            </h3>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Sit a landing hero, empty state, or wait screen on a theme-aware
              field. Copy stays readable; the shader stays in the back.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button type="button">Start shipping</Button>
              <Button type="button" variant="outline">
                See the API
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
