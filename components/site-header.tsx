"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { GithubStars } from "@/components/github-stars"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/sponsors", label: "Partners" },
] as const

export function SiteHeader({ githubStars }: { githubStars?: number | null }) {
  const pathname = usePathname()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <Link
        href="/docs"
        className="flex min-w-0 items-center gap-2 text-sm font-medium"
      >
        <Logo className="size-6 shrink-0" cornerRadius={4} />
        <span className="hidden truncate sm:inline">23rd</span>
      </Link>
      <nav
        aria-label="Primary"
        className="flex min-w-0 items-center gap-0.5 sm:gap-1"
      >
        {NAV_LINKS.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(`${link.href}/`)

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                buttonVariants({ size: "sm", variant: "ghost" }),
                "px-2 text-muted-foreground hover:text-foreground",
                isActive && "bg-muted text-foreground"
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
      <div className="min-w-0 flex-1" />
      <GithubStars
        stars={githubStars}
        className="hidden shrink-0 sm:inline-flex"
      />
      <ThemeToggle />
    </header>
  )
}
