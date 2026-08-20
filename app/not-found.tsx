import type { Metadata } from "next"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "This page could not be found. It might have been moved or deleted.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">404</h1>
        <p className="text-muted-foreground">
          This page could not be found. It might have been moved or deleted.
        </p>
        <Link
          href="/docs"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Back to docs
        </Link>
      </div>
    </div>
  )
}
