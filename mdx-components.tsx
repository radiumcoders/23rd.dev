import type { MDXComponents } from "mdx/types"
import Link from "next/link"

import { CliBox } from "@/components/docs/cli-box"
import { PreviewBox } from "@/components/docs/preview-box"
import { cn } from "@/lib/utils"

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    CliBox,
    PreviewBox,
    a: ({ href, className, ...props }) => {
      const classNames = cn(
        "font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground",
        className
      )

      if (href?.startsWith("/")) {
        return <Link href={href} className={classNames} {...props} />
      }

      return (
        <a
          href={href}
          className={classNames}
          rel="noreferrer noopener"
          target="_blank"
          {...props}
        />
      )
    },
    h1: ({ className, ...props }) => (
      <h1
        className={cn(
          "scroll-mt-24 text-3xl font-semibold tracking-tight",
          className
        )}
        {...props}
      />
    ),
    h2: ({ className, ...props }) => (
      <h2
        className={cn(
          "mt-10 scroll-mt-24 border-b border-border/80 pb-2 text-xl font-semibold tracking-tight",
          className
        )}
        {...props}
      />
    ),
    h3: ({ className, ...props }) => (
      <h3
        className={cn(
          "mt-8 scroll-mt-24 text-lg font-semibold tracking-tight",
          className
        )}
        {...props}
      />
    ),
    h4: ({ className, ...props }) => (
      <h4
        className={cn(
          "mt-6 scroll-mt-24 text-base font-semibold tracking-tight",
          className
        )}
        {...props}
      />
    ),
    p: ({ className, ...props }) => (
      <p
        className={cn(
          "not-first:mt-4 leading-7 text-muted-foreground",
          className
        )}
        {...props}
      />
    ),
    ul: ({ className, ...props }) => (
      <ul
        className={cn("my-4 ml-5 list-disc text-muted-foreground", className)}
        {...props}
      />
    ),
    ol: ({ className, ...props }) => (
      <ol
        className={cn(
          "my-4 ml-5 list-decimal text-muted-foreground",
          className
        )}
        {...props}
      />
    ),
    li: ({ className, ...props }) => (
      <li className={cn("mt-1.5 leading-7", className)} {...props} />
    ),
    blockquote: ({ className, ...props }) => (
      <blockquote
        className={cn(
          "mt-4 border-l-2 border-border pl-4 text-muted-foreground italic",
          className
        )}
        {...props}
      />
    ),
    code: ({ className, ...props }) => {
      if (typeof props.children !== "string") {
        return <code className={cn(className)} {...props} />
      }

      return (
        <code
          className={cn(
            "rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground",
            className
          )}
          {...props}
        />
      )
    },
    pre: ({ className, ...props }) => (
      <pre
        className={cn(
          "shiki mt-4 overflow-x-auto bg-transparent p-0 text-sm leading-relaxed",
          className
        )}
        {...props}
      />
    ),
    figure: ({ className, ...props }) => (
      <figure className={cn("mt-4", className)} {...props} />
    ),
    figcaption: ({ className, ...props }) => (
      <figcaption
        className={cn(
          "mb-2 text-xs font-medium text-muted-foreground",
          className
        )}
        {...props}
      />
    ),
    table: ({ className, ...props }) => (
      <div className="mt-4 w-full overflow-x-auto">
        <table
          className={cn("w-full text-sm text-muted-foreground", className)}
          {...props}
        />
      </div>
    ),
    th: ({ className, ...props }) => (
      <th
        className={cn(
          "border-b border-border px-3 py-2 text-left font-medium text-foreground",
          className
        )}
        {...props}
      />
    ),
    td: ({ className, ...props }) => (
      <td
        className={cn("border-b border-border px-3 py-2", className)}
        {...props}
      />
    ),
    hr: ({ className, ...props }) => (
      <hr className={cn("my-8 border-border", className)} {...props} />
    ),
    ...components,
  }
}
