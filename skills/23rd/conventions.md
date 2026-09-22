# Adding a 23rd component

Use this only when the task is to add or change a registry item in `radiumcoders/23rd.dev`. Consumers installing `@23rd/...` do not follow this file.

## Layout

```
registry/<name>/
  <name>-vanilla.ts          engine, no React
  <name>.tsx                 "use client" wrapper
  <name>.svelte              Svelte 5 wrapper
  <name>-demo.tsx            docs controls (optional; gooey inlines the component)
  registry.json              React item + <name>-svelte item
content/docs/components/<name>.mdx
```

`<name>` is kebab-case (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`). One folder per component. Extra engines are `<name>-something-vanilla.ts` (see `stretchy-footer-spring-vanilla.ts`). The build inlines every sibling `*-vanilla` import. Do not list vanilla files in `registry.json`.

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
      "dependencies": ["motion"],
      "files": [
        {
          "path": "<name>.tsx",
          "type": "registry:ui",
          "target": "components/ui/<name>.tsx"
        }
      ]
    },
    {
      "name": "<name>-svelte",
      "type": "registry:ui",
      "title": "Human Title",
      "description": "Same sentence.",
      "files": [
        {
          "path": "<name>.svelte",
          "type": "registry:file",
          "target": "src/lib/components/ui/<name>.svelte"
        }
      ]
    }
  ]
}
```

Rules tests enforce (`tests/registry.test.mjs`):

- Both items exist. Svelte name is `<name>-svelte`.
- `title` and `description` are non-empty strings.
- React `files[].type` is `registry:ui` and `target` is `components/ui/<name>.tsx`.
- Svelte `files[].type` is `registry:file` and `target` is `src/lib/components/ui/<file>.svelte` (`svelteTarget`).
- `dependencies` / `devDependencies` / `registryDependencies`, if present, are arrays of non-empty strings.
- Declare `motion` on the React item only when the wrapper imports `motion`. Svelte ports of those components currently declare no npm dependencies.
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

Svelte 5:

- `<script module lang="ts">` empty, then `<script lang="ts">`. The inliner fills the module script. Keep that empty module block.
- `$props()`. Prop is `class`, destructured as `className`.
- Local `cn(...parts)` that filters falsy strings. Do not import `@/lib/utils`.
- `children` is `Snippet`. Overlay scroll is an `HTMLElement` (`scrollEl`, `container`), not a ref object.
- Same defaults as React.

Vanilla:

- No React, no Svelte, no `@/` imports.
- Export an options type, an instance type `{ setOptions, destroy }`, and `create<Name>(canvas | root, options)`.
- Theme helper: `html.dark` / `html.light`, then `data-theme`, then `prefers-color-scheme`. Copy `isDarkTheme` from `logo-burst-vanilla.ts` rather than inventing a new contract.
- Honor `prefers-reduced-motion: reduce`.
- Custom `colors` or `color`, when set, win over the theme palette.

Demos:

- `*-demo.tsx` is for the docs site only. It is not a registry file.
- Use `ComponentPreview`, `ComponentControls`, and `usePreviewProps` the way `shader-gradient-demo.tsx` does.
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

<FrameworkCode>
  <FrameworkReact>
```tsx
"use client"
import { Foo } from "@/components/ui/<name>"
```
  </FrameworkReact>
  <FrameworkSvelte>
```svelte
<script>
  import Foo from "$lib/components/ui/<name>.svelte"
</script>
```
  </FrameworkSvelte>
</FrameworkCode>

## Props

| Prop | Type | Default |
| --- | --- | --- |
```

Add the page under a separator in `content/docs/components/meta.json`. Current groups: Background, Shaders, Footers, Characters, Pages, Sections, Components. Separators look like `"---Background---"`.

MDX components already global: `CliCommand`, `ComponentPreview`, `ComponentControls`, `FrameworkCode`, `FrameworkReact`, `FrameworkSvelte`.

Props tables must match the wrapper defaults. Do not copy a usage example into the Default column (the gooey `defaultValue` row in the docs does this; do not repeat it).

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

- Publish a React-only item. Tests require a Svelte port.
- Import `./<name>-vanilla` from a file that is not the wrapper the build inlines.
- Put site chrome (`components/docs-shell.tsx`, `components/ui/button.tsx`) into the registry. `components/ui/*` in this repo is the docs site’s shadcn kit, not the published set.
- Add a `variant` prop unless the design really has discrete materials. Only `live-orb` has one.
- Document keyboard shortcuts, CSS variables, or tilt angles the engine does not expose.
