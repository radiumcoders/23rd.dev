import { test } from "node:test"
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { join, basename } from "node:path"

import {
  ROOT,
  BUILD_DIR,
  REGISTRY_SCHEMA,
  REGISTRY_ITEM_SCHEMA,
  REGISTRY_ITEM_TYPES,
  discoverIncludes,
  readRootRegistry,
  readJson,
  composeRootRegistry,
  isSvelteItem,
  makeStandalone,
  manifestDir,
  normalizeEol,
  publishedFileContent,
  svelteTarget,
} from "../scripts/registry-lib.mjs"

const rootRegistry = readRootRegistry()
const includes = discoverIncludes()

/** [{ include, dir, manifest, item }] flattened across every manifest. */
const items = includes.flatMap((include) => {
  const dir = manifestDir(include)
  const manifest = readJson(join(ROOT, include))
  return (manifest.items ?? []).map((item) => ({ include, dir, manifest, item }))
})

test("root registry.json is well-formed", () => {
  assert.equal(rootRegistry.$schema, REGISTRY_SCHEMA)
  assert.equal(typeof rootRegistry.name, "string")
  assert.ok(rootRegistry.name.length > 0, "name must not be empty")
  assert.equal(typeof rootRegistry.homepage, "string")
  assert.ok(Array.isArray(rootRegistry.include), "include must be an array")
})

test("root registry include list is in sync with registry/ contents", () => {
  assert.deepEqual(
    rootRegistry.include,
    includes,
    "registry.json is stale — run `pnpm registry:build`"
  )
})

test("composeRootRegistry preserves identity for a synced registry", () => {
  const recomposed = composeRootRegistry(rootRegistry, includes)
  assert.deepEqual(recomposed, {
    $schema: rootRegistry.$schema,
    name: rootRegistry.name,
    homepage: rootRegistry.homepage,
    include: includes,
  })
})

test("at least one registry item is defined", () => {
  assert.ok(items.length > 0, "expected the registry to contain components")
})

test("every included manifest exists and is valid JSON with items", () => {
  for (const include of includes) {
    const path = join(ROOT, include)
    assert.ok(existsSync(path), `missing manifest: ${include}`)
    const manifest = readJson(path)
    assert.ok(
      Array.isArray(manifest.items) && manifest.items.length > 0,
      `${include} must declare a non-empty items array`
    )
  }
})

test("every React item has a matching Svelte port", () => {
  const names = new Set(items.map(({ item }) => item.name))
  const reactNames = items
    .map(({ item }) => item.name)
    .filter((name) => !name.endsWith("-svelte"))
  const missing = reactNames.filter((name) => !names.has(`${name}-svelte`))
  assert.deepEqual(missing, [], `missing svelte ports: ${missing.join(", ")}`)
})

test("makeStandalone inlines a vanilla engine into a React wrapper", () => {
  const out = makeStandalone(
    `"use client"\n\nimport { createFoo } from "./foo-vanilla"\n\nexport { LIGHT } from "./foo-vanilla"\n\nexport function Foo() {\n  createFoo()\n}\n`,
    `export const LIGHT = "#fff"\nexport function createFoo() {}\n`,
    "react"
  )
  assert.match(out, /export function createFoo/)
  assert.match(out, /export const LIGHT/)
  assert.doesNotMatch(out, /foo-vanilla/)
  assert.match(out, /^"use client"/)
  assert.ok(
    out.indexOf("export const LIGHT") < out.indexOf("export function Foo"),
    "engine body should follow imports and precede the wrapper"
  )
})

test("makeStandalone react emits wrapper imports after use client", () => {
  const out = makeStandalone(
    `"use client"\n\nimport { createFoo } from "./foo-vanilla"\nimport { useEffect } from "react"\n\nexport function Foo() {\n  createFoo()\n}\n`,
    `export function createFoo() {}\n`,
    "react"
  )
  assert.match(out, /^"use client"\s*\n\s*import \{ useEffect \} from "react"/)
  const client = out.indexOf("use client")
  const imp = out.indexOf('import { useEffect } from "react"')
  const engine = out.indexOf("export function createFoo")
  assert.ok(client >= 0 && imp > client && engine > imp)
})

test("makeStandalone injects the engine into a Svelte module script", () => {
  const out = makeStandalone(
    `<script module>\n</script>\n\n<script>\n  import { createFoo } from "./foo-vanilla"\n  createFoo()\n</script>\n`,
    `export function createFoo() {}\n`,
    "svelte"
  )
  assert.match(out, /<script module lang="ts">/)
  assert.match(out, /<script lang="ts">/)
  assert.equal(
    (out.match(/<script\b[^>]*\bmodule\b/g) || []).length,
    1,
    "exactly one module script"
  )
  assert.match(out, /export function createFoo/)
  assert.doesNotMatch(out, /from "\.\/foo-vanilla"/)
})

