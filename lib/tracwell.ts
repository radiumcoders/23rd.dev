const MCP_URL = "https://tracwell.app/mcp"
const PROJECT_ID = "fa269223-7fa6-4ff7-a44a-3752aec9d15e"
// First day of history (imported from Umami). Tracwell caps a report at 732
// days, so lifetime is clamped to the most recent 731.
const FIRST_DAY = Date.UTC(2026, 7, 16)
const MAX_RANGE_DAYS = 731
const DAY_MS = 24 * 60 * 60 * 1000

type Breakdown = { value: string; count: number }

type Overview = {
  metrics: { views: { value: number }; visitors: { value: number } }
  breakdowns: { sources: Breakdown[]; countries: Breakdown[] }
}

export type Ranked = { label: string; value: number }

export type Traffic = {
  views: number
  visitors: number
  sources: Ranked[]
  countries: Ranked[]
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
 * Lifetime traffic from Tracwell's read-only MCP endpoint. One stateless
 * tools/call; the answer comes back as a single SSE message.
 */
export async function getTraffic(): Promise<Traffic | null> {
  const key = process.env.TRACWELL_MCP_KEY
  if (!key) return null

  const now = new Date()
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )
  const from = Math.max(FIRST_DAY, today - MAX_RANGE_DAYS * DAY_MS)

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
            from: isoDate(from),
            to: isoDate(today),
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

    const { metrics, breakdowns } = overview
    return {
      views: metrics.views.value,
      visitors: metrics.visitors.value,
      sources: top(breakdowns.sources, 6),
      countries: top(breakdowns.countries, 6, countryName),
    }
  } catch (error) {
    console.warn("Tracwell: request failed", error)
    return null
  }
}
