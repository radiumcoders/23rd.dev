"use client"

import { useEffect, useState } from "react"
import { RiArrowDownLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  ComponentControls,
  ControlSlider,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  ImagePeel,
  playImagePeel,
  type ImagePeelSide,
} from "@/registry/image-peel/image-peel"

const PREVIEW_DEMO_ID = "image-peel-preview"
const SAMPLE = "/image-peel.png"

const SIDES: ImagePeelSide[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
]

export function ImagePeelDemo() {
  const [playing, setPlaying] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const { props, updateProp, resetProps, hasChanges } = usePreviewProps({
    src: SAMPLE,
    side: "bottom-right" as ImagePeelSide,
    amount: 1,
  })

  useEffect(() => {
    const src = props.src
    return () => {
      if (src.startsWith("blob:")) URL.revokeObjectURL(src)
    }
  }, [props.src])

  function onReset() {
    setFileName(null)
    resetProps()
  }

  function onFile(file: File | undefined) {
    if (!file) return
    if (props.src.startsWith("blob:")) URL.revokeObjectURL(props.src)
    setFileName(file.name)
    updateProp("src", URL.createObjectURL(file))
  }

  async function onShowPeel() {
    if (playing) return
    setPlaying(true)
    try {
      await playImagePeel({ target: PREVIEW_DEMO_ID })
    } finally {
      setPlaying(false)
    }
  }

  const snippetSrc = props.src.startsWith("blob:") ? "/photo.jpg" : props.src

  return (
    <>
      <ComponentPreview
        title="Image Peel"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[68svh] w-full">
          <div className="h-full overflow-y-auto overscroll-contain">
            <ImagePeel
              demoId={PREVIEW_DEMO_ID}
              src={props.src}
              alt="Sticker"
              side={props.side}
              amount={props.amount}
              className="h-[240%]"
            >
              <div className="flex h-full items-end justify-center bg-background px-8 pb-16">
                <p className="max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
                  Under the sheet, in whatever theme the page is using.
                </p>
              </div>
            </ImagePeel>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-4">
            <Button
              type="button"
              variant="outline"
              className="pointer-events-auto bg-background/80 backdrop-blur-sm"
              onClick={onShowPeel}
              disabled={playing}
            >
              <RiArrowDownLine data-icon="inline-start" />
              {playing ? "Peeling…" : "Show peel"}
            </Button>
          </div>
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={onReset}
        component="ImagePeel"
        snippetProps={{
          src: snippetSrc,
          alt: "Sticker",
          side: props.side,
          amount: props.amount,
        }}
      >
        <div className="flex items-center gap-2.5">
          <label className="flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-xl bg-muted px-3 text-sm">
            <span className="shrink-0 text-muted-foreground">Image</span>
            <span className="truncate text-foreground">
              {fileName ?? "Sticker"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                onFile(event.target.files?.[0])
                event.target.value = ""
              }}
            />
          </label>
        </div>
        <label className="flex h-9 items-center gap-3 rounded-xl bg-muted px-3">
          <span className="shrink-0 text-sm text-muted-foreground">URL</span>
          <input
            value={props.src.startsWith("blob:") ? "" : props.src}
            placeholder="https://… or /image-peel.png"
            aria-label="Image URL"
            onChange={(event) => {
              setFileName(null)
              updateProp("src", event.target.value)
            }}
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground/90">Side</span>
          <div className="flex flex-wrap gap-1">
            {SIDES.map((side) => (
              <Button
                key={side}
                type="button"
                size="xs"
                variant={props.side === side ? "secondary" : "outline"}
                aria-pressed={props.side === side}
                onClick={() => updateProp("side", side)}
              >
                {side}
              </Button>
            ))}
          </div>
        </div>
        <ControlSlider
          label="Amount"
          value={props.amount}
          min={0}
          max={1}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}`}
          onChange={(value) => updateProp("amount", value)}
        />
      </ComponentControls>
    </>
  )
}
