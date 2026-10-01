import { defineConfig, defineDocs } from "fumadocs-mdx/config"

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    // Bundles each page's Markdown so "Copy Markdown" works without fs access.
    postprocess: { includeProcessedMarkdown: true },
  },
})

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: "github-light",
        dark: "vesper",
      },
    },
  },
})
