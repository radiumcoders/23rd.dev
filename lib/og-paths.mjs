import { join } from "node:path"

export const OG_IMAGE_SIZE = { width: 1200, height: 630 }

/** Catch-alls cannot host `opengraph-image`; pages use static `/og/docs/.../image.png`. */
export function docsOgImageSegments(slug) {
  return [...(slug ?? []), "image.png"]
}

export function docsOgImagePath(slug) {
  return `/og/docs/${docsOgImageSegments(slug).join("/")}`
}

export function docsOgPublicFile(slug, root = process.cwd()) {
  return join(root, "public", ...docsOgImagePath(slug).split("/").filter(Boolean))
}
