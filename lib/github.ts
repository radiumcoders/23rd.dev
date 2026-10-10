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

/** Cached star count for the docs header. Revalidates every 10 minutes. */
export async function getGithubStars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "23rd.dev",
      },
      next: { revalidate: 600 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { stargazers_count?: number }
    return typeof data.stargazers_count === "number"
      ? data.stargazers_count
      : null
  } catch {
    return null
  }
}
