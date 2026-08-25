"use client"

import { useMemo, useRef, useState } from "react"
import { RiArrowDownLine } from "@remixicon/react"

import {
  ComponentControls,
  ControlColors,
  ControlSlider,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { Button } from "@/components/ui/button"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  playStretchyFooterDemo,
  StretchyFooter,
} from "@/registry/stretchy-footer/stretchy-footer"
import {
  DEFAULT_BLUR,
  DEFAULT_COLORS,
  DEFAULT_COLUMNS,
  DEFAULT_GLOW,
} from "@/registry/stretchy-footer/stretchy-footer-vanilla"

const PREVIEW_DEMO_ID = "stretchy-footer-preview"

const SPECTRUM = ["#FF3B30", "#FFCC00", "#34C759", "#007AFF", "#AF52DE"]
const SUNSET = ["#FF4D00", "#FF8A5B", "#FFC857", "#E63946", "#9B2226"]
const OCEAN = ["#012A4A", "#01497C", "#2A9D8F", "#48CAE4", "#90E0EF"]
const NEON = ["#F72585", "#B5179E", "#7209B7", "#4361EE", "#4CC9F0"]

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
      colors: SPECTRUM,
      maxStretch: 220,
      columns: DEFAULT_COLUMNS,
      stiffness: 380,
      blur: DEFAULT_BLUR,
      glow: DEFAULT_GLOW,
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
            key={props.stiffness}
            demoId={PREVIEW_DEMO_ID}
            scrollRef={scrollerRef}
            contentSelector="[data-stretchy-preview]"
            colors={props.colors}
            maxStretch={props.maxStretch}
            columns={props.columns}
            stiffness={props.stiffness}
            blur={props.blur}
            glow={props.glow}
            className="z-20"
          />

          <div
            ref={scrollerRef}
            className="no-scrollbar relative z-10 h-full overflow-y-auto overscroll-contain"
          >
            <div
              data-stretchy-preview
              className="flex min-h-[145%] flex-col items-center justify-center gap-4 px-6 py-16 text-center"
            >
              <p className="max-w-sm text-sm text-muted-foreground">
                Scroll past the end of this card — or play the rubber-band from
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
          maxStretch: props.maxStretch === 280 ? undefined : props.maxStretch,
          columns:
            props.columns === DEFAULT_COLUMNS ? undefined : props.columns,
          stiffness: props.stiffness === 380 ? undefined : props.stiffness,
          blur: props.blur === DEFAULT_BLUR ? undefined : props.blur,
          glow: props.glow === DEFAULT_GLOW ? undefined : props.glow,
        }}
      >
        <ControlColors
          label="Palette"
          colors={props.colors}
          palettes={[SPECTRUM, SUNSET, OCEAN, NEON]}
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
          min={12}
          max={80}
          step={4}
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
      </ComponentControls>
    </>
  )
}
