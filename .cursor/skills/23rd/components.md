# Component guide

React snippets are the primary examples. Svelte parity: same props, `class` instead of `className`, default import from `$lib/components/ui/<name>.svelte`, `children` is a snippet, `scrollRef` is `scrollEl`, `containerRef` is `container`. Read [apis.md](apis.md) before adding a prop.

Shared shell for fill-the-parent pieces:

```tsx
<div className="relative isolate h-svh overflow-hidden bg-background">
  {/* component */}
  <div className="relative z-10">{/* content */}</div>
</div>
```

## logo-burst

Background. Hair-line tentacles explode from the origin, then breathe. Mount plays once.

Best fit: a logo moment, an empty state that should feel like a burst, a mark sitting in a hole in the lines.

Not this: a wordmark made of ASCII (`ascii-logo`), a scroll starfield (`radiant-lines`), a soft wash (`shader-gradient`).

Deps: none. Key props: `color`, `theme` (`auto`), `tentacleCount` (260), `coreSize` (0; measured from `children` when you overlay a mark), `radius` (0.48), `duration` (1.35s), `seed` (23), `particleRatio` (0.62), `breathe` (true), `replayKey`, `replayOnClick` (true), `children`, `label`.

```tsx
"use client"
import { LogoBurst } from "@/components/ui/logo-burst"

export function Mark() {
  return (
    <div className="relative h-svh w-full bg-background">
      <LogoBurst>
        <img src="/mark.svg" alt="" className="size-20 rounded-[22%]" />
      </LogoBurst>
    </div>
  )
}
```

Pitfalls: `color` overrides theme ink. Light filament is `#3F3F46`, dark is `#D6D2CA`. `DEFAULT_COLOR` is deprecated (it is the dark color). Reduced motion draws the settled field and skips the explosion. Click replays unless `replayOnClick={false}`.

## phosphor-score

Background. Two vertical staves. Notes fall, bloom at the playhead, then flare. Not a piano roll.

Best fit: a music, broadcast, or terminal hero that should feel like a CRT score.

Not this: fire (`shader-fire`), sky (`shader-sky`), a footer.

Deps: none. Key props: `color`, `glow` (50, range 0–100), `speed` (1.35 beats/s), `density` (1), `sway` (true), `seed` (23), `theme`.

```tsx
"use client"
import { PhosphorScore } from "@/components/ui/phosphor-score"

export function Score() {
  return (
    <div className="relative h-svh w-full overflow-hidden bg-background">
      <PhosphorScore />
    </div>
  )
}
```

