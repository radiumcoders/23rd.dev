"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { DocsSidebar } from "@/components/docs-sidebar"
import { DocsSidebarTrigger } from "@/components/docs-sidebar-trigger"
import { GithubStars } from "@/components/github-stars"
import { Logo } from "@/components/logo"
import { SearchTrigger } from "@/components/search-trigger"
import { FrameworkProvider } from "@/lib/framework"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

const sidebarTokens: CSSProperties = {
  "--sidebar": "var(--background)",
  "--sidebar-foreground": "var(--foreground)",
  "--sidebar-border": "var(--border)",
  "--sidebar-accent": "color-mix(in oklch, var(--foreground) 6%, transparent)",
  "--sidebar-accent-foreground": "var(--foreground)",
  "--sidebar-ring": "var(--ring)",
} as CSSProperties

type PageNode = { type: "page"; name: ReactNode; url: string }
type SeparatorNode = { type: "separator"; name?: ReactNode }
type FolderNode = {
  type: "folder"
  name: ReactNode
  children: TreeNode[]
  index?: PageNode
  defaultOpen?: boolean
}
type RootNode = { type?: "root"; name: ReactNode; children: TreeNode[] }
type TreeNode = PageNode | SeparatorNode | FolderNode

/**
 * Docs chrome: full-viewport panes split by borders.
 */
export function DocsShell({
  tree,
  children,
  githubStars = null,
}: {
  tree: RootNode
  children: ReactNode
  githubStars?: number | null
}) {
  const pathname = usePathname()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    const html = document.documentElement
    const { overflow: htmlOverflow, scrollbarGutter } = html.style
    const bodyOverflow = document.body.style.overflow
    html.style.overflow = "hidden"
    html.style.scrollbarGutter = "auto"
    document.body.style.overflow = "hidden"
    return () => {
      html.style.overflow = htmlOverflow
      html.style.scrollbarGutter = scrollbarGutter
      document.body.style.overflow = bodyOverflow
    }
  }, [])

  return (
    <FrameworkProvider>
      <SidebarProvider
        style={sidebarTokens}
        className="h-svh min-h-0 overflow-hidden bg-background"
      >
        <Sidebar
          id="docs-sidebar"
          aria-label="Documentation"
          collapsible="offcanvas"
        >
          <SidebarHeader className="flex h-14 flex-row items-center gap-2 border-b px-4 py-0">
            <Link
              href="/docs"
              className="flex min-w-0 items-center gap-2 text-sm font-medium"
            >
              <Logo className="size-6 shrink-0" cornerRadius={4} />
              <span className="truncate">23rd</span>
            </Link>
            <DocsSidebarTrigger className="ml-auto shrink-0" />
          </SidebarHeader>
          <SidebarContent>
            <DocsSidebar tree={tree} embedded />
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
            <DocsSidebarTrigger showWhenCollapsed />
            <div className="ml-auto flex items-center gap-1">
              <GithubStars stars={githubStars} />
              <SearchTrigger />
            </div>
          </header>
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </FrameworkProvider>
  )
}
