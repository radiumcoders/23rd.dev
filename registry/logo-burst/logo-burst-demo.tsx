"use client"

import { useLayoutEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  ComponentControls,
  ControlColor,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { useHydratedTheme } from "@/hooks/use-hydrated-theme"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  DARK_COLOR,
  DEFAULT_DURATION,
  DEFAULT_PARTICLE_RATIO,
  DEFAULT_RADIUS,
  DEFAULT_TENTACLE_COUNT,
  LIGHT_COLOR,
  LogoBurst,
} from "@/registry/logo-burst/logo-burst"

function norm(hex: string) {
  return hex.trim().toUpperCase()
}

function isStockColor(color: string) {
  return norm(color) === norm(LIGHT_COLOR) || norm(color) === norm(DARK_COLOR)
}

export function LogoBurstDemo() {
  const theme = useHydratedTheme()
  const stock = theme === "dark" ? DARK_COLOR : LIGHT_COLOR

  const defaults = useMemo(
    () => ({
      tentacleCount: DEFAULT_TENTACLE_COUNT,
      color: stock,
      radius: DEFAULT_RADIUS,
      duration: DEFAULT_DURATION,
      particleRatio: DEFAULT_PARTICLE_RATIO,
      replayOnClick: true,
      breathe: true,
    }),
    [stock]
  )

  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)

  useLayoutEffect(() => {
    setProps((prev) => {
      if (!isStockColor(prev.color)) return prev
      if (norm(prev.color) === norm(stock)) return prev
      return { ...prev, color: stock }
    })
  }, [setProps, stock])

  const [replayKey, setReplayKey] = useState(0)
  const useAutoColor = isStockColor(props.color)

  return (
    <>
      <ComponentPreview
        title="Logo Burst"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[56svh] w-full bg-background">
          <LogoBurst
            tentacleCount={props.tentacleCount}
            color={useAutoColor ? undefined : props.color}
            radius={props.radius}
            duration={props.duration}
            particleRatio={props.particleRatio}
            replayOnClick={props.replayOnClick}
            breathe={props.breathe}
            replayKey={replayKey}
            theme="auto"
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
          color: useAutoColor ? undefined : props.color,
          radius: props.radius === DEFAULT_RADIUS ? undefined : props.radius,
          duration:
            props.duration === DEFAULT_DURATION ? undefined : props.duration,
          particleRatio:
            props.particleRatio === DEFAULT_PARTICLE_RATIO
              ? undefined
              : props.particleRatio,
          replayOnClick: props.replayOnClick ? undefined : false,
          breathe: props.breathe ? undefined : false,
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
          label="Breathe"
          description="Slow inhale after the burst"
          checked={props.breathe}
          onChange={(v) => updateProp("breathe", v)}
        />
        <ControlSwitch
          label="Replay on click"
          description="Click the field to explode again"
          checked={props.replayOnClick}
          onChange={(v) => updateProp("replayOnClick", v)}
        />
      </ComponentControls>
    </>
  )
}
