import {
  AnimationMixer,
  Box3,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  NoBlending,
  OrthographicCamera,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Sphere,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  Vector4,
  VideoTexture,
  WebGLRenderer,
  WebGLRenderTarget,
  type AnimationClip,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three"
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"
import { STLLoader } from "three/addons/loaders/STLLoader.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

export type ShaderWatercolorTheme = "light" | "dark" | "auto"

export type ShaderWatercolorMode = "color" | "monochrome"

export type ShaderWatercolorKind = "image" | "video" | "model"

export type ShaderWatercolorOptions = {
  /**
   * What to paint: an image or SVG URL, a 3D model URL (`.glb`, `.gltf`,
   * `.obj`, `.stl`), a video (`.mp4`, `.webm`, `.mov`), or inline `<svg>`
   * markup. The format is read from the file itself, so blob URLs from an
   * upload work. Cross-origin files need CORS. Videos play muted and loop.
   */
  src?: string
  /**
   * A `<video>` or `<canvas>` you drive yourself, painted live every frame.
   * Wins over `src`. It stays yours: the component never pauses or clears it.
   */
  media?: HTMLVideoElement | HTMLCanvasElement
  /** `color` keeps the subject's own colors; `monochrome` paints it in one ink. Default `color`. */
  mode?: ShaderWatercolorMode
  /** Ink for `monochrome`. Default follows theme. */
  ink?: string
  /** Paper color, or `transparent` to paint straight onto the page. Default follows theme. */
  paper?: string
  /** How far the paint bleeds and drifts, 0–1. Default `0.5`. */
  wetness?: number
  /** Pigment pooling along the edges of each wash, 0–1. Default `0.35`. */
  edges?: number
  /** Paper tooth and pigment granulation, 0–1. Default `0.5`. */
  grain?: number
  /** How fast the wet paint drifts. `0` holds it still. Default `0.3`. */
  speed?: number
  /** Degrees per second a 3D model turns. Default `12`. */
  spin?: number
  /** Share of the frame the subject fills, 0.2–1. Default `0.84`. */
  scale?: number
  /**
   * Set a model in a painted still life, a tabletop and a wall behind it,
   * framed like a canvas. `false` floats the model on bare paper.
   * Default `true`.
   */
  backdrop?: boolean
  /** Width over height of a model's framed canvas. Default `0.8`, a portrait. */
  aspect?: number
  /** The pointer re-wets the paint it passes over, and a model leans toward it. Default `true`. */
  interactive?: boolean
  /** Paint blooms onto the paper when the subject loads. Default `true`. */
  reveal?: boolean
  /**
   * Paper and ink. Default `auto` follows shadcn / next-themes
   * (`html.dark` class).
   */
  theme?: ShaderWatercolorTheme
  /** Fires when a subject is loaded and painting starts. */
  onLoad?: (kind: ShaderWatercolorKind) => void
  /** Fires when `src` can't be fetched or read. */
  onError?: (error: Error) => void
}

export type ShaderWatercolorInstance = {
  setOptions: (options: Partial<ShaderWatercolorOptions>) => void
  /** Wet the paper and bloom the paint in again. */
  replay: () => void
  destroy: () => void
}

export const LIGHT_PAPER = "#F5F0E4"
export const DARK_PAPER = "#171614"
/** Payne's gray, for monochrome on a light page */
export const LIGHT_INK = "#2E3B4E"
/** A warm bone white, for monochrome on a dark page */
export const DARK_INK = "#E6DFD2"

export const DEFAULT_MODE: ShaderWatercolorMode = "color"
export const DEFAULT_WETNESS = 0.5
export const DEFAULT_EDGES = 0.35
export const DEFAULT_GRAIN = 0.5
export const DEFAULT_SPEED = 0.3
export const DEFAULT_SPIN = 12
export const DEFAULT_SCALE = 0.84
export const DEFAULT_ASPECT = 0.8

const SPLATS = 24
const SPLAT_LIFE_MS = 2600
const SPLAT_SPACING = 14
const REVEAL_MS = 2800
const RASTER_DELAY_MS = 140
const MAX_TEXTURE = 2048
const CLAY = "#CDBBA7"
/** The camera looks down on a model by this much, in radians. */
const ELEVATION = 0.36
/** The still life a model sits in: a warm wall, a wooden table. */
const WALL_TOP = "#ECE7DA"
const WALL_LOW = "#D2CDB9"
const TABLE = "#C49A6C"
const TABLE_EDGE = "#8E6542"
/** How much of a backdrop frame the model fills. */
const IN_FRAME = 1.02
/** A still life is seen nearly level, a little from above. */
const SETTING_ELEVATION = 0.3

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

function resolveDark(theme: ShaderWatercolorTheme): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return isDarkTheme()
}

