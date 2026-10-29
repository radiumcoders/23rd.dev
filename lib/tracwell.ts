const MCP_URL = "https://tracwell.app/mcp"
const PROJECT_ID = "fa269223-7fa6-4ff7-a44a-3752aec9d15e"
const RANGE_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

type Metric = { value: number; previous: number; changePercent: number | null }
type Breakdown = { value: string; count: number; views: number }

type Overview = {
  metrics: { views: Metric; visitors: Metric }
  trend: { date: string; views: number; visitors: number }[]
  breakdowns: {
    pages: Breakdown[]
    sources: Breakdown[]
    countries: Breakdown[]
    deviceTypes: Breakdown[]
  }
}

export type Ranked = { label: string; value: number }
export type Day = { date: string; visitors: number; views: number }

export type Traffic = {
  views: Metric
  visitors: Metric
  days: Day[]
  pages: Ranked[]
  sources: Ranked[]
  countries: Ranked[]
  devices: Ranked[]
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

function countryName(code: string) {
  try {
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

function isoDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

function top(
  rows: Breakdown[],
  limit: number,
  label = (value: string) => value
) {
  return rows
    .slice(0, limit)
    .map((row) => ({ label: label(row.value), value: row.count }))
}

/**
 * The last 30 full days of traffic from Tracwell's read-only MCP endpoint.
 * One stateless tools/call; the answer comes back as a single SSE message.
 * Today is left out so the chart doesn't end on a half day.
 */
export async function getTraffic(): Promise<Traffic | null> {
  const key = process.env.TRACWELL_MCP_KEY
  if (!key) return null

  const today = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  )

  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "analytics_overview",
          arguments: {
            projectId: PROJECT_ID,
            from: isoDate(today - RANGE_DAYS * DAY_MS),
            to: isoDate(today - DAY_MS),
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.warn(`Tracwell: ${res.status} ${res.statusText}`)
      return null
    }

    const text = await res.text()
    const payload = text.includes("data:")
      ? text
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5))
          .join("")
      : text
    const result = JSON.parse(payload).result as
      { structuredContent?: Overview; isError?: boolean } | undefined
    const overview = result?.structuredContent
    if (!overview || result.isError) {
      console.warn("Tracwell: no overview in response")
      return null
    }

    const { metrics, trend, breakdowns } = overview
    return {
      views: metrics.views,
      visitors: metrics.visitors,
      days: trend.map(({ date, views, visitors }) => ({
        date,
        views,
        visitors,
      })),
      pages: top(breakdowns.pages, 8),
      sources: top(breakdowns.sources, 6),
      countries: top(breakdowns.countries, 6, countryName),
      devices: top(
        breakdowns.deviceTypes.filter((row) => row.value !== "unknown"),
        3,
        (value) => value.charAt(0).toUpperCase() + value.slice(1)
      ),
    }
  } catch (error) {
    console.warn("Tracwell: request failed", error)
    return null
  }
}
