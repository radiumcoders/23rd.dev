"use client"

import { useMemo, useState } from "react"

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
  DEFAULT_COLOR,
  DEFAULT_DURATION,
  DEFAULT_PARTICLE_RATIO,
  DEFAULT_RADIUS,
  DEFAULT_TENTACLE_COUNT,
  LogoBurst,
} from "@/registry/logo-burst/logo-burst"

const STAGE = "#050506"

export function LogoBurstDemo() {
  const defaults = useMemo(
    () => ({
      tentacleCount: DEFAULT_TENTACLE_COUNT,
      color: DEFAULT_COLOR,
      radius: DEFAULT_RADIUS,
      duration: DEFAULT_DURATION,
      particleRatio: DEFAULT_PARTICLE_RATIO,
      replayOnClick: true,
    }),
    []
  )

  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(defaults)
  const [replayKey, setReplayKey] = useState(0)

  return (
    <>
      <ComponentPreview
        title="Logo Burst"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div
          className="relative h-[56svh] w-full"
          style={{ backgroundColor: STAGE }}
        >
          <LogoBurst
            tentacleCount={props.tentacleCount}
            color={props.color}
            radius={props.radius}
            duration={props.duration}
            particleRatio={props.particleRatio}
            replayOnClick={props.replayOnClick}
            replayKey={replayKey}
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="LogoBurst"
        snippetProps={{
          tentacleCount:
            props.tentacleCount === DEFAULT_TENTACLE_COUNT
              ? undefined
              : props.tentacleCount,
          color: props.color === DEFAULT_COLOR ? undefined : props.color,
          radius: props.radius === DEFAULT_RADIUS ? undefined : props.radius,
          duration:
            props.duration === DEFAULT_DURATION ? undefined : props.duration,
          particleRatio:
            props.particleRatio === DEFAULT_PARTICLE_RATIO
              ? undefined
              : props.particleRatio,
          replayOnClick: props.replayOnClick ? undefined : false,
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-foreground/90">Burst</span>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => setReplayKey((key) => key + 1)}
          >
            Replay
          </Button>
        </div>
        <ControlColor
          label="Filament"
          value={props.color}
          onChange={(v) => updateProp("color", v)}
        />
        <ControlSlider
          label="Tentacles"
          value={props.tentacleCount}
          min={60}
          max={520}
          step={10}
          onChange={(v) => updateProp("tentacleCount", v)}
        />
        <ControlSlider
          label="Radius"
          value={props.radius}
          min={0.28}
          max={0.72}
          step={0.02}
          onChange={(v) => updateProp("radius", v)}
        />
        <ControlSlider
          label="Duration"
          value={props.duration}
          min={0.4}
          max={2.8}
          step={0.05}
          onChange={(v) => updateProp("duration", v)}
        />
        <ControlSlider
          label="Particles"
          value={props.particleRatio}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("particleRatio", v)}
        />
        <ControlSwitch
          label="Replay on click"
          description="Click the mark to explode again"
          checked={props.replayOnClick}
          onChange={(v) => updateProp("replayOnClick", v)}
        />
      </ComponentControls>
    </>
  )
}