const VERT = `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

#define SPLATS ${SPLATS}

uniform sampler2D uSource;
uniform vec2 uResolution;
uniform float uDpr;
uniform float uTime;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform float uMono;
uniform float uDark;
uniform float uWet;
uniform float uEdges;
uniform float uGrain;
uniform float uReveal;
uniform float uTransparent;
uniform vec4 uSplats[SPLATS];

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

const mat2 ROT = mat2(0.80, 0.60, -0.60, 0.80);

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = ROT * p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v / 0.9375;
}

// Distance to the nearest cell point: the bumps of cold-pressed paper.
float worley(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash22(i + g);
      vec2 r = g + o - f;
      d = min(d, dot(r, r));
    }
  }
  return sqrt(d);
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 cssSize() {
  return uResolution / uDpr;
}

// The source blurred to a radius of about r CSS px. Five mip taps on a
// rotated cross hide the blocky footprint a single deep mip lookup has.
vec4 soft(vec2 uv, float r) {
  float lod = log2(max(1.0, 1.25 * r * uDpr));
  vec2 o = r * 0.6 / cssSize();
  vec4 s = textureLod(uSource, uv, lod) * 0.36;
  s += textureLod(uSource, uv + o * vec2(0.866, 0.5), lod) * 0.16;
  s += textureLod(uSource, uv + o * vec2(-0.5, 0.866), lod) * 0.16;
  s += textureLod(uSource, uv + o * vec2(-0.866, -0.5), lod) * 0.16;
  s += textureLod(uSource, uv + o * vec2(0.5, -0.866), lod) * 0.16;
  return s;
}

vec3 unpremultiply(vec4 c, vec4 fallback) {
  // A pinch of the wide blur fills in color where the near one has none,
  // so paint that bleeds past the subject keeps its hue.
  vec4 m = c + fallback * 0.04;
  return m.rgb / max(m.a, 1e-4);
}

// Thin the paint: lift toward the paper, darken where pigment is dense.
// Bousseau et al. (2006) on light paper, mirrored so dark paper glows.
vec3 density(vec3 c, float d) {
  vec3 light = c - (c - c * c) * (d - 1.0);
  vec3 inv = 1.0 - c;
  vec3 dark = 1.0 - (inv - (inv - inv * inv) * (d - 1.0));
  return clamp(mix(light, dark, uDark), 0.0, 1.0);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uResolution;
  vec2 size = cssSize();
  vec2 css = frag / uDpr;
  float unit = min(size.x, size.y);
  vec2 p = css / unit;
  float t = uTime;

  // Water on the paper: the base wetness, fresh strokes from the pointer,
  // and the soaking a new subject arrives with.
  float touch = 0.0;
  for (int i = 0; i < SPLATS; i++) {
    vec4 s = uSplats[i];
    if (s.w <= 0.0) continue;
    vec2 d = css - s.xy;
    touch += s.w * exp(-dot(d, d) / (s.z * s.z));
  }
  touch = clamp(touch, 0.0, 1.0);
  float early = 1.0 - uReveal;
  float wet = clamp(uWet + touch * 0.85 + early * 0.7, 0.0, 1.6);

  // The wash drifts on a slow, warped current.
  vec2 flow = vec2(
    fbm(p * 2.2 + vec2(0.0, t * 0.07)),
    fbm(p * 2.2 + vec2(4.3, 1.7) - vec2(t * 0.05, 0.0))
  ) - 0.5;
  vec2 ripple = vec2(
    noise(p * 15.0 + t * 0.11),
    noise(p * 15.0 + 9.1 - t * 0.09)
  ) - 0.5;
  vec2 warp = flow * (4.0 + 26.0 * wet) + ripple * (1.0 + 3.5 * wet);
  vec2 wuv = uv + warp / size;

  // Pigment color, unpremultiplied so it bleeds without dark fringes.
  // Most of the subject's detail survives; the wash only softens it.
  vec4 big = soft(wuv, 9.0 + 16.0 * wet);
  vec4 mid = soft(wuv, 1.2 + 3.0 * wet);
  vec4 fine = textureLod(uSource, wuv, log2(max(1.0, 0.8 * uDpr)));
  vec3 cBig = toSrgb(unpremultiply(big, big));
  vec3 cMid = toSrgb(unpremultiply(mid, big));
  vec3 cFine = toSrgb(unpremultiply(fine, big));
  vec3 col = mix(cMid, cFine, 0.65 * (1.0 - 0.5 * min(wet, 1.0)));

  // Where paint lies: the shape, feathered out into the paper over a
  // ragged, mottled band. Strokes too thin to survive the feather keep
  // their near shape, so line art doesn't wash away.
  float bleed = 7.0 + 24.0 * wet;
  vec4 wide = soft(wuv, bleed);
  vec4 near = textureLod(uSource, wuv + ripple * 2.5 / size, log2(max(1.0, (1.0 + 1.5 * wet) * uDpr)));
  float rag = fbm(p * 7.0 + vec2(3.1, t * 0.02)) - 0.5;
  float mottle = noise(p * 26.0 + 2.0) - 0.5;
  float th = 0.45 + rag * (0.3 + 0.2 * min(wet, 1.0)) + mottle * 0.12;
  // The edge itself is ragged but fairly sure; inside it the wash thins
  // toward the edge, so the subject dissolves into the paper rather than
  // blurring out.
  float feather = 0.2 + 0.2 * min(wet, 1.0);
  float cover = smoothstep(th - 0.09, th + 0.07, wide.a);
  cover *= mix(0.35, 1.0, smoothstep(th, th + feather * 1.6, wide.a + mottle * 0.1));
  // A stroke is thin when the wide blur all but loses it; the edge of a
  // broad shape still reads about half there.
  float thin = smoothstep(0.34, 0.12, wide.a);
  float wobble = (noise(p * 38.0 + 5.0) - 0.5) * 0.5 + (noise(p * 90.0) - 0.5) * 0.2;
  cover = max(cover, smoothstep(0.3, 0.55, near.a + wobble) * 0.92 * thin);

  // A new subject blooms out from its densest parts, a wet front ahead.
  float field = wide.a * 0.55 + fbm(p * 3.0 + 7.0) * 0.6;
  float r = early * 1.25 - 0.06;
  float bloom = smoothstep(r, r + 0.14, field);
  float front = bloom * (1.0 - bloom) * 4.0;
  cover *= bloom;

  // Values settle a little into glazes laid one over another. Their
  // borders wander with the paper; pigment pools on the darker side.
  float v = luma(col);
  float glazeJitter = (fbm(p * 5.0 + vec2(11.0, t * 0.015)) - 0.5) * 0.8;
  float lv = v * 4.0 + glazeJitter;
  float f = fract(lv);
  float stepped = (floor(lv) + smoothstep(0.38, 0.62, f) - glazeJitter) / 4.0;
  float glaze = smoothstep(0.12, 0.5, f) * (1.0 - smoothstep(0.5, 0.58, f));
  col = clamp(col + (mix(v, stepped, 0.12) - v), 0.0, 1.0);
  // Pigment straight from the pan is clean and bright.
  col = clamp(mix(vec3(luma(col)), col, 1.06), 0.0, 1.0);

  // Pigment pools where a wash dries against the paper or another wash.
  float rim = cover * (1.0 - smoothstep(th + feather * 0.2, th + feather + 0.15, wide.a));
  float inner = smoothstep(0.04, 0.24, abs(luma(cMid) - luma(cBig)));

  // Paper: cold-pressed bumps, fine tooth, a whisper of fibers.
  float cells = worley(css * 0.075);
  float tooth = noise(css * 0.55);
  float fiber = noise(vec2(css.x * 0.035 + css.y * 0.012, css.y * 0.42));
  float h = 0.55 * cells + 0.32 * tooth + 0.13 * fiber;
  // Granulation: fine specks of settled pigment, and sparse pale spots
  // where the pigment lifted.
  float speck = noise(css * 1.6) - 0.5;
  float salt = smoothstep(0.8, 0.92, noise(css * 0.42 + 13.0)) *
    smoothstep(0.55, 0.85, noise(css * 0.09 + 3.0));

  // Uneven pigment: broad blooms and a mottle in the flat washes.
  float turb = fbm(p * 3.2 + vec2(t * 0.02, -t * 0.015)) - 0.5;
  float blot = fbm(p * 11.0 - vec2(t * 0.01, 0.0)) - 0.5;
  float d = 1.0;
  d += turb * 0.6 + blot * 0.5;
  d += uEdges * (rim * 1.1 + inner * 0.6 + glaze * 0.45 + front * 0.9);
  d += uGrain * ((0.5 - h) * 1.1 + speck * 0.7 - salt * 0.9);
  d = 1.0 + (clamp(d, 0.3, 1.75) - 1.0) * cover;

  // Ink amount for monochrome: the subject's value, so shading becomes
  // layered washes. On dark paper light ink stands for light.
  float value = mix(1.0 - luma(col), luma(col), uDark);
  value = 0.14 + 0.72 * pow(smoothstep(0.0, 1.0, value), 1.25);

  // Watercolor is transparent: thin the color toward the paper, and let
  // warm and cool drift apart a little.
  vec3 hue = col * (1.0 + turb * vec3(0.1, 0.0, -0.1));
  // Watercolor is painted high-key: lift the darks so washes stay clear.
  hue = 1.0 - (1.0 - hue) * mix(0.93, 0.84, smoothstep(0.5, 0.0, luma(hue)));
  hue = mix(hue, uPaper, 0.05);
  vec3 pigment = mix(hue, mix(uPaper, uInk, value), uMono);

  float paperShade = (h - 0.5) * (0.03 + 0.05 * uGrain) + (fbm(p * 1.3) - 0.5) * 0.02;
  vec3 paper = uPaper + paperShade * mix(1.0, 0.6, uDark);

  float opacity = 0.94;
  vec3 painted = density(mix(paper, pigment, cover * opacity), d);
  float dither = (hash12(frag + fract(t) * 61.0) - 0.5) / 255.0;

  if (uTransparent > 0.5) {
    vec3 ink = mix(hue, uInk, uMono);
    float amount = mix(1.0, value, uMono);
    float a = cover * opacity * amount * clamp(0.7 + 0.3 * d, 0.0, 1.4);
    a *= 1.0 - uGrain * (h - 0.5) * 0.3;
    a = clamp(a, 0.0, 1.0);
    vec3 c = density(ink, d) + dither;
    gl_FragColor = vec4(c * a, a);
    return;
  }

  gl_FragColor = vec4(painted + dither, 1.0);
}
`

