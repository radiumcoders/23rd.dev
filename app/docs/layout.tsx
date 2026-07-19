import type { ReactNode } from "react"
import { TreeContextProvider } from "fumadocs-ui/contexts/tree"

import { DocsSidebar } from "@/components/docs/sidebar"
import { source } from "@/lib/source"

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <TreeContextProvider tree={source.pageTree}>
      <div className="flex min-h-svh w-full flex-col bg-card lg:flex-row">
        <DocsSidebar tree={source.pageTree} />
        <div className="min-w-0 flex-1 bg-card">{children}</div>
      </div>
    </TreeContextProvider>
  )
}
