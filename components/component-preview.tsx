import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface ComponentPreviewProps {
  children: ReactNode
  className?: string
  /** Classes applied to the inner demo stage */
  stageClassName?: string
  /** Optional label shown above the stage */
  title?: string
  /** Fallback label when title is omitted */
  name?: string
  /** Vertical alignment of the demo */
  align?: "center" | "start" | "end"
}

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
      className={cn(
        "not-prose my-6 w-full rounded-2xl bg-muted/50",
        className
      )}
    >
      {label ? (
        <figcaption className="flex h-9 items-center px-3.5">
          <span className="text-sm font-medium text-foreground/90">{label}</span>
        </figcaption>
      ) : null}

      <div className={cn("p-1", label && "pt-0")}>
        <div
          className={cn(
            "relative flex min-h-[36svh] w-full items-center justify-center overflow-hidden rounded-[calc(var(--radius-2xl)-2px)] bg-background p-8 ring-1 ring-border/80",
            align === "start" && "items-start justify-start",
            align === "end" && "items-end justify-end",
            stageClassName
          )}
        >
          {children}
        </div>
      </div>
    </figure>
  )
}

export default ComponentPreview