function readColor(hex: string, fallback: string) {
  const color = new Color()
  try {
    color.setStyle(hex, SRGBColorSpace)
  } catch {
    color.setStyle(fallback, SRGBColorSpace)
  }
  // The paint pass works in sRGB, so hand it the raw sRGB channels.
  color.convertLinearToSRGB()
  return color
}

type LiveElement = HTMLVideoElement | HTMLCanvasElement

type Source =
  | { kind: "image"; image: HTMLImageElement; vector: boolean; ratio: number }
  | {
      kind: "live"
      element: LiveElement
      /** Made here from `src`, so it's ours to pause and clear. */
      owned: boolean
      /** A blob URL made here, revoked with the video. */
      revoke: string
    }
  | { kind: "model"; object: Object3D; animations: AnimationClip[] }

const BINARY_IMAGES: [number[], string][] = [
  [[0x89, 0x50, 0x4e, 0x47], "image/png"],
  [[0xff, 0xd8, 0xff], "image/jpeg"],
  [[0x47, 0x49, 0x46, 0x38], "image/gif"],
  [[0x42, 0x4d], "image/bmp"],
]

function startsWith(bytes: Uint8Array, magic: number[], at = 0) {
  return magic.every((b, i) => bytes[at + i] === b)
}

function ascii(bytes: Uint8Array, from: number, to: number) {
  let out = ""
  for (let i = from; i < Math.min(to, bytes.length); i++) {
    out += String.fromCharCode(bytes[i]!)
  }
  return out
}

/** The MIME type of a raster image from its first bytes, or null. */
function rasterType(bytes: Uint8Array): string | null {
  for (const [magic, type] of BINARY_IMAGES) {
    if (startsWith(bytes, magic)) return type
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return "image/webp"
  }
  if (ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12)
    if (brand === "avif" || brand === "avis") return "image/avif"
  }
  return null
}

/** Width over height from an SVG's viewBox or size attributes. */
function svgRatio(text: string) {
  const tag = /<svg\b[^>]*>/i.exec(text)?.[0] ?? ""
  const box = /viewBox\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
  if (box) {
    const [, , w, h] = box.split(/[\s,]+/).map(Number)
    if (w && h && w > 0 && h > 0) return w / h
  }
  const w = Number.parseFloat(/\swidth\s*=\s*["']([\d.]+)/i.exec(tag)?.[1] ?? "")
  const h = Number.parseFloat(/\sheight\s*=\s*["']([\d.]+)/i.exec(tag)?.[1] ?? "")
  if (w > 0 && h > 0) return w / h
  return 0
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = "async"
    img.onload = () => {
      resolve(img)
      // Keep SVG blobs alive: they are drawn again at each new size.
      if (blob.type !== "image/svg+xml") URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("The image could not be decoded."))
    }
    img.src = url
  })
}

async function imageSource(blob: Blob, vector: boolean, svgText = "") {
  const image = await loadImage(blob)
  let ratio = 0
  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
    ratio = image.naturalWidth / image.naturalHeight
  }
  if (vector) ratio = svgRatio(svgText) || ratio
  return { kind: "image", image, vector, ratio: ratio || 1 } as Source
}

