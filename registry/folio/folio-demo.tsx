"use client"

import { useState } from "react"
import { RiArrowDownLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  ComponentControls,
  ControlSlider,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import { Folio, playFolioDemo } from "@/registry/folio/folio"

const PREVIEW_DEMO_ID = "folio-preview"

function FolioPage() {
  return (
    <article className="min-h-[340%] bg-background px-8 py-16 text-foreground sm:px-14">
      <p className="text-[11px] font-medium tracking-[0.32em] text-foreground/40 uppercase">
        Scroll
      </p>
      <h3 className="mt-3 max-w-xl text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">
        The page leans back
      </h3>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-foreground/65">
        Wheel through this sheet. It tilts in perspective, then blurs. Stop,
        and it springs to flat.
      </p>

      <p className="mt-28 max-w-md text-sm leading-relaxed text-foreground/70">
        Origin sits at the bottom so the top edge is the one that travels.
        Blur lives up there too — the hinge stays sharp. When the spring
        settles, both go to zero.
      </p>
      <p className="mt-28 max-w-lg text-sm leading-relaxed text-foreground/60">
        Keep going. The lean lives on velocity, not on how far you have
        scrolled, so every stretch of the page can show the same move.
      </p>
      <p className="mt-28 max-w-md text-sm leading-relaxed text-foreground/70">
        One more screen of travel so the effect has room to read — flick,
        watch the tilt, let go.
      </p>
      <p className="mt-28 max-w-sm text-sm leading-relaxed text-foreground/55">
        Keep scrolling. Near the bottom the lean fades out, then it stays
        flat.
      </p>
      <p className="mt-28 mb-24 max-w-md text-sm leading-relaxed text-foreground/50">
        End of the sheet. The lean lets go here. Scroll back up and it
        returns.
      </p>
    </article>
  )
}

export function FolioDemo() {
  const [playing, setPlaying] = useState(false)
  const { props, updateProp, resetProps, hasChanges } = usePreviewProps({
    maxTilt: 18,
    blur: 6,
    perspective: 1000,
    returnMs: 520,
  })

  async function onShowEffect() {
    if (playing) return
    setPlaying(true)
    try {
      await playFolioDemo({
        target: PREVIEW_DEMO_ID,
        holdMs: 720,
      })
    } finally {
      setPlaying(false)
    }
  }

  return (
    <>
      <ComponentPreview
        title="Folio"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[56svh] w-full overflow-hidden rounded-[inherit] bg-background">
          <Folio
            demoId={PREVIEW_DEMO_ID}
            maxTilt={props.maxTilt}
            blur={props.blur}
            perspective={props.perspective}
            returnMs={props.returnMs}
            className="relative z-0 h-full"
          >
            <FolioPage />
          </Folio>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 isolate flex justify-center pb-4">
            <Button
              type="button"
              variant="outline"
              className="pointer-events-auto relative z-50 bg-background/80 backdrop-blur-sm"
              onClick={onShowEffect}
              disabled={playing}
            >
              <RiArrowDownLine data-icon="inline-start" />
              {playing ? "Leaning…" : "Show effect"}
            </Button>
          </div>
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="Folio"
        snippetProps={{
          maxTilt: props.maxTilt,
          blur: props.blur,
          perspective: props.perspective,
          returnMs: props.returnMs,
        }}
      >
        <ControlSlider
          label="Tilt"
          value={props.maxTilt}
          min={4}
          max={28}
          step={1}
          onChange={(v) => updateProp("maxTilt", v)}
        />
        <ControlSlider
          label="Blur"
          value={props.blur}
          min={0}
          max={24}
          step={1}
          onChange={(v) => updateProp("blur", v)}
        />
        <ControlSlider
          label="Perspective"
          value={props.perspective}
          min={1000}
          max={2000}
          step={50}
          onChange={(v) => updateProp("perspective", v)}
        />
        <ControlSlider
          label="Return"
          value={props.returnMs}
          min={180}
          max={1200}
          step={20}
          onChange={(v) => updateProp("returnMs", v)}
        />
      </ComponentControls>
    </>
  )
}
