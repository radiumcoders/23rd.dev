"use client"

import { useMemo, useRef, useState } from "react"
import { RiArrowDownLine } from "@remixicon/react"

import {
  ComponentControls,
  ControlColors,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { Button } from "@/components/ui/button"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  DEFAULT_BLUR,
  DEFAULT_COLORS,
  DEFAULT_COLUMNS,
  DEFAULT_GLOW,
  DEFAULT_MAX_STRETCH,
  DEFAULT_STIFFNESS,
  playStretchyFooterDemo,
  StretchyFooter,
} from "@/registry/stretchy-footer/stretchy-footer"

const PREVIEW_DEMO_ID = "stretchy-footer-preview"

// Gradient stops, top of each column to the floor — nine, like the default.
const SUNSET = [
  "#FFE8A3",
  "#FFD166",
  "#FFA94D",
  "#FF7B3D",
  "#FF3D6E",
  "#D6246E",
  "#B5179E",
  "#3A0CA3",
  "#10002B",
]
const OCEAN = [
  "#F1FCFD",
  "#CAF0F8",
  "#90E0EF",
  "#48CAE4",
  "#00B4D8",
  "#0096C7",
  "#0077B6",
  "#023E8A",
  "#03045E",
]
const NEON = [
  "#B8F2FF",
  "#4CC9F0",
  "#4895EF",
  "#4361EE",
  "#7209B7",
  "#B5179E",
  "#F72585",
  "#FF9E00",
  "#1A0B2E",
]

function norm(hex: string) {
  return hex.trim().toUpperCase()
}

function colorsEqual(a: string[], b: string[]) {
  return (
    a.length === b.length && a.every((color, i) => norm(color) === norm(b[i]!))
  )
}

/** Preview card with its own scroller — button plays the stretch in-place. */
export function StretchyFooterDemo() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)

  const defaults = useMemo(
    () => ({
      colors: DEFAULT_COLORS,
      maxStretch: 220,
      columns: DEFAULT_COLUMNS,
      stiffness: DEFAULT_STIFFNESS,
      blur: DEFAULT_BLUR,
      glow: DEFAULT_GLOW,
      flip: false,
      rotated: false,
    }),
    []
  )

  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(defaults)

  async function onShowEffect() {
    if (playing) return
    setPlaying(true)
    try {
      await playStretchyFooterDemo({
        target: PREVIEW_DEMO_ID,
        amount: 0.9,
        holdMs: 900,
        scrollRoot: scrollerRef.current,
      })
    } finally {
      setPlaying(false)
    }
  }

  return (
    <>
      <ComponentPreview
        title="Stretchy Footer"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[56svh] w-full overflow-hidden rounded-[inherit] bg-background">
          <StretchyFooter
            demoId={PREVIEW_DEMO_ID}
            scrollRef={scrollerRef}
            contentSelector="[data-stretchy-preview]"
            colors={props.colors}
            maxStretch={props.maxStretch}
            columns={props.columns}
            stiffness={props.stiffness}
            blur={props.blur}
            glow={props.glow}
            flip={props.flip}
            rotate={props.rotated ? 180 : 0}
            className="z-20"
          />

          <div
            ref={scrollerRef}
            className="relative z-10 no-scrollbar h-full overflow-y-auto overscroll-contain"
          >
            <div
              data-stretchy-preview
              className="flex min-h-[145%] flex-col items-center justify-center gap-4 px-6 py-16 text-center"
            >
              <p className="max-w-sm text-sm text-muted-foreground">
                Scroll past the end of this card, or play the rubber-band from
                here.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={onShowEffect}
                disabled={playing}
              >
                <RiArrowDownLine data-icon="inline-start" />
                {playing ? "Playing…" : "Show effect"}
              </Button>
              <p className="text-xs text-muted-foreground/80">
                Tip: keep scrolling after you hit the bottom.
              </p>
            </div>
          </div>
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="StretchyFooter"
        snippetProps={{
          colors: colorsEqual(props.colors, DEFAULT_COLORS)
            ? undefined
            : props.colors,
          maxStretch:
            props.maxStretch === DEFAULT_MAX_STRETCH
              ? undefined
              : props.maxStretch,
          columns:
            props.columns === DEFAULT_COLUMNS ? undefined : props.columns,
          stiffness:
            props.stiffness === DEFAULT_STIFFNESS ? undefined : props.stiffness,
          blur: props.blur === DEFAULT_BLUR ? undefined : props.blur,
          glow: props.glow === DEFAULT_GLOW ? undefined : props.glow,
          flip: props.flip ? true : undefined,
          rotate: props.rotated ? 180 : undefined,
        }}
      >
        <ControlColors
          label="Palette"
          colors={props.colors}
          palettes={[DEFAULT_COLORS, SUNSET, OCEAN, NEON]}
          onChange={(colors) => updateProp("colors", colors)}
        />
        <ControlSlider
          label="Stretch"
          value={props.maxStretch}
          min={100}
          max={360}
          step={10}
          onChange={(v) => updateProp("maxStretch", v)}
        />
        <ControlSlider
          label="Columns"
          value={props.columns}
          min={3}
          max={25}
          step={2}
          onChange={(v) => updateProp("columns", v)}
        />
        <ControlSlider
          label="Blur"
          value={props.blur}
          min={0}
          max={32}
          step={1}
          onChange={(v) => updateProp("blur", v)}
        />
        <ControlSlider
          label="Glow"
          value={props.glow}
          min={0}
          max={0.48}
          step={0.02}
          onChange={(v) => updateProp("glow", v)}
        />
        <ControlSlider
          label="Snap"
          value={props.stiffness}
          min={140}
          max={620}
          step={20}
          onChange={(v) => updateProp("stiffness", v)}
        />
        <ControlSwitch
          label="Flip"
          description="Tall edges, dipped middle"
          checked={props.flip}
          onChange={(v) => updateProp("flip", v)}
        />
        <ControlSwitch
          label="Rotate 180°"
          description="Aurora hangs from the page"
          checked={props.rotated}
          onChange={(v) => updateProp("rotated", v)}
        />
      </ComponentControls>
    </>
  )
}
