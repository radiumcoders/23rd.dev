"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { useSearchContext } from "fumadocs-ui/contexts/search"
import { RiSearchLine } from "@remixicon/react"

import { cn } from "@/lib/utils"

export function SearchTrigger({ className }: { className?: string }) {
  const { enabled, dialogHandle, hotKey } = useSearchContext()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!enabled) return null

  return (
    <Dialog.Trigger
      handle={dialogHandle}
      type="button"
      className={cn(
        "flex h-8 w-full min-w-0 items-center gap-2 rounded-2xl bg-input/50 px-2.5 text-sm text-muted-foreground outline-none transition-[color,box-shadow] hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
        className
      )}
      aria-label="Open search"
    >
      <RiSearchLine className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">Search</span>
      {mounted ? (
        <span className="hidden shrink-0 items-center gap-0.5 sm:inline-flex">
          {hotKey.map((k, i) => (
            <kbd
              key={i}
              className="rounded-md bg-muted px-1.5 py-px font-sans text-[11px] font-medium text-muted-foreground"
            >
              {k.display}
            </kbd>
          ))}
        </span>
      ) : (
        <span className="hidden h-[18px] w-14 shrink-0 sm:inline-flex" />
      )}
    </Dialog.Trigger>
  )
}
