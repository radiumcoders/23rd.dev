"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"

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

/** The open page's marker; slides between items as you navigate. */
function ActiveTriad() {
  const reduce = useReducedMotion() ?? false

  return (
    <motion.span
      layoutId="docs-sidebar-active"
      aria-hidden
      className="me-2.5 flex shrink-0"
      transition={reduce ? { duration: 0 } : markSpring}
    >
      <Triad />
    </motion.span>
  )
}

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
        className="h-8 gap-0 rounded-lg bg-transparent px-2 font-normal text-foreground/70 transition-colors duration-150 hover:bg-transparent hover:text-foreground active:bg-transparent data-active:bg-transparent data-active:font-medium data-active:text-foreground data-active:hover:bg-transparent"
      >
        {active ? <ActiveTriad /> : null}
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

function NavList({
  nodes,
  pathname,
}: {
  nodes: TreeNode[]
  pathname: string
}) {
  return (
    <LayoutGroup id="docs-sidebar-tabs">
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
