import componentsMeta from "@/content/docs/components/meta.json"

const REPO = "radiumcoders/23rd.dev"
const REVALIDATE_SECONDS = 3600

export type CategoryCount = { name: string; count: number }
export type WeekCommits = { week: number; total: number }

export type SiteStats = {
  components: number
  categories: CategoryCount[]
  stars: number | null
  forks: number | null
  contributors: number | null
  commitsPastYear: number | null
  weeks: WeekCommits[] | null
}

/** Groups the docs sidebar's "---Group---" separators into component counts. */
export function getCategoryCounts(): CategoryCount[] {
  const categories: CategoryCount[] = []
  for (const page of componentsMeta.pages) {
    const group = /^---(.+)---$/.exec(page)
    if (group) {
      categories.push({ name: group[1], count: 0 })
    } else if (categories.length > 0) {
      categories[categories.length - 1].count += 1
    }
  }
  return categories.filter((category) => category.count > 0)
}

async function github(path: string): Promise<Response | null> {
  const token = process.env.GITHUB_TOKEN
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "23rd.dev",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.warn(`GitHub ${path}: ${res.status} ${res.statusText}`)
      return null
    }
    return res
  } catch (error) {
    console.warn(`GitHub ${path}: request failed`, error)
    return null
  }
}

async function getRepo() {
  const res = await github("")
  if (!res) return null
  return (await res.json()) as { stargazers_count: number; forks_count: number }
}

/** One contributor per page, so the last page number is the total. */
async function getContributorCount(): Promise<number | null> {
  const res = await github("/contributors?per_page=1&anon=1")
  if (!res) return null
  const last = /[?&]page=(\d+)>; rel="last"/.exec(res.headers.get("link") ?? "")
  if (last) return Number(last[1])
  const list = (await res.json()) as unknown[]
  return list.length
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const WEEKS = 52

/**
 * Buckets the past year's commits into Sunday-start weeks. Counted from the
 * commit list because /stats/commit_activity answers 202 until GitHub has
 * cached it, which leaves a cold build with no chart.
 */
async function getWeeklyCommits(): Promise<WeekCommits[] | null> {
  const now = new Date()
  const thisSunday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - now.getUTCDay()
  )
  const firstWeek = thisSunday - (WEEKS - 1) * WEEK_MS
  const since = new Date(firstWeek).toISOString()
  const totals = new Array<number>(WEEKS).fill(0)

  for (let page = 1; page <= 20; page++) {
    const res = await github(
      `/commits?since=${since}&per_page=100&page=${page}`
    )
    if (!res) return null
    const commits = (await res.json()) as {
      commit: { author: { date: string } | null }
    }[]
    for (const { commit } of commits) {
      if (!commit.author) continue
      const index = Math.floor(
        (Date.parse(commit.author.date) - firstWeek) / WEEK_MS
      )
      if (index >= 0 && index < WEEKS) totals[index] += 1
    }
    if (commits.length < 100) break
  }

  // Start the chart at the first active week, so a young repo isn't mostly
  // empty bars.
  const firstActive = totals.findIndex((total) => total > 0)
  const start = firstActive === -1 ? 0 : Math.min(firstActive, WEEKS - 8)

  return totals.slice(start).map((total, index) => ({
    week: (firstWeek + (start + index) * WEEK_MS) / 1000,
    total,
  }))
}

export async function getSiteStats(): Promise<SiteStats> {
  const categories = getCategoryCounts()
  const [repo, contributors, weeks] = await Promise.all([
    getRepo(),
    getContributorCount(),
    getWeeklyCommits(),
  ])

  return {
    components: categories.reduce((sum, category) => sum + category.count, 0),
    categories,
    stars: repo?.stargazers_count ?? null,
    forks: repo?.forks_count ?? null,
    contributors,
    commitsPastYear: weeks
      ? weeks.reduce((sum, week) => sum + week.total, 0)
      : null,
    weeks,
  }
}
