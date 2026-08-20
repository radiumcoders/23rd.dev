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
 */
export function FrameworkCode({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div data-slot="framework-code" className={cn(className)}>
      <div className="mb-2 flex justify-end">
        <FrameworkSelect />
      </div>
      {children}
    </div>
  )
}

export default FrameworkCode
