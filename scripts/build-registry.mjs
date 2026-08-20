import { spawnSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"

import {
  ROOT,
  ROOT_REGISTRY_PATH,
  STANDALONE_DIR,
  composeRootRegistry,
  discoverIncludes,
  manifestDir,
  publishedFileContent,
  readJson,
  readRootRegistry,
  serializeRegistry,
} from "./registry-lib.mjs"

function writeRootRegistry(includes) {
  const next = composeRootRegistry(readRootRegistry(), includes)
  writeFileSync(ROOT_REGISTRY_PATH, serializeRegistry(next))
  return next
}

function run(commandLine, cwd = ROOT) {
  const result = spawnSync(commandLine, {
    cwd,
    stdio: "inherit",
    shell: true,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

/**
 * Materialize a standalone copy of the registry: wrappers that import a
 * sibling `*-vanilla` module are inlined so shadcn publishes one file.
 */
function writeStandaloneTree(includes) {
  rmSync(STANDALONE_DIR, { recursive: true, force: true })
  mkdirSync(STANDALONE_DIR, { recursive: true })

  for (const include of includes) {
    const dir = manifestDir(include)
    const destDir = join(STANDALONE_DIR, relative(ROOT, dir).replaceAll("\\", "/"))
    mkdirSync(destDir, { recursive: true })

    const manifest = readJson(join(ROOT, include))
    writeFileSync(join(destDir, "registry.json"), `${JSON.stringify(manifest, null, 2)}\n`)

    const published = new Set()
    for (const item of manifest.items ?? []) {
      for (const file of item.files ?? []) {
        if (published.has(file.path)) continue
        published.add(file.path)
        const destFile = join(destDir, file.path)
        mkdirSync(dirname(destFile), { recursive: true })
        writeFileSync(destFile, publishedFileContent(dir, file.path))
      }
    }
  }

  const standaloneRegistry = composeRootRegistry(readRootRegistry(), includes)
  writeFileSync(
    join(STANDALONE_DIR, "registry.json"),
    serializeRegistry(standaloneRegistry)
  )
}

const includes = discoverIncludes()
const registry = writeRootRegistry(includes)

console.log(
  `registry: ${registry.name} — ${includes.length} item(s)\n${includes.map((i) => `  - ${i}`).join("\n") || "  (none)"}`
)

if (includes.length === 0) {
  console.warn("No registry/*/registry.json files found. Skipping validate/build.")
  process.exit(0)
}

writeStandaloneTree(includes)

run("pnpm dlx shadcn@latest registry validate ./registry.json", STANDALONE_DIR)
run(
  `pnpm dlx shadcn@latest build ./registry.json --output "${join(ROOT, "public", "r")}"`,
  STANDALONE_DIR
)

console.log("Registry built → public/r")
