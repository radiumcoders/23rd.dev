"use client"

import { useState } from "react"
import { RiRestartLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  ComponentControls,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import { MechKeyboard } from "@/registry/mech-keyboard/mech-keyboard"

const HINT = ["MetaLeft", "KeyK"]

const DEFAULTS = {
  x: 0,
  y: 0,
  scale: 1,
  monochrome: false,
  recorder: true,
  hint: false,
  sound: false,
  interactive: true,
}

const px = (v: number) => `${v}px`

export function MechKeyboardDemo() {
  const [take, setTake] = useState(0)
  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(DEFAULTS)

  const changed = <K extends keyof typeof DEFAULTS>(key: K) =>
    props[key] === DEFAULTS[key] ? undefined : props[key]

  return (
    <>
      <ComponentPreview
        title="Mechanical keyboard"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[var(--preview-h,56svh)] w-full overflow-hidden rounded-[inherit] bg-background">
          <MechKeyboard
            key={take}
            x={props.x}
            y={props.y}
            scale={props.scale}
            monochrome={props.monochrome}
            recorder={props.recorder}
            highlight={props.hint ? HINT : undefined}
            sound={props.sound}
            interactive={props.interactive}
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="MechKeyboard"
        snippetProps={{
          x: changed("x"),
          y: changed("y"),
          scale: changed("scale"),
          monochrome: props.monochrome ? true : undefined,
          recorder: props.recorder ? undefined : false,
          highlight: props.hint ? HINT : undefined,
          sound: props.sound ? true : undefined,
          interactive: props.interactive ? undefined : false,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-foreground/85">Intro</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setTake((n) => n + 1)}
            className="-me-1.5 rounded-md text-muted-foreground"
          >
            <RiRestartLine data-icon="inline-start" />
            Replay
          </Button>
        </div>
        <ControlSlider
          label="X"
          value={props.x}
          min={-400}
          max={400}
          step={5}
          format={px}
          onChange={(v) => updateProp("x", v)}
        />
        <ControlSlider
          label="Y"
          value={props.y}
          min={-300}
          max={300}
          step={5}
          format={px}
          onChange={(v) => updateProp("y", v)}
        />
        <ControlSlider
          label="Scale"
          value={props.scale}
          min={0.4}
          max={1.6}
          step={0.05}
          onChange={(v) => updateProp("scale", v)}
        />
        <ControlSwitch
          label="Monochrome"
          description="Ink and greys, no color"
          checked={props.monochrome}
          onChange={(v) => updateProp("monochrome", v)}
        />
        <ControlSwitch
          label="Recorder"
          description="Spell out the shortcut being pressed"
          checked={props.recorder}
          onChange={(v) => updateProp("recorder", v)}
        />
        <ControlSwitch
          label="Hint"
          description="Pulse the keys of ⌘ K"
          checked={props.hint}
          onChange={(v) => updateProp("hint", v)}
        />
        <ControlSwitch
          label="Interactive"
          description="Your keyboard and clicks press the keys"
          checked={props.interactive}
          onChange={(v) => updateProp("interactive", v)}
        />
        <ControlSwitch
          label="Sound"
          description="Synthesized switch thock"
          checked={props.sound}
          onChange={(v) => updateProp("sound", v)}
        />
      </ComponentControls>
    </>
  )
}
