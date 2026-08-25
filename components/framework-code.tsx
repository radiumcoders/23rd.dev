"use client"

import type { ReactNode } from "react"

import { FrameworkSelect } from "@/components/framework-select"
import { cn } from "@/lib/utils"
import { useFramework } from "@/lib/framework"

export function FrameworkReact({ children }: { children: ReactNode }) {
  const { framework } = useFramework()
  if (framework !== "react") return null
  return children
}

export function FrameworkSvelte({ children }: { children: ReactNode }) {
  const { framework } = useFramework()
  if (framework !== "svelte") return null
  return children
}

/**
 * Shows the React or Svelte usage snippet based on the docs framework picker.
 * The picker sits in the same muted chrome as the code block below it.
 */
export function FrameworkCode({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div data-slot="framework-code" className={cn("not-prose my-6", className)}>
      <div className="flex h-9 items-center justify-end rounded-t-2xl bg-muted/50 px-3.5">
        <FrameworkSelect />
      </div>
      <div className="[&_figure]:my-0 [&_figure]:rounded-t-none [&_figure]:pt-0">
        {children}
      </div>
    </div>
  )
}

export default FrameworkCode
