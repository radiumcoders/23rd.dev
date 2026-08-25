"use client"

import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  ComponentControls,
  ControlColor,
  ControlColors,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  CUSTOM_DEFAULT,
  LiveOrb,
  WEBGL_COLORS,
  type LiveOrbVariant,
} from "@/registry/live-orb/live-orb"

const VARIANTS: { id: LiveOrbVariant; label: string }[] = [
  { id: "white", label: "White" },
  { id: "black", label: "Black" },
  { id: "webgl", label: "WebGL" },
  { id: "custom", label: "Custom" },
]

function norm(hex: string) {
  return hex.trim().toUpperCase()
}

function colorsEqual(a: string[], b: string[]) {
  return (
    a.length === b.length && a.every((color, i) => norm(color) === norm(b[i]!))
  )
}

function hexLum(hex: string) {
  const h = hex.replace("#", "").trim()
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.padEnd(6, "0").slice(0, 6)
  const n = Number.parseInt(full, 16)
  if (Number.isNaN(n)) return 1
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function stageBackground(variant: LiveOrbVariant, color: string) {
  if (variant === "black") return "#E4E4E7"
  if (variant === "custom") return hexLum(color) > 0.55 ? "#0A0A0B" : "#E4E4E7"
  return "#0A0A0B"
}

export function LiveOrbDemo() {
  const defaults = useMemo(
    () => ({
      variant: "white" as LiveOrbVariant,
      size: 280,
      interactive: true,
      blink: true,
      color: CUSTOM_DEFAULT.color as string,
      eyeColor: CUSTOM_DEFAULT.eyeColor as string,
      colors: WEBGL_COLORS,
    }),
    []
  )

  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(defaults)

  const stage = stageBackground(props.variant, props.color)

  return (
    <>
      <ComponentPreview
        title="Live Orb"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div
          className="flex h-[56svh] w-full items-center justify-center transition-colors duration-300"
          style={{ backgroundColor: stage }}
        >
          <LiveOrb
            size={props.size}
            variant={props.variant}
            interactive={props.interactive}
            blink={props.blink}
            color={props.variant === "custom" ? props.color : undefined}
            eyeColor={props.variant === "custom" ? props.eyeColor : undefined}
            colors={
              props.variant === "webgl" &&
              !colorsEqual(props.colors, WEBGL_COLORS)
                ? props.colors
                : undefined
            }
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="LiveOrb"
        snippetProps={{
          variant: props.variant === "white" ? undefined : props.variant,
          size: props.size === 280 ? undefined : props.size,
          interactive: props.interactive ? undefined : false,
          blink: props.blink ? undefined : false,
          color: props.variant === "custom" ? props.color : undefined,
          eyeColor: props.variant === "custom" ? props.eyeColor : undefined,
          colors:
            props.variant === "webgl" &&
            !colorsEqual(props.colors, WEBGL_COLORS)
              ? props.colors
              : undefined,
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-foreground/90">
            Variant
          </span>
          <div className="flex flex-wrap gap-1">
            {VARIANTS.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="xs"
                variant={props.variant === item.id ? "default" : "outline"}
                aria-pressed={props.variant === item.id}
                onClick={() => updateProp("variant", item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        {props.variant === "custom" ? (
          <>
            <ControlColor
              label="Orb"
              value={props.color}
              onChange={(v) => updateProp("color", v)}
            />
            <ControlColor
              label="Eyes"
              value={props.eyeColor}
              onChange={(v) => updateProp("eyeColor", v)}
            />
          </>
        ) : null}
        {props.variant === "webgl" ? (
          <ControlColors
            label="Wash"
            colors={props.colors}
            palettes={[
              WEBGL_COLORS,
              ["#3A6FA0", "#2F6B52", "#8A6B32"],
              ["#A33A18", "#D4682A", "#E8B45A"],
              ["#1D4E89", "#81C3D7", "#D9E8F5"],
            ]}
            onChange={(colors) => updateProp("colors", colors)}
          />
        ) : null}
        <ControlSlider
          label="Size"
          value={props.size}
          min={160}
          max={420}
          step={10}
          onChange={(v) => updateProp("size", v)}
        />
        <ControlSwitch
          label="Interactive"
          description="Eyes follow the pointer"
          checked={props.interactive}
          onChange={(v) => updateProp("interactive", v)}
        />
        <ControlSwitch
          label="Blink"
          description="Occasional blink"
          checked={props.blink}
          onChange={(v) => updateProp("blink", v)}
        />
      </ComponentControls>
    </>
  )
}
