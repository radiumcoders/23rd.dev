"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { RiUploadLine } from "@remixicon/react"
import { AnimatePresence, motion } from "motion/react"

import {
  ComponentControls,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { Button } from "@/components/ui/button"
import { usePreviewProps } from "@/hooks/use-preview-props"
import { cn } from "@/lib/utils"
import {
  DEFAULT_EDGES,
  DEFAULT_GRAIN,
  DEFAULT_MODE,
  DEFAULT_SCALE,
  DEFAULT_SPEED,
  DEFAULT_SPIN,
  DEFAULT_WETNESS,
  ShaderWatercolor,
  type ShaderWatercolorMode,
} from "@/registry/shader-watercolor/shader-watercolor"
import {
  createParkScene,
  type ParkScene,
} from "@/registry/shader-watercolor/park-scene"

const SOURCES = [
  {
    id: "park",
    label: "Park",
    src: "",
    alt: "A park from above: a pond with a rowboat and ducks, people walking the paths",
  },
  {
    id: "model",
    label: "Still life",
    src: "/watercolor/still-life.glb",
    alt: "A teapot, a cup, a pear and a bowl of lemons",
  },
  {
    id: "svg",
    label: "Landscape",
    src: "/watercolor/landscape.svg",
    alt: "A sun over layered mountains and a still lake",
  },
  {
    id: "photo",
    label: "Photo",
    src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1400&q=80&auto=format",
    alt: "Mist rolling over green highland cliffs at sunrise",
  },
  {
    id: "video",
    label: "Video",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    alt: "A flower swaying in the breeze",
  },
] as const

/** What the walkers say when you hover one. */
const LINES = [
  "Lovely light today.",
  "Race you to the fountain!",
  "Is that a heron?",
  "Five more minutes.",
  "Look, ducks!",
  "Ice cream after this?",
  "I could stay here all day.",
  "Who's rowing that boat?",
]

const MODES: { id: ShaderWatercolorMode; label: string }[] = [
  { id: "color", label: "Color" },
  { id: "monochrome", label: "Monochrome" },
]

const ACCEPT = "image/*,video/*,.svg,.glb,.gltf,.obj,.stl"

export function ShaderWatercolorDemo() {
  const defaults = useMemo(
    () => ({
      source: 0,
      mode: DEFAULT_MODE,
      wetness: DEFAULT_WETNESS,
      edges: DEFAULT_EDGES,
      grain: DEFAULT_GRAIN,
      speed: DEFAULT_SPEED,
      spin: DEFAULT_SPIN,
      scale: DEFAULT_SCALE,
      backdrop: true,
      interactive: true,
    }),
    []
  )

  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(defaults)
  const [upload, setUpload] = useState<{ src: string; name: string } | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [replayKey, setReplayKey] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!upload) return
    return () => URL.revokeObjectURL(upload.src)
  }, [upload])

  const takeFile = useCallback((file: File | undefined) => {
    if (!file) return
    setError(null)
    setUpload({ src: URL.createObjectURL(file), name: file.name })
  }, [])

  const preset = SOURCES[props.source] ?? SOURCES[0]
  const showPark = !upload && preset.id === "park"
  const [park, setPark] = useState<ParkScene | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)

  // The park runs while it's the subject; the stage's ref owns its life.
  const stage = useCallback(
    (node: HTMLDivElement | null) => {
      stageRef.current = node
      if (!node || !showPark) return
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      const scene = createParkScene({ still })
      setPark(scene)
      return () => {
        scene.destroy()
        setPark(null)
      }
    },
    [showPark]
  )

  // Hover a walker and they say something, following them for a moment.
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [bubble, setBubble] = useState<{ walker: number; line: string } | null>(
    null
  )
  const [overWalker, setOverWalker] = useState(false)
  const lineRef = useRef(0)

  /** Scene px to stage px, matching how the shader fits the plane. */
  const frame = useCallback(() => {
    const stage = stageRef.current
    if (!stage || !park) return null
    const w = stage.clientWidth
    const h = stage.clientHeight
    const ratio = park.width / park.height
    const fw = w * props.scale
    const fh = h * props.scale
    const [pw, ph] = fw / fh > ratio ? [fh * ratio, fh] : [fw, fw / ratio]
    return { x: (w - pw) / 2, y: (h - ph) / 2, k: pw / park.width }
  }, [park, props.scale])

  useEffect(() => {
    if (!bubble || !park) return
    let raf = 0
    const follow = () => {
      const f = frame()
      const el = bubbleRef.current
      if (f && el) {
        const p = park.walkerPosition(bubble.walker)
        el.style.transform = `translate(${f.x + p.x * f.k}px, ${f.y + p.y * f.k}px)`
      }
      raf = requestAnimationFrame(follow)
    }
    follow()
    const hide = window.setTimeout(() => setBubble(null), 2800)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(hide)
    }
  }, [bubble, park, frame])

  const onStageMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const f = frame()
    if (!f || !park) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left - f.x) / f.k
    const y = (event.clientY - rect.top - f.y) / f.k
    const walker = park.walkerAt(x, y, 26)
    setOverWalker(walker >= 0)
    if (walker < 0 || bubble?.walker === walker) return
    lineRef.current = (lineRef.current + 1) % LINES.length
    setBubble({ walker, line: LINES[lineRef.current]! })
  }

  const pick = (i: number) => {
    setUpload(null)
    setError(null)
    updateProp("source", i)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    takeFile(event.dataTransfer.files[0])
  }

  const src = upload?.src ?? (preset.src || undefined)
  const alt = upload ? upload.name : preset.alt

  return (
    <>
      <ComponentPreview
        title="Watercolor"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div
          ref={stage}
          onPointerMove={showPark ? onStageMove : undefined}
          onPointerLeave={() => setOverWalker(false)}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "relative h-[var(--preview-h,56svh)] w-full overflow-hidden rounded-[inherit] bg-background",
            showPark && overWalker && "cursor-pointer"
          )}
        >
          <ShaderWatercolor
            src={src}
            media={showPark ? park?.canvas : undefined}
            alt={alt}
            mode={props.mode}
            wetness={props.wetness}
            edges={props.edges}
            grain={props.grain}
            speed={props.speed}
            spin={props.spin}
            scale={props.scale}
            backdrop={props.backdrop}
            interactive={props.interactive}
            replayKey={replayKey}
            onLoad={() => setError(null)}
            onError={(e) => setError(e.message)}
          />
          <div
            ref={bubbleRef}
            className="pointer-events-none absolute top-0 left-0"
          >
            <AnimatePresence>
              {bubble && showPark ? (
                <motion.div
                  key={`${bubble.walker}-${bubble.line}`}
                  role="status"
                  initial={{ opacity: 0, scale: 0.6, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 4 }}
                  transition={{ type: "spring", duration: 0.45, bounce: 0.35 }}
                  className="absolute bottom-3 left-0 origin-bottom -translate-x-1/2 rounded-full bg-background/95 px-3 py-1.5 text-xs whitespace-nowrap text-foreground shadow-[0_6px_20px_-6px_rgb(0_0_0/0.25)]"
                >
                  {bubble.line}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-3 rounded-[calc(1.25rem-0.75rem)] bg-foreground/5 opacity-0 transition-opacity duration-300",
              dragging && "opacity-100"
            )}
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="ShaderWatercolor"
        snippetProps={{
          src: upload ? "/your-file" : preset.src || "/your-video.mp4",
          mode: props.mode === DEFAULT_MODE ? undefined : props.mode,
          wetness:
            props.wetness === DEFAULT_WETNESS ? undefined : props.wetness,
          edges: props.edges === DEFAULT_EDGES ? undefined : props.edges,
          grain: props.grain === DEFAULT_GRAIN ? undefined : props.grain,
          speed: props.speed === DEFAULT_SPEED ? undefined : props.speed,
          spin: props.spin === DEFAULT_SPIN ? undefined : props.spin,
          scale: props.scale === DEFAULT_SCALE ? undefined : props.scale,
          backdrop: props.backdrop ? undefined : false,
          interactive: props.interactive ? undefined : false,
        }}
      >
        <div className="flex flex-col gap-2">
          <span className="text-sm text-foreground/85">Subject</span>
          <div className="flex flex-wrap gap-1">
            {SOURCES.map((item, i) => (
              <Button
                key={item.id}
                type="button"
                size="xs"
                variant={!upload && props.source === i ? "default" : "outline"}
                aria-pressed={!upload && props.source === i}
                onClick={() => pick(i)}
              >
                {item.label}
              </Button>
            ))}
            <Button
              type="button"
              size="xs"
              variant={upload ? "default" : "outline"}
              aria-pressed={!!upload}
              onClick={() => inputRef.current?.click()}
              className="max-w-40"
            >
              <RiUploadLine data-icon="inline-start" />
              <span className="truncate">{upload ? upload.name : "Upload"}</span>
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                takeFile(event.target.files?.[0])
                event.target.value = ""
              }}
            />
          </div>
          <span
            className={cn(
              "text-xs",
              error ? "text-destructive" : "text-muted-foreground"
            )}
            aria-live="polite"
          >
            {error ??
              "Image, SVG, video, or a .glb, .gltf, .obj or .stl model. Or drop one on the paper."}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-foreground/85">Mode</span>
          <div className="flex gap-1">
            {MODES.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="xs"
                variant={props.mode === item.id ? "default" : "outline"}
                aria-pressed={props.mode === item.id}
                onClick={() => updateProp("mode", item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-foreground/85">Bloom</span>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => setReplayKey((key) => key + 1)}
          >
            Replay
          </Button>
        </div>
        <ControlSlider
          label="Wetness"
          value={props.wetness}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("wetness", v)}
        />
        <ControlSlider
          label="Edges"
          value={props.edges}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("edges", v)}
        />
        <ControlSlider
          label="Grain"
          value={props.grain}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("grain", v)}
        />
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={0}
          max={1.5}
          step={0.05}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSlider
          label="Spin"
          value={props.spin}
          min={-60}
          max={60}
          step={1}
          onChange={(v) => updateProp("spin", v)}
        />
        <ControlSlider
          label="Scale"
          value={props.scale}
          min={0.3}
          max={1}
          step={0.02}
          onChange={(v) => updateProp("scale", v)}
        />
        <ControlSwitch
          label="Backdrop"
          description="Set models on a table, framed like a canvas"
          checked={props.backdrop}
          onChange={(v) => updateProp("backdrop", v)}
        />
        <ControlSwitch
          label="Interactive"
          description="The pointer re-wets the paint"
          checked={props.interactive}
          onChange={(v) => updateProp("interactive", v)}
        />
      </ComponentControls>
    </>
  )
}
