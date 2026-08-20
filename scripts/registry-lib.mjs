import { readdirSync, readFileSync, existsSync } from "node:fs"
import { basename, dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

export const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..")
export const REGISTRY_DIR = join(ROOT, "registry")
export const ROOT_REGISTRY_PATH = join(ROOT, "registry.json")
export const BUILD_DIR = join(ROOT, "public", "r")
export const STANDALONE_DIR = join(ROOT, ".registry-standalone")

export const REGISTRY_SCHEMA = "https://ui.shadcn.com/schema/registry.json"
export const REGISTRY_ITEM_SCHEMA =
  "https://ui.shadcn.com/schema/registry-item.json"

/** File types allowed by the shadcn registry-item schema. */
export const REGISTRY_ITEM_TYPES = new Set([
  "registry:lib",
  "registry:block",
  "registry:component",
  "registry:ui",
  "registry:hook",
  "registry:page",
  "registry:file",
  "registry:style",
  "registry:theme",
  "registry:item",
])

/**
 * Discover per-component `registry.json` manifests inside `registry/`.
 * Returns POSIX-style paths relative to the project root, sorted.
 */
export function discoverIncludes(registryDir = REGISTRY_DIR, root = ROOT) {
  if (!existsSync(registryDir)) {
    return []
  }

  return readdirSync(registryDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(registryDir, entry.name, "registry.json"))
    .filter((path) => existsSync(path))
    .map((path) => relative(root, path).replaceAll("\\", "/"))
    .sort()
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

export function readRootRegistry(rootRegistryPath = ROOT_REGISTRY_PATH) {
  return readJson(rootRegistryPath)
}

/**
 * Build the next root registry object from the current one plus discovered
 * includes. Pure — does not touch the filesystem.
 */
export function composeRootRegistry(current, includes) {
  return {
    $schema: current.$schema ?? REGISTRY_SCHEMA,
    name: current.name ?? "23rd",
    homepage: current.homepage ?? "https://23rd.dev",
    include: includes,
  }
}

export function serializeRegistry(registry) {
  return `${JSON.stringify(registry, null, 2)}\n`
}

/** Resolve the absolute directory a per-component manifest lives in. */
export function manifestDir(includePath, root = ROOT) {
  return dirname(join(root, includePath))
}

/** Normalize line endings so comparisons ignore CRLF/LF differences. */
export function normalizeEol(text) {
  return text.replace(/\r\n/g, "\n")
}

/** Import of a sibling `*-vanilla` module, including multiline named imports. */
const VANILLA_IMPORT_RE =
  /^[ \t]*import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+["']\.\/([^"']+-vanilla)["']\s*;?\r?\n?/m

const VANILLA_EXPORT_RE =
  /^[ \t]*export\s+(?:type\s+)?\{[^}]*\}\s+from\s+["']\.\/[^"']+-vanilla["']\s*;?\r?\n?/gm

/**
 * Detect `./foo-vanilla` imports in a wrapper. Returns the specifiers
 * (without `./` or extension), or an empty array.
 */
export function detectVanillaImports(source) {
  const names = []
  const re = new RegExp(VANILLA_IMPORT_RE.source, "gm")
  let match
  while ((match = re.exec(source))) {
    names.push(match[1])
  }
  return names
}

function stripVanillaBindings(wrapper) {
  return wrapper
    .replace(new RegExp(VANILLA_IMPORT_RE.source, "gm"), "")
    .replace(VANILLA_EXPORT_RE, "")
}

/**
 * Inline a vanilla engine into a framework wrapper so the published registry
 * item is a single standalone file (Canvas UI `makeStandalone`).
 *
 * @param {string} wrapper
 * @param {string} engine
 * @param {"react" | "svelte"} kind
 */
export function makeStandalone(wrapper, engine, kind) {
  const body = engine.trimEnd()
  const stripped = stripVanillaBindings(wrapper)

  if (kind === "svelte") {
    const moduleTag = "<script module>"
    if (stripped.includes(moduleTag)) {
      return stripped.replace(moduleTag, `${moduleTag}\n${body}\n`)
    }
    return `<script module>\n${body}\n</script>\n\n${stripped}`
  }

  const useClient = /^["']use client["']\s*;?\r?\n/
  if (useClient.test(stripped)) {
    return stripped.replace(useClient, (m) => `${m}\n${body}\n\n`)
  }
  return `${body}\n\n${stripped}`
}

function kindFromPath(filePath) {
  return filePath.endsWith(".svelte") ? "svelte" : "react"
}

/**
 * Content that should appear in the built registry JSON for a source file.
 * Wrappers that import a sibling `*-vanilla` module are inlined; everything
 * else is published as-is.
 */
export function publishedFileContent(dir, filePath) {
  const abs = join(dir, filePath)
  const wrapper = readFileSync(abs, "utf8")
  const imports = detectVanillaImports(wrapper)
  if (imports.length === 0) {
    return normalizeEol(wrapper)
  }

  let engine = ""
  for (const name of imports) {
    const enginePath = join(dir, `${name}.ts`)
    if (!existsSync(enginePath)) {
      throw new Error(
        `missing vanilla engine ${name}.ts (imported by ${filePath} in ${dir})`
      )
    }
    engine += `${engine ? "\n\n" : ""}${readFileSync(enginePath, "utf8")}`
  }

  return normalizeEol(makeStandalone(wrapper, engine, kindFromPath(filePath)))
}

/** True when this registry item is the Svelte port of a React component. */
export function isSvelteItem(item) {
  return (
    typeof item?.name === "string" &&
    item.name.endsWith("-svelte") &&
    Array.isArray(item.files) &&
    item.files.some((file) => file.path?.endsWith(".svelte"))
  )
}

/** Expected install target for a Svelte registry file. */
export function svelteTarget(filePath) {
  return `src/lib/components/ui/${basename(filePath)}`
}
