import {
  CanvasTexture,
  ClampToEdgeWrapping,
  CylinderGeometry,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  type Texture,
} from "three"

export type RingTowerOptions = {
  /**
   * Image URLs drawn side by side around every band. Cross-origin images
   * need CORS headers. Empty draws a plain grid band.
   */
  images?: string[]
  /** Number of stacked bands. Default `12`, 1 to 24. */
  rings?: number
  /** How fast the images crawl around the bands. Default `1`, 0 to 4. */
  speed?: number
  /** Drag a band to spin the tower, with inertia. Default `true`. */
  draggable?: boolean
  /**
   * How far, in degrees, the pointer turns each band. Neighbors turn the
   * opposite way. Default `24`, 0 to 90. `0` keeps every band in step.
   */
  parallax?: number
  /** How dark the inside of the bands is, 0 to 1. Default `0.86`. */
  backface?: number
}

export type RingTowerInstance = {
  setOptions: (options: Partial<RingTowerOptions>) => void
  destroy: () => void
}

export const DEFAULT_RINGS = 12
export const DEFAULT_SPEED = 1
export const DEFAULT_PARALLAX = 24
export const DEFAULT_BACKFACE = 0.86

const RADIUS = 4
const BAND_HEIGHT = 2
const SPACING = 3.5
const TILT = 0.25
const SEGMENTS = 100
const STRIP_HEIGHT = 512
const CRAWL = 0.012
const START_ANGLE = 0.5
/** Lean cycle per ring; signs alternate so neighbors counter-turn. */
const PARALLAX_FACTORS = [1, -0.75, 1.25, -0.9]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function numberOr(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return clamp(value, min, max)
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.decoding = "async"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`RingTower: failed to load ${url}`))
    img.src = url
  })
}

type Strip = { canvas: HTMLCanvasElement; aspect: number }

/** Draws the images side by side at one height on a white strip. */
function stitch(images: HTMLImageElement[], maxSize: number): Strip | null {
  const sizes = images.map((img) => {
    const aspect = img.naturalWidth / Math.max(1, img.naturalHeight)
    return { img, width: STRIP_HEIGHT * aspect }
  })
  const width = sizes.reduce((sum, s) => sum + s.width, 0)
  if (width <= 0) return null

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  const scale = Math.min(
    Math.min(window.devicePixelRatio || 1, 2),
    maxSize / width,
    maxSize / STRIP_HEIGHT
  )
  canvas.width = Math.max(1, Math.floor(width * scale))
  canvas.height = Math.max(1, Math.floor(STRIP_HEIGHT * scale))
  ctx.scale(scale, scale)
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, STRIP_HEIGHT)
  let x = 0
  for (const s of sizes) {
    ctx.drawImage(s.img, x, 0, s.width, STRIP_HEIGHT)
    x += s.width
  }
  return { canvas, aspect: width / STRIP_HEIGHT }
}

/** Plain green grid band, used when no image loads. */
function gridStrip(): Strip | null {
  const canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  const fill = ctx.createLinearGradient(0, 0, 0, 512)
  fill.addColorStop(0, "#36C26A")
  fill.addColorStop(1, "#22A653")
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, 1024, 512)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)"
  ctx.lineWidth = 2
  for (let i = 0; i <= 1024; i += 32) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, 512)
    ctx.stroke()
  }
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(1024, i)
    ctx.stroke()
  }
  return { canvas, aspect: 2 }
}

/**
 * A tower of open, tilted cylinder bands wrapped in a strip of images, after
 * the vuemail.dev hero. Each band leans a quarter turn from the last, so the
 * stack zig-zags. The images crawl around the bands, dragging spins the
 * tower with inertia, and the pointer turns neighboring bands opposite ways.
 * The canvas is transparent; the parent paints the background. Pauses
 * off-screen and in hidden tabs; holds still under `prefers-reduced-motion`.
 */
