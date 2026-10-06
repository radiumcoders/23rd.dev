import Link from "next/link"
import { RiArrowRightLine, RiGithubFill } from "@remixicon/react"

import { GithubStars } from "@/components/github-stars"
import { LandingWall, type WallItem } from "@/components/landing-wall"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { getGithubRepoUrl } from "@/lib/github"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/docs/getting-started", label: "Docs" },
  { href: "/sponsors", label: "Sponsors" },
] as const

const navLink =
  "inline-flex h-8 items-center rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-wash hover:text-foreground"

function LandingNav({ githubStars }: { githubStars: number | null }) {
  return (
    <header className="absolute inset-x-0 top-3 z-30 flex justify-center px-3 sm:top-4">
      <nav
        aria-label="Primary"
        className="flex h-12 w-full max-w-3xl items-center gap-1 rounded-full border bg-sheet/75 pr-1.5 pl-2 shadow-[0_10px_40px_-16px_rgb(0_0_0/0.25)] backdrop-blur-xl"
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-[15px] font-semibold tracking-tight"
        >
          <Logo className="size-7" />
          23rd
        </Link>
        <div className="flex-1" />
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={navLink}>
            {link.label}
          </Link>
        ))}
        <GithubStars
          stars={githubStars}
          className="hidden rounded-full sm:inline-flex"
        />
        <ThemeToggle className="rounded-full" />
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section className="pointer-events-none relative z-20 mx-auto flex w-full max-w-2xl shrink-0 flex-col items-center px-6 pt-[clamp(6rem,16svh,10rem)] text-center">
      <h1 className="font-landing text-[clamp(2.5rem,6.2vw,4.75rem)] leading-[1.02] font-semibold text-balance">
        Components with <span className="text-muted-foreground">a pulse</span>
      </h1>
      <p className="mt-5 max-w-lg text-base text-pretty text-muted-foreground sm:text-lg">
        Shaders, backgrounds and interactive pieces for React and Svelte. Add
        one with the shadcn CLI and own every line of it.
      </p>
      <div className="pointer-events-auto mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/docs/getting-started"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
        >
          Get started
          <RiArrowRightLine className="size-4" />
        </Link>
        <a
          href={getGithubRepoUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-full border bg-sheet px-5 text-sm font-medium transition-colors hover:bg-wash"
        >
          <RiGithubFill className="size-4" />
          GitHub
        </a>
      </div>
    </section>
  )
}

/** Sheet-coloured fades at the frame's sides, over the wall's blurred edges. */
function EdgeFade({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 z-10 w-[14%] from-sheet to-transparent",
        side === "left" ? "left-0 bg-linear-to-r" : "right-0 bg-linear-to-l"
      )}
    />
  )
}

export function Landing({
  items,
  githubStars,
}: {
  items: WallItem[]
  githubStars: number | null
}) {
  return (
    <div className="h-svh min-h-[36rem] p-2 sm:p-3">
      <main
        data-landing-frame
        className="relative isolate flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-sheet [--card-h:calc(var(--card-w)*1.08)] [--card-w:clamp(13.5rem,21vw,23rem)] [--gap:clamp(0.75rem,1.4vw,1.25rem)] [--step:calc(var(--card-h)+var(--gap))] sm:rounded-[2rem]"
      >
        <LandingNav githubStars={githubStars} />
        <LandingWall items={items} layer="edges" />
        <Hero />
        <LandingWall items={items} layer="middle" />
        <EdgeFade side="left" />
        <EdgeFade side="right" />
      </main>
    </div>
  )
}
