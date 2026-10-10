"use client"

import { lazy, Suspense, type ComponentType } from "react"

/**
 * Every docs page renders through one route, so a demo imported statically
 * by its MDX page would land in that route's bundle, and every docs page
 * would download all of them. Each demo here is its own chunk, loaded only
 * on the page that renders it. (React.lazy rather than next/dynamic: under
 * Turbopack, next/dynamic preloads chunk names that the build never writes.)
 */
function lazyDemo<P extends object>(load: () => Promise<ComponentType<P>>) {
  const Demo = lazy(async () => ({ default: await load() }))
  return function LazyDemo(props: P) {
    return (
      <Suspense fallback={null}>
        <Demo {...props} />
      </Suspense>
    )
  }
}

export const AsciiFluidDemo = lazyDemo(() =>
  import("@/registry/ascii-fluid/ascii-fluid-demo").then(
    (m) => m.AsciiFluidDemo
  )
)

export const AsciiLogoDemo = lazyDemo(() =>
  import("@/registry/ascii-logo/ascii-logo-demo").then((m) => m.AsciiLogoDemo)
)

export const Dithered404Demo = lazyDemo(() =>
  import("@/registry/dithered-404/dithered-404-demo").then(
    (m) => m.Dithered404Demo
  )
)

export const FolioDemo = lazyDemo(() =>
  import("@/registry/folio/folio-demo").then((m) => m.FolioDemo)
)

export const GooeyColorPicker = lazyDemo(() =>
  import("@/registry/gooey-color-picker/gooey-color-picker").then(
    (m) => m.GooeyColorPicker
  )
)

export const LiveOrbDemo = lazyDemo(() =>
  import("@/registry/live-orb/live-orb-demo").then((m) => m.LiveOrbDemo)
)

export const LogoBurstDemo = lazyDemo(() =>
  import("@/registry/logo-burst/logo-burst-demo").then((m) => m.LogoBurstDemo)
)

export const PhosphorScoreDemo = lazyDemo(() =>
  import("@/registry/phosphor-score/phosphor-score-demo").then(
    (m) => m.PhosphorScoreDemo
  )
)

export const RadiantLinesDemo = lazyDemo(() =>
  import("@/registry/radiant-lines/radiant-lines-demo").then(
    (m) => m.RadiantLinesDemo
  )
)

export const ShaderAnimeFireDemo = lazyDemo(() =>
  import("@/registry/shader-anime-fire/shader-anime-fire-demo").then(
    (m) => m.ShaderAnimeFireDemo
  )
)

export const ShaderFireDemo = lazyDemo(() =>
  import("@/registry/shader-fire/shader-fire-demo").then(
    (m) => m.ShaderFireDemo
  )
)

export const ShaderGradientDemo = lazyDemo(() =>
  import("@/registry/shader-gradient/shader-gradient-demo").then(
    (m) => m.ShaderGradientDemo
  )
)

export const ShaderMetalDemo = lazyDemo(() =>
  import("@/registry/shader-metal/shader-metal-demo").then(
    (m) => m.ShaderMetalDemo
  )
)

export const ShaderSkyDemo = lazyDemo(() =>
  import("@/registry/shader-sky/shader-sky-demo").then((m) => m.ShaderSkyDemo)
)

export const StretchyFooterDemo = lazyDemo(() =>
  import("@/registry/stretchy-footer/stretchy-footer-demo").then(
    (m) => m.StretchyFooterDemo
  )
)

export const TypewriterDemo = lazyDemo(() =>
  import("@/registry/typewriter/typewriter-demo").then((m) => m.TypewriterDemo)
)
