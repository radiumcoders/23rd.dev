import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { ROOT } from "../scripts/registry-lib.mjs"

const sponsorsLib = readFileSync(join(ROOT, "lib/sponsors.ts"), "utf8")
const sponsorsPage = readFileSync(
  join(ROOT, "app/(marketing)/sponsors/page.tsx"),
  "utf8"
)
const envExample = readFileSync(join(ROOT, ".env.example"), "utf8")
const devVarsExample = readFileSync(join(ROOT, ".dev.vars.example"), "utf8")
const wranglerConfig = readFileSync(join(ROOT, "wrangler.jsonc"), "utf8")

function resolveSponsorCheckoutHref(configuredUrl, fallbackHref) {
  const trimmed = configuredUrl?.trim()
  if (!trimmed) return fallbackHref

  try {
    const checkoutUrl = new URL(trimmed)
    return checkoutUrl.protocol === "https:" ? checkoutUrl.href : fallbackHref
  } catch {
    return fallbackHref
  }
}

test("ship tiers are Diamond $250, Platinum $100, Gold $50, Silver $20", () => {
  const expected = [
    ["diamond", 250, 4],
    ["platinum", 100, 6],
    ["gold", 50, 8],
    ["silver", 20, 12],
  ]

  for (const [id, price, slots] of expected) {
    const block = new RegExp(
      `id: "${id}"[\\s\\S]*?monthlyPriceUsd: ${price}[\\s\\S]*?slots: ${slots}`
    )
    assert.match(sponsorsLib, block)
  }
})

test("Creem checkout env keys are documented and read at request time", () => {
  for (const key of [
    "CREEM_SPONSOR_DIAMOND_CHECKOUT_URL",
    "CREEM_SPONSOR_PLATINUM_CHECKOUT_URL",
    "CREEM_SPONSOR_GOLD_CHECKOUT_URL",
    "CREEM_SPONSOR_SILVER_CHECKOUT_URL",
  ]) {
    assert.match(envExample, new RegExp(`^${key}=`, "m"))
    assert.match(devVarsExample, new RegExp(`^${key}=`, "m"))
  }

  assert.match(
    sponsorsLib,
    /CREEM_SPONSOR_\$\{id\.toUpperCase\(\)\}_CHECKOUT_URL/
  )
  assert.match(sponsorsLib, /process\.env\[sponsorCheckoutEnvKey\(id\)\]/)
  assert.match(sponsorsPage, /getSponsorTiers\(\)/)
  assert.match(sponsorsPage, /await connection\(\)/)
  for (const productId of [
    "prod_1lz1o8e7HtglOuXbMRnSmc",
    "prod_4kpDvyYwr6XnRuMSysnI3s",
    "prod_2NW3lMTPFHeOey3XhUYlM",
    "prod_3uz4xoRD5vVePnDwRIJxoi",
  ]) {
    assert.match(sponsorsLib, new RegExp(productId))
    assert.match(envExample, new RegExp(productId))
    assert.match(devVarsExample, new RegExp(productId))
    assert.match(wranglerConfig, new RegExp(productId))
  }
})

test("checkout URLs must be https, otherwise mailto fallback is used", () => {
  const fallback =
    "mailto:radiumcoders@gmail.com?subject=23rd%20Gold%20sponsorship"

  assert.equal(resolveSponsorCheckoutHref(undefined, fallback), fallback)
  assert.equal(resolveSponsorCheckoutHref("   ", fallback), fallback)
  assert.equal(
    resolveSponsorCheckoutHref("http://creem.io/payment/prod_gold", fallback),
    fallback
  )
  assert.equal(resolveSponsorCheckoutHref("not a url", fallback), fallback)
  assert.equal(
    resolveSponsorCheckoutHref(
      "https://www.creem.io/payment/prod_gold",
      fallback
    ),
    "https://www.creem.io/payment/prod_gold"
  )
})

const sponsorCheckoutComingSoon =
  /export const SPONSOR_CHECKOUT_COMING_SOON = true/.test(sponsorsLib)

function isSponsorCheckoutBlocked(
  href,
  comingSoon = sponsorCheckoutComingSoon
) {
  if (comingSoon) return true

  try {
    const url = new URL(href)
    if (url.protocol !== "https:") return true
    return url.pathname === "/test" || url.pathname.startsWith("/test/")
  } catch {
    return true
  }
}

test("sponsors page lists empty slots as Be here", () => {
  assert.match(sponsorsPage, /Sponsor 23rd/)
  assert.match(sponsorsPage, /Be here/)
})

