const REPO = "radiumcoders/23rd.dev"
const OWNER = REPO.split("/")[0]

export function getGithubRepoUrl() {
  return `https://github.com/${REPO}`
}

export function getGithubSponsorUrl() {
  return `https://github.com/sponsors/${OWNER}`
}

export function formatStarCount(count: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count)
}

/** Star count is read from GitHub once a day. */
export const GITHUB_STARS_REVALIDATE_SECONDS = 60 * 60 * 24

/** Cached star count. Revalidates once a day. */
export async function getGithubStars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "23rd.dev",
      },
      next: { revalidate: GITHUB_STARS_REVALIDATE_SECONDS },
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
