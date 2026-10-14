import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DataTexture,
  DepthTexture,
  DirectionalLight,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  HalfFloatType,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshNormalMaterial,
  MeshToonMaterial,
  NearestFilter,
  NoBlending,
  OrthographicCamera,
  Path,
  PlaneGeometry,
  Raycaster,
  RedFormat,
  Scene,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
  type Material,
  type Texture,
} from "three"

/**
 * A 75% mechanical keyboard drawn as an isometric illustration with
 * three.js: a milled case around a recessed plate, a volume knob, and 82
 * keycaps, shaded in three flat tone bands and outlined in ink traced from
 * depth and normals. Keys spring down under the real keyboard; chords are
 * recorded for a shortcut step in onboarding.
 *
 * Units are keys: 1 = one 1u keycap pitch. The desk is the XZ plane, y up,
 * +z toward the viewer.
 */

export type MechKeyboardPlatform = "mac" | "pc"

export type MechKeyboardKey = {
  /** `KeyboardEvent.code` of the key, or `"Fn"` */
  id: string
  /** Legend, as printed */
  label: string
  /** Shifted legend, printed after the label (`"1 !"`) */
  sub?: string
  /** Position from the top left of the plate and width, in key units */
  x: number
  y: number
  w: number
  /** Row: 0 is the function row */
  row: number
}

export type MechKeyboardShortcut = {
  /** `KeyboardEvent.code`s, modifiers first */
  codes: string[]
  /** Display legends, one per key: `["⌘", "⇧", "K"]` */
  keys: string[]
  /** `"⌘⇧K"` on Mac, `"Ctrl+Shift+K"` elsewhere */
  label: string
}

export type MechKeyboardChordPhase = "idle" | "live" | "done"

export type MechKeyboardOptions = {
  /** Offsets in px; +y is down. Default 0. */
  x?: number
  y?: number
  /** Multiplies the fitted size. Default 1. */
  scale?: number
  /** Ink and greys only; no blue caps. Default false. */
  monochrome?: boolean
  /** Real key presses and clicks drive the keys. Default true. */
  interactive?: boolean
  /** Synthesized switch sounds. Default false. */
  sound?: boolean
  /** The keyboard rises into place and a wave runs across the keys. Default true. */
  intro?: boolean
  /** Codes to pulse. */
  highlight?: string[]
  /** Bottom-row legends and shortcut labels. Default: detected. */
  platform?: MechKeyboardPlatform
  /** Leave room at the top for the recorder. Default false. */
  recorder?: boolean
  onKey?: (code: string, pressed: boolean) => void
  /** Fires when every key of a chord is released. */
  onShortcut?: (shortcut: MechKeyboardShortcut) => void
  /** Live chord for the recorder. */
  onChord?: (codes: string[], phase: MechKeyboardChordPhase) => void
}

export type MechKeyboardInstance = {
  setOptions: (next: Partial<MechKeyboardOptions>) => void
  /** Plays the intro again. */
  replay: () => void
  destroy: () => void
}

export const DEFAULT_PLACEHOLDER = "Press a shortcut"

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

type Palette = {
  case: string
  plate: string
  /** Caps fade from the back left to the front right. */
  capBack: string
  capFront: string
  knob: string
  /** Recorder keycaps: top face and skirt */
  chip: string
  chipSide: string
}

/** Outlines, legends, and the knob's notch. */
const INK = "#2B3442"
const HIGHLIGHT = "#7E9BBA"

const FROST: Palette = {
  case: "#E6E7E9",
  plate: "#8E96A3",
  capBack: "#AFC3D7",
  capFront: "#F1F2F4",
  knob: "#E2E4E7",
  chip: "#E9EEF4",
  chipSide: "#AFC3D7",
}

const MONO: Palette = {
  case: "#F2F2F3",
  plate: "#A3A6AC",
  capBack: "#FAFAFA",
  capFront: "#FAFAFA",
  knob: "#F2F2F3",
  chip: "#FAFAFA",
  chipSide: "#CDD0D5",
}

const paletteFor = (monochrome: boolean) => (monochrome ? MONO : FROST)

