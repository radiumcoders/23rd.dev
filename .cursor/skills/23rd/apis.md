# Public APIs

Types below are what the React modules export. Svelte components take the same fields with these renames:

| React | Svelte |
| --- | --- |
| `className` | `class` |
| `children?: ReactNode` | `children?: Snippet` |
| `scrollRef?: RefObject<HTMLElement \| null>` | `scrollEl?: HTMLElement` |
| `containerRef?: RefObject<HTMLElement \| null>` | `container?: HTMLElement` |

Vanilla `onThemeChange` and `onHasGl` are not React props. The wrappers subscribe internally. `Dithered404` vanilla `onHideCursor` is also internal to the wrapper.

Theme prop, where present: `"light" | "dark" | "auto"`, default `"auto"`. See SKILL.md for resolution. `colors`, when set on a shader, replaces the theme palette.

No component accepts `variant` except `LiveOrb`.

## gooey-color-picker

```ts
type GooeyColor = { h: number; s: number; l: number; a: number }

type GooeyColorPickerProps = {
  value?: GooeyColor | string
  defaultValue?: GooeyColor | string
  onChange?: (color: GooeyColor, css: string) => void
  className?: string
  label?: string // "Color picker"
}
```

Also exported from the React module: `parseColor`, type `GooeyColor`.

| Behavior | Rule |
| --- | --- |
| Controlled | `value !== undefined`. Updates come from the parent. |
| Uncontrolled | `useState(() => parseColor(defaultValue ?? value))`. |
| Omitted both | `parseColor(undefined)` → `{ h: 320, s: 90, l: 58, a: 1 }` (`DEFAULT_COLOR`). |
| `onChange` | Called with the next `GooeyColor` and `toCss` (`hsla(H S% L% / A)`). |
| Strings | hex or `hsl()` / `hsla()`. Alpha in `hsla` may be 0–1 or a percent. |

Not props: open state, eyedropper, goo filter id.

## logo-burst

```ts
type LogoBurstTheme = "light" | "dark" | "auto"

type LogoBurstProps = {
  tentacleCount?: number // 260
  color?: string
  coreSize?: number // 0; auto-measured when children exist
  radius?: number // 0.48 of the shorter edge
  duration?: number // 1.35 seconds
  seed?: number // 23
  particleRatio?: number // 0.62
  theme?: LogoBurstTheme // "auto"
  breathe?: boolean // true
  className?: string
  children?: ReactNode
  replayKey?: number // increment to replay; mount already plays
  replayOnClick?: boolean // true
  label?: string // "Logo burst"
}
```

Constants: `LIGHT_COLOR` `#3F3F46`, `DARK_COLOR` `#D6D2CA`. `DEFAULT_COLOR` is deprecated and equals `DARK_COLOR`.

Vanilla `LogoBurstInstance`: `{ setOptions, replay, destroy }`. Not returned to app code by the React component.

## phosphor-score

```ts
type PhosphorScoreProps = {
  color?: string
  glow?: number // 50, treated as 0–100
  speed?: number // 1.35 beats per second
  density?: number // 1
  sway?: boolean // true
  seed?: number // 23
  rotateX?: number // 0 degrees, -70–70; positive tips the incoming notes away
  rotateY?: number // 0 degrees, -70–70; positive swings the right side away
  rotateZ?: number // 0 degrees; positive is clockwise
  theme?: "light" | "dark" | "auto" // "auto"
  className?: string
}
```

`DARK_COLOR` `#4DFF6A`, `LIGHT_COLOR` `#147A3A`, `DARK_BG` and `LIGHT_BG` are both `"transparent"`. A set `color` replaces ink only.

## radiant-lines

```ts
type RadiantLinesProps = {
  colors?: string[]
  starCount?: number // 420
  displacement?: number // 1, values < 0 clamp to 0
  containerRef?: RefObject<HTMLElement | null> // omit → window
  className?: string
}
```