test("makeStandalone svelte preserves existing script attributes", () => {
  const out = makeStandalone(
    `<script module lang="ts">\n</script>\n\n<script lang="ts">\n  import { createFoo } from "./foo-vanilla"\n  createFoo()\n</script>\n`,
    `export function createFoo() {}\n`,
    "svelte"
  )
  assert.match(out, /<script module lang="ts">/)
  assert.match(out, /<script lang="ts">/)
  assert.equal((out.match(/\blang=["']ts["']/g) || []).length, 2)
  assert.equal((out.match(/<script\b[^>]*\bmodule\b/g) || []).length, 1)
})

for (const { include, dir, item } of items) {
  const label = `${include} › ${item.name ?? "(unnamed)"}`

  test(`${label}: required fields`, () => {
    assert.equal(typeof item.name, "string")
    assert.match(item.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, "name must be kebab-case")
    assert.equal(typeof item.title, "string")
    assert.ok(item.title.length > 0, "title must not be empty")
    assert.equal(typeof item.description, "string")
    assert.ok(item.description.length > 0, "description must not be empty")
    assert.ok(
      REGISTRY_ITEM_TYPES.has(item.type),
      `unknown item type: ${item.type}`
    )
    assert.ok(Array.isArray(item.files) && item.files.length > 0, "files required")
  })

  test(`${label}: declared dependencies are non-empty strings`, () => {
    for (const key of ["dependencies", "devDependencies", "registryDependencies"]) {
      if (item[key] === undefined) continue
      assert.ok(Array.isArray(item[key]), `${key} must be an array`)
      for (const dep of item[key]) {
        assert.equal(typeof dep, "string")
        assert.ok(dep.length > 0, `${key} contains an empty entry`)
      }
    }
  })

  test(`${label}: referenced files exist on disk`, () => {
    for (const file of item.files) {
      assert.equal(typeof file.path, "string", "file.path required")
      assert.ok(
        REGISTRY_ITEM_TYPES.has(file.type),
        `unknown file type: ${file.type}`
      )
      const abs = join(dir, file.path)
      assert.ok(existsSync(abs), `missing source file: ${file.path} (in ${include})`)
    }
  })

  if (isSvelteItem(item)) {
    test(`${label}: svelte files target $lib/components/ui`, () => {
      for (const file of item.files) {
        if (!file.path.endsWith(".svelte")) continue
        assert.equal(file.type, "registry:file")
        assert.equal(
          file.target,
          svelteTarget(file.path),
          `${item.name}: svelte target must be ${svelteTarget(file.path)}`
        )
      }
    })
  }
}

test("built output directory exists", () => {
  assert.ok(
    existsSync(BUILD_DIR),
    "public/r missing — run `pnpm registry:build`"
  )
})

test("built registry.json lists exactly the source items", () => {
  const builtPath = join(BUILD_DIR, "registry.json")
  assert.ok(existsSync(builtPath), "public/r/registry.json missing")
  const built = readJson(builtPath)
  const builtNames = (built.items ?? []).map((i) => i.name).sort()
  const sourceNames = items.map(({ item }) => item.name).sort()
  assert.deepEqual(
    builtNames,
    sourceNames,
    "public/r is stale — run `pnpm registry:build`"
  )
})

for (const { dir, item } of items) {
  test(`built ${item.name}.json matches its source`, () => {
    const builtPath = join(BUILD_DIR, `${item.name}.json`)
    assert.ok(existsSync(builtPath), `public/r/${item.name}.json missing`)

    const built = readJson(builtPath)
    assert.equal(built.$schema, REGISTRY_ITEM_SCHEMA)
    assert.equal(built.name, item.name)
    assert.equal(built.type, item.type)
    assert.equal((built.files ?? []).length, item.files.length)

    for (const sourceFile of item.files) {
      const builtFile = built.files.find(
        (f) => basename(f.path) === basename(sourceFile.path)
      )
      assert.ok(builtFile, `built output missing file ${sourceFile.path}`)
      assert.equal(builtFile.type, sourceFile.type)
      assert.equal(typeof builtFile.content, "string")
    }
  })
}

for (const { dir, item } of items) {
  test(`built ${item.name}.json inlines current file content`, () => {
    const built = readJson(join(BUILD_DIR, `${item.name}.json`))
    for (const sourceFile of item.files) {
      const builtFile = built.files.find(
        (f) => basename(f.path) === basename(sourceFile.path)
      )
      const expected = publishedFileContent(dir, sourceFile.path)
      assert.equal(
        normalizeEol(builtFile.content),
        expected,
        `${item.name}: built content is stale for ${sourceFile.path} — run \`pnpm registry:build\``
      )
    }
  })
}

test("built svelte payloads that contain TypeScript declare it on both script tags", () => {
  for (const { item } of items) {
    if (!isSvelteItem(item)) continue
    const built = readJson(join(BUILD_DIR, `${item.name}.json`))
    for (const file of built.files ?? []) {
      if (!file.path?.endsWith(".svelte")) continue
      const content = file.content ?? ""
      const looksLikeTs =
        /\b(?:interface|type|as const|\$props\s*<)\b/.test(content) ||
        /<script\b[^>]*\blang=["']ts["']/.test(content)
      if (!looksLikeTs) continue
      assert.match(
        content,
        /<script\b[^>]*\bmodule\b[^>]*\blang=["']ts["']|<script\b[^>]*\blang=["']ts["'][^>]*\bmodule\b/,
        `${item.name}: TypeScript payload must declare lang="ts" on the module script`
      )
      assert.match(
        content,
        /<script lang="ts">/,
        `${item.name}: TypeScript payload must declare lang="ts" on the instance script`
      )
      assert.equal(
        (content.match(/<script\b[^>]*\bmodule\b/g) || []).length,
        1,
        `${item.name}: exactly one module script`
      )
    }
  }
})
