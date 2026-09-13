import { buildOgImages } from "./og-lib.mjs"

const files = await buildOgImages()
console.log(`OG images written (${files.length})`)
for (const { path } of files) {
  console.log(`  ${path}`)
}
