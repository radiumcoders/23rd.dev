/** Gradient stops, top to bottom: magenta through sunlight to deep navy. */
export const DEFAULT_COLORS = [
  "#FF1AE6",
  "#FF2E5E",
  "#FF8A1A",
  "#FFC81F",
  "#E2E6EC",
  "#8DB6E6",
  "#2F74DC",
  "#1459E3",
  "#1C2566",
]

export const DEFAULT_MAX_STRETCH = 280
export const DEFAULT_COLUMNS = 9
/** Gaussian blur on the aurora, in px. */
export const DEFAULT_BLUR = 16
/** White floor bloom opacity (0–1). Off by default. */
export const DEFAULT_GLOW = 0
export const DEFAULT_STIFFNESS = 380
export const DEFAULT_DAMPING = 32

/** Docs / demos: dispatch to play the rubber stretch without faking wheel input. */
export const STRETCHY_FOOTER_PLAY = "stretchy-footer:play"

/** Stretch per px of overscroll at rest; it falls off toward `maxStretch`. */
const RUBBER = 0.9
/** Wheel silence that counts as letting go, in ms. */
const RELEASE_MS = 110
/** After letting go, wheel events closer together than this are momentum. */
const MOMENTUM_GAP_MS = 180
/** Consecutive shrinking wheel deltas that read as a trackpad coasting. */
const COAST_EVENTS = 6
const MASS = 0.35
const REST = 0.15
/** Edge columns stand this share of the centre one; the rest step evenly. */
const EDGE_COLUMN = 0.55
/** The top of each column fades in over this share of its height. */
const TOP_FADE = 0.12
/** Field opacity ramps in over this share of `maxStretch`. */
const FADE_IN = 0.08
/** Physics substep, in seconds. */
const STEP = 1 / 120

export type StretchyFooterOptions = {
  /** Peak stretch in px. Default `280`. */
  maxStretch?: number
  /**
   * Gradient stops from the top of each column down to the floor, any CSS
   * colors. Every column carries the whole gradient, squeezed to its height.
   */
  colors?: string[]
  /** Spring stiffness. Default `380`. */
  stiffness?: number
  /** Spring damping. Default `32`. */
  damping?: number
  /** How many aurora columns, stepping down from the middle. Default `9`. */
  columns?: number
  /** Gaussian blur on the aurora, in px. Default `16`. */
  blur?: number
  /** White floor bloom opacity (0–1). Default `0`. */
  glow?: number
  /**
   * Invert the pyramid: the edge columns stand tallest and the middle
   * dips, so the wobble ripples in from the sides. Default `false`.
   */
  flip?: boolean
  /**
   * `180` turns the aurora upside down in place: the columns hang from the
   * lifted page's edge and the gradient runs floor to top. Default `0`.
   */
  rotate?: 0 | 180
  /**
   * Optional id for docs demos. `playStretchyFooterDemo({ target })` only
   * plays footers whose `demoId` matches.
   */
  demoId?: string
}

export type StretchyFooterMount = {
  /** Canvas the aurora paints into. Its parent sets the width. */
  canvas: HTMLCanvasElement
  /** Where overscroll is read: a scroll container, or `window`. */
  scroller: HTMLElement | Window
  /** Lifts with the stretch: an element, or a selector looked up when needed. */
  content?: HTMLElement | string | null
}

export type StretchyFooterPlayDetail = {
  /** Peak pull as a fraction of `maxStretch`. Default `0.82`. */
  amount?: number
  /** How long to hold the stretch before snapping back, in ms. Default `700`. */
  holdMs?: number
  /** Only footers with this `demoId` respond. */
  target?: string
  /** Scroll this element (or the window) to the end before playing. */
  scrollRoot?: HTMLElement | null
}

export type StretchyFooterInstance = {
  setOptions: (options: Partial<StretchyFooterOptions>) => void
  /** Stretch and snap back, even under `prefers-reduced-motion`. */
  play: (detail?: Pick<StretchyFooterPlayDetail, "amount" | "holdMs">) => void
  destroy: () => void
}

export async function scrollToEnd(root?: HTMLElement | null) {
  const el = root ?? document.documentElement
  const max = () => Math.max(0, el.scrollHeight - el.clientHeight)
  const top = () => (root ? root.scrollTop : window.scrollY)
  const scroll = (behavior: ScrollBehavior) =>
    (root ?? window).scrollTo({ top: max(), behavior })
  scroll("smooth")
  const started = performance.now()
  while (performance.now() - started < 2000 && top() < max() - 2) {
    await new Promise<void>((r) => window.setTimeout(r, 32))
  }
  scroll("instant")
}

