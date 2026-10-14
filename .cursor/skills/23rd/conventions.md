# Adding a 23rd component

Use this only when the task is to add or change a registry item in `radiumcoders/23rd.dev`. Consumers installing `@23rd/...` do not follow this file.

## Layout

```
registry/<name>/
  <name>-vanilla.ts          engine, no React
  <name>.tsx                 "use client" wrapper
  <name>-demo.tsx            docs controls (optional; gooey inlines the component)
  registry.json              one React item
content/docs/components/<name>.mdx
```

`<name>` is kebab-case (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`). One folder per component. Every component currently has a single engine; a second one would be another sibling `<name>-something-vanilla.ts`. The build inlines every sibling `*-vanilla` import. Do not list vanilla files in `registry.json`.

## registry.json

Match `registry/shader-gradient/registry.json`.

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "items": [
    {
      "name": "<name>",
      "type": "registry:ui",
      "title": "Human Title",
      "description": "One sentence an installer will read.",
      "files": [
        {
          "path": "<name>.tsx",
          "type": "registry:ui",
          "target": "components/ui/<name>.tsx"
        }
      ]
    }
  ]
}
```

Rules tests enforce (`tests/registry.test.mjs`):

- `title` and `description` are non-empty strings.
- `files[].type` is `registry:ui` and `target` is `components/ui/<name>.tsx`.
- `dependencies` / `devDependencies` / `registryDependencies`, if present, are arrays of non-empty strings.
- Declare `motion` only when the wrapper imports `motion`.
- Omit `dependencies` when there are none. Do not add a fake registry dependency.

`scripts/build-registry.mjs` discovers `registry/*/registry.json`, rewrites the root `registry.json` `include` list, writes `.registry-standalone/` with vanilla code inlined, runs `shadcn registry validate` and `shadcn build` into `public/r/`.

## Wrapper conventions

React:

- First line `"use client"`.
- Import `cn` from `@/lib/utils`. The published file assumes the consumer shadcn project has that helper.
- Export a named function and a `*Props` type.
- `className?: string` on the root.
- Default prop values in the function signature match the vanilla comments.
- Do not pass `onThemeChange` through. Watch theme inside the wrapper if the CSS fallback needs it.
- Re-export public constants and types the docs name (`LIGHT_COLORS`, `GooeyColor`, …).

Vanilla:

- No React, no `@/` imports.
- Export an options type, an instance type `{ setOptions, destroy }`, and `create<Name>(canvas | root, options)`.
- Every component works in light and dark mode. Expose `theme?: "light" | "dark" | "auto"` (default `"auto"`) and give anything theme-sensitive (ink, fades, backfaces, glows) a light and a dark value. Watch `html` attributes and `prefers-color-scheme` so `auto` follows the page live.
- Theme helper: `html.dark` / `html.light`, then `data-theme`, then `prefers-color-scheme`. Copy `isDarkTheme` from `logo-burst-vanilla.ts` rather than inventing a new contract.
- Honor `prefers-reduced-motion: reduce`.
- Custom `colors` or `color`, when set, win over the theme palette.

Demos:

- `*-demo.tsx` is for the docs site only. It is not a registry file.
- Demo stages and docs examples use theme tokens (`bg-background`, `from-background`, `text-foreground`), never a hard-coded black or white stage. Check the demo in both themes before shipping.
- Use `ComponentPreview`, `ComponentControls`, and `usePreviewProps` the way `shader-gradient-demo.tsx` does.
- One `ComponentPreview` per page. On a component page it moves into the full-height stage at the top of the docs, and the controls into the props panel beside it. Size the demo's root with `h-[var(--preview-h,56svh)]` so it fills the stage there and keeps 56svh anywhere else.
- Do not put a `## Preview` heading above the demo; the preview is not in the page flow.
- `gooey-color-picker` has no demo file; the MDX renders `<GooeyColorPicker />` inside `ComponentPreview`. Either pattern is acceptable. Do not publish the demo.

## Docs

`content/docs/components/<name>.mdx`:

```mdx
---
title: Human Title
description: One line.
---

import { FooDemo } from "@/registry/<name>/<name>-demo"

Lead paragraph. What it is, what it is not.

<FooDemo />

## Installation

<CliCommand item="<name>" />

Or install straight from the public GitHub source registry:

<CliCommand item="<name>" github />

## Usage

```tsx
"use client"
import { Foo } from "@/components/ui/<name>"
```

## Props

| Prop | Type | Default |
| --- | --- | --- |
```

Add the page under a separator in `content/docs/components/meta.json`. Current groups: Background, Shaders, Footers, Characters, Pages, Sections, Components, AI Components, Experiments. Separators look like `"---Background---"`.

MDX components already global: `CliCommand`, `ComponentPreview`, `ComponentControls`.

Props tables must match the wrapper defaults. Do not copy a usage example into the Default column.

Update the component table in `README.md` when the item should be listed there. The README table is not the source of truth for the registry; `content/docs/components/meta.json` is.

## Ship

```bash
pnpm registry:build
pnpm test
pnpm typecheck
```

`pnpm registry:build` refreshes root `registry.json` and `public/r/*.json`. Commit both. `pnpm test` fails if `include` or `public/r` is stale.

`pnpm build` also runs `registry:build` and `og:build` before `next build`. OG images are generated; you do not hand-author them for a new doc page.

## Do not

- Ship a component that only looks right in one theme.
- Import `./<name>-vanilla` from a file that is not the wrapper the build inlines.
- Put site chrome (`components/docs-shell.tsx`, `components/ui/button.tsx`) into the registry. `components/ui/*` in this repo is the docs site’s shadcn kit, not the published set.
- Add a `variant` prop unless the design really has discrete materials. Only `live-orb` has one.
- Document keyboard shortcuts, CSS variables, or tilt angles the engine does not expose.
