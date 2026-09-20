import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { ROOT } from "../scripts/registry-lib.mjs"

const sponsorsLib = readFileSync(join(ROOT, "lib/sponsors.ts"), "utf8")
const sponsorsPage = readFileSync(join(ROOT, "app/sponsors/page.tsx"), "utf8")
const envExample = readFileSync(join(ROOT, ".env.example"), "utf8")
const devVarsExample = readFileSync(join(ROOT, ".dev.vars.example"), "utf8")

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
    "prod_4ZM6WkQrmCSBtFGCdYp7rZ",
    "prod_7jEvtpKnPoVXOAZLBnoWfA",
    "prod_MqDtYvXUGlGqgEz898MCA",
    "prod_3aZ8AxbA2h43IRUMxigep0",
  ]) {
    assert.match(sponsorsLib, new RegExp(productId))
  }
})

test("checkout URLs must be https, otherwise mailto fallback is used", () => {
  const fallback = "mailto:sponsors@23rd.dev?subject=23rd%20Gold%20sponsorship"

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

test("sponsors page lists empty slots as Be here", () => {
  assert.match(sponsorsPage, /Sponsor 23rd/)
  assert.match(sponsorsPage, /Be here/)
})

test("thank-you page mounts a confetti canvas", () => {
  const thanksPage = readFileSync(
    join(ROOT, "app/sponsors/thanks/page.tsx"),
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