/** Scroll to the end, then play the stretch on matching footers. */
export async function playStretchyFooterDemo(
  detail: StretchyFooterPlayDetail = {}
) {
  if (typeof window === "undefined") return
  await scrollToEnd(detail.scrollRoot)
  window.dispatchEvent(
    new CustomEvent<StretchyFooterPlayDetail>(STRETCHY_FOOTER_PLAY, { detail })
  )
  // Travel out, hold, spring home.
  await new Promise<void>((r) =>
    window.setTimeout(r, (detail.holdMs ?? 700) + 900)
  )
}

/**
 * Stepped pyramid: the middle column is tallest, each step out is shorter.
 * Flipped, the edges are tallest and each step in is shorter.
 */
export function columnScale(
  index: number,
  count: number,
  flip = false
): number {
  if (count <= 1) return 1
  const t = Math.abs((index / (count - 1)) * 2 - 1)
  return 1 - (1 - EDGE_COLUMN) * (flip ? 1 - t : t)
}

/** Overscroll distance → stretch. Linear at first, never past `max`. */
export function rubberBand(distance: number, max: number): number {
  if (max <= 0 || distance <= 0) return 0
  return max * (1 - 1 / ((distance * RUBBER) / max + 1))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function numberOr(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return clamp(value, min, max)
}

/** Wheel delta in px, whatever unit the device reports in. */
function wheelPixels(event: WheelEvent) {
  if (event.deltaMode === 1) return event.deltaY * 16
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight
  return event.deltaY
}

/**
 * True when something between `target` and the scroller can still scroll
 * in that direction: a code block or a menu gets the wheel, not us.
 */
function nestedCanScroll(
  target: EventTarget | null,
  root: Element,
  dy: number
) {
  let el = target instanceof Element ? target : null
  while (el && el !== root && el !== document.documentElement) {
    if (el.scrollHeight > el.clientHeight + 1) {
      const overflow = getComputedStyle(el).overflowY
      if (overflow === "auto" || overflow === "scroll") {
        const room =
          dy > 0
            ? el.scrollHeight - el.clientHeight - el.scrollTop
            : el.scrollTop
        if (room > 1) return true
      }
    }
    el = el.parentElement
  }
  return false
}

const STRIP = 256

/**
 * One column's gradient, `colors` spread from just under the top to the
 * floor, with the top fading in. Columns stretch it to their own height.
 */
function makeStrip(colors: string[]) {
  const strip = document.createElement("canvas")
  strip.width = 1
  strip.height = STRIP
  const g = strip.getContext("2d")
  if (!g) return strip
  const bands = g.createLinearGradient(0, 0, 0, STRIP)
  colors.forEach((color, i) => {
    const at = colors.length > 1 ? i / (colors.length - 1) : 1
    bands.addColorStop(TOP_FADE * 0.8 + (1 - TOP_FADE * 0.8) * at, color)
  })
  g.fillStyle = bands
  g.fillRect(0, 0, 1, STRIP)
  const fade = g.createLinearGradient(0, 0, 0, STRIP * TOP_FADE)
  fade.addColorStop(0, "rgba(0,0,0,0)")
  fade.addColorStop(1, "rgba(0,0,0,1)")
  g.globalCompositeOperation = "destination-in"
  g.fillStyle = fade
  g.fillRect(0, 0, 1, STRIP)
  return strip
}

/** Half a white radial glow, flat side down, for the floor bloom. */
function makeBloom() {
  const bloom = document.createElement("canvas")
  bloom.width = 128
  bloom.height = 64
  const g = bloom.getContext("2d")
  if (!g) return bloom
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, "rgba(255,255,255,1)")
  grad.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 64)
  return bloom
}

type Spring = { x: number; v: number; target: number }

function stepSpring(s: Spring, k: number, c: number, dt: number) {
  const accel = (-k * (s.x - s.target) - c * s.v) / MASS
  s.v += accel * dt
  s.x += s.v * dt
}

const atRest = (s: Spring) =>
  Math.abs(s.x - s.target) < REST && Math.abs(s.v) < REST

