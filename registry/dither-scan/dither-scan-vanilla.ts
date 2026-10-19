export type DitherScanTheme = "light" | "dark" | "auto"

export type DitherScanFit = "cover" | "contain"

export type DitherScanOptions = {
  /** Image URL. Remote images need CORS (`Access-Control-Allow-Origin`). */
  src: string
  /** Sweeps it takes to clear the dither. Default `4`, clamped to 1–12 */
  passes?: number
  /** Milliseconds per sweep. Default `1400` */
  duration?: number
  /** Milliseconds between sweeps. Default `280` */
  pause?: number
  /** Direction the line travels, in degrees (0 = left to right). Default `45` */
  angle?: number
  /** Every other sweep runs back the way it came. Default `true` */
  alternate?: boolean
  /** Dither cell size of the first pass, in CSS px. Default `6` */
  pixelSize?: number
  /** `[shadow, highlight]` for the 1-bit print. Default follows theme. */
  colors?: readonly [string, string]
  /** Blur in CSS px that follows the line while it settles. `0` turns it off. Default `6` */
  blur?: number
  /** Scan line color. Default inverts whatever is under it. */
  lineColor?: string
  /** How the image fills the frame. Default `cover` */
  fit?: DitherScanFit
  /** Start once the frame scrolls into view. Default `true` */
  autoPlay?: boolean
  /** Re-dither and scan again after a hold. Default `false` */
  loop?: boolean
  /** Hold on the clean image before a loop, in ms. Default `2400` */
  loopDelay?: number
  /**
   * Under `prefers-reduced-motion`, hold one frame with the line this far
   * across, 0–1: the 1-bit print ahead of it, the clean image behind.
   * Unset shows the clean image.
   */
  reducedMotionProgress?: number
  /**
   * Palette mode. Default `auto` follows shadcn / next-themes
   * (`html.dark` class).
   */
  theme?: DitherScanTheme
  /** Fires with the image's natural size once it loads. */
  onLoad?: (width: number, height: number) => void
  /** Fires when the first sweep starts, including each loop. */
  onStart?: () => void
  /** Fires after each sweep, 1-based. */
  onPass?: (pass: number, passes: number) => void
  /** Fires when the image is clean. */
  onComplete?: () => void
  /** Fires when a scan starts or settles. */
  onScanningChange?: (scanning: boolean) => void
}

export type DitherScanInstance = {
  setOptions: (options: Partial<DitherScanOptions>) => void
  /** Re-dither and scan from the first pass. */
  replay: () => void
  destroy: () => void
}

/** Ink and paper for the 1-bit print on a light page */
export const LIGHT_COLORS = ["#18181B", "#F4F4F5"] as const
/** Ink and paper for the 1-bit print on a dark page */
export const DARK_COLORS = ["#09090B", "#D4D4D8"] as const

const MAX_PASSES = 12
const MAX_LEVELS = 12
const LINE_WIDTH = 1.5
const TRAIL = 56
const BLUR_BEHIND = 128
const BLUR_AHEAD = 36
/** Gradient stops sampled from smoothstep; a linear ramp shows bands. */
const BLUR_STOPS = 12
const RESET_MS = 520
const REBUILD_DELAY_MS = 120

const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
] as const

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

export function resolveDark(theme: DitherScanTheme): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim()
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.padEnd(6, "0").slice(0, 6)
  const n = Number.parseInt(full, 16)
  if (Number.isNaN(n)) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function clampPasses(passes: number | undefined) {
  const n = Math.round(passes ?? 4)
  if (!Number.isFinite(n)) return 4
  return Math.min(MAX_PASSES, Math.max(1, n))
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

/**
 * How a pass level looks. Level 0 is the 1-bit print; level `passes` is the
 * source. Cells shrink geometrically, tones and color return linearly.
 */
export function levelSpec(level: number, passes: number, pixelSize: number) {
  const t = level / passes
  return {
    cell: Math.max(1, Math.round(Math.max(1, pixelSize) ** (1 - t))),
    tones: 2 + Math.round(t * (MAX_LEVELS - 2)),
    color: t,
  }
}

type Fit = { x: number; y: number; w: number; h: number }

function fitRect(
  iw: number,
  ih: number,
  w: number,
  h: number,
  fit: DitherScanFit
): Fit {
  const scale =
    fit === "contain" ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh }
}

