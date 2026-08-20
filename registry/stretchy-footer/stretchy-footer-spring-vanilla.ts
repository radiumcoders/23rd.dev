export type SpringOptions = {
  stiffness: number
  damping: number
  mass: number
  restDelta?: number
  restSpeed?: number
  /** Start position. Default `0`. */
  initial?: number
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
  initial = 0,
}: SpringOptions): Spring {
  let current = initial
  let target = initial
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
