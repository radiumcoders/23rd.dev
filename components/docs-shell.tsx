"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { RiHeartFill } from "@remixicon/react"
import { motion } from "motion/react"

import { DocsSidebar } from "@/components/docs-sidebar"
import { DocsSidebarTrigger } from "@/components/docs-sidebar-trigger"
import { GithubStars } from "@/components/github-stars"
import { Logo } from "@/components/logo"
import { SearchTrigger } from "@/components/search-trigger"
import { ThemeToggle } from "@/components/theme-toggle"
import { FOOTER_LINKS, SUPPORT_EMAIL } from "@/lib/site"
import { FrameworkProvider } from "@/lib/framework"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  useSidebar,
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

function Wordmark() {
  return (
    <Link
      href="/"
      className="flex min-w-0 items-center gap-2.5 rounded-md text-[15px] font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Logo className="size-6 shrink-0" />
      <span className="truncate">23rd</span>
    </Link>
  )
}

/** Logo, search, page tree, and the footer row, shared by desktop and the mobile sheet. */
function SidebarBody({
  tree,
  githubStars,
}: {
  tree: RootNode
  githubStars: number | null
}) {
  return (
    <>
      <SidebarHeader className="gap-4 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2 ps-1">
          <Wordmark />
          <DocsSidebarTrigger />
        </div>
        <SearchTrigger variant="field" className="w-full" />
      </SidebarHeader>
      <SidebarContent className="[mask-image:linear-gradient(to_bottom,#000_calc(100%-2rem),transparent)] px-2 pb-8">
        <DocsSidebar tree={tree} embedded />
        {/* Fine print scrolls with the list, so the pinned row stays one line. */}
        <nav
          aria-label="Secondary"
          className="mt-auto flex flex-wrap gap-x-3 gap-y-1 px-4 pt-6 text-xs text-muted-foreground/75"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="min-w-0 truncate hover:text-foreground"
          >
            {SUPPORT_EMAIL}
          </a>
        </nav>
      </SidebarContent>
      <SidebarFooter className="mx-3 flex-row items-center gap-1 border-t px-0 py-2.5">
        <GithubStars stars={githubStars} />
        <ThemeToggle />
        <Link
          href="/sponsors"
          className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <RiHeartFill className="size-3.5" />
          Sponsor
        </Link>
      </SidebarFooter>
    </>
  )
}

/**
 * From `md` up the page tree sits at the left. Its toggle (or Ctrl+B)
 * folds it into a slim rail that keeps only the toggle, in the same spot,
 * so a component's stage can take the width.
 */
function DesktopSidebar({
  tree,
  githubStars,
}: {
  tree: RootNode
  githubStars: number | null
}) {
  const { open } = useSidebar()

  return (
    <aside
      aria-label="Documentation"
      data-state={open ? "expanded" : "collapsed"}
      className={cn(
        // The width snaps rather than animates: easing it would resize the
        // live preview beside it on every frame, and each resize redraws
        // (or re-lays out) the component. Only the contents fade.
        "sticky top-0 hidden h-svh shrink-0 [contain:layout] md:block",
        open ? "w-60" : "w-14"
      )}
    >
      {/*
       * Motion measures shared layouts in page coordinates, and Next
       * scrolls to the top between its before/after measurements, so
       * a sticky sidebar's marker would fly in from off-screen. A
       * `layoutScroll` fixed box is a scroll root it measures in the
       * viewport instead; `contain: layout` pins that box to the aside.
       */}
      <motion.div
        layoutScroll
        className="fixed inset-0 flex flex-col overflow-hidden"
      >
        <div
          inert={!open}
          className={cn(
            "flex h-full w-60 flex-col transition-opacity duration-200",
            !open && "opacity-0"
          )}
        >
          <SidebarBody tree={tree} githubStars={githubStars} />
        </div>
        {open ? null : (
          <div className="absolute top-3 left-3">
            <DocsSidebarTrigger />
          </div>
        )}
      </motion.div>
    </aside>
  )
}

/** Below `md` the page tree lives in a sheet opened from the top bar. */
function MobileSidebar({
  tree,
  githubStars,
}: {
  tree: RootNode
  githubStars: number | null
}) {
  const { isMobile } = useSidebar()
  if (!isMobile) return null

  return (
    <Sidebar id="docs-sidebar" aria-label="Documentation">
      <SidebarBody tree={tree} githubStars={githubStars} />
    </Sidebar>
  )
}

/**
 * Docs chrome: page tree on the bench at the left, the page on an inset
 * sheet (rendered by the page itself, so its table of contents can sit on
 * the bench to the right).
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
      <SidebarProvider
        style={sidebarTokens}
        className="docs-flip min-h-svh bg-background"
      >
        <MobileSidebar tree={tree} githubStars={githubStars} />
        <div className="flex w-full items-start">
          <DesktopSidebar tree={tree} githubStars={githubStars} />
          <main className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 items-center gap-2 px-3 md:hidden">
              <DocsSidebarTrigger />
              <Wordmark />
              <div className="flex-1" />
              <SearchTrigger />
              <ThemeToggle />
            </header>
            {children}
          </main>
        </div>
      </SidebarProvider>
    </FrameworkProvider>
  )
}
