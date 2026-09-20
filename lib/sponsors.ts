import { SUPPORT_EMAIL } from "@/lib/site"

const SPONSOR_CONTACT_EMAIL = SUPPORT_EMAIL

export type SponsorTierId = "diamond" | "platinum" | "gold" | "silver"

export interface SponsorTier {
  checkoutHref: string
  description: string
  features: readonly string[]
  gridClassName: string
  id: SponsorTierId
  monthlyPriceUsd: number
  name: string
  slotClassName: string
  slotIds: readonly string[]
}

export const SPONSOR_THANKS_PATH = "/sponsors/thanks"

/** Test-mode Creem payment links. Override with env for live products. */
export const TEST_SPONSOR_CHECKOUT_URLS = {
  diamond: "https://creem.io/test/product/prod_4ZM6WkQrmCSBtFGCdYp7rZ",
  platinum: "https://creem.io/test/product/prod_7jEvtpKnPoVXOAZLBnoWfA",
  gold: "https://creem.io/test/product/prod_MqDtYvXUGlGqgEz898MCA",
  silver: "https://creem.io/test/product/prod_3aZ8AxbA2h43IRUMxigep0",
} as const satisfies Record<SponsorTierId, string>

const TIER_BLUEPRINTS = [
  {
    description:
      "Flagship partner placement. Your brand leads the partners page and major 23rd releases.",
    features: [
      "Extra-large logo, name, and dofollow link on 23rd.dev/sponsors",
      "Named in major release notes and the docs homepage shout-out",
      "Priority email support for install and integration questions",
      "Four exclusive Diamond slots",
    ],
    gridClassName: "grid-cols-1 sm:grid-cols-2",
    id: "diamond",
    monthlyPriceUsd: 250,
    name: "Diamond",
    slotClassName: "min-h-32",
    slots: 4,
  },
  {
    description:
      "High-visibility partner plan for teams that want a prominent logo on 23rd.",
    features: [
      "Large logo, name, and dofollow link on 23rd.dev/sponsors",
      "Named in major release notes",
      "Email support for the registry",
      "Six Platinum slots",
    ],
    gridClassName: "grid-cols-2 sm:grid-cols-3",
    id: "platinum",
    monthlyPriceUsd: 100,
    name: "Platinum",
    slotClassName: "min-h-24",
    slots: 6,
  },
  {
    description:
      "Standard partner plan. Your logo and link sit on the public partners page.",
    features: [
      "Medium logo, name, and dofollow link on 23rd.dev/sponsors",
      "Listed in major release notes",
      "Eight Gold slots",
    ],
    gridClassName: "grid-cols-2 sm:grid-cols-4",
    id: "gold",
    monthlyPriceUsd: 50,
    name: "Gold",
    slotClassName: "min-h-20",
    slots: 8,
  },
  {
    description:
      "Entry partner plan. A compact listing on the public partners page.",
    features: [
      "Compact name and dofollow link on 23rd.dev/sponsors",
      "Twelve Silver slots",
    ],
    gridClassName: "grid-cols-3 sm:grid-cols-6",
    id: "silver",
    monthlyPriceUsd: 20,
    name: "Silver",
    slotClassName: "min-h-12",
    slots: 12,
  },
] as const satisfies ReadonlyArray<
  Omit<SponsorTier, "checkoutHref" | "slotIds"> & { slots: number }
>

export function sponsorCheckoutEnvKey(id: SponsorTierId): string {
  return `CREEM_SPONSOR_${id.toUpperCase()}_CHECKOUT_URL`
}

export function buildSponsorContactHref(tierName: string): string {
  const subject = encodeURIComponent(`23rd ${tierName} sponsorship`)
  return `mailto:${SPONSOR_CONTACT_EMAIL}?subject=${subject}`
}

export function resolveSponsorCheckoutHref(
  configuredUrl: string | undefined,
  fallbackHref: string
): string {
  const trimmed = configuredUrl?.trim()
  if (!trimmed) return fallbackHref

  try {
    const checkoutUrl = new URL(trimmed)
    return checkoutUrl.protocol === "https:" ? checkoutUrl.href : fallbackHref
  } catch {
    return fallbackHref
  }
}

function readCheckoutUrl(id: SponsorTierId): string | undefined {
  // Dynamic lookup so Next.js does not inline the value at build time.
  // Cloudflare Worker secrets are then available at request time.
  return process.env[sponsorCheckoutEnvKey(id)]
}

export function getSponsorTiers(): SponsorTier[] {
  return TIER_BLUEPRINTS.map((tier) => ({
    checkoutHref: resolveSponsorCheckoutHref(
      readCheckoutUrl(tier.id) || TEST_SPONSOR_CHECKOUT_URLS[tier.id],
      buildSponsorContactHref(tier.name)
    ),
    description: tier.description,
    features: tier.features,
    gridClassName: tier.gridClassName,
    id: tier.id,
    monthlyPriceUsd: tier.monthlyPriceUsd,
    name: tier.name,
    slotClassName: tier.slotClassName,
    slotIds: Array.from(
      { length: tier.slots },
      (_, index) => `${tier.id}-${index + 1}`
    ),
  }))
}
