import { SUPPORT_EMAIL } from "@/lib/site"
import { buildPageMetadata } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "How 23rd.dev handles information, including Creem checkout data.",
  path: "/privacy",
})

export default function PrivacyPage() {
  return (
    <main className="flex-1">
      <article className="mx-auto w-full max-w-2xl px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
        <h1 className="text-4xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Effective September 20, 2026
        </p>

        <div className="prose mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline-offset-4 hover:[&_a]:underline">
          <p>
            23rd.dev is a documentation site and shadcn registry operated by
            radiumcoders (Jay). This policy describes what we collect when you
            browse the Site or buy a Partner Plan.
          </p>

          <h2 className="text-lg font-semibold text-foreground">
            Information we collect
          </h2>
          <p>
            Browsing the docs does not require an account. The Site may store a
            theme preference in your browser (localStorage) and may load
            privacy-respecting analytics (Tracwell) to understand aggregate
            traffic. We fetch public GitHub star counts for the repository.
          </p>
          <p>
            If you email us, we receive whatever you send, including your email
            address, so we can reply.
          </p>

          <h2 className="text-lg font-semibold text-foreground">Payments</h2>
          <p>
            Paid Partner Plans are checked out through Creem, the merchant of
            record. Creem collects and processes billing details (such as name,
            email, and payment method) under{" "}
            <a href="https://www.creem.io/privacy">Creem’s privacy policy</a>.
            We receive order and subscription information needed to deliver
            partner placement (for example your email, plan, and the assets you
            send us). We do not store full card numbers on 23rd.dev.
          </p>

          <h2 className="text-lg font-semibold text-foreground">
            How we use information
          </h2>
          <p>
            We use it to operate the Site, fulfill Partner Plans, respond to
            support, and improve the registry. We do not sell personal
            information.
          </p>

          <h2 className="text-lg font-semibold text-foreground">Retention</h2>
          <p>
            Support email is kept as long as needed to help you and meet legal
            obligations. Creem retains payment records per its own policy.
            Partner listing assets stay published while your subscription is
            active and may remain in git history after cancellation.
          </p>

          <h2 className="text-lg font-semibold text-foreground">Your rights</h2>
          <p>
            Depending on where you live, you may ask to access, correct, or
            delete personal information we hold. Contact{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. For billing
            data held by Creem, use the Creem customer portal or Creem support
            as well.
          </p>

          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p>
            Privacy questions:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </div>
      </article>
    </main>
  )
}
