"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FRAMEWORKS, useFramework, type Framework } from "@/lib/framework"

const SELECT_ITEMS = FRAMEWORKS.map(({ value, label }) => ({
  value,
  label,
}))

export function FrameworkSelect({ className }: { className?: string }) {
  const { framework, setFramework } = useFramework()

  function onChange(value: string | null) {
    if (value === "react" || value === "svelte") {
      setFramework(value)
    }
  }

  return (
    <Select
      value={framework}
      onValueChange={onChange}
      items={SELECT_ITEMS as { value: Framework; label: string }[]}
    >
      <SelectTrigger
        size="sm"
        aria-label="Framework"
        className={
          className ??
          "h-auto min-h-0 w-auto justify-start gap-0.5 border-transparent bg-transparent px-0 py-0 text-sm font-medium text-foreground/90 shadow-none hover:bg-transparent focus-visible:border-transparent focus-visible:ring-0"
        }
      >
        <SelectValue className="flex-none" />
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false}>
        <SelectGroup>
          {FRAMEWORKS.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
