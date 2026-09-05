"use client"

import { useLayoutEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  AsciiLogo,
  MAX_TEXT_WORDS,
  clampAsciiLogoText,
  type AsciiLogoPhase,
} from "@/registry/ascii-logo/ascii-logo"

const LIGHT = { color: "#3F3F46", backgroundColor: "#FAFAFA" }
const DARK = { color: "#A1A1AA", backgroundColor: "#09090B" }

type ThemePalette = { color: string; backgroundColor: string }
type SourceMode = "text" | "mark"

const HINT: Record<AsciiLogoPhase, string> = {
  logo: "Move around it · click to scatter",
  scattered: "Click to drop",
  fallen: "Click to gather",
  returning: "Gathering…",
}

function norm(hex: string) {
  return hex.trim().toUpperCase()
}

function matchesPalette(
  color: string,
  backgroundColor: string,
  palette: ThemePalette
) {
  return (
    norm(color) === norm(palette.color) &&
    norm(backgroundColor) === norm(palette.backgroundColor)
  )
}

function isStockThemePalette(color: string, backgroundColor: string) {
  return (
    matchesPalette(color, backgroundColor, LIGHT) ||
    matchesPalette(color, backgroundColor, DARK)
  )
}

export function AsciiLogoDemo() {
  const theme = useHydratedTheme()
  const palette: ThemePalette = theme === "dark" ? DARK : LIGHT
  const [phase, setPhase] = useState<AsciiLogoPhase>("logo")
  const [source, setSource] = useState<SourceMode>("text")

  const defaults = useMemo(
    () => ({
      text: "23rd",
      cellSize: 11,
      hoverPush: 2.6,
      gravity: 0.14,
      bounce: 0.28,
      interactive: true,
      color: palette.color,
      backgroundColor: palette.backgroundColor,
    }),
    [palette.color, palette.backgroundColor]
  )

  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)

  useLayoutEffect(() => {
    setProps((prev) => {
      if (!isStockThemePalette(prev.color, prev.backgroundColor)) return prev
      if (matchesPalette(prev.color, prev.backgroundColor, palette)) return prev
      return {
        ...prev,
        color: palette.color,
        backgroundColor: palette.backgroundColor,
      }
    })
  }, [palette, setProps])

  const useAutoTheme = isStockThemePalette(props.color, props.backgroundColor)

  return (
    <>
      <ComponentPreview
        title="ASCII Logo"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[56svh] w-full overflow-hidden rounded-[inherit] bg-background">
          <AsciiLogo
            className="absolute inset-0"
            text={props.text}
            src={source === "mark" ? "/logo.svg" : undefined}
            cellSize={props.cellSize}
            hoverPush={props.hoverPush}
            gravity={props.gravity}
            bounce={props.bounce}
            interactive={props.interactive}
            color={useAutoTheme ? undefined : props.color}
            backgroundColor={useAutoTheme ? undefined : props.backgroundColor}
            theme="auto"
            onPhaseChange={setPhase}
          />
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-muted-foreground">
            {props.interactive ? HINT[phase] : "Interaction off"}
          </p>
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges || source !== "text"}
        onReset={() => {
          setSource("text")
          resetProps()
        }}
        component="AsciiLogo"
        snippetProps={{
          text:
            source === "text" && props.text !== "23rd" ? props.text : undefined,
          src: source === "mark" ? "/logo.svg" : undefined,
          cellSize: props.cellSize,
          hoverPush: props.hoverPush,
          gravity: props.gravity,
          bounce: props.bounce,
          interactive: props.interactive ? undefined : false,
          color: useAutoTheme ? undefined : props.color,
          backgroundColor: useAutoTheme ? undefined : props.backgroundColor,
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-foreground/90">Source</span>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: "text", label: "Wordmark" },
                { id: "mark", label: "Mark" },
              ] as const
            ).map((item) => (
              <Button
                key={item.id}
                type="button"
                size="xs"
                variant={source === item.id ? "default" : "outline"}
                aria-pressed={source === item.id}
                onClick={() => setSource(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        {source === "text" ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="ascii-logo-text"
                className="text-sm font-medium text-foreground/90"
              >
                Text
              </label>
              <Input
                id="ascii-logo-text"
                value={props.text}
                aria-describedby="ascii-logo-text-hint"
                className="h-8 w-48"
                onChange={(event) =>
                  updateProp(
                    "text",
                    clampAsciiLogoText(event.currentTarget.value)
                  )
                }
              />
            </div>
            <p
              id="ascii-logo-text-hint"
              className="text-right text-xs text-muted-foreground"
            >
              Max {MAX_TEXT_WORDS} words
            </p>
          </div>
        ) : null}
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
          label="Cell size"
          value={props.cellSize}
          min={6}
          max={22}
          step={1}
          onChange={(v) => updateProp("cellSize", v)}
        />
        <ControlSlider
          label="Hover push"
          value={props.hoverPush}
          min={0.4}
          max={6}
          step={0.1}
          onChange={(v) => updateProp("hoverPush", v)}
        />
        <ControlSlider
          label="Gravity"
          value={props.gravity}
          min={0.04}
          max={0.4}
          step={0.01}
          onChange={(v) => updateProp("gravity", v)}
        />
        <ControlSlider
          label="Bounce"
          value={props.bounce}
          min={0.05}
          max={0.8}
          step={0.01}
          onChange={(v) => updateProp("bounce", v)}
        />
        <ControlSwitch
          label="Interactive"
          description="Hover shove and click cycle"
          checked={props.interactive}
          onChange={(v) => updateProp("interactive", v)}
        />
      </ComponentControls>
    </>
  )
}
