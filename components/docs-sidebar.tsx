"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  arc,
  cancelFrame,
  frame,
  frameData,
  LayoutGroup,
  motion,
  time,
  useReducedMotion,
  type MotionPath,
  type ValueTransition,
} from "motion/react"

import { DocsSidebarTrigger } from "@/components/docs-sidebar-trigger"
import { Logo } from "@/components/logo"
import { Triad } from "@/components/triad"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { DOCS_HOME } from "@/lib/site"
import { cn } from "@/lib/utils"

type PageNode = { type: "page"; name: React.ReactNode; url: string }
type SeparatorNode = { type: "separator"; name?: React.ReactNode }
type FolderNode = {
  type: "folder"
  name: React.ReactNode
  children: TreeNode[]
  index?: PageNode
  defaultOpen?: boolean
}
type RootNode = { type?: "root"; name: React.ReactNode; children: TreeNode[] }
type TreeNode = PageNode | SeparatorNode | FolderNode

function isPage(node: TreeNode): node is PageNode {
  return node.type === "page"
}

function isFolder(node: TreeNode): node is FolderNode {
  return node.type === "folder"
}

function isSeparator(node: TreeNode): node is SeparatorNode {
  return node.type === "separator"
}

function isCurrent(pathname: string, url: string) {
  return pathname === url
}

const headingClassName =
  "mt-6 mb-1 h-auto truncate px-2 py-1 font-mono text-[10.5px] font-normal tracking-[0.18em] text-muted-foreground/80 uppercase first:mt-0"

const markSpring = {
  type: "spring" as const,
  stiffness: 460,
  damping: 34,
  mass: 0.7,
}

/**
 * The marker bows left, toward the sidebar's edge. Only ~24px sit between
 * it and the scroll area's clip, so the bow is capped in pixels instead of
 * growing with the trip like a plain `arc()` would.
 */
const MARK_BOW = 18
const MARK_STRENGTH = 0.3

const markPath: MotionPath = {
  interpolateProjection(delta) {
    // `translate` is where the marker starts relative to its new row:
    // negative means the old row sat above, so it is travelling down.
    const distance = Math.hypot(delta.x.translate, delta.y.translate)
    // A quadratic arc peaks at half its control-point offset.
    const strength = Math.min(MARK_STRENGTH, (2 * MARK_BOW) / distance)
    // `arc()` bends relative to travel, so pick the side per trip.
    const direction = delta.y.translate < 0 ? "ccw" : "cw"
    return arc({ strength, direction }).interpolateProjection(delta)
  },
  animateVisualElement: (...args) =>
    arc({ strength: MARK_STRENGTH }).animateVisualElement(...args),
}

/** The longest step, in ms, the marker's clock takes in one frame. */
const MARK_MAX_STEP = 1000 / 60

/**
 * Motion's frame loop, on a clock that never jumps more than
 * `MARK_MAX_STEP` per frame. Firefox stalls ~100ms swapping the page right
 * after the marker takes off, and on the real clock the spring spends that
 * stall mid-flight, so its first frame lands well down the arc. Here a
 * stalled frame just pauses the flight.
 */
const markDriver: NonNullable<ValueTransition["driver"]> = (update) => {
  let last: number | undefined
  let clock: number | undefined
  const step = ({ timestamp }: { timestamp: number }) => {
    clock =
      last === undefined || clock === undefined
        ? timestamp
        : clock + Math.min(timestamp - last, MARK_MAX_STEP)
    last = timestamp
    update(clock)
  }

  return {
    start: (keepAlive = true) => frame.update(step, keepAlive),
    stop: () => cancelFrame(step),
    now: () =>
      clock ?? (frameData.isProcessing ? frameData.timestamp : time.now()),
  }
}

/** Room the marker takes before the open page's name. */
const MARK_GUTTER = "translate-x-[21px]"

/**
 * The open page's marker. Every page shares one `layoutId`, so when the
 * open page changes Motion flies the marker along an arc to the new row.
 * It hangs off the `<li>`, not the button, whose `overflow-hidden` would
 * clip it mid-flight.
 */
