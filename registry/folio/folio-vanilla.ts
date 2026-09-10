export const FOLIO_PLAY = "folio:play"
export const FOLIO_IDLE_MS = 200

export type FolioPlayDetail = {
  /** Only instances whose `demoId` matches will play. */
  target?: string
  /** Nested scroller to drive. Omit for `window`. */
  scrollRoot?: HTMLElement | null
  /** How long to hold the lean before springing back, in ms. Default `420`. */
  holdMs?: number
  holdMs?: number
}

export type FolioRuntimeOptions = {
  /** Peak `rotateX` in degrees while scrolling. Default `18`. */
  maxTilt?: number
  /** Peak blur in px at the top of the sheet at full tilt. Default `6`. */
  blur?: number
  /** CSS perspective distance in px. Default `1000`. Floor `1000`. */
  perspective?: number
  /**
   * How long the lean takes to come back after the bottom, in ms.
   * Default `520`.
   */
  returnMs?: number
}

export type FolioInstance = {
  setOptions: (options: Partial<FolioRuntimeOptions>) => void
  destroy: () => void
}

const DEFAULT_TILT = 18
const DEFAULT_BLUR = 6
const DEFAULT_PERSPECTIVE = 1000
const MIN_PERSPECTIVE = 1000
const DEFAULT_RETURN_MS = 520
const VEL_REF = 2.4
const WHEEL_REF = 110
const WHEEL_SCROLL_LOCK_MS = 64
const END_SLACK_PX = 8
const SPRING_IN = { stiffness: 72, damping: 22 }
const SPRING_OUT = { stiffness: 42, damping: 18 }

type Spring = {
  set: (value: number) => void
  get: () => number
  destroy: () => void
}

function createSpring(onChange: (value: number) => void): Spring {
  let current = 0
  let target = 0
  let velocity = 0
  let raf = 0
  let lastTime = 0
  let stiffness = SPRING_IN.stiffness
  let damping = SPRING_IN.damping

  function integrate(dt: number) {
    const accel = -stiffness * (current - target) - damping * velocity
    velocity += accel * dt
    current += velocity * dt
  }

  function tick(now: number) {
    if (!lastTime) lastTime = now
    let remaining = Math.min((now - lastTime) / 1000, 0.048)
    lastTime = now
    const step = 1 / 60
    while (remaining > 0) {
      integrate(Math.min(step, remaining))
      remaining -= step
    }
    const settled =
      Math.abs(current - target) < 0.03 && Math.abs(velocity) < 0.03
    if (settled) {
      current = target
      velocity = 0
      raf = 0
      lastTime = 0
      onChange(current)
      return
    }
    onChange(current)
    raf = requestAnimationFrame(tick)
  }

  function start() {
    if (!raf) {
      lastTime = 0
      raf = requestAnimationFrame(tick)
    }
  }

  return {
    set(value) {
      target = value
      if (value === 0) {
        stiffness = SPRING_OUT.stiffness
        damping = SPRING_OUT.damping
      } else {
        stiffness = SPRING_IN.stiffness
        damping = SPRING_IN.damping
      }
      if (Math.abs(current - target) < 0.03 && Math.abs(velocity) < 0.03) {
        current = target
        velocity = 0
        onChange(current)
        return
      }
      start()
    },
    get() {
      return current
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    },
  }
}

function isWindow(scroller: HTMLElement | Window): scroller is Window {
  return scroller === window
}

function readScrollTop(scroller: HTMLElement | Window) {
  return isWindow(scroller)
    ? window.scrollY || document.documentElement.scrollTop
    : scroller.scrollTop
}

function maxScroll(scroller: HTMLElement | Window) {
  if (isWindow(scroller)) {
    return Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    )
  }
  return Math.max(0, scroller.scrollHeight - scroller.clientHeight)
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function remainingScroll(scroller: HTMLElement | Window) {
  return Math.max(0, maxScroll(scroller) - readScrollTop(scroller))
}