/** CSS variables the recorder keycaps read. */
export function recorderVars(monochrome = false) {
  const p = paletteFor(monochrome)
  return { "--chip": p.chip, "--chip-side": p.chipSide, "--ink": INK }
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const COLS = 16
/** The function row, a quarter-unit gap, then five rows. */
const LAYOUT_D = 6.25
const KNOB_ID = "AudioVolumeMute"

type Spec = [id: string, w: number, label?: string, sub?: string]

const GAP_KEY = "__gap"

const gap = (w: number): Spec => [GAP_KEY, w]
const letters = (s: string): Spec[] => s.split("").map((c) => [`Key${c}`, 1, c])
const fkeys = (from: number): Spec[] =>
  [0, 1, 2, 3].map((i) => [`F${from + i}`, 1, `F${from + i}`])

function rows(platform: MechKeyboardPlatform): Spec[][] {
  const mac = platform === "mac"
  const bottom: Spec[] = mac
    ? [
        ["ControlLeft", 1.25, "Control"],
        ["AltLeft", 1.25, "Option"],
        ["MetaLeft", 1.25, "Command"],
        ["Space", 6.25, ""],
        ["MetaRight", 1, "⌘"],
        ["AltRight", 1, "⌥"],
        ["Fn", 1, "Fn"],
      ]
    : [
        ["ControlLeft", 1.25, "Ctrl"],
        ["MetaLeft", 1.25, "Win"],
        ["AltLeft", 1.25, "Alt"],
        ["Space", 6.25, ""],
        ["AltRight", 1, "Alt"],
        ["Fn", 1, "Fn"],
        ["ControlRight", 1, "Ctrl"],
      ]
  return [
    [
      ["Escape", 1, "Esc"],
      gap(0.25),
      ...fkeys(1),
      gap(0.25),
      ...fkeys(5),
      gap(0.25),
      ...fkeys(9),
      gap(0.25),
      ["Delete", 1, "Del"],
    ],
    [
      ["Backquote", 1, "`", "~"],
      ["Digit1", 1, "1", "!"],
      ["Digit2", 1, "2", "@"],
      ["Digit3", 1, "3", "#"],
      ["Digit4", 1, "4", "$"],
      ["Digit5", 1, "5", "%"],
      ["Digit6", 1, "6", "^"],
      ["Digit7", 1, "7", "&"],
      ["Digit8", 1, "8", "*"],
      ["Digit9", 1, "9", "("],
      ["Digit0", 1, "0", ")"],
      ["Minus", 1, "-", "_"],
      ["Equal", 1, "=", "+"],
      ["Backspace", 2, "Backspace"],
      ["Home", 1, "Home"],
    ],
    [
      ["Tab", 1.5, "Tab"],
      ...letters("QWERTYUIOP"),
      ["BracketLeft", 1, "[", "{"],
      ["BracketRight", 1, "]", "}"],
      ["Backslash", 1.5, "\\", "|"],
      ["PageUp", 1, "PgUp"],
    ],
    [
      ["CapsLock", 1.75, "Caps"],
      ...letters("ASDFGHJKL"),
      ["Semicolon", 1, ";", ":"],
      ["Quote", 1, "'", '"'],
      ["Enter", 2.25, "Enter"],
      ["PageDown", 1, "PgDn"],
    ],
    [
      ["ShiftLeft", 2.25, "Shift"],
      ...letters("ZXCVBNM"),
      ["Comma", 1, ",", "<"],
      ["Period", 1, ".", ">"],
      ["Slash", 1, "/", "?"],
      ["ShiftRight", 1.75, "Shift"],
      ["ArrowUp", 1, "↑"],
      ["End", 1, "End"],
    ],
    [
      ...bottom,
      ["ArrowLeft", 1, "←"],
      ["ArrowDown", 1, "↓"],
      ["ArrowRight", 1, "→"],
    ],
  ]
}

/** The 82 keys of a 75% board, Mac or PC bottom row. */
export function buildLayout(platform: MechKeyboardPlatform): MechKeyboardKey[] {
  const keys: MechKeyboardKey[] = []
  rows(platform).forEach((row, r) => {
    const y = r === 0 ? 0 : r + 0.25
    let x = 0
    for (const [id, w, label = "", sub] of row) {
      if (id !== GAP_KEY) keys.push({ id, label, sub, x, y, w, row: r })
      x += w
    }
  })
  return keys
}

/* ------------------------------------------------------------------ */
/* Codes, labels, shortcuts                                            */
/* ------------------------------------------------------------------ */

export function detectPlatform(): MechKeyboardPlatform {
  if (typeof navigator === "undefined") return "pc"
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string }
  }
  const name = nav.userAgentData?.platform || nav.platform || nav.userAgent
  return /mac|iphone|ipad|ipod/i.test(name) ? "mac" : "pc"
}

const MODIFIER_ORDER: Record<MechKeyboardPlatform, string[]> = {
  mac: ["Control", "Alt", "Shift", "Meta", "Fn"],
  pc: ["Control", "Meta", "Alt", "Shift", "Fn"],
}

/** `"ShiftLeft"` → `"Shift"`; anything else → undefined. */
export function modifierOf(code: string) {
  if (code === "Fn") return "Fn"
  const match = /^(Control|Alt|Shift|Meta|OS)(Left|Right)$/.exec(code)
  if (!match) return undefined
  return match[1] === "OS" ? "Meta" : match[1]
}

const MAC_LABELS: Record<string, string> = {
  Control: "⌃",
  Alt: "⌥",
  Shift: "⇧",
  Meta: "⌘",
  Fn: "fn",
  Escape: "esc",
  Tab: "⇥",
  CapsLock: "⇪",
  Enter: "↩",
  Backspace: "⌫",
  Delete: "⌦",
  Space: "Space",
}

const PC_LABELS: Record<string, string> = {
  Control: "Ctrl",
  Alt: "Alt",
  Shift: "Shift",
  Meta: "Win",
  Fn: "Fn",
  Escape: "Esc",
  Tab: "Tab",
  CapsLock: "Caps",
  Enter: "Enter",
  Backspace: "Backspace",
  Delete: "Del",
  Space: "Space",
}

const SHARED_LABELS: Record<string, string> = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  PageUp: "PgUp",
  PageDown: "PgDn",
  Home: "Home",
  End: "End",
  Insert: "Ins",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  IntlBackslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backquote: "`",
  NumpadEnter: "Enter",
  AudioVolumeMute: "Mute",
  AudioVolumeUp: "Vol +",
  AudioVolumeDown: "Vol −",
}

/** One legend for a `KeyboardEvent.code`. */
export function keyLabel(code: string, platform: MechKeyboardPlatform) {
  const table = platform === "mac" ? MAC_LABELS : PC_LABELS
  const name = modifierOf(code) ?? code
  if (table[name]) return table[name]
  if (SHARED_LABELS[name]) return SHARED_LABELS[name]
  const match = /^(?:Key|Digit|Numpad)(.+)$/.exec(name)
  if (match) return match[1]!
  return name
}

/** Modifiers first in platform order (one per kind), then keys as pressed. */
export function formatShortcut(
  codes: string[],
  platform: MechKeyboardPlatform
): MechKeyboardShortcut {
  const order = MODIFIER_ORDER[platform]
  const mods = new Map<string, string>()
  const rest: string[] = []
  for (const code of codes) {
    const mod = modifierOf(code)
    if (mod) {
      if (!mods.has(mod)) mods.set(mod, code)
    } else if (!rest.includes(code)) {
      rest.push(code)
    }
  }
  const sorted = [
    ...order.filter((m) => mods.has(m)).map((m) => mods.get(m)!),
    ...rest,
  ]
  const keys = sorted.map((code) => keyLabel(code, platform))
  return {
    codes: sorted,
    keys,
    label: platform === "mac" ? keys.join("") : keys.join("+"),
  }
}

const ALIASES: Record<string, string[]> = {
  Insert: ["Delete"],
  NumpadEnter: ["Enter"],
  IntlBackslash: ["Backslash"],
  OSLeft: ["MetaLeft"],
  OSRight: ["MetaRight"],
  NumpadDecimal: ["Period"],
  NumpadDivide: ["Slash"],
  NumpadSubtract: ["Minus"],
  NumpadAdd: ["Equal"],
  AudioVolumeUp: [],
  AudioVolumeDown: [],
}

