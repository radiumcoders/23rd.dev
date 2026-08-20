export type AsciiLogoPhase = "logo" | "scattered" | "fallen" | "returning"

export type AsciiLogoTheme = "light" | "dark" | "auto"

export type AsciiLogoOptions = {
  /**
   * Wordmark sampled into the ASCII grid. Ignored when `src` is set.
   * Default `"23rd"`
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
  /** Pool of glyphs. One is picked at random per cell. */
  charset?: string
  /**
   * Brightness (0–1) a sample must clear to become a glyph.
   * Default `0.2`
   */
  threshold?: number
  /**
   * Treat dark pixels as solid. Default `true` when `src` is set,
   * `false` for text (white ink on a black sampler).
   */
  invert?: boolean
  /** Glyph color (hex). Default follows theme. */
  color?: string
  /** Stage color (hex). Pass `"transparent"` to skip the fill. */
  backgroundColor?: string
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
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class).
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
  offsetX: number
  offsetY: number
  scatterX: number
  scatterY: number
  fallSpeed: number
  wait: number
}

export const DEFAULT_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*"

const LIGHT = { ink: "#3f3f46", paper: "#fafafa" }
const DARK = { ink: "#a1a1aa", paper: "#09090b" }

const TEXT_FONT =
  '900 1px "Arial Black", Impact, Arial, ui-sans-serif, system-ui, sans-serif'

function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false
  const root = document.documentElement
  if (root.classList.contains("dark")) return true
  if (root.classList.contains("light")) return false
  const dataTheme = root.getAttribute("data-theme")
  if (dataTheme === "dark") return true
  if (dataTheme === "light") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function resolveDark(theme: AsciiLogoTheme): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

