import { SUPPORT_EMAIL } from "@/lib/site"
import { buildPageMetadata } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "Terms for 23rd.dev and paid Partner Plans sold through Creem.",
  path: "/terms",
})

export default function TermsPage() {
  return (
    <main className="flex-1">
      <article className="mx-auto w-full max-w-2xl px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
        <h1 className="text-4xl font-semibold tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Effective September 20, 2026
        </p>

        <div className="prose mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline-offset-4 hover:[&_a]:underline">
          <p>
            These terms govern your use of 23rd.dev (the “Site”), operated by
            radiumcoders (Jay) (“we”, “us”). Paid Partner Plans are sold through
            Creem, which acts as merchant of record for those purchases. By
            using the Site or buying a plan, you agree to these terms.
          </p>

          <h2 className="text-lg font-semibold text-foreground">
            The free registry
          </h2>
          <p>
            Published 23rd components remain free, open-source shadcn registry
            items. You may install them with the CLI, copy the source, and use
            them in your projects under the license shipped with each item. A
            Partner Plan is not required to use the registry.
          </p>

          <h2 className="text-lg font-semibold text-foreground">
            Paid Partner Plans
          </h2>
          <p>
            Partner Plans are paid monthly subscriptions: Silver $20, Gold $50,
            Platinum $100, and Diamond $250, billed in USD. You are buying brand
            placement (logo, name, and link on the partners page, plus the
            benefits listed on <a href="/pricing">/pricing</a>), not extra
            components, not source-code access, and not a donation. Prices are
            shown on the pricing page before checkout.
          </p>
          <p>
            Checkout, invoices, tax collection, and subscription management are
            provided by Creem (<a href="https://www.creem.io">creem.io</a>).
            Creem’s terms also apply to payment processing. You can cancel
            through the Creem customer portal; access to placement ends when the
            paid period ends.
          </p>

          <h2 className="text-lg font-semibold text-foreground">
            Placement and content
          </h2>
          <p>
            After payment we will add your supplied name, logo, and URL to the
            partners page as soon as practical, usually within a few business
            days. We may refuse or remove listings that are unlawful,
            misleading, or harmful to the project. Placement does not guarantee
            traffic, leads, or endorsement of your product.
          </p>

          <h2 className="text-lg font-semibold text-foreground">Refunds</h2>
          <p>
            Refund requests are handled according to Creem’s refund policy and
            applicable consumer law. Contact us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will
            work with Creem on eligible cases.
          </p>

          <h2 className="text-lg font-semibold text-foreground">
            Acceptable use
          </h2>
          <p>
            Do not misuse the Site, attempt to disrupt it, or submit partner
            assets you do not have rights to. The Site is provided “as is”
            without warranties beyond those required by law.
          </p>

          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p>
            Support and legal notices:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </div>
      </article>
    </main>
  )
}
