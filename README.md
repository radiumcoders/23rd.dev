<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/header/graph.svg?title=23rd&subtitle=Opinionated+UI+components+for+shippers&logo=react&theme=zinc&align=center&mode=dark&bg=transparent" />
    <img alt="23rd — Opinionated UI components for shippers" src="https://shieldcn.dev/header/graph.svg?title=23rd&subtitle=Opinionated+UI+components+for+shippers&logo=react&theme=zinc&align=center&mode=light&bg=transparent" />
  </picture>
</p>

<p align="center">  
  <a href="https://23rd.dev"> 
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/docs-23rd.dev-18181b.svg?variant=branded&logo=bookstack&mode=dark" />
      <img alt="Docs" src="https://shieldcn.dev/badge/docs-23rd.dev-fafafa.svg?variant=branded&logo=bookstack&mode=light" />
    </picture>
  </a>
  <a href="https://github.com/radiumcoders/23rd.dev/stargazers">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/stars/radiumcoders/23rd.dev.svg?variant=secondary&mode=dark" />
      <img alt="GitHub stars" src="https://shieldcn.dev/github/stars/radiumcoders/23rd.dev.svg?variant=secondary&mode=light" />
    </picture>
  </a>
  <a href="https://github.com/radiumcoders/23rd.dev/graphs/contributors">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/contributors/radiumcoders/23rd.dev.svg?variant=secondary&mode=dark" />
      <img alt="Contributors" src="https://shieldcn.dev/github/contributors/radiumcoders/23rd.dev.svg?variant=secondary&mode=light" />
    </picture>
  </a>
  <a href="https://github.com/radiumcoders/23rd.dev/commits/main">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/last-commit/radiumcoders/23rd.dev.svg?variant=secondary&mode=dark" />
      <img alt="Last commit" src="https://shieldcn.dev/github/last-commit/radiumcoders/23rd.dev.svg?variant=secondary&mode=light" />
    </picture>
  </a>
  <a href="https://ui.shadcn.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/registry-shadcn-18181b.svg?variant=secondary&logo=shadcnui&mode=dark" />
      <img alt="shadcn registry" src="https://shieldcn.dev/badge/registry-shadcn-fafafa.svg?variant=secondary&logo=shadcnui&mode=light" />
    </picture>
  </a>
</p>

**23rd** is an open-source [shadcn/ui](https://ui.shadcn.com) registry of tasteful, opinionated UI components. Copy what you need, paste into your app, and ship — without fighting a kitchen-sink design system.

Site: [23rd.dev](https://23rd.dev) · Docs: [23rd.dev/docs](https://23rd.dev/docs)

## Why 23rd

Most kits hand you every option. 23rd picks a direction: spacing, motion, and interaction patterns that already feel finished. You can still override anything — you just start from a sharper baseline.

- **shadcn-native** — install with the CLI, own the source in your repo
- **Opinionated defaults** — less boilerplate, clearer decisions
- **React and Svelte 5** — every item ships for both; pick a framework on the install command

## Quick start

Install a component (React):

```bash
pnpm dlx shadcn@latest add @23rd/gooey-color-picker
```

Svelte 5 (lands in `src/lib/components/ui/`):

```bash
pnpm dlx shadcn@latest add @23rd/gooey-color-picker-svelte
```

Or pull straight from GitHub:

```bash
pnpm dlx shadcn@latest add radiumcoders/23rd.dev/gooey-color-picker
```

## Components

| Component                                                                 | Install                    | Description                                                                       |
| ------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------- |
| [ASCII Fluid](https://23rd.dev/docs/components/ascii-fluid)               | `@23rd/ascii-fluid`        | Mouse-trail WebGL fluid quantized to a clean ASCII brightness ramp                |
| [ASCII Logo](https://23rd.dev/docs/components/ascii-logo)                 | `@23rd/ascii-logo`         | Interactive ASCII wordmark — hover shove, then click to scatter, drop, and gather |
| [Gooey Color Picker](https://23rd.dev/docs/components/gooey-color-picker) | `@23rd/gooey-color-picker` | Floating swatch → hue wheel, alpha, hex — joined by an SVG gooey filter           |
| [Radiant Lines](https://23rd.dev/docs/components/radiant-lines)           | `@23rd/radiant-lines`      | Hyperspace starfield background; warp speed driven by scroll                      |
| [Shader Fire](https://23rd.dev/docs/components/shader-fire)               | `@23rd/shader-fire`        | Sparse 2D fire wash — tongues rise from the bottom behind a landing hero          |
| [Shader Gradient](https://23rd.dev/docs/components/shader-gradient)       | `@23rd/shader-gradient`    | Quiet WebGL wash behind landing heroes, empty states, and marketing sections      |
| [Shader Grass](https://23rd.dev/docs/components/shader-grass)             | `@23rd/shader-grass`       | Raymarched rolling meadow under an open sky, with wind moving through the grass   |
| [Stretchy Footer](https://23rd.dev/docs/components/stretchy-footer)       | `@23rd/stretchy-footer`    | Dia-style rubber overscroll; aurora stretches past the bottom, then snaps back    |
| [Tangle Footer](https://23rd.dev/docs/components/tangle-footer)           | `@23rd/tangle-footer`      | Nested SVG text ribbons as a footer                                               |

```tsx
import { GooeyColorPicker } from "@/components/ui/gooey-color-picker"

export function Example() {
  return (
    <GooeyColorPicker
      defaultValue={{ h: 210, s: 90, l: 55, a: 1 }}
      onChange={(color, css) => console.log(color, css)}
    />
  )
}
```

Svelte:

```svelte
<script>
  import GooeyColorPicker from "$lib/components/ui/gooey-color-picker.svelte"
</script>

<GooeyColorPicker
  defaultValue={{ h: 210, s: 90, l: 55, a: 1 }}
  onChange={(color, css) => console.log(color, css)}
/>
```

## Develop locally

This repo is the docs site and registry source.

```bash
pnpm install
pnpm dev
```

Useful scripts:

| Script                | What it does                                           |
| --------------------- | ------------------------------------------------------ |
| `pnpm dev`            | Next.js dev server                                     |
| `pnpm build`          | Build registry + production app                        |
| `pnpm preview`        | Build with OpenNext and preview in the Workers runtime |
| `pnpm cf:deploy`      | Build with OpenNext and deploy to Cloudflare Workers   |
| `pnpm registry:build` | Emit `public/r/*.json` from `registry/`                |
| `pnpm test`           | Run registry tests                                     |
| `pnpm typecheck`      | MDX + TypeScript check                                 |

Stack: Next.js 16, React 19, Fumadocs, Tailwind CSS 4, shadcn/ui (Base UI), Cloudflare Workers (OpenNext).

### Deploy to Cloudflare

```bash
pnpm cf:deploy
```

Connect the repo in the [Cloudflare dashboard](https://dash.cloudflare.com/) (Workers Builds) for Git-based deploys. Point `23rd.dev` DNS at the Worker when you're ready to cut over from Vercel.

## Contributing

New components live under `registry/<name>/` with a vanilla engine, React/Svelte wrappers, and a `registry.json` (React item plus `<name>-svelte`), then get documented in `content/docs/components/`. Run `pnpm registry:build` before shipping registry changes.

PRs that sharpen defaults, fix edge cases, or add tasteful components are welcome.

## Links

- [Documentation](https://23rd.dev/docs)
- [Registry index](https://23rd.dev/r/registry.json)
- [shadcn/ui](https://ui.shadcn.com)

---

Made by [radiumcoders](https://github.com/radiumcoders) (Jay).