/**
 * Dia-style rubber overscroll. Pull past the bottom of `scroller` and the
 * content lifts on a spring while a stepped pyramid of blurred gradient
 * columns stretches up from the floor (a valley with `flip`, hanging from
 * the page with `rotate: 180`); each column
 * has its own spring, so the edge wobbles as it snaps back. Idle unless
 * stretched.
 */
export function createStretchyFooter(
  mount: StretchyFooterMount,
  initial: StretchyFooterOptions = {}
): StretchyFooterInstance | null {
  const { canvas, scroller } = mount
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  let options: StretchyFooterOptions = { ...initial }
  const maxOf = () => numberOr(options.maxStretch, DEFAULT_MAX_STRETCH, 0, 4000)
  const blurOf = () => numberOr(options.blur, DEFAULT_BLUR, 0, 64)
  const glowOf = () => numberOr(options.glow, DEFAULT_GLOW, 0, 1)
  const stiffnessOf = () =>
    numberOr(options.stiffness, DEFAULT_STIFFNESS, 10, 4000)
  const dampingOf = () => numberOr(options.damping, DEFAULT_DAMPING, 0, 400)
  const countOf = () =>
    Math.round(numberOr(options.columns, DEFAULT_COLUMNS, 3, 96))
  /** Overscroll the user has put in, in px. The stretch is its rubber band. */
  let distance = 0
  /** `play()` holds the stretch here, overriding the gesture. */
  let forced: number | null = null
  const lift: Spring = { x: 0, v: 0, target: 0 }
  let columns: (Spring & { share: number })[] = []
  let strip = document.createElement("canvas")
  const bloom = makeBloom()

  const rebuildColumns = () => {
    const count = countOf()
    const target = lift.target
    columns = Array.from({ length: count }, (_, i) => {
      const share = columnScale(i, count, options.flip)
      return { x: lift.x * share, v: 0, target: target * share, share }
    })
  }
  const rebuildStrip = () => {
    strip = makeStrip(options.colors?.length ? options.colors : DEFAULT_COLORS)
  }

  const size = { w: 0, pad: 0, scale: 1 }
  const layout = () => {
    const parent = canvas.parentElement
    const blur = blurOf()
    const max = maxOf()
    // Room past the edges, so the blur doesn't fade the sides and floor.
    const pad = Math.ceil(blur * 2)
    // Blurred anyway, so half resolution is plenty and half the fill.
    const scale = blur >= 6 ? 0.5 : Math.min(window.devicePixelRatio || 1, 2)
    size.w = (parent?.clientWidth ?? 0) + pad * 2
    size.pad = pad
    size.scale = scale
    canvas.width = Math.max(1, Math.ceil(size.w * scale))
    canvas.height = Math.max(1, Math.ceil((max + pad) * scale))
    Object.assign(canvas.style, {
      position: "absolute",
      left: `${-pad}px`,
      bottom: `${-pad}px`,
      width: `${size.w}px`,
      height: `${max + pad}px`,
      filter: blur > 0 ? `blur(${blur}px)` : "",
      pointerEvents: "none",
    })
    draw()
  }

  // The page element that rides the stretch.
  let lifted: HTMLElement | null = null
  let liftedTransform = ""
  const contentEl = () => {
    const content = mount.content
    if (!content) return null
    if (typeof content !== "string") return content
    if (lifted?.isConnected && lifted.matches(content)) return lifted
    const scope = scroller instanceof HTMLElement ? scroller : document
    return (
      scope.querySelector<HTMLElement>(content) ??
      document.querySelector<HTMLElement>(content)
    )
  }
  const liftContent = (y: number) => {
    const el = contentEl()
    if (el !== lifted) {
      if (lifted) lifted.style.transform = liftedTransform
      lifted = el
      liftedTransform = el?.style.transform ?? ""
    }
    if (!lifted) return
    if (y > 0.2) {
      lifted.style.transform = `translate3d(0, ${-y}px, 0)`
      lifted.style.willChange = "transform"
    } else {
      lifted.style.transform = liftedTransform
      lifted.style.willChange = ""
    }
  }

  function draw() {
    const stretch = Math.max(0, lift.x)
    liftContent(stretch)
    const max = maxOf()
    const visible = stretch > 0.2 || columns.some((column) => column.x > 0.2)
    canvas.style.visibility = visible ? "visible" : "hidden"
    if (!visible) return

    const { w, pad, scale } = size
    const floor = max * scale
    const bottom = canvas.height
    ctx!.setTransform(1, 0, 0, 1, 0, 0)
    ctx!.clearRect(0, 0, canvas.width, canvas.height)
    ctx!.globalAlpha = clamp(stretch / Math.max(1, max * FADE_IN), 0, 1)
    // Rotated, spin the drawing 180° about the gap between the lifted page
    // and the floor, so the columns hang from the page's edge.
    const rotated = options.rotate === 180
    if (rotated) {
      ctx!.setTransform(-1, 0, 0, -1, canvas.width, 2 * floor - stretch * scale)
    }

    // Columns span the visible width; the outer two run on into the pad.
    const count = columns.length
    const inner = (w - pad * 2) * scale
    const edge = (i: number) =>
      i <= 0
        ? 0
        : i >= count
          ? canvas.width
          : Math.round(pad * scale + (inner * i) / count)
    for (let i = 0; i < count; i++) {
      const h = Math.max(0, columns[i]!.x) * scale
      if (h < 0.5) continue
      const x0 = edge(i)
      const x1 = edge(i + 1)
      ctx!.drawImage(strip, x0, floor - h, x1 - x0, h)
      // The run-off under the floor would land on the page once rotated.
      if (rotated) continue
      ctx!.drawImage(
        strip,
        0,
        STRIP - 1,
        1,
        1,
        x0,
        floor,
        x1 - x0,
        bottom - floor
      )
    }

    const glow = glowOf()
    if (glow > 0) {
      const rx = inner * 0.49
      const ry = stretch * 0.35 * scale
      ctx!.globalAlpha *= glow
      ctx!.drawImage(bloom, w * scale * 0.5 - rx, floor - ry, rx * 2, ry)
    }
    ctx!.globalAlpha = 1
    ctx!.setTransform(1, 0, 0, 1, 0, 0)
  }

  let raf = 0
  let last = 0
  const retarget = () => {
    const max = maxOf()
    const target = forced ?? rubberBand(distance, max)
    lift.target = target
    for (const column of columns) column.target = target * column.share
    if (!raf) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }

  function frame(now: number) {
    raf = 0
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    const k = stiffnessOf()
    const c = dampingOf()
    const steps = Math.max(1, Math.ceil(dt / STEP))
    for (let n = 0; n < steps; n++) {
      stepSpring(lift, k, c, dt / steps)
      for (const column of columns) {
        // Short edge columns are softer and bouncier than the middle, so the
        // top edge ripples out from the centre.
        const ck = k * (0.6 + 0.4 * column.share)
        stepSpring(column, ck, c * 0.5 * Math.sqrt(ck / k), dt / steps)
      }
    }
    const settled = atRest(lift) && columns.every(atRest)
    if (settled) {
      lift.x = lift.target
      lift.v = 0
      for (const column of columns) {
        column.x = column.target
        column.v = 0
      }
    }
    draw()
    if (!settled) raf = requestAnimationFrame(frame)
  }

  // Gestures.
  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  let reduce = mqReduce.matches
  let releaseTimer = 0
  let holdTimer = 0
  let lastWheel = 0
  let lastDelta = 0
  let coasting = 0
  let cooling = false
  let lastTouchY = 0

  const root =
    scroller instanceof HTMLElement ? scroller : document.documentElement
  const atBottom = () =>
    root.scrollTop + root.clientHeight >= root.scrollHeight - 2

  const release = () => {
    window.clearTimeout(releaseTimer)
    releaseTimer = 0
    if (distance <= 0) return
    distance = 0
    cooling = true
    retarget()
  }
  const stopPlay = () => {
    if (forced === null) return
    window.clearTimeout(holdTimer)
    forced = null
    retarget()
  }

  const onWheel = (event: WheelEvent) => {
    if (reduce || event.ctrlKey) return
    const dy = wheelPixels(event)
    if (dy === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
    stopPlay()
    const now = performance.now()
    const gap = now - lastWheel
    lastWheel = now

    if (distance > 0) {
      event.preventDefault()
      // A trackpad coasting out: deltas shrink every event. Treat it as
      // letting go instead of holding the stretch until momentum ends.
      coasting = dy > 0 && Math.abs(dy) < Math.abs(lastDelta) ? coasting + 1 : 0
      lastDelta = dy
      if (coasting >= COAST_EVENTS) {
        release()
        return
      }
      distance = Math.max(0, distance + dy)
      retarget()
      window.clearTimeout(releaseTimer)
      if (distance > 0) releaseTimer = window.setTimeout(release, RELEASE_MS)
      return
    }

    // Momentum still arriving after a release shouldn't pull again.
    if (cooling) {
      if (gap < MOMENTUM_GAP_MS) return
      cooling = false
    }
    if (dy > 0 && atBottom() && !nestedCanScroll(event.target, root, dy)) {
      event.preventDefault()
      distance = dy
      lastDelta = dy
      coasting = 0
      retarget()
      releaseTimer = window.setTimeout(release, RELEASE_MS)
    }
  }

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (!touch) return
    stopPlay()
    cooling = false
    lastTouchY = touch.clientY
  }
  const onTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (!touch || reduce) return
    const dy = lastTouchY - touch.clientY
    lastTouchY = touch.clientY
    if (
      distance > 0 ||
      (dy > 0 && atBottom() && !nestedCanScroll(event.target, root, dy))
    ) {
      if (event.cancelable) event.preventDefault()
      distance = Math.max(0, distance + dy)
      retarget()
    }
  }
  const onTouchEnd = () => release()

  const onPlayEvent = (event: Event) => {
    const detail = (event as CustomEvent<StretchyFooterPlayDetail>).detail ?? {}
    // Scoped footers only answer their own demo; unscoped ones, broadcasts.
    if ((detail.target ?? null) !== (options.demoId ?? null)) return
    instance.play(detail)
  }

  const onReduce = () => {
    reduce = mqReduce.matches
    if (reduce) release()
  }

  const target: HTMLElement | Window = scroller
  const prevOverscroll = root.style.overscrollBehaviorY
  // The browser's own rubber band would fight ours.
  root.style.overscrollBehaviorY = "none"
  target.addEventListener("wheel", onWheel as EventListener, { passive: false })
  target.addEventListener("touchstart", onTouchStart as EventListener, {
    passive: true,
  })
  target.addEventListener("touchmove", onTouchMove as EventListener, {
    passive: false,
  })
  target.addEventListener("touchend", onTouchEnd)
  target.addEventListener("touchcancel", onTouchEnd)
  window.addEventListener(STRETCHY_FOOTER_PLAY, onPlayEvent)
  mqReduce.addEventListener("change", onReduce)
  const ro = new ResizeObserver(layout)
  if (canvas.parentElement) ro.observe(canvas.parentElement)

  rebuildStrip()
  rebuildColumns()
  layout()

  const instance: StretchyFooterInstance = {
    setOptions(next) {
      const prevColors = options.colors
      const prevMax = maxOf()
      const prevBlur = blurOf()
      const prevFlip = Boolean(options.flip)
      options = { ...options, ...next }
      if (options.colors !== prevColors) rebuildStrip()
      if (countOf() !== columns.length || Boolean(options.flip) !== prevFlip) {
        rebuildColumns()
      }
      if (maxOf() !== prevMax || blurOf() !== prevBlur) layout()
      if (forced !== null) forced = Math.min(forced, maxOf())
      retarget()
    },
    play({ amount = 0.82, holdMs = 700 } = {}) {
      window.clearTimeout(releaseTimer)
      window.clearTimeout(holdTimer)
      distance = 0
      forced = maxOf() * clamp(amount, 0, 1)
      retarget()
      holdTimer = window.setTimeout(stopPlay, holdMs)
    },
    destroy() {
      cancelAnimationFrame(raf)
      raf = 0
      window.clearTimeout(releaseTimer)
      window.clearTimeout(holdTimer)
      root.style.overscrollBehaviorY = prevOverscroll
      target.removeEventListener("wheel", onWheel as EventListener)
      target.removeEventListener("touchstart", onTouchStart as EventListener)
      target.removeEventListener("touchmove", onTouchMove as EventListener)
      target.removeEventListener("touchend", onTouchEnd)
      target.removeEventListener("touchcancel", onTouchEnd)
      window.removeEventListener(STRETCHY_FOOTER_PLAY, onPlayEvent)
      mqReduce.removeEventListener("change", onReduce)
      ro.disconnect()
      if (lifted) {
        lifted.style.transform = liftedTransform
        lifted.style.willChange = ""
      }
    },
  }
  return instance
}
