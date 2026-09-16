"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"

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
  "mt-4 mb-0.5 h-auto px-3 py-1 truncate text-[11px] font-medium tracking-[0.16em] text-foreground/35 uppercase first:mt-0"

const markSpring = {
  type: "spring" as const,
  stiffness: 460,
  damping: 34,
  mass: 0.7,
}

function DashMark({
  layoutId,
  opacity,
}: {
  layoutId: string
  opacity: number
}) {
  const reduce = useReducedMotion() ?? false

  return (
    <motion.span
      layoutId={layoutId}
      aria-hidden
      className="pointer-events-none ml-2 h-px min-w-3 flex-1 bg-[repeating-linear-gradient(90deg,currentColor_0_5px,transparent_5px_8px)]"
      initial={false}
      animate={{ opacity }}
      transition={reduce ? { duration: 0 } : markSpring}
    />
  )
}

type TabHover = {
  hoveredUrl: string | null
  onHover: (url: string) => void
}

function PageItem({
  node,
  pathname,
  indented = false,
  hoveredUrl,
  onHover,
}: {
  node: PageNode
  pathname: string
  indented?: boolean
} & TabHover) {
  const active = isCurrent(pathname, node.url)
  const showHover = hoveredUrl === node.url && !active

  return (
    <SidebarMenuItem
      onPointerEnter={() => onHover(node.url)}
      onMouseEnter={() => onHover(node.url)}
    >
      <SidebarMenuButton
        render={
          <Link href={node.url} aria-label={String(node.name ?? "Page")} />
        }
        isActive={active}
        className={cn(
          "h-8 gap-0 overflow-visible rounded-lg bg-transparent font-normal text-foreground/45 transition-colors duration-200 hover:bg-transparent hover:text-foreground/80 active:bg-transparent data-active:bg-transparent data-active:font-normal data-active:text-foreground data-active:hover:bg-transparent data-active:hover:text-foreground [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip",
          indented && "pl-6"
        )}
      >
        <span className="min-w-0 truncate">{node.name}</span>
        {active ? (
          <DashMark layoutId="docs-sidebar-selected-dashes" opacity={0.85} />
        ) : null}
        {showHover ? (
          <DashMark layoutId="docs-sidebar-hover-dashes" opacity={0.4} />
        ) : null}
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
  indented = false,
  hoveredUrl,
  onHover,
}: {
  nodes: TreeNode[]
  pathname: string
  indented?: boolean
} & TabHover) {
  let inSection = indented

  return nodes.map((node, i) => {
    if (isSeparator(node)) {
      if (node.name != null && node.name !== "") {
        inSection = true
      }
      return (
        <SeparatorItem
          key={`sep-${String(node.name ?? "")}-${i}`}
          node={node}
        />
      )
    }

    if (isPage(node)) {
      return (
        <PageItem
          key={node.url}
          node={node}
          pathname={pathname}
          indented={inSection}
          hoveredUrl={hoveredUrl}
          onHover={onHover}
        />
      )
    }

    if (isFolder(node)) {
      const hasSectionedChildren = node.children.some(isSeparator)

      return (
        <React.Fragment key={folderKey(node, i)}>
          {node.index ? (
            <PageItem
              node={node.index}
              pathname={pathname}
              indented={inSection}
              hoveredUrl={hoveredUrl}
              onHover={onHover}
            />
          ) : hasSectionedChildren ? null : (
            <SidebarGroupLabel className={headingClassName}>
              {node.name}
            </SidebarGroupLabel>
          )}
          <NavItems
            nodes={node.children}
            pathname={pathname}
            indented={inSection || hasSectionedChildren || !node.index}
            hoveredUrl={hoveredUrl}
            onHover={onHover}
          />
        </React.Fragment>
      )
    }

    return null
  })
}

function NavList({
  nodes,
  pathname,
  indented = false,
}: {
  nodes: TreeNode[]
  pathname: string
  indented?: boolean
}) {
  const [hoveredUrl, setHoveredUrl] = React.useState<string | null>(null)

  return (
    <LayoutGroup id="docs-sidebar-tabs">
      <SidebarMenu
        onPointerLeave={() => setHoveredUrl(null)}
        onMouseLeave={() => setHoveredUrl(null)}
      >
        <NavItems
          nodes={nodes}
          pathname={pathname}
          indented={indented}
          hoveredUrl={hoveredUrl}
          onHover={(url) => setHoveredUrl(url)}
        />
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
