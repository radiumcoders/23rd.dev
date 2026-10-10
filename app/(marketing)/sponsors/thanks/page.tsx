import type { Metadata } from "next"
import Link from "next/link"

import { Logo } from "@/components/logo"
import { ThanksConfetti } from "@/components/thanks-confetti"
import { buttonVariants } from "@/components/ui/button"
import { buildPageMetadata } from "@/lib/seo"
import { DOCS_HOME } from "@/lib/site"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Thank you",
    description:
      "Your 23rd Partner Plan is confirmed. Thank you for supporting the registry.",
    path: "/sponsors/thanks",
  }),
  // Anyone can open this URL, so keep it out of search results.
  robots: { index: false, follow: false },
}

// Creem checkout IDs; anything else in the query string is not echoed.
const CHECKOUT_ID = /^[A-Za-z0-9_-]{1,64}$/

export default async function SponsorThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string }>
}) {
  const { checkout_id: rawCheckoutId } = await searchParams
  const checkoutId =
    rawCheckoutId && CHECKOUT_ID.test(rawCheckoutId) ? rawCheckoutId : null

  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-16">
      <ThanksConfetti />
      <div className="relative z-10 flex max-w-md flex-col items-center gap-4 text-center">
        <Logo className="size-16" />
        <h1 className="text-3xl font-semibold tracking-tight">Thank you</h1>
        <p className="text-balance text-muted-foreground">
          Your Partner Plan helps keep 23rd independent and shipping. We will
          add your logo and link to the partners page shortly.
        </p>
        {checkoutId ? (
          <p className="font-mono text-xs text-muted-foreground">
            Checkout {checkoutId}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/sponsors" className={cn(buttonVariants())}>
            Back to sponsors
          </Link>
          <Link
            href={DOCS_HOME}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Read the docs
          </Link>
        </div>
      </div>
    </main>
  )
}
