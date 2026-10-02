import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type LogoProps = Omit<ComponentProps<"img">, "src" | "alt">

export function Logo({ className, ...props }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static asset; no optimizer on Workers
    <img
      src="/logo.webp"
      alt="23rd logo"
      width={256}
      height={256}
      decoding="async"
      draggable={false}
      className={cn("select-none", className)}
      {...props}
    />
  )
}
