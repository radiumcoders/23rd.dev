import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react"

import { cn } from "@/lib/utils"

export function MdxTable({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div
      data-slot="mdx-table"
      className="not-prose my-6 w-full overflow-x-auto rounded-xl border bg-card"
    >
      <table
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

export function MdxTableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b", className)}
      {...props}
    />
  )
}

export function MdxTableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

export function MdxTableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b transition-colors hover:bg-muted/40",
        className
      )}
      {...props}
    />
  )
}

export function MdxTableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-10 px-4 text-left align-middle text-[13px] font-normal text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export function MdxTableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-4 py-2.5 align-middle text-foreground [&_code]:font-mono [&_code]:text-[12.5px]",
        className
      )}
      {...props}
    />
  )
}
