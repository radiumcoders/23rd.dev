"use client"

import { useEffect, useRef, useState } from "react"
import { RiCheckLine, RiFileCopyLine } from "@remixicon/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CopyButtonSize = "xs" | "icon-xs" | "icon-sm"

export type CopyButtonProps = {
  text?: string
  getText?: () => string
  label?: string
  successMessage?: string
  errorMessage?: string
  size?: CopyButtonSize
  className?: string
}

export function CopyButton({
  text,
  getText,
  label = "Copy",
  successMessage = "Copied to clipboard",
  errorMessage = "Couldn’t copy",
  size = "icon-sm",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const iconOnly = size === "icon-xs" || size === "icon-sm"

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  async function onCopy() {
    const value = text ?? getText?.() ?? ""
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      setCopied(true)
      toast.success(successMessage)
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error(errorMessage)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      aria-label={copied ? "Copied" : label}
      onClick={onCopy}
      className={cn(
        "text-muted-foreground hover:text-foreground",
        iconOnly && "shrink-0",
        className
      )}
    >
      {copied ? (
        <RiCheckLine data-icon={iconOnly ? undefined : "inline-start"} />
      ) : (
        <RiFileCopyLine data-icon={iconOnly ? undefined : "inline-start"} />
      )}
      {iconOnly ? null : copied ? "Copied" : label}
    </Button>
  )
}

export default CopyButton
