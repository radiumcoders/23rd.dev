<img width="1896" height="1030" alt="image" src="https://github.com/user-attachments/assets/efdf6ac9-ed4e-4579-906f-f59939ce1e68" />

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

**23rd** is an open-source [shadcn/ui](https://ui.shadcn.com) registry of tasteful, opinionated UI components. Copy what you need, paste into your app, and ship, without fighting a kitchen-sink design system.

Site: [23rd.dev](https://23rd.dev) · Docs: [23rd.dev/docs](https://23rd.dev/docs)

## Why 23rd

Most kits hand you every option. 23rd picks a direction: spacing, motion, and interaction patterns that already feel finished. You can still override anything; you just start from a sharper baseline.

- **shadcn-native**: install with the CLI, own the source in your repo
- **Opinionated defaults**: less boilerplate, clearer decisions
- **React-first**: every item is a single client component with typed props

## Quick start

Install a component:

```bash
pnpm dlx shadcn@latest add @23rd/gooey-color-picker
```

Or pull straight from GitHub:

```bash
pnpm dlx shadcn@latest add radiumcoders/23rd.dev/gooey-color-picker
```

## Agent skill - IN BETA STAGE

The 23rd agent skill teaches a coding agent every published registry component: which one fits, how to install it, and the props that actually exist. It also knows when not to use a component.

[![skills.sh](https://skills.sh/b/radiumcoders/23rd.dev)](https://skills.sh/radiumcoders/23rd.dev)

```bash
npx skills add radiumcoders/23rd.dev --skill 23rd
```

Global install:

```bash
npx skills add radiumcoders/23rd.dev --skill 23rd -g
```

`skills/23rd/` is the copy the [skills CLI](https://skills.sh) discovers. `.cursor/skills/23rd/` is the same skill for Cursor `/23rd` in this repo. Docs: [23rd.dev/docs](https://23rd.dev/docs).

## Components

| Component                                                                 | Install                    | Description                                                                           |
| ------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------- |
| [ASCII Fluid](https://23rd.dev/docs/components/ascii-fluid)               | `@23rd/ascii-fluid`        | Mouse-trail WebGL fluid quantized to a clean ASCII brightness ramp                    |
| [ASCII Logo](https://23rd.dev/docs/components/ascii-logo)                 | `@23rd/ascii-logo`         | Interactive ASCII wordmark: hover shove, then click to scatter, drop, and gather      |
| [Dither Scan](https://23rd.dev/docs/components/dither-scan)               | `@23rd/dither-scan`        | A 1-bit dithered image a diagonal scan line clears over a set number of passes        |
| [Dithered 404](https://23rd.dev/docs/components/dithered-404)             | `@23rd/dithered-404`       | Bayer-pixel 404; a fireball cursor scorches it into embers and smoke, then it reforms |
| [Snake 404](https://23rd.dev/docs/components/snake-404) | `@23rd/snake-404` | Dot-matrix 404 where every dot is food; a Nokia-style snake eats it, and you can take over |
| [Folio](https://23rd.dev/docs/components/folio)                           | `@23rd/folio`              | The page leans back in perspective while you scroll, blurs, then springs flat         |
| [Gooey Color Picker](https://23rd.dev/docs/components/gooey-color-picker) | `@23rd/gooey-color-picker` | Floating swatch → hue wheel, alpha, hex, joined by an SVG gooey filter                |
| [Iso Lattice](https://23rd.dev/docs/components/iso-lattice)               | `@23rd/iso-lattice`        | Glowing isometric tiles build solid figures, one over the last, from the floor up      |
| [Live Orb](https://23rd.dev/docs/components/live-orb)                     | `@23rd/live-orb`           | An evenly lit sphere with two capsule eyes that follow the pointer                    |
| [Logo Burst](https://23rd.dev/docs/components/logo-burst)                 | `@23rd/logo-burst`         | Hair-line tentacles explode from the center, then breathe, light and dark             |
| [Phosphor Score](https://23rd.dev/docs/components/phosphor-score)         | `@23rd/phosphor-score`     | Vertical CRT sheet music; notes fall, bloom at the playhead, then exit in a flare     |
| [Radiant Lines](https://23rd.dev/docs/components/radiant-lines)           | `@23rd/radiant-lines`      | Hyperspace starfield background; warp speed driven by scroll                          |
| [Ring Tower](https://23rd.dev/docs/components/ring-tower)                 | `@23rd/ring-tower`         | A three.js tower of tilted image bands; drag to spin, neighbors counter-turn          |
| [Shader Anime Fire](https://23rd.dev/docs/components/shader-anime-fire)   | `@23rd/shader-anime-fire`  | Cel-shaded flames licking up from the bottom of a landing hero                        |
| [Shader Gradient](https://23rd.dev/docs/components/shader-gradient)       | `@23rd/shader-gradient`    | Quiet WebGL wash behind landing heroes, empty states, and marketing sections          |
| [Shader Sky](https://23rd.dev/docs/components/shader-sky)                 | `@23rd/shader-sky`         | Clear blue or rain behind a hero; drifting clouds, optional window-glass film         |
| [Shader Metal](https://23rd.dev/docs/components/shader-metal)             | `@23rd/shader-metal`       | Liquid chrome, gold, or copper ribbons; the key light follows the pointer             |
| [Stretchy Footer](https://23rd.dev/docs/components/stretchy-footer)       | `@23rd/stretchy-footer`    | Dia-style rubber overscroll; aurora stretches past the bottom, then snaps back        |
| [Typewriter](https://23rd.dev/docs/components/typewriter)                 | `@23rd/typewriter`         | A playable typewriter in SVG; keys press, typebars strike, the carriage steps         |
| [Mech Keyboard](https://23rd.dev/docs/components/mech-keyboard)           | `@23rd/mech-keyboard`      | An isometric keyboard illustration that presses with yours and records shortcuts     |

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
| `pnpm build`          | Build registry, OG cards, and the production app       |
| `pnpm registry:build` | Emit `public/r/*.json` from `registry/`                |
| `pnpm test`           | Registry, listings, OG, and sponsors tests             |
| `pnpm typecheck`      | MDX + TypeScript check                                 |
| `pnpm lint`           | ESLint                                                 |

Stack: Next.js 16, React 19, Fumadocs, Tailwind CSS 4, shadcn/ui (Base UI), Vercel.

### Deploy to Vercel

The repo is connected to a Vercel project through Vercel's GitHub integration: every push to `main` deploys production at [23rd.dev](https://23rd.dev), and every PR gets a preview deployment whose URL Vercel comments on the PR. GitHub Actions (`.github/workflows/ci.yml`) only runs lint, typecheck, and tests.

Project settings: framework **Next.js**, install command `pnpm install`, build command `pnpm build`. Set the environment variable `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel uses the pnpm version pinned in `packageManager`, and `GITHUB_TOKEN` (any read-only token) so the build-time star count does not hit GitHub's unauthenticated rate limit.

Deploy by hand with the [Vercel CLI](https://vercel.com/docs/cli): `vercel` for a preview, `vercel --prod` for production.

## Sponsors (Creem)

The [sponsors page](https://23rd.dev/sponsors) is the same empty-slot board as [shadscan](https://github.com/TheOrcDev/shadscan): Diamond **$250/mo**, Platinum **$100/mo**, Gold **$50/mo**, Silver **$20/mo**. Live Creem payment links are wired, so empty slots open checkout.

### 1. Create the Creem store

1. Sign up at [creem.io](https://creem.io) and open the [dashboard](https://creem.io/dashboard).
2. Leave **Test Mode** on (sidebar toggle) while you wire this up. Test and live products/keys are completely separate.
3. Complete store details if the dashboard asks for them. Live payouts later need KYC/KYB under **Balances → Payout Account**.

### 2. Create the four subscription products

In **Products**, create one **recurring / every-month / USD** product per tier:

| Product name  | Price | Env var                               |
| ------------- | ----- | ------------------------------------- |
| 23rd Diamond  | $250  | `CREEM_SPONSOR_DIAMOND_CHECKOUT_URL`  |
| 23rd Platinum | $100  | `CREEM_SPONSOR_PLATINUM_CHECKOUT_URL` |
| 23rd Gold     | $50   | `CREEM_SPONSOR_GOLD_CHECKOUT_URL`     |
| 23rd Silver   | $20   | `CREEM_SPONSOR_SILVER_CHECKOUT_URL`   |

On each product, set the success URL to `https://23rd.dev/sponsors/thanks` (or `http://localhost:3000/sponsors/thanks` in test). Click **Share** and copy the payment link (`https://www.creem.io/payment/prod_...`).

You can do the same from the [Creem CLI](https://github.com/armitage-labs/homebrew-creem) after `creem login --api-key creem_test_...`:

```bash
creem products create \
  --name "23rd Diamond" \
  --description "Monthly Diamond sponsorship: logo, link, and release notes." \
  --price 25000 \
  --currency USD \
  --billing-type recurring \
  --billing-period every-month \
  --tax-category saas
```

Prices are in cents (`25000` = $250.00). Repeat for `10000`, `5000`, and `2000`.

### 3. Put the links in env

Live payment links are already in `.env.example` and the fallback in `lib/sponsors.ts`.

Local Next.js (`pnpm dev`): copy `.env.example` → `.env.local`.

A Vercel environment variable with the same name overrides the fallback:

```bash
vercel env add CREEM_SPONSOR_DIAMOND_CHECKOUT_URL production
vercel env add CREEM_SPONSOR_PLATINUM_CHECKOUT_URL production
vercel env add CREEM_SPONSOR_GOLD_CHECKOUT_URL production
vercel env add CREEM_SPONSOR_SILVER_CHECKOUT_URL production
```

Paste the matching `https://` payment link when prompted. Redeploy after changing a variable.

## Contributing

New components live under `registry/<name>/` with a vanilla engine, a React wrapper, and a `registry.json`, then get documented in `content/docs/components/`. Run `pnpm registry:build` before shipping registry changes.

PRs that sharpen defaults, fix edge cases, or add tasteful components are welcome.

## Links

- [Documentation](https://23rd.dev/docs)
- [Registry index](https://23rd.dev/r/registry.json)
- [Agent skill on skills.sh](https://skills.sh/radiumcoders/23rd.dev)
- [shadcn/ui](https://ui.shadcn.com)

---

Made by [radiumcoders](https://github.com/radiumcoders) (Jay).
