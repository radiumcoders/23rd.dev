import Link from "next/link"

import { getGithubRepoUrl } from "@/lib/github"
import {
  COMPONENT_COUNT,
  formatDuration,
  formatExactCount,
  formatPercent,
  formatViewsPerVisit,
} from "@/lib/site-stats"
import { cn } from "@/lib/utils"

const cardClassName =
  "flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-4 py-8 text-center"

function SummaryCard({
  value,
  label,
  href,
  external,
}: {
  value: string
  label: string
  href?: string
  external?: boolean
}) {
  const body = (
    <>
      <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:text-4xl">
        {value}
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">{label}</p>
    </>
  )

  if (!href) {
    return <div className={cn(cardClassName, "min-h-36")}>{body}</div>
  }

  const className = cn(
    cardClassName,
    "min-h-36 transition-colors hover:bg-muted/40"
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {body}
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">No previous range</p>
    </div>
  )
}

export function SiteStats({
  githubStars,
  pageviewsLastMonth = null,
  pageviewsSinceLaunch = null,
  visitors = null,
  pageviews = null,
  bounceRate = null,
  avgTimeSeconds = null,
  viewsPerVisit = null,
}: {
  githubStars: number | null
  pageviewsLastMonth?: number | null
  pageviewsSinceLaunch?: number | null
  visitors?: number | null
  pageviews?: number | null
  bounceRate?: number | null
  avgTimeSeconds?: number | null
  viewsPerVisit?: number | null
}) {
  return (
    <section aria-label="Site analytics" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          value={formatExactCount(pageviewsLastMonth)}
          label="Pageviews last month"
        />
        <SummaryCard
          value={formatExactCount(githubStars)}
          label="GitHub stars"
          href={getGithubRepoUrl()}
          external
        />
        <SummaryCard
          value={formatExactCount(COMPONENT_COUNT)}
          label="Components"
          href="/docs"
        />
        <SummaryCard value="Free" label="For anything you build" />
      </div>

      <div className={cn(cardClassName, "min-h-40 px-6 py-10")}>
        <p className="text-4xl font-semibold tracking-tight text-foreground tabular-nums sm:text-5xl">
          {formatExactCount(pageviewsSinceLaunch)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pageviews since launch
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          label="Visitors · estimated"
          value={formatExactCount(visitors)}
        />
        <MetricCard label="Page views" value={formatExactCount(pageviews)} />
        <MetricCard
          label="Bounce rate · live"
          value={formatPercent(bounceRate)}
        />
        <MetricCard
          label="Avg. time · live"
          value={formatDuration(avgTimeSeconds)}
        />
        <MetricCard
          label="Views per visit"
          value={formatViewsPerVisit(viewsPerVisit)}
        />
      </div>

      <p className="pt-2 text-center text-xs text-balance text-muted-foreground">
        GitHub stars refresh daily.
      </p>
    </section>
  )
}
