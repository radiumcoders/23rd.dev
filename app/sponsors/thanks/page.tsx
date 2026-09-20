import Link from "next/link"

import { Logo } from "@/components/logo"
import { buttonVariants } from "@/components/ui/button"
import { buildPageMetadata } from "@/lib/seo"
import { cn } from "@/lib/utils"

export const metadata = buildPageMetadata({
  title: "Thank you",
  description:
    "Your 23rd sponsorship is confirmed. Thank you for supporting the registry.",
  path: "/sponsors/thanks",
})

export default async function SponsorThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string }>
}) {
  const { checkout_id: checkoutId } = await searchParams

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <Logo className="size-16" cornerRadius={8} />
        <h1 className="text-3xl font-semibold tracking-tight">Thank you</h1>
        <p className="text-balance text-muted-foreground">
          Your sponsorship helps keep 23rd independent and shipping. We will add
          your logo and link to the sponsors page shortly.
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
            href="/docs"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Read the docs
          </Link>
        </div>
      </div>
    </main>
  )
}
