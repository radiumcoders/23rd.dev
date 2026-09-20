import { connection } from "next/server"

import { JsonLd } from "@/components/json-ld"
import { buttonVariants } from "@/components/ui/button"
import { SITE_NAME, SITE_URL, absoluteUrl, buildPageMetadata } from "@/lib/seo"
import { SUPPORT_EMAIL } from "@/lib/site"
import { getSponsorTiers } from "@/lib/sponsors"
import { cn } from "@/lib/utils"

export const metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "23rd Partner Plans are paid monthly subscriptions sold through Creem. The component registry stays free. Plans start at $20/mo.",
  path: "/pricing",
  keywords: ["pricing", "Creem", "partner plans", "paid plans"],
})

export default async function PricingPage() {
  await connection()
  const tiers = getSponsorTiers()

  const offers = tiers.map((tier) => ({
    "@type": "Offer",
    name: `${tier.name} Partner Plan`,
    description: tier.description,
    price: String(tier.monthlyPriceUsd),
    priceCurrency: "USD",
    priceValidUntil: "2027-12-31",
    url: absoluteUrl("/pricing"),
    availability: "https://schema.org/InStock",
    billingIncrement: "P1M",
  }))

  return (
    <main className="flex-1">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${SITE_NAME} Partner Plans`,
          description:
            "Paid monthly partner placement on 23rd.dev, billed through Creem. The shadcn registry remains free and open source.",
          brand: { "@type": "Brand", name: SITE_NAME },
          url: `${SITE_URL}/pricing`,
          offers,
        }}
      />
      <div className="mx-auto w-full max-w-4xl px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
        <header className="mx-auto max-w-2xl pb-12 text-center">
          <p className="font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Paid plans
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            23rd Partner Plans
          </h1>
          <p className="mt-4 text-lg text-balance text-muted-foreground">
            The 23rd shadcn registry is free and open source — install any
            component with the CLI at no charge. What you can buy here are{" "}
            <strong className="font-medium text-foreground">
              paid monthly Partner Plans
            </strong>
            , sold and billed by Creem. Each plan is a commercial subscription
            for brand placement on 23rd.dev, not a donation and not GitHub
            Sponsors. Silver $20/mo, Gold $50/mo, Platinum $100/mo, Diamond
            $250/mo.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Support:{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </header>

        <section aria-labelledby="plans-heading" className="space-y-6">
          <h2 id="plans-heading" className="sr-only">
            Monthly plan prices
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {tiers.map((tier) => (
              <article
                key={tier.id}
                className="flex flex-col rounded-2xl border bg-card p-6 text-card-foreground"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  <p className="font-mono text-sm font-semibold">
                    ${tier.monthlyPriceUsd}
                    <span className="text-muted-foreground">/mo</span>
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {tier.description}
                </p>
                <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span aria-hidden className="text-muted-foreground">
                        –
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={tier.checkoutHref}
                  className={cn(buttonVariants(), "mt-6 w-full")}
                >
                  Subscribe to {tier.name} — ${tier.monthlyPriceUsd}/mo
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            What you are buying
          </h2>
          <p>
            Partner Plans are digital products. Checkout is hosted by{" "}
            <a
              href="https://www.creem.io"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Creem
            </a>
            , the merchant of record. After payment you receive a logo, name,
            and link on the{" "}
            <a
              href="/sponsors"
              className="text-foreground underline-offset-4 hover:underline"
            >
              partners page
            </a>
            , plus the release-note and support benefits listed on your plan.
            You do not unlock extra registry components — every published
            component stays free.
          </p>
          <p>
            Billing is monthly in USD until you cancel in the Creem customer
            portal. Questions:{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
