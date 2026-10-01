"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"

/**
 * next-themes reads localStorage / matchMedia in `useState`, so
 * `resolvedTheme` differs between SSR (always unset) and the first
 * client render. Return `"light"` until after hydration, then the
 * real theme. The hydration-only snapshot switches before paint, so
 * dark mode doesn't flash the light palette.
 */
const noopSubscribe = () => () => {}
const onClient = () => true
const onServer = () => false

export function useHydratedTheme(): "light" | "dark" {
  const { resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(noopSubscribe, onClient, onServer)

  if (!mounted) return "light"
  return resolvedTheme === "dark" ? "dark" : "light"
}
