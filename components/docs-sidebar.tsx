"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  cancelFrame,
  frame,
  frameData,
  LayoutGroup,
  motion,
  time,
  useReducedMotion,
  type ValueTransition,
} from "motion/react"

import { DocsSidebarTrigger } from "@/components/docs-sidebar-trigger"
import { Logo } from "@/components/logo"
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
  "relative z-10 mt-4 mb-0.5 h-6 truncate rounded-md px-2.5 text-[12.5px] font-medium text-foreground first:mt-0"

/** Settles without overshoot: the chip lands on its row and stays. */
const chipSpring = {
  type: "spring" as const,
  stiffness: 520,
  damping: 44,
  mass: 0.8,
}

/** The longest step, in ms, the chip's clock takes in one frame. */
const CHIP_MAX_STEP = 1000 / 60

/**
 * Motion's frame loop, on a clock that never jumps more than
 * `CHIP_MAX_STEP` per frame. Firefox stalls ~100ms swapping the page right
 * after the chip sets off, and on the real clock the spring spends that
 * stall mid-flight, so its first frame lands most of the way there. Here a
 * stalled frame just pauses the move.
 */
const chipDriver: NonNullable<ValueTransition["driver"]> = (update) => {
  let last: number | undefined
  let clock: number | undefined
  const step = ({ timestamp }: { timestamp: number }) => {
    clock =
      last === undefined || clock === undefined
        ? timestamp
        : clock + Math.min(timestamp - last, CHIP_MAX_STEP)
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

/**
 * The open page's row is a scrap of the sheet the page sits on: the same
 * surface and hairline edge, so the row and the panel beside it read as one
 * thing. Every page shares one `layoutId`, so the chip slides to the new
 * row when the page changes. Hover shows a fainter one.
 *
 * The chip sits at z-0 and every row and heading at z-10. Without that,
 * DOM order decides: sliding down, the chip belongs to a later row and
 * would paint over the text of every row it passes.
 */
function ActiveChip() {
  const reduce = useReducedMotion() ?? false

  return (
    <motion.span
      layoutId="docs-sidebar-chip"
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 rounded-md border border-(--rule) bg-(--sheet)"
      transition={
        reduce ? { duration: 0 } : { ...chipSpring, driver: chipDriver }
      }
    />
  )
}

/** Scrolls the list just enough to show `row`, without moving the page. */
function reveal(row: HTMLElement) {
  const list = row.closest<HTMLElement>('[data-sidebar="content"]')
  if (!list) return
  const top = row.offsetTop - list.offsetTop
  const margin = 32
  if (top < list.scrollTop + margin) {
    list.scrollTop = Math.max(0, top - margin)
  } else if (
    top + row.offsetHeight >
    list.scrollTop + list.clientHeight - margin
  ) {
    list.scrollTop = top + row.offsetHeight - list.clientHeight + margin
  }
}

function PageItem({ node, pathname }: { node: PageNode; pathname: string }) {
  const active = isCurrent(pathname, node.url)
  const rowRef = React.useRef<HTMLLIElement>(null)

  // Opening a page from search or a link keeps its row in sight.
  React.useLayoutEffect(() => {
    if (active && rowRef.current) reveal(rowRef.current)
  }, [active])

  return (
    <SidebarMenuItem ref={rowRef}>
      {active ? <ActiveChip /> : null}
      <SidebarMenuButton
        render={
          <Link href={node.url} aria-label={String(node.name ?? "Page")} />
        }
        isActive={active}
        className={cn(
          "relative z-10 h-7 rounded-md bg-transparent px-2.5 text-[13.5px] font-normal text-muted-foreground transition-colors duration-150",
          "hover:bg-[color-mix(in_oklab,var(--sheet)_70%,transparent)] hover:text-foreground active:bg-transparent",
          "data-active:bg-transparent data-active:font-normal data-active:text-foreground data-active:hover:bg-transparent"
        )}
      >
        <span className="min-w-0 truncate">{node.name}</span>
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

/** Scopes the chip's `layoutId` so the desktop and mobile lists don't share one. */
function NavList({ nodes, pathname }: { nodes: TreeNode[]; pathname: string }) {
  const id = React.useId()

  return (
    <LayoutGroup id={id}>
      <SidebarMenu className="gap-px">
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
