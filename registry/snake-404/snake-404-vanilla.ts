export type Snake404Theme = "light" | "dark" | "auto"

export type Snake404Options = {
  /** Digits drawn as food. Default `"404"`. Anything but 0–9 is dropped. */
  code?: string
  /** Snake and food ink (hex). Default follows theme, or LCD ink. */
  color?: string
  /** Grid cell in CSS px. Default `12` */
  cellSize?: number
  /** Cells per second. Default `14` */
  speed?: number
  /** Longest the snake grows. Default `32` */
  maxLength?: number
  /** Faint unlit cells behind the field. Default `true` */
  grid?: boolean
  /** Paint a green Nokia LCD behind the field. Default `false` */
  lcd?: boolean
  /** Arrow keys, WASD, or swipes take over the snake. Default `true` */
  playable?: boolean
  /** Pellets eaten, top left. Default `true` */
  score?: boolean
  /** Glide between cells. Off steps cell by cell. Default `true` */
  smooth?: boolean
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class).
   */
  theme?: Snake404Theme
  /** After each pellet: how many are left, out of how many. */
  onEat?: (left: number, total: number) => void
  /** The last pellet is gone; the digits come back shortly after. */
  onClear?: () => void
  /** A player took over (`true`) or handed back to autopilot (`false`). */
  onPlayChange?: (playing: boolean) => void
}

/** 0 right, 1 down, 2 left, 3 up */
export type Snake404Direction = 0 | 1 | 2 | 3

export type Snake404Instance = {
  setOptions: (options: Partial<Snake404Options>) => void
  /** Steer as the player. Takes over from autopilot. */
  steer: (direction: Snake404Direction) => void
  destroy: () => void
}

/** Near-black ink on paper */
export const LIGHT_COLOR = "#18181B"
/** Near-white ink on slate */
export const DARK_COLOR = "#E4E4E7"
/** Nokia 3310 screen */
export const LCD_SCREEN = "#C7F0D8"
/** Nokia 3310 pixels */
export const LCD_INK = "#43523D"

const START_LENGTH = 4
const ENTER_DELAY_MS = 700
const REFILL_DELAY_MS = 900
const REFILL_MS = 700
const POP_MS = 240
const DEATH_MS = 1300
const BLINK_MS = 150
const BLINKS = 6
const MAX_QUEUE = 3
const SWIPE_PX = 24
/** Share of the digits already eaten when reduced motion holds the frame. */
const STILL_EATEN = 0.12

const DX = [1, 0, -1, 0] as const
const DY = [0, 1, 0, -1] as const

/** 6×7 bold digits, `#` is food. */
const DIGITS: Record<string, readonly string[]> = {
  "0": [".####.", "##..##", "##..##", "##..##", "##..##", "##..##", ".####."],
  "1": ["..##..", ".###..", "..##..", "..##..", "..##..", "..##..", ".####."],
  "2": [".####.", "##..##", "....##", "..###.", ".##...", "##....", "######"],
  "3": [".####.", "##..##", "....##", "..###.", "....##", "##..##", ".####."],
  "4": ["##..##", "##..##", "##..##", "######", "....##", "....##", "....##"],
  "5": ["######", "##....", "#####.", "....##", "....##", "##..##", ".####."],
  "6": [".####.", "##....", "#####.", "##..##", "##..##", "##..##", ".####."],
  "7": ["######", "....##", "...##.", "..##..", "..##..", "..##..", "..##.."],
  "8": [".####.", "##..##", "##..##", ".####.", "##..##", "##..##", ".####."],
  "9": [".####.", "##..##", "##..##", ".#####", "....##", "....##", ".####."],
}
const DIGIT_W = 6
const DIGIT_H = 7
const DIGIT_GAP = 2

/** 3×5 score digits, one row per string. */
const SCORE_DIGITS = [
  "111101101101111",
  "010110010010111",
  "111001111100111",
  "111001111001111",
  "101101111001001",
  "111100111001111",
  "111100111101111",
  "111001001001001",
  "111101111101111",
  "111101111001111",
] as const

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const

