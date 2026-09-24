# Recipes

Install with the commands in SKILL.md. One WebGL canvas per hero. Stacking two full-viewport shaders fights for the GPU and for attention. Put copy in `relative z-10`.

## Quiet landing hero

Use `shader-gradient` when the brief is “soft color behind the headline.”

```tsx
"use client"

import { ShaderGradient } from "@/components/ui/shader-gradient"

export function Hero() {
  return (
    <section className="relative isolate min-h-svh overflow-hidden bg-background">
      <ShaderGradient speed={0.14} interactive />
      <div className="relative z-10 mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          23rd
        </p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight">
          Opinionated components
        </h1>
      </div>
    </section>
  )
}
```

Swap the component, keep the shell:

| Brief                | Component       | Extra props                                       |
| -------------------- | --------------- | ------------------------------------------------- |
| Fire along the floor | `ShaderFire`    | `height={0.45}`                                   |
| Pixel fire           | `ShaderFire`    | `dither pixelSize={1}`                            |
| Blue sky             | `ShaderSky`     | leave `colors` unset                              |
| Rain / dusk sky      | `ShaderSky`     | `theme="dark"` or `html.dark`                     |
| Window glass         | `ShaderSky`     | `glass glassSize={7}`                             |
| ASCII trails         | `AsciiFluid`    | `interactive`                                     |
| CRT score            | `PhosphorScore` | parent `overflow-hidden`; do not expect a `d` key |
| Burst, no mark       | `LogoBurst`     | no children                                       |
| Burst around a logo  | `LogoBurst`     | pass the mark as `children`                       |

Svelte: `import ShaderGradient from "$lib/components/ui/shader-gradient.svelte"` and `class` on the section if you style the component itself.

## Scroll-linked starfield

`radiant-lines` needs the element that actually scrolls.

```tsx
"use client"

import { useRef } from "react"
import { RadiantLines } from "@/components/ui/radiant-lines"

export function Story() {
  const scroller = useRef<HTMLDivElement>(null)
  return (
    <div ref={scroller} className="relative h-svh overflow-y-auto bg-background">
      <RadiantLines
        containerRef={scroller}
        displacement={1.4}
        className="pointer-events-none sticky top-0 h-svh"
      />
      <article className="relative z-10 mx-auto max-w-xl space-y-[70vh] px-6 py-24">
        <h1 className="text-4xl font-medium">Chapter</h1>
        <p>Keep scrolling. Streaks lengthen with speed.</p>
      </article>
    </div>
  )
}
```

Svelte: `bind:this={scroller}` and `container={scroller}`.

## 404

Use `dithered-404` on the not-found route. Do not also mount `shader-fire`.

```tsx
"use client"

import { Dithered404 } from "@/components/ui/dithered-404"

export function NotFound() {
  return (
    <section className="relative isolate min-h-svh overflow-hidden bg-background">
      <Dithered404 interactive dither pixelSize={4} brush={28} />
      <div className="relative z-10 flex min-h-svh flex-col items-center justify-end px-6 pb-16 text-center">
        <a className="text-sm text-muted-foreground underline" href="/">
          Back home
        </a>
      </div>
    </section>
  )
}
```

`dither={false}` keeps the 404 glyph and switches to soft fire. It does not turn the page into `shader-fire`.

## Ribbon footer

`tangle-footer` after the page, not inside the hero.

```tsx
"use client"

import { TangleFooter } from "@/components/ui/tangle-footer"

export function Footer() {
  return (
    <TangleFooter
      seed={23}
      lines={[
        "Ship something opinionated.",
        "Less boilerplate, clearer decisions.",
        "Install what you need and move.",
      ]}
    />
  )
}
```

On a colored parent, set `background="transparent"` so the cream/near-black field does not paint a second plate.

## Rubber overscroll

Nested scroller (docs and previews):

