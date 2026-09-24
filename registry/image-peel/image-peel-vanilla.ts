export const IMAGE_PEEL_PLAY = "image-peel:play"
/** Strips used to roll an edge peel into a cylinder. */
export const IMAGE_PEEL_STRIPS = 42
/** Cells along each side of a corner peel. */
export const IMAGE_PEEL_GRID = 26
/** Curl radius as a fraction of the peel axis. */
const RADIUS = 0.16

/** Paper on the back of the sheet in light mode. */
export const LIGHT_BACK = "#F7F3EC"
/** Paper on the back of the sheet in dark mode. */
export const DARK_BACK = "#2A2622"

export type ImagePeelSide =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"

export type ImagePeelTheme = "light" | "dark" | "auto"

export type ImagePeelRuntimeOptions = {
  /**
   * Edge or corner that lifts first.
   * Default `"bottom"`.
   */
  side?: ImagePeelSide
  /**
   * How much of the sheet peels away at the end of the scroll, from 0 to 1.
   * `1` clears the sheet. `0.5` stops halfway, curl still resting on the page.
   * Default `1`.
   */
  amount?: number
  /**
   * Paper color on the back of the curl.
   * `"auto"` follows `html.dark` / `html.light`, then `data-theme`, then the system.
   * Default `"auto"`.
   */
  theme?: ImagePeelTheme
}

export type ImagePeelPlayDetail = {
  /** Only instances whose `demoId` matches will play. */
  target?: string
}

export type ImagePeelInstance = {
  setOptions: (options: Partial<ImagePeelRuntimeOptions>) => void
  destroy: () => void
}

const SIDES = new Set<ImagePeelSide>([
  "top",
  "right",
  "bottom",
  "left",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
])

const THEMES = new Set<ImagePeelTheme>(["light", "dark", "auto"])

