import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function PreviewBox({
  children,
  title = "Preview",
  className,
  align = "center",
}: {
  children: ReactNode
  title?: string
  className?: string
  align?: "center" | "start"
}) {
  return (
    <div
      className={cn(
        "not-prose mt-4 overflow-hidden rounded-lg border border-border/80",
        className
      )}
    >
      <div className="border-b border-border/80 px-3 py-2 text-xs font-medium text-muted-foreground">
        {title}
      </div>
      <div
        className={cn(
          "flex min-h-32 p-6",
          align === "center"
            ? "items-center justify-center"
            : "items-start justify-start"
        )}
      >
        {children}
      </div>
    </div>
  )
}
