"use client"

import type { ComponentProps, ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Node } from "fumadocs-core/page-tree"
import { RiMenuLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

function isActive(pathname: string, href: string) {
  if (href === "/docs") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavItem({
  href,
  children,
  pathname,
}: {
  href: string
  children: ReactNode
  pathname: string
}) {
  const active = isActive(pathname, href)

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-muted/60 font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  )
}

function TreeNodes({
  nodes,
  pathname,
}: {
  nodes: Node[]
  pathname: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {nodes.map((node) => {
        if (node.type === "separator") {
          return (
            <div
              key={node.$id ?? String(node.name)}
              className="px-3 pt-4 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {node.name}
            </div>
          )
        }

        if (node.type === "folder") {
          return (
            <div
              key={node.$id ?? String(node.name)}
              className="flex flex-col gap-0.5"
            >
              <div className="px-3 pt-4 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {node.name}
              </div>
              <TreeNodes nodes={node.children} pathname={pathname} />
            </div>
          )
        }

        return (
          <NavItem key={node.url} href={node.url} pathname={pathname}>
            {node.name}
          </NavItem>
        )
      })}
    </div>
  )
}

function SidebarBody({
  tree,
  pathname,
}: {
  tree: { children: Node[]; name?: ReactNode }
  pathname: string
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/80 px-4 py-4">
        <Link href="/docs" className="block">
          <div className="text-sm font-semibold tracking-tight">23rd</div>
          <div className="text-xs text-muted-foreground">Component registry</div>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-2 py-3">
        <TreeNodes nodes={tree.children} pathname={pathname} />
      </ScrollArea>
    </div>
  )
}

export function DocsSidebar({
  tree,
  className,
  ...props
}: {
  tree: { children: Node[]; name?: ReactNode }
} & ComponentProps<"aside">) {
  const pathname = usePathname()

  return (
    <>
      <aside
        className={cn(
          "sticky top-3 m-3 hidden h-[calc(100svh-1.5rem)] w-60 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-background lg:block",
          className
        )}
        {...props}
      >
        <SidebarBody tree={tree} pathname={pathname} />
      </aside>

      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/80 bg-background px-4 py-3 lg:hidden">
        <div>
          <div className="text-sm font-semibold tracking-tight">23rd</div>
          <div className="text-xs text-muted-foreground">Docs</div>
        </div>
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Open navigation"
              />
            }
          >
            <RiMenuLine />
          </SheetTrigger>
          <SheetContent side="left" className="w-[18rem] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Documentation</SheetTitle>
            </SheetHeader>
            <SidebarBody tree={tree} pathname={pathname} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
