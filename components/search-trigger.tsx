"use client"

import { Dialog } from "@base-ui/react/dialog"
import { useSearchContext } from "fumadocs-ui/contexts/search"
import { RiSearchLine } from "@remixicon/react"

export function SearchTrigger() {
  const { enabled, dialogHandle, hotKey } = useSearchContext()

  if (!enabled) return null

  return (
    <Dialog.Trigger
      handle={dialogHandle}
      type="button"
      className="inline-flex h-8 items-center gap-2 rounded-xl px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      aria-label="Open search"
    >
      <RiSearchLine className="size-4" />
      <span className="hidden sm:inline">Search</span>
      <span className="hidden items-center gap-0.5 sm:inline-flex">
        {hotKey.map((k, i) => (
          <kbd
            key={i}
            className="rounded-md bg-muted px-1.5 py-px font-sans text-[11px] font-medium text-muted-foreground"
          >
            {k.display}
          </kbd>
        ))}
      </span>
    </Dialog.Trigger>
  )
}
