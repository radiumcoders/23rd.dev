"use client"

import { useId, useState } from "react"
import { RiRestartLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  ComponentControls,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  DEFAULT_JITTER,
  DEFAULT_SPEED,
  DEFAULT_TEXT,
  Typewriter,
} from "@/registry/typewriter/typewriter"

const DEFAULTS = {
  text: DEFAULT_TEXT,
  speed: DEFAULT_SPEED,
  jitter: DEFAULT_JITTER,
  columns: 0,
  humanize: true,
  ticks: true,
  loop: true,
  sound: false,
}

export function TypewriterDemo() {
  const textId = useId()
  const [take, setTake] = useState(0)
  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(DEFAULTS)

  return (
    <>
      <ComponentPreview title="Typewriter" stageClassName="min-h-0 p-0">
        <div className="h-[46svh] min-h-80 w-full">
          <Typewriter
            key={take}
            text={props.text}
            speed={props.speed}
            jitter={props.jitter}
            columns={props.columns}
            humanize={props.humanize}
            ticks={props.ticks}
            loop={props.loop}
            sound={props.sound}
            className="text-[15px] sm:text-lg"
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="Typewriter"
        snippetProps={{
          text: props.text === DEFAULTS.text ? undefined : props.text,
          speed: props.speed,
          jitter: props.jitter,
          columns: props.columns || undefined,
          humanize: props.humanize ? undefined : false,
          ticks: props.ticks ? undefined : false,
          loop: props.loop ? undefined : false,
          sound: props.sound ? true : undefined,
        }}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={textId} className="text-sm text-foreground/85">
              Text
            </label>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setTake((n) => n + 1)}
              className="-me-1.5 rounded-md text-muted-foreground"
            >
              <RiRestartLine data-icon="inline-start" />
              Type again
            </Button>
          </div>
          <textarea
            id={textId}
            value={props.text}
            rows={3}
            spellCheck={false}
            onChange={(event) => updateProp("text", event.target.value)}
            className="field-sizing-content min-h-16 w-full resize-none bg-transparent font-mono text-[12.5px] leading-relaxed text-foreground outline-none"
          />
        </div>
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={4}
          max={40}
          step={1}
          format={(v) => `${v} / s`}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSlider
          label="Jitter"
          value={props.jitter}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("jitter", v)}
        />
        <ControlSlider
          label="Columns"
          value={props.columns}
          min={0}
          max={72}
          step={1}
          format={(v) => (v === 0 ? "fit" : String(v))}
          onChange={(v) => updateProp("columns", v)}
        />
        <ControlSwitch
          label="Humanize"
          description="Uneven keys, rests after punctuation"
          checked={props.humanize}
          onChange={(v) => updateProp("humanize", v)}
        />
        <ControlSwitch
          label="Ticks"
          description="Scale marks along the rail"
          checked={props.ticks}
          onChange={(v) => updateProp("ticks", v)}
        />
        <ControlSwitch
          label="Loop"
          description="Feed the page out and type it again"
          checked={props.loop}
          onChange={(v) => updateProp("loop", v)}
        />
        <ControlSwitch
          label="Sound"
          description="Key clicks, bell, and return"
          checked={props.sound}
          onChange={(v) => updateProp("sound", v)}
        />
      </ComponentControls>
    </>
  )
}