function baseUrl(src: string) {
  if (src.startsWith("blob:") || src.startsWith("data:")) return ""
  const cut = src.split(/[?#]/)[0]!
  return cut.slice(0, cut.lastIndexOf("/") + 1)
}

function parseGltf(data: ArrayBuffer | string, path: string) {
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  return new Promise<Source>((resolve, reject) => {
    loader.parse(
      data,
      path,
      (gltf) =>
        resolve({
          kind: "model",
          object: gltf.scene,
          animations: gltf.animations,
        }),
      (error) =>
        reject(error instanceof Error ? error : new Error("Bad glTF file."))
    )
  })
}

function isBinaryStl(buffer: ArrayBuffer) {
  if (buffer.byteLength < 84) return false
  const faces = new DataView(buffer).getUint32(80, true)
  return buffer.byteLength === 84 + faces * 50
}

/** STL and bare OBJ files carry no color; paint them in a soft clay. */
const clay = () => new MeshStandardMaterial({ color: CLAY, roughness: 0.85 })

function stlMesh(geometry: BufferGeometry): Source {
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals()
  return { kind: "model", object: new Mesh(geometry, clay()), animations: [] }
}

function objModel(text: string): Source {
  const object = new OBJLoader().parse(text)
  object.traverse((node) => {
    const mesh = node as Mesh
    if (!mesh.isMesh) return
    const swap = (material: Material) => {
      const plain = material as MeshStandardMaterial
      // OBJLoader's stand-in for a missing .mtl is plain white.
      if (plain.map || !plain.color?.equals(new Color(1, 1, 1))) return material
      material.dispose()
      return clay()
    }
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(swap)
      : swap(mesh.material)
  })
  return { kind: "model", object, animations: [] }
}

const VIDEO_EXT = /^(mp4|m4v|webm|mov|ogv)$/

/** The MIME type of a video from its first bytes, or null. */
function videoType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return "video/webm"
  if (ascii(bytes, 0, 4) === "OggS") return "video/ogg"
  if (ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12)
    if (brand === "avif" || brand === "avis") return null
    return brand === "qt  " ? "video/quicktime" : "video/mp4"
  }
  return null
}

function videoSource(url: string, signal: AbortSignal, revoke = false) {
  return new Promise<Source>((resolve, reject) => {
    const video = document.createElement("video")
    video.crossOrigin = "anonymous"
    video.muted = true
    video.defaultMuted = true
    video.loop = true
    video.playsInline = true
    video.preload = "auto"
    const done = () => {
      video.removeEventListener("loadeddata", onReady)
      video.removeEventListener("error", onError)
      signal.removeEventListener("abort", onAbort)
    }
    const drop = () => {
      video.removeAttribute("src")
      video.load()
      if (revoke) URL.revokeObjectURL(url)
    }
    const onReady = () => {
      done()
      resolve({ kind: "live", element: video, owned: true, revoke: revoke ? url : "" })
    }
    const onError = () => {
      done()
      drop()
      reject(new Error("The video could not be decoded."))
    }
    const onAbort = () => {
      done()
      drop()
      reject(new DOMException("Aborted", "AbortError"))
    }
    video.addEventListener("loadeddata", onReady)
    video.addEventListener("error", onError)
    signal.addEventListener("abort", onAbort)
    video.src = url
  })
}

/**
 * Fetch `src` and work out what it is from its bytes rather than its name,
 * so blob URLs from a file input load like any other.
 */
async function loadSource(src: string, signal: AbortSignal): Promise<Source> {
  const trimmed = src.trim()
  if (trimmed.startsWith("<")) {
    const blob = new Blob([trimmed], { type: "image/svg+xml" })
    return imageSource(blob, true, trimmed)
  }

  const ext = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(src)?.[1]?.toLowerCase() ?? ""
  // Videos stream; don't download one just to look at it.
  if (VIDEO_EXT.test(ext)) return videoSource(src, signal)

  const res = await fetch(src, { signal })
  if (!res.ok) throw new Error(`Couldn't fetch ${src} (${res.status}).`)
  const type = res.headers.get("content-type") ?? ""
  if (type.startsWith("video/")) {
    void res.body?.cancel()
    return videoSource(src, signal)
  }
  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 1024))

  if (ascii(bytes, 0, 4) === "glTF") return parseGltf(buffer, baseUrl(src))

  const raster = rasterType(bytes)
  if (raster) return imageSource(new Blob([buffer], { type: raster }), false)

  const video = videoType(bytes)
  if (video) {
    const url = URL.createObjectURL(new Blob([buffer], { type: video }))
    return videoSource(url, signal, true)
  }

  if (ext === "stl" || isBinaryStl(buffer)) {
    return stlMesh(new STLLoader().parse(buffer))
  }

  const text = new TextDecoder().decode(buffer)
  const head = text.slice(0, 2048).trimStart()

  if (/<svg[\s>]/i.test(head) || type.includes("svg")) {
    return imageSource(new Blob([text], { type: "image/svg+xml" }), true, text)
  }
  if (head.startsWith("{") && head.includes('"asset"')) {
    return parseGltf(text, baseUrl(src))
  }
  if (/^solid\b/.test(head) && /\bfacet\b/.test(head)) {
    return stlMesh(new STLLoader().parse(buffer))
  }
  if (/^\s*v\s+-?[\d.]/m.test(text) && /^\s*f\s+\d/m.test(text)) {
    return objModel(text)
  }
  if (type.startsWith("image/")) {
    return imageSource(new Blob([buffer], { type }), false)
  }
  throw new Error(
    "Unrecognized source. Use an image, an SVG, a video, or a .glb, .gltf, .obj or .stl model."
  )
}

function disposeObject(object: Object3D) {
  object.traverse((node) => {
    const mesh = node as Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    for (const material of materials as Material[]) {
      for (const value of Object.values(material)) {
        if (value instanceof Texture) value.dispose()
      }
      material.dispose()
    }
  })
}

type Splat = { x: number; y: number; r: number; born: number }

/**
 * How far a model reaches from its spin axis, and half its height, after
 * centering and scaling by `unit`. Measured from the vertices,
 * since a bounding box's corners overstate what a turntable sweeps.
 */
function measure(object: Object3D, unit: number) {
  object.updateWorldMatrix(true, true)
  const v = new Vector3()
  let radius = 0
  let top = -Infinity
  let bottom = Infinity
  object.traverse((node) => {
    const mesh = node as Mesh
    if (!mesh.isMesh) return
    const position = mesh.geometry.getAttribute("position")
    if (!position) return
    const stride = Math.max(1, Math.floor(position.count / 20000))
    for (let i = 0; i < position.count; i += stride) {
      v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld)
      radius = Math.max(radius, Math.hypot(v.x, v.z))
      top = Math.max(top, v.y)
      bottom = Math.min(bottom, v.y)
    }
  })
  if (!Number.isFinite(top)) return { radius: 1, half: 1 }
  return { radius: radius * unit, half: ((top - bottom) / 2) * unit }
}

