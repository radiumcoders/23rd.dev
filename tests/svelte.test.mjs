import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync } from "node:fs"
import { join } from "node:path"
import { compile } from "svelte/compiler"

import { BUILD_DIR, readJson } from "../scripts/registry-lib.mjs"

// Nothing else compiles the Svelte ports (tsc and next build skip .svelte),
// so a syntax or rune error would only surface after `shadcn add`. This
// compiles each published -svelte payload, client and server, as users get it.
const payloads = readdirSync(BUILD_DIR).filter((name) =>
  name.endsWith("-svelte.json")
)

test("every published Svelte item has a payload", () => {
  assert.ok(payloads.length > 0, "no *-svelte.json in public/r")
})

for (const name of payloads) {
  const item = readJson(join(BUILD_DIR, name))
  for (const file of item.files.filter((f) => f.path.endsWith(".svelte"))) {
    test(`${name} ${file.path} compiles`, () => {
      for (const generate of ["client", "server"]) {
        const { warnings } = compile(file.content, {
          filename: file.path,
          generate,
        })
        const errors = warnings.filter((w) => !w.code.startsWith("a11y"))
        assert.deepEqual(
          errors.map((w) => `${w.code}: ${w.message}`),
          [],
          `${file.path} (${generate})`
        )
      }
    })
  }
}
