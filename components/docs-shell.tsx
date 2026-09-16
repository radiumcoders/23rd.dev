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
import { ThemeToggle } from "@/components/theme-toggle"
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

const EDGE_BLUR_LAYERS = [
  { std: 5, opaque: 0, fade: 24 },
  { std: 3, opaque: 0, fade: 44 },
  { std: 2, opaque: 10, fade: 66 },
  { std: 1, opaque: 28, fade: 84 },
  { std: 0.5, opaque: 50, fade: 100 },
] as const

function DocsEdgeBlurDefs({ uid }: { uid: string }) {
  return (
    <svg
      className="pointer-events-none absolute size-0 overflow-hidden"
      aria-hidden
    >
      <defs>
        {EDGE_BLUR_LAYERS.map((layer, i) => (
          <filter
            key={i}
            id={`docs-edge-blur-${i}-${uid}`}
            x="-10%"
            y="-50%"
            width="120%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation={layer.std} />
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
  const dir = isTop ? "to bottom" : "to top"

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10 h-16 xl:right-56",
        isTop ? "top-0" : "bottom-0"
      )}
    >
      {EDGE_BLUR_LAYERS.map((layer, i) => {
        const mask = `linear-gradient(${dir}, black ${layer.opaque}%, transparent ${layer.fade}%)`
        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              backdropFilter: `url(#docs-edge-blur-${i}-${uid})`,
              WebkitBackdropFilter: `url(#docs-edge-blur-${i}-${uid})`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        )
      })}
    </div>
  )
}

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
          <header className="flex h-14 min-w-0 shrink-0 border-b">
            <div className="flex min-w-0 flex-1 items-center gap-1 px-4">
              <DocsSidebarTrigger showWhenCollapsed />
              <div className="min-w-0 flex-1" />
              <ThemeToggle />
              <GithubStars stars={githubStars} className="shrink-0" />
            </div>
            <div className="flex w-56 shrink-0 items-center border-l px-2">
              <SearchTrigger />
            </div>
          </header>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              ref={scrollRef}
              className="absolute inset-0 overflow-y-auto overscroll-y-contain"
            >
              {children}
            </div>
            <DocsEdgeBlurDefs uid={blurUid} />
            <WindowEdgeFade edge="top" uid={blurUid} />
            <WindowEdgeFade edge="bottom" uid={blurUid} />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </FrameworkProvider>
  )
}
