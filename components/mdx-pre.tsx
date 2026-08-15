"use client"

import { useRef, type ComponentProps } from "react"
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock"

import { CopyButton } from "@/components/copy-button"
import { cn } from "@/lib/utils"

function codeFromFigure(figure: HTMLElement | null) {
  const pre = figure?.getElementsByTagName("pre").item(0)
  if (!pre) return ""
  const clone = pre.cloneNode(true) as HTMLElement
  clone.querySelectorAll(".nd-copy-ignore").forEach((node) => {
    node.replaceWith("\n")
  })
  return clone.textContent ?? ""
}

export function MdxPre({
  className,
  children,
  allowCopy = true,
  ...props
}: ComponentProps<typeof CodeBlock>) {
  const figureRef = useRef<HTMLElement>(null)
  const canCopy = allowCopy !== false && allowCopy !== "false"

  return (
    <CodeBlock
      {...props}
      ref={figureRef}
      allowCopy={false}
      Actions={({ className: actionsClassName }) => (
        <div className={cn("empty:hidden", actionsClassName)}>
          {canCopy ? (
            <CopyButton
              size="icon-xs"
              label="Copy code"
              getText={() => codeFromFigure(figureRef.current)}
            />
          ) : null}
        </div>
      )}
      className={cn("bg-transparent! shadow-none!", className)}
    >
      <Pre>{children}</Pre>
    </CodeBlock>
  )
}
