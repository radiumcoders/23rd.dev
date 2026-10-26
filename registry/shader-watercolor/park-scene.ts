/**
 * A small top-down park drawn to a canvas every frame, for the Shader
 * Watercolor demo: a pond with a drifting rowboat, ducks and ripples,
 * walkers on the paths, a fountain, picnics. Flat shapes on purpose; the
 * shader does the painting. Docs only, not part of the registry item.
 */

type Point = { x: number; y: number }

type Route = {
  points: Point[]
  /** Cumulative length at each point. */
  lengths: number[]
  total: number
  loop: boolean
}

type Walker = {
  route: Route
  at: number
  speed: number
  dir: 1 | -1
  shirt: string
  hair: string
  /** Sideways offset from the path's center line. */
  lane: number
  dog: boolean
}

type Ripple = { x: number; y: number; born: number; size: number }

export type ParkScene = {
  canvas: HTMLCanvasElement
  width: number
  height: number
  /** Index of the walker within `radius` scene px of a point, or -1. */
  walkerAt: (x: number, y: number, radius: number) => number
  /** Where a walker is now, in scene px. */
  walkerPosition: (index: number) => Point
  destroy: () => void
}

const W = 1500
const H = 1000

const GRASS = "#82B858"
const GRASS_LIGHT = "#A2CC74"
const GRASS_DARK = "#5F9844"
const PATH = "#E8DABB"
const PATH_EDGE = "#CDBB94"
const DEEP = "#1F5F8E"
const WATER = "#2F7FB5"
const SHALLOW = "#5AB3CF"
const SHORE = "#93D3D0"
const CANOPY = "#3E6B3A"
const CANOPY_MID = "#4F8443"
const CANOPY_LIGHT = "#6FA453"
const WOOD = "#B5844E"
const WOOD_LIGHT = "#D9B27C"
const WOOD_DARK = "#8A6A4A"
const SHADOW = "rgba(28, 58, 30, 0.32)"

const SHIRTS = ["#F2C94C", "#E5776A", "#6A5FA8", "#F4F1EA", "#3F7FBF", "#E99AC0", "#2E4057", "#F08A4B"]
const HAIR = ["#3B2A20", "#6B4A2E", "#C9A15A", "#1E1B18", "#9A9A9A"]

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A smooth closed shape through points (Catmull-Rom as Béziers). */
function blob(points: Point[]) {
  const path = new Path2D()
  const n = points.length
  path.moveTo(points[0]!.x, points[0]!.y)
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]!
    const p1 = points[i]!
    const p2 = points[(i + 1) % n]!
    const p3 = points[(i + 2) % n]!
    path.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6,
      p2.x,
      p2.y
    )
  }
  path.closePath()
  return path
}

/** Sample an open Catmull-Rom curve into a walkable polyline. */
function route(control: Point[], loop = false): Route {
  const pts = loop ? [...control, control[0]!] : control
  const out: Point[] = []
  const get = (i: number) => {
    if (loop) return control[((i % control.length) + control.length) % control.length]!
    return pts[Math.max(0, Math.min(pts.length - 1, i))]!
  }
  const segments = pts.length - 1
  for (let i = 0; i < segments; i++) {
    const p0 = get(i - 1)
    const p1 = get(i)
    const p2 = get(i + 1)
    const p3 = get(i + 2)
    for (let s = 0; s < 24; s++) {
      const t = s / 24
      const t2 = t * t
      const t3 = t2 * t
      out.push({
        x:
          0.5 *
          (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      })
    }
  }
  out.push(get(segments))
  const lengths = [0]
  for (let i = 1; i < out.length; i++) {
    lengths.push(lengths[i - 1]! + Math.hypot(out[i]!.x - out[i - 1]!.x, out[i]!.y - out[i - 1]!.y))
  }
  return { points: out, lengths, total: lengths[lengths.length - 1]!, loop }
}

/** Position and heading at distance `d` along a route. */
function along(r: Route, d: number) {
  let lo = 0
  let hi = r.lengths.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (r.lengths[mid]! < d) lo = mid
    else hi = mid
  }
  const a = r.points[lo]!
  const b = r.points[hi]!
  const span = r.lengths[hi]! - r.lengths[lo]! || 1
  const t = (d - r.lengths[lo]!) / span
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  }
}

