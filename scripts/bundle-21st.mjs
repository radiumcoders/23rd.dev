// Bundles registry components for publishing on 21st.dev.
// The 21st CLI takes one self-contained component file plus one demo, so each
// component's vanilla engine is inlined and its demo from 21st/ is copied
// next to it.
//
//   node scripts/bundle-21st.mjs <out-dir> [slug...]
//
// Writes <out-dir>/<slug>/<slug>.tsx and <out-dir>/<slug>/<slug>.demo.tsx.
// With no slugs, bundles every component that has a demo in 21st/.
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

import { publishedFileContent } from "./registry-lib.mjs"

const [outArg, ...picked] = process.argv.slice(2)
if (!outArg) {
  console.error("usage: node scripts/bundle-21st.mjs <out-dir> [slug...]")
  process.exit(1)
}

const out = resolve(outArg)
const slugs = picked.length
  ? picked
  : readdirSync("21st")
      .filter((f) => f.endsWith(".demo.tsx"))
      .map((f) => f.replace(/\.demo\.tsx$/, ""))

for (const slug of slugs) {
  const demo = join("21st", `${slug}.demo.tsx`)
  if (!existsSync(demo)) throw new Error(`no demo at ${demo}`)
  const dir = join(out, slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, `${slug}.tsx`),
    publishedFileContent(join("registry", slug), `${slug}.tsx`)
  )
  copyFileSync(demo, join(dir, `${slug}.demo.tsx`))
  console.log(`bundled ${slug}`)
}
