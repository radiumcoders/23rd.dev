export type GooeyColor = {
  h: number
  s: number
  l: number
  a: number
}

export const DEFAULT_COLOR: GooeyColor = { h: 320, s: 90, l: 58, a: 1 }

/** Stroked palette (closed) */
export const PALETTE_PATHS = [
  "M12 3.5c3.7 0 6.75 2.85 6.75 6.5 0 1.2-.95 2.2-2.15 2.2h-.35c-.7 0-1.25.55-1.25 1.25V14c0 2.35-1.9 4.25-4.25 4.25S6.5 16.35 6.5 14 8.4 9.75 10.75 9.75h.5",
  "M8.2 8.1a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z",
  "M11.2 6.4a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z",
  "M14.6 6.9a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z",
  "M16.9 9.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z",
]

/** Close X (open) */
export const CLOSE_PATHS = ["M7 7L17 17", "M17 7L7 17"]

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function toCss(color: GooeyColor) {
  return `hsla(${Math.round(color.h)} ${Math.round(color.s)}% ${Math.round(color.l)}% / ${Number(color.a.toFixed(3))})`
}

export function hslToRgb(h: number, s: number, l: number) {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

export function toHex(color: GooeyColor) {
  const { r, g, b } = hslToRgb(color.h, color.s, color.l)
  const rgb = [r, g, b]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")
  if (color.a >= 0.999) return `#${rgb}`
  const a = Math.round(color.a * 255)
    .toString(16)
    .padStart(2, "0")
  return `#${rgb}${a}`
}

export function rgbToHsl(r: number, g: number, b: number): Omit<GooeyColor, "a"> {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0)
      break
    case gn:
      h = (bn - rn) / d + 2
      break
    default:
      h = (rn - gn) / d + 4
  }
  return { h: (h / 6) * 360, s: s * 100, l: l * 100 }
}

export function parseColor(input?: GooeyColor | string): GooeyColor {
  if (!input) return { ...DEFAULT_COLOR }
  if (typeof input !== "string") {
    return {
      h: clamp(input.h, 0, 360),
      s: clamp(input.s, 0, 100),
      l: clamp(input.l, 0, 100),
      a: clamp(input.a, 0, 1),
    }
  }

  const hsla =
    input.match(
      /hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+)%?)?\s*\)/i
    ) ?? null
  if (hsla) {
    const aRaw = hsla[4] == null ? 1 : Number(hsla[4])
    return {
      h: clamp(Number(hsla[1]), 0, 360),
      s: clamp(Number(hsla[2]), 0, 100),
      l: clamp(Number(hsla[3]), 0, 100),
      a: clamp(aRaw > 1 ? aRaw / 100 : aRaw, 0, 1),
    }
  }

  const hex = input.trim().replace("#", "")
  if (/^[0-9a-f]{3,8}$/i.test(hex)) {
    const full =
      hex.length === 3 || hex.length === 4
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex
    const r = Number.parseInt(full.slice(0, 2), 16)
    const g = Number.parseInt(full.slice(2, 4), 16)
    const b = Number.parseInt(full.slice(4, 6), 16)
    const a =
      full.length >= 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1
    return { ...rgbToHsl(r, g, b), a: clamp(a, 0, 1) }
  }

  return { ...DEFAULT_COLOR }
}
