import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache"

// Every page is prerendered at build and nothing revalidates, so the
// prerendered HTML is served from Workers static assets. Without a cache,
// OpenNext rendered each page again on every request.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
})
