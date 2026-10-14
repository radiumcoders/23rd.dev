export type AsciiLogoPhase = "logo" | "scattered" | "fallen" | "returning"

export type AsciiLogoTheme = "light" | "dark" | "auto"

/** Wordmark `text` is capped at this many characters. */
export const MAX_TEXT_LETTERS = 5

/** Keep at most `maxLetters` characters; extra input is dropped. */
export function clampAsciiLogoText(
  text: string,
  maxLetters = MAX_TEXT_LETTERS
): string {
  return [...text].slice(0, maxLetters).join("")
}

export type AsciiLogoOptions = {
  /**
   * Wordmark sampled into the ASCII grid. Ignored when `src` is set.
   * Capped at `MAX_TEXT_LETTERS` (5). Default `"23rd"`
   */
  text?: string
  /** Image URL to sample instead of `text` (any raster or same-origin SVG). */
  src?: string
  /**
   * How much of the stage the source covers (0–1). Default `0.82`
   */
  fit?: number
  /** Glyph cell size in CSS pixels. Default `11` */
  cellSize?: number
  /** Gap between cells in CSS pixels. Default `2` */
  cellGap?: number
  /** Pool of glyphs for cells inside the shape. One is picked per cell. */
  charset?: string
  /**
   * Pool of light glyphs for cells on the edge of the shape, where the
   * source only partly covers the cell. Default `EDGE_CHARSET`
   */
  edgeCharset?: string
  /**
   * Coverage (0–1) a cell must reach to become a glyph.
   * Default `0.2`
   */
  threshold?: number
  /**
   * Treat dark pixels as solid. Default `true` when `src` is set,
   * `false` for text (white ink on a black sampler).
   */
  invert?: boolean
  /** Glyph color. Default follows theme. */
  color?: string
  /**
   * Stage fill. Default `"transparent"`: the parent paints the background,
   * so the logo sits on any surface in both themes.
   */
  backgroundColor?: string
  /**
   * Glyph font family. Default: the root element's computed font, so a
   * `font-mono` class on it is enough; falls back to the system mono stack.
   */
  font?: string
  /** Glyphs fly in from off stage when the logo (re)builds. Default `true` */
  assemble?: boolean
  /** Cursor repulsion radius in grid cells. Default `7` */
  hoverRadius?: number
  /** How far glyphs shove away from the cursor. Default `2.6` */
  hoverPush?: number
  /** Hover ease (0–1). Default `0.18` */
  hoverEase?: number
  /** Max scatter offset in grid cells. Default `16` */
  scatterRange?: number
  /** Scatter ease (0–1). Default `0.055` */
  scatterEase?: number
  /** Fall acceleration in cells / frame @ 60fps. Default `0.14` */
  gravity?: number
  /** Bounce restitution (0–1). Default `0.28` */
  bounce?: number
  /** Reassemble ease (0–1). Default `0.08` */
  resetEase?: number
  /** Max frames a glyph waits before moving. Default `18` */
  staggerFrames?: number
  /** Pointer hover + click cycle. Default `true` */
  interactive?: boolean
  /**
   * Palette mode. `auto` (the default) reads `html.dark` / `html.light`,
   * then `data-theme`, then `prefers-color-scheme`, and keeps up with
   * changes.
   */
  theme?: AsciiLogoTheme
  /** Fires after each phase change (including the auto-return to `logo`). */
  onPhaseChange?: (phase: AsciiLogoPhase) => void
}

export type AsciiLogoInstance = {
  setOptions: (options: Partial<AsciiLogoOptions>) => void
  destroy: () => void
}

type AsciiCell = {
  col: number
  row: number
  char: string
  /** How much of the cell the source covers (0–1); drives ink weight. */
  weight: number
  offsetX: number
  offsetY: number
  scatterX: number
  scatterY: number
  fallSpeed: number
  /** Row offset where the glyph lands in the `fallen` phase. */
  landing: number
  /** Radians; glyphs tumble while they fall and settle flat again. */
  spin: number
  spinSpeed: number
  /** Brief brightening after a glyph swap under the cursor (0–1). */
  flash: number
  wait: number
}

export const DEFAULT_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*"

