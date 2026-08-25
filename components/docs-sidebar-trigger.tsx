"use client"

import * as React from "react"
import { RiSideBarLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const CLOSE_MS = 300

export function DocsSidebarTrigger({
  className,
  /** Hide while open; reveal only after the sidebar finish closing. */
  showWhenCollapsed = false,
}: {
  className?: string
  showWhenCollapsed?: boolean
}) {
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar()
  const expanded = isMobile ? openMobile : open
  const [revealed, setRevealed] = React.useState(!expanded)

  React.useEffect(() => {
    if (!showWhenCollapsed) return

    if (expanded) {
      setRevealed(false)
      return
    }

    const id = window.setTimeout(() => setRevealed(true), CLOSE_MS)
    return () => window.clearTimeout(id)
  }, [expanded, showWhenCollapsed])

  const hidden = showWhenCollapsed && !revealed && !isMobile

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(hidden && "hidden", className)}
      aria-label="Toggle navigation menu"
      aria-expanded={expanded}
      aria-controls="docs-sidebar"
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      onClick={toggleSidebar}
    >
      <RiSideBarLine />
    </Button>
  )
}
