import Link from "next/link"

import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTACT_URL,
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
} from "@/lib/legal"
import { buildPageMetadata } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "Terms of Service",
  description:
    "Terms governing use of the 23rd website, free registry, and paid sponsorships.",
  path: "/terms",
})

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <article className="max-w-3xl space-y-8 pb-12 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-foreground">
        <header className="space-y-3">
          <p className="font-mono text-sm text-muted-foreground">Legal</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p>
            <strong>Last updated:</strong>{" "}
            <time dateTime={LEGAL_LAST_UPDATED_ISO}>{LEGAL_LAST_UPDATED}</time>
          </p>
          <p>
            These terms govern your use of the 23rd website, component registry,
            and related services. 23rd is a radiumcoders project. By using the
            site or buying a sponsorship, you agree to these terms.
          </p>
        </header>

        <section className="space-y-3">
          <h2>The service</h2>
          <p>
            23rd publishes opinionated UI components as a free, open-source
            shadcn registry. You can install them with the CLI and use them
            under the license shipped with each item. A sponsorship is not
            required to use the registry.
          </p>
          <p>
            Paid sponsorships are separate digital products sold through Creem,
            the merchant of record. They buy brand placement on this site, not
            extra components and not a donation.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Who may use 23rd</h2>
          <p>
            You must be legally able to enter into these terms. If you use 23rd
            for an organization, you represent that you have authority to bind
            that organization, and &quot;you&quot; includes that organization.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Paid sponsorships</h2>
          <p>
            Sponsorships are recurring monthly subscriptions: Silver $20, Gold
            $50, Platinum $100, and Diamond $250, billed in USD. Prices are
            shown on the <Link href="/sponsors">sponsors page</Link> before
            checkout. You are buying a logo, name, and link on that page, plus a
            mention in major release notes.
          </p>
          <p>
            Checkout, invoices, tax collection, and subscription management are
            provided by Creem (<a href="https://www.creem.io">creem.io</a>).
            Creem&apos;s terms also apply to payment processing. You can cancel
            through the Creem customer portal. Placement ends when the paid
            period ends.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Placement</h2>
          <p>
            After payment we add the name, logo, and URL you supply as soon as
            practical, usually within a few business days. We may refuse or
            remove listings that are unlawful, misleading, or harmful to the
            project. Placement does not guarantee traffic or an endorsement of
            your product.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Refunds</h2>
          <p>
            Refund requests follow Creem&apos;s refund policy and applicable
            consumer law. Contact us at{" "}
            <a href={LEGAL_CONTACT_URL}>{LEGAL_CONTACT_EMAIL}</a> and we will
            work with Creem on eligible cases.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Acceptable use</h2>
          <p>
            Do not misuse the site, attempt to disrupt it, or submit sponsor
            assets you do not have rights to. We may limit or remove access when
            reasonably necessary to enforce these terms, protect the service, or
            comply with law.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Disclaimers</h2>
          <p>
            To the maximum extent permitted by law, the site is provided
            &quot;as is&quot; and &quot;as available.&quot; Nothing in these
            terms excludes warranties or rights that cannot lawfully be
            excluded.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Contact</h2>
          <p>
            Questions about these terms can be sent to{" "}
            <a href={LEGAL_CONTACT_URL}>{LEGAL_CONTACT_EMAIL}</a>.
          </p>
        </section>
      </article>
    </main>
  )
}
