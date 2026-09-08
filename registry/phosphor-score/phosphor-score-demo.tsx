"use client"

import {
  ComponentControls,
  ControlColor,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  DEFAULT_COLOR,
  DEFAULT_DENSITY,
  DEFAULT_ROTATE_X,
  DEFAULT_ROTATE_Y,
  DEFAULT_ROTATE_Z,
  DEFAULT_SPEED,
  PhosphorScore,
} from "@/registry/phosphor-score/phosphor-score"

const DEFAULTS = {
  color: DEFAULT_COLOR,
  rotateX: DEFAULT_ROTATE_X,
  rotateY: DEFAULT_ROTATE_Y,
  rotateZ: DEFAULT_ROTATE_Z,
  speed: DEFAULT_SPEED,
  density: DEFAULT_DENSITY,
  sway: true,
}

export function PhosphorScoreDemo() {
  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(DEFAULTS)

  return (
    <>
      <ComponentPreview
        title="Phosphor Score"
        stageClassName="min-h-0 overflow-hidden bg-black p-0"
      >
        <div className="relative h-[56svh] w-full bg-black">
          <PhosphorScore
            color={props.color}
            rotateX={props.rotateX}
            rotateY={props.rotateY}
            rotateZ={props.rotateZ}
            speed={props.speed}
            density={props.density}
            sway={props.sway}
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="PhosphorScore"
        snippetProps={{
          color: props.color === DEFAULT_COLOR ? undefined : props.color,
          rotateX:
            props.rotateX === DEFAULT_ROTATE_X ? undefined : props.rotateX,
          rotateY:
            props.rotateY === DEFAULT_ROTATE_Y ? undefined : props.rotateY,
          rotateZ:
            props.rotateZ === DEFAULT_ROTATE_Z ? undefined : props.rotateZ,
          speed: props.speed === DEFAULT_SPEED ? undefined : props.speed,
          density:
            props.density === DEFAULT_DENSITY ? undefined : props.density,
          sway: props.sway ? undefined : false,
        }}
      >
        <ControlColor
          label="Phosphor"
          value={props.color}
          onChange={(v) => updateProp("color", v)}
        />
        <ControlSlider
          label="Rotate X"
          value={props.rotateX}
          min={-40}
          max={40}
          step={1}
          onChange={(v) => updateProp("rotateX", v)}
        />
        <ControlSlider
          label="Rotate Y"
          value={props.rotateY}
          min={-40}
          max={40}
          step={1}
          onChange={(v) => updateProp("rotateY", v)}
        />
        <ControlSlider
          label="Rotate Z"
          value={props.rotateZ}
          min={-40}
          max={40}
          step={1}
          onChange={(v) => updateProp("rotateZ", v)}
        />
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={0.3}
          max={3}
          step={0.05}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSlider
          label="Density"
          value={props.density}
          min={0.4}
          max={1.8}
          step={0.05}
          onChange={(v) => updateProp("density", v)}
        />
        <ControlSwitch
          label="Sway"
          description="Slow camera drift around the plane"
          checked={props.sway}
          onChange={(v) => updateProp("sway", v)}
        />
      </ComponentControls>
    </>
  )
}
