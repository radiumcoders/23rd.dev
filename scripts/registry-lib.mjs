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

/**
 * Import of a sibling `*-vanilla` module, including multiline named imports.
 * Detection uses the `from` specifier so a second engine is not missed after a
 * multiline import. Stripping walks import blocks so `{[\s\S]*?}` cannot eat
 * earlier `import { … } from "react"` lines while searching for `-vanilla`.
 */
const VANILLA_FROM_RE = /from\s+["']\.\/([^"']+-vanilla)["']/

/**
 * Detect `./foo-vanilla` imports in a wrapper. Returns the specifiers
 * (without `./` or extension), or an empty array.
 */
export function detectVanillaImports(source) {
  const names = []
  const seen = new Set()
  const re = new RegExp(VANILLA_FROM_RE.source, "g")
  let match
  while ((match = re.exec(source))) {
    if (seen.has(match[1])) continue
    seen.add(match[1])
    names.push(match[1])
  }
  return names
}

function isVanillaFromBlock(block) {
  return VANILLA_FROM_RE.test(block)
}

/**
 * Drop import / re-export statements that bind a sibling `*-vanilla` module.
 * Walks line-by-line so a multiline named import does not swallow the next
 * import, and so `from "react"` is never treated as part of a vanilla import.
 */
function stripVanillaBindings(wrapper) {
  const newline = wrapper.includes("\r\n") ? "\r\n" : "\n"
  const lines = wrapper.split(/\r\n|\n|\r/)
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (
      !/^[ \t]*import\s/.test(line) &&
      !/^[ \t]*export\s+(?:type\s+)?\{/.test(line)
    ) {
      out.push(line)
      continue
    }

    let block = line
    let end = i
    while (end < lines.length && !/from\s+["'][^"']+["']/.test(block)) {
      end += 1
      if (end >= lines.length) break
      block += newline + lines[end]
    }

    if (isVanillaFromBlock(block)) {
      i = end
      continue
    }

    out.push(line)
  }
  return out.join(newline)
}

function withLangTs(attrs) {
  if (/\blang\s*=/.test(attrs)) return attrs
  return `${attrs} lang="ts"`
}

function standaloneSvelte(stripped, body) {
  const moduleRe = /<script\b([^>]*\bmodule\b[^>]*)>/
  const match = moduleRe.exec(stripped)
  let out
  if (match) {
    const open = `<script${withLangTs(match[1])}>`
    out =
      stripped.slice(0, match.index) +
      `${open}\n${body}\n` +
      stripped.slice(match.index + match[0].length)
  } else {
    out = `<script module lang="ts">\n${body}\n</script>\n\n${stripped}`
  }

  return out.replace(/<script\b([^>]*)>/g, (_full, attrs) => {
    return `<script${withLangTs(attrs)}>`
  })
}

const IMPORT_LINE_RE =
  /^import\b[\s\S]*?["'][^"']+["']\s*;?[ \t]*(?:\r?\n|$)/

function peelLeadingImports(source) {
  const imports = []
  let rest = source.replace(/^\uFEFF/, "")
  while (true) {
    const wsMatch = rest.match(/^\s*/)
    const ws = wsMatch ? wsMatch[0] : ""
    const next = rest.slice(ws.length)
    const match = next.match(IMPORT_LINE_RE)
    if (!match) {
      rest = `${ws}${next}`
      break
    }
    imports.push(match[0].trim())
    rest = next.slice(match[0].length)
  }
  return { imports, rest }
}

function uniqueImports(list) {
  const seen = new Set()
  const out = []
  for (const item of list) {
    const key = item.replace(/\s+/g, " ")
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function standaloneReact(stripped, body) {
  const useClientMatch = stripped.match(/^["']use client["']\s*;?\r?\n/)
  const wrapperNoClient = useClientMatch
    ? stripped.slice(useClientMatch[0].length)
    : stripped
  const wrapperParts = peelLeadingImports(wrapperNoClient)
  const engineParts = peelLeadingImports(body)
  const imports = uniqueImports([
    ...wrapperParts.imports,
    ...engineParts.imports,
  ])
  const importBlock = imports.length > 0 ? `${imports.join("\n")}\n\n` : ""
  const header = useClientMatch
    ? `${useClientMatch[0].replace(/\s*$/, "")}\n\n`
    : ""
  const engineRest = engineParts.rest.trim()
  const wrapperRest = wrapperParts.rest.trimStart()
  if (!engineRest) return `${header}${importBlock}${wrapperRest}`
  return `${header}${importBlock}${engineRest}\n\n${wrapperRest}`
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
    return standaloneSvelte(stripped, body)
  }

  return standaloneReact(stripped, body)
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
