"use client"

import dynamic from "next/dynamic"
import type { ComponentType, ReactNode } from "react"

/**
 * One live mount per registry item for the landing monitor. Each engine
 * loads only when its feed is picked, and unmounts (freeing its WebGL
 * context) when another one takes over.
 */
function feed<P extends object>(
  load: () => Promise<ComponentType<P>>
): ComponentType<P> {
  return dynamic(load, { ssr: false, loading: () => null })
}

const AsciiFluid = feed(() =>
  import("@/registry/ascii-fluid/ascii-fluid").then((m) => m.AsciiFluid)
)
const AsciiLogo = feed(() =>
  import("@/registry/ascii-logo/ascii-logo").then((m) => m.AsciiLogo)
)
const Dithered404 = feed(() =>
  import("@/registry/dithered-404/dithered-404").then((m) => m.Dithered404)
)
const GooeyColorPicker = feed(() =>
  import("@/registry/gooey-color-picker/gooey-color-picker").then(
    (m) => m.GooeyColorPicker
  )
)
const LiveOrb = feed(() =>
  import("@/registry/live-orb/live-orb").then((m) => m.LiveOrb)
)
const LogoBurst = feed(() =>
  import("@/registry/logo-burst/logo-burst").then((m) => m.LogoBurst)
)
const PhosphorScore = feed(() =>
  import("@/registry/phosphor-score/phosphor-score").then(
    (m) => m.PhosphorScore
  )
)
const RadiantLines = feed(() =>
  import("@/registry/radiant-lines/radiant-lines").then((m) => m.RadiantLines)
)
const ShaderAnimeFire = feed(() =>
  import("@/registry/shader-anime-fire/shader-anime-fire").then(
    (m) => m.ShaderAnimeFire
  )
)
const ShaderFire = feed(() =>
  import("@/registry/shader-fire/shader-fire").then((m) => m.ShaderFire)
)
const ShaderGradient = feed(() =>
  import("@/registry/shader-gradient/shader-gradient").then(
    (m) => m.ShaderGradient
  )
)
const ShaderSky = feed(() =>
  import("@/registry/shader-sky/shader-sky").then((m) => m.ShaderSky)
)

const FEEDS: Record<string, () => ReactNode> = {
  "ascii-fluid": () => <AsciiFluid className="absolute inset-0" />,
  "ascii-logo": () => <AsciiLogo className="absolute inset-0" />,
  "dithered-404": () => <Dithered404 className="absolute inset-0" />,
  "gooey-color-picker": () => (
    <div className="flex size-full items-center justify-center">
      <GooeyColorPicker defaultValue={{ h: 210, s: 90, l: 55, a: 1 }} />
    </div>
  ),
  "live-orb": () => (
    <div className="flex size-full items-center justify-center bg-[#0A0A0B]">
      <LiveOrb size={220} />
    </div>
  ),
  "logo-burst": () => <LogoBurst />,
  "phosphor-score": () => <PhosphorScore />,
  "radiant-lines": () => <RadiantLines />,
  "shader-anime-fire": () => <ShaderAnimeFire className="absolute inset-0" />,
  "shader-fire": () => <ShaderFire className="absolute inset-0" />,
  "shader-gradient": () => <ShaderGradient className="absolute inset-0" />,
  "shader-sky": () => <ShaderSky className="absolute inset-0" />,
}

/** Renders the live feed for a registry item, or `fallback` if it has none. */
export function MonitorFeed({
  slug,
  fallback,
}: {
  slug: string
  fallback: ReactNode
}) {
  const render = FEEDS[slug]
  return render ? render() : fallback
}
