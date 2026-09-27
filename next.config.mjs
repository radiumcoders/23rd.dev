import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"
import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: {
    viewTransition: true,
  },
  async redirects() {
    return [
      // Temporary until the landing page lands at `/`.
      {
        source: "/",
        destination: "/docs/getting-started",
        permanent: false,
      },
      {
        source: "/docs",
        destination: "/docs/getting-started",
        permanent: false,
      },
      {
        source: "/pricing",
        destination: "/sponsors",
        permanent: true,
      },
    ]
  },
}

export default withMDX(config)

initOpenNextCloudflareForDev()
