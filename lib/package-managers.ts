export type PackageManager = "npm" | "pnpm" | "bun" | "deno"

const MANAGER_PREFIX =
  /^(?:npm\s+exec\s+|npx\s+|pnpm\s+dlx\s+|yarn\s+dlx\s+|bunx(?:\s+--bun)?\s+|deno\s+run(?:\s+-A)?\s+npm:)/

export function stripPackageManager(command: string) {
  return command.trim().replace(MANAGER_PREFIX, "")
}

export function getPackageManagerCommands(command: string) {
  const core = stripPackageManager(command)

  return {
    npm: `npx ${core}`,
    pnpm: `pnpm dlx ${core}`,
    bun: `bunx --bun ${core}`,
    deno: `deno run -A npm:${core}`,
  } satisfies Record<PackageManager, string>
}
