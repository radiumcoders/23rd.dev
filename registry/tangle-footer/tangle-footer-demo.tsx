"use client"

import { useMemo } from "react"

import {
  ComponentControls,
  ControlSlider,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  DEFAULT_SEED,
  DEFAULT_VINES,
  TangleFooter,
} from "@/registry/tangle-footer/tangle-footer"

/** Where the Thickness slider sits while the footer picks its own width. */
const AUTO_THICKNESS = 2.5

export function TangleFooterDemo() {
  const defaults = useMemo(
    () => ({
      height: 320,
      vines: DEFAULT_VINES,
      thickness: AUTO_THICKNESS,
      seed: DEFAULT_SEED,
    }),
    []
  )

  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(defaults)

  const thickness =
    props.thickness === AUTO_THICKNESS ? undefined : props.thickness

  return (
    <>
      <ComponentPreview
        title="Tangle Footer"
        stageClassName="min-h-0 overflow-hidden p-0"
        align="start"
      >
        <div className="flex h-[56svh] w-full flex-col justify-end overflow-hidden rounded-[inherit] bg-background text-foreground">
          <TangleFooter
            height={props.height}
            vines={props.vines}
            thickness={thickness}
            seed={props.seed}
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="TangleFooter"
        snippetProps={{
          height: props.height === 320 ? undefined : props.height,
          vines: props.vines === DEFAULT_VINES ? undefined : props.vines,
          thickness,
          seed: props.seed === DEFAULT_SEED ? undefined : props.seed,
        }}
      >
        <ControlSlider
          label="Height"
          value={props.height}
          min={160}
          max={480}
          step={10}
          onChange={(v) => updateProp("height", v)}
        />
        <ControlSlider
          label="Vines"
          value={props.vines}
          min={1}
          max={8}
          step={1}
          onChange={(v) => updateProp("vines", v)}
        />
        <ControlSlider
          label="Thickness"
          value={props.thickness}
          min={1}
          max={6}
          step={0.25}
          onChange={(v) => updateProp("thickness", v)}
        />
        <ControlSlider
          label="Seed"
          value={props.seed}
          min={1}
          max={100}
          step={1}
          onChange={(v) => updateProp("seed", v)}
        />
      </ComponentControls>
    </>
  )
}
