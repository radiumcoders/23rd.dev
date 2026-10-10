const REPO = "radiumcoders/23rd.dev"

export function getGithubRepoUrl() {
  return `https://github.com/${REPO}`
}

export function formatStarCount(count: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count)
}

/**
 * Star count for the site headers, fetched once at build so pages stay
 * static (it refreshes on each deploy). Uses GITHUB_TOKEN when set, since
 * CI runners share the unauthenticated rate limit.
 */
export async function getGithubStars(): Promise<number | null> {
  const token = process.env.GITHUB_TOKEN
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "23rd.dev",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "force-cache",
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.warn(`GitHub stars: ${res.status} ${res.statusText}`)
      return null
    }
    const data = (await res.json()) as { stargazers_count?: number }
    return typeof data.stargazers_count === "number"
      ? data.stargazers_count
      : null
  } catch (error) {
    console.warn("GitHub stars: request failed", error)
    return null
  }
}
