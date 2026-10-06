import type { MetadataRoute } from "next"

import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME}: ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/docs/getting-started",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
