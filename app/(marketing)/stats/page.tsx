import { buildPageMetadata } from "@/lib/seo"
import { cn } from "@/lib/utils"
import { getSiteStats, type CategoryCount, type WeekCommits } from "@/lib/stats"

export const revalidate = 3600

export const metadata = buildPageMetadata({
  title: "Stats",
  description:
    "Open numbers for 23rd: components shipped, GitHub stars, forks, contributors, and commits over the past year.",
  path: "/stats",
  keywords: ["stats", "open source", "open metrics"],
})

const numberFormat = new Intl.NumberFormat("en")
const weekFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const monthFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
})

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
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl bg-sheet p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5",
        className
      )}
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-3xl font-semibold tracking-tight tabular-nums">
        {value === null ? "–" : numberFormat.format(value)}
      </dd>
    </div>
  )
}

function CommitChart({ weeks }: { weeks: WeekCommits[] }) {
  const max = Math.max(1, ...weeks.map((week) => week.total))

  return (
    <section aria-labelledby="commits-heading" className="flex flex-col gap-4">
      <h2 id="commits-heading" className="text-sm font-medium">
        Commits per week
      </h2>
      <div className="rounded-xl bg-sheet p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5">
        <div className="flex h-40 items-end gap-[2px]" aria-hidden="true">
          {weeks.map((week) => {
            const date = new Date(week.week * 1000)
            return (
              <div
                key={week.week}
                className="group relative flex h-full flex-1 items-end"
              >
                <div
                  className="w-full rounded-t-[4px] bg-foreground/80 transition-colors group-hover:bg-foreground"
                  style={{
                    height: week.total
                      ? `${Math.max(2, (week.total / max) * 100)}%`
                      : "2px",
                    opacity: week.total ? undefined : 0.15,
                  }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  <span className="font-medium tabular-nums">
                    {numberFormat.format(week.total)}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    week of {weekFormat.format(date)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <div
          className="mt-2 flex justify-between text-xs text-muted-foreground"
          aria-hidden="true"
        >
          <span>{monthFormat.format(new Date(weeks[0].week * 1000))}</span>
          <span>
            {monthFormat.format(new Date(weeks[weeks.length - 1].week * 1000))}
          </span>
        </div>
        <table className="sr-only">
          <caption>Commits per week over the past year</caption>
          <thead>
            <tr>
              <th scope="col">Week of</th>
              <th scope="col">Commits</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.week}>
                <td>{weekFormat.format(new Date(week.week * 1000))}</td>
                <td>{week.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CategoryBars({ categories }: { categories: CategoryCount[] }) {
  const max = Math.max(1, ...categories.map((category) => category.count))

  return (
    <section
      aria-labelledby="categories-heading"
      className="flex flex-col gap-4"
    >
      <h2 id="categories-heading" className="text-sm font-medium">
        Components by category
      </h2>
      <ul className="flex flex-col gap-3 rounded-xl bg-sheet p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5">
        {categories.map((category) => (
          <li
            key={category.name}
            className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr_2rem]"
          >
            <span className="truncate text-muted-foreground">
              {category.name}
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-wash">
              <span
                className="block h-full rounded-full bg-foreground/80"
                style={{ width: `${(category.count / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-medium tabular-nums">
              {category.count}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default async function StatsPage() {
  const stats = await getSiteStats()

  return (
    <main className="flex-1 overflow-x-clip">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
        <header className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Stats</h1>
          <p className="max-w-xl text-balance text-muted-foreground">
            23rd in numbers, refreshed every hour.
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile label="Components" value={stats.components} />
          <StatTile label="Stars" value={stats.stars} />
          <StatTile label="Forks" value={stats.forks} />
          <StatTile label="Contributors" value={stats.contributors} />
          <StatTile
            className="col-span-2 lg:col-span-1"
            label="Commits past year"
            value={stats.commitsPastYear}
          />
        </dl>

        {stats.weeks ? <CommitChart weeks={stats.weeks} /> : null}

        <CategoryBars categories={stats.categories} />
      </div>
    </main>
  )
}
