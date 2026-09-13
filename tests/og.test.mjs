import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { ROOT } from "../scripts/registry-lib.mjs"
import {
  docsOgImagePath,
  docsOgImageSegments,
  docsOgPublicFile,
  OG_IMAGE_SIZE,
} from "../lib/og-paths.mjs"
import {
  listDocsOgPages,
  parseFrontmatter,
  slugFromDocsFile,
  splitOgWords,
} from "../scripts/og-lib.mjs"

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function pngSize(buf) {
  assert.ok(buf.subarray(0, 8).equals(PNG_MAGIC), "expected PNG magic")
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  }
}

function walkFiles(dir, files = []) {
  if (!existsSync(dir)) return files
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walkFiles(path, files)
    else files.push(path)
  }
  return files
}

test("docs OG paths put image.png after the page slug", () => {
  assert.deepEqual(docsOgImageSegments(), ["image.png"])
  assert.deepEqual(docsOgImageSegments(["getting-started"]), [
    "getting-started",
    "image.png",
  ])
  assert.equal(docsOgImagePath(), "/og/docs/image.png")
  assert.equal(
    docsOgImagePath(["components", "ascii-logo"]),
    "/og/docs/components/ascii-logo/image.png"
  )
  assert.equal(
    docsOgPublicFile(["components", "ascii-logo"], ROOT),
    join(ROOT, "public/og/docs/components/ascii-logo/image.png")
  )
})

test("lib/seo.ts keeps the same OG path convention as og-paths", () => {
  const source = readFileSync(join(ROOT, "lib/seo.ts"), "utf8")
  assert.match(source, /\/og\/docs\/\$\{docsOgImageSegments\(slug\)\.join\("\/"\)\}/)
  assert.match(source, /width:\s*1200/)
  assert.match(source, /height:\s*630/)
  assert.equal(OG_IMAGE_SIZE.width, 1200)
  assert.equal(OG_IMAGE_SIZE.height, 630)
})

test("slugFromDocsFile maps index.mdx to the docs root card", () => {
  const contentRoot = join(ROOT, "content/docs")
  assert.deepEqual(slugFromDocsFile(join(contentRoot, "index.mdx"), contentRoot), [])
  assert.deepEqual(
    slugFromDocsFile(join(contentRoot, "getting-started.mdx"), contentRoot),
    ["getting-started"]
  )
  assert.deepEqual(
    slugFromDocsFile(
      join(contentRoot, "components/ascii-logo.mdx"),
      contentRoot
    ),
    ["components", "ascii-logo"]
  )
})

test("splitOgWords keeps every word so Satori can gap them", () => {
  assert.deepEqual(splitOgWords("ASCII Logo"), ["ASCII", "Logo"])
  assert.deepEqual(splitOgWords("shadcn registry"), ["shadcn", "registry"])
  assert.deepEqual(splitOgWords("  one   two  "), ["one", "two"])
})

test("parseFrontmatter reads title and description", () => {
  const data = parseFrontmatter(
    "---\ntitle: ASCII Logo\ndescription: Glyphs scatter.\n---\n\n# Hello\n"
  )
  assert.deepEqual(data, {
    title: "ASCII Logo",
    description: "Glyphs scatter.",
  })
})

test("every docs page has a static PNG OG card", async () => {
  const pages = await listDocsOgPages(ROOT)
  assert.ok(pages.length >= 10, "expected a docs page per MDX file")
  assert.ok(
    pages.some((page) => page.slug.length === 0 && page.title === "23rd")
  )
  assert.ok(
    pages.some(
      (page) =>
        page.slug.join("/") === "components/ascii-logo" &&
        page.title === "ASCII Logo"
    )
  )

  for (const page of pages) {
    const file = docsOgPublicFile(page.slug, ROOT)
    assert.ok(existsSync(file), `missing OG image: ${file}`)
    const buf = readFileSync(file)
    assert.deepEqual(pngSize(buf), OG_IMAGE_SIZE)
    assert.ok(buf.length > 8_000, `${file} looks too small to be a real card`)
  }
})

test("the app no longer ships a next/og route that Cloudflare would crash", () => {
  const appFiles = walkFiles(join(ROOT, "app"))
  const hits = appFiles.filter((file) => {
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) return false
    return readFileSync(file, "utf8").includes("next/og")
  })
  assert.deepEqual(hits, [])
  assert.equal(existsSync(join(ROOT, "app/og/docs/[...slug]/route.tsx")), false)
})