`DEFAULT_COLORS`: `#FF6B4A`, `#2DD4BF`, `#FBBF24`, `#60A5FA`, `#F472B6`, `#A3E635`, `#94A3B8`.

Instance: `{ setOptions, destroy }`.

## ascii-fluid

```ts
type AsciiFluidProps = {
  charset?: string // DEFAULT_CHARSET brightness ramp
  cellSize?: number // 12
  color?: string
  backgroundColor?: string
  force?: number // 1
  dissipation?: number // 0.05
  brush?: number // 0.55
  animate?: boolean // true
  interactive?: boolean // true
  theme?: "light" | "dark" | "auto"
  className?: string
}
```

`DEFAULT_CHARSET` is the sparse-to-dense ramp:

```ts
" .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
```

Theme ink/paper when color props are omitted: light `#18181b` / `#fafafa`, dark `#e4e4e7` / `#09090b`.

## shader-gradient

```ts
type ShaderGradientProps = {
  colors?: string[] // up to 4, cycled in order
  speed?: number // 0.14
  blur?: number // 0.7
  intensity?: number // 0.95
  grain?: number // 0.35, 0–1 film grain; 0 turns it off
  interactive?: boolean // true
  theme?: "light" | "dark" | "auto"
  className?: string
}
```

`LIGHT_COLORS`: `#F7A48B`, `#F9D78E`, `#9FCBF0`, `#BBA9EE`.

`DARK_COLORS`: `#3D52F2`, `#9150F2`, `#E0479F`, `#FF7B60`.

Also exported: `DEFAULT_SPEED`, `DEFAULT_BLUR`, `DEFAULT_INTENSITY`, `DEFAULT_GRAIN`.

`LIGHT_FALLBACK` and `DARK_FALLBACK` are CSS background stacks used when WebGL is unavailable. Palette line in the engine: `options.colors?.length ? options.colors : dark ? DARK_COLORS : LIGHT_COLORS`.

## shader-anime-fire

```ts
type ShaderAnimeFireProps = {
  colors?: string[] // ember, flame, core
  speed?: number // 0.6
  intensity?: number // 1
  height?: number // 0.45
  interactive?: boolean // true
  dither?: boolean // false
  pixelSize?: number // 1
  theme?: "light" | "dark" | "auto"
  className?: string
}
```

`LIGHT_COLORS`: `#D8341A`, `#F9731E`, `#FFBA3A`.

`DARK_COLORS`: `#B4200A`, `#FF6512`, `#FFC04A`.

Also exported: `DEFAULT_SPEED`, `DEFAULT_INTENSITY`, `DEFAULT_HEIGHT`.

Same `colors ?? theme palette` rule. Fallbacks exported as `LIGHT_FALLBACK` / `DARK_FALLBACK`.

## shader-sky

```ts
type ShaderSkyProps = {
  colors?: string[] // zenith, horizon, cloud, shade
  speed?: number // 0.1
  coverage?: number // 0.5
  intensity?: number // 0.9
  amount?: number // 0.5
  scale?: number // 0.4
  variation?: number // 0.7
  interactive?: boolean // false
  lightning?: boolean // false; storm flashes, off under reduced motion
  glass?: boolean // false
  glassSize?: number // 7 CSS px
  theme?: "light" | "dark" | "auto"
  className?: string
}
```

`LIGHT_COLORS`: `#2478C8`, `#8ECBF2`, `#F7FBFF`, `#C5D8EC`.

`DARK_COLORS`: `#9AA3AD`, `#C8CED4`, `#5C6570`, `#3F4750`.

`skyFallback(colors, dark)` builds the CSS fallback. Custom `colors` do not swap.

## shader-metal

```ts
type ShaderMetalProps = {
  metal?: "chrome" | "gold" | "copper" | "graphite" // "chrome"
  color?: string // hex tint, wins over metal
  ribbons?: number // 3, 1–5
  speed?: number // 0.3
  iridescence?: number // 0.2, 0–1
  interactive?: boolean // true
  theme?: "light" | "dark" | "auto"
  className?: string
}
```

