"use client"

import { useEffect, useRef, useState } from "react"
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiClaudeFill,
  RiFileCopyLine,
  RiGithubFill,
  RiOpenaiFill,
} from "@remixicon/react"
import { toast } from "sonner"

import { trackEvent } from "@/components/tracwell-analytics"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const actionClassName =
  "h-8 gap-1.5 rounded-lg border-border bg-card px-2.5 text-[13px] font-normal text-muted-foreground shadow-none hover:bg-card hover:text-foreground dark:bg-card dark:hover:bg-card"

/**
 * Title-row actions on a docs page: copy the page as Markdown, or open it in
 * an assistant or on GitHub.
 */
export function PageActions({
  markdown,
  pageUrl,
  sourceUrl,
  className,
}: {
  markdown: string
  /** Absolute URL of this docs page. */
  pageUrl: string
  /** GitHub URL of the page's MDX source. */
  sourceUrl: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      toast.success("Copied page as Markdown")
      trackEvent("code_copied", { source: "page_markdown" })
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("Couldn’t copy Markdown")
    }
  }

  const prompt = encodeURIComponent(
    `Read ${pageUrl} so I can ask questions about it.`
  )

  const destinations = [
    {
      label: "Open in ChatGPT",
      href: `https://chatgpt.com/?hints=search&q=${prompt}`,
      Icon: RiOpenaiFill,
    },
    {
      label: "Open in Claude",
      href: `https://claude.ai/new?q=${prompt}`,
      Icon: RiClaudeFill,
    },
    {
      label: "View source on GitHub",
      href: sourceUrl,
      Icon: RiGithubFill,
    },
  ]

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={onCopy}
        className={actionClassName}
      >
        {copied ? (
          <RiCheckLine className="size-3.5" />
        ) : (
          <RiFileCopyLine className="size-3.5" />
        )}
        {copied ? "Copied" : "Copy Markdown"}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "outline" }),
            actionClassName,
            "pe-2"
          )}
        >
          Open
          <RiArrowDownSLine className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-auto min-w-52 rounded-xl"
        >
          {destinations.map(({ label, href, Icon }) => (
            <DropdownMenuItem
              key={label}
              className="rounded-lg"
              render={<a href={href} target="_blank" rel="noreferrer" />}
            >
              <Icon className="text-muted-foreground" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
