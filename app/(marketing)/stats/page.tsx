import Link from "next/link"

import { buildPageMetadata } from "@/lib/seo"
import { getSiteStats } from "@/lib/stats"
import { getTraffic, type Ranked } from "@/lib/tracwell"
import { cn } from "@/lib/utils"

export const revalidate = 3600

export const metadata = buildPageMetadata({
  title: "Stats",
  description:
    "Open numbers for 23rd: lifetime traffic, components shipped, GitHub stars, forks, contributors, and commits over the past year.",
  path: "/stats",
  keywords: ["stats", "open source", "open metrics", "analytics"],
})

const numberFormat = new Intl.NumberFormat("en")
const dayFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

const surface =
  "rounded-xl bg-sheet p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5"

function StatTile({
  label,
  value,
  className,
}: {
  label: string
  value: number | null
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1", surface, className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-3xl font-semibold tracking-tight tabular-nums">
        {value === null ? "–" : numberFormat.format(value)}
      </dd>
    </div>
  )
}

type Bar = { key: string; label: string; value: number }

function BarChart({
  title,
  unit,
  bars,
}: {
  title: string
  unit: string
  bars: Bar[]
}) {
  const max = Math.max(1, ...bars.map((bar) => bar.value))

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className={surface}>
        <div className="flex h-40 items-end gap-[2px]" aria-hidden="true">
          {bars.map((bar) => (
            <div
              key={bar.key}
              className="group relative flex h-full flex-1 items-end"
            >
              <div
                className="w-full rounded-t-[4px] bg-foreground/80 transition-colors group-hover:bg-foreground"
                style={{
                  height: bar.value
                    ? `${Math.max(2, (bar.value / max) * 100)}%`
                    : "2px",
                  opacity: bar.value ? undefined : 0.15,
                }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                <span className="font-medium tabular-nums">
                  {numberFormat.format(bar.value)}
                </span>{" "}
                <span className="text-muted-foreground">{bar.label}</span>
              </div>
            </div>
          ))}
        </div>
        <div
          className="mt-2 flex justify-between text-xs text-muted-foreground"
          aria-hidden="true"
        >
          <span>{bars[0].label}</span>
          <span>{bars[bars.length - 1].label}</span>
        </div>
        <table className="sr-only">
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((bar) => (
              <tr key={bar.key}>
                <td>{bar.label}</td>
                <td>{bar.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function BarList({
  title,
  rows,
  className,
}: {
  title: string
  rows: Ranked[]
  className?: string
}) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  return (
    <section className={cn("flex min-w-0 flex-col gap-4", className)}>
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className={cn("flex flex-1 flex-col gap-3", surface)}>
        {rows.map((row) => (
          <li
            key={row.label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_3.5rem] sm:gap-y-3"
          >
            {row.label.startsWith("/") ? (
              <Link
                href={row.label}
                className="truncate text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {row.label}
              </Link>
            ) : (
              <span className="truncate text-muted-foreground">
                {row.label}
              </span>
            )}
            <span className="order-last col-span-2 h-2 overflow-hidden rounded-full bg-wash sm:order-none sm:col-span-1">
              <span
                className="block h-full rounded-full bg-foreground/80"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-medium tabular-nums">
              {numberFormat.format(row.value)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default async function StatsPage() {
  const [stats, traffic] = await Promise.all([getSiteStats(), getTraffic()])

  return (
    <main className="flex-1 overflow-x-clip">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
        <header className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Stats</h1>
          <p className="max-w-xl text-balance text-muted-foreground">
            23rd in numbers, refreshed every hour.
          </p>
        </header>

        {traffic ? (
          <section
            aria-labelledby="traffic-heading"
            className="flex flex-col gap-8"
          >
            <h2
              id="traffic-heading"
              className="text-xl font-semibold tracking-tight"
            >
              Traffic
            </h2>
            <dl className="grid grid-cols-2 gap-3">
              <StatTile label="Visitors" value={traffic.visitors} />
              <StatTile label="Page views" value={traffic.views} />
            </dl>
            <div className="grid gap-8 sm:grid-cols-2">
              <BarList title="Sources" rows={traffic.sources} />
              <BarList title="Countries" rows={traffic.countries} />
            </div>
          </section>
        ) : null}

        <section
          aria-labelledby="project-heading"
          className="flex flex-col gap-8"
        >
          <h2
            id="project-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Project
          </h2>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Components" value={stats.components} />
            <StatTile label="Stars" value={stats.stars} />
            <StatTile label="Forks" value={stats.forks} />
            <StatTile label="Contributors" value={stats.contributors} />
            <StatTile
              className="col-span-2 lg:col-span-1"
              label="Commits, 1 yr"
              value={stats.commitsPastYear}
            />
          </dl>
          {stats.weeks ? (
            <BarChart
              title="Commits per week"
              unit="Commits"
              bars={stats.weeks.map((week) => ({
                key: String(week.week),
                label: `Week of ${dayFormat.format(new Date(week.week * 1000))}`,
                value: week.total,
              }))}
            />
          ) : null}
          <BarList
            title="Components by category"
            rows={stats.categories.map((category) => ({
              label: category.name,
              value: category.count,
            }))}
          />
        </section>
      </div>
    </main>
  )
}