`METALS`: chrome `#F2F3F5`, gold `#FFD38A`, copper `#F7AE92`, graphite `#8E9096`. Also exported: `DEFAULT_METAL`, `DEFAULT_RIBBONS`, `DEFAULT_SPEED`, `DEFAULT_IRIDESCENCE`.

Transparent canvas, no CSS fallback: without WebGL the parent's background shows. Theme changes the studio lighting, not the metal.

## stretchy-footer

```ts
type StretchyFooterProps = {
  className?: string
  children?: ReactNode // ignored in overlay modes
  scrollRef?: RefObject<HTMLElement | null>
  windowScroll?: boolean // false
  contentSelector?: string // "[data-stretchy-page]"
  maxStretch?: number // 280
  colors?: string[] // DEFAULT_COLORS, 9 stops, top of each column to the floor
  stiffness?: number // 380
  damping?: number // 32
  columns?: number // 9, stepping down from the middle
  blur?: number // 16 px
  glow?: number // 0, white floor bloom, 0–1
  flip?: boolean // false; edge columns tallest, middle dips
  rotate?: 0 | 180 // 0; 180 hangs the aurora from the lifted page
  label?: string // "Stretchy overflow"
  demoId?: string
}
```

`DEFAULT_COLORS`: `#FF1AE6`, `#FF2E5E`, `#FF8A1A`, `#FFC81F`, `#E2E6EC`, `#8DB6E6`, `#2F74DC`, `#1459E3`, `#1C2566`. Also exported: `DEFAULT_MAX_STRETCH`, `DEFAULT_STIFFNESS`, `DEFAULT_DAMPING`, `DEFAULT_COLUMNS`, `DEFAULT_BLUR`, `DEFAULT_GLOW`.

Modes:

| Props | Behavior |
| --- | --- |
| neither `scrollRef` nor `windowScroll` | This element is the scroller. `children` are the page. |
| `scrollRef` set | Overlay only. Listeners bind to that element. |
| `windowScroll` | Fixed bottom aurora. Lifts `contentSelector`. |

React exports `playStretchyFooterDemo(detail?)` and `STRETCHY_FOOTER_PLAY` (`"stretchy-footer:play"`).

```ts
type StretchyFooterPlayDetail = {
  amount?: number // fraction of maxStretch, default 0.82
  holdMs?: number // 700
  target?: string // matches demoId
  scrollRoot?: HTMLElement | null
}
```

## live-orb

```ts
type LiveOrbVariant = "white" | "black" | "webgl" | "custom"

type LiveOrbProps = {
  variant?: LiveOrbVariant // "white"
  color?: string // custom body, default #7C5CFF
  eyeColor?: string // custom eyes, default #FAFAFA
  colors?: string[] // webgl stops
  interactive?: boolean // true
  blink?: boolean // true
  className?: string
  size?: number // 280
}
```

Presets: `WHITE` `{ color: "#F4F4F5", eyeColor: "#09090B" }`, `BLACK` `{ color: "#18181B", eyeColor: "#F4F4F5" }`, `CUSTOM_DEFAULT` `{ color: "#7C5CFF", eyeColor: "#FAFAFA" }`, `WEBGL_COLORS` `#7C6AF7`, `#7DD3C7`, `#E8B4D4`.

`color` and `eyeColor` are read for `variant="custom"` only. `colors` is read for `variant="webgl"` only.

## ascii-logo

```ts
type AsciiLogoPhase = "logo" | "scattered" | "fallen" | "returning"

type AsciiLogoProps = {
  text?: string // "23rd", max 5 chars
  src?: string
  fit?: number // 0.82
  cellSize?: number // 11
  cellGap?: number // 2
  charset?: string // DEFAULT_CHARSET
  threshold?: number // 0.2
  invert?: boolean // true if src set, else false
  color?: string
  backgroundColor?: string // "transparent" skips fill
  hoverRadius?: number // 7
  hoverPush?: number // 2.6
  hoverEase?: number // 0.18
  scatterRange?: number // 16
  scatterEase?: number // 0.055
  gravity?: number // 0.14
  bounce?: number // 0.28
  resetEase?: number // 0.08
  staggerFrames?: number // 18
  interactive?: boolean // true
  theme?: "light" | "dark" | "auto"
  onPhaseChange?: (phase: AsciiLogoPhase) => void
  className?: string
  label?: string // text, or "ASCII logo"
}
```

