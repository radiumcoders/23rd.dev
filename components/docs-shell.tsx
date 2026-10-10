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
      <SidebarHeader className="gap-4 px-4 pt-6 pb-2">
        <Wordmark />
        <SearchTrigger variant="field" className="w-full" />
      </SidebarHeader>
      <SidebarContent className="px-2 pb-6">
        <DocsSidebar tree={tree} embedded />
      </SidebarContent>
      <SidebarFooter className="mx-4 gap-3 border-t px-0 pt-3 pb-4">
        <div className="flex items-center gap-1">
          <GithubStars stars={githubStars} className="-ms-2.5" />
          <ThemeToggle />
          <Link
            href="/sponsors"
            className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RiHeartFill className="size-3.5" />
            Sponsor
          </Link>
        </div>
        <nav
          aria-label="Secondary"
          className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
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
            className="break-all hover:text-foreground"
          >
            {SUPPORT_EMAIL}
          </a>
        </nav>
      </SidebarFooter>
    </>
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
        className="min-h-svh bg-background"
      >
        <MobileSidebar tree={tree} githubStars={githubStars} />
        <div className="mx-auto flex w-full max-w-[90rem] items-start">
          {/*
           * Motion measures shared layouts in page coordinates, and Next
           * scrolls to the top between its before/after measurements, so
           * a sticky sidebar's marker would fly in from off-screen. A
           * `layoutScroll` fixed box is a scroll root it measures in the
           * viewport instead; `contain: layout` pins that box to the aside.
           */}
          <aside
            aria-label="Documentation"
            className="sticky top-0 hidden h-svh w-60 shrink-0 [contain:layout] md:block"
          >
            <motion.div layoutScroll className="fixed inset-0 flex flex-col">
              <SidebarBody tree={tree} githubStars={githubStars} />
            </motion.div>
          </aside>
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