function strokeRoute(ctx: CanvasRenderingContext2D, r: Route, width: number, color: string) {
  ctx.beginPath()
  ctx.moveTo(r.points[0]!.x, r.points[0]!.y)
  for (const p of r.points) ctx.lineTo(p.x, p.y)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.stroke()
}

function layer() {
  const c = document.createElement("canvas")
  c.width = W
  c.height = H
  return [c, c.getContext("2d")!] as const
}

// Paths: a long one from the top to the right edge, one in from the left
// above the pond, one down to the bottom, a spur to the dock.
const PATH_NORTH = route([
  { x: 560, y: -40 },
  { x: 610, y: 120 },
  { x: 720, y: 300 },
  { x: 860, y: 420 },
])
const PATH_EAST = route([
  { x: 860, y: 420 },
  { x: 1060, y: 470 },
  { x: 1300, y: 430 },
  { x: 1560, y: 470 },
])
const PATH_WEST = route([
  { x: -40, y: 300 },
  { x: 200, y: 340 },
  { x: 480, y: 330 },
  { x: 700, y: 380 },
  { x: 860, y: 420 },
])
const PATH_SOUTH = route([
  { x: 860, y: 420 },
  { x: 900, y: 600 },
  { x: 860, y: 800 },
  { x: 930, y: 1040 },
])
const PATH_DOCK = route([
  { x: 885, y: 700 },
  { x: 790, y: 730 },
  { x: 690, y: 720 },
])
const PLAZA = { x: 860, y: 420, r: 78 }

const POND_POINTS: Point[] = [
  { x: 120, y: 560 },
  { x: 250, y: 480 },
  { x: 400, y: 520 },
  { x: 540, y: 470 },
  { x: 680, y: 540 },
  { x: 710, y: 680 },
  { x: 620, y: 780 },
  { x: 560, y: 900 },
  { x: 400, y: 930 },
  { x: 300, y: 850 },
  { x: 160, y: 860 },
  { x: 80, y: 720 },
]
const POND_CENTER = { x: 410, y: 690 }

