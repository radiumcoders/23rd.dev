"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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

function PageItem({
  node,
  pathname,
  indented = false,
}: {
  node: PageNode
  pathname: string
  indented?: boolean
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={
          <Link href={node.url} aria-label={String(node.name ?? "Page")} />
        }
        isActive={isCurrent(pathname, node.url)}
        className={cn(
          "hover:bg-foreground/5 data-active:bg-foreground/10",
          indented && "pl-6"
        )}
      >
        <span className="truncate">{node.name}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SeparatorItem({ node }: { node: SeparatorNode }) {
  if (node.name == null || node.name === "") {
    return <SidebarSeparator className="my-2" />
  }

  return (
    <SidebarGroupLabel className="mt-3 truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:mt-0">
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
  indented = false,
}: {
  nodes: TreeNode[]
  pathname: string
  indented?: boolean
}) {
  return nodes.map((node, i) => {
    if (isPage(node)) {
      return (
        <PageItem
          key={node.url}
          node={node}
          pathname={pathname}
          indented={indented}
        />
      )
    }

    if (isSeparator(node)) {
      return (
        <SeparatorItem
          key={`sep-${String(node.name ?? "")}-${i}`}
          node={node}
        />
      )
    }

    if (isFolder(node)) {
      const hasSectionedChildren = node.children.some(isSeparator)

      return (
        <React.Fragment key={folderKey(node, i)}>
          {node.index ? (
            <PageItem node={node.index} pathname={pathname} />
          ) : hasSectionedChildren ? null : (
            <SidebarGroupLabel>{node.name}</SidebarGroupLabel>
          )}
          <NavItems
            nodes={node.children}
            pathname={pathname}
            indented={Boolean(node.index) || !hasSectionedChildren}
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
  return (
    <SidebarMenu>
      <NavItems nodes={nodes} pathname={pathname} indented={indented} />
    </SidebarMenu>
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
      variant="floating"
      collapsible="offcanvas"
      className={cn(className)}
    >
      <SidebarHeader className="flex flex-row items-center gap-2 px-4 pt-5 pb-2">
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
