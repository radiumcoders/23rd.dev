"use client"

import { useEffect, useMemo } from "react"
import { useTheme } from "next-themes"

import {
  ComponentControls,
  ControlColor,
  ControlSlider,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import { cn } from "@/lib/utils"
import { TangleFooter } from "@/registry/tangle-footer/tangle-footer"

/** Matches TangleFooter theme defaults (uppercase for color inputs). */
const LIGHT = {
  ribbon: "#141414",
  textColor: "#F4F0E8",
  stage: "#EFEAE2",
}
const DARK = {
  ribbon: "#E8E4DC",
  textColor: "#161616",
  stage: "#121210",
}

type ThemePalette = typeof LIGHT

function norm(hex: string) {
  return hex.trim().toUpperCase()
}

function matchesPalette(
  ribbon: string,
  textColor: string,
  stage: string,
  palette: ThemePalette
) {
  return (
    norm(ribbon) === norm(palette.ribbon) &&
    norm(textColor) === norm(palette.textColor) &&
    norm(stage) === norm(palette.stage)
  )
}

/** True when colors are still one of the built-in theme triples. */
function isStockThemePalette(ribbon: string, textColor: string, stage: string) {
  return (
    matchesPalette(ribbon, textColor, stage, LIGHT) ||
    matchesPalette(ribbon, textColor, stage, DARK)
  )
}

const LINES = [
  "Ship something opinionated — less boilerplate, clearer decisions. ",
  "Knows what’s going on. Can you check in with them and see what’s next. ",
  "The new timeline should be ready by Friday, although it’s probably going to slip. ",
  "Open the docs, grab a component, and make it yours in the codebase. ",
  "Radiant lines, shader wash, gooey picker — install what you need and move. ",
]

export function TangleFooterDemo() {
  const { resolvedTheme } = useTheme()
  const palette: ThemePalette = resolvedTheme === "dark" ? DARK : LIGHT

  const defaults = useMemo(
    () => ({
      height: 280,
      seed: 23,
      ribbon: palette.ribbon,
      textColor: palette.textColor,
      stage: palette.stage,
    }),
    [palette]
  )

  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)

  // Keep stock ribbon/text/stage on the active theme until the user picks custom colors.
  useEffect(() => {
    setProps((prev) => {
      if (!isStockThemePalette(prev.ribbon, prev.textColor, prev.stage)) {
        return prev
      }
      if (matchesPalette(prev.ribbon, prev.textColor, prev.stage, palette)) {
        return prev
      }
      return {
        ...prev,
        ribbon: palette.ribbon,
        textColor: palette.textColor,
        stage: palette.stage,
      }
    })
  }, [palette, setProps])

  const useAutoTheme = isStockThemePalette(
    props.ribbon,
    props.textColor,
    props.stage
  )

  return (
    <>
      <ComponentPreview
        title="Tangle Footer"
        stageClassName="min-h-0 overflow-hidden p-0"
        align="start"
      >
        <div
          className={cn(
            "flex h-[56svh] w-full flex-col justify-end overflow-hidden rounded-[inherit]",
            useAutoTheme && "bg-[#EFEAE2] dark:bg-[#121210]"
          )}
          style={useAutoTheme ? undefined : { backgroundColor: props.stage }}
        >
          <div className="w-full max-w-7xl self-center">
            <TangleFooter
              background="transparent"
              height={props.height}
              seed={props.seed}
              ribbon={useAutoTheme ? undefined : props.ribbon}
              textColor={useAutoTheme ? undefined : props.textColor}
              lines={LINES}
            />
          </div>
        </div>
      </ComponentPreview>

      <ComponentControls hasChanges={hasChanges} onReset={resetProps}>
        <ControlColor
          label="Stage"
          value={props.stage}
          onChange={(v) => updateProp("stage", v)}
        />
        <ControlColor
          label="Ribbon"
          value={props.ribbon}
          onChange={(v) => updateProp("ribbon", v)}
        />
        <ControlColor
          label="Text"
          value={props.textColor}
          onChange={(v) => updateProp("textColor", v)}
        />
        <ControlSlider
          label="Height"
          value={props.height}
          min={160}
          max={420}
          step={10}
          onChange={(v) => updateProp("height", v)}
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