export function createRingTower(
  root: HTMLElement,
  initial: RingTowerOptions = {}
): RingTowerInstance | null {
  let options: RingTowerOptions = { draggable: true, ...initial }

  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(Math.max(1, window.devicePixelRatio), 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  const canvas = renderer.domElement
  canvas.style.display = "block"
  canvas.style.touchAction = "pan-y"
  root.appendChild(canvas)

  const scene = new Scene()
  const camera = new PerspectiveCamera(7, 1, 0.01, 1e5)
  camera.position.set(0, 0, 70)
  const tower = new Group()
  tower.rotation.set(-0.2, START_ANGLE, 0.2)
  scene.add(tower)

  const geometry = new CylinderGeometry(
    RADIUS,
    RADIUS,
    BAND_HEIGHT,
    SEGMENTS,
    1,
    true
  )
  const backface = { value: DEFAULT_BACKFACE }

  type Band = { mesh: Mesh; material: MeshBasicMaterial; texture: Texture }
  let bands: Band[] = []
  let strip: Strip | null = null
  let base: CanvasTexture | null = null
  let tiles = 1

  const makeMaterial = (map: Texture) => {
    const material = new MeshBasicMaterial({
      map,
      side: DoubleSide,
      toneMapped: false,
    })
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uBackface = backface
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", "uniform float uBackface;\nvoid main() {")
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          if (!gl_FrontFacing) {
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.0), uBackface);
          }`
        )
    }
    material.customProgramCacheKey = () => "ring-tower"
    return material
  }

  const clearBands = () => {
    for (const band of bands) {
      tower.remove(band.mesh)
      band.material.dispose()
      if (band.texture !== base) band.texture.dispose()
    }
    bands = []
  }

  // Whole tiles around the band keep the seam invisible; the strip is then
  // cropped top and bottom to hold its proportions.
  const fit = (texture: Texture, aspect: number) => {
    const around = (2 * Math.PI * RADIUS) / BAND_HEIGHT
    const whole = Math.floor(around / aspect)
    if (whole >= 1) {
      tiles = whole
      texture.repeat.set(whole, Math.min(1, (aspect * whole) / around))
      texture.offset.y = (1 - texture.repeat.y) / 2
    } else {
      tiles = around / aspect
      texture.repeat.set(tiles, 1)
      texture.offset.y = 0
    }
  }

  const buildBands = () => {
    clearBands()
    if (!base) return
    const count = Math.round(numberOr(options.rings, DEFAULT_RINGS, 1, 24))
    const middle = Math.ceil(count / 2) - 1
    for (let i = 0; i < count; i++) {
      // Clones share the image source, so the strip uploads once.
      const texture = i === 0 ? base : base.clone()
      const material = makeMaterial(texture)
      const mesh = new Mesh(geometry, material)
      mesh.rotation.set(0, i * Math.PI * 0.5, TILT)
      mesh.position.set(0, (i - middle) * SPACING, 0)
      tower.add(mesh)
      bands.push({ mesh, material, texture })
    }
  }

  const setStrip = (next: Strip | null) => {
    clearBands()
    base?.dispose()
    base = null
    strip = next
    if (!strip) return
    const texture = new CanvasTexture(strip.canvas)
    texture.wrapS = RepeatWrapping
    texture.wrapT = ClampToEdgeWrapping
    texture.generateMipmaps = false
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    fit(texture, strip.aspect)
    base = texture
    buildBands()
    wake()
  }

  let loadToken = 0
  let imagesKey = ""
  const loadImages = () => {
    const urls = (options.images ?? []).filter(
      (url) => typeof url === "string" && url.length > 0
    )
    const key = urls.join("\n")
    if (key === imagesKey && strip) return
    imagesKey = key
    const token = ++loadToken
    if (urls.length === 0) {
      setStrip(gridStrip())
      return
    }
    void Promise.allSettled(urls.map(loadImage)).then((results) => {
      if (token !== loadToken || destroyed) return
      const loaded = results.flatMap((r) =>
        r.status === "fulfilled" ? [r.value] : []
      )
      const next = loaded.length
        ? stitch(loaded, renderer.capabilities.maxTextureSize)
        : null
      setStrip(next ?? gridStrip())
    })
  }

  const size = { width: 0, height: 0 }
  const resize = () => {
    const { width, height } = root.getBoundingClientRect()
    size.width = width
    size.height = height
    if (width <= 0 || height <= 0) return
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    wake()
  }

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  let onScreen = true
  let raf = 0
  let destroyed = false
  let lost = false
  let last = 0
  let crawl = 0
  let angle = START_ANGLE
  let velocity = 0
  let dragging = false
  let dragX = 0
  let pointerX = 0
  let pointerTarget = 0

  const visible = () => onScreen && document.visibilityState !== "hidden"

  function wake() {
    if (raf || destroyed || lost) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  const tick = (now: number) => {
    raf = 0
    if (lost) return
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    if (!visible()) return
    const still = mqReduce.matches

    if (!still) {
      // In texture units, so wrapping at 1 never shows a jump.
      crawl += dt * CRAWL * tiles * numberOr(options.speed, DEFAULT_SPEED, 0, 4)
      crawl %= 1
    }
    if (!dragging) {
      if (still) velocity = 0
      angle += velocity * dt
      velocity *= Math.pow(0.95, dt * 60)
      if (Math.abs(velocity) < 1e-4) velocity = 0
    }
    tower.rotation.y = angle

    const ease = 1 - Math.exp(-dt * 4)
    const target = still ? 0 : pointerTarget
    pointerX += (target - pointerX) * ease
    const reach =
      (numberOr(options.parallax, DEFAULT_PARALLAX, 0, 90) / 360) * tiles
    bands.forEach((band, i) => {
      const factor = PARALLAX_FACTORS[i % PARALLAX_FACTORS.length]!
      band.texture.offset.x = crawl + pointerX * reach * factor
    })

    if (size.width > 0 && size.height > 0) renderer.render(scene, camera)

    const moving =
      !still || dragging || velocity !== 0 || Math.abs(target - pointerX) > 1e-4
    if (moving) raf = requestAnimationFrame(tick)
  }

  const raycaster = new Raycaster()
  const ndc = new Vector2()
  const hits = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )
    raycaster.setFromCamera(ndc, camera)
    return raycaster.intersectObjects(tower.children, false).length > 0
  }

  const setCursor = (value: string) => {
    if (canvas.style.cursor !== value) canvas.style.cursor = value
  }

  const onWindowMove = (e: PointerEvent) => {
    const rect = root.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1
    pointerTarget = inside ? clamp(x * 2 - 1, -1, 1) : 0
    wake()
  }
  window.addEventListener("pointermove", onWindowMove, { passive: true })

  const onDown = (e: PointerEvent) => {
    if (options.draggable === false || !hits(e)) return
    dragging = true
    dragX = e.clientX
    velocity = 0
    canvas.setPointerCapture(e.pointerId)
    setCursor("grabbing")
    wake()
  }
  const onMove = (e: PointerEvent) => {
    if (dragging) {
      const delta =
        ((e.clientX - dragX) / Math.max(1, size.width)) * Math.PI * 2
      angle += delta
      velocity = delta * 60
      dragX = e.clientX
      return
    }
    setCursor(options.draggable !== false && hits(e) ? "grab" : "")
  }
  const onUp = (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId)
    }
    setCursor(hits(e) ? "grab" : "")
    wake()
  }
  const onLeave = () => {
    if (!dragging) setCursor("")
  }
  canvas.addEventListener("pointerdown", onDown)
  canvas.addEventListener("pointermove", onMove)
  canvas.addEventListener("pointerup", onUp)
  canvas.addEventListener("pointercancel", onUp)
  canvas.addEventListener("pointerleave", onLeave)

  const ro = new ResizeObserver(resize)
  ro.observe(root)
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true
    wake()
  })
  io.observe(root)
  const onVisibility = () => wake()
  document.addEventListener("visibilitychange", onVisibility)
  const onReduce = () => wake()
  mqReduce.addEventListener("change", onReduce)

  // three restores its own state; the loop just has to stop and resume.
  const onLost = () => {
    lost = true
    cancelAnimationFrame(raf)
    raf = 0
  }
  const onRestored = () => {
    if (destroyed) return
    lost = false
    if (base) base.needsUpdate = true
    wake()
  }
  canvas.addEventListener("webglcontextlost", onLost)
  canvas.addEventListener("webglcontextrestored", onRestored)

  const applyBackface = () => {
    backface.value = numberOr(options.backface, DEFAULT_BACKFACE, 0, 1)
  }

  applyBackface()
  resize()
  loadImages()
  wake()

  return {
    setOptions(next) {
      const prevRings = options.rings
      options = { ...options, ...next }
      applyBackface()
      if (options.draggable === false) {
        dragging = false
        setCursor("")
      }
      if (options.rings !== prevRings) buildBands()
      loadImages()
      wake()
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      raf = 0
      ro.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      mqReduce.removeEventListener("change", onReduce)
      window.removeEventListener("pointermove", onWindowMove)
      canvas.removeEventListener("pointerdown", onDown)
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerup", onUp)
      canvas.removeEventListener("pointercancel", onUp)
      canvas.removeEventListener("pointerleave", onLeave)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      clearBands()
      base?.dispose()
      geometry.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
