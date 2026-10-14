"use client"

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

interface ComponentPreviewProps {
  children: ReactNode
  className?: string
  /** Classes applied to the inner demo stage */
  stageClassName?: string
  /** Accessible name for the preview */
  title?: string
  /** Fallback label when title is omitted */
  name?: string
  /** Vertical alignment of the demo */
  align?: "center" | "start" | "end"
}

/**
 * Set by DocsStage on a component page. `slot` is the stage the preview
 * moves into and `controlsSlot` the props panel beside it, where
 * ComponentControls moves; both are null for the first render, before the
 * stage has mounted. `onControls` tells the stage whether the page has
 * controls, so the panel only shows when there is something in it.
 * Outside a component page there is no stage, and both render in place.
 */
export type PreviewStage = {
  slot: HTMLElement | null
  controlsSlot: HTMLElement | null
  onControls: (present: boolean) => void
}

export const PreviewStageContext = createContext<PreviewStage | null>(null)

/** Inside the stage, `bg-background` is the screen, not the sheet. */
const screenTokens = { "--background": "var(--screen)" } as CSSProperties

/**
 * The live stage: a screen set in a frame. On a component page it renders
 * into the stage at the top (a portal, so the demo's state and its
 * controls stay wired up) and fills it; anywhere else, in place, where
 * ComponentControls directly after it joins its frame.
 */
export function ComponentPreview(props: ComponentPreviewProps) {
  const stage = useContext(PreviewStageContext)
  if (!stage) return <PreviewFrame {...props} />
  if (!stage.slot) return null
  return createPortal(<PreviewFrame {...props} fill />, stage.slot)
}

function PreviewFrame({
  children,
  className,
  stageClassName,
  title,
  name,
  align = "center",
  fill = false,
}: ComponentPreviewProps & { fill?: boolean }) {
  const label = title ?? name
  const screenRef = useRef<HTMLDivElement>(null)

  // Demos size themselves with `var(--preview-h, 56svh)`. Filling the stage,
  // the screen hands them its own height, so a demo fills it exactly.
  useLayoutEffect(() => {
    const screen = screenRef.current
    if (!fill || !screen) return
    const sync = () =>
      screen.style.setProperty("--preview-h", `${screen.clientHeight}px`)
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(screen)
    return () => ro.disconnect()
  }, [fill])

  return (
    <figure
      data-slot="component-preview"
      aria-label={label}
      className={cn(
        "not-prose",
        fill
          ? "flex h-full flex-col rounded-[inherit]"
          : "rounded-2xl border bg-card p-1",
        !fill &&
          "my-8 [&:has(+[data-slot=component-controls])]:mb-0 [&:has(+[data-slot=component-controls])]:rounded-b-none [&:has(+[data-slot=component-controls])]:border-b-0 [&:has(+[data-slot=component-controls])]:pb-0",
        className
      )}
    >
      <div
        ref={screenRef}
        style={screenTokens}
        className={cn(
          "relative isolate flex min-h-[36svh] w-full items-center justify-center overflow-hidden rounded-xl bg-background p-8 text-foreground",
          // WebGL canvases and backdrop blurs sit on their own compositor
          // layers, which a rounded overflow clip can miss; a clip-path
          // rounds them too. It would clip an outer ring, so the edge is an
          // inset ring drawn over everything instead.
          "[clip-path:inset(0_round_var(--radius-xl))] after:pointer-events-none after:absolute after:inset-0 after:z-50 after:rounded-[inherit] after:ring-1 after:ring-border after:ring-inset",
          align === "start" && "items-start justify-start",
          align === "end" && "items-end justify-end",
          stageClassName,
          // On the stage the frame is the stage itself: one rounded screen.
          fill &&
            "min-h-0 flex-1 rounded-[inherit] [clip-path:inset(0_round_1.25rem)]"
        )}
      >
        {children}
      </div>
    </figure>
  )
}

export default ComponentPreview
