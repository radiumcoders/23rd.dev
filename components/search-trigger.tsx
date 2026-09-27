"use client"

import { Fragment } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { useSearchContext } from "fumadocs-ui/contexts/search"
import { RiSearchLine } from "@remixicon/react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Opens docs search, as an icon button or as an input-like field with its shortcut. */
export function SearchTrigger({
  className,
  variant = "icon",
}: {
  className?: string
  variant?: "icon" | "field"
}) {
  const { enabled, dialogHandle, hotKey } = useSearchContext()

  if (!enabled) return null

  if (variant === "field") {
    return (
      <Dialog.Trigger
        handle={dialogHandle}
        type="button"
        aria-label="Search docs"
        className={cn(
          "flex h-9 w-56 items-center gap-2 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground transition-colors outline-none hover:border-foreground/25 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30",
          className
        )}
      >
        <RiSearchLine className="size-4 shrink-0" />
        <span>Search docs</span>
        {hotKey.length > 0 ? (
          <kbd className="ms-auto inline-flex items-center gap-0.5 font-sans text-xs text-muted-foreground">
            {hotKey.map((key, i) => (
              <Fragment key={i}>{key.display}</Fragment>
            ))}
          </kbd>
        ) : null}
      </Dialog.Trigger>
    )
  }

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
