import { cn } from "@/lib/utils"

/**
 * Three subpixel bars. Marks the component that is currently "on" — the open
 * page in the sidebar, the feed on the docs monitor.
 */
export function Triad({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      data-slot="triad"
      className={cn("inline-flex h-2.5 shrink-0 gap-px", className)}
    >
      <span className="w-[3px] rounded-[1px] bg-(--triad-r)" />
      <span className="w-[3px] rounded-[1px] bg-(--triad-g)" />
      <span className="w-[3px] rounded-[1px] bg-(--triad-b)" />
    </span>
  )
}