/** Which keycaps a code moves. */
function capsFor(code: string): string[] {
  const pad = /^Numpad(\d)$/.exec(code)
  if (pad) return [`Digit${pad[1]}`]
  return ALIASES[code] ?? [code]
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

const DEG = Math.PI / 180
/** True isometric: the desk turned 45° and seen from 35.26° up. */
const ISO_TILT = 35.26 * DEG
const ISO_TURN = 45 * DEG
/** Bezel around the plate */
const BEZEL = 0.48
const W = COLS + BEZEL * 2
const D = LAYOUT_D + BEZEL * 2
/** Case height at the front; the back rises by RISE (typing angle). */
const CASE_H = 0.95
const RISE = 0.4
const TILT = Math.atan2(RISE, D)
/** Bezel top down to the top of the plate */
const WELL = 0.5
/** Gap around a cap in its cell, switch height under the cap, key travel */
const GAP = 0.035
const SWITCH = 0.12
const TRAVEL = 0.16
/** Keycap: height, skirt taper, top edge radius, corner radius */
const CAP_H = 0.5
const CAP_TAPER = 0.07
const CAP_EDGE = 0.018
const CAP_RADIUS = 0.1

function roundedRect<T extends Path>(path: T, w: number, h: number, r: number) {
  const x = -w / 2
  const y = -h / 2
  path.moveTo(x + r, y)
  path.lineTo(x + w - r, y)
  path.quadraticCurveTo(x + w, y, x + w, y + r)
  path.lineTo(x + w, y + h - r)
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  path.lineTo(x + r, y + h)
  path.quadraticCurveTo(x, y + h, x, y + h - r)
  path.lineTo(x, y + r)
  path.quadraticCurveTo(x, y, x + r, y)
  return path
}

/**
 * The milled frame around the well: extruded with one-segment bevels, so
 * every edge is a flat chamfer the ink can trace, then sheared into a
 * wedge.
 */
function caseGeometry() {
  const chamfer = 0.05
  const outer = roundedRect(new Shape(), W - chamfer * 2, D - chamfer * 2, 0.16)
  outer.holes.push(
    roundedRect(
      new Path(),
      COLS + 0.12 + chamfer * 2,
      LAYOUT_D + 0.12 + chamfer * 2,
      0.06
    )
  )
  const geometry = new ExtrudeGeometry(outer, {
    depth: CASE_H - chamfer * 2,
    bevelEnabled: true,
    bevelThickness: chamfer,
    bevelSize: chamfer,
    bevelSegments: 1,
    curveSegments: 8,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, chamfer, 0)
  const pos = geometry.attributes.position!
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const back = Math.min(1, Math.max(0, (D / 2 - pos.getZ(i)) / D))
    pos.setY(i, y + back * RISE * Math.min(1, Math.max(0, y / CASE_H)))
  }
  geometry.computeVertexNormals()
  return geometry
}

/** Top of the bezel at depth z (0 is the middle). */
const bezelTop = (z: number) => CASE_H + ((D / 2 - z) / D) * RISE

/** Points around a rounded rectangle, back right corner first. */
function ring(hw: number, hd: number, r: number, seg: number) {
  const out: Array<[number, number]> = []
  const corners: Array<[number, number, number]> = [
    [hw - r, -(hd - r), -90],
    [hw - r, hd - r, 0],
    [-(hw - r), hd - r, 90],
    [-(hw - r), -(hd - r), 180],
  ]
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = (a0 + (90 * i) / seg) * DEG
      out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r])
    }
  }
  return out
}

/**
 * A keycap as one smooth surface: a tapered skirt and a crisp top edge.
 * UVs are a projection from above over the footprint, so a canvas the size
 * of the footprint prints its legend onto the top.
 */