type Pose = {
  hidden: boolean
  rotate: number
  shift: number
  lift: number
  shade: number
  front: boolean
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function normalizeSide(side: string | undefined): ImagePeelSide {
  if (side && SIDES.has(side as ImagePeelSide)) return side as ImagePeelSide
  return "bottom"
}

export function normalizeTheme(theme: string | undefined): ImagePeelTheme {
  if (theme && THEMES.has(theme as ImagePeelTheme))
    return theme as ImagePeelTheme
  return "auto"
}

/** `html.dark` / `html.light`, then `data-theme`, then the system scheme. */
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

export function resolveDark(theme: ImagePeelTheme | undefined): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

export function peelBackColor(theme: ImagePeelTheme | undefined) {
  return resolveDark(theme) ? DARK_BACK : LIGHT_BACK
}

function isHorizontal(side: ImagePeelSide) {
  return side === "top" || side === "bottom"
}

export function isCornerSide(side: ImagePeelSide) {
  return (
    side === "top-left" ||
    side === "top-right" ||
    side === "bottom-left" ||
    side === "bottom-right"
  )
}

function cornerProgress(
  strip: HTMLElement,
  grid: number,
  corner: { x: number; y: number }
) {
  const safe = Math.max(1, grid)
  const col = Number(strip.dataset.col ?? "0")
  const row = Number(strip.dataset.row ?? "0")
  const u = (col + 0.5) / safe
  const v = (row + 0.5) / safe
  const dx = corner.x < 0 ? 1 - u : u
  const dy = corner.y < 0 ? 1 - v : v
  return (dx + dy) / 2
}

/** Unit step from the peeling corner into the sheet. Y grows downward. */
export function cornerDirection(side: ImagePeelSide) {
  switch (side) {
    case "top-left":
      return { x: 1, y: 1 }
    case "top-right":
      return { x: -1, y: 1 }
    case "bottom-left":
      return { x: 1, y: -1 }
    case "bottom-right":
      return { x: -1, y: -1 }
    default:
      return null
  }
}

/**
 * `u` is the strip center along the sheet, 0 at the top or left and 1 at
 * the bottom or right. The sheet stays flat until the tangent reaches it,
 * then rides a cylinder back over the part that is still stuck down.
 */
export function imagePeelPose(
  u: number,
  side: ImagePeelSide,
  progress: number,
  amount: number,
  radius = RADIUS
): Pose {
  const curl = radius > 0 ? radius : RADIUS
  const fromEnd = side === "bottom" || side === "right"
  const covered = clamp01(amount)
  const travel = clamp01(progress)
  const tail = covered > 0.999 ? Math.PI * curl : 0
  const distance = travel * (covered + tail)
  const tangent = fromEnd ? 1 - distance : distance
  const past = fromEnd ? u - tangent : tangent - u

  if (past <= 0) {
    const band = past > -curl ? 1 - -past / curl : 0
    const shade = Math.max(0, band) * 0.55 * Math.min(1, distance * 8)
    return {
      hidden: false,
      rotate: 0,
      shift: 0,
      lift: 0,
      shade,
      front: true,
    }
  }

  const theta = past / curl
  if (theta >= Math.PI) {
    return {
      hidden: true,
      rotate: 0,
      shift: 0,
      lift: 0,
      shade: 0,
      front: false,
    }
  }

  const dir = fromEnd ? -1 : 1
  const visualU = tangent + dir * curl * Math.sin(theta)
  const front = theta <= Math.PI / 2
  const rotMag = front ? theta : Math.PI - theta
  const sign = side === "top" || side === "left" ? -1 : 1

  return {
    hidden: false,
    rotate: sign * rotMag * (180 / Math.PI),
    shift: visualU - u,
    lift: curl * (1 - Math.cos(theta)),
    shade: (1 - Math.abs(Math.cos(theta))) * 0.78,
    front,
  }
}

function scrollParent(el: HTMLElement): HTMLElement | Window {
  let parent = el.parentElement
  while (
    parent &&
    parent !== document.body &&
    parent !== document.documentElement
  ) {
    const style = getComputedStyle(parent)
    const overflow = `${style.overflowY} ${style.overflow}`
    if (/(auto|scroll|overlay)/.test(overflow)) return parent
    parent = parent.parentElement
  }
  return window
}

function isWindow(scroller: HTMLElement | Window): scroller is Window {
  return scroller === window
}

function viewBox(scroller: HTMLElement | Window) {
  if (isWindow(scroller)) {
    return { top: 0, height: window.innerHeight }
  }
  const rect = scroller.getBoundingClientRect()
  return { top: rect.top, height: scroller.clientHeight }
}

function scrollProgress(root: HTMLElement, scroller: HTMLElement | Window) {
  const view = viewBox(scroller)
  const travel = root.offsetHeight - view.height
  if (travel <= 1) return 0
  const scrolled = view.top - root.getBoundingClientRect().top
  return clamp01(scrolled / travel)
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function playImagePeel(detail: ImagePeelPlayDetail = {}) {
  if (typeof window === "undefined") return Promise.resolve()
  window.dispatchEvent(
    new CustomEvent<ImagePeelPlayDetail>(IMAGE_PEEL_PLAY, { detail })
  )
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 1900)
  })
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