/**
 * Ordered-dither the image at one pass level into a small canvas, one pixel
 * per cell. Drawn back up with smoothing off, each pixel is a crisp cell.
 * Returns null if the image taints the canvas (no CORS).
 */
function renderLevel(
  image: HTMLImageElement,
  w: number,
  h: number,
  fit: DitherScanFit,
  spec: ReturnType<typeof levelSpec>,
  shadow: [number, number, number],
  highlight: [number, number, number]
): HTMLCanvasElement | null {
  const sw = Math.max(1, Math.ceil(w / spec.cell))
  const sh = Math.max(1, Math.ceil(h / spec.cell))
  const out = document.createElement("canvas")
  out.width = sw
  out.height = sh
  const ctx = out.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null

  const r = fitRect(image.naturalWidth, image.naturalHeight, w, h, fit)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(
    image,
    r.x / spec.cell,
    r.y / spec.cell,
    r.w / spec.cell,
    r.h / spec.cell
  )

  let data: ImageData
  try {
    data = ctx.getImageData(0, 0, sw, sh)
  } catch {
    return null
  }

  const px = data.data
  const steps = spec.tones - 1
  const mix = spec.color
  const keep = 1 - mix
  const [sr, sg, sb] = shadow
  const dr = highlight[0] - sr
  const dg = highlight[1] - sg
  const db = highlight[2] - sb

  for (let y = 0; y < sh; y++) {
    const row = BAYER8[y & 7]!
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4
      if (px[i + 3]! === 0) continue
      const bias = (row[x & 7]! + 0.5) / 64 - 0.5
      const r8 = px[i]!
      const g8 = px[i + 1]!
      const b8 = px[i + 2]!

      const lum = (0.2126 * r8 + 0.7152 * g8 + 0.0722 * b8) / 255
      let tone = Math.round(lum * steps + bias) / steps
      tone = tone < 0 ? 0 : tone > 1 ? 1 : tone

      let qr = r8
      let qg = g8
      let qb = b8
      if (mix > 0) {
        qr = Math.round((r8 / 255) * steps + bias) / steps
        qg = Math.round((g8 / 255) * steps + bias) / steps
        qb = Math.round((b8 / 255) * steps + bias) / steps
        qr = (qr < 0 ? 0 : qr > 1 ? 1 : qr) * 255
        qg = (qg < 0 ? 0 : qg > 1 ? 1 : qg) * 255
        qb = (qb < 0 ? 0 : qb > 1 ? 1 : qb) * 255
      }

      px[i] = (sr + dr * tone) * keep + qr * mix
      px[i + 1] = (sg + dg * tone) * keep + qg * mix
      px[i + 2] = (sb + db * tone) * keep + qb * mix
      px[i + 3] = 255
    }
  }

  ctx.putImageData(data, 0, 0)
  return out
}

const IDLE = 0
const SWEEP = 1
const HOLD = 2
const DONE = 3
const RESET = 4
/** Reduced motion: one frame, the line resting part way across. */
const STILL = 5