/** Resolves shadcn / next-themes dark mode (`attribute="class"` → `html.dark`). */
export function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false
  const root = document.documentElement
  if (root.classList.contains("dark")) return true
  if (root.classList.contains("light")) return false
  const dataTheme = root.getAttribute("data-theme")
  if (dataTheme === "dark") return true
  if (dataTheme === "light") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function resolveDark(theme: Snake404Theme): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

/** Digits of `code` that have a glyph, `"404"` when none do. */
export function codeDigits(code: string | undefined): string {
  const digits = (code ?? "").replace(/[^0-9]/g, "").slice(0, 6)
  return digits || "404"
}

function easeOutBack(t: number) {
  const c = 1.70158
  const u = t - 1
  return 1 + (c + 1) * u * u * u + c * u * u
}

const KEYS: Record<string, Snake404Direction> = {
  ArrowRight: 0,
  ArrowDown: 1,
  ArrowLeft: 2,
  ArrowUp: 3,
  d: 0,
  s: 1,
  a: 2,
  w: 3,
  D: 0,
  S: 1,
  A: 2,
  W: 3,
}

type Phase = "wait" | "run" | "dead"

export function createSnake404(
  wrap: HTMLElement,
  canvas: HTMLCanvasElement,
  initial: Snake404Options = {}
): Snake404Instance | null {
  let options: Snake404Options = {
    code: "404",
    cellSize: 12,
    speed: 14,
    maxLength: 32,
    grid: true,
    lcd: false,
    playable: true,
    score: true,
    smooth: true,
    theme: "auto",
    ...initial,
  }

  const ctx = canvas.getContext("2d", { alpha: true })
  if (!ctx) return null

  let reduce = false
  let dark = resolveDark(options.theme ?? "auto")
  let visible = true
  let running = true
  let raf = 0
  let lastNow = performance.now()

  let cssW = 0
  let cssH = 0
  let dpr = 1
  let cell = 12
  let cols = 0
  let rows = 0
  let ox = 0
  let oy = 0
  let builtKey = ""

  // Field
  let food = new Uint8Array(0)
  let born = new Float64Array(0)
  let glyph: number[] = []
  let remaining = 0
  let refillAt = 0

  // Snake, head first. Cells may sit off the grid while it slides in.
  let bx: number[] = []
  let by: number[] = []
  let fed: boolean[] = []
  let occ = new Uint8Array(0)
  let dir: Snake404Direction = 0
  let nextX = 0
  let nextY = 0
  let growing = false
  let phase: Phase = "wait"
  let enterAt = 0
  let deadAt = 0
  let acc = 0
  let score = 0

  let playing = false
  let queue: Snake404Direction[] = []

  // Search scratch, reused every step.
  let seen = new Uint32Array(0)
  let dist = new Int32Array(0)
  let bfs = new Int32Array(0)
  let stamp = 0

  // Unlit LCD cells, drawn once per layout and ink.
  const ghost = document.createElement("canvas")
  let ghostKey = ""

  const inkOf = () =>
    options.color ?? (options.lcd ? LCD_INK : dark ? DARK_COLOR : LIGHT_COLOR)

  const inGrid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < cols && y < rows

  const tailCell = () => {
    const i = bx.length - 1
    return inGrid(bx[i]!, by[i]!) ? by[i]! * cols + bx[i]! : -1
  }

  /** Free next step: empty, or the tail cell that moves out this step. */
  const passable = (x: number, y: number, freeTail: number) => {
    if (!inGrid(x, y)) return false
    const i = y * cols + x
    return occ[i] === 0 || (i === freeTail && occ[i] === 1)
  }

  const nextStamp = () => {
    stamp++
    if (stamp === 0xffffffff) {
      seen.fill(0)
      stamp = 1
    }
    return stamp
  }

  /** Cells reachable from `start`, stopping once it passes `cap`. */
  const flood = (start: number, freeTail: number, cap: number) => {
    const s = nextStamp()
    // The head moves to `start`, so the old head cell stays blocked.
    seen[start] = s
    bfs[0] = start
    let head = 0
    let tail = 1
    while (head < tail) {
      const c = bfs[head++]!
      const x = c % cols
      const y = (c / cols) | 0
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d]!
        const ny = y + DY[d]!
        if (!passable(nx, ny, freeTail)) continue
        const n = ny * cols + nx
        if (seen[n] === s) continue
        seen[n] = s
        bfs[tail++] = n
        if (tail > cap) return tail
      }
    }
    return tail
  }

  const visibleFood = (i: number, now: number) => food[i] === 1 && born[i]! <= now

  /** Autopilot: shortest way to the nearest pellet that will not trap it. */
  const autopilot = (freeTail: number, now: number): Snake404Direction => {
    const hx = bx[0]!
    const hy = by[0]!
    if (!inGrid(hx, hy)) return dir
    const head = hy * cols + hx
    const order = [dir, (dir + 3) % 4, (dir + 1) % 4] as Snake404Direction[]
    const len = bx.length

    // Nearest pellet by path length.
    let target = -1
    if (remaining > 0) {
      const s = nextStamp()
      seen[head] = s
      bfs[0] = head
      let qh = 0
      let qt = 1
      search: while (qh < qt) {
        const c = bfs[qh++]!
        const x = c % cols
        const y = (c / cols) | 0
        for (const d of order) {
          const nx = x + DX[d]!
          const ny = y + DY[d]!
          if (!passable(nx, ny, freeTail)) continue
          const n = ny * cols + nx
          if (seen[n] === s) continue
          seen[n] = s
          if (visibleFood(n, now)) {
            target = n
            break search
          }
          bfs[qt++] = n
        }
      }
    }

    let pick = -1
    if (target >= 0) {
      // Distances back from the pellet; step to the neighbor closest to it,
      // keeping straight on ties so paths turn once instead of zigzagging.
      const s = nextStamp()
      seen[target] = s
      dist[target] = 0
      bfs[0] = target
      let qh = 0
      let qt = 1
      while (qh < qt) {
        const c = bfs[qh++]!
        const x = c % cols
        const y = (c / cols) | 0
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d]!
          const ny = y + DY[d]!
          if (!passable(nx, ny, freeTail)) continue
          const n = ny * cols + nx
          if (seen[n] === s) continue
          seen[n] = s
          dist[n] = dist[c]! + 1
          bfs[qt++] = n
        }
      }
      let best = Infinity
      for (const d of order) {
        const nx = hx + DX[d]!
        const ny = hy + DY[d]!
        if (!passable(nx, ny, freeTail)) continue
        const n = ny * cols + nx
        if (seen[n] !== s) continue
        if (dist[n]! < best) {
          best = dist[n]!
          pick = d
        }
      }
      if (pick >= 0) {
        const n = (hy + DY[pick]!) * cols + hx + DX[pick]!
        if (flood(n, freeTail, len) < len) pick = -1
      }
    }
    if (pick >= 0) return pick as Snake404Direction

    // No safe pellet: wander, mostly straight, away from walls and itself.
    const cap = len * 2 + 8
    let bestArea = -1
    let bestDir = dir
    const ahead = (d: number) =>
      passable(hx + DX[d]! * 2, hy + DY[d]! * 2, freeTail) ? 1 : 0
    const wander =
      Math.random() < 0.08 ? [order[1]!, order[2]!, order[0]!] : order
    for (const d of wander) {
      const nx = hx + DX[d]!
      const ny = hy + DY[d]!
      if (!passable(nx, ny, freeTail)) continue
      const area = flood(ny * cols + nx, freeTail, cap) * 2 + ahead(d)
      if (area > bestArea) {
        bestArea = area
        bestDir = d
      }
    }
    return bestDir
  }

  const die = (now: number) => {
    phase = "dead"
    deadAt = now
    queue = []
    if (playing) {
      playing = false
      options.onPlayChange?.(false)
    }
  }

  /** Decide the move for the step now starting. */
  const plan = (now: number) => {
    const last = bx.length - 1
    growing = fed[last]! && bx.length < Math.max(START_LENGTH, options.maxLength ?? 32)
    const freeTail = growing ? -1 : tailCell()
    let d = dir
    if (playing) {
      if (queue.length) d = queue.shift()!
    } else {
      d = autopilot(freeTail, now)
    }
    const nx = bx[0]! + DX[d]!
    const ny = by[0]! + DY[d]!
    if (!passable(nx, ny, freeTail)) {
      die(now)
      return
    }
    dir = d
    nextX = nx
    nextY = ny
  }

  /** Finish the step: the tail follows, the head lands and maybe eats. */
  const commit = (now: number) => {
    const last = bx.length - 1
    if (growing) {
      // The bulge reached the tail; the tail holds and the snake is longer.
      fed[last] = false
    } else {
      if (inGrid(bx[last]!, by[last]!)) {
        const t = by[last]! * cols + bx[last]!
        occ[t] = occ[t]! - 1
      }
      bx.pop()
      by.pop()
      fed.pop()
    }
    bx.unshift(nextX)
    by.unshift(nextY)
    const i = nextY * cols + nextX
    occ[i] = occ[i]! + 1
    const ate = food[i] === 1
    fed.unshift(ate)
    if (ate) {
      food[i] = 0
      remaining--
      score++
      options.onEat?.(remaining, glyph.length)
      if (remaining === 0) {
        refillAt = now + REFILL_DELAY_MS
        options.onClear?.()
      }
    }
  }

  const spawn = (now: number, forward = true) => {
    const row = Math.floor(rows / 2)
    // Slide in from the left edge; reduced motion parks it on screen.
    const onScreen = reduce
    bx = []
    by = []
    fed = []
    occ.fill(0)
    for (let k = 0; k < START_LENGTH; k++) {
      const x = onScreen ? START_LENGTH - k : -1 - k
      bx.push(x)
      by.push(row)
      fed.push(false)
      if (inGrid(x, row)) occ[row * cols + x] = 1
    }
    dir = 0
    nextX = bx[0]! + 1
    nextY = row
    growing = false
    acc = 0
    score = 0
    queue = []
    phase = onScreen ? "run" : "wait"
    enterAt = now + ENTER_DELAY_MS
    if (onScreen && forward) fastForward(now)
  }

  /**
   * Reduced motion holds one frame, so make it a meal in progress: run the
   * autopilot until part of the code is eaten and food is right ahead.
   */
  const fastForward = (now: number) => {
    const goal = Math.ceil(glyph.length * STILL_EATEN)
    let steps = cols * rows * 2
    let extra = 24
    while (phase === "run" && steps-- > 0) {
      if (glyph.length - remaining >= goal) {
        const ahead = inGrid(nextX, nextY) && visibleFood(nextY * cols + nextX, now)
        if (ahead || extra-- <= 0) break
      }
      commit(now)
      plan(now)
    }
    // A wrong turn ends the run; park it at the edge instead.
    if (phase === "dead") spawn(now, false)
  }

  const refill = (now: number) => {
    const span = Math.max(1, cols + rows)
    for (const i of glyph) {
      if (food[i] === 1) continue
      const x = i % cols
      const y = (i / cols) | 0
      food[i] = 1
      born[i] =
        now + ((x + y) / span) * REFILL_MS * 2 + (BAYER4[(y & 3) * 4 + (x & 3)]! / 16) * 140
      remaining++
    }
  }

  const layout = (now: number) => {
    cell = Math.max(4, Math.round(options.cellSize ?? 12))
    cols = Math.max(1, Math.floor(cssW / cell))
    rows = Math.max(1, Math.floor(cssH / cell))
    ox = Math.floor((cssW - cols * cell) / 2)
    oy = Math.floor((cssH - rows * cell) / 2)
    const n = cols * rows
    food = new Uint8Array(n)
    born = new Float64Array(n)
    occ = new Uint8Array(n)
    seen = new Uint32Array(n)
    dist = new Int32Array(n)
    bfs = new Int32Array(n + 4)
    stamp = 0
    glyph = []
    remaining = 0
    refillAt = 0

    const digits = codeDigits(options.code)
    const bw = digits.length * DIGIT_W + (digits.length - 1) * DIGIT_GAP
    const k = Math.max(
      1,
      Math.floor(Math.min((cols * 0.74) / bw, (rows * 0.5) / DIGIT_H))
    )
    const gx0 = Math.floor((cols - bw * k) / 2)
    const gy0 = Math.floor((rows - DIGIT_H * k) / 2)
    for (let di = 0; di < digits.length; di++) {
      const bitmap = DIGITS[digits[di]!]!
      const left = gx0 + di * (DIGIT_W + DIGIT_GAP) * k
      for (let r = 0; r < DIGIT_H; r++) {
        for (let c = 0; c < DIGIT_W; c++) {
          if (bitmap[r]![c] !== "#") continue
          for (let sy = 0; sy < k; sy++) {
            for (let sx = 0; sx < k; sx++) {
              const x = left + c * k + sx
              const y = gy0 + r * k + sy
              if (!inGrid(x, y)) continue
              const i = y * cols + x
              food[i] = 1
              glyph.push(i)
              remaining++
            }
          }
        }
      }
    }
    if (playing) {
      playing = false
      options.onPlayChange?.(false)
    }
    spawn(now)
  }

  /** Returns whether the backing store changed (which clears the canvas). */
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = wrap.clientWidth
    const h = wrap.clientHeight
    if (w <= 0 || h <= 0) return false
    cssW = w
    cssH = h
    const width = Math.max(1, Math.floor(w * dpr))
    const height = Math.max(1, Math.floor(h * dpr))
    const changed = width !== canvas.width || height !== canvas.height
    if (changed) {
      canvas.width = width
      canvas.height = height
    }
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const c = Math.max(4, Math.round(options.cellSize ?? 12))
    const key = `${Math.floor(w / c)}x${Math.floor(h / c)}:${c}:${codeDigits(options.code)}`
    if (key !== builtKey) {
      builtKey = key
      layout(performance.now())
    }
    return changed
  }

  const drawGhost = (ink: string) => {
    const key = `${canvas.width}x${canvas.height}:${cols}x${rows}:${cell}:${ink}:${options.lcd}:${dark}`
    if (key === ghostKey) return
    ghostKey = key
    ghost.width = canvas.width
    ghost.height = canvas.height
    const g = ghost.getContext("2d")
    if (!g) return
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, cssW, cssH)
    g.fillStyle = ink
    g.globalAlpha = options.lcd ? 0.07 : dark ? 0.05 : 0.035
    const inset = Math.max(1, Math.round(cell * 0.16))
    const size = cell - inset * 2
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        g.fillRect(ox + x * cell + inset, oy + y * cell + inset, size, size)
      }
    }
  }

  const draw = (now: number, p: number) => {
    const ink = inkOf()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    if (options.lcd) {
      ctx.fillStyle = LCD_SCREEN
      ctx.fillRect(0, 0, cssW, cssH)
    }
    if (options.grid) {
      drawGhost(ink)
      ctx.drawImage(ghost, 0, 0, cssW, cssH)
    }

    ctx.fillStyle = ink

    // Food: one pellet per lit cell, popping in after a refill.
    const inset = Math.max(1, Math.round(cell * 0.16))
    const pellet = cell - inset * 2
    for (const i of glyph) {
      if (food[i] !== 1) continue
      const t = (now - born[i]!) / POP_MS
      if (t < 0) continue
      const x = ox + (i % cols) * cell
      const y = oy + ((i / cols) | 0) * cell
      if (t >= 1) {
        ctx.fillRect(x + inset, y + inset, pellet, pellet)
      } else {
        const s = pellet * easeOutBack(t)
        const o = (cell - s) / 2
        ctx.fillRect(x + o, y + o, s, s)
      }
    }

    // Snake.
    const dead = phase === "dead"
    const blink = Math.floor((now - deadAt) / BLINK_MS)
    const shown = !dead || (blink < BLINKS && blink % 2 === 1)
    if (shown && bx.length > 0) {
      // Body as thick as a pellet; a meal swells it to nearly a full cell.
      const th = pellet
      const half = th / 2
      const cx = (x: number) => ox + (x + 0.5) * cell
      const cy = (y: number) => oy + (y + 0.5) * cell
      const moving = phase === "run"
      const t = moving ? p : 0
      const last = bx.length - 1

      const hx = cx(bx[0]! + (moving ? (nextX - bx[0]!) * t : 0))
      const hy = cy(by[0]! + (moving ? (nextY - by[0]!) * t : 0))
      const tailT = moving && !growing ? t : 0
      const tx = cx(bx[last]! + (bx[Math.max(0, last - 1)]! - bx[last]!) * tailT)
      const ty = cy(by[last]! + (by[Math.max(0, last - 1)]! - by[last]!) * tailT)

      const band = (ax: number, ay: number, bx2: number, by2: number) => {
        ctx.fillRect(
          Math.min(ax, bx2) - half,
          Math.min(ay, by2) - half,
          Math.abs(ax - bx2) + th,
          Math.abs(ay - by2) + th
        )
      }

      let px = hx
      let py = hy
      for (let k = 0; k < last; k++) {
        const qx = cx(bx[k]!)
        const qy = cy(by[k]!)
        band(px, py, qx, qy)
        px = qx
        py = qy
      }
      band(px, py, tx, ty)

      // Swallowed pellets: a bulge that stays put while the body slides by.
      const swell = cell - Math.max(1, Math.round(cell * 0.06)) * 2
      for (let k = 1; k <= last; k++) {
        if (!fed[k] || (k === last && !growing)) continue
        ctx.fillRect(cx(bx[k]!) - swell / 2, cy(by[k]!) - swell / 2, swell, swell)
      }

      // Eye, and a mouth that opens when food is next.
      const fx = DX[dir]!
      const fy = DY[dir]!
      const lx = fy
      const ly = -fx
      const cut = (x: number, y: number, w: number, h: number) => {
        if (options.lcd) {
          ctx.fillStyle = LCD_SCREEN
          ctx.fillRect(x, y, w, h)
          ctx.fillStyle = ink
          return
        }
        ctx.globalCompositeOperation = "destination-out"
        ctx.fillRect(x, y, w, h)
        ctx.globalCompositeOperation = "source-over"
      }
      // The head is a full swell, so the eye and mouth have room.
      ctx.fillRect(hx - swell / 2, hy - swell / 2, swell, swell)
      const eye = Math.max(2, Math.round(cell * 0.2))
      const ex = hx - fx * swell * 0.06 + lx * swell * 0.22
      const ey = hy - fy * swell * 0.06 + ly * swell * 0.22
      cut(ex - eye / 2, ey - eye / 2, eye, eye)
      if (moving && inGrid(nextX, nextY) && visibleFood(nextY * cols + nextX, now)) {
        const w = Math.max(2, Math.round(swell * 0.36))
        const depth = Math.max(1, Math.round(swell * 0.3))
        const mx = hx + fx * (swell / 2 - depth / 2)
        const my = hy + fy * (swell / 2 - depth / 2)
        const mw = fx !== 0 ? depth : w
        const mh = fx !== 0 ? w : depth
        cut(mx - mw / 2, my - mh / 2, mw, mh)
      }
    }

    if (options.score) {
      const dot = Math.max(2, Math.round(cell / 3))
      const digits = String(score).padStart(4, "0")
      const x0 = ox + cell * 2
      const y0 = oy + cell * 2
      ctx.globalAlpha = 0.6
      for (let d = 0; d < digits.length; d++) {
        const bits = SCORE_DIGITS[digits.charCodeAt(d) - 48]!
        for (let b = 0; b < 15; b++) {
          if (bits[b] !== "1") continue
          ctx.fillRect(
            x0 + d * dot * 4 + (b % 3) * dot,
            y0 + Math.floor(b / 3) * dot,
            dot,
            dot
          )
        }
      }
      ctx.globalAlpha = 1
    }
  }

  const tick = (now: number) => {
    if (!running) return
    const dt = Math.min(100, now - lastNow)
    lastNow = now

    if (refillAt && now >= refillAt) {
      refillAt = 0
      refill(now)
    }
    if (phase === "wait" && now >= enterAt && !reduce) phase = "run"
    if (phase === "dead" && now - deadAt >= DEATH_MS) spawn(now)

    const stepMs = 1000 / Math.max(1, options.speed ?? 14)
    if (phase === "run" && (!reduce || playing)) {
      acc += dt
      while (acc >= stepMs && phase === "run") {
        acc -= stepMs
        commit(now)
        plan(now)
      }
    }
    const p = options.smooth ? Math.min(1, acc / stepMs) : 0
    draw(now, p)

    if (visible) raf = requestAnimationFrame(tick)
  }

  const start = () => {
    cancelAnimationFrame(raf)
    lastNow = performance.now()
    raf = requestAnimationFrame(tick)
  }

  const steer = (d: Snake404Direction) => {
    if (!options.playable || phase === "dead") return
    if (!playing) {
      playing = true
      queue = []
      options.onPlayChange?.(true)
    }
    if (phase === "wait") phase = "run"
    const last = queue.length ? queue[queue.length - 1]! : dir
    if (d === last || d === (last + 2) % 4) return
    if (queue.length < MAX_QUEUE) queue.push(d)
  }

  const handBack = () => {
    if (!playing) return
    playing = false
    queue = []
    options.onPlayChange?.(false)
  }

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  reduce = mqReduce.matches
  const onReduce = () => {
    const was = reduce
    reduce = mqReduce.matches
    if (reduce !== was && !playing) spawn(performance.now())
  }
  mqReduce.addEventListener("change", onReduce)

  resize()
  draw(performance.now(), 0)

  const ro = new ResizeObserver(() => {
    const changed = resize()
    if (changed && running) draw(performance.now(), 0)
  })
  ro.observe(wrap)

  const io = new IntersectionObserver(([entry]) => {
    const was = visible
    visible = entry?.isIntersecting ?? true
    if (visible && !was) start()
  })
  io.observe(wrap)

  const syncTheme = () => {
    dark = resolveDark(options.theme ?? "auto")
  }
  const mo = new MutationObserver(syncTheme)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  })
  const mqDark = window.matchMedia("(prefers-color-scheme: dark)")
  mqDark.addEventListener("change", syncTheme)

  const onKey = (e: KeyboardEvent) => {
    if (!options.playable || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === "Escape") {
      if (playing) {
        e.preventDefault()
        handBack()
      }
      return
    }
    const d = KEYS[e.key]
    if (d === undefined) return
    e.preventDefault()
    steer(d)
  }

  let swipe: { id: number; x: number; y: number } | null = null
  const onDown = (e: PointerEvent) => {
    if (!options.playable) return
    swipe = { id: e.pointerId, x: e.clientX, y: e.clientY }
  }
  const onUp = (e: PointerEvent) => {
    if (!swipe || swipe.id !== e.pointerId) return
    const dx = e.clientX - swipe.x
    const dy = e.clientY - swipe.y
    swipe = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return
    if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 0 : 2)
    else steer(dy > 0 ? 1 : 3)
  }
  const onCancel = () => {
    swipe = null
  }

  wrap.addEventListener("keydown", onKey)
  wrap.addEventListener("focusout", handBack)
  wrap.addEventListener("pointerdown", onDown)
  wrap.addEventListener("pointerup", onUp)
  wrap.addEventListener("pointercancel", onCancel)

  start()

  return {
    setOptions(next) {
      const prev = options
      options = { ...options, ...next }
      if (
        options.cellSize !== prev.cellSize ||
        codeDigits(options.code) !== codeDigits(prev.code)
      ) {
        builtKey = ""
        resize()
      }
      if (options.theme !== prev.theme) syncTheme()
      if (!options.playable) handBack()
      if (!visible) draw(performance.now(), 0)
    },
    steer,
    destroy() {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      mqReduce.removeEventListener("change", onReduce)
      mqDark.removeEventListener("change", syncTheme)
      wrap.removeEventListener("keydown", onKey)
      wrap.removeEventListener("focusout", handBack)
      wrap.removeEventListener("pointerdown", onDown)
      wrap.removeEventListener("pointerup", onUp)
      wrap.removeEventListener("pointercancel", onCancel)
    },
  }
}
