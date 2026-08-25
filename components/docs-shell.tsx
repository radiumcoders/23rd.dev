"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"

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
 * Docs chrome: SidebarProvider + Sidebar navigation + mobile trigger.
 * Provider, sidebar, and links live in one module so responsive mobile
 * navigation is statically verifiable (Sheet runtime is in ui/sidebar).
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
  return (
    <FrameworkProvider>
      <SidebarProvider style={sidebarTokens}>
        <Sidebar
          id="docs-sidebar"
          aria-label="Documentation"
          variant="sidebar"
          collapsible="offcanvas"
          className="group-data-[side=left]:border-r-0"
        >
          <SidebarHeader className="flex h-14 flex-row items-center gap-2 px-4">
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
        <SidebarInset className="relative my-2 mr-2 ml-1 bg-background">
          <div aria-hidden className="pointer-events-none sticky top-0 z-30 h-0">
            <div className="docs-window-mask absolute inset-x-0 top-0 h-svh" />
            <div className="absolute inset-x-0 top-2 h-[calc(100svh-16px)] rounded-2xl ring-1 ring-border/60 shadow-[0_0_18px_rgba(0,0,0,0.07)] dark:ring-white/20 dark:shadow-[0_0_26px_rgba(0,0,0,0.55)]" />
          </div>
          <header className="sticky top-0 z-20 flex h-14 w-full items-center gap-3 bg-background/85 px-4 backdrop-blur-sm md:px-6">
            <DocsSidebarTrigger showWhenCollapsed />
            <div className="ml-auto flex items-center gap-1">
              <GithubStars stars={githubStars} />
              <SearchTrigger />
            </div>
          </header>
          <div className="flex flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </FrameworkProvider>
  )
}
