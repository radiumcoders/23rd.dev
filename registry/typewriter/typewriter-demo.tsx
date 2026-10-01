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
import { cn } from "@/lib/utils"
import {
  DEFAULT_COLOR,
  DEFAULT_COLUMNS,
  DEFAULT_JITTER,
  DEFAULT_SPEED,
  DEFAULT_TEXT,
  Typewriter,
} from "@/registry/typewriter/typewriter"

const ENAMELS = [
  { name: "Mint", color: DEFAULT_COLOR },
  { name: "Cherry", color: "#D2463A" },
  { name: "Butter", color: "#E6D6A2" },
  { name: "Sky", color: "#86AED8" },
  { name: "Graphite", color: "#2E3135" },
]

const DEFAULTS = {
  color: DEFAULT_COLOR,
  text: DEFAULT_TEXT,
  speed: DEFAULT_SPEED,
  jitter: DEFAULT_JITTER,
  columns: DEFAULT_COLUMNS,
  humanize: true,
  loop: true,
  sound: false,
  interactive: true,
}

export function TypewriterDemo() {
  const textId = useId()
  const colorId = useId()
  const [take, setTake] = useState(0)
  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(DEFAULTS)

  return (
    <>
      <ComponentPreview title="Typewriter" stageClassName="min-h-0 p-0">
        <div className="relative aspect-[16/9] max-h-[70svh] w-full px-4 pt-2 pb-4">
          <Typewriter
            key={take}
            color={props.color}
            text={props.text}
            speed={props.speed}
            jitter={props.jitter}
            columns={props.columns}
            humanize={props.humanize}
            loop={props.loop}
            sound={props.sound}
            interactive={props.interactive}
            label="23rd"
          />
          {props.interactive ? (
            <p className="pointer-events-none absolute bottom-3 left-4 text-xs text-muted-foreground">
              Click it and type
            </p>
          ) : null}
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="Typewriter"
        snippetProps={{
          color: props.color === DEFAULTS.color ? undefined : props.color,
          text: props.text === DEFAULTS.text ? undefined : props.text,
          speed: props.speed,
          jitter: props.jitter,
          columns:
            props.columns === DEFAULTS.columns ? undefined : props.columns,
          humanize: props.humanize ? undefined : false,
          loop: props.loop ? undefined : false,
          sound: props.sound ? true : undefined,
          interactive: props.interactive ? undefined : false,
          label: "23rd",
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
        <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="text-sm text-foreground/85">Enamel</span>
          <div className="flex items-center gap-1.5">
            {ENAMELS.map((enamel) => {
              const selected =
                enamel.color.toLowerCase() === props.color.toLowerCase()
              return (
                <button
                  key={enamel.name}
                  type="button"
                  aria-label={enamel.name}
                  aria-pressed={selected}
                  title={enamel.name}
                  onClick={() => updateProp("color", enamel.color)}
                  className={cn(
                    "size-6 rounded-full ring-1 transition-[box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                      : "ring-border hover:ring-foreground/30"
                  )}
                  style={{ backgroundColor: enamel.color }}
                />
              )
            })}
            <label
              htmlFor={colorId}
              className="relative ms-1 size-6 cursor-pointer overflow-hidden rounded-full ring-1 ring-border focus-within:ring-2 focus-within:ring-ring hover:ring-foreground/30"
              style={{
                background:
                  "conic-gradient(#e44 0deg, #ec4 72deg, #4c8 144deg, #48e 216deg, #a4e 288deg, #e44 360deg)",
              }}
            >
              <span className="sr-only">Custom enamel</span>
              <input
                id={colorId}
                type="color"
                value={props.color}
                onChange={(event) =>
                  updateProp("color", event.target.value.toUpperCase())
                }
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={4}
          max={30}
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
          min={16}
          max={60}
          step={1}
          onChange={(v) => updateProp("columns", v)}
        />
        <ControlSwitch
          label="Humanize"
          description="Uneven keys, rests after punctuation"
          checked={props.humanize}
          onChange={(v) => updateProp("humanize", v)}
        />
        <ControlSwitch
          label="Loop"
          description="Pull the sheet out and type it again"
          checked={props.loop}
          onChange={(v) => updateProp("loop", v)}
        />
        <ControlSwitch
          label="Interactive"
          description="Type on it, or click its keys"
          checked={props.interactive}
          onChange={(v) => updateProp("interactive", v)}
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
