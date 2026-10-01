import type { CSSProperties, ReactNode } from "react"

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

/** Inside the stage, `bg-background` is the screen, not the sheet. */
const screenTokens = { "--background": "var(--screen)" } as CSSProperties

/**
 * The live stage: a screen set in a frame. When ComponentControls follows,
 * the two share one frame, with the props underneath the screen.
 */
export function ComponentPreview({
  children,
  className,
  stageClassName,
  title,
  name,
  align = "center",
}: ComponentPreviewProps) {
  const label = title ?? name

  return (
    <figure
      data-slot="component-preview"
      aria-label={label}
      className={cn(
        "not-prose my-8 rounded-2xl border bg-card p-1",
        "[&:has(+[data-slot=component-controls])]:mb-0 [&:has(+[data-slot=component-controls])]:rounded-b-none [&:has(+[data-slot=component-controls])]:border-b-0 [&:has(+[data-slot=component-controls])]:pb-0",
        className
      )}
    >
      <div
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
          stageClassName
        )}
      >
        {children}
      </div>
    </figure>
  )
}

export default ComponentPreview
