"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

import {
  createImagePeel,
  IMAGE_PEEL_STRIPS,
  normalizeSide,
  type ImagePeelInstance,
  type ImagePeelRuntimeOptions,
  type ImagePeelSide,
} from "./image-peel-vanilla"

export {
  IMAGE_PEEL_PLAY,
  IMAGE_PEEL_STRIPS,
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

const shadeClass: Record<ImagePeelSide, string> = {
  top: "bg-gradient-to-b from-black via-black/70 to-transparent",
  bottom: "bg-gradient-to-t from-black via-black/70 to-transparent",
  left: "bg-gradient-to-r from-black via-black/70 to-transparent",
  right: "bg-gradient-to-l from-black via-black/70 to-transparent",
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
  children,
  demoId,
}: ImagePeelProps) {
  const rootRef = useRef<HTMLElement>(null)
  const instanceRef = useRef<ImagePeelInstance | null>(null)
  const [failed, setFailed] = useState(false)
  const resolvedSide = normalizeSide(side)
  const horizontal = resolvedSide === "top" || resolvedSide === "bottom"

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
      <div data-peel-stage className="sticky top-0 h-svh w-full">
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
        <div data-peel-sheet className="absolute perspective-[1100px]">
          {failed ? (
            <div className="flex h-full items-end bg-muted p-8 text-sm text-muted-foreground">
              This image didn&apos;t load.
            </div>
          ) : (
            Array.from({ length: IMAGE_PEEL_STRIPS }, (_, index) => (
              <div
                key={`${resolvedSide}-${index}`}
                data-peel-strip
                data-index={index}
                aria-hidden
                className={cn(
                  "absolute [transform-style:preserve-3d]",
                  horizontal ? "inset-x-0" : "inset-y-0"
                )}
                style={{
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
                    style={
                      horizontal
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
                      shadeClass[resolvedSide]
                    )}
                  />
                </div>
                <div
                  data-peel-back
                  className="absolute inset-0 bg-[#f4f0e6] shadow-[inset_0_0_24px_rgba(0,0,0,0.18)] dark:bg-[#2a2824]"
                >
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
