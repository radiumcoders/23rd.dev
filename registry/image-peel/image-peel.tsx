"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

import {
  createImagePeel,
  IMAGE_PEEL_GRID,
  IMAGE_PEEL_STRIPS,
  isCornerSide,
  normalizeSide,
  type ImagePeelInstance,
  type ImagePeelRuntimeOptions,
  type ImagePeelSide,
} from "./image-peel-vanilla"

export {
  DARK_BACK,
  IMAGE_PEEL_GRID,
  IMAGE_PEEL_PLAY,
  IMAGE_PEEL_STRIPS,
  LIGHT_BACK,
  cornerDirection,
  imagePeelPose,
  isCornerSide,
  isDarkTheme,
  peelBackColor,
  playImagePeel,
  resolveDark,
} from "./image-peel-vanilla"
export type {
  ImagePeelPlayDetail,
  ImagePeelRuntimeOptions,
  ImagePeelSide,
  ImagePeelTheme,
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

function shadeClassFor(side: ImagePeelSide) {
  if (isCornerSide(side)) return "bg-black"
  if (side === "top")
    return "bg-gradient-to-b from-black via-black/70 to-transparent"
  if (side === "bottom")
    return "bg-gradient-to-t from-black via-black/70 to-transparent"
  if (side === "left")
    return "bg-gradient-to-r from-black via-black/70 to-transparent"
  return "bg-gradient-to-l from-black via-black/70 to-transparent"
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

function stickerMask(src: string, index: number, horizontal: boolean) {
  const count = IMAGE_PEEL_STRIPS
  const offset = (index / (count - 1)) * 100
  const image = `url(${JSON.stringify(src)})`
  const size = horizontal ? `100% ${count * 100}%` : `${count * 100}% 100%`
  const position = horizontal ? `0% ${offset}%` : `${offset}% 0%`
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
 * The curl starts on `side` and stops after `amount` of the image has lifted.
 */
export function ImagePeel({
  className,
  src,
  alt = "",
  side = "bottom",
  amount = 1,
  theme = "auto",
  children,
  demoId,
}: ImagePeelProps) {
  const rootRef = useRef<HTMLElement>(null)
  const instanceRef = useRef<ImagePeelInstance | null>(null)
  const [failed, setFailed] = useState(false)
  const resolvedSide = normalizeSide(side)
  const corner = isCornerSide(resolvedSide)
  const horizontal = resolvedSide === "top" || resolvedSide === "bottom"
  const cells = corner
    ? Array.from({ length: IMAGE_PEEL_GRID * IMAGE_PEEL_GRID }, (_, index) => ({
        index,
        col: index % IMAGE_PEEL_GRID,
        row: Math.floor(index / IMAGE_PEEL_GRID),
      }))
    : Array.from({ length: IMAGE_PEEL_STRIPS }, (_, index) => ({
        index,
        col: 0,
        row: index,
      }))

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
      theme,
      demoId,
    })
    return () => {
      instanceRef.current?.destroy()
      instanceRef.current = null
    }
  }, [resolvedSide, demoId, failed, src])

  useEffect(() => {
    instanceRef.current?.setOptions({ side: resolvedSide, amount, theme })
  }, [resolvedSide, amount, theme])

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
        <img
          data-peel-drop
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute object-contain opacity-50 blur-2xl select-none"
        />
        <div
          data-peel-sheet
          data-peel-grid={corner ? IMAGE_PEEL_GRID : undefined}
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
                data-col={corner ? col : undefined}
                data-row={corner ? row : undefined}
                aria-hidden
                className={cn(
                  "absolute [transform-style:preserve-3d]",
                  !corner && (horizontal ? "inset-x-0" : "inset-y-0")
                )}
                style={
                  corner
                    ? {
                        left: `${(col / IMAGE_PEEL_GRID) * 100}%`,
                        top: `${(row / IMAGE_PEEL_GRID) * 100}%`,
                        width: `calc(${100 / IMAGE_PEEL_GRID}% + 2px)`,
                        height: `calc(${100 / IMAGE_PEEL_GRID}% + 2px)`,
                        ...cellMask(src, col, row, IMAGE_PEEL_GRID),
                      }
                    : {
                        ...(horizontal
                          ? {
                              top: `${(index / IMAGE_PEEL_STRIPS) * 100}%`,
                              height: `calc(${100 / IMAGE_PEEL_STRIPS}% + 2px)`,
                            }
                          : {
                              left: `${(index / IMAGE_PEEL_STRIPS) * 100}%`,
                              width: `calc(${100 / IMAGE_PEEL_STRIPS}% + 2px)`,
                            }),
                        ...stickerMask(src, index, horizontal),
                      }
                }
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
                    style={
                      corner
                        ? {
                            width: `${IMAGE_PEEL_GRID * 100}%`,
                            height: `${IMAGE_PEEL_GRID * 100}%`,
                            left: `${-col * 100}%`,
                            top: `${-row * 100}%`,
                          }
                        : horizontal
                          ? {
                              width: "100%",
                              height: `${IMAGE_PEEL_STRIPS * 100}%`,
                              top: `${-index * 100}%`,
                              left: 0,
                            }
                          : {
                              height: "100%",
                              width: `${IMAGE_PEEL_STRIPS * 100}%`,
                              left: `${-index * 100}%`,
                              top: 0,
                            }
                    }
                  />
                  <div
                    data-peel-shade
                    className={cn(
                      "pointer-events-none absolute inset-0 opacity-0",
                      shadeClassFor(resolvedSide)
                    )}
                  />
                </div>
                <div data-peel-back className="absolute inset-0">
                  <div
                    data-peel-shade
                    className="pointer-events-none absolute inset-0 bg-black opacity-0"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