export function createDitherScan(
  wrap: HTMLElement,
  canvas: HTMLCanvasElement,
  initial: DitherScanOptions
): DitherScanInstance | null {
  let options: DitherScanOptions = {
    passes: 4,
    duration: 1400,
    pause: 280,
    angle: 45,
    alternate: true,
    pixelSize: 6,
    blur: 6,
    fit: "cover",
    autoPlay: true,
    loop: false,
    loopDelay: 2400,
    theme: "auto",
    ...initial,
  }

  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  let running = true
  let raf = 0
  let rebuildTimer = 0
  let loopTimer = 0
  let cssW = 0
  let cssH = 0
  let dpr = 1
  let reduce = false
  let dark = resolveDark(options.theme ?? "auto")
  let visible = false
  let image: HTMLImageElement | null = null
  let loadedSrc = ""
  /** `levels[k]` is pass level k; the last is null and draws the source. */
  let levels: (HTMLCanvasElement | null)[] = []
  /** CSS px per level pixel, matching `levels`. */
  let cells: number[] = []
  let levelsW = 0
  let levelsH = 0
  /** Blurred copies of levels, made the first time a sweep needs one. */
  const blurred = new Map<number, HTMLCanvasElement | null>()
  let scratch: HTMLCanvasElement | null = null
  let warmTimer = 0
  let tainted = false

  let state = IDLE
  /** Sweeps finished; the frame shows `levels[pass]`. */
  let pass = 0
  let phaseStart = 0
  let wantsPlay = false
  let scanning = false

  const passes = () => clampPasses(options.passes)

  const setScanning = (next: boolean) => {
    if (scanning === next) return
    scanning = next
    options.onScanningChange?.(next)
  }

  const palette = () => {
    const pair = options.colors ?? (dark ? DARK_COLORS : LIGHT_COLORS)
    return [hexRgb(pair[0]), hexRgb(pair[1])] as const
  }

  const rebuild = () => {
    window.clearTimeout(rebuildTimer)
    rebuildTimer = 0
    if (!image || cssW <= 0 || cssH <= 0) return
    const n = passes()
    const [shadow, highlight] = palette()
    const fit = options.fit ?? "cover"
    const pixelSize = options.pixelSize ?? 6
    const next: (HTMLCanvasElement | null)[] = []
    const nextCells: number[] = []
    tainted = false
    for (let k = 0; k < n; k++) {
      const spec = levelSpec(k, n, pixelSize)
      const level = renderLevel(
        image,
        cssW,
        cssH,
        fit,
        spec,
        shadow,
        highlight
      )
      if (!level) {
        tainted = true
        break
      }
      next.push(level)
      nextCells.push(spec.cell)
    }
    // A cross-origin image without CORS can't be read: show it as is.
    levels = tainted ? [null] : [...next, null]
    cells = tainted ? [1] : [...nextCells, 1]
    levelsW = cssW
    levelsH = cssH
    blurred.clear()
    warmBlur()
    if (pass > levels.length - 1) pass = levels.length - 1
  }

  const drawLevel = (k: number, target: CanvasRenderingContext2D = ctx) => {
    const level = levels[k]
    if (level === undefined) return
    if (level === null) {
      if (!image) return
      const r = fitRect(
        image.naturalWidth,
        image.naturalHeight,
        cssW,
        cssH,
        options.fit ?? "cover"
      )
      target.imageSmoothingEnabled = true
      target.imageSmoothingQuality = "high"
      target.drawImage(image, r.x, r.y, r.w, r.h)
      return
    }
    // Stretch to the current size; a resize rebuilds after it settles.
    const cell = cells[k] ?? 1
    target.imageSmoothingEnabled = false
    target.drawImage(
      level,
      0,
      0,
      level.width * cell * (cssW / levelsW),
      level.height * cell * (cssH / levelsH)
    )
  }

  /**
   * Level `k` at CSS size, blurred. The sharp copy goes under it so the
   * frame's edges don't blur into transparency. Null where canvas filters
   * are unsupported.
   */
  const blurredLevel = (k: number) => {
    if (blurred.has(k)) return blurred.get(k)!
    const out = document.createElement("canvas")
    out.width = Math.max(1, Math.round(cssW))
    out.height = Math.max(1, Math.round(cssH))
    const bctx = out.getContext("2d")
    let result: HTMLCanvasElement | null = null
    if (bctx && typeof bctx.filter === "string") {
      drawLevel(k, bctx)
      bctx.filter = `blur(${options.blur ?? 6}px)`
      drawLevel(k, bctx)
      bctx.filter = "none"
      result = out
    }
    blurred.set(k, result)
    return result
  }

  /**
   * Blur every level ahead of time, one per task, so a sweep never stalls a
   * frame making the copy it needs.
   */
  const warmBlur = () => {
    window.clearTimeout(warmTimer)
    if ((options.blur ?? 6) <= 0 || reduce) return
    const step = (k: number) => {
      if (!running || k >= levels.length) return
      blurredLevel(k)
      warmTimer = window.setTimeout(() => step(k + 1), 0)
    }
    warmTimer = window.setTimeout(() => step(0), 0)
  }

  /**
   * A feathered band of blur riding the line: the incoming level softens
   * behind it and sharpens as the line moves on, the outgoing one just ahead.
   */
  const drawScanBlur = (a: number, u: number, e: number, f: number) => {
    if ((options.blur ?? 6) <= 0) return
    const ahead = blurredLevel(pass)
    const behind = blurredLevel(pass + 1)
    if (!ahead || !behind) return

    if (!scratch) scratch = document.createElement("canvas")
    const w = Math.max(1, Math.round(cssW))
    const h = Math.max(1, Math.round(cssH))
    if (scratch.width !== w || scratch.height !== h) {
      scratch.width = w
      scratch.height = h
    }
    const sctx = scratch.getContext("2d")
    if (!sctx) return

    sctx.setTransform(1, 0, 0, 1, 0, 0)
    sctx.globalCompositeOperation = "source-over"
    sctx.clearRect(0, 0, w, h)
    sctx.drawImage(ahead, 0, 0)

    sctx.save()
    sctx.translate(cssW / 2, cssH / 2)
    sctx.rotate(a)
    sctx.beginPath()
    sctx.rect(-e - 2, -f, u + e + 2, f * 2)
    sctx.clip()
    sctx.setTransform(1, 0, 0, 1, 0, 0)
    sctx.drawImage(behind, 0, 0)
    sctx.restore()

    // Keep only the band. The fill covers the whole frame, so the mask
    // doesn't depend on how a browser bounds `destination-in`.
    sctx.save()
    sctx.translate(cssW / 2, cssH / 2)
    sctx.rotate(a)
    const band = BLUR_BEHIND + BLUR_AHEAD
    const peak = BLUR_BEHIND / band
    const mask = sctx.createLinearGradient(u - BLUR_BEHIND, 0, u + BLUR_AHEAD, 0)
    for (let i = 0; i <= BLUR_STOPS; i++) {
      const x = i / BLUR_STOPS
      const rise = x * peak
      const fall = peak + x * (1 - peak)
      mask.addColorStop(rise, `rgba(0,0,0,${smoothstep(x)})`)
      mask.addColorStop(fall, `rgba(0,0,0,${smoothstep(1 - x)})`)
    }
    sctx.globalCompositeOperation = "destination-in"
    sctx.fillStyle = mask
    sctx.fillRect(-e - band - 4, -f, (e + band + 4) * 2, f * 2)
    sctx.restore()

    ctx.drawImage(scratch, 0, 0, cssW, cssH)
  }

  /** Draw the line and its trail, rotated to the travel direction. */
  const drawLine = (u: number, f: number) => {
    const color = options.lineColor
    const trail = ctx.createLinearGradient(u - TRAIL, 0, u, 0)
    if (color) {
      const [r, g, b] = hexRgb(color)
      trail.addColorStop(0, `rgba(${r},${g},${b},0)`)
      trail.addColorStop(1, `rgba(${r},${g},${b},0.28)`)
    } else {
      trail.addColorStop(0, "rgba(255,255,255,0)")
      trail.addColorStop(1, "rgba(255,255,255,0.22)")
    }
    ctx.globalCompositeOperation = color ? "source-over" : "soft-light"
    ctx.fillStyle = trail
    ctx.fillRect(u - TRAIL, -f, TRAIL, f * 2)

    ctx.globalCompositeOperation = color ? "source-over" : "difference"
    ctx.fillStyle = color ?? "#FFFFFF"
    ctx.fillRect(u - LINE_WIDTH / 2, -f, LINE_WIDTH, f * 2)
    ctx.globalCompositeOperation = "source-over"
  }

  const draw = (now: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    if (!image || levels.length === 0) return

    if (state === RESET) {
      const t = Math.min(1, (now - phaseStart) / RESET_MS)
      drawLevel(levels.length - 1)
      ctx.globalAlpha = easeInOutSine(t)
      drawLevel(0)
      ctx.globalAlpha = 1
      return
    }

    if (state === STILL) {
      drawStill()
      return
    }

    drawLevel(pass)
    if (state !== SWEEP) return

    const t = easeInOutSine(
      Math.min(1, (now - phaseStart) / Math.max(1, options.duration ?? 1400))
    )
    const flip = options.alternate !== false && pass % 2 === 1
    const a = (((options.angle ?? 45) + (flip ? 180 : 0)) * Math.PI) / 180
    const cos = Math.abs(Math.cos(a))
    const sin = Math.abs(Math.sin(a))
    // Half-extents of the frame along the travel axis (e) and across it (f).
    const e = (cos * cssW + sin * cssH) / 2
    const f = (sin * cssW + cos * cssH) / 2 + 2
    // With blur on, travel until the band has fully entered and left the
    // frame, so it never pops in or out at a pass boundary.
    const soft = (options.blur ?? 6) > 0
    const from = -e - LINE_WIDTH - (soft ? BLUR_AHEAD : 0)
    const to = e + LINE_WIDTH + (soft ? BLUR_BEHIND : 0)
    const u = from + (to - from) * t

    ctx.save()
    ctx.translate(cssW / 2, cssH / 2)
    ctx.rotate(a)
    ctx.beginPath()
    ctx.rect(-e - 2, -f, u + e + 2, f * 2)
    ctx.clip()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawLevel(pass + 1)
    ctx.restore()

    drawScanBlur(a, u, e, f)

    ctx.save()
    ctx.translate(cssW / 2, cssH / 2)
    ctx.rotate(a)
    drawLine(u, f)
    ctx.restore()
  }

  /** The 1-bit print with the clean image up to the resting line. */
  const drawStill = () => {
    const at = Math.min(1, Math.max(0, options.reducedMotionProgress ?? 0))
    const a = ((options.angle ?? 45) * Math.PI) / 180
    const cos = Math.abs(Math.cos(a))
    const sin = Math.abs(Math.sin(a))
    const e = (cos * cssW + sin * cssH) / 2
    const f = (sin * cssW + cos * cssH) / 2 + 2
    const u = -e + 2 * e * at

    drawLevel(0)
    ctx.save()
    ctx.translate(cssW / 2, cssH / 2)
    ctx.rotate(a)
    ctx.beginPath()
    ctx.rect(-e - 2, -f, u + e + 2, f * 2)
    ctx.clip()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawLevel(levels.length - 1)
    ctx.restore()

    ctx.save()
    ctx.translate(cssW / 2, cssH / 2)
    ctx.rotate(a)
    drawLine(u, f)
    ctx.restore()
  }

  const scheduleLoop = () => {
    window.clearTimeout(loopTimer)
    if (!options.loop || reduce || levels.length < 2) return
    loopTimer = window.setTimeout(() => {
      if (!running || state !== DONE) return
      state = RESET
      phaseStart = performance.now()
      setScanning(true)
      startLoop()
    }, Math.max(0, options.loopDelay ?? 2400))
  }

  const finish = () => {
    state = DONE
    pass = levels.length - 1
    setScanning(false)
    options.onComplete?.()
    scheduleLoop()
  }

  const tick = (now: number) => {
    raf = 0
    if (!running) return
    const last = levels.length - 1

    if (state === SWEEP) {
      if (now - phaseStart >= Math.max(1, options.duration ?? 1400)) {
        pass += 1
        options.onPass?.(pass, last)
        if (pass >= last) {
          finish()
        } else {
          state = HOLD
          phaseStart = now
        }
      }
    } else if (state === HOLD) {
      if (now - phaseStart >= Math.max(0, options.pause ?? 280)) {
        state = SWEEP
        phaseStart = now
      }
    } else if (state === RESET) {
      if (now - phaseStart >= RESET_MS) {
        state = IDLE
        pass = 0
        begin(now)
      }
    }

    draw(now)
    if (state === SWEEP || state === HOLD || state === RESET) {
      raf = requestAnimationFrame(tick)
    }
  }

  const startLoop = () => {
    if (!raf && running) raf = requestAnimationFrame(tick)
  }

  const redraw = () => {
    if (raf) return
    draw(performance.now())
  }

  /** Start sweeping from the current level, once there is something to show. */
  const begin = (now = performance.now()) => {
    wantsPlay = false
    const last = levels.length - 1
    if (reduce && last > 0 && options.reducedMotionProgress != null) {
      pass = 0
      state = STILL
      setScanning(false)
      redraw()
      return
    }
    if (last <= 0 || reduce) {
      pass = Math.max(0, last)
      state = DONE
      redraw()
      if (last >= 0) options.onComplete?.()
      return
    }
    if (pass === 0) options.onStart?.()
    state = SWEEP
    phaseStart = now
    setScanning(true)
    startLoop()
  }

  const requestPlay = () => {
    if (!image || levels.length === 0 || !visible) {
      wantsPlay = true
      return
    }
    begin()
  }

  const restart = (play: boolean) => {
    window.clearTimeout(loopTimer)
    cancelAnimationFrame(raf)
    raf = 0
    state = IDLE
    pass = 0
    setScanning(false)
    redraw()
    if (play) requestPlay()
  }

  /** Returns whether the CSS size changed. */
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = wrap.clientWidth
    const h = wrap.clientHeight
    if (w <= 0 || h <= 0) return false
    const changed = w !== cssW || h !== cssH
    cssW = w
    cssH = h
    const bw = Math.max(1, Math.floor(w * dpr))
    const bh = Math.max(1, Math.floor(h * dpr))
    if (bw !== canvas.width || bh !== canvas.height) {
      canvas.width = bw
      canvas.height = bh
    }
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    return changed
  }

  const load = (src: string) => {
    loadedSrc = src
    levels = []
    image = null
    restart(false)
    if (!src) return
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.decoding = "async"
    img.onload = () => {
      if (!running || loadedSrc !== src) return
      image = img
      options.onLoad?.(img.naturalWidth, img.naturalHeight)
      resize()
      rebuild()
      redraw()
      if (options.autoPlay !== false || wantsPlay) requestPlay()
    }
    img.src = src
  }

  resize()

  const ro = new ResizeObserver(() => {
    if (!resize() || !image) return
    if (levels.length === 0) rebuild()
    redraw()
    window.clearTimeout(rebuildTimer)
    rebuildTimer = window.setTimeout(() => {
      rebuild()
      redraw()
      if (wantsPlay) requestPlay()
    }, REBUILD_DELAY_MS)
  })
  ro.observe(wrap)

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting)
      if (visible && wantsPlay) requestPlay()
    },
    { threshold: 0.35 }
  )
  io.observe(wrap)

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const onReduce = () => {
    reduce = mqReduce.matches
  }
  onReduce()
  mqReduce.addEventListener("change", onReduce)

  const syncTheme = () => {
    const next = resolveDark(options.theme ?? "auto")
    if (next === dark) return
    dark = next
    if (!options.colors) {
      rebuild()
      redraw()
    }
  }
  const mo = new MutationObserver(syncTheme)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  })
  const mqDark = window.matchMedia("(prefers-color-scheme: dark)")
  mqDark.addEventListener("change", syncTheme)

  wantsPlay = options.autoPlay !== false
  load(options.src)

  return {
    setOptions(next) {
      const prev = options
      options = { ...options, ...next }
      if (options.src !== loadedSrc) {
        wantsPlay = options.autoPlay !== false
        load(options.src)
        return
      }
      const passesChanged = clampPasses(prev.passes) !== passes()
      const looks =
        passesChanged ||
        prev.pixelSize !== options.pixelSize ||
        prev.fit !== options.fit ||
        prev.colors?.[0] !== options.colors?.[0] ||
        prev.colors?.[1] !== options.colors?.[1]
      if (prev.theme !== options.theme) {
        dark = resolveDark(options.theme ?? "auto")
      }
      if (looks || prev.theme !== options.theme) rebuild()
      else if (prev.blur !== options.blur) {
        blurred.clear()
        warmBlur()
      }
      if (passesChanged) {
        restart(options.autoPlay !== false)
        return
      }
      if (prev.loop !== options.loop && state === DONE) scheduleLoop()
      if (
        reduce &&
        prev.reducedMotionProgress !== options.reducedMotionProgress &&
        (state === DONE || state === STILL)
      ) {
        begin()
        return
      }
      if (prev.autoPlay === false && options.autoPlay !== false && state === IDLE) {
        requestPlay()
      }
      redraw()
    },
    replay() {
      restart(true)
    },
    destroy() {
      running = false
      cancelAnimationFrame(raf)
      window.clearTimeout(rebuildTimer)
      window.clearTimeout(loopTimer)
      window.clearTimeout(warmTimer)
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      mqReduce.removeEventListener("change", onReduce)
      mqDark.removeEventListener("change", syncTheme)
      options.onScanningChange?.(false)
    },
  }
}