Pitfalls: omit `color` so theme can swap (dark `#4DFF6A` on `#050505`, light `#147A3A` on a transparent canvas). Dark mode paints a solid `#050505` rectangle — clip the parent. Issue [#28](https://github.com/radiumcoders/23rd.dev/issues/28) is that square edge. The docs sentence “Press d to toggle” is not implemented on the component or the demo. Do not add a `d` shortcut.

## radiant-lines

Background. Colored streaks radiate from center. Scroll velocity warps them (down inward, up outward).

Best fit: a long scrolling page that should feel like hyperspace. Not a static poster.

Not this: `logo-burst` (one-shot explosion), `shader-gradient` (no scroll coupling).

Deps: none. Key props: `colors`, `starCount` (420), `displacement` (1), `containerRef` / Svelte `container`.

```tsx
"use client"
import { useRef } from "react"
import { RadiantLines } from "@/components/ui/radiant-lines"

export function Warp() {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} className="relative h-svh overflow-y-auto">
      <RadiantLines containerRef={ref} className="sticky top-0 h-svh" />
      <div className="relative z-10 p-10">Your content</div>
    </div>
  )
}
```

Pitfalls: omit `containerRef` only when the window scrolls. `displacement` scales travel; `1` matches the original step. Canvas is transparent over `bg-background`. Stock colors: `#FF6B4A`, `#2DD4BF`, `#FBBF24`, `#60A5FA`, `#F472B6`, `#A3E635`, `#94A3B8`.

## ascii-fluid

Background. WebGL fluid quantized to a glyph ramp. Pointer leaves a trail. Zero deps.

Best fit: an interactive field behind a hero, not a readable word.

Not this: `ascii-logo` (a specific wordmark with click phases).

Deps: none. Key props: `charset`, `cellSize` (12), `color`, `backgroundColor`, `force` (1), `dissipation` (0.05), `brush` (0.55), `animate` (true), `interactive` (true), `theme`.

```tsx
"use client"
import { AsciiFluid } from "@/components/ui/ascii-fluid"

export function Field() {
  return (
    <div className="relative h-svh overflow-hidden bg-background">
      <AsciiFluid />
      <div className="relative z-10 p-10">Your content</div>
    </div>
  )
}
```

Pitfalls: default charset is the long sparse-to-dense ramp exported as `DEFAULT_CHARSET`. Light ink `#18181b` on `#fafafa`; dark ink `#e4e4e7` on `#09090b`. Higher `dissipation` fades trails sooner.

## shader-gradient

Shader. Quiet wash. Up to four stops, order sky / sage / cream / lavender.

Best fit: the default landing hero, an empty state, a marketing band that should stay out of the way.

Not this: a color picker, a fire, a sky with clouds, a footer.

Deps: none. Key props: `colors`, `speed` (0.14), `blur` (0.7), `intensity` (0.95), `interactive` (true), `theme`.

```tsx
"use client"
import { ShaderGradient } from "@/components/ui/shader-gradient"

export function Hero() {
  return (
    <section className="relative isolate min-h-svh overflow-hidden bg-background">
      <ShaderGradient />
      <div className="relative z-10 p-10">Your content</div>
    </section>
  )
}
```

Pitfalls: custom `colors` stick; they do not cross-fade into the dark palette. Stock light `#7CB4E0 #B4D8C4 #EFE4BC #D2D7EC`. Stock dark `#3A6FA0 #2F6B52 #8A6B32 #4A4D7A`. If WebGL fails, a CSS `LIGHT_FALLBACK` / `DARK_FALLBACK` radial stack is used. `interactive` eases the wash toward the pointer.

## shader-fire

Shader. Sparse tongues from the bottom edge. Ember / flame / highlight.

Best fit: heat behind a hero. `dither` turns the wash into Bayer pixels.

Not this: a 404 (`dithered-404` owns the burning glyph and the fireball cursor).

Deps: none. Key props: `colors`, `speed` (0.55), `intensity` (0.55), `height` (0.45), `interactive` (true), `dither` (false), `pixelSize` (1), `theme`.

```tsx
"use client"
import { ShaderFire } from "@/components/ui/shader-fire"

export function Hero() {
  return (
    <section className="relative isolate min-h-svh overflow-hidden bg-background">
      <ShaderFire />
      <div className="relative z-10 p-10">Your content</div>
    </section>
  )
}
```

Pitfalls: `interactive` adds heat under the pointer. `dither` defaults off. Custom `colors` do not follow theme. Light `#9C3A24 #C96A32 #E6C4A0`. Dark `#A33A18 #D4682A #E8B45A`.

## shader-sky

Shader. Daytime clouds, or a gray rain ceiling in dark mode. Optional dotted glass film.

Best fit: an outdoor or weather hero. Glass is a texture, not a modal.

Not this: `shader-gradient` when you want an abstract wash with no clouds.

Deps: none. Key props: `colors` (zenith, horizon, cloud, shade), `speed` (0.1), `coverage` (0.5), `intensity` (0.9), `amount` (0.5), `scale` (0.4), `variation` (0.7), `interactive` (false), `glass` (false), `glassSize` (7), `theme`.

```tsx
"use client"
import { ShaderSky } from "@/components/ui/shader-sky"

export function Sky() {
  return (
    <section className="relative isolate min-h-svh overflow-hidden bg-background">
      <ShaderSky glass glassSize={7} />
      <div className="relative z-10 p-10">Your content</div>
    </section>
  )
}
```

Pitfalls: `interactive` defaults false (unlike gradient and fire). Custom `colors` stay put. Light `#2478C8 #8ECBF2 #F7FBFF #C5D8EC`. Dark `#9AA3AD #C8CED4 #5C6570 #3F4750`.

## tangle-footer

Footer. Five nested semicircle ribbons of repeated text. GPU rotation, pauses off-screen.

Best fit: a site footer that is the visual, with a few phrases.

Not this: rubber-band overscroll (`stretchy-footer`), a hero background.

Deps: React needs `motion`. Svelte has none. Key props: `lines`, `ribbon`, `textColor`, `background`, `height`, `seed` (23), `label` (`"Site footer"`).

```tsx
"use client"
import { TangleFooter } from "@/components/ui/tangle-footer"

export function Footer() {
  return <TangleFooter lines={["Open the docs.", "Install what you need."]} />
}
```

Pitfalls: default height is half the measured width (upper semicircle, aspect `2 / 1`). A shorter `height` scales the nest down. `background="transparent"` when the parent already paints the stage. Theme colors when props are omitted: ribbon `#141414` / `#E8E4DC`, text `#F4F0E8` / `#161616`, field `#EFEAE2` / `#121210`, via `--tangle-ribbon` and `--tangle-text`. Reduced motion skips the spin. Default lines are the five sentences in `DEFAULT_LINES`.

## stretchy-footer

Footer behavior. Overscroll past the bottom stretches an aurora and lifts the page, then snaps back.

Best fit: a Dia-like end of a long page. The component can be the scroller, or an overlay on window / element scroll.

Not this: tilting the page (`folio`), spinning type (`tangle-footer`).

Deps: React needs `motion`. Svelte uses `stretchy-footer-spring-vanilla.ts` and declares no npm deps. Key props: `children`, `scrollRef` / Svelte `scrollEl`, `windowScroll` (false), `contentSelector` (`[data-stretchy-page]`), `maxStretch` (280), `colors`, `stiffness` (380), `damping` (32), `columns` (48), `blur` (14), `glow` (0.22), `label`, `demoId`.

```tsx
"use client"
import { StretchyFooter } from "@/components/ui/stretchy-footer"

export function Page() {
  return (
    <StretchyFooter className="h-svh bg-background">
      <main className="min-h-[120%] px-8 py-24">
        <p>Scroll to the end, then overscroll.</p>
      </main>
    </StretchyFooter>
  )
}
```

Window mode:

```tsx
<div data-stretchy-page>{/* page */}</div>
<StretchyFooter windowScroll />
```

Pitfalls: with `scrollRef` or `windowScroll`, `children` are ignored and the component only paints the overlay. Content must be long enough to hit the end. Stock `colors` are the 10-stop spectrum in `DEFAULT_COLORS` (`#FF3B30` through `#FF2D55`). React exports `playStretchyFooterDemo` and `STRETCHY_FOOTER_PLAY` (`"stretchy-footer:play"`) for demos. Do not ship a page that only plays that helper.

## live-orb

Character. Evenly lit sphere, two capsule eyes. Gaze follows the pointer. The orb does not.

Best fit: a mascot, an empty state, a corner presence.

Not this: a full-bleed background. It is `size` pixels square (default 280).

Deps: none. The only `variant` in the registry: `"white"` (default), `"black"`, `"webgl"`, `"custom"`. Also `size`, `color`, `eyeColor`, `colors`, `interactive` (true), `blink` (true).

```tsx
"use client"
import { LiveOrb } from "@/components/ui/live-orb"

export function Mascot() {
  return <LiveOrb variant="custom" color="#7C5CFF" eyeColor="#FAFAFA" size={280} />
}
```

Pitfalls: `color` / `eyeColor` apply only for `variant="custom"` (defaults `#7C5CFF` / `#FAFAFA`). `colors` applies only for `variant="webgl"` (default `#7C6AF7 #7DD3C7 #E8B4D4`). `white` is `#F4F4F5` body / `#09090B` eyes. `black` is the inverse. `interactive={false}` parks the gaze. WebGL failure falls back to a CSS face. Reduced motion skips blink.

## ascii-logo

Character. Glyphs sample `text` or `src`. Hover shoves them in the `logo` phase. Clicks cycle `logo → scattered → fallen → returning → logo`.

Best fit: an interactive wordmark (max 5 letters) or a sampled mark.

Not this: mouse-trail fluid (`ascii-fluid`).

Deps: none. Key props: `text` (`"23rd"`), `src`, `fit` (0.82), `cellSize` (11), `cellGap` (2), `charset`, `threshold` (0.2), `invert`, `color`, `backgroundColor`, hover/scatter/gravity props, `interactive` (true), `theme`, `label`, `onPhaseChange`.

```tsx
"use client"
import { AsciiLogo } from "@/components/ui/ascii-logo"

export function Wordmark() {
  return (
    <div className="relative h-64 w-full overflow-hidden bg-background">
      <AsciiLogo text="23rd" />
    </div>
  )
}
```

Pitfalls: `text` is capped at `MAX_TEXT_LETTERS` (5) via `clampAsciiLogoText`. `src` wins over `text`. `invert` defaults true when `src` is set and false for text. `backgroundColor="transparent"` skips the fill. Hover repulsion only runs in phase `logo`. `onPhaseChange` fires after every phase, including the auto-return.

## dithered-404

Page. A Bayer-dithered “404” burned by a fireball cursor into embers and smoke, then the type reforms.

Best fit: the not-found route, full viewport.

Not this: decorative fire behind a normal hero (`shader-fire`). Set `dither={false}` only when you want the soft fire on the same 404 glyph.

Deps: none. Key props: `color`, `pixelSize` (4), `brush` (28), `interactive` (true), `dither` (true), `theme`.

```tsx
"use client"
import { Dithered404 } from "@/components/ui/dithered-404"

export function NotFound() {
  return (
    <section className="relative isolate min-h-svh overflow-hidden bg-background">
      <Dithered404 />
      <div className="relative z-10 flex min-h-svh flex-col items-center justify-end px-6 pb-16 text-center">
        <p className="text-sm text-muted-foreground">This page is gone.</p>
      </div>
    </section>
  )
}
```

Pitfalls: `interactive` hides the system cursor while the fireball is active (`onHideCursor` exists on the vanilla options; the React wrapper owns that state and does not expose the callback as a prop). Ink follows theme: `#18181B` light, `#E4E4E7` dark. The glyph string is the 404 itself; there is no `text` prop.

## folio

Section. The sheet tips one way on scroll down, the other on scroll up, blur on the traveling edge, then springs flat. Peak tilt is an internal 16°.

Best fit: a long editorial page that should feel like one sheet.

Not this: overscroll aurora (`stretchy-footer`). Do not use it when the user needs an obvious effect on a trackpad — issue [#29](https://github.com/radiumcoders/23rd.dev/issues/29) says the lean is barely visible on Mac. The docs “show effect” button calls `playFolioDemo`; that is a preview, not a stronger public tilt.

Deps: none. Key props: `children`, `blur` (4), `perspective` (1000, floor 1000), `returnMs` (520), `windowScroll` (false), `contentSelector` (`[data-folio-page]`), `label` (`"Tilting page"`), `demoId`.

```tsx
"use client"
import { Folio } from "@/components/ui/folio"

export function Page() {
  return (
    <Folio className="h-svh bg-background">
      <main className="px-10 py-24">
        <h1 className="text-5xl font-medium tracking-tight">The page leans back</h1>
      </main>
    </Folio>
  )
}
```

Pitfalls: there is no `tilt`, `angle`, or `intensity` prop. Reduced motion disables tilt and blur. React re-exports `playFolioDemo`, `FOLIO_PLAY` (`"folio:play"`), and `applyFolioFrame`. At the bottom the down-lean releases; at the top the up-lean releases.

## image-peel

Section. An image sticks to the scrollport and peels away as you scroll. The curl starts at `side` — an edge or a corner — and travels until `amount` of the sheet has lifted. Children are the surface underneath. The back of the sticker is white.

Best fit: a sticker, poster, or photo that should curl off the page.

Not this: a page that leans (`folio`). Image Peel does not tilt the document.

Deps: none. Key props: `src` (required), `alt` (`""`), `side` (`"bottom"` — `"top" | "right" | "bottom" | "left" | "top-left" | "top-right" | "bottom-left" | "bottom-right"`), `amount` (`1`, clamped `0`–`1`), `children`, `className`, `demoId`.

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

Pitfalls: default height is `h-[240vh]` so the sheet has room to stick. Inside a nested scroller, pass `className="h-[240%]"` instead. There is no `progress` prop — scroll drives the peel. `amount` below `1` parks the curl; it does not change the radius. Corners use a cell grid; edges use strips. Reduced motion keeps the sticker flat. The back is `#FFFFFF`. There is no drop shadow. React re-exports `playImagePeel` and `IMAGE_PEEL_PLAY` (`"image-peel:play"`) for the docs preview. The curl radius is internal. Transparent images are masked, so a die-cut sticker does not peel as a rectangle.

## gooey-color-picker

Component. A swatch opens into a hue wheel, alpha slider, and hex field. Blobs share an SVG goo filter. The trigger becomes close when open.

Best fit: pick or edit one color inline.

Not this: any background, shader, or theme switcher.

Deps: React needs `motion`. Svelte has none. Props: `value`, `defaultValue`, `onChange(color, css)`, `label` (`"Color picker"`), `className` / `class`.

```tsx
"use client"
import { GooeyColorPicker } from "@/components/ui/gooey-color-picker"

export function Picker() {
  return (
    <GooeyColorPicker
      defaultValue={{ h: 210, s: 90, l: 55, a: 1 }}
      onChange={(color, css) => console.log(color, css)}
    />
  )
}
```

Controlled when `value` is not `undefined`. Otherwise uncontrolled, seeded from `defaultValue`, then from `value` only as the initial parse, then `DEFAULT_COLOR` `{ h: 320, s: 90, l: 58, a: 1 }`. The docs table that lists `{ h: 210, s: 90, l: 55, a: 1 }` as the default is the usage example, not `parseColor(undefined)`.

`GooeyColor` is `{ h: 0–360, s: 0–100, l: 0–100, a: 0–1 }`. Strings accept hex (`#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`) and `hsl` / `hsla`. `onChange` second arg is `hsla(...)` from `toCss`. EyeDropper appears only when `window.EyeDropper` exists; it is not a prop.

Pitfalls: the panel overflows the trigger. Do not put it in `overflow-hidden`. React also exports `parseColor`. No `className` on Svelte — use `class`.
