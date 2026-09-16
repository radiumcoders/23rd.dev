import { createElement as h } from "react"
import { ImageResponse } from "next/og.js"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, relative, sep } from "node:path"

import {
  docsOgImagePath,
  docsOgPublicFile,
  OG_IMAGE_SIZE,
} from "../lib/og-paths.mjs"

export const CONTENT_DOCS = "content/docs"

const INDEX_TITLE = "23rd"
const INDEX_TAGLINE = "Opinionated UI components for shippers"
const SITE_NAME = "23rd"

export function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}

  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    data[key] = value
  }
  return data
}

export function slugFromDocsFile(filePath, contentRoot) {
  const rel = relative(contentRoot, filePath).split(sep).join("/")
  const withoutExt = rel.replace(/\.mdx$/i, "")
  if (withoutExt === "index") return []
  return withoutExt.split("/").filter(Boolean)
}

async function walkMdx(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkMdx(path, files)
      continue
    }
    if (entry.isFile() && entry.name.endsWith(".mdx")) files.push(path)
  }
  return files
}

export async function listDocsOgPages(root = process.cwd()) {
  const contentRoot = join(root, CONTENT_DOCS)
  const files = (await walkMdx(contentRoot)).sort()
  const pages = []

  for (const file of files) {
    const source = await readFile(file, "utf8")
    const data = parseFrontmatter(source)
    const slug = slugFromDocsFile(file, contentRoot)
    const isIndex = slug.length === 0
    pages.push({
      file,
      slug,
      title: isIndex ? INDEX_TITLE : (data.title ?? SITE_NAME),
      description: isIndex
        ? INDEX_TAGLINE
        : (data.description ?? INDEX_TAGLINE),
    })
  }

  return pages
}

export async function loadOgLogoSrc(root = process.cwd()) {
  const logo = await readFile(join(root, "app/apple-icon.png"))
  return `data:image/png;base64,${logo.toString("base64")}`
}

function flex(style, children) {
  return h("div", { style: { display: "flex", ...style } }, children)
}

/** Satori drops space characters in flex text; gap words with margin instead. */
export function splitOgWords(value) {
  return String(value).split(/\s+/).filter(Boolean)
}

function text(style, value) {
  const words = splitOgWords(value)
  const fontSize = Number(style.fontSize) || 24
  const gap = Math.round(fontSize * 0.3)
  return flex(
    { flexWrap: "wrap", ...style },
    words.map((word, index) =>
      h(
        "div",
        {
          style: {
            display: "flex",
            marginRight: index === words.length - 1 ? 0 : gap,
          },
        },
        word
      )
    )
  )
}

export function renderDocsOgImage({ title, description, logoSrc }) {
  return new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#fafafa",
          padding: 72,
        },
      },
      flex(
        { alignItems: "center", justifyContent: "space-between" },
        [
          flex({ alignItems: "center" }, [
            h("img", {
              src: logoSrc,
              width: 56,
              height: 56,
              alt: "",
              style: { borderRadius: 8 },
            }),
            text(
              {
                marginLeft: 16,
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.04em",
              },
              SITE_NAME
            ),
          ]),
          text({ fontSize: 22, color: "#737373" }, "23rd.dev"),
        ]
      ),
      flex({ flexDirection: "column" }, [
        text(
          {
            fontSize: title.length > 28 ? 56 : 64,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
          },
          title
        ),
        text(
          {
            marginTop: 20,
            fontSize: 26,
            color: "#a3a3a3",
            lineHeight: 1.35,
            maxWidth: 980,
          },
          description
        ),
      ]),
      text({ fontSize: 20, color: "#737373" }, "shadcn registry")
    ),
    { ...OG_IMAGE_SIZE }
  )
}

export async function renderDocsOgPng(page, logoSrc) {
  const response = renderDocsOgImage({
    title: page.title,
    description: page.description,
    logoSrc,
  })
  return Buffer.from(await response.arrayBuffer())
}

export async function buildOgImages(root = process.cwd()) {
  const pages = await listDocsOgPages(root)
  const logoSrc = await loadOgLogoSrc(root)
  const written = []

  for (const page of pages) {
    const png = await renderDocsOgPng(page, logoSrc)
    const out = docsOgPublicFile(page.slug, root)
    await mkdir(dirname(out), { recursive: true })
    await writeFile(out, png)
    written.push({ file: out, path: docsOgImagePath(page.slug), page })
  }

  return written
}
