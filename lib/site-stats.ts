import registry from "@/registry.json"

export const COMPONENT_COUNT = registry.include.length

export function formatExactCount(value: number | null): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("en").format(value)
}

export function formatPercent(value: number | null): string {
  if (value == null) return "—"
  return `${Math.round(value)}%`
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—"
  const rounded = Math.max(0, Math.round(seconds))
  if (rounded < 60) return `${rounded}s`
  const minutes = Math.floor(rounded / 60)
  const remainder = rounded % 60
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`
}

export function formatViewsPerVisit(value: number | null): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
  }).format(value)
}