function pickChar(charset: string) {
  const pool = charset.length > 0 ? charset : DEFAULT_CHARSET
  return pool[Math.floor(Math.random() * pool.length)] ?? "#"
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

/**
 * Interactive ASCII wordmark — glyphs shove away from the cursor, then
 * click-cycle through scatter, gravity drop, and reassemble. Zero deps.
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
      | "threshold"
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
    threshold: 0.2,
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

  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  let raf = 0
  let running = true
  let last = performance.now()
  let gridRows = 0
  let cells: AsciiCell[] = []
  let phase: AsciiLogoPhase = "logo"
  let lastKey = ""
  let lastW = -1
  let lastH = -1
  let lastDpr = -1
  let loadId = 0
  let reduce = false
  const cursor = { x: -999, y: -999 }

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const onReduce = () => {
    reduce = mqReduce.matches
  }
  onReduce()
  mqReduce.addEventListener("change", onReduce)

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

  const sampleSource = (
    sampler: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    image: HTMLImageElement | null,
    p: typeof options
  ) => {
    sampler.fillStyle = "#000"
    sampler.fillRect(0, 0, cols, rows)

    const cover = Math.min(1, Math.max(0.2, p.fit))
    if (image && image.width > 0 && image.height > 0) {
      const maxW = cols * cover
      const maxH = rows * cover
      const scale = Math.min(maxW / image.width, maxH / image.height)
      const dw = image.width * scale
      const dh = image.height * scale
      sampler.drawImage(image, (cols - dw) / 2, (rows - dh) / 2, dw, dh)
      return
    }

    const word = p.text.trim()
    if (!word) return
    sampler.fillStyle = "#fff"
    sampler.textAlign = "center"
    sampler.textBaseline = "middle"
    let fontSize = rows * 0.52
    sampler.font = TEXT_FONT.replace("1px", `${fontSize}px`)
    const width = sampler.measureText(word).width
    const maxW = cols * cover
    if (width > maxW && width > 0) {
      fontSize *= maxW / width
      sampler.font = TEXT_FONT.replace("1px", `${fontSize}px`)
    }
    sampler.fillText(word, cols / 2, rows / 2 + fontSize * 0.04)
  }

  const buildFromImageData = (
    data: ImageData,
    cols: number,
    rows: number,
    p: typeof options
  ) => {
    const shouldInvert = p.invert ?? Boolean(p.src)
    const lit = new Set<string>()
    const pixels = data.data
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = (row * cols + col) * 4
        const r = pixels[i] ?? 0
        const g = pixels[i + 1] ?? 0
        const b = pixels[i + 2] ?? 0
        const a = (pixels[i + 3] ?? 0) / 255
        const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255
        const value = (shouldInvert ? 1 - luma : luma) * a
        if (value < p.threshold) continue
        lit.add(`${col},${row}`)
        if (col + 1 < cols) lit.add(`${col + 1},${row}`)
      }
    }

    const next: AsciiCell[] = []
    for (const key of lit) {
      const [colStr, rowStr] = key.split(",")
      const col = Number(colStr)
      const row = Number(rowStr)
      next.push({
        col,
        row,
        char: pickChar(p.charset),
        offsetX: 0,
        offsetY: 0,
        scatterX: 0,
        scatterY: 0,
        fallSpeed: 0,
        wait: 0,
      })
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

    const sampler = document.createElement("canvas")
    sampler.width = cols
    sampler.height = rows
    const samplerCtx = sampler.getContext("2d", { willReadFrequently: true })
    if (!samplerCtx) return
    const snapshot = {
      ...options,
      src: image ? options.src : undefined,
    }
    sampleSource(samplerCtx, cols, rows, image, snapshot)
    let data: ImageData | null = null
    try {
      data = samplerCtx.getImageData(0, 0, cols, rows)
    } catch {
      data = null
    }
    if (!data && image) {
      sampleSource(samplerCtx, cols, rows, null, {
        ...snapshot,
        src: undefined,
      })
      try {
        data = samplerCtx.getImageData(0, 0, cols, rows)
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
    gridRows = rows
    setPhase("logo")
    cursor.x = -999
    cursor.y = -999
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
      }
      staggerCells(cells, p.staggerFrames)
      setPhase("scattered")
      return
    }
    if (phase === "scattered") {
      for (const cell of cells) cell.fallSpeed = 0
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
      if (cell.wait > 0) {
        cell.wait -= frames
        if (phase === "returning") everyoneHome = false
        continue
      }

      if (reduced || !p.interactive) {
        cell.offsetX = 0
        cell.offsetY = 0
        continue
      }

      if (phase === "scattered") {
        easeToward(
          cell,
          cell.scatterX,
          cell.scatterY,
          frameEase(p.scatterEase, frames)
        )
        continue
      }

      if (phase === "fallen") {
        const floor = Math.max(0, gridRows - 1 - cell.row)
        cell.fallSpeed += p.gravity * frames
        cell.offsetY += cell.fallSpeed * frames
        if (cell.offsetY >= floor) {
          cell.offsetY = floor
          cell.fallSpeed *= -Math.min(0.95, Math.max(0, p.bounce))
          if (Math.abs(cell.fallSpeed) < 0.12) cell.fallSpeed = 0
        }
        continue
      }

      if (phase === "returning") {
        easeToward(cell, 0, 0, frameEase(p.resetEase, frames))
        if (Math.abs(cell.offsetX) > 0.04 || Math.abs(cell.offsetY) > 0.04) {
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
          cell.char = pickChar(p.charset)
        }
      } else {
        easeToward(cell, 0, 0, frameEase(p.hoverEase, frames))
      }
    }

    if (everyoneHome) setPhase("logo")
  }

  const draw = () => {
    const p = options
    const w = root.clientWidth
    const h = root.clientHeight
    const dark = resolveDark(p.theme)
    const ink = p.color ?? (dark ? DARK.ink : LIGHT.ink)
    const paper = p.backgroundColor ?? (dark ? DARK.paper : LIGHT.paper)
    const step = Math.max(4, p.cellSize + p.cellGap)

    if (paper === "transparent") {
      ctx.clearRect(0, 0, w, h)
    } else {
      ctx.fillStyle = paper
      ctx.fillRect(0, 0, w, h)
    }

    ctx.font = `${Math.max(6, p.cellSize)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = ink

    for (const cell of cells) {
      const x = (cell.col + cell.offsetX) * step + step * 0.5
      const y = (cell.row + cell.offsetY) * step + step * 0.5
      ctx.fillText(cell.char, x, y)
    }
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

  void rebuild()
  raf = requestAnimationFrame(tick)

  const ro = new ResizeObserver(() => {
    lastW = -1
    lastH = -1
    lastKey = ""
    void rebuild()
  })
  ro.observe(root)

  window.addEventListener("pointermove", onPointerMove, { passive: true })
  root.addEventListener("pointerleave", onPointerLeave, { passive: true })
  root.addEventListener("pointerdown", onPointerDown)
  root.addEventListener("keydown", onKeyDown)

  return {
    setOptions(next) {
      options = { ...options, ...next }
    },
    destroy() {
      running = false
      loadId += 1
      cancelAnimationFrame(raf)
      ro.disconnect()
      mqReduce.removeEventListener("change", onReduce)
      window.removeEventListener("pointermove", onPointerMove)
      root.removeEventListener("pointerleave", onPointerLeave)
      root.removeEventListener("pointerdown", onPointerDown)
      root.removeEventListener("keydown", onKeyDown)
    },
  }
}