```tsx
"use client"

import { StretchyFooter } from "@/components/ui/stretchy-footer"

export function End() {
  return (
    <StretchyFooter className="h-svh bg-background">
      <main className="min-h-[140%] px-8 py-24">
        <h1 className="text-4xl font-medium">Scroll past the end</h1>
      </main>
    </StretchyFooter>
  )
}
```

Full document:

```tsx
"use client"

import { StretchyFooter } from "@/components/ui/stretchy-footer"

export function Document() {
  return (
    <>
      <div data-stretchy-page>{/* the real page */}</div>
      <StretchyFooter windowScroll />
    </>
  )
}
```

Svelte uses `scrollEl` instead of `scrollRef`.

## Page that leans

```tsx
"use client"

import { Folio } from "@/components/ui/folio"

export function Essay() {
  return (
    <Folio className="h-svh bg-background" blur={4} returnMs={520}>
      <article className="space-y-16 px-10 py-24">
        <h1 className="text-5xl font-medium tracking-tight">One sheet</h1>
        <p className="max-w-md">Scroll. The lean is slight on purpose.</p>
        <div className="h-[80vh]" />
      </article>
    </Folio>
  )
}
```

If the effect is too subtle, say so. Do not invent a `tilt` prop. Issue #29 tracks the Mac trackpad case. `playFolioDemo({ target, holdMs })` only runs the preview on a matching `demoId`.

Window mode:

```tsx
<div data-folio-page>{/* page */}</div>
<Folio windowScroll />
```

## Sticker that peels

```tsx
"use client"

import { ImagePeel } from "@/components/ui/image-peel"

export function Sticker() {
  return (
    <ImagePeel src="/sticker.png" alt="Sticker" side="bottom-right" amount={1}>
      <div className="h-full bg-background" />
    </ImagePeel>
  )
}
```

`side` is the corner that lifts (`bottom-right` curls from that corner). `amount` stops the peel early when it is below `1`. The back of the sticker is white. Inside a frame that scrolls, set `className="h-[240%]"`. There is no progress prop.

## Interactive accents

Color, next to a form or a token:

```tsx
"use client"

import { useState } from "react"
import { GooeyColorPicker, type GooeyColor } from "@/components/ui/gooey-color-picker"

export function Token() {
  const [color, setColor] = useState<GooeyColor>({ h: 210, s: 90, l: 55, a: 1 })
  return (
    <div className="overflow-visible p-16">
      <GooeyColorPicker
        value={color}
        onChange={(next) => setColor(next)}
      />
    </div>
  )
}
```

Leave `value` off for uncontrolled. Passing `value` without updating it locks the picker.

Mascot:

```tsx
"use client"
import { LiveOrb } from "@/components/ui/live-orb"

export function Corner() {
  return <LiveOrb variant="white" size={160} blink />
}
```

Wordmark:

```tsx
"use client"
import { AsciiLogo } from "@/components/ui/ascii-logo"

export function Brand() {
  return (
    <div className="relative h-48 overflow-hidden">
      <AsciiLogo text="23rd" onPhaseChange={(phase) => console.log(phase)} />
    </div>
  )
}
```

`text` longer than 5 characters is truncated.

## Anti-patterns

- `ShaderGradient` as a color control, or `GooeyColorPicker` as a page background.
- `TangleFooter` inside a hero to “add motion.” It is a footer with a fixed semicircle height.
- `StretchyFooter` and `Folio` both wrapping the same scroll. Pick one owner of the scroll.
- Two of `ShaderGradient`, `ShaderFire`, `ShaderSky`, `AsciiFluid` in the same viewport.
- Content as a sibling with no `z-10`, so the canvas eats clicks. Set `pointer-events-none` on the canvas wrapper when the field is decorative (`LogoBurst` click-to-replay is the exception).
- `PhosphorScore` on a light card in dark mode without clipping. The canvas fills `#050505`.
- Assuming `theme="auto"` recolors a shader after you passed `colors`. It will not.
- Adding `variant` to anything but `LiveOrb`.