/** Light marks for the rim of the shape. */
export const EDGE_CHARSET = ".:;-=+*~'`,"

/** Stock ink per theme; a set `color` replaces it. */
export const LIGHT_INK = "#2b2c2f"
export const DARK_INK = "#cfcfca"

/** Sampler pixels per cell edge; coverage averages a 4x4 block. */
const SUPERSAMPLE = 4
/** Below this coverage a cell takes a light edge glyph. */
const EDGE_WEIGHT = 0.5

const TEXT_FONT =
  '900 1px "Arial Black", Impact, Arial, ui-sans-serif, system-ui, sans-serif'
const MONO_FALLBACK =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

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

export function resolveDark(theme: AsciiLogoTheme = "auto"): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

/**
 * Calls `onChange` whenever the page theme may have changed (the `html`
 * class, `data-theme` or `style`, or the system preference). Returns the
 * unsubscribe.
 */
export function watchTheme(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => {}
  const mo = new MutationObserver(onChange)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  })
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", onChange)
  return () => {
    mo.disconnect()
    mq.removeEventListener("change", onChange)
  }
}

function pickChar(pool: string, fallback: string) {
  const chars = pool.length > 0 ? pool : fallback
  return chars[Math.floor(Math.random() * chars.length)] ?? "#"
}

function charFor(weight: number, charset: string, edgeCharset: string) {
  if (weight < EDGE_WEIGHT) return pickChar(edgeCharset, EDGE_CHARSET)
  return pickChar(charset, DEFAULT_CHARSET)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = "async"
    if (/^https?:/i.test(src) && !src.startsWith(window.location.origin)) {
      img.crossOrigin = "anonymous"
    }
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("AsciiLogo: failed to load image"))
    img.src = src
  })
}

function easeToward(
  cell: AsciiCell,
  targetX: number,
  targetY: number,
  ease: number
) {
  cell.offsetX += (targetX - cell.offsetX) * ease
  cell.offsetY += (targetY - cell.offsetY) * ease
}

function frameEase(ease: number, frames: number) {
  const e = Math.min(1, Math.max(0, ease))
  if (frames <= 0) return e
  return 1 - Math.pow(1 - e, frames)
}

function staggerCells(cells: AsciiCell[], staggerFrames: number) {
  const max = Math.max(0, staggerFrames)
  for (const cell of cells) {
    cell.wait = Math.random() * max
  }
}

/** Glyphs start off stage, spread around the frame, and ease home. */
function flingOffStage(cells: AsciiCell[], cols: number, rows: number) {
  for (const cell of cells) {
    const side = Math.random()
    if (side < 0.5) {
      // Above or below the frame, anywhere across.
      cell.offsetX = (Math.random() * 2 - 1) * cols * 0.6
      cell.offsetY =
        side < 0.25
          ? -(cell.row + Math.random() * rows)
          : rows + Math.random() * rows * 0.5
    } else {
      // Left or right of the frame.
      cell.offsetX =
        side < 0.75
          ? -(cell.col + Math.random() * cols)
          : cols + Math.random() * cols * 0.5
      cell.offsetY = (Math.random() * 2 - 1) * rows * 0.6
    }
    cell.spin = (Math.random() * 2 - 1) * Math.PI
    cell.spinSpeed = 0
    cell.fallSpeed = 0
  }
}

/**
 * Interactive ASCII wordmark: glyphs assemble on load, shove away from the
 * cursor, then click-cycle through scatter, gravity drop, and reassemble.
 * Transparent, so it sits on any surface in light and dark. Zero deps.
 */
