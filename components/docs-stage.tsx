"use client"

import { useCallback, useMemo, useState, type ReactNode } from "react"

import { PreviewStageContext } from "@/components/component-preview"

/**
 * Component page layout: the live preview fills a full-height stage at the
 * top, edge to edge, with the props in a panel beside it, so you can tune
 * the component while you watch it. The page (`children`) follows below.
 * The page's ComponentPreview and ComponentControls move themselves in.
 */
export function DocsStage({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const [controlsSlot, setControlsSlot] = useState<HTMLElement | null>(null)
  const [hasControls, setHasControls] = useState(false)
  const onControls = useCallback(
    (present: boolean) => setHasControls(present),
    []
  )
  const stage = useMemo(
    () => ({ slot, controlsSlot, onControls }),
    [slot, controlsSlot, onControls]
  )

  return (
    <PreviewStageContext.Provider value={stage}>
      {/*
       * One gutter all round and between: 0.5rem on mobile, 0.75rem from
       * `md`. Side by side from `xl`, one screen tall, the panel scrolling
       * on its own; narrower, the panel follows the stage, which keeps a
       * screen to itself (less the 3.5rem top bar on mobile).
       */}
      <div
        data-slot="docs-stage"
        className="flex flex-col gap-2 px-2 pb-2 md:gap-3 md:p-3 xl:h-svh xl:flex-row"
      >
        <div className="h-[max(20rem,calc(100svh-4rem))] md:h-[calc(100svh-1.5rem)] xl:h-auto xl:min-w-0 xl:flex-1">
          <div
            ref={setSlot}
            className="size-full rounded-[1.25rem] bg-screen"
          />
        </div>
        <aside
          ref={setControlsSlot}
          aria-label="Props"
          hidden={!hasControls}
          className="overflow-hidden overscroll-contain rounded-[1.25rem] bg-sheet [--background:var(--sheet)] xl:w-80 xl:shrink-0 xl:overflow-y-auto 2xl:w-[22rem]"
        />
      </div>
      {children}
    </PreviewStageContext.Provider>
  )
}
