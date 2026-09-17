"use client"

import { Dialog } from "@base-ui/react/dialog"
import { useSearchContext } from "fumadocs-ui/contexts/search"
import { RiSearchLine } from "@remixicon/react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SearchTrigger({ className }: { className?: string }) {
  const { enabled, dialogHandle } = useSearchContext()

  if (!enabled) return null

  return (
    <Dialog.Trigger
      handle={dialogHandle}
      type="button"
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-sm" }),
        "text-muted-foreground hover:text-foreground",
        className
      )}
      aria-label="Open search"
    >
      <RiSearchLine />
    </Dialog.Trigger>
  )
}
