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
 * The picker is the header row of the same plate as the code below it.
 */
export function FrameworkCode({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="framework-code"
      className={cn(
        "not-prose my-6 overflow-hidden rounded-xl border bg-card",
        className
      )}
    >
      <div className="flex h-10 items-center border-b px-3.5">
        <FrameworkSelect />
      </div>
      <div className="[&_figure]:my-0 [&_figure]:rounded-none [&_figure]:border-0">
        {children}
      </div>
    </div>
  )
}

export default FrameworkCode