function ActiveMark() {
  const reduce = useReducedMotion() ?? false

  return (
    <motion.span
      layoutId="docs-sidebar-mark"
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-2 z-10 flex items-center"
      transition={
        reduce
          ? { duration: 0 }
          : { ...markSpring, path: markPath, driver: markDriver }
      }
    >
      <Triad />
    </motion.span>
  )
}

function PageItem({ node, pathname }: { node: PageNode; pathname: string }) {
  const active = isCurrent(pathname, node.url)

  return (
    <SidebarMenuItem>
      {active ? <ActiveMark /> : null}
      <SidebarMenuButton
        render={
          <Link href={node.url} aria-label={String(node.name ?? "Page")} />
        }
        isActive={active}
        className="h-8 gap-0 rounded-lg bg-transparent px-2 font-normal text-foreground/70 transition-colors duration-150 hover:bg-transparent hover:text-foreground active:bg-transparent data-active:bg-transparent data-active:font-medium data-active:text-foreground data-active:hover:bg-transparent"
      >
        {/* The name steps aside for the marker instead of jumping. */}
        <span
          className={cn(
            "min-w-0 truncate transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            active && MARK_GUTTER
          )}
        >
          {node.name}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SeparatorItem({ node }: { node: SeparatorNode }) {
  if (node.name == null || node.name === "") {
    return <SidebarSeparator className="my-2" />
  }

  return (
    <SidebarGroupLabel className={headingClassName}>
      {node.name}
    </SidebarGroupLabel>
  )
}

function folderKey(node: FolderNode, index: number) {
  return node.index?.url ?? `folder-${String(node.name)}-${index}`
}

function NavItems({
  nodes,
  pathname,
}: {
  nodes: TreeNode[]
  pathname: string
}) {
  return nodes.map((node, i) => {
    if (isSeparator(node)) {
      return (
        <SeparatorItem
          key={`sep-${String(node.name ?? "")}-${i}`}
          node={node}
        />
      )
    }

    if (isPage(node)) {
      return <PageItem key={node.url} node={node} pathname={pathname} />
    }

    if (isFolder(node)) {
      const hasSectionedChildren = node.children.some(isSeparator)

      return (
        <React.Fragment key={folderKey(node, i)}>
          {node.index ? (
            <PageItem node={node.index} pathname={pathname} />
          ) : hasSectionedChildren ? null : (
            <SidebarGroupLabel className={headingClassName}>
              {node.name}
            </SidebarGroupLabel>
          )}
          <NavItems nodes={node.children} pathname={pathname} />
        </React.Fragment>
      )
    }

    return null
  })
}

/** Scopes the marker's `layoutId` so the desktop and mobile lists don't share one. */
function NavList({ nodes, pathname }: { nodes: TreeNode[]; pathname: string }) {
  const id = React.useId()

  return (
    <LayoutGroup id={id}>
      <SidebarMenu>
        <NavItems nodes={nodes} pathname={pathname} />
      </SidebarMenu>
    </LayoutGroup>
  )
}

export function DocsSidebar({
  tree,
  className,
  id,
  embedded = false,
}: {
  tree: RootNode
  className?: string
  id?: string
  /** When true, render only nav items (parent supplies Sidebar chrome). */
  embedded?: boolean
}) {
  const pathname = usePathname()

  const nav = (
    <SidebarGroup>
      <SidebarGroupContent>
        <NavList nodes={tree.children} pathname={pathname} />
      </SidebarGroupContent>
    </SidebarGroup>
  )

  if (embedded) {
    return nav
  }

  return (
    <Sidebar
      id={id}
      aria-label="Documentation"
      collapsible="offcanvas"
      className={cn(className)}
    >
      <SidebarHeader className="flex h-14 flex-row items-center gap-2 border-b px-4 py-0">
        <Link
          href={DOCS_HOME}
          className="flex min-w-0 items-center gap-2 text-sm font-medium"
        >
          <Logo className="size-6 shrink-0" />
          <span className="truncate">23rd Docs</span>
        </Link>
        <DocsSidebarTrigger className="ml-auto shrink-0" />
      </SidebarHeader>
      <SidebarContent>{nav}</SidebarContent>
    </Sidebar>
  )
}
