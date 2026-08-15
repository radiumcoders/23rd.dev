"use client"

import { useLayoutEffect, useState } from "react"
import { useTheme } from "next-themes"

/**
 * next-themes reads localStorage / matchMedia in `useState`, so
 * `resolvedTheme` differs between SSR (always unset) and the first
 * client render. Return `"light"` until after hydration, then the
 * real theme — `useLayoutEffect` swaps before paint so dark mode
 * doesn't flash the light palette.
 */
export function useHydratedTheme(): "light" | "dark" {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return "light"
  return resolvedTheme === "dark" ? "dark" : "light"
}