function capGeometry(w: number) {
  const fw = w - GAP * 2
  const fd = 1 - GAP * 2
  const profile: Array<[inset: number, y: number]> = []
  for (let i = 0; i <= 2; i++) {
    const t = i / 2
    profile.push([CAP_TAPER * t, (CAP_H - CAP_EDGE) * t])
  }
  for (let i = 1; i <= 3; i++) {
    const a = (i / 3) * (Math.PI / 2)
    profile.push([
      CAP_TAPER + CAP_EDGE * (1 - Math.cos(a)),
      CAP_H - CAP_EDGE + CAP_EDGE * Math.sin(a),
    ])
  }

  const rings: Array<Array<[number, number, number]>> = []
  for (const [inset, y] of profile) {
    const r = Math.max(0.03, CAP_RADIUS - inset * 0.35)
    rings.push(
      ring(fw / 2 - inset, fd / 2 - inset, r, 5).map(([x, z]) => [x, y, z])
    )
  }
  const top = rings[rings.length - 1]!
  for (const s of [0.5]) rings.push(top.map(([x, y, z]) => [x * s, y, z * s]))

  const positions: number[] = []
  const uvs: number[] = []
  for (const points of rings) {
    for (const [x, y, z] of points) {
      positions.push(x, y, z)
      uvs.push(0.5 + x / fw, 0.5 - z / fd)
    }
  }
  positions.push(0, CAP_H, 0)
  uvs.push(0.5, 0.5)

  const n = top.length
  const index: number[] = []
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < n; j++) {
      const a = i * n + j
      const b = i * n + ((j + 1) % n)
      const c = (i + 1) * n + j
      const d = (i + 1) * n + ((j + 1) % n)
      index.push(a, c, b, b, c, d)
    }
  }
  const center = rings.length * n
  const last = (rings.length - 1) * n
  for (let j = 0; j < n; j++) {
    index.push(last + j, center, last + ((j + 1) % n))
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

/** The volume knob, turned on a lathe. */
function knobGeometry() {
  const r = 0.4
  const h = 0.62
  const points = [
    new Vector2(0, 0),
    new Vector2(r - 0.02, 0),
    new Vector2(r, 0.02),
    new Vector2(r, h - 0.03),
    new Vector2(r - 0.03, h),
    new Vector2(0, h),
  ]
  return new LatheGeometry(points, 64)
}

/* ------------------------------------------------------------------ */
/* Textures                                                            */
/* ------------------------------------------------------------------ */

function canvas(w: number, h: number) {
  const el = document.createElement("canvas")
  el.width = w
  el.height = h
  return [el, el.getContext("2d")!] as const
}

/** Three flat tone bands. */
function rampTexture() {
  const texture = new DataTexture(
    new Uint8Array([120, 196, 255]),
    3,
    1,
    RedFormat
  )
  texture.minFilter = NearestFilter
  texture.magFilter = NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

const LEGEND_PX = 256

/** Arrow legends, as the angle of a right-pointing arrow. */
const ARROWS: Record<string, number> = {
  "→": 0,
  "↓": Math.PI / 2,
  "←": Math.PI,
  "↑": -Math.PI / 2,
}

/** The cap's color with its legend in ink, like the outlines. */
function capTexture(key: MechKeyboardKey, color: string, font: string) {
  const fw = key.w - GAP * 2
  const fd = 1 - GAP * 2
  const [el, ctx] = canvas(
    Math.round(fw * LEGEND_PX),
    Math.round(fd * LEGEND_PX)
  )
  ctx.fillStyle = color
  ctx.fillRect(0, 0, el.width, el.height)
  ctx.fillStyle = INK
  ctx.strokeStyle = INK
  const cx = el.width / 2
  const cy = el.height * 0.47
  const arrow = ARROWS[key.label]
  if (arrow !== undefined) {
    // Drawn, not typed: plenty of UI fonts have no ← or →.
    const len = 0.17 * LEGEND_PX
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(arrow)
    ctx.lineWidth = 0.02 * LEGEND_PX
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    ctx.moveTo(-len / 2, 0)
    ctx.lineTo(len / 2, 0)
    ctx.moveTo(len / 2 - len * 0.32, -len * 0.3)
    ctx.lineTo(len / 2, 0)
    ctx.lineTo(len / 2 - len * 0.32, len * 0.3)
    ctx.stroke()
    ctx.restore()
  } else {
    const single = [...key.label].length === 1 && !key.sub
    const text = key.sub
      ? `${key.label} ${key.sub}`
      : single
        ? key.label
        : key.label.toUpperCase()
    const size = single ? 0.22 : key.sub ? 0.17 : 0.125
    ctx.font = `600 ${size * LEGEND_PX}px ${font}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    if (!single) ctx.letterSpacing = `${0.014 * LEGEND_PX}px`
    ctx.fillText(text, cx, cy)
  }
  const texture = new CanvasTexture(el)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/* ------------------------------------------------------------------ */
/* Sound                                                               */
/* ------------------------------------------------------------------ */

function createThock() {
  let audio: AudioContext | null = null
  let noise: AudioBuffer | null = null
  let master: GainNode | null = null
  return {
    play(code: string, down: boolean) {
      try {
        if (!audio) {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext
          audio = new Ctx()
          master = audio.createGain()
          master.gain.value = 0.55
          master.connect(audio.destination)
          noise = audio.createBuffer(
            1,
            Math.floor(audio.sampleRate * 0.06),
            audio.sampleRate
          )
          const data = noise.getChannelData(0)
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
        }
        if (audio.state === "suspended") void audio.resume()
        const t = audio.currentTime
        const big =
          code === "Space" ||
          code === "Enter" ||
          code === "Backspace" ||
          code.startsWith("Shift")
        const vary = 0.93 + Math.random() * 0.14

        const body = audio.createOscillator()
        body.type = "sine"
        const f = 132 * (big ? 0.72 : 1) * (down ? 1 : 1.3) * vary
        body.frequency.setValueAtTime(f * 1.9, t)
        body.frequency.exponentialRampToValueAtTime(f, t + 0.03)
        const bodyGain = audio.createGain()
        bodyGain.gain.setValueAtTime(down ? 0.32 : 0.1, t)
        bodyGain.gain.exponentialRampToValueAtTime(
          0.0001,
          t + (down ? 0.1 : 0.05)
        )
        body.connect(bodyGain).connect(master!)
        body.start(t)
        body.stop(t + 0.12)

        const hit = audio.createBufferSource()
        hit.buffer = noise
        const band = audio.createBiquadFilter()
        band.type = "bandpass"
        band.frequency.value = 2900 * (down ? 1 : 1.25) * vary
        band.Q.value = 1.1
        const hitGain = audio.createGain()
        hitGain.gain.setValueAtTime(down ? 0.5 : 0.22, t)
        hitGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035)
        hit.connect(band).connect(hitGain).connect(master!)
        hit.start(t)
        hit.stop(t + 0.06)
      } catch {
        /* no audio: stay silent */
      }
    },
    close() {
      void audio?.close()
    },
  }
}

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === "TEXTAREA" || tag === "SELECT") return true
  if (tag !== "INPUT") return false
  const type = (target as HTMLInputElement).type
  return ![
    "checkbox",
    "radio",
    "button",
    "range",
    "color",
    "submit",
    "reset",
  ].includes(type)
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

type Resolved = Required<
  Omit<MechKeyboardOptions, "onKey" | "onShortcut" | "onChord" | "highlight">
> &
  Pick<MechKeyboardOptions, "onKey" | "onShortcut" | "onChord"> & {
    highlight: string[]
  }

function resolve(options: MechKeyboardOptions): Resolved {
  const num = (v: number | undefined, d: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : d
  return {
    x: num(options.x, 0),
    y: num(options.y, 0),
    scale: Math.max(0.05, num(options.scale, 1)),
    monochrome: options.monochrome ?? false,
    interactive: options.interactive ?? true,
    sound: options.sound ?? false,
    intro: options.intro ?? true,
    highlight: options.highlight ?? [],
    platform:
      options.platform === "mac" || options.platform === "pc"
        ? options.platform
        : detectPlatform(),
    recorder: options.recorder ?? false,
    onKey: options.onKey,
    onShortcut: options.onShortcut,
    onChord: options.onChord,
  }
}

type Cap = {
  id: string
  x: number
  y: number
  holder: Group
  /** Rest height of the holder */
  base: number
  /** How far it goes down */
  travel: number
  material: MeshToonMaterial
  pos: number
  vel: number
  target: number
}

const NEAR = 0.1
const FAR = 200

/**
 * Mounts a canvas in `stage` and listens on `root`
 * (focusable; pointer and keys). Returns a no-op instance without WebGL.
 */
export function createMechKeyboard(
  root: HTMLElement,
  stage: HTMLElement,
  initial: MechKeyboardOptions = {}
): MechKeyboardInstance {
  let opts = resolve(initial)
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true })
  } catch {
    return { setOptions() {}, replay() {}, destroy() {} }
  }
  renderer.setPixelRatio(Math.min(Math.max(1, window.devicePixelRatio), 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  const el = renderer.domElement
  el.style.display = "block"
  el.style.width = "100%"
  el.style.height = "100%"
  stage.appendChild(el)

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  let reduced = mqReduce.matches
  let destroyed = false
  const disposables: Array<Material | Texture | BufferGeometry> = []
  const keep = <T extends Material | Texture | BufferGeometry>(item: T) => {
    disposables.push(item)
    return item
  }

  /* ---------- scene ---------- */

  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, NEAR, FAR)

  // desk: tipped toward the camera. board: turned 45° on the desk.
  const desk = new Group()
  desk.rotation.x = ISO_TILT
  scene.add(desk)
  const board = new Group()
  board.rotation.y = ISO_TURN
  board.position.y = -(CASE_H + RISE / 2) / 2
  desk.add(board)

  // Light fixed to the view, the illustrator's convention: tops lightest,
  // left faces middle, right faces darkest.
  const key = new DirectionalLight(0xffffff, 1.9)
  key.position.set(-3, 6, 4)
  scene.add(key, key.target, new AmbientLight(0xffffff, 1.1))

  // A flat, hard-edged shadow, offset down and to the right.
  const shadow = new Mesh(
    keep(
      new ShapeGeometry(roundedRect(new Shape(), W, D, 0.16), 8).rotateX(
        -Math.PI / 2
      )
    ),
    keep(
      new MeshBasicMaterial({
        color: INK,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      })
    )
  )
  shadow.rotation.y = ISO_TURN
  shadow.position.set(0.55, board.position.y + 0.003, 0.75)
  desk.add(shadow)

  const ramp = keep(rampTexture())
  const caseGeo = keep(caseGeometry())
  const knobGeo = keep(knobGeometry())
  const capGeos = new Map<number, BufferGeometry>()
  const capGeo = (w: number) => {
    let g = capGeos.get(w)
    if (!g) capGeos.set(w, (g = keep(capGeometry(w))))
    return g
  }

  /* ---------- the board, rebuilt per palette, platform, and font ---------- */

  let built: {
    group: Group
    disposables: Array<Material | Texture | BufferGeometry>
    knob: Mesh
    pickable: Mesh[]
  } | null = null
  let builtFor = ""
  const caps = new Map<string, Cap>()
  let knobAngle = 0

  const fontFamily = () =>
    getComputedStyle(root).fontFamily || "ui-sans-serif, system-ui, sans-serif"
  const plateX = (x: number) => -COLS / 2 + x
  const plateZ = (y: number) => -LAYOUT_D / 2 + y

  const build = () => {
    const font = fontFamily()
    const stamp = `${opts.monochrome}|${opts.platform}|${font}`
    if (stamp === builtFor) return
    builtFor = stamp
    const palette = paletteFor(opts.monochrome)
    const own: Array<Material | Texture | BufferGeometry> = []
    const take = <T extends Material | Texture | BufferGeometry>(item: T) => {
      own.push(item)
      return item
    }
    const toon = (color: Color | string, map: Texture | null = null) =>
      take(
        new MeshToonMaterial({
          color,
          map,
          gradientMap: ramp,
          emissive: new Color(HIGHLIGHT),
          emissiveIntensity: 0,
        })
      )

    const group = new Group()
    const caseMat = toon(palette.case)
    group.add(new Mesh(caseGeo, caseMat))
    const bottom = new Mesh(
      take(new BoxGeometry(W - 0.4, 0.06, D - 0.4)),
      caseMat
    )
    bottom.position.y = 0.03
    group.add(bottom)

    // Plate and keys ride the tipped top.
    const deck = new Group()
    deck.position.y = bezelTop(0) - WELL
    deck.rotation.x = TILT
    group.add(deck)

    const plate = new Mesh(
      take(new BoxGeometry(COLS + 0.2, 0.08, LAYOUT_D + 0.2)),
      toon(palette.plate)
    )
    plate.position.y = -0.04
    deck.add(plate)

    const prev = new Map(caps)
    caps.clear()

    const knobMat = toon(palette.knob)
    const knobHolder = new Group()
    knobHolder.position.set(plateX(15.5), 0.08, plateZ(0.5))
    deck.add(knobHolder)
    const knob = new Mesh(knobGeo, knobMat)
    knob.userData.id = KNOB_ID
    knob.rotation.y = knobAngle
    knobHolder.add(knob)
    const notch = new Mesh(
      take(new BoxGeometry(0.05, 0.012, 0.2)),
      take(new MeshBasicMaterial({ color: INK }))
    )
    notch.position.set(0, 0.622, -0.19)
    knob.add(notch)
    const pickable: Mesh[] = [knob]

    const next: Cap[] = [
      {
        id: KNOB_ID,
        x: 15,
        y: 0,
        holder: knobHolder,
        base: 0.08,
        travel: 0.06,
        material: knobMat,
        pos: 0,
        vel: 0,
        target: 0,
      },
    ]

    const from = new Color(palette.capBack)
    const to = new Color(palette.capFront)
    for (const k of buildLayout(opts.platform)) {
      const cx = plateX(k.x + k.w / 2)
      const cz = plateZ(k.y + 0.5)
      const holder = new Group()
      holder.position.set(cx, SWITCH, cz)
      deck.add(holder)

      // The back rows carry the color; it washes out toward the front right.
      const t = Math.min(
        1,
        Math.max(
          0,
          (k.y / 5.25) * 0.82 + ((k.x + k.w / 2) / COLS) * 0.26 - 0.08
        )
      )
      const color = from.clone().lerp(to, t)
      const map = k.label ? take(capTexture(k, color.getStyle(), font)) : null
      const material = toon(map ? "#ffffff" : color, map)
      const mesh = new Mesh(capGeo(k.w), material)
      mesh.userData.id = k.id
      holder.add(mesh)
      pickable.push(mesh)
      next.push({
        id: k.id,
        x: k.x,
        y: k.y,
        holder,
        base: SWITCH,
        travel: TRAVEL,
        material,
        pos: 0,
        vel: 0,
        target: 0,
      })
    }

    // Keys that were down stay down across a rebuild.
    for (const cap of next) {
      const old = prev.get(cap.id)
      if (old) {
        cap.pos = old.pos
        cap.target = old.target
      }
      cap.holder.position.y = cap.base + cap.pos
      caps.set(cap.id, cap)
    }

    board.add(group)
    if (built) {
      board.remove(built.group)
      for (const item of built.disposables) item.dispose()
    }
    built = { group, disposables: own, knob, pickable }
    paintHighlights()
  }

  /* ---------- ink: edges from depth and normals ---------- */

  const color = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 })
  const normal = new WebGLRenderTarget(1, 1, { type: HalfFloatType })
  normal.depthTexture = new DepthTexture(1, 1)
  const normalMat = keep(new MeshNormalMaterial())
  const quad = new Mesh(
    keep(new PlaneGeometry(2, 2)),
    keep(
      new ShaderMaterial({
        uniforms: {
          tColor: { value: color.texture },
          tNormal: { value: normal.texture },
          tDepth: { value: normal.depthTexture },
          texel: { value: new Vector2() },
          ink: { value: new Color(INK) },
          depthRange: { value: FAR - NEAR },
        },
        vertexShader: INK_VERTEX,
        fragmentShader: INK_FRAGMENT,
        depthTest: false,
        depthWrite: false,
        blending: NoBlending,
      })
    )
  )
  const post = new Scene()
  post.add(quad)
  const postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const render = () => {
    renderer.setRenderTarget(color)
    renderer.setClearColor(0x000000, 0)
    renderer.render(scene, camera)

    shadow.visible = false
    scene.overrideMaterial = normalMat
    renderer.setRenderTarget(normal)
    renderer.setClearColor(0x8080ff, 1)
    renderer.render(scene, camera)
    scene.overrideMaterial = null
    shadow.visible = true

    renderer.setClearColor(0x000000, 0)
    renderer.setRenderTarget(null)
    renderer.render(post, postCamera)
  }

  /* ---------- fit and offset ---------- */

  let width = 0
  let height = 0
  const current = { x: 0, y: 0 }
  let introFrom: { x: number; y: number } | null = null
  let introStart = 0
  const INTRO_MS = 1300

  const corners: Vector3[] = []
  for (const x of [-W / 2, W / 2])
    for (const y of [0, CASE_H + RISE + 0.1])
      for (const z of [-D / 2, D / 2]) corners.push(new Vector3(x, y, z))
  const scratch = new Vector3()

  /** Frame the board exactly: measure its projected box straight on. */
  const fit = () => {
    if (!width || !height) return
    desk.position.set(0, 0, 0)
    desk.updateMatrixWorld(true)
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const c of corners) {
      scratch.copy(c).applyMatrix4(board.matrixWorld)
      minX = Math.min(minX, scratch.x)
      maxX = Math.max(maxX, scratch.x)
      minY = Math.min(minY, scratch.y)
      maxY = Math.max(maxY, scratch.y)
    }
    const aspect = width / height
    const room = opts.recorder ? 0.66 : 0.82
    const half =
      Math.max((maxY - minY) / 2 / room, (maxX - minX) / 2 / 0.88 / aspect) /
      opts.scale
    camera.left = -half * aspect
    camera.right = half * aspect
    camera.top = half
    camera.bottom = -half
    camera.position.set((minX + maxX) / 2, (minY + maxY) / 2, FAR / 2)
    camera.lookAt(camera.position.x, camera.position.y, 0)
    camera.updateProjectionMatrix()
    place()
  }

  function place() {
    const perPx = (camera.top - camera.bottom) / (height || 1)
    const drop = opts.recorder ? height * 0.04 : 0
    desk.position.set(current.x * perPx, -(current.y + drop) * perPx, 0)
  }

  const resize = () => {
    const w = stage.clientWidth
    const h = stage.clientHeight
    if (!w || !h || (w === width && h === height)) return false
    width = w
    height = h
    renderer.setSize(w, h, false)
    const pr = renderer.getPixelRatio()
    const pw = Math.max(1, Math.round(w * pr))
    const ph = Math.max(1, Math.round(h * pr))
    // Normals and depth at twice the resolution on 1x screens, so the
    // four-tap average in the ink pass has subpixels to antialias with.
    const s = pr < 2 ? 2 : 1
    color.setSize(pw, ph)
    normal.setSize(pw * s, ph * s)
    quad.material.uniforms.texel!.value.set(1 / pw, 1 / ph)
    fit()
    return true
  }

  /* ---------- loop ---------- */

  let raf = 0
  let last = 0
  let onScreen = true
  let pulse = 0
  let knobGoal = 0

  const wake = () => {
    if (raf || destroyed || !onScreen || document.hidden) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  const frame = (now: number) => {
    raf = 0
    if (destroyed) return
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    let busy = false

    // Offset: the intro rise, then exponential smoothing toward the props.
    if (introFrom) {
      const t = Math.min(1, (now - introStart) / INTRO_MS)
      const e = 1 - Math.pow(1 - t, 4)
      current.x = introFrom.x + (opts.x - introFrom.x) * e
      current.y = introFrom.y + (opts.y - introFrom.y) * e
      if (t >= 1) introFrom = null
      busy = true
    } else {
      const a = reduced ? 1 : 1 - Math.exp(-dt * 7)
      for (const k of ["x", "y"] as const) {
        const delta = opts[k] - current[k]
        if (Math.abs(delta) > 0.05) {
          current[k] += delta * a
          busy = true
        } else {
          current[k] = opts[k]
        }
      }
    }
    place()

    // Keys: a stiff spring down, a bouncier one back up, in fixed 4 ms
    // substeps (one Euler step this stiff blows up on a slow frame).
    const steps = Math.max(1, Math.ceil(dt / 0.004))
    const h = dt / steps
    for (const cap of caps.values()) {
      if (cap.pos === cap.target && cap.vel === 0) continue
      const down = cap.target < cap.pos
      const k = down ? 2600 : 900
      const c = down ? 80 : 26
      for (let i = 0; i < steps; i++) {
        cap.vel += (-k * (cap.pos - cap.target) - c * cap.vel) * h
        cap.pos += cap.vel * h
      }
      if (
        reduced ||
        (Math.abs(cap.pos - cap.target) < 0.0005 && Math.abs(cap.vel) < 0.01)
      ) {
        cap.pos = cap.target
        cap.vel = 0
      } else {
        busy = true
      }
      cap.holder.position.y = cap.base + cap.pos
    }

    const turn = knobGoal - knobAngle
    if (Math.abs(turn) > 0.0005) {
      knobAngle += turn * (reduced ? 1 : 1 - Math.exp(-dt * 14))
      if (built) built.knob.rotation.y = knobAngle
      busy = true
    }

    if (opts.highlight.length) {
      pulse += dt
      const glow = reduced ? 0.3 : 0.2 + 0.16 * Math.sin(pulse * 4)
      for (const id of opts.highlight) {
        const cap = caps.get(id)
        if (cap) cap.material.emissiveIntensity = glow
      }
      if (!reduced) busy = true
    }

    render()
    if (busy) wake()
  }

  function paintHighlights() {
    const set = new Set(opts.highlight)
    for (const [id, cap] of caps) {
      cap.material.emissiveIntensity = set.has(id) ? 0.3 : 0
    }
  }

  /* ---------- keys ---------- */

  const held = new Set<string>()
  const latched = new Set<string>()
  let chord: string[] = []
  const thock = createThock()

  const capFor = (id: string) => {
    const cap = caps.get(id)
    if (cap || !/(Left|Right)$/.test(id)) return cap
    const twin = id.endsWith("Left")
      ? id.replace(/Left$/, "Right")
      : id.replace(/Right$/, "Left")
    return caps.get(twin)
  }

  const paint = () => {
    const down = new Set<Cap>()
    for (const code of [...held, ...latched]) {
      for (const id of capsFor(code)) {
        const cap = capFor(id)
        if (cap) down.add(cap)
      }
    }
    for (const cap of caps.values()) {
      cap.target = down.has(cap) ? -cap.travel : 0
    }
    wake()
  }

  const sound = (code: string, down: boolean) => {
    if (opts.sound) thock.play(code, down)
  }

  const press = (code: string) => {
    if (held.has(code)) return
    if (code === "AudioVolumeUp") knobGoal -= 0.35
    if (code === "AudioVolumeDown") knobGoal += 0.35
    if (held.size === 0 && latched.size === 0) chord = []
    held.add(code)
    if (!chord.includes(code)) chord.push(code)
    paint()
    sound(code, true)
    opts.onKey?.(code, true)
    opts.onChord?.([...chord], "live")
  }

  const commit = () => {
    if (held.size || latched.size || chord.length === 0) return
    const done = chord
    chord = []
    opts.onChord?.(done, "done")
    opts.onShortcut?.(formatShortcut(done, opts.platform))
  }

  const release = (code: string) => {
    if (!held.delete(code)) return
    paint()
    sound(code, false)
    opts.onKey?.(code, false)
    commit()
  }

  const releaseAll = () => {
    const codes = [...held]
    held.clear()
    latched.clear()
    paint()
    for (const code of codes) opts.onKey?.(code, false)
    commit()
  }

  const timers = new Set<ReturnType<typeof setTimeout>>()
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.delete(id)
      if (!destroyed) fn()
    }, ms)
    timers.add(id)
  }

  // The real OS, not the `platform` legends option: it decides which
  // keyboard events arrive.
  const onMac = detectPlatform() === "mac"

  const focused = () =>
    document.activeElement === root || root.contains(document.activeElement)

  const onKeyDown = (event: KeyboardEvent) => {
    if (!opts.interactive || !event.code) return
    if (isEditable(event.target) && !root.contains(event.target as Node)) return
    if (focused() && event.code !== "Tab") event.preventDefault()
    if (event.repeat) return
    press(event.code)
    // macOS fires one event per Caps Lock toggle; never leave it stuck.
    // Elsewhere Caps Lock sends a normal down and up, so it can be held.
    if (event.code === "CapsLock" && onMac) {
      later(() => release("CapsLock"), 160)
    }
  }

  const onKeyUp = (event: KeyboardEvent) => {
    if (!event.code) return
    if (event.code === "CapsLock" && !held.has("CapsLock")) {
      if (!opts.interactive) return
      press("CapsLock")
      later(() => release("CapsLock"), 120)
      return
    }
    // While ⌘ is held macOS swallows other keyups; release them with it.
    if (modifierOf(event.code) === "Meta") {
      for (const code of [...held]) if (!modifierOf(code)) release(code)
    }
    release(event.code)
  }

  /* Pointer: modifiers latch, a non-modifier fires the chord. */
  const raycaster = new Raycaster()
  const ndc = new Vector2()
  const pick = (event: { clientX: number; clientY: number }) => {
    if (!built) return null
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return null
    ndc.set(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      -((event.clientY - r.top) / r.height) * 2 + 1
    )
    raycaster.setFromCamera(ndc, camera)
    const hit = raycaster.intersectObjects(built.pickable, false)[0]
    return (hit?.object.userData.id as string | undefined) ?? null
  }

  /** Keys held down by each pointer, so two fingers release independently. */
  const pointers = new Map<number, string>()

  const onPointerDown = (event: PointerEvent) => {
    if (!opts.interactive || event.button !== 0) return
    const code = pick(event)
    if (!code) return
    event.preventDefault()
    root.focus({ preventScroll: true })
    if (modifierOf(code)) {
      if (latched.has(code)) {
        latched.delete(code)
        chord = chord.filter((c) => c !== code)
        paint()
        opts.onChord?.([...chord], chord.length ? "live" : "idle")
      } else {
        if (held.size === 0 && latched.size === 0) chord = []
        latched.add(code)
        if (!chord.includes(code)) chord.push(code)
        paint()
        sound(code, true)
        opts.onChord?.([...chord], "live")
      }
      return
    }
    pointers.set(event.pointerId, code)
    press(code)
  }

  const onPointerUp = (event: PointerEvent) => {
    const code = pointers.get(event.pointerId)
    if (!code) return
    pointers.delete(event.pointerId)
    if (![...pointers.values()].includes(code)) {
      held.delete(code)
      sound(code, false)
      opts.onKey?.(code, false)
    }
    // Latched modifiers belong to the chord until the last finger lifts.
    if (pointers.size === 0) latched.clear()
    paint()
    commit()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!opts.interactive || event.pointerType !== "mouse") return
    el.style.cursor = pick(event) ? "pointer" : ""
  }

  /* The knob turns under the wheel, like the real one. */
  const onWheel = (event: WheelEvent) => {
    if (!opts.interactive || pick(event) !== KNOB_ID) return
    event.preventDefault()
    knobGoal += Math.sign(event.deltaY) * 0.26
    wake()
  }

  const onBlur = () => {
    if (held.size || latched.size) releaseAll()
  }

  window.addEventListener("keydown", onKeyDown)
  window.addEventListener("keyup", onKeyUp)
  window.addEventListener("blur", onBlur)
  root.addEventListener("pointerdown", onPointerDown)
  root.addEventListener("pointermove", onPointerMove)
  root.addEventListener("wheel", onWheel, { passive: false })
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)

  /* ---------- lifecycle ---------- */

  const ro = new ResizeObserver(() => {
    if (!resize() || destroyed) return
    // Resizing cleared the canvas; draw the current frame now.
    render()
    wake()
  })
  ro.observe(stage)
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true
    wake()
  })
  io.observe(stage)
  const onVisibility = () => wake()
  document.addEventListener("visibilitychange", onVisibility)
  const onReduce = () => {
    reduced = mqReduce.matches
    wake()
  }
  mqReduce.addEventListener("change", onReduce)

  // Legends are printed from a canvas; print them again once fonts land.
  void document.fonts?.ready.then(() => {
    if (destroyed) return
    builtFor = ""
    build()
    wake()
  })

  const wave = () => {
    for (const cap of caps.values()) {
      const delay = 380 + cap.x * 36 + cap.y * 24
      later(() => {
        if (cap.target !== 0) return
        cap.target = -cap.travel * 0.8
        wake()
        later(paint, 110)
      }, delay)
    }
  }

  const intro = () => {
    stage.style.transition = "opacity 800ms ease-out"
    if (!opts.intro || reduced) {
      current.x = opts.x
      current.y = opts.y
      stage.style.opacity = "1"
      wake()
      return
    }
    introFrom = { x: opts.x, y: opts.y + 60 }
    Object.assign(current, introFrom)
    introStart = performance.now()
    stage.style.opacity = "0"
    requestAnimationFrame(() => {
      if (!destroyed) stage.style.opacity = "1"
    })
    wave()
    wake()
  }

  build()
  resize()
  intro()

  return {
    setOptions(next) {
      opts = resolve({ ...opts, ...next })
      if (!opts.interactive && (held.size || latched.size)) releaseAll()
      build()
      fit()
      paintHighlights()
      wake()
    },
    replay() {
      intro()
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      for (const id of timers) clearTimeout(id)
      timers.clear()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      mqReduce.removeEventListener("change", onReduce)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
      root.removeEventListener("pointerdown", onPointerDown)
      root.removeEventListener("pointermove", onPointerMove)
      root.removeEventListener("wheel", onWheel)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      thock.close()
      if (built) for (const item of built.disposables) item.dispose()
      for (const item of disposables) item.dispose()
      color.dispose()
      normal.depthTexture?.dispose()
      normal.dispose()
      renderer.dispose()
      // dispose() keeps the context until garbage collection, and browsers
      // cap live contexts; give it back now.
      renderer.forceContextLoss()
      el.remove()
    },
  }
}

const INK_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/**
 * Ink where depth jumps (silhouettes, caps over the plate) or the surface
 * turns sharply (case chamfers, cap edges). Four subpixel taps averaged,
 * so the lines come out antialiased.
 */
const INK_FRAGMENT = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform vec2 texel;
uniform vec3 ink;
uniform float depthRange;
varying vec2 vUv;

float edgeAt(vec2 uv) {
  float d0 = texture2D(tDepth, uv).r;
  vec3 n0 = texture2D(tNormal, uv).rgb * 2.0 - 1.0;
  float e = 0.0;
  vec2 dirs[4];
  dirs[0] = vec2(1.0, 0.0);
  dirs[1] = vec2(-1.0, 0.0);
  dirs[2] = vec2(0.0, 1.0);
  dirs[3] = vec2(0.0, -1.0);
  for (int i = 0; i < 4; i++) {
    vec2 q = uv + dirs[i] * texel * 0.85;
    float dd = abs(texture2D(tDepth, q).r - d0) * depthRange;
    vec3 n1 = texture2D(tNormal, q).rgb * 2.0 - 1.0;
    e = max(e, smoothstep(0.07, 0.14, dd));
    e = max(e, smoothstep(0.22, 0.4, 1.0 - dot(n0, n1)));
  }
  return e;
}

void main() {
  vec4 color = texture2D(tColor, vUv);
  vec2 s = texel * 0.25;
  float e = (
    edgeAt(vUv + vec2(-s.x, -s.y)) +
    edgeAt(vUv + vec2(s.x, -s.y)) +
    edgeAt(vUv + vec2(-s.x, s.y)) +
    edgeAt(vUv + vec2(s.x, s.y))
  ) * 0.25;
  gl_FragColor = mix(color, vec4(ink, 1.0), e);
  #include <colorspace_fragment>
}
`

/** Tailwind for the recorder, shared by the React and Svelte wrappers. */
export const CLASSES = {
  root: "relative size-full touch-manipulation overflow-hidden outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
  stage: "absolute inset-0 opacity-0",
  recorder:
    "pointer-events-none absolute inset-x-0 top-[6%] z-10 flex flex-col items-center gap-3 px-4",
  chips: "flex min-h-12 flex-wrap items-center justify-center gap-2",
  /**
   * An illustrated keycap: an ink outline around a darker skirt, with the
   * top face sitting on it. Held keys sink into the skirt.
   */
  chip: "group/chip relative inline-flex h-12 min-w-12 flex-col rounded-[9px] border-[1.5px] border-(--ink) bg-(--chip-side) pb-[6px] font-sans transition-[padding,translate,opacity,scale] duration-200 ease-[cubic-bezier(0.3,1.5,0.5,1)] starting:-translate-y-1.5 starting:scale-90 starting:opacity-0 data-live:translate-y-[3px] data-live:pb-[3px]",
  chipTop:
    "flex flex-1 items-center justify-center rounded-[7px] border-b-[1.5px] border-(--ink) bg-(--chip) px-3 text-sm leading-none font-semibold text-(--ink)",
  plus: "text-sm font-semibold text-muted-foreground",
  placeholder: "text-sm text-muted-foreground",
  status:
    "flex h-4 items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase",
  dot: "size-1.5 animate-pulse rounded-full bg-red-500",
  check: "size-3",
}