/** `1` in the body of the page, `0` at the bottom so the lean dies. */
function endFade(scroller: HTMLElement | Window) {
  const left = remainingScroll(scroller)
  if (left <= END_SLACK_PX) return 0
  const zone = Math.max(96, viewHeightOf(scroller) * 0.4)
  return clamp01((left - END_SLACK_PX) / zone)
}

/** Map scroll speed to a 0–1 lean. Direction is ignored — always backward. */
export function leanFromDelta(deltaPx: number, ref = WHEEL_REF) {
  return clamp01(Math.abs(deltaPx) / ref)
}

export function applyFolioFrame(
  plane: HTMLElement,
  tilt: number,
  options: FolioRuntimeOptions = {},
  reducedMotion = false
) {
  const maxTilt = Math.max(0, options.maxTilt ?? DEFAULT_TILT)
  const blur = Math.max(0, options.blur ?? DEFAULT_BLUR)
  const perspective = Math.max(
    MIN_PERSPECTIVE,
    options.perspective ?? DEFAULT_PERSPECTIVE
  )
  const angle = reducedMotion ? 0 : tilt
  const amount = maxTilt <= 0 ? 0 : Math.abs(angle) / maxTilt
  const blurPx = reducedMotion ? 0 : amount * blur

  plane.style.transformOrigin = "50% 100%"
  plane.style.backfaceVisibility = "hidden"
  plane.style.transform = `perspective(${perspective}px) rotateX(${angle}deg)`
  plane.style.filter = "none"

  const veil = ensureBlurVeil(plane)
  if (blurPx < 0.08) {
    veil.style.cssText = "display:none"
  } else {
    const ramp = `linear-gradient(to top, transparent 0%, transparent 32%, black 100%)`
    veil.style.cssText = [
      "pointer-events:none",
      "position:absolute",
      "inset:0",
      "z-index:2",
      `backdrop-filter:blur(${blurPx.toFixed(2)}px)`,
      `-webkit-backdrop-filter:blur(${blurPx.toFixed(2)}px)`,
      `mask-image:${ramp}`,
      `-webkit-mask-image:${ramp}`,
    ].join(";")
  }
  plane.style.willChange = Math.abs(angle) > 0.08 ? "transform" : "auto"
}

