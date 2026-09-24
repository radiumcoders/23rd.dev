import { connection } from "next/server"

import { Logo } from "@/components/logo"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { buildPageMetadata } from "@/lib/seo"
import {
  getSponsorTiers,
  isSponsorCheckoutBlocked,
  type SponsorTier,
} from "@/lib/sponsors"
import { cn } from "@/lib/utils"

export const metadata = buildPageMetadata({
  title: "Sponsor 23rd",
  description:
    "Recurring monthly sponsorships, billed through Creem, put your logo and link on this page. Diamond $250, Platinum $100, Gold $50, Silver $20.",
  path: "/sponsors",
  keywords: ["sponsors", "Creem", "open source sponsorship"],
})

function SponsorSection({ tier }: { tier: SponsorTier }) {
  return (
    <section aria-label={`${tier.name} sponsors`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-mono text-xs font-semibold text-muted-foreground uppercase">
            {tier.name}
          </h2>
          <p className="font-mono text-xs font-semibold text-foreground">
            ${tier.monthlyPriceUsd}
            <span className="text-muted-foreground">/mo</span>
          </p>
        </div>
        <Separator />
      </div>
      <ul className={cn("grid gap-3 pt-4", tier.gridClassName)}>
        {tier.slotIds.map((slotId, index) => {
          const slotClassName = cn(
            buttonVariants({ variant: "outline" }),
            "h-auto w-full border-dashed px-2 text-center text-muted-foreground",
            tier.slotClassName
          )
          const checkoutBlocked = isSponsorCheckoutBlocked(tier.checkoutHref)

          return (
            <li className="flex" key={slotId}>
              {checkoutBlocked ? (
                <span
                  aria-disabled="true"
                  className={cn(
                    slotClassName,
                    "cursor-default text-xs leading-snug text-balance whitespace-normal hover:border-border hover:bg-transparent hover:text-muted-foreground dark:hover:bg-transparent"
                  )}
                >
                  Coming soon
                </span>
              ) : (
                <a
                  href={tier.checkoutHref}
                  aria-label={`Sponsor 23rd at the ${tier.name} tier, slot ${index + 1}`}
                  className={cn(slotClassName, "hover:border-foreground/40")}
                >
                  Be here
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default async function SponsorsPage() {
  await connection()
  const tiers = getSponsorTiers()
  const checkoutComingSoon = tiers.every((tier) =>
    isSponsorCheckoutBlocked(tier.checkoutHref)
  )

  return (
    <main className="flex-1 overflow-x-clip">
      <div className="mx-auto w-full max-w-4xl px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
        <header className="flex flex-col items-center gap-4 pb-12 text-center">
          <Logo className="size-16" cornerRadius={8} />
          {checkoutComingSoon ? (
            <p className="font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Coming soon
            </p>
          ) : null}
          <h1 className="text-4xl font-semibold tracking-tight">
            Sponsor 23rd
          </h1>
          <p className="max-w-xl text-balance text-muted-foreground">
            Keep opinionated open-source components shipping. Each tier is a
            recurring monthly sponsorship, billed through Creem, that puts your
            logo and name on this page, links to your site, and includes you in
            major release notes. The component registry stays free.
          </p>
          {checkoutComingSoon ? (
            <p className="max-w-xl text-sm text-balance text-muted-foreground">
              Checkout opens after Creem approves the store. Slots stay reserved
              until then.
            </p>
          ) : null}
        </header>

        <div className="flex flex-col gap-12">
          {tiers.map((tier) => (
            <SponsorSection key={tier.id} tier={tier} />
          ))}
        </div>
      </div>
    </main>
  )
}
