import Link from "next/link"

import { LEGAL_LINKS, SUPPORT_EMAIL } from "@/lib/site"

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t px-4 py-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Support:{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