test("sponsor checkout stays coming soon until Creem approves", () => {
  assert.equal(sponsorCheckoutComingSoon, true)
  assert.match(sponsorsLib, /SPONSOR_CHECKOUT_COMING_SOON/)
  assert.match(sponsorsLib, /if \(SPONSOR_CHECKOUT_COMING_SOON\) return true/)
  assert.match(sponsorsLib, /function isSponsorCheckoutBlocked/)
  assert.match(sponsorsLib, /pathname.startsWith\("\/test\/"\)/)
  assert.match(sponsorsPage, /isSponsorCheckoutBlocked\(tier\.checkoutHref\)/)
  assert.match(sponsorsPage, /Coming soon/)
  assert.doesNotMatch(sponsorsPage, /On the way to approval/)

  for (const productId of [
    "prod_4ZM6WkQrmCSBtFGCdYp7rZ",
    "prod_7jEvtpKnPoVXOAZLBnoWfA",
    "prod_MqDtYvXUGlGqgEz898MCA",
    "prod_3aZ8AxbA2h43IRUMxigep0",
    "prod_1lz1o8e7HtglOuXbMRnSmc",
  ]) {
    assert.equal(
      isSponsorCheckoutBlocked(`https://www.creem.io/payment/${productId}`),
      true
    )
    assert.equal(
      isSponsorCheckoutBlocked(`https://creem.io/test/product/${productId}`),
      true
    )
  }

  assert.equal(
    isSponsorCheckoutBlocked("https://www.creem.io/payment/prod_gold", false),
    false
  )
  assert.equal(
    isSponsorCheckoutBlocked("https://creem.io/test/product/prod_gold", false),
    true
  )
  assert.equal(isSponsorCheckoutBlocked("mailto:radiumcoders@gmail.com"), true)
})

test("thank-you page mounts a confetti canvas", () => {
  const thanksPage = readFileSync(
    join(ROOT, "app/(marketing)/sponsors/thanks/page.tsx"),
    "utf8"
  )
  const confetti = readFileSync(
    join(ROOT, "components/thanks-confetti.tsx"),
    "utf8"
  )
  assert.match(thanksPage, /ThanksConfetti/)
  assert.match(confetti, /prefers-reduced-motion/)
  assert.match(confetti, /spawnBurst/)
})

test("sponsors prices, terms, privacy, and support email match the shadscan layout", () => {
  const terms = readFileSync(
    join(ROOT, "app/(marketing)/terms/page.tsx"),
    "utf8"
  )
  const privacy = readFileSync(
    join(ROOT, "app/(marketing)/privacy/page.tsx"),
    "utf8"
  )
  const footer = readFileSync(join(ROOT, "components/site-footer.tsx"), "utf8")
  const header = readFileSync(join(ROOT, "components/site-header.tsx"), "utf8")
  const docsShell = readFileSync(
    join(ROOT, "components/docs-shell.tsx"),
    "utf8"
  )
  const sponsorLink = readFileSync(
    join(ROOT, "components/github-sponsor.tsx"),
    "utf8"
  )
  const legal = readFileSync(join(ROOT, "lib/legal.ts"), "utf8")
  const site = readFileSync(join(ROOT, "lib/site.ts"), "utf8")
  const nextConfig = readFileSync(join(ROOT, "next.config.mjs"), "utf8")

  assert.match(legal, /radiumcoders@gmail\.com/)
  assert.match(sponsorsPage, /Sponsor 23rd/)
  assert.match(sponsorsPage, /billed through Creem/)
  assert.match(sponsorsLib, /monthlyPriceUsd: 250/)
  assert.match(sponsorsLib, /monthlyPriceUsd: 100/)
  assert.match(sponsorsLib, /monthlyPriceUsd: 50/)
  assert.match(sponsorsLib, /monthlyPriceUsd: 20/)
  assert.match(terms, /Terms of Service/)
  assert.match(terms, /LEGAL_CONTACT_EMAIL/)
  assert.match(privacy, /Privacy Policy/)
  assert.match(privacy, /LEGAL_CONTACT_EMAIL/)
  assert.match(header, /href: "\/sponsors"/)
  assert.doesNotMatch(header, /\/pricing/)
  assert.match(site, /href: "\/terms"/)
  assert.match(site, /href: "\/privacy"/)
  assert.match(footer, /FOOTER_LINKS/)
  assert.match(footer, /aria-label="Secondary"/)
  assert.match(footer, /SUPPORT_EMAIL/)
  assert.match(docsShell, /FOOTER_LINKS/)
  assert.match(docsShell, /SUPPORT_EMAIL/)
  assert.match(sponsorLink, /href="\/sponsors"/)
  assert.match(sponsorLink, />Sponsor</)
  assert.match(sponsorLink, /SPONSOR_CHECKOUT_COMING_SOON/)
  assert.match(sponsorLink, /Soon/)
  assert.doesNotMatch(sponsorLink, /github\.com\/sponsors/)
  assert.match(nextConfig, /source: "\/pricing"/)
  assert.match(nextConfig, /destination: "\/sponsors"/)
})