function animateScroll(
  scroller: HTMLElement | Window,
  to: number,
  durationMs: number,
  signal: AbortSignal
) {
  const from = readScrollTop(scroller)
  if (durationMs <= 0) {
    if (isWindow(scroller)) window.scrollTo({ top: to })
    else scroller.scrollTop = to
    return Promise.resolve()
  }

  const start = performance.now()
  return new Promise<void>((resolve) => {
    const step = (now: number) => {
      if (signal.aborted) {
        resolve()
        return
      }
      const t = Math.min(1, (now - start) / durationMs)
      const e = t * t * t * (t * (t * 6 - 15) + 10)
      const y = from + (to - from) * e
      if (isWindow(scroller)) window.scrollTo({ top: y })
      else scroller.scrollTop = y
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
}

/** Lean the page while scrolling down, then spring flat. */
export async function playFolioDemo(detail: FolioPlayDetail = {}) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<FolioPlayDetail>(FOLIO_PLAY, { detail })
  )
  const hold = detail.holdMs ?? 720
  await new Promise<void>((r) => window.setTimeout(r, hold + 1800))
}

function viewHeightOf(scroller: HTMLElement | Window) {
  return isWindow(scroller) ? window.innerHeight : scroller.clientHeight
}

function ensureBlurVeil(plane: HTMLElement) {
  let veil = plane.querySelector<HTMLElement>("[data-slot='folio-blur-veil']")
  if (!veil) {
    if (getComputedStyle(plane).position === "static") {
      plane.style.position = "relative"
    }
    veil = document.createElement("div")
    veil.dataset.slot = "folio-blur-veil"
    veil.setAttribute("aria-hidden", "true")
    plane.appendChild(veil)
  }
  return veil
}

export function createFolio(options: {
  plane: HTMLElement
  scroller: HTMLElement | Window
  demoId?: string
  maxTilt?: number
  blur?: number
  perspective?: number
  returnMs?: number
}): FolioInstance {
  const runtime: FolioRuntimeOptions = {
    maxTilt: options.maxTilt,
    blur: options.blur,
    perspective: options.perspective,
    returnMs: options.returnMs,
  }

  let reduced = false
  let playing = false
  let lastTop = readScrollTop(options.scroller)
  let lastTime = performance.now()
  let lastWheelAt = 0
  let impulse = 0
  let gate = 1
  let gateFrom = 1
  let gateTarget = 1
  let gateT0 = 0
  let gateRaf = 0
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  const playAbort = { current: new AbortController() }

  const paint = (tilt: number) => {
    applyFolioFrame(options.plane, tilt, runtime, reduced)
  }

  const spring = createSpring(paint)

  const media = window.matchMedia("(prefers-reduced-motion: reduce)")
  const applyReduce = () => {
    reduced = media.matches && !playing
    if (reduced) {
      impulse = 0
      gate = 1
      spring.set(0)
      paint(0)
    }
  }
  applyReduce()
  media.addEventListener("change", applyReduce)

  function returnMs() {
    return Math.max(0, runtime.returnMs ?? DEFAULT_RETURN_MS)
  }

  function sampleGate(now = performance.now()) {
    const ms = returnMs()
    if (ms <= 0) {
      gate = gateTarget
      return gate
    }
    const t = Math.min(1, (now - gateT0) / ms)
    const e = t * t * (3 - 2 * t)
    gate = gateFrom + (gateTarget - gateFrom) * e
    return gate
  }

  function goGate(to: number) {
    if (to === 0) {
      gate = 0
      gateFrom = 0
      gateTarget = 0
      if (gateRaf) cancelAnimationFrame(gateRaf)
      gateRaf = 0
      return
    }
    if (gateTarget !== 1) {
      gateFrom = sampleGate()
      gateTarget = 1
      gateT0 = performance.now()
    }
    if (gate >= 0.999) {
      gate = 1
      if (gateRaf) cancelAnimationFrame(gateRaf)
      gateRaf = 0
      return
    }
    if (gateRaf) return
    const tick = (now: number) => {
      sampleGate(now)
      applyLean()
      if (gateTarget === 1 && gate < 0.999) {
        gateRaf = requestAnimationFrame(tick)
      } else {
        if (gateTarget === 1) gate = 1
        gateRaf = 0
      }
    }
    gateRaf = requestAnimationFrame(tick)
  }

  function applyLean(leavingEnd = false) {
    if (reduced) {
      spring.set(0)
      return
    }
    const maxTilt = runtime.maxTilt ?? DEFAULT_TILT
    if (playing) {
      spring.set(maxTilt * Math.max(impulse, 0))
      return
    }
    const fade = leavingEnd ? 1 : endFade(options.scroller)
    if (fade <= 0.02) {
      goGate(0)
      impulse = 0
      spring.set(0)
      return
    }
    goGate(1)
    const g = sampleGate()
    spring.set(maxTilt * impulse * fade * g)
  }

  function lean(amount: number, leavingEnd = false) {
    if (reduced) return
    const next = clamp01(amount)
    impulse = Math.max(next, impulse * 0.62 + next * 0.38)
    applyLean(leavingEnd)
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      impulse = 0
      if (!playing) spring.set(0)
    }, FOLIO_IDLE_MS)
  }

  const onWheel = (event: Event) => {
    if (playing) return
    const dy = (event as WheelEvent).deltaY
    if (!dy) return
    lastWheelAt = performance.now()
    const leavingEnd = endFade(options.scroller) <= 0.02 && dy < 0
    if (!leavingEnd && endFade(options.scroller) <= 0.02) {
      goGate(0)
      impulse = 0
      spring.set(0)
      return
    }
    lean(leanFromDelta(dy), leavingEnd)
  }

  const onScroll = () => {
    const now = performance.now()
    const top = readScrollTop(options.scroller)
    const dt = Math.max(8, now - lastTime)
    const vel = (top - lastTop) / dt
    lastTop = top
    lastTime = now
    if (playing) {
      applyLean()
      return
    }
    if (endFade(options.scroller) <= 0.02) {
      goGate(0)
      impulse = 0
      spring.set(0)
      return
    }
    if (now - lastWheelAt < WHEEL_SCROLL_LOCK_MS) {
      applyLean()
      return
    }
    lean(clamp01(Math.abs(vel) / VEL_REF))
  }

  const wheelTarget: EventTarget = isWindow(options.scroller)
    ? window
    : options.scroller
  wheelTarget.addEventListener("wheel", onWheel, { passive: true })
  options.scroller.addEventListener("scroll", onScroll, { passive: true })
  const onResize = () => paint(spring.get())
  window.addEventListener("resize", onResize)

  const onPlay = (event: Event) => {
    const detail = (event as CustomEvent<FolioPlayDetail>).detail ?? {}
    if (options.demoId) {
      if (!detail.target || detail.target !== options.demoId) return
    } else if (detail.target) {
      return
    }

    playAbort.current.abort()
    playAbort.current = new AbortController()
    const signal = playAbort.current.signal
    const hold = detail.holdMs ?? 720
    const scroller = detail.scrollRoot ?? options.scroller
    const maxTilt = runtime.maxTilt ?? DEFAULT_TILT

    playing = true
    if (idleTimer) clearTimeout(idleTimer)
    applyReduce()

    void (async () => {
      const max = maxScroll(scroller)
      const zone = Math.max(96, viewHeightOf(scroller) * 0.4)
      const limit = Math.max(0, max - zone - END_SLACK_PX)
      let start = readScrollTop(scroller)
      if (start >= limit - 24) {
        impulse = 0
        gate = 1
        gateTarget = 1
        spring.set(0)
        if (isWindow(scroller)) window.scrollTo({ top: 0 })
        else scroller.scrollTop = 0
        lastTop = 0
        start = 0
      }
      const dest = Math.min(
        limit,
        start + Math.max(560, viewHeightOf(scroller) * 1.35)
      )
      impulse = 1
      gate = 1
      gateTarget = 1
      spring.set(maxTilt)
      await animateScroll(scroller, dest, Math.max(1400, hold + 700), signal)
      if (signal.aborted) {
        playing = false
        applyReduce()
        return
      }
      playing = false
      applyReduce()
      impulse = 0
      spring.set(0)
    })()
  }

  window.addEventListener(FOLIO_PLAY, onPlay)
  paint(0)

  return {
    setOptions(next) {
      if (next.maxTilt !== undefined) runtime.maxTilt = next.maxTilt
      if (next.blur !== undefined) runtime.blur = next.blur
      if (next.perspective !== undefined) runtime.perspective = next.perspective
      if (next.returnMs !== undefined) runtime.returnMs = next.returnMs
      paint(spring.get())
    },
    destroy() {
      playing = false
      playAbort.current.abort()
      if (idleTimer) clearTimeout(idleTimer)
      if (gateRaf) cancelAnimationFrame(gateRaf)
      spring.destroy()
      options.plane.querySelector("[data-slot='folio-blur-veil']")?.remove()
      media.removeEventListener("change", applyReduce)
      wheelTarget.removeEventListener("wheel", onWheel)
      options.scroller.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
      window.removeEventListener(FOLIO_PLAY, onPlay)
      options.plane.style.transform = ""
      options.plane.style.filter = ""
      options.plane.style.willChange = ""
      options.plane.style.backfaceVisibility = ""
    },
  }
}
