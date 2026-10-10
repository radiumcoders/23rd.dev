import { test } from "node:test"
import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import {
  ROOT,
  discoverIncludes,
  isSvelteItem,
  readJson,
} from "../scripts/registry-lib.mjs"

// A component is listed by hand in several places besides registry/. These
// checks keep them in step, so a new component can't ship missing from one.
const names = discoverIncludes().flatMap((include) =>
  (readJson(join(ROOT, include)).items ?? [])
    .filter((item) => !isSvelteItem(item))
    .map((item) => item.name)
)

const read = (path) => readFileSync(join(ROOT, path), "utf8")
const readme = read("README.md")
const meta = readJson(join(ROOT, "content/docs/components/meta.json"))
const skillFiles = {
  "skills/23rd/apis.md": read("skills/23rd/apis.md"),
  "skills/23rd/components.md": read("skills/23rd/components.md"),
}

test("every component is a registry item", () => {
  assert.ok(names.length > 0)
})

for (const name of names) {
  test(`${name} is listed everywhere`, () => {
    assert.ok(
      existsSync(join(ROOT, "content/docs/components", `${name}.mdx`)),
      `content/docs/components/${name}.mdx is missing`
    )
    assert.ok(
      meta.pages.includes(name),
      `content/docs/components/meta.json does not list ${name}`
    )
    assert.ok(
      readme.includes(`](https://23rd.dev/docs/components/${name})`),
      `README.md components table does not list ${name}`
    )
    for (const [file, text] of Object.entries(skillFiles)) {
      assert.match(
        text,
        new RegExp(`^## ${name}$`, "m"),
        `${file} has no "## ${name}" section`
      )
    }
  })
}

test("the Cursor copy of the agent skill matches skills/23rd", () => {
  const files = readdirSync(join(ROOT, "skills/23rd")).sort()
  assert.deepEqual(readdirSync(join(ROOT, ".cursor/skills/23rd")).sort(), files)
  for (const file of files) {
    assert.equal(
      read(`.cursor/skills/23rd/${file}`),
      read(`skills/23rd/${file}`),
      `.cursor/skills/23rd/${file} differs from skills/23rd/${file}`
    )
  }
})