`MAX_TEXT_LETTERS` is 5. `clampAsciiLogoText(text, maxLetters?)` is exported. `DEFAULT_CHARSET` is `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*`.

`src` ignores `text`. Click order: `logo → scattered → fallen → returning → logo`. Hover push runs only in `logo`.

Theme ink/paper when omitted: light `#3f3f46` / `#fafafa`, dark `#a1a1aa` / `#09090b`.

## dithered-404

```ts
type Dithered404Props = {
  color?: string
  pixelSize?: number // 4
  brush?: number // 28 CSS px
  interactive?: boolean // true
  dither?: boolean // true
  theme?: "light" | "dark" | "auto"
  className?: string
}
```

`LIGHT_COLOR` `#18181B`, `DARK_COLOR` `#E4E4E7`. `dither={false}` is soft fire on the same glyph. No `text` prop. Wrapper does not expose `onHideCursor`.

## folio

```ts
type FolioProps = {
  blur?: number // 4
  perspective?: number // 1000, minimum 1000
  returnMs?: number // 520
  className?: string
  children?: ReactNode
  windowScroll?: boolean // false
  contentSelector?: string // "[data-folio-page]"
  label?: string // "Tilting page"
  demoId?: string
}
```

Not props: tilt angle (`TILT_PEAK` is 16 inside the engine), scroll speed, spring stiffness.

```ts
type FolioPlayDetail = {
  target?: string
  scrollRoot?: HTMLElement | null
  holdMs?: number // 720
}
```

React exports `playFolioDemo`, `FOLIO_PLAY` (`"folio:play"`), `applyFolioFrame`. The Svelte component listens for that window event. Reduced motion: no tilt, no blur.

## typewriter

```ts
type TypewriterProps = {
  color?: string // "#8EC3B5" body enamel; shades are mixed from it
  text?: string // DEFAULT_TEXT; "\n" breaks a line
  speed?: number // 12 characters per second, clamped 1–60
  humanize?: boolean // true
  loop?: boolean // true
  hold?: number // 2600 ms on the finished page before looping
  startDelay?: number // 600 ms before the first keystroke
  columns?: number // 32 characters per line, clamped 16–60
  jitter?: number // 0.3, 0–1
  sound?: boolean // false
  interactive?: boolean // true: focusable; type on it or click its keys
  label?: string // nameplate text on the front; omit for none
  onDone?: () => void // each time the last character lands
  className?: string
}
```

Also exported: `DEFAULT_COLOR`, `DEFAULT_TEXT`, `DEFAULT_SPEED`, `DEFAULT_COLUMNS`, `DEFAULT_HOLD`, `DEFAULT_START_DELAY`, `DEFAULT_JITTER`, `layoutTypewriter(text, columns)`, types `TypewriterStroke`, `TypewriterOptions`, `TypewriterInstance`.

Vanilla `TypewriterInstance`: `{ setOptions, restart, destroy }`. Not returned to app code by the React component; remount with a `key` to type again. No `ticks` or `theme` props; `color` is the only color prop and it paints the enamel.

## Events that are not props

| Name | Constant | Who listens |
| --- | --- | --- |
| `folio:play` | `FOLIO_PLAY` | Folio instances. `target` must match `demoId` when set. |
| `stretchy-footer:play` | `STRETCHY_FOOTER_PLAY` | Stretchy footers. Same `target` / `demoId` rule. |

Use them to preview. Do not replace real scroll or overscroll with them in production UI.
