"use client"

import { useState } from "react"
import { RotateCcw } from "lucide-react"

import { DitherScan } from "./dither-scan"

const settings = {
  passes: 4,
  duration: 1400,
  pixelSize: 6,
  blur: 6,
  angle: 45,
  alternate: true,
  loop: true,
}

const W = 1500
const H = 1000

/** A seeded random stream, so the scene is the same on every load. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

/**
 * A mountain ridge: a valley around `center` (0–1 across) that climbs
 * `depth` px toward the sides, roughened by midpoint displacement.
 */
function ridge(
  seed: number,
  base: number,
  depth: number,
  amp: number,
  center = 0.5
) {
  const rand = seeded(seed)
  const n = 128
  const noise = new Array<number>(n + 1).fill(0)
  const split = (a: number, b: number, h: number) => {
    if (b - a < 2) return
    const m = (a + b) >> 1
    noise[m] = (noise[a]! + noise[b]!) / 2 + (rand() - 0.5) * h
    split(a, m, h * 0.6)
    split(m, b, h * 0.6)
  }
  noise[0] = (rand() - 0.5) * amp
  noise[n] = (rand() - 0.5) * amp
  split(0, n, amp)
  const pts = noise.map((v, i) => {
    const t = i / n
    const side = Math.min(
      1,
      Math.abs(t - center) / Math.max(center, 1 - center)
    )
    const y = base - depth * side ** 1.7 + v
    return `${(t * W).toFixed(1)},${y.toFixed(1)}`
  })
  return `M0,${H} L${pts.join(" L")} L${W},${H} Z`
}

/** A stand of pines between `from` and `to`, tallest at the outer edge. */
function pines(seed: number, from: number, to: number, y: number, h: number) {
  const rand = seeded(seed)
  let d = ""
  const count = 16
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const x = from + t * (to - from) + (rand() - 0.5) * 16
    const th = h * (1 - 0.55 * t) * (0.75 + rand() * 0.4)
    const w = th * 0.2
    const b = y + rand() * 10
    const top = b - th
    // Three tiers, so each tree reads as a pine, not a spike.
    for (let k = 0; k < 3; k++) {
      const ty = top + (th * k) / 4
      const by = top + (th * (k + 2)) / 4
      const bw = w * (0.6 + k * 0.25)
      d += `M${x.toFixed(1)},${ty.toFixed(1)} L${(x + bw).toFixed(1)},${by.toFixed(1)} L${(x - bw).toFixed(1)},${by.toFixed(1)} Z `
    }
    d += `M${(x - 3).toFixed(1)},${(b - th / 4).toFixed(1)} h6 V${(b + 4).toFixed(1)} h-6 Z `
  }
  return d
}

const LAYERS = [
  { d: ridge(11, 640, 300, 190, 0.5), top: "#EFA3A3", bottom: "#F8C6A9" },
  { d: ridge(23, 700, 230, 150, 0.36), top: "#BE6489", bottom: "#DE8D93" },
  { d: ridge(37, 745, 170, 110, 0.64), top: "#7E3E75", bottom: "#A85A82" },
  { d: ridge(41, 780, 100, 60, 0.5), top: "#46244F", bottom: "#6B3567" },
]

const starRand = seeded(5)
const STARS = Array.from({ length: 70 }, () => {
  const rand = starRand
  const x = rand() * W
  const y = rand() * 330
  const r = 0.8 + rand() * 1.6
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" opacity="${(0.3 + rand() * 0.6).toFixed(2)}"/>`
}).join("")

const GLARE = Array.from({ length: 16 }, (_, i) => {
  const w = 250 - i * 12 + ((i * 37) % 34)
  const x = 750 - w / 2 + ((i * 53) % 23) - 11
  return `<rect x="${x}" y="${792 + i * 11}" width="${w}" height="4" rx="2"/>`
}).join("")

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#17153F"/><stop offset="0.24" stop-color="#4A2580"/>
<stop offset="0.44" stop-color="#B23C7E"/><stop offset="0.58" stop-color="#F0704C"/>
<stop offset="0.7" stop-color="#FDBE6C"/></linearGradient>
<radialGradient id="halo" cx="0.5" cy="0.55" r="0.42">
<stop offset="0" stop-color="#FFF3CC" stop-opacity="0.9"/><stop offset="0.25" stop-color="#FFC46A" stop-opacity="0.45"/>
<stop offset="1" stop-color="#F0704C" stop-opacity="0"/></radialGradient>
<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#FFFCEB"/><stop offset="1" stop-color="#FFD584"/></linearGradient>
${LAYERS.map((l, i) => `<linearGradient id="m${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l.top}"/><stop offset="1" stop-color="${l.bottom}"/></linearGradient>`).join("")}
<linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#F6A487"/><stop offset="0.35" stop-color="#9A4A78"/><stop offset="1" stop-color="#1C1136"/></linearGradient>
<linearGradient id="glare" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#FFF0BF"/><stop offset="1" stop-color="#FFB46B" stop-opacity="0"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g fill="#FFFFFF">${STARS}</g>
<rect width="${W}" height="${H}" fill="url(#halo)"/>
<g fill="#FFD7C4" opacity="0.5">
<ellipse cx="290" cy="330" rx="240" ry="15"/><ellipse cx="420" cy="360" rx="150" ry="9"/>
<ellipse cx="1200" cy="290" rx="250" ry="14"/><ellipse cx="1080" cy="322" rx="140" ry="8"/></g>
<circle cx="750" cy="560" r="105" fill="url(#sun)"/>
${LAYERS.map((l, i) => `<path d="${l.d}" fill="url(#m${i})"/>`).join("")}
<rect y="790" width="${W}" height="${H - 790}" fill="url(#lake)"/>
<g fill="url(#glare)">${GLARE}</g>
<path d="${ridge(59, 990, 80, 20, 0.5)}" fill="#140B24"/>
<path d="${pines(7, -10, 340, 985, 260)}" fill="#140B24"/>
<path d="${pines(19, 1510, 1170, 985, 240)}" fill="#140B24"/>
<g fill="none" stroke="#3A1E52" stroke-width="3" stroke-linecap="round">
<path d="M520,420 q12,-10 24,0 q12,-10 24,0"/><path d="M585,392 q9,-8 18,0 q9,-8 18,0"/><path d="M478,450 q7,-6 14,0 q7,-6 14,0"/></g>
</svg>`

const SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SCENE)}`

export default function DitherScanDemo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }
  const [replayKey, setReplayKey] = useState(0)

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-8 sm:px-10">
      <div
        className="w-full"
        style={{ maxWidth: "min(1120px, calc((100vh - 7rem) * 1.5))" }}
      >
        <DitherScan
          src={SRC}
          alt="Layered mountains over a lake at sunset"
          passes={s.passes}
          duration={s.duration}
          pixelSize={s.pixelSize}
          blur={s.blur}
          angle={s.angle}
          alternate={s.alternate}
          loop={s.loop}
          reducedMotionProgress={0.5}
          replayKey={replayKey}
          className="rounded-2xl shadow-[0_30px_80px_-30px_rgb(0_0_0/0.45)]"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setReplayKey((key) => key + 1)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Replay
          </button>
        </div>
      </div>
    </div>
  )
}
