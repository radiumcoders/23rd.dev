"use client"

import { useCallback, useMemo, useState } from "react"

import {
  ComponentControls,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { Button } from "@/components/ui/button"
import { usePreviewProps } from "@/hooks/use-preview-props"
import { cn } from "@/lib/utils"
import { DitherScan } from "@/registry/dither-scan/dither-scan"

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1400&q=80&auto=format`

const IMAGES = [
  {
    src: photo("1470071459604-3b5ec3a7fe05"),
    alt: "Mist rolling over green highland cliffs at sunrise",
  },
  {
    src: photo("1433086966358-54859d0ed716"),
    alt: "A waterfall dropping under a stone footbridge in a mossy gorge",
  },
  {
    src: photo("1506905925346-21bda4d32df4"),
    alt: "Snowy mountain ridges above a sea of clouds",
  },
]

const thumb = (src: string) => src.replace("w=1400&q=80", "w=160&q=60")

export function DitherScanDemo() {
  const defaults = useMemo(
    () => ({
      image: 0,
      passes: 4,
      duration: 1400,
      pixelSize: 6,
      blur: 6,
      angle: 45,
      alternate: true,
      loop: true,
    }),
    []
  )

  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(defaults)
  const [replayKey, setReplayKey] = useState(0)
  const [cleared, setCleared] = useState(0)

  const onStart = useCallback(() => setCleared(0), [])
  const onPass = useCallback((pass: number) => setCleared(pass), [])

  const image = IMAGES[props.image] ?? IMAGES[0]!
  const status =
    cleared >= props.passes
      ? "Clean"
      : `${cleared} of ${props.passes} passes`

  return (
    <>
      <ComponentPreview
        title="Dither scan"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative flex h-[var(--preview-h,56svh)] w-full items-center justify-center overflow-hidden rounded-[inherit] bg-background p-6 [container-type:size] sm:p-10">
          <DitherScan
            key={image.src}
            src={image.src}
            alt={image.alt}
            // Fit the image's own ratio inside the stage, like object-contain.
            className="w-[min(100cqw,calc(100cqh*var(--dither-scan-ratio)))] rounded-lg"
            passes={props.passes}
            duration={props.duration}
            pixelSize={props.pixelSize}
            blur={props.blur}
            angle={props.angle}
            alternate={props.alternate}
            loop={props.loop}
            replayKey={replayKey}
            onStart={onStart}
            onPass={onPass}
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="DitherScan"
        snippetProps={{
          src: image.src,
          alt: image.alt,
          passes: props.passes,
          duration: props.duration,
          pixelSize: props.pixelSize,
          blur: props.blur,
          angle: props.angle,
          alternate: props.alternate ? undefined : false,
          loop: props.loop || undefined,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground/90">
            Image
          </span>
          <div className="flex gap-1.5" role="group" aria-label="Image">
            {IMAGES.map((option, i) => (
              <button
                key={option.src}
                type="button"
                aria-label={option.alt}
                aria-pressed={props.image === i}
                onClick={() => updateProp("image", i)}
                className={cn(
                  "size-8 overflow-hidden rounded-md bg-muted ring-offset-2 ring-offset-background transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  props.image === i
                    ? "ring-2 ring-foreground"
                    : "opacity-70 hover:opacity-100"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb(option.src)}
                  alt=""
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-sm font-medium text-foreground/90 tabular-nums"
            aria-live="polite"
          >
            {status}
          </span>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => setReplayKey((key) => key + 1)}
          >
            Replay
          </Button>
        </div>
        <ControlSlider
          label="Passes"
          value={props.passes}
          min={1}
          max={8}
          step={1}
          onChange={(v) => updateProp("passes", v)}
        />
        <ControlSlider
          label="Duration"
          value={props.duration}
          min={400}
          max={3000}
          step={100}
          onChange={(v) => updateProp("duration", v)}
        />
        <ControlSlider
          label="Pixel size"
          value={props.pixelSize}
          min={2}
          max={12}
          step={1}
          onChange={(v) => updateProp("pixelSize", v)}
        />
        <ControlSlider
          label="Blur"
          value={props.blur}
          min={0}
          max={16}
          step={1}
          onChange={(v) => updateProp("blur", v)}
        />
        <ControlSlider
          label="Angle"
          value={props.angle}
          min={0}
          max={180}
          step={5}
          onChange={(v) => updateProp("angle", v)}
        />
        <ControlSwitch
          label="Alternate"
          description="Every other sweep runs back the way it came"
          checked={props.alternate}
          onChange={(v) => updateProp("alternate", v)}
        />
        <ControlSwitch
          label="Loop"
          description="Re-dither and scan again after a hold"
          checked={props.loop}
          onChange={(v) => updateProp("loop", v)}
        />
      </ComponentControls>
    </>
  )
}
