"use client"

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import Link from "next/link"
import { RiHeartFill } from "@remixicon/react"
import { motion, useReducedMotion } from "motion/react"

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

/** The sidebar's width in px; `w-60`. */
const SIDEBAR_WIDTH = 240
const SLIDE = {
  duration: 320,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
}

type Phase = "open" | "closing" | "closed" | "opening"

/**
 * From `md` up the page tree sits at the left, and its toggle (or Ctrl+B)
 * folds it away entirely, leaving a floating button over the corner of
 * the page so a component's stage can take the full width.
 *
 * Folding never eases the width: that would resize the live preview on
 * every frame, and each resize redraws (or re-lays out) the component.
 * Instead the width changes once and the page glides by transform. Closing
 * snaps the width first and slides the page back from where it was;
 * opening slides the page aside first and snaps the width as it lands.
 * Either way the preview is resized once, while it is moving.
 */
function DesktopFrame({
  tree,
  githubStars,
  children,
}: {
  tree: RootNode
  githubStars: number | null
  children: ReactNode
}) {
  const { open, isMobile } = useSidebar()
  // Below `md` the frame is hidden and the mobile sheet takes over.
  const instant = (useReducedMotion() ?? false) || isMobile
  const [phase, setPhase] = useState<Phase>(open ? "open" : "closed")
  const panelRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  // Follow the toggle during render, so the first frame is already right.
  if (open && (phase === "closed" || phase === "closing")) {
    setPhase(instant ? "open" : "opening")
  } else if (!open && (phase === "open" || phase === "opening")) {
    setPhase(instant ? "closed" : "closing")
  }

  useLayoutEffect(() => {
    const panel = panelRef.current
    const main = mainRef.current
    if (!panel || !main) return
    // A toggle mid-slide starts the new slide from rest.
    for (const el of [panel, main]) {
      for (const a of el.getAnimations()) a.cancel()
    }
    const shift = `translateX(${SIDEBAR_WIDTH}px)`
    if (phase === "opening") {
      panel.animate(
        [{ transform: "translateX(-100%)" }, { transform: "none" }],
        SLIDE
      )
      const slide = main.animate(
        [{ transform: "none" }, { transform: shift }],
        {
          ...SLIDE,
          fill: "forwards",
        }
      )
      slide.onfinish = () => setPhase("open")
    } else if (phase === "closing") {
      main.animate([{ transform: shift }, { transform: "none" }], SLIDE)
      const slide = panel.animate(
        [{ transform: "none" }, { transform: "translateX(-100%)" }],
        { ...SLIDE, fill: "forwards" }
      )
      slide.onfinish = () => setPhase("closed")
    }
  }, [phase])

  const panelShown = phase !== "closed"

  return (
    // `clip`, not `hidden`: it trims the page while it slides past the
    // right edge without becoming a scroll box, so `sticky` keeps working.
    <div className="flex w-full items-start overflow-x-clip">
      <aside
        aria-label="Documentation"
        data-state={open ? "expanded" : "collapsed"}
        className={cn(
          "sticky top-0 z-20 hidden h-svh shrink-0 [contain:layout] md:block",
          phase === "open" ? "w-60" : "w-0"
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
          ref={panelRef}
          layoutScroll
          inert={!open}
          className={cn(
            "fixed inset-y-0 left-0 flex w-60 flex-col overflow-hidden bg-background",
            !panelShown && "invisible"
          )}
        >
          <SidebarBody tree={tree} githubStars={githubStars} />
        </motion.div>
      </aside>
      {phase === "closed" ? (
        <div className="fixed top-5 left-5 z-30 hidden animate-in duration-200 zoom-in-90 fade-in md:block">
          <DocsSidebarTrigger className="bg-background/85 shadow-sm ring-1 ring-border backdrop-blur-md hover:bg-background" />
        </div>
      ) : null}
      <main ref={mainRef} className="flex min-w-0 flex-1 flex-col">
        {children}
      </main>
    </div>
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
        <DesktopFrame tree={tree} githubStars={githubStars}>
          <header className="flex h-14 items-center gap-2 px-3 md:hidden">
            <DocsSidebarTrigger />
            <Wordmark />
            <div className="flex-1" />
            <SearchTrigger />
            <ThemeToggle />
          </header>
          {children}
        </DesktopFrame>
      </SidebarProvider>
    </FrameworkProvider>
  )
}
