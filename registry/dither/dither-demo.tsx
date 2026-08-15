"use client"

import { Button } from "@/components/ui/button"
import {
  ComponentControls,
  ControlColor,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  Dither,
  type DitherVariant,
} from "@/registry/dither/dither"
import { cn } from "@/lib/utils"

const VARIANTS: { value: DitherVariant; label: string }[] = [
  { value: "still", label: "Still" },
  { value: "fire", label: "Fire" },
  { value: "wind", label: "Wind" },
]

const DEFAULTS = {
  variant: "still" as DitherVariant,
  pixelSize: 3,
  speed: 1,
  intensity: 0.55,
  animate: true,
  color: "#18181B",
  backgroundColor: "#FAFAFA",
}

export function DitherDemo() {
  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(DEFAULTS)

  return (
    <>
      <ComponentPreview
        title="Dither"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[56svh] w-full overflow-hidden rounded-[inherit] bg-background">
          <Dither
            className="absolute inset-0"
            variant={props.variant}
            pixelSize={props.pixelSize}
            speed={props.speed}
            intensity={props.intensity}
            animate={props.animate}
            color={props.color}
            backgroundColor={props.backgroundColor}
          />
          <div className="relative z-10 flex size-full items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                {props.variant}
              </p>
              <h3 className="mt-2 text-xl font-medium tracking-tight text-foreground">
                Retro 1-bit wash
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Ordered Bayer dither in ink and paper. Sparse enough to sit
                behind UI.
              </p>
            </div>
          </div>
        </div>
      </ComponentPreview>

      <ComponentControls hasChanges={hasChanges} onReset={resetProps}>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground/90">Variant</span>
          <div className="flex flex-wrap gap-1.5">
            {VARIANTS.map((v) => (
              <Button
                key={v.value}
                type="button"
                size="xs"
                variant={props.variant === v.value ? "default" : "outline"}
                className={cn(props.variant === v.value && "pointer-events-none")}
                onClick={() => updateProp("variant", v.value)}
              >
                {v.label}
              </Button>
            ))}
          </div>
        </div>
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
          label="Pixel size"
          value={props.pixelSize}
          min={1}
          max={8}
          step={1}
          onChange={(v) => updateProp("pixelSize", v)}
        />
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={0.2}
          max={2.5}
          step={0.1}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSlider
          label="Intensity"
          value={props.intensity}
          min={0.15}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("intensity", v)}
        />
        <ControlSwitch
          label="Animate"
          description="Keep the field drifting"
          checked={props.animate}
          onChange={(v) => updateProp("animate", v)}
        />
      </ComponentControls>
    </>
  )
}
