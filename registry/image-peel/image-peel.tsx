"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

import {
  createImagePeel,
  IMAGE_PEEL_GRID,
  normalizeSide,
  type ImagePeelInstance,
  type ImagePeelRuntimeOptions,
} from "./image-peel-vanilla"

export {
  IMAGE_PEEL_GRID,
  IMAGE_PEEL_PLAY,
  PEEL_BACK,
  cornerDirection,
  imagePeelPose,
  playImagePeel,
} from "./image-peel-vanilla"
export type {
  ImagePeelPlayDetail,
  ImagePeelRuntimeOptions,
  ImagePeelSide,
} from "./image-peel-vanilla"

export type ImagePeelProps = ImagePeelRuntimeOptions & {
  /** Image that peels away. Any URL the browser can draw. */
  src: string
  /** Accessible name for the sheet. Default `""`. */
  alt?: string
  className?: string
  /** What is waiting under the sheet. */
  children?: ReactNode
  /**
   * Optional id for docs demos. `playImagePeel({ target })` only
   * animates instances whose `demoId` matches.
   */
  demoId?: string
}

function cellMask(src: string, col: number, row: number, count: number) {
  const image = `url(${JSON.stringify(src)})`
  const position = `${(col / (count - 1)) * 100}% ${(row / (count - 1)) * 100}%`
  const size = `${count * 100}% ${count * 100}%`
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskSize: size,
    WebkitMaskSize: size,
    maskPosition: position,
    WebkitMaskPosition: position,
    maskMode: "alpha",
    WebkitMaskMode: "alpha",
  }
}

/**
 * A sheet sticks to the scrollport and peels away as it travels through.
 * The curl starts at a corner and stops after `amount` of the image has lifted.
 */
export function ImagePeel({
  className,
  src,
  alt = "",
  side = "bottom-right",
  amount = 1,
  children,
  demoId,
}: ImagePeelProps) {
  const rootRef = useRef<HTMLElement>(null)
  const instanceRef = useRef<ImagePeelInstance | null>(null)
  const [failed, setFailed] = useState(false)
  const resolvedSide = normalizeSide(side)
  const cells = Array.from(
    { length: IMAGE_PEEL_GRID * IMAGE_PEEL_GRID },
    (_, index) => ({
      index,
      col: index % IMAGE_PEEL_GRID,
      row: Math.floor(index / IMAGE_PEEL_GRID),
    })
  )

  useEffect(() => {
    setFailed(false)
    if (!src) return
    let cancelled = false
    const probe = new Image()
    probe.onload = () => {
      if (!cancelled) setFailed(false)
    }
    probe.onerror = () => {
      if (!cancelled) setFailed(true)
    }
    probe.src = src
    return () => {
      cancelled = true
    }
  }, [src])

  useEffect(() => {
    const root = rootRef.current
    if (!root || failed) return
    instanceRef.current = createImagePeel(root, {
      side: resolvedSide,
      amount,
      demoId,
    })
    return () => {
      instanceRef.current?.destroy()
      instanceRef.current = null
    }
  }, [resolvedSide, demoId, failed, src])

  useEffect(() => {
    instanceRef.current?.setOptions({ side: resolvedSide, amount })
  }, [resolvedSide, amount])

  return (
    <section
      ref={rootRef}
      data-slot="image-peel"
      data-image-peel-demo={demoId}
      aria-label={alt || undefined}
      className={cn("relative h-[240vh]", className)}
    >
      <div data-peel-stage className="sticky top-0 h-svh w-full bg-background">
        <div data-peel-reveal className="absolute inset-0">
          {children}
        </div>
        <div
          data-peel-sheet
          data-peel-grid={IMAGE_PEEL_GRID}
          className="absolute perspective-[1100px]"
        >
          {failed ? (
            <div className="flex h-full items-end bg-muted p-8 text-sm text-muted-foreground">
              This image didn&apos;t load.
            </div>
          ) : (
            cells.map(({ index, col, row }) => (
              <div
                key={`${resolvedSide}-${index}`}
                data-peel-strip
                data-index={index}
                data-col={col}
                data-row={row}
                aria-hidden
                className="absolute [transform-style:preserve-3d]"
                style={{
                  left: `${(col / IMAGE_PEEL_GRID) * 100}%`,
                  top: `${(row / IMAGE_PEEL_GRID) * 100}%`,
                  width: `calc(${100 / IMAGE_PEEL_GRID}% + 2px)`,
                  height: `calc(${100 / IMAGE_PEEL_GRID}% + 2px)`,
                  ...cellMask(src, col, row, IMAGE_PEEL_GRID),
                }}
              >
                <div
                  data-peel-front
                  className="absolute inset-0 overflow-hidden"
                >
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    className="absolute max-w-none object-cover select-none"
                    style={{
                      width: `${IMAGE_PEEL_GRID * 100}%`,
                      height: `${IMAGE_PEEL_GRID * 100}%`,
                      left: `${-col * 100}%`,
                      top: `${-row * 100}%`,
                    }}
                  />
                  <div
                    data-peel-shade
                    className="pointer-events-none absolute inset-0 bg-black opacity-0"
                  />
                </div>
                <div data-peel-back className="absolute inset-0 bg-white" />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
