"use client"

import { useEffect } from "react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { DOCS_HOME } from "@/lib/site"
import { cn } from "@/lib/utils"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. You can try again or head back to the docs.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Try again
          </button>
          <Link href={DOCS_HOME} className={cn(buttonVariants({ variant: "outline" }))}>
            Back to docs
          </Link>
        </div>
      </div>
    </div>
  )
}
