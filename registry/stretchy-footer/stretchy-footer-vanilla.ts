export const DEFAULT_COLORS = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#00C7BE",
  "#32ADE6",
  "#007AFF",
  "#5856D6",
  "#AF52DE",
  "#FF2D55",
]

export const DEFAULT_COLUMNS = 48
export const WHEEL_IDLE_MS = 90
export const PULL_GAIN = 0.7
export const POP_BOOST = 1.45

/** Docs / demos — dispatch to play the rubber stretch without faking wheel input. */
export const STRETCHY_FOOTER_PLAY = "stretchy-footer:play"

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

export async function scrollToEnd(root?: HTMLElement | null) {
  if (root) {
    const max = Math.max(0, root.scrollHeight - root.clientHeight)
    root.scrollTo({ top: max, behavior: "smooth" })
    const started = performance.now()
    while (performance.now() - started < 2000) {
      if (root.scrollTop >= max - 2) break
      await new Promise<void>((r) => window.setTimeout(r, 32))
    }
    root.scrollTo({ top: max })
    return
  }

  const max = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  )
  window.scrollTo({ top: max, behavior: "smooth" })
  const started = performance.now()
  while (performance.now() - started < 2000) {
    const top = window.scrollY || document.documentElement.scrollTop
    if (top >= max - 2) break
    await new Promise<void>((r) => window.setTimeout(r, 32))
  }
  window.scrollTo({ top: max })
}

/** Scroll to the end, then play the stretch on matching footers. */
export async function playStretchyFooterDemo(
  detail: StretchyFooterPlayDetail = {}
) {
  if (typeof window === "undefined") return

  await scrollToEnd(detail.scrollRoot)

  window.dispatchEvent(
    new CustomEvent<StretchyFooterPlayDetail>(STRETCHY_FOOTER_PLAY, {
      detail,
    })
  )

  const hold = detail.holdMs ?? 700
  // Travel out + hold + spring home
  await new Promise<void>((r) => window.setTimeout(r, hold + 900))
}

export function columnScale(index: number, count: number): number {
  if (count <= 1) return 1
  const t = (index / (count - 1)) * 2 - 1
  return Math.exp(-t * t * 2.2)
}

/** Stable rgba() for SSR — avoids hex/rgb serialization mismatches. */
export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "")
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.slice(0, 6)
  const r = Number.parseInt(full.slice(0, 2), 16)
  const g = Number.parseInt(full.slice(2, 4), 16)
  const b = Number.parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function applyResistance(current: number, delta: number, max: number): number {
  const t = Math.min(1, Math.max(0, current / max))
  const falloff = (1 - t) * (1 - t * 0.35)
  const pop = current < 40 ? POP_BOOST : 1
  return Math.min(max, Math.max(0, current + delta * PULL_GAIN * falloff * pop))
}

export function elementAtBottom(el: HTMLElement, slack = 1): boolean {
  return el.scrollTop + el.clientHeight >= el.scrollHeight - slack
}

export function windowAtBottom(slack = 1): boolean {
  const doc = document.documentElement
  return window.scrollY + window.innerHeight >= doc.scrollHeight - slack
}

export type SpringOptions = {
  stiffness: number
  damping: number
  mass: number
  restDelta?: number
  restSpeed?: number
}

export type Spring = {
  set: (value: number) => void
  get: () => number
  onChange: (fn: (value: number) => void) => () => void
  destroy: () => void
}

/**
 * Damped spring for the Svelte port (React keeps motion springs).
 * Semi-implicit Euler with a 60 Hz substep.
 */
export function createSpring({
  stiffness,
  damping,
  mass,
  restDelta = 0.2,
  restSpeed = 0.2,
}: SpringOptions): Spring {
  let current = 0
  let target = 0
  let velocity = 0
  let raf = 0
  let lastTime = 0
  const listeners = new Set<(value: number) => void>()

  function emit() {
    for (const fn of listeners) fn(current)
  }

  function integrate(dt: number) {
    const springForce = -stiffness * (current - target)
    const dampingForce = -damping * velocity
    const accel = (springForce + dampingForce) / mass
    velocity += accel * dt
    current += velocity * dt
  }

  function tick(now: number) {
    if (!lastTime) lastTime = now
    let remaining = Math.min((now - lastTime) / 1000, 0.064)
    lastTime = now

    const step = 1 / 60
    while (remaining > 0) {
      integrate(Math.min(step, remaining))
      remaining -= step
    }

    const settled =
      Math.abs(current - target) < restDelta && Math.abs(velocity) < restSpeed

    if (settled) {
      current = target
      velocity = 0
      raf = 0
      lastTime = 0
      emit()
      return
    }

    emit()
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
      if (
        Math.abs(current - target) < restDelta &&
        Math.abs(velocity) < restSpeed
      ) {
        current = target
        velocity = 0
        emit()
        return
      }
      start()
    },
    get() {
      return current
    },
    onChange(fn) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      listeners.clear()
    },
  }
}