export function createAsciiLogo(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  initial: AsciiLogoOptions = {}
): AsciiLogoInstance | null {
  let options: Required<
    Pick<
      AsciiLogoOptions,
      | "text"
      | "fit"
      | "cellSize"
      | "cellGap"
      | "charset"
      | "edgeCharset"
      | "threshold"
      | "assemble"
      | "hoverRadius"
      | "hoverPush"
      | "hoverEase"
      | "scatterRange"
      | "scatterEase"
      | "gravity"
      | "bounce"
      | "resetEase"
      | "staggerFrames"
      | "interactive"
      | "theme"
    >
  > &
    AsciiLogoOptions = {
    text: "23rd",
    fit: 0.82,
    cellSize: 11,
    cellGap: 2,
    charset: DEFAULT_CHARSET,
    edgeCharset: EDGE_CHARSET,
    threshold: 0.2,
    assemble: true,
    hoverRadius: 7,
    hoverPush: 2.6,
    hoverEase: 0.18,
    scatterRange: 16,
    scatterEase: 0.055,
    gravity: 0.14,
    bounce: 0.28,
    resetEase: 0.08,
    staggerFrames: 18,
    interactive: true,
    theme: "auto",
    ...initial,
  }
  options.text = clampAsciiLogoText(options.text)

  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  let raf = 0
  let running = true
  let last = performance.now()
  let gridCols = 0
  let gridRows = 0
  let cells: AsciiCell[] = []
  let phase: AsciiLogoPhase = "logo"
  let lastKey = ""
  // The assemble flight plays when the source changes, not on a resize.
  let lastSource: string | null = null
  let lastW = -1
  let lastH = -1
  let lastDpr = -1
  let loadId = 0
  let reduce = false
  let dark = resolveDark(options.theme)
  let fontFamily = ""
  const cursor = { x: -999, y: -999 }

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const onReduce = () => {
    reduce = mqReduce.matches
  }
  onReduce()
  mqReduce.addEventListener("change", onReduce)

  const syncTheme = () => {
    dark = resolveDark(options.theme)
  }
  const unwatchTheme = watchTheme(syncTheme)

  const readFont = () => {
    if (options.font) {
      fontFamily = options.font
      return
    }
    const computed = getComputedStyle(root).fontFamily
    fontFamily = computed && computed !== "" ? computed : MONO_FALLBACK
  }

  const setPhase = (next: AsciiLogoPhase) => {
    if (phase === next) return
    phase = next
    options.onPhaseChange?.(next)
  }

  const sizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = root.clientWidth
    const h = root.clientHeight
    if (w <= 0 || h <= 0) return { w: 0, h: 0 }
    if (w === lastW && h === lastH && dpr === lastDpr) return { w, h }
    lastW = w
    lastH = h
    lastDpr = dpr
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(h * dpr))
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { w, h }
  }

  /** Paints the source onto a sampler `SUPERSAMPLE` times finer than the grid. */
  const sampleSource = (
    sampler: CanvasRenderingContext2D,
    sw: number,
    sh: number,
    image: HTMLImageElement | null,
    p: typeof options
  ) => {
    sampler.fillStyle = "#000"
    sampler.fillRect(0, 0, sw, sh)

    const cover = Math.min(1, Math.max(0.2, p.fit))
    if (image && image.width > 0 && image.height > 0) {
      const maxW = sw * cover
      const maxH = sh * cover
      const scale = Math.min(maxW / image.width, maxH / image.height)
      const dw = image.width * scale
      const dh = image.height * scale
      sampler.drawImage(image, (sw - dw) / 2, (sh - dh) / 2, dw, dh)
      return
    }

    const word = p.text.trim()
    if (!word) return
    sampler.fillStyle = "#fff"
    sampler.textAlign = "center"
    sampler.textBaseline = "middle"
    let fontSize = sh * 0.52
    sampler.font = TEXT_FONT.replace("1px", `${fontSize}px`)
    const width = sampler.measureText(word).width
    const maxW = sw * cover
    if (width > maxW && width > 0) {
      fontSize *= maxW / width
      sampler.font = TEXT_FONT.replace("1px", `${fontSize}px`)
    }
    const x = sw / 2
    const y = sh / 2 + fontSize * 0.04
    sampler.fillText(word, x, y)
    // Fatten the strokes by about a cell so thin counters still read.
    sampler.strokeStyle = "#fff"
    sampler.lineJoin = "round"
    sampler.lineWidth = SUPERSAMPLE * 0.9
    sampler.strokeText(word, x, y)
  }

  /** Averages each cell's block of sampler pixels into a coverage weight. */
  const buildFromImageData = (
    data: ImageData,
    cols: number,
    rows: number,
    p: typeof options
  ) => {
    const shouldInvert = p.invert ?? Boolean(p.src)
    const pixels = data.data
    const sw = cols * SUPERSAMPLE
    const next: AsciiCell[] = []
    const block = SUPERSAMPLE * SUPERSAMPLE

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let sum = 0
        for (let sy = 0; sy < SUPERSAMPLE; sy++) {
          const y = row * SUPERSAMPLE + sy
          for (let sx = 0; sx < SUPERSAMPLE; sx++) {
            const x = col * SUPERSAMPLE + sx
            const i = (y * sw + x) * 4
            const r = pixels[i] ?? 0
            const g = pixels[i + 1] ?? 0
            const b = pixels[i + 2] ?? 0
            const a = (pixels[i + 3] ?? 0) / 255
            const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255
            sum += (shouldInvert ? 1 - luma : luma) * a
          }
        }
        const weight = sum / block
        if (weight < p.threshold) continue
        next.push({
          col,
          row,
          char: charFor(weight, p.charset, p.edgeCharset),
          weight,
          offsetX: 0,
          offsetY: 0,
          scatterX: 0,
          scatterY: 0,
          fallSpeed: 0,
          landing: 0,
          spin: 0,
          spinSpeed: 0,
          flash: 0,
          wait: 0,
        })
      }
    }
    return next
  }

  const gridKey = () => {
    const p = options
    const w = root.clientWidth
    const h = root.clientHeight
    if (w <= 0 || h <= 0) return ""
    const step = Math.max(4, p.cellSize + p.cellGap)
    const cols = Math.max(1, Math.floor(w / step))
    const rows = Math.max(1, Math.floor(h / step))
    return [
      p.src ?? "",
      p.text,
      p.fit,
      p.cellSize,
      p.cellGap,
      p.charset,
      p.edgeCharset,
      p.threshold,
      String(p.invert ?? ""),
      cols,
      rows,
    ].join("|")
  }

  const rebuild = async () => {
    const p = options
    const { w, h } = sizeCanvas()
    if (w <= 0 || h <= 0) return
    const step = Math.max(4, p.cellSize + p.cellGap)
    const cols = Math.max(1, Math.floor(w / step))
    const rows = Math.max(1, Math.floor(h / step))
    const key = gridKey()
    if (!key || key === lastKey) return
    lastKey = key
    const id = ++loadId

    let image: HTMLImageElement | null = null
    if (p.src) {
      try {
        image = await loadImage(p.src)
      } catch {
        image = null
      }
      if (id !== loadId || !running) return
    }

    const sw = cols * SUPERSAMPLE
    const sh = rows * SUPERSAMPLE
    const sampler = document.createElement("canvas")
    sampler.width = sw
    sampler.height = sh
    const samplerCtx = sampler.getContext("2d", { willReadFrequently: true })
    if (!samplerCtx) return
    const snapshot = {
      ...options,
      src: image ? options.src : undefined,
    }
    sampleSource(samplerCtx, sw, sh, image, snapshot)
    let data: ImageData | null = null
    try {
      data = samplerCtx.getImageData(0, 0, sw, sh)
    } catch {
      data = null
    }
    if (!data && image) {
      // A tainted cross-origin image blocks reads; fall back to the text.
      sampleSource(samplerCtx, sw, sh, null, { ...snapshot, src: undefined })
      try {
        data = samplerCtx.getImageData(0, 0, sw, sh)
      } catch {
        lastKey = ""
        return
      }
    }
    if (!data) {
      lastKey = ""
      return
    }
    cells = buildFromImageData(data, cols, rows, snapshot)
    gridCols = cols
    gridRows = rows
    cursor.x = -999
    cursor.y = -999
    readFont()

    const source = `${snapshot.src ?? ""}|${snapshot.text}`
    const fresh = source !== lastSource
    lastSource = source

    if (fresh && p.assemble && p.interactive && !reduce && cells.length > 0) {
      flingOffStage(cells, cols, rows)
      staggerCells(cells, p.staggerFrames * 2)
      phase = "logo"
      setPhase("returning")
    } else {
      setPhase("logo")
    }
  }

  const cyclePhase = () => {
    const p = options
    if (!p.interactive || reduce || cells.length === 0) return
    if (phase === "logo") {
      const range = Math.max(0, p.scatterRange)
      for (const cell of cells) {
        const floor = Math.max(0, gridRows - 1 - cell.row)
        cell.scatterX = (Math.random() * 2 - 1) * range
        cell.scatterY = Math.min((Math.random() * 2 - 1) * range, floor * 0.72)
        cell.fallSpeed = 0
        cell.spinSpeed = (Math.random() * 2 - 1) * 0.05
      }
      staggerCells(cells, p.staggerFrames)
      setPhase("scattered")
      return
    }
    if (phase === "scattered") {
      // Glyphs heap up column by column, lowest ones landing first, so the
      // drop ends in drifts rather than one flat line.
      const pile = new Array<number>(Math.max(1, gridCols)).fill(0)
      const order = [...cells].sort(
        (a, b) => b.row + b.offsetY - (a.row + a.offsetY)
      )
      for (const cell of order) {
        const col = Math.min(
          gridCols - 1,
          Math.max(0, Math.round(cell.col + cell.offsetX))
        )
        const stack = pile[col]!++
        cell.landing = Math.max(-cell.row, gridRows - 1 - stack - cell.row)
        cell.fallSpeed = 0
        cell.spinSpeed = (Math.random() * 2 - 1) * 0.22
      }
      setPhase("fallen")
      return
    }
    if (phase === "fallen") {
      staggerCells(cells, p.staggerFrames)
      setPhase("returning")
    }
  }

  const update = (frames: number) => {
    const p = options
    const reduced = reduce
    let everyoneHome = phase === "returning"

    for (const cell of cells) {
      if (cell.flash > 0) cell.flash = Math.max(0, cell.flash - 0.06 * frames)

      if (cell.wait > 0) {
        cell.wait -= frames
        if (phase === "returning") everyoneHome = false
        continue
      }

      if (reduced || !p.interactive) {
        cell.offsetX = 0
        cell.offsetY = 0
        cell.spin = 0
        continue
      }

      if (phase === "scattered") {
        easeToward(
          cell,
          cell.scatterX,
          cell.scatterY,
          frameEase(p.scatterEase, frames)
        )
        cell.spin += cell.spinSpeed * frames
        cell.spinSpeed *= Math.pow(0.97, frames)
        continue
      }

      if (phase === "fallen") {
        const floor = cell.landing
        cell.fallSpeed += p.gravity * frames
        cell.offsetY += cell.fallSpeed * frames
        cell.spin += cell.spinSpeed * frames
        if (cell.offsetY >= floor) {
          cell.offsetY = floor
          cell.fallSpeed *= -Math.min(0.95, Math.max(0, p.bounce))
          if (Math.abs(cell.fallSpeed) < 0.12) cell.fallSpeed = 0
          // Each landing bleeds off most of the tumble; glyphs come to rest
          // on a flat side rather than balancing on a corner.
          cell.spinSpeed *= 0.35
          if (cell.fallSpeed === 0) {
            cell.spinSpeed = 0
            const rest = Math.round(cell.spin / (Math.PI / 2)) * (Math.PI / 2)
            cell.spin += (rest - cell.spin) * frameEase(0.3, frames)
          }
        }
        continue
      }

      if (phase === "returning") {
        easeToward(cell, 0, 0, frameEase(p.resetEase, frames))
        cell.spin += (0 - cell.spin) * frameEase(p.resetEase, frames)
        if (
          Math.abs(cell.offsetX) > 0.04 ||
          Math.abs(cell.offsetY) > 0.04 ||
          Math.abs(cell.spin) > 0.01
        ) {
          everyoneHome = false
        }
        continue
      }

      const dx = cell.col - cursor.x
      const dy = cell.row - cursor.y
      const dist = Math.hypot(dx, dy)
      const radius = Math.max(0.01, p.hoverRadius)
      if (dist < radius) {
        const push = (1 - dist / radius) * p.hoverPush
        if (dist < 0.0001) {
          easeToward(cell, push, 0, frameEase(p.hoverEase, frames))
        } else {
          easeToward(
            cell,
            (dx / dist) * push,
            (dy / dist) * push,
            frameEase(p.hoverEase, frames)
          )
        }
        if (Math.random() < 0.06 * frames) {
          cell.char = charFor(cell.weight, p.charset, p.edgeCharset)
          cell.flash = 1
        }
      } else {
        easeToward(cell, 0, 0, frameEase(p.hoverEase, frames))
      }
    }

    if (everyoneHome) {
      for (const cell of cells) {
        cell.offsetX = 0
        cell.offsetY = 0
        cell.spin = 0
      }
      setPhase("logo")
    }
  }

  const draw = () => {
    const p = options
    const w = root.clientWidth
    const h = root.clientHeight
    const ink = p.color ?? (dark ? DARK_INK : LIGHT_INK)
    const paper = p.backgroundColor ?? "transparent"
    const step = Math.max(4, p.cellSize + p.cellGap)

    if (paper === "transparent") {
      ctx.clearRect(0, 0, w, h)
    } else {
      ctx.fillStyle = paper
      ctx.fillRect(0, 0, w, h)
    }

    ctx.font = `${Math.max(6, p.cellSize)}px ${fontFamily || MONO_FALLBACK}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = ink

    for (const cell of cells) {
      const x = (cell.col + cell.offsetX) * step + step * 0.5
      const y = (cell.row + cell.offsetY) * step + step * 0.5
      // Full ink inside the shape, lighter toward its rim, and a brief
      // brightening on a swapped glyph.
      const base = 0.4 + 0.6 * Math.min(1, cell.weight / 0.85)
      ctx.globalAlpha = Math.min(1, base + cell.flash * 0.6)
      if (Math.abs(cell.spin) > 0.001) {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(cell.spin)
        ctx.fillText(cell.char, 0, 0)
        ctx.restore()
      } else {
        ctx.fillText(cell.char, x, y)
      }
    }
    ctx.globalAlpha = 1
  }

  const tick = (now: number) => {
    if (!running) return
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    const frames = dt * 60
    if (gridKey() !== lastKey) void rebuild()
    update(reduce ? 0 : frames)
    draw()
    raf = requestAnimationFrame(tick)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!options.interactive) return
    const rect = root.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const step = Math.max(4, options.cellSize + options.cellGap)
    const x = (event.clientX - rect.left) / step
    const y = (event.clientY - rect.top) / step
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    if (inside) {
      cursor.x = x
      cursor.y = y
    } else {
      cursor.x = -999
      cursor.y = -999
    }
  }

  const onPointerLeave = () => {
    cursor.x = -999
    cursor.y = -999
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    cyclePhase()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    cyclePhase()
  }

  readFont()
  void rebuild()
  raf = requestAnimationFrame(tick)

  // The observer also fires once right after `observe`; only a real size
  // change rebuilds, so it doesn't cut the first assemble flight short.
  const ro = new ResizeObserver(() => {
    if (root.clientWidth === lastW && root.clientHeight === lastH) return
    lastKey = ""
    void rebuild()
    // Resizing cleared the canvas; draw now, or it shows blank for a frame
    // until the next tick.
    if (running) draw()
  })
  ro.observe(root)

  window.addEventListener("pointermove", onPointerMove, { passive: true })
  root.addEventListener("pointerleave", onPointerLeave, { passive: true })
  root.addEventListener("pointerdown", onPointerDown)
  root.addEventListener("keydown", onKeyDown)

  return {
    setOptions(next) {
      options = { ...options, ...next }
      if (typeof next.text === "string") {
        options.text = clampAsciiLogoText(next.text)
      }
      dark = resolveDark(options.theme)
      if ("font" in next) readFont()
    },
    destroy() {
      running = false
      loadId += 1
      cancelAnimationFrame(raf)
      ro.disconnect()
      mqReduce.removeEventListener("change", onReduce)
      unwatchTheme()
      window.removeEventListener("pointermove", onPointerMove)
      root.removeEventListener("pointerleave", onPointerLeave)
      root.removeEventListener("pointerdown", onPointerDown)
      root.removeEventListener("keydown", onKeyDown)
    },
  }
}