function drawTree(
  ctx: CanvasRenderingContext2D,
  shadows: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rand: () => number
) {
  const puffs = 5 + Math.floor(rand() * 4)
  const parts: [number, number, number][] = []
  for (let i = 0; i < puffs; i++) {
    const a = rand() * Math.PI * 2
    const d = rand() * r * 0.55
    parts.push([x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.45 + rand() * 0.3)])
  }
  shadows.fillStyle = SHADOW
  for (const [px, py, pr] of parts) {
    shadows.beginPath()
    shadows.arc(px + r * 0.35, py + r * 0.42, pr, 0, Math.PI * 2)
    shadows.fill()
  }
  for (const [color, dx, dy, k] of [
    [CANOPY, 0, 0, 1],
    [CANOPY_MID, -0.12, -0.14, 0.78],
    [CANOPY_LIGHT, -0.24, -0.26, 0.45],
  ] as const) {
    ctx.fillStyle = color
    for (const [px, py, pr] of parts) {
      ctx.beginPath()
      ctx.arc(px + dx * pr, py + dy * pr, pr * k, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawBench(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = SHADOW
  ctx.fillRect(-20, -4, 44, 16)
  ctx.fillStyle = WOOD_DARK
  ctx.fillRect(-22, -8, 44, 14)
  ctx.fillStyle = WOOD
  ctx.fillRect(-22, -8, 44, 5)
  ctx.restore()
}

function drawBlanket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  a: string,
  b: string
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = SHADOW
  ctx.fillRect(-40, -26, 90, 64)
  const cell = 15
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = (i + j) % 2 ? a : b
      ctx.fillRect(-45 + i * cell, -30 + j * cell, cell, cell)
    }
  }
  // A basket and a sitter.
  ctx.fillStyle = WOOD
  ctx.fillRect(14, -22, 18, 13)
  ctx.fillStyle = "#3F7FBF"
  ctx.beginPath()
  ctx.ellipse(-20, 4, 11, 8, 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#3B2A20"
  ctx.beginPath()
  ctx.arc(-22, 2, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawUmbrella(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const r = 46
  ctx.fillStyle = SHADOW
  ctx.beginPath()
  ctx.arc(x + 16, y + 20, r, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? "#F7F1E1" : "#F2C94C"
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.arc(x, y, r, (i / 8) * Math.PI * 2 + 0.2, ((i + 1) / 8) * Math.PI * 2 + 0.2)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = "#E0A93A"
  ctx.beginPath()
  ctx.arc(x, y, 5, 0, Math.PI * 2)
  ctx.fill()
}

function drawFlowers(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  colors: string[],
  rand: () => number
) {
  ctx.fillStyle = GRASS_DARK
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 140; i++) {
    const a = rand() * Math.PI * 2
    const d = Math.sqrt(rand())
    ctx.fillStyle = colors[i % colors.length]!
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, 3 + rand() * 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Static ground: grass, paths, pond bed, shadows, props. */
function paintGround(pond: Path2D, rand: () => number) {
  const [canvas, ctx] = layer()
  const [canopyCanvas, canopy] = layer()

  ctx.fillStyle = GRASS
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 160; i++) {
    ctx.globalAlpha = 0.18 + rand() * 0.25
    ctx.fillStyle = rand() > 0.5 ? GRASS_LIGHT : GRASS_DARK
    ctx.beginPath()
    ctx.ellipse(rand() * W, rand() * H, 40 + rand() * 120, 30 + rand() * 80, rand() * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 0.35
  ctx.fillStyle = GRASS_DARK
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = rand() > 0.4 ? GRASS_DARK : GRASS_LIGHT
    ctx.save()
    ctx.translate(rand() * W, rand() * H)
    ctx.rotate(rand() * Math.PI)
    ctx.fillRect(0, 0, 2.5, 6 + rand() * 6)
    ctx.restore()
  }
  ctx.globalAlpha = 1

  // Paths: a darker edge under a lighter top.
  const paths: [Route, number][] = [
    [PATH_NORTH, 62],
    [PATH_EAST, 62],
    [PATH_WEST, 56],
    [PATH_SOUTH, 56],
    [PATH_DOCK, 34],
  ]
  for (const [r, w] of paths) strokeRoute(ctx, r, w + 8, PATH_EDGE)
  ctx.fillStyle = PATH_EDGE
  ctx.beginPath()
  ctx.arc(PLAZA.x, PLAZA.y, PLAZA.r + 4, 0, Math.PI * 2)
  ctx.fill()
  for (const [r, w] of paths) strokeRoute(ctx, r, w, PATH)
  ctx.fillStyle = PATH
  ctx.beginPath()
  ctx.arc(PLAZA.x, PLAZA.y, PLAZA.r, 0, Math.PI * 2)
  ctx.fill()

  // Fountain basin.
  ctx.fillStyle = "#BFB091"
  ctx.beginPath()
  ctx.arc(PLAZA.x, PLAZA.y, 34, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = SHALLOW
  ctx.beginPath()
  ctx.arc(PLAZA.x, PLAZA.y, 28, 0, Math.PI * 2)
  ctx.fill()

  // Pond: a muddy shore, then deep water to turquoise shallows.
  ctx.save()
  ctx.lineWidth = 22
  ctx.strokeStyle = "#6E9A48"
  ctx.stroke(pond)
  const water = ctx.createRadialGradient(
    POND_CENTER.x + 20,
    POND_CENTER.y - 10,
    20,
    POND_CENTER.x,
    POND_CENTER.y,
    330
  )
  water.addColorStop(0, DEEP)
  water.addColorStop(0.45, DEEP)
  water.addColorStop(0.72, WATER)
  water.addColorStop(0.9, SHALLOW)
  water.addColorStop(1, SHORE)
  ctx.fillStyle = water
  ctx.fill(pond)
  ctx.clip(pond)
  // Mottled depths and bright flecks on the surface.
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rand() > 0.5 ? "rgba(18, 70, 115, 0.3)" : "rgba(70, 150, 200, 0.22)"
    ctx.beginPath()
    ctx.ellipse(80 + rand() * 640, 470 + rand() * 460, 20 + rand() * 60, 14 + rand() * 40, rand() * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(235, 250, 255, ${0.15 + rand() * 0.35})`
    ctx.beginPath()
    ctx.arc(80 + rand() * 640, 470 + rand() * 460, 0.8 + rand() * 1.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.lineWidth = 46
  ctx.strokeStyle = "rgba(120, 205, 210, 0.6)"
  ctx.stroke(pond)
  // Lily pads in the shallows.
  for (const [x, y, r] of [
    [180, 620, 15],
    [205, 650, 11],
    [600, 610, 14],
    [625, 640, 10],
    [560, 850, 13],
    [200, 820, 12],
  ] as const) {
    ctx.fillStyle = "#5C9E46"
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.arc(x, y, r, 0.5, Math.PI * 2 - 0.1)
    ctx.closePath()
    ctx.fill()
    if (r > 12) {
      ctx.fillStyle = "#F2A7C3"
      ctx.beginPath()
      ctx.arc(x - 3, y - 2, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  // Dock at the end of the spur.
  ctx.save()
  ctx.translate(660, 722)
  ctx.rotate(-0.08)
  ctx.fillStyle = "rgba(15, 50, 80, 0.3)"
  ctx.fillRect(-70, -12, 92, 34)
  ctx.fillStyle = WOOD_LIGHT
  ctx.fillRect(-78, -18, 96, 32)
  ctx.strokeStyle = WOOD_DARK
  ctx.lineWidth = 2
  for (let i = -66; i < 18; i += 12) {
    ctx.beginPath()
    ctx.moveTo(i, -18)
    ctx.lineTo(i, 14)
    ctx.stroke()
  }
  ctx.restore()

  // Benches along the paths.
  for (const [r, d, side] of [
    [PATH_WEST, 260, 1],
    [PATH_WEST, 470, 1],
    [PATH_EAST, 300, -1],
    [PATH_EAST, 560, -1],
    [PATH_SOUTH, 260, 1],
    [PATH_NORTH, 200, -1],
  ] as const) {
    const p = along(r, d)
    const nx = -Math.sin(p.angle) * side
    const ny = Math.cos(p.angle) * side
    drawBench(ctx, p.x + nx * 40, p.y + ny * 40, p.angle)
  }

  drawBlanket(ctx, 1170, 250, -0.25, "#E48A8A", "#F7E3DC")
  drawBlanket(ctx, 1230, 760, 0.35, "#5F8FC9", "#F2EFE6")
  drawFlowers(ctx, 1010, 160, 70, 34, ["#6A5FA8", "#8E7CC3", "#F4F1EA"], rand)
  drawFlowers(ctx, 300, 160, 56, 30, ["#E58FB4", "#F2C94C", "#F4F1EA"], rand)

  // Trees: clusters in the corners and along the edges.
  const trees: [number, number, number][] = [
    [70, 80, 90],
    [200, 40, 70],
    [60, 230, 60],
    [1420, 90, 95],
    [1300, 40, 60],
    [1440, 260, 60],
    [1400, 900, 100],
    [1250, 960, 70],
    [1460, 700, 55],
    [60, 960, 80],
    [760, 940, 60],
    [1060, 640, 50],
    [420, 230, 46],
    [720, 140, 42],
  ]
  for (const [x, y, r] of trees) drawTree(canopy, ctx, x, y, r * 1.35, rand)
  drawUmbrella(canopy, 1110, 640)

  return { ground: canvas, canopy: canopyCanvas }
}

export function createParkScene({ still = false } = {}): ParkScene {
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d")!
  const rand = rng(23)
  const pond = blob(POND_POINTS)
  const { ground, canopy } = paintGround(pond, rand)

  const routes = [PATH_NORTH, PATH_EAST, PATH_WEST, PATH_SOUTH, PATH_DOCK]
  const walkers: Walker[] = Array.from({ length: 11 }, (_, i) => ({
    route: routes[i % 4]!,
    at: rand() * routes[i % 4]!.total,
    speed: 16 + rand() * 14,
    dir: rand() > 0.5 ? 1 : -1,
    shirt: SHIRTS[i % SHIRTS.length]!,
    hair: HAIR[Math.floor(rand() * HAIR.length)]!,
    lane: (rand() - 0.5) * 22,
    dog: i === 2 || i === 7,
  }))
  const ripples: Ripple[] = []
  let nextRipple = 0

  const ducks = Array.from({ length: 4 }, (_, i) => ({
    phase: i * 1.7 + rand(),
    rx: 90 + rand() * 120,
    ry: 60 + rand() * 80,
    speed: 0.05 + rand() * 0.05,
    dir: i % 2 ? 1 : -1,
    head: i === 0 ? "#2F6B3A" : "#F7F3EA",
  }))

  const walkerPos = (w: Walker) => {
    const p = along(w.route, w.at)
    const nx = -Math.sin(p.angle)
    const ny = Math.cos(p.angle)
    return { x: p.x + nx * w.lane, y: p.y + ny * w.lane, angle: p.angle + (w.dir < 0 ? Math.PI : 0) }
  }

  const drawPerson = (x: number, y: number, angle: number, shirt: string, hair: string, step: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1.35, 1.35)
    ctx.fillStyle = SHADOW
    ctx.beginPath()
    ctx.ellipse(5, 7, 11, 7, angle, 0, Math.PI * 2)
    ctx.fill()
    ctx.rotate(angle)
    // Feet, swinging.
    ctx.fillStyle = "#3A3A3A"
    ctx.beginPath()
    ctx.arc(step * 5, -4, 2.6, 0, Math.PI * 2)
    ctx.arc(-step * 5, 4, 2.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = shirt
    ctx.beginPath()
    ctx.ellipse(0, 0, 6, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = hair
    ctx.beginPath()
    ctx.arc(1, 0, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  const drawBoat = (t: number) => {
    const x = POND_CENTER.x + Math.cos(t * 0.045) * 110 + Math.sin(t * 0.021) * 30
    const y = POND_CENTER.y + Math.sin(t * 0.06) * 70
    const angle = t * 0.035 + Math.sin(t * 0.05) * 0.6
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    // Wake.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)"
    ctx.lineWidth = 2
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath()
      ctx.arc(-46 - i * 12, 0, 8 + i * 6, -0.9, 0.9)
      ctx.stroke()
    }
    ctx.fillStyle = "rgba(10, 40, 70, 0.3)"
    ctx.beginPath()
    ctx.ellipse(6, 8, 50, 18, 0, 0, Math.PI * 2)
    ctx.fill()
    const hull = new Path2D()
    hull.moveTo(-46, 0)
    hull.bezierCurveTo(-40, -22, 30, -22, 50, 0)
    hull.bezierCurveTo(30, 22, -40, 22, -46, 0)
    ctx.fillStyle = WOOD
    ctx.fill(hull)
    ctx.save()
    ctx.scale(0.8, 0.7)
    ctx.fillStyle = WOOD_LIGHT
    ctx.fill(hull)
    ctx.restore()
    ctx.fillStyle = WOOD_DARK
    ctx.fillRect(-22, -14, 6, 28)
    ctx.fillRect(16, -13, 6, 26)
    // Oars, in a slow stroke.
    const sweep = Math.sin(t * 0.9) * 0.35
    ctx.strokeStyle = WOOD_DARK
    ctx.lineWidth = 3
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(0, side * 14)
      ctx.rotate(side * (Math.PI / 2 - 0.35) + sweep * side)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, 46)
      ctx.stroke()
      ctx.fillStyle = WOOD
      ctx.fillRect(-4, 36, 8, 16)
      ctx.restore()
    }
    ctx.fillStyle = "#E5776A"
    ctx.beginPath()
    ctx.ellipse(0, 0, 7, 11, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#3B2A20"
    ctx.beginPath()
    ctx.arc(1, 0, 5.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  const drawDuck = (d: (typeof ducks)[number], t: number) => {
    const a = d.phase + t * d.speed * d.dir
    const x = POND_CENTER.x + Math.cos(a) * d.rx
    const y = POND_CENTER.y + Math.sin(a) * d.ry
    const angle = Math.atan2(Math.cos(a) * d.ry * d.dir, -Math.sin(a) * d.rx * d.dir)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-10, -5)
    ctx.lineTo(-34, -16)
    ctx.moveTo(-10, 5)
    ctx.lineTo(-34, 16)
    ctx.stroke()
    ctx.fillStyle = "#F7F3EA"
    ctx.beginPath()
    ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = d.head
    ctx.beginPath()
    ctx.arc(9, 0, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#F0A23B"
    ctx.fillRect(12, -1.5, 5, 3)
    ctx.restore()
  }

  const draw = (now: number, dt: number) => {
    const t = now / 1000
    ctx.drawImage(ground, 0, 0)

    // Pond life, clipped to the water.
    ctx.save()
    ctx.clip(pond)
    if (now >= nextRipple) {
      for (let tries = 0; tries < 10; tries++) {
        const x = 120 + rand() * 600
        const y = 480 + rand() * 420
        if (ctx.isPointInPath(pond, x, y)) {
          ripples.push({ x, y, born: now, size: 26 + rand() * 30 })
          break
        }
      }
      nextRipple = now + 900 + rand() * 1600
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]!
      const k = (now - r.born) / 3200
      if (k >= 1) {
        ripples.splice(i, 1)
        continue
      }
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * (1 - k)})`
      ctx.lineWidth = 2
      for (const ring of [1, 0.6]) {
        ctx.beginPath()
        ctx.ellipse(r.x, r.y, r.size * k * ring, r.size * k * ring * 0.7, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    // A sun glint sweeping slowly across the water.
    const sweep = ((t % 14) / 14) * 1.6 - 0.3
    const gx = 80 + sweep * 640
    const gy = 470 + sweep * 450
    ctx.save()
    ctx.translate(gx, gy)
    ctx.rotate(-0.6)
    ctx.scale(1.8, 0.7)
    const glint = ctx.createRadialGradient(0, 0, 0, 0, 0, 90)
    glint.addColorStop(0, "rgba(255, 255, 240, 0.34)")
    glint.addColorStop(1, "rgba(255, 255, 240, 0)")
    ctx.fillStyle = glint
    ctx.fillRect(-90, -90, 180, 180)
    ctx.restore()
    for (const d of ducks) drawDuck(d, t)
    drawBoat(t)
    ctx.restore()

    // Fountain: rings spreading in the basin.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"
    ctx.lineWidth = 1.5
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.6 + i / 3) % 1)
      ctx.beginPath()
      ctx.arc(PLAZA.x, PLAZA.y, 4 + k * 22, 0, Math.PI * 2)
      ctx.globalAlpha = 1 - k
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = "#F4FBFF"
    ctx.beginPath()
    ctx.arc(PLAZA.x, PLAZA.y, 4, 0, Math.PI * 2)
    ctx.fill()

    for (const w of walkers) {
      w.at += w.speed * w.dir * dt
      if (w.at > w.route.total) {
        w.at = w.route.total
        w.dir = -1
      } else if (w.at < 0) {
        w.at = 0
        w.dir = 1
      }
      const p = walkerPos(w)
      const step = Math.sin((w.at / 9) * Math.PI)
      if (w.dog) {
        const back = along(w.route, Math.max(0, Math.min(w.route.total, w.at - 26 * w.dir)))
        ctx.save()
        ctx.translate(back.x + 14, back.y + 4)
        ctx.rotate(p.angle)
        ctx.fillStyle = "#9A6B43"
        ctx.beginPath()
        ctx.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI * 2)
        ctx.ellipse(8, 0, 3.5, 3.5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      drawPerson(p.x, p.y, p.angle, w.shirt, w.hair, step)
    }

    ctx.drawImage(canopy, 0, 0)
  }

  let raf = 0
  let last = 0
  let alive = true
  const tick = (now: number) => {
    if (!alive) return
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
    last = now
    draw(now, dt)
    raf = requestAnimationFrame(tick)
  }
  if (still) draw(performance.now(), 0)
  else raf = requestAnimationFrame(tick)

  return {
    canvas,
    width: W,
    height: H,
    walkerAt(x, y, radius) {
      let best = -1
      let bestD = radius
      walkers.forEach((w, i) => {
        const p = walkerPos(w)
        const d = Math.hypot(p.x - x, p.y - y)
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      return best
    },
    walkerPosition(index) {
      const w = walkers[index]
      if (!w) return { x: 0, y: 0 }
      const p = walkerPos(w)
      return { x: p.x, y: p.y }
    },
    destroy() {
      alive = false
      cancelAnimationFrame(raf)
    },
  }
}
