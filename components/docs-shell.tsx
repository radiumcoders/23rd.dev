"use client"

import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { DocsSidebar } from "@/components/docs-sidebar"
import { DocsSidebarTrigger } from "@/components/docs-sidebar-trigger"
import { GithubStars } from "@/components/github-stars"
import { Logo } from "@/components/logo"
import { SearchTrigger } from "@/components/search-trigger"
import { FrameworkProvider } from "@/lib/framework"
import { cn } from "@/lib/utils"
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
  "--sidebar-border": "transparent",
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

const EDGE_BLUR_STDS = [1, 2, 4, 8, 16] as const

function DocsEdgeBlurDefs({ uid }: { uid: string }) {
  return (
    <svg
      className="pointer-events-none absolute size-0 overflow-hidden"
      aria-hidden
    >
      <defs>
        {EDGE_BLUR_STDS.map((std) => (
          <filter
            key={std}
            id={`docs-edge-blur-${std}-${uid}`}
            x="-10%"
            y="-50%"
            width="120%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation={std} />
          </filter>
        ))}
      </defs>
    </svg>
  )
}

function WindowEdgeFade({
  edge,
  uid,
}: {
  edge: "top" | "bottom"
  uid: string
}) {
  const isTop = edge === "top"
  const steps = isTop ? [...EDGE_BLUR_STDS].reverse() : EDGE_BLUR_STDS

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10 flex h-28 flex-col",
        isTop ? "top-0 rounded-t-2xl" : "bottom-0 rounded-b-2xl"
      )}
    >
      {steps.map((std) => (
        <div
          key={std}
          className="min-h-0 flex-1"
          style={{
            WebkitBackdropFilter: `blur(${std}px)`,
            backdropFilter: `url(#docs-edge-blur-${std}-${uid})`,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Docs chrome: canvas sidebar + a real inset content window.
 * The window is a flex column; the article scrolls inside it so the ring,
 * corners, and shadow never have to be faked with overlays.
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
  const blurUid = useId().replace(/:/g, "")

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
          variant="inset"
          collapsible="offcanvas"
          className="p-3"
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
        <SidebarInset className="relative z-10 m-3 min-h-0 min-w-0 overflow-hidden rounded-2xl bg-background ring-1 ring-black/10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_24px_rgba(0,0,0,0.06)] md:peer-data-[variant=inset]:m-3 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-3 dark:ring-white/12 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_28px_rgba(0,0,0,0.35)]">
          <div
            ref={scrollRef}
            data-docs-window-scroll
            className="absolute inset-0 overflow-y-auto overscroll-y-contain pt-14 pb-10"
          >
            {children}
          </div>
          <DocsEdgeBlurDefs uid={blurUid} />
          <WindowEdgeFade edge="top" uid={blurUid} />
          <WindowEdgeFade edge="bottom" uid={blurUid} />
          <header className="absolute inset-x-0 top-0 z-20 flex h-14 items-center gap-3 px-4 md:px-6">
            <DocsSidebarTrigger showWhenCollapsed />
            <div className="ml-auto flex items-center gap-1">
              <GithubStars stars={githubStars} />
              <SearchTrigger />
            </div>
          </header>
        </SidebarInset>
      </SidebarProvider>
    </FrameworkProvider>
  )
}
