import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTACT_URL,
  PRIVACY_LAST_UPDATED,
  PRIVACY_LAST_UPDATED_ISO,
} from "@/lib/legal"
import { buildPageMetadata } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "How 23rd processes website visits, local preferences, sponsorship checkout, and communications.",
  path: "/privacy",
})

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <article className="max-w-3xl space-y-8 pb-12 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-foreground">
        <header className="space-y-3">
          <p className="font-mono text-sm text-muted-foreground">Legal</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p>
            <strong>Last updated:</strong>{" "}
            <time dateTime={PRIVACY_LAST_UPDATED_ISO}>
              {PRIVACY_LAST_UPDATED}
            </time>
          </p>
          <p>
            23rd is a radiumcoders project. This policy explains how we process
            information when you visit 23rd.dev, install from the registry, buy
            a sponsorship, or contact us.
          </p>
        </header>

        <section className="space-y-3">
          <h2>At a glance</h2>
          <ul className="space-y-2">
            <li>
              Browsing the docs and installing registry components does not
              require an account.
            </li>
            <li>
              Paid sponsorships are checked out through Creem. We do not store
              full card numbers on 23rd.dev.
            </li>
            <li>
              A theme preference may be stored in your browser. We do not sell
              personal information.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2>Information we process</h2>
          <p>
            Our host may process standard request information such as IP
            address, browser, requested URL, and timestamps to deliver and
            secure the site. The site may load privacy-respecting analytics
            (Tracwell) for aggregate traffic, and it fetches a public GitHub
            star count for the repository.
          </p>
          <p>
            The theme choice stays in local storage under your browser and can
            be cleared in browser settings.
          </p>
          <p>
            If you email us, we receive your address and message so we can reply
            and keep ordinary business records.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Payments</h2>
          <p>
            Sponsorship checkout is hosted by Creem, the merchant of record.
            Creem collects billing details under{" "}
            <a href="https://www.creem.io/privacy">
              Creem&apos;s privacy policy
            </a>
            . We receive the order information needed to place your logo, name,
            and link, such as your email, plan, and the assets you send us.
          </p>
        </section>

        <section className="space-y-3">
          <h2>How we use information</h2>
          <p>
            We use it to operate the site, fulfill sponsorships, respond to
            support, and improve the registry. We do not sell personal
            information or share it for advertising.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Retention</h2>
          <p>
            Support email is kept as long as needed to help you and meet legal
            obligations. Creem retains payment records under its own policy.
            Sponsor listing assets stay published while a subscription is
            active.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Your choices and rights</h2>
          <p>
            Depending on where you live, you may ask to access, correct, or
            delete personal information we hold. Contact{" "}
            <a href={LEGAL_CONTACT_URL}>{LEGAL_CONTACT_EMAIL}</a>. For billing
            data held by Creem, use the Creem customer portal as well.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Contact</h2>
          <p>
            For privacy questions or requests, email{" "}
            <a href={LEGAL_CONTACT_URL}>{LEGAL_CONTACT_EMAIL}</a>.
          </p>
        </section>
      </article>
    </main>
  )
}