export function createImagePeel(
  root: HTMLElement,
  options: ImagePeelRuntimeOptions & { demoId?: string } = {}
): ImagePeelInstance {
  const runtime: Required<
    Pick<ImagePeelRuntimeOptions, "side" | "amount" | "theme">
  > = {
    side: normalizeSide(options.side),
    amount: options.amount ?? 1,
    theme: normalizeTheme(options.theme),
  }
  const demoId = options.demoId
  const stage = root.querySelector<HTMLElement>("[data-peel-stage]")
  const sheet = root.querySelector<HTMLElement>("[data-peel-sheet]")
  const drop = root.querySelector<HTMLElement>("[data-peel-drop]")

  let frame = 0
  let playing = 0
  let driving = false
  let destroyed = false
  let waitingForImage = false
  let reduce = prefersReducedMotion()

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const onMotion = () => {
    reduce = motion.matches
    schedule()
  }
  motion.addEventListener("change", onMotion)

  const themeRoot = document.documentElement
  const onTheme = () => schedule()
  const themeObserver = new MutationObserver(onTheme)
  themeObserver.observe(themeRoot, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  })
  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)")
  colorScheme.addEventListener("change", onTheme)

  function strips() {
    if (!sheet) return []
    return Array.from(sheet.querySelectorAll<HTMLElement>("[data-peel-strip]"))
  }

  function fitSticker() {
    if (!stage || !sheet) return
    const img = sheet.querySelector("img")
    if (!img) return
    if (!img.complete || !img.naturalWidth) {
      if (!waitingForImage) {
        waitingForImage = true
        img.addEventListener(
          "load",
          () => {
            waitingForImage = false
            schedule()
          },
          { once: true }
        )
      }
      return
    }
    waitingForImage = false
    const ratio = img.naturalWidth / img.naturalHeight
    const availW = stage.clientWidth * 0.84
    const availH = stage.clientHeight * 0.84
    if (availW < 2 || availH < 2) return
    let width = availW
    let height = width / ratio
    if (height > availH) {
      height = availH
      width = height * ratio
    }
    const left = (stage.clientWidth - width) / 2
    const top = (stage.clientHeight - height) / 2
    sheet.style.width = `${width}px`
    sheet.style.height = `${height}px`
    sheet.style.left = `${left}px`
    sheet.style.top = `${top}px`
    if (drop) {
      drop.style.width = `${width}px`
      drop.style.height = `${height}px`
      drop.style.left = `${left}px`
      drop.style.top = `${top + Math.min(22, height * 0.035)}px`
    }
  }

  function apply(progress: number) {
    if (!stage || !sheet) return
    const scroller = scrollParent(root)
    const view = viewBox(scroller)
    if (reduce) {
      root.style.height = `${view.height}px`
    } else {
      root.style.height = ""
    }
    stage.style.height = `${Math.max(1, view.height)}px`
    fitSticker()

    const amount = clamp01(runtime.amount)
    const horizontal = isHorizontal(runtime.side)
    const corner = cornerDirection(runtime.side)
    const faces = strips()
    const count = Math.max(1, faces.length)
    const grid = Number(sheet.dataset.peelGrid || 0)
    const axis = horizontal ? sheet.clientHeight : sheet.clientWidth
    const safeAxis = Math.max(1, axis)
    const posed = reduce ? 0 : progress
    const backColor = peelBackColor(runtime.theme)
    const backShadow = resolveDark(runtime.theme)
      ? "inset 0 0 22px rgba(0,0,0,0.55)"
      : "inset 0 0 22px rgba(80,60,30,0.16)"

    for (const strip of faces) {
      const backFace = strip.querySelector<HTMLElement>("[data-peel-back]")
      if (backFace) {
        backFace.style.background = backColor
        backFace.style.boxShadow = backShadow
      }
      const index = Number(strip.dataset.index ?? "0")
      const u = (index + 0.5) / count
      const diag = Math.hypot(sheet.clientWidth, sheet.clientHeight)
      const shortSide = Math.max(
        1,
        Math.min(sheet.clientWidth, sheet.clientHeight)
      )
      const pose = corner
        ? imagePeelPose(
            cornerProgress(strip, grid, corner),
            "top",
            posed,
            amount,
            (RADIUS * shortSide) / Math.max(1, diag)
          )
        : imagePeelPose(u, runtime.side, posed, amount)
      const front = strip.querySelector<HTMLElement>("[data-peel-front]")
      const back = strip.querySelector<HTMLElement>("[data-peel-back]")
      const shades = strip.querySelectorAll<HTMLElement>("[data-peel-shade]")

      if (reduce) {
        strip.style.opacity = "1"
        strip.style.pointerEvents = "auto"
        strip.style.transform = "none"
        if (front) front.style.visibility = "visible"
        if (back) back.style.visibility = "hidden"
        for (const shade of shades) shade.style.opacity = "0"
        continue
      }

      const hidden = pose.hidden
      strip.style.opacity = hidden ? "0" : "1"
      strip.style.pointerEvents = hidden ? "none" : "auto"
      strip.style.zIndex = hidden
        ? "0"
        : String(10 + Math.round(pose.lift * 100))
      if (hidden) {
        strip.style.transform = "none"
      } else if (corner) {
        const along = pose.shift * diag
        const unit = 1 / Math.hypot(corner.x, corner.y)
        const shiftX = along * corner.x * unit
        const shiftY = along * corner.y * unit
        const liftPx = pose.lift * diag
        strip.style.transform = `translate3d(${shiftX}px, ${shiftY}px, ${liftPx}px) rotate3d(${corner.y}, ${-corner.x}, 0, ${pose.rotate}deg)`
      } else {
        const shiftPx = pose.shift * safeAxis
        const liftPx = pose.lift * safeAxis
        const rotate = horizontal
          ? `rotateX(${pose.rotate}deg)`
          : `rotateY(${pose.rotate}deg)`
        const translate = horizontal
          ? `translate3d(0px, ${shiftPx}px, ${liftPx}px)`
          : `translate3d(${shiftPx}px, 0px, ${liftPx}px)`
        strip.style.transform = `${translate} ${rotate}`
      }
      if (front)
        front.style.visibility = pose.front && !hidden ? "visible" : "hidden"
      if (back)
        back.style.visibility = !pose.front && !hidden ? "visible" : "hidden"
      for (const shade of shades)
        shade.style.opacity = hidden ? "0" : String(pose.shade)
    }

    if (drop) {
      const left = reduce ? 1 : 1 - clamp01(progress) * clamp01(amount)
      drop.style.opacity = String(0.55 * left)
    }
  }

  function applyFromScroll() {
    if (playing) return
    const scroller = scrollParent(root)
    apply(scrollProgress(root, scroller))
  }

  function schedule() {
    if (destroyed || frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      applyFromScroll()
    })
  }

  function onScroll() {
    if (driving) return
    if (playing) {
      window.cancelAnimationFrame(playing)
      playing = 0
    }
    schedule()
  }

  const scrollers = new Set<EventTarget>()
  function bindScrollers() {
    for (const target of scrollers) {
      target.removeEventListener("scroll", onScroll)
    }
    scrollers.clear()
    const parent = scrollParent(root)
    parent.addEventListener("scroll", onScroll, { passive: true })
    scrollers.add(parent)
    if (parent !== window) {
      window.addEventListener("scroll", onScroll, { passive: true })
      scrollers.add(window)
    }
  }

  bindScrollers()
  const resize = new ResizeObserver(() => {
    bindScrollers()
    schedule()
  })
  resize.observe(root)
  if (root.parentElement) resize.observe(root.parentElement)
  schedule()

  function scrollToProgress(progress: number) {
    const scroller = scrollParent(root)
    const view = viewBox(scroller)
    const travel = Math.max(0, root.offsetHeight - view.height)
    const desiredTop = view.top - progress * travel
    const delta = desiredTop - root.getBoundingClientRect().top
    driving = true
    if (isWindow(scroller)) {
      window.scrollTo(0, window.scrollY + delta)
    } else {
      scroller.scrollTop += delta
    }
    driving = false
  }

  function animateProgress(from: number, to: number, ms: number) {
    const start = performance.now()
    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        if (destroyed || !playing) {
          resolve()
          return
        }
        const t = Math.min(1, (now - start) / ms)
        const value = from + (to - from) * easeInOut(t)
        scrollToProgress(value)
        apply(value)
        if (t >= 1) {
          resolve()
          return
        }
        playing = requestAnimationFrame(step)
      }
      playing = requestAnimationFrame(step)
    })
  }

  async function onPlay(event: Event) {
    const detail = (event as CustomEvent<ImagePeelPlayDetail>).detail ?? {}
    if (detail.target && detail.target !== demoId) return
    if (reduce || destroyed) return
    if (playing) {
      window.cancelAnimationFrame(playing)
      playing = 0
    }
    playing = requestAnimationFrame(() => {})
    await animateProgress(scrollProgress(root, scrollParent(root)), 1, 780)
    await new Promise<void>((resolve) => window.setTimeout(resolve, 320))
    if (destroyed || !playing) return
    await animateProgress(1, 0, 780)
    playing = 0
    applyFromScroll()
  }

  window.addEventListener(IMAGE_PEEL_PLAY, onPlay)

  return {
    setOptions(next) {
      if (next.side !== undefined) runtime.side = normalizeSide(next.side)
      if (next.amount !== undefined) runtime.amount = next.amount
      if (next.theme !== undefined) runtime.theme = normalizeTheme(next.theme)
      schedule()
    },
    destroy() {
      destroyed = true
      if (frame) cancelAnimationFrame(frame)
      if (playing) cancelAnimationFrame(playing)
      frame = 0
      playing = 0
      motion.removeEventListener("change", onMotion)
      colorScheme.removeEventListener("change", onTheme)
      themeObserver.disconnect()
      window.removeEventListener(IMAGE_PEEL_PLAY, onPlay)
      for (const target of scrollers) {
        target.removeEventListener("scroll", onScroll)
      }
      scrollers.clear()
      resize.disconnect()
      root.style.height = ""
      if (stage) stage.style.height = ""
    },
  }
}