function paintTexture(
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
) {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")
  if (ctx) paint(ctx, w, h)
  const texture = new CanvasTexture(c)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

function damp(current: number, target: number, rate: number, dt: number) {
  return target + (current - target) * Math.exp(-rate * dt)
}

/**
 * Paint an image, an SVG, or a 3D model as a quiet watercolor: soft washes
 * that bleed and drift, pigment pooled at their edges, granulated by the
 * tooth of the paper.
 */
export function createShaderWatercolor(
  root: HTMLElement,
  initial: ShaderWatercolorOptions = {}
): ShaderWatercolorInstance | null {
  let options: ShaderWatercolorOptions = { ...initial }

  // A canvas of our own: a context lost on destroy can't be handed back to
  // the next mount (React Strict Mode mounts twice).
  const canvas = document.createElement("canvas")
  canvas.style.cssText =
    "position:absolute;inset:0;display:block;width:100%;height:100%;border-radius:inherit"
  root.appendChild(canvas)

  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    })
  } catch {
    canvas.remove()
    return null
  }
  renderer.setClearColor(0x000000, 0)

  const target = new WebGLRenderTarget(1, 1, {
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    colorSpace: SRGBColorSpace,
    samples: 4,
  })

  // Image subjects: a plane in CSS px under an orthographic camera.
  const flatScene = new Scene()
  const flatCamera = new OrthographicCamera(-1, 1, 1, -1, -10, 10)
  const flatMaterial = new MeshBasicMaterial({ transparent: true })
  const plane = new Mesh(new PlaneGeometry(1, 1), flatMaterial)
  plane.visible = false
  flatScene.add(plane)

  // Model subjects: a soft studio, a turntable, a tilt toward the pointer.
  const modelScene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  modelScene.environment = pmrem.fromScene(room, 0.04).texture
  modelScene.environmentIntensity = 0.4
  room.dispose()
  pmrem.dispose()
  modelScene.add(new HemisphereLight("#FFFFFF", "#B9B0A2", 0.9))
  const key = new DirectionalLight("#FFF4E6", 1.7)
  key.position.set(-2.2, 3, 2.6)
  modelScene.add(key)
  const fill = new DirectionalLight("#DCE6FF", 0.5)
  fill.position.set(2.6, 0.8, -2)
  modelScene.add(fill)
  const modelCamera = new PerspectiveCamera(28, 1, 0.01, 100)
  const turntable = new Group()
  const tilt = new Group()
  tilt.add(turntable)
  modelScene.add(tilt)

  // The still life's setting, with soft shadows from the key light.
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.radius = 10
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.02
  key.shadow.camera.left = -3
  key.shadow.camera.right = 3
  key.shadow.camera.top = 3
  key.shadow.camera.bottom = -3
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 12
  const setting = new Group()
  const wallMap = paintTexture(4, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, WALL_TOP)
    g.addColorStop(1, WALL_LOW)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
  const wall = new Mesh(
    new PlaneGeometry(40, 16),
    new MeshLambertMaterial({ map: wallMap })
  )
  wall.receiveShadow = true
  const tableMap = paintTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = TABLE
    ctx.fillRect(0, 0, w, h)
    // Wood grain: long, faintly wavy streaks.
    // Periodic in x, so the texture tiles without a seam.
    for (let i = 0; i < 90; i++) {
      const y = 4 + Math.random() * (h - 8)
      const k = 1 + Math.floor(Math.random() * 3)
      ctx.strokeStyle =
        Math.random() > 0.5 ? "rgba(90, 55, 25, 0.14)" : "rgba(255, 225, 185, 0.12)"
      ctx.lineWidth = 1 + Math.random() * 2.5
      ctx.beginPath()
      for (let x = 0; x <= w; x += 16) {
        const yy = y + Math.sin((x / w) * Math.PI * 2 * k + i) * 3
        if (x === 0) ctx.moveTo(x, yy)
        else ctx.lineTo(x, yy)
      }
      ctx.stroke()
    }
  })
  tableMap.wrapS = RepeatWrapping
  tableMap.wrapT = RepeatWrapping
  tableMap.repeat.set(2.5, 1)
  const table = new Mesh(
    new PlaneGeometry(40, 1),
    new MeshStandardMaterial({ map: tableMap, roughness: 0.7 })
  )
  table.rotation.x = -Math.PI / 2
  table.receiveShadow = true
  // The table's front edge, a darker band below the top.
  const tableFront = new Mesh(
    new PlaneGeometry(40, 4),
    new MeshLambertMaterial({ color: TABLE_EDGE })
  )
  setting.add(wall, table, tableFront)
  setting.visible = false
  modelScene.add(setting)
  /** The backdrop canvas, in CSS px from the bottom left. */
  let frame = { x: 0, y: 0, w: 0, h: 0 }
  let cameraDistance = 4
  let lookY = 0

  const splats: Splat[] = []
  const splatUniforms = Array.from({ length: SPLATS }, () => new Vector4())

  const paintMaterial = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
    uniforms: {
      uSource: { value: target.texture },
      uResolution: { value: new Vector2(1, 1) },
      uDpr: { value: 1 },
      uTime: { value: 0 },
      uPaper: { value: new Color() },
      uInk: { value: new Color() },
      uMono: { value: 0 },
      uDark: { value: 0 },
      uWet: { value: DEFAULT_WETNESS },
      uEdges: { value: DEFAULT_EDGES },
      uGrain: { value: DEFAULT_GRAIN },
      uReveal: { value: 1 },
      uTransparent: { value: 0 },
      uSplats: { value: splatUniforms },
    },
  })
  const paintScene = new Scene()
  const paintQuad = new Mesh(new PlaneGeometry(2, 2), paintMaterial)
  paintQuad.frustumCulled = false
  paintScene.add(paintQuad)
  const paintCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  let running = true
  let raf = 0
  let last = 0
  let time = Math.random() * 40
  let cssW = 0
  let cssH = 0
  let dpr = 1
  let dark = resolveDark(options.theme ?? "auto")
  let reduce = false
  let visible = true
  let pageVisible = !document.hidden
  let dirty = true

  let source: Source | null = null
  /** The `media` element or `src` string on the paper now. */
  let current: LiveElement | string | undefined
  let abort: AbortController | null = null
  let texture: Texture | null = null
  let rasterTimer = 0
  let rasterSize = 0
  let mixer: AnimationMixer | null = null
  /** Model extent around and along its spin axis, in unit-sphere units. */
  let footprint = { radius: 1, half: 1 }

  let revealStart = -1
  let reveal = 1

  const pointer = { x: 0, y: 0, inside: false, lastX: -1e4, lastY: -1e4 }
  let lean = { x: 0, y: 0 }

  const applyLook = () => {
    const u = paintMaterial.uniforms
    const paper = options.paper
    const transparent = paper === "transparent"
    ;(u.uPaper!.value as Color).copy(
      readColor(
        !paper || transparent ? (dark ? DARK_PAPER : LIGHT_PAPER) : paper,
        dark ? DARK_PAPER : LIGHT_PAPER
      )
    )
    ;(u.uInk!.value as Color).copy(
      readColor(options.ink ?? (dark ? DARK_INK : LIGHT_INK), LIGHT_INK)
    )
    u.uTransparent!.value = transparent ? 1 : 0
    u.uMono!.value = options.mode === "monochrome" ? 1 : 0
    u.uDark!.value = dark ? 1 : 0
    u.uWet!.value = clamp01(options.wetness ?? DEFAULT_WETNESS)
    u.uEdges!.value = clamp01(options.edges ?? DEFAULT_EDGES)
    u.uGrain!.value = clamp01(options.grain ?? DEFAULT_GRAIN)
    dirty = true
  }

  const subjectScale = () =>
    Math.min(1, Math.max(0.2, options.scale ?? DEFAULT_SCALE))

  /** Width over height of a flat subject. */
  const ratioOf = (subject: Source | null) => {
    if (subject?.kind === "image") return subject.ratio
    if (subject?.kind !== "live") return 1
    const el = subject.element
    const w = el instanceof HTMLVideoElement ? el.videoWidth : el.width
    const h = el instanceof HTMLVideoElement ? el.videoHeight : el.height
    return w > 0 && h > 0 ? w / h : 1
  }
  let liveRatio = 1

  /** CSS size of the image plane, contained in the scaled frame. */
  const planeSize = (ratio: number) => {
    const s = subjectScale()
    const fw = cssW * s
    const fh = cssH * s
    return fw / fh > ratio ? [fh * ratio, fh] : [fw, fw / ratio]
  }

  /** Draw an SVG at the size it's shown, so it stays crisp at any scale. */
  const rasterize = () => {
    window.clearTimeout(rasterTimer)
    rasterTimer = 0
    if (source?.kind !== "image" || !source.vector) return
    const [w, h] = planeSize(source.ratio)
    const fit = Math.min(1, MAX_TEXTURE / (Math.max(w, h) * dpr))
    const pw = Math.max(1, Math.round(w * dpr * fit))
    const ph = Math.max(1, Math.round(h * dpr * fit))
    if (Math.max(pw, ph) === rasterSize && texture) return
    rasterSize = Math.max(pw, ph)
    const out = document.createElement("canvas")
    out.width = pw
    out.height = ph
    const ctx = out.getContext("2d")
    if (!ctx) return
    ctx.drawImage(source.image, 0, 0, pw, ph)
    setTexture(new CanvasTexture(out))
  }

  const setTexture = (next: Texture) => {
    texture?.dispose()
    texture = next
    texture.colorSpace = SRGBColorSpace
    texture.generateMipmaps = true
    texture.minFilter = LinearMipmapLinearFilter
    texture.anisotropy = 4
    texture.needsUpdate = true
    flatMaterial.map = texture
    flatMaterial.needsUpdate = true
    dirty = true
  }

  const layout = () => {
    flatCamera.left = -cssW / 2
    flatCamera.right = cssW / 2
    flatCamera.top = cssH / 2
    flatCamera.bottom = -cssH / 2
    flatCamera.updateProjectionMatrix()
    if (source?.kind === "image" || source?.kind === "live") {
      liveRatio = ratioOf(source)
      const [w, h] = planeSize(liveRatio)
      plane.scale.set(w, h, 1)
    }
    const backdrop = hasBackdrop()
    setting.visible = backdrop
    let fitW = cssW
    let fitH = cssH
    let s = subjectScale()
    if (backdrop) {
      const aspect = Math.min(3, Math.max(0.3, options.aspect ?? DEFAULT_ASPECT))
      const [fw, fh] = planeSize(aspect)
      frame = { x: (cssW - fw) / 2, y: (cssH - fh) / 2, w: fw, h: fh }
      fitW = fw
      fitH = fh
      s = IN_FRAME
      // The table under the model, the wall behind its widest swing.
      const floor = -footprint.half
      const wallZ = -(footprint.radius + 0.7)
      const frontZ = footprint.radius + 1.3
      table.scale.set(1, frontZ - wallZ, 1)
      table.position.set(0, floor, (wallZ + frontZ) / 2)
      tableFront.position.set(0, floor - 2, frontZ)
      wall.position.set(0, floor + 8, wallZ)
    }
    modelCamera.aspect = fitW / Math.max(1, fitH)
    const vHalf = (modelCamera.fov * Math.PI) / 360
    const hHalf = Math.atan(Math.tan(vHalf) * modelCamera.aspect)
    // Fit the model's turntable footprint: its widest radius around the
    // spin axis across, its height (seen from above) up and down.
    const across = footprint.radius
    const elevation = backdrop ? SETTING_ELEVATION : ELEVATION
    const tall = footprint.half * Math.cos(elevation) + across * Math.sin(elevation)
    const distance =
      Math.max(across / (Math.tan(hHalf) * s), tall / (Math.tan(vHalf) * s)) +
      across * 0.2
    cameraDistance = distance
    lookY = 0
    modelCamera.near = distance / 50
    modelCamera.far = distance * 6
    placeCamera()
    modelCamera.updateProjectionMatrix()
    dirty = true
  }

  function hasBackdrop() {
    return source?.kind === "model" && options.backdrop !== false
  }

  /**
   * Floating, the model itself leans toward the pointer. In its setting
   * the camera drifts around it instead, so the table stays put.
   */
  function placeCamera() {
    const backdrop = hasBackdrop()
    const az = backdrop ? lean.x * 0.5 : 0
    const el = backdrop ? SETTING_ELEVATION - lean.y * 0.2 : ELEVATION
    const d = cameraDistance
    modelCamera.position.set(
      Math.sin(az) * Math.cos(el) * d,
      lookY + Math.sin(el) * d,
      Math.cos(az) * Math.cos(el) * d
    )
    modelCamera.lookAt(0, lookY, 0)
    tilt.rotation.set(backdrop ? 0 : -lean.y, backdrop ? 0 : lean.x, 0)
  }

  const clearSubject = () => {
    mixer?.stopAllAction()
    mixer = null
    for (const child of [...turntable.children]) {
      turntable.remove(child)
      disposeObject(child)
    }
    if (source?.kind === "image") URL.revokeObjectURL(source.image.src)
    if (source?.kind === "live" && source.owned) {
      const video = source.element as HTMLVideoElement
      video.pause()
      video.removeAttribute("src")
      video.load()
      if (source.revoke) URL.revokeObjectURL(source.revoke)
    }
    texture?.dispose()
    texture = null
    flatMaterial.map = null
    plane.visible = false
    rasterSize = 0
    source = null
    dirty = true
  }

  const startReveal = () => {
    if (options.reveal === false || reduce) {
      reveal = 1
      revealStart = -1
    } else {
      reveal = 0
      revealStart = performance.now()
    }
    paintMaterial.uniforms.uReveal!.value = reveal
    wake()
  }

  const mount = (next: Source) => {
    clearSubject()
    source = next
    if (next.kind === "image") {
      plane.visible = true
      if (next.vector) rasterize()
      else setTexture(new Texture(next.image))
    } else if (next.kind === "live") {
      plane.visible = true
      const el = next.element
      setTexture(
        el instanceof HTMLVideoElement ? new VideoTexture(el) : new CanvasTexture(el)
      )
      syncPlayback()
    } else {
      const object = next.object
      object.traverse((node) => {
        const mesh = node as Mesh
        if (!mesh.isMesh) return
        mesh.frustumCulled = false
        mesh.castShadow = true
        mesh.receiveShadow = true
      })
      const box = new Box3().setFromObject(object)
      const sphere = box.getBoundingSphere(new Sphere())
      const center = box.getCenter(new Vector3())
      object.position.sub(center)
      const unit = 1 / (sphere.radius > 0 ? sphere.radius : 1)
      // Measure before parenting, so the holder's scale isn't counted twice.
      footprint = measure(object, unit)
      const holder = new Group()
      holder.add(object)
      holder.scale.setScalar(unit)
      turntable.add(holder)
      turntable.rotation.set(0, -0.5, 0)
      if (next.animations.length > 0) {
        mixer = new AnimationMixer(object)
        mixer.clipAction(next.animations[0]!).play()
      }
    }
    layout()
    startReveal()
    options.onLoad?.(
      next.kind === "live"
        ? next.element instanceof HTMLVideoElement
          ? "video"
          : "image"
        : next.kind
    )
  }

  /** Put `media`, or else `src`, on the paper, if it isn't there already. */
  const pick = () => {
    const want = options.media ?? options.src
    if (want === current) return
    current = want
    abort?.abort()
    abort = null
    if (options.media) {
      mount({ kind: "live", element: options.media, owned: false, revoke: "" })
      return
    }
    load(options.src)
  }

  const load = (src: string | undefined) => {
    if (!src) {
      clearSubject()
      wake()
      return
    }
    const controller = new AbortController()
    abort = controller
    loadSource(src, controller.signal).then(
      (next) => {
        if (!running || controller.signal.aborted) {
          if (next.kind === "model") disposeObject(next.object)
          if (next.kind === "live") {
            const video = next.element as HTMLVideoElement
            video.removeAttribute("src")
            video.load()
            if (next.revoke) URL.revokeObjectURL(next.revoke)
          }
          return
        }
        mount(next)
      },
      (error: unknown) => {
        if (!running || controller.signal.aborted) return
        options.onError?.(
          error instanceof Error ? error : new Error(String(error))
        )
      }
    )
  }

  const resize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w <= 0 || h <= 0) return false
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2)
    if (w === cssW && h === cssH && nextDpr === dpr) return false
    cssW = w
    cssH = h
    dpr = nextDpr
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    const bw = Math.max(1, Math.floor(w * dpr))
    const bh = Math.max(1, Math.floor(h * dpr))
    target.setSize(bw, bh)
    paintMaterial.uniforms.uResolution!.value.set(bw, bh)
    paintMaterial.uniforms.uDpr!.value = bw / w
    layout()
    window.clearTimeout(rasterTimer)
    rasterTimer = window.setTimeout(() => {
      rasterize()
      wake()
    }, RASTER_DELAY_MS)
    return true
  }

  const updateSplats = (now: number) => {
    let live = 0
    for (let i = 0; i < SPLATS; i++) {
      const s = splats[i]
      const u = splatUniforms[i]!
      if (!s) {
        u.set(0, 0, 1, 0)
        continue
      }
      const age = now - s.born
      if (age > SPLAT_LIFE_MS) {
        u.set(0, 0, 1, 0)
        continue
      }
      live++
      const rise = Math.min(1, age / 160)
      const dry = 1 - age / SPLAT_LIFE_MS
      u.set(s.x, s.y, s.r * (1 + age / SPLAT_LIFE_MS), rise * dry * dry * 0.9)
    }
    return live
  }

  const render = (now: number) => {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
    last = now
    const motion = !reduce
    const speed = Math.max(0, options.speed ?? DEFAULT_SPEED)
    if (motion) time += dt * speed

    if (revealStart >= 0) {
      const t = Math.min(1, (now - revealStart) / REVEAL_MS)
      reveal = easeOutCubic(t)
      if (t >= 1) revealStart = -1
    }

    const u = paintMaterial.uniforms
    u.uTime!.value = time
    u.uReveal!.value = reveal
    const liveSplats = updateSplats(now)

    if (source?.kind === "model") {
      if (motion) {
        turntable.rotation.y +=
          (dt * (options.spin ?? DEFAULT_SPIN) * Math.PI) / 180
        mixer?.update(dt)
      }
      const follow = options.interactive !== false && pointer.inside && motion
      const tx = follow ? (pointer.x / cssW - 0.5) * 0.5 : 0
      const ty = follow ? (pointer.y / cssH - 0.5) * 0.35 : 0
      lean = { x: damp(lean.x, tx, 3, dt), y: damp(lean.y, ty, 3, dt) }
      placeCamera()
      dirty = true
    }

    const live = source?.kind === "live"
    if (live) {
      if (source!.kind === "live" && !(source!.element instanceof HTMLVideoElement)) {
        texture!.needsUpdate = true
      }
      if (ratioOf(source) !== liveRatio) layout()
      dirty = true
    }

    if (dirty) {
      renderer.setRenderTarget(target)
      renderer.setClearColor(0x000000, 0)
      renderer.clear()
      if (source?.kind === "model" && hasBackdrop()) {
        // Paint the still life inside its canvas only; paper all around.
        const k = target.width / Math.max(1, cssW)
        const x = Math.round(frame.x * k)
        const y = Math.round(frame.y * k)
        const w = Math.round(frame.w * k)
        const h = Math.round(frame.h * k)
        // The viewport alone confines it. A scissor would also confine the
        // multisample resolve, leaving the last subject outside the frame.
        target.viewport.set(x, y, w, h)
        renderer.setRenderTarget(target)
        renderer.render(modelScene, modelCamera)
        target.viewport.set(0, 0, target.width, target.height)
      } else if (source?.kind === "model") {
        renderer.render(modelScene, modelCamera)
      } else if (source) renderer.render(flatScene, flatCamera)
      renderer.setRenderTarget(null)
      dirty = false
    }

    renderer.render(paintScene, paintCamera)

    const spinning =
      source?.kind === "model" &&
      motion &&
      ((options.spin ?? DEFAULT_SPIN) !== 0 ||
        mixer !== null ||
        Math.abs(lean.x) + Math.abs(lean.y) > 1e-3 ||
        pointer.inside)
    return (
      (motion && speed > 0) ||
      revealStart >= 0 ||
      liveSplats > 0 ||
      spinning ||
      live
    )
  }

  const tick = (now: number) => {
    raf = 0
    if (!running) return
    if (!visible || !pageVisible) return
    if (resize()) dirty = true
    const more = render(now)
    if (more) raf = requestAnimationFrame(tick)
    else last = 0
  }

  /** Our own videos play only while someone can see them. */
  function syncPlayback() {
    if (source?.kind !== "live" || !source.owned) return
    const video = source.element as HTMLVideoElement
    if (visible && pageVisible && !reduce) void video.play().catch(() => {})
    else video.pause()
  }

  function wake() {
    if (!raf && running) raf = requestAnimationFrame(tick)
  }

  const onPointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height
    pointer.inside = inside
    // The shader's y runs up from the bottom.
    pointer.x = x
    pointer.y = rect.height - y
    if (!inside || options.interactive === false || reduce) {
      if (inside) wake()
      return
    }
    const moved = Math.hypot(pointer.x - pointer.lastX, pointer.y - pointer.lastY)
    if (moved >= SPLAT_SPACING) {
      pointer.lastX = pointer.x
      pointer.lastY = pointer.y
      const r = Math.min(70, 26 + moved * 0.35)
      splats.push({ x: pointer.x, y: pointer.y, r, born: performance.now() })
      if (splats.length > SPLATS) splats.shift()
    }
    wake()
  }

  const onPointerLeave = () => {
    pointer.inside = false
    pointer.lastX = -1e4
    pointer.lastY = -1e4
    wake()
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true })
  document.documentElement.addEventListener("pointerleave", onPointerLeave)

  const ro = new ResizeObserver(() => {
    if (resize()) {
      dirty = true
      wake()
    }
  })
  ro.observe(canvas)

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting)
    syncPlayback()
    if (visible) wake()
  })
  io.observe(canvas)

  const onVisibility = () => {
    pageVisible = !document.hidden
    last = 0
    syncPlayback()
    if (pageVisible) wake()
  }
  document.addEventListener("visibilitychange", onVisibility)

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const onReduce = () => {
    reduce = mqReduce.matches
    if (reduce) {
      reveal = 1
      revealStart = -1
    }
    syncPlayback()
    wake()
  }
  onReduce()
  mqReduce.addEventListener("change", onReduce)

  const syncTheme = () => {
    const next = resolveDark(options.theme ?? "auto")
    if (next === dark) return
    dark = next
    applyLook()
    wake()
  }
  const mo = new MutationObserver(syncTheme)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  })
  const mqDark = window.matchMedia("(prefers-color-scheme: dark)")
  mqDark.addEventListener("change", syncTheme)

  resize()
  applyLook()
  pick()
  wake()

  return {
    setOptions(next) {
      const prev = options
      options = { ...options, ...next }
      if (prev.theme !== options.theme) {
        dark = resolveDark(options.theme ?? "auto")
      }
      applyLook()
      if (
        prev.scale !== options.scale ||
        prev.backdrop !== options.backdrop ||
        prev.aspect !== options.aspect
      ) {
        layout()
        rasterize()
      }
      pick()
      wake()
    },
    replay() {
      if (source) startReveal()
    },
    destroy() {
      running = false
      cancelAnimationFrame(raf)
      window.clearTimeout(rasterTimer)
      abort?.abort()
      window.removeEventListener("pointermove", onPointerMove)
      document.documentElement.removeEventListener("pointerleave", onPointerLeave)
      document.removeEventListener("visibilitychange", onVisibility)
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      mqReduce.removeEventListener("change", onReduce)
      mqDark.removeEventListener("change", syncTheme)
      clearSubject()
      modelScene.environment?.dispose()
      wallMap.dispose()
      tableMap.dispose()
      wall.geometry.dispose()
      table.geometry.dispose()
      tableFront.geometry.dispose()
      ;(wall.material as Material).dispose()
      ;(table.material as Material).dispose()
      ;(tableFront.material as Material).dispose()
      target.dispose()
      flatMaterial.dispose()
      plane.geometry.dispose()
      paintMaterial.dispose()
      paintQuad.geometry.dispose()
      renderer.dispose()
      // dispose() keeps the context until garbage collection, and browsers
      // cap live contexts; give it back now.
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}
