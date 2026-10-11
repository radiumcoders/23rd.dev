"use client"

import { useLayoutEffect, useMemo, useRef } from "react"

import {
  ComponentControls,
  ControlColors,
  ControlSlider,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { useHydratedTheme } from "@/hooks/use-hydrated-theme"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  DEFAULT_COLORS,
  LIGHT_COLORS,
  RadiantLines,
} from "@/registry/radiant-lines/radiant-lines"

function norm(hex: string) {
  return hex.trim().toUpperCase()
}

function colorsEqual(a: string[], b: string[]) {
  return (
    a.length === b.length && a.every((color, i) => norm(color) === norm(b[i]!))
  )
}

/** The stock palettes swap with the theme; a custom one stays put. */
function isStockPalette(colors: string[]) {
  return (
    colorsEqual(colors, DEFAULT_COLORS) || colorsEqual(colors, LIGHT_COLORS)
  )
}

const PAGES = [
  {
    eyebrow: "Scroll to warp",
    title: "Hyperspace starfield",
    body: "Colored streaks shoot from the center. Scroll to the next page and the warp eases with you.",
  },
  {
    eyebrow: "Page two",
    title: "Keep drifting",
    body: "Each snap is a new beat. The field stays pinned while you move between pages.",
  },
  {
    eyebrow: "Page three",
    title: "End of the jump",
    body: "Release and the stars settle back to a slow drift.",
  },
] as const

export function RadiantLinesDemo() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const theme = useHydratedTheme()
  const palette = theme === "dark" ? DEFAULT_COLORS : LIGHT_COLORS
  const defaults = useMemo(
    () => ({ starCount: 420, displacement: 1, colors: palette }),
    [palette]
  )
  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)

  useLayoutEffect(() => {
    setProps((prev) => {
      if (!isStockPalette(prev.colors)) return prev
      if (colorsEqual(prev.colors, palette)) return prev
      return { ...prev, colors: palette }
    })
  }, [palette, setProps])

  const stock = isStockPalette(props.colors)

  return (
    <>
      <ComponentPreview
        title="Radiant Lines"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div
          ref={scrollerRef}
          className="relative no-scrollbar h-[56svh] w-full snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-[inherit] bg-background"
        >
          <div className="pointer-events-none sticky top-0 h-[56svh]">
            <RadiantLines
              containerRef={scrollerRef}
              starCount={props.starCount}
              displacement={props.displacement}
              colors={stock ? undefined : props.colors}
            />
          </div>

          <div className="relative z-10 -mt-[56svh]">
            {PAGES.map((page) => (
              <section
                key={page.title}
                className="flex h-[56svh] snap-start snap-always flex-col items-center justify-center px-8 text-center"
              >
                <div className="mx-auto flex max-w-md flex-col gap-3">
                  <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                    {page.eyebrow}
                  </p>
                  <h3 className="text-2xl font-medium tracking-tight text-foreground">
                    {page.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {page.body}
                  </p>
                </div>
              </section>
            ))}
          </div>
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="RadiantLines"
        snippetProps={{
          starCount: props.starCount,
          displacement: props.displacement,
          colors: stock ? undefined : props.colors,
        }}
      >
        <ControlColors
          label="Colors"
          colors={props.colors}
          palettes={[
            palette,
            [
              "#F97316",
              "#FACC15",
              "#4ADE80",
              "#22D3EE",
              "#818CF8",
              "#E879F9",
              "#FB7185",
            ],
            [
              "#F5E6C8",
              "#E8B86D",
              "#C17F59",
              "#8B5E3C",
              "#A3B18A",
              "#588157",
              "#3A5A40",
            ],
            [
              "#E2E8F0",
              "#94A3B8",
              "#64748B",
              "#38BDF8",
              "#818CF8",
              "#C084FC",
              "#F472B6",
            ],
          ]}
          onChange={(colors) => updateProp("colors", colors)}
        />
        <ControlSlider
          label="Star count"
          value={props.starCount}
          min={80}
          max={900}
          step={20}
          onChange={(v) => updateProp("starCount", v)}
        />
        <ControlSlider
          label="Displacement"
          value={props.displacement}
          min={0.2}
          max={3}
          step={0.1}
          onChange={(v) => updateProp("displacement", v)}
        />
      </ComponentControls>
    </>
  )
}
