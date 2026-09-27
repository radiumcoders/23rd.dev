"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { animate, useReducedMotion } from "motion/react"

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

/** Room the marker takes before the open page's name. */
const MARK_GUTTER = "translate-x-[21px]"


function PageItem({
  node,
  pathname,
}: {
  node: PageNode
  pathname: string
}) {
  const active = isCurrent(pathname, node.url)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={
          <Link href={node.url} aria-label={String(node.name ?? "Page")} />
        }
        isActive={active}
        data-docs-active={active || undefined}
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
    <SidebarGroupLabel className={headingClassName}>{node.name}</SidebarGroupLabel>
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

/**
 * One marker for the whole list that springs to the open page. It stays
 * mounted across navigations — a shared-layout swap would need both the
 * old and new marker at once, which the page's view transition doesn't
 * reliably allow.
 */
function NavList({
  nodes,
  pathname,
}: {
  nodes: TreeNode[]
  pathname: string
}) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const markRef = React.useRef<HTMLSpanElement>(null)
  const placed = React.useRef(false)
  const reduce = useReducedMotion() ?? false

  React.useLayoutEffect(() => {
    const list = listRef.current
    const mark = markRef.current
    if (!list || !mark) return
    const active = list.querySelector<HTMLElement>("[data-docs-active]")
    if (!active) {
      mark.style.opacity = "0"
      placed.current = false
      return
    }
    const box = list.getBoundingClientRect()
    const row = active.getBoundingClientRect()
    const y = row.top - box.top + (row.height - mark.offsetHeight) / 2
    mark.style.opacity = "1"
    // Land in place on first paint; spring there on every page after.
    const jump = !placed.current || reduce
    placed.current = true
    // Motion places it either way, so it always knows where the marker is.
    const flight = animate(mark, { y }, jump ? { duration: 0 } : markSpring)
    return () => flight.stop()
  }, [pathname, reduce])

  return (
    <div ref={listRef} className="relative">
      <span
        ref={markRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-2 flex opacity-0"
      >
        <Triad />
      </span>
      <SidebarMenu>
        <NavItems nodes={nodes} pathname={pathname} />
      </SidebarMenu>
    </div>
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
          href="/docs"
          className="flex min-w-0 items-center gap-2 text-sm font-medium"
        >
          <Logo className="size-6 shrink-0" cornerRadius={4} />
          <span className="truncate">23rd Docs</span>
        </Link>
        <DocsSidebarTrigger className="ml-auto shrink-0" />
      </SidebarHeader>
      <SidebarContent>{nav}</SidebarContent>
    </Sidebar>
  )
}
