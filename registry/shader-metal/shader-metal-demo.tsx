"use client"

import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  ComponentControls,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  DEFAULT_IRIDESCENCE,
  DEFAULT_METAL,
  DEFAULT_RIBBONS,
  DEFAULT_SPEED,
  METALS,
  ShaderMetal,
  type ShaderMetalMetal,
} from "@/registry/shader-metal/shader-metal"

const METAL_OPTIONS: { id: ShaderMetalMetal; label: string }[] = [
  { id: "chrome", label: "Chrome" },
  { id: "gold", label: "Gold" },
  { id: "copper", label: "Copper" },
  { id: "graphite", label: "Graphite" },
]

export function ShaderMetalDemo() {
  const defaults = useMemo(
    () => ({
      metal: DEFAULT_METAL,
      ribbons: DEFAULT_RIBBONS,
      speed: DEFAULT_SPEED,
      iridescence: DEFAULT_IRIDESCENCE,
      interactive: true,
      overlay: true,
    }),
    []
  )

  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(defaults)

  return (
    <>
      <ComponentPreview
        title="Landing hero"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[56svh] w-full overflow-hidden rounded-[inherit] bg-background">
          <ShaderMetal
            metal={props.metal}
            ribbons={props.ribbons}
            speed={props.speed}
            iridescence={props.iridescence}
            interactive={props.interactive}
          />
          {props.overlay ? (
            <div className="relative z-10 flex size-full flex-col items-start justify-start p-8 text-left sm:p-10">
              <p className="text-xs font-medium tracking-[0.2em] text-foreground/55 uppercase">
                Cast in {props.metal}
              </p>
              <h3 className="mt-3 max-w-sm text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
                Polished until it reflects the room
              </h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-foreground/70">
                Move the pointer: the key light follows it and the ribbons lean
                in.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
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
          ) : null}
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="ShaderMetal"
        snippetProps={{
          metal: props.metal === DEFAULT_METAL ? undefined : props.metal,
          ribbons:
            props.ribbons === DEFAULT_RIBBONS ? undefined : props.ribbons,
          speed: props.speed === DEFAULT_SPEED ? undefined : props.speed,
          iridescence:
            props.iridescence === DEFAULT_IRIDESCENCE
              ? undefined
              : props.iridescence,
          interactive: props.interactive ? undefined : false,
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-foreground/85">Metal</span>
          <div className="flex flex-wrap gap-1">
            {METAL_OPTIONS.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="xs"
                variant={props.metal === item.id ? "default" : "outline"}
                aria-pressed={props.metal === item.id}
                onClick={() => updateProp("metal", item.id)}
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-full ring-1 ring-foreground/20"
                  style={{ backgroundColor: METALS[item.id] }}
                />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        <ControlSlider
          label="Ribbons"
          value={props.ribbons}
          min={1}
          max={5}
          step={1}
          onChange={(v) => updateProp("ribbons", v)}
        />
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={0.05}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSlider
          label="Iridescence"
          value={props.iridescence}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("iridescence", v)}
        />
        <ControlSwitch
          label="Copy"
          description="Headline over the ribbons"
          checked={props.overlay}
          onChange={(v) => updateProp("overlay", v)}
        />
        <ControlSwitch
          label="Interactive"
          description="Key light follows the pointer"
          checked={props.interactive}
          onChange={(v) => updateProp("interactive", v)}
        />
      </ComponentControls>
    </>
  )
}
