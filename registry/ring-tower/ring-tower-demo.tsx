"use client"

import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  ComponentControls,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  DEFAULT_BACKFACE,
  DEFAULT_PARALLAX,
  DEFAULT_RINGS,
  DEFAULT_SPEED,
  RingTower,
} from "@/registry/ring-tower/ring-tower"

const W = 624
const H = 580
const INK = "#0B3D27"
const FONT = "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"

function card(body: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38C46C"/><stop offset="1" stop-color="#25A957"/></linearGradient>
<pattern id="p" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#7BE39F" stroke-opacity=".35" stroke-width="1.5"/></pattern>
</defs>
<rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#p)"/>
<g fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" font-family="${FONT}">${body}</g>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const text = (
  x: number,
  y: number,
  size: number,
  value: string,
  weight = 400
) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${INK}" stroke="none">${value}</text>`

const lines = (x: number, y: number, widths: number[]) =>
  widths
    .map((w, i) => `<path d="M${x} ${y + i * 26}h${w}" stroke-opacity=".55"/>`)
    .join("")

const PHOTOS = [
  "1506905925346-21bda4d32df4",
  "1501785888041-af3ef285b470",
  "1441974231531-c6227db76b6e",
  "1470071459604-3b5ec3a7fe05",
  "1507525428034-b723cf961d3e",
  "1472214103451-9374bd1c798e",
  "1433086966358-54859d0ed716",
  "1469474968028-56623f02e42e",
].map(
  (id) =>
    `https://images.unsplash.com/photo-${id}?w=1200&h=800&fit=crop&q=75&auto=format`
)

const CARDS = [
  card(
    text(56, 150, 40, "Ship the sharper default", 500) +
      lines(56, 196, [500, 470, 380]) +
      `<rect x="56" y="300" width="150" height="190" rx="4"/><rect x="236" y="300" width="150" height="190" rx="4"/><rect x="416" y="300" width="150" height="190" rx="4"/>` +
      `<circle cx="131" cy="380" r="40"/><path d="M111 380h40M131 360v40"/>` +
      `<path d="M276 440l35-90 35 90zM291 405h40"/>` +
      `<rect x="451" y="350" width="80" height="80" rx="16"/><path d="M471 390h40"/>`
  ),
  card(
    text(56, 130, 22, "How did it feel?", 500) +
      text(450, 180, 22, "Effortless") +
      [0, 1, 2, 3, 4]
        .map(
          (i) =>
            `<rect x="${56 + i * 104}" y="230" width="80" height="80" rx="14"/>` +
            text(88 + i * 104, 282, 28, String(i + 1))
        )
        .join("") +
      text(110, 400, 22, "Research by the 23rd studio") +
      `<path d="M56 470h512" stroke-dasharray="6 10"/>`
  ),
  card(
    `<path d="M56 160h512M56 430h512"/>` +
      `<circle cx="170" cy="295" r="80"/><circle cx="170" cy="275" r="28"/><path d="M118 352c12-30 92-30 104 0"/>` +
      text(290, 280, 40, "Ada Mercer", 500) +
      text(290, 325, 26, "Founder &amp; Designer") +
      `<rect x="292" y="350" width="26" height="26" rx="4"/><rect x="334" y="350" width="26" height="26" rx="4"/>`
  ),
  card(
    text(56, 120, 26, "Weekly signal", 500) +
      [180, 260, 120, 300, 210, 340, 160, 280, 230]
        .map(
          (h, i) =>
            `<rect x="${70 + i * 56}" y="${480 - h}" width="32" height="${h}" rx="3"/>`
        )
        .join("") +
      `<path d="M56 500h512"/>` +
      text(60, 540, 18, "Mon") +
      text(290, 540, 18, "Wed") +
      text(520, 540, 18, "Sun")
  ),
  card(
    text(120, 110, 30, "You left something behind", 500) +
      `<circle cx="120" cy="220" r="44"/><path d="M120 196v24l16 12"/>` +
      text(200, 214, 20, "Field Watch") +
      text(470, 214, 20, "$210") +
      `<path d="M56 290h512"/>` +
      `<rect x="78" y="320" width="84" height="84" rx="10"/><path d="M98 362h44M120 340v44"/>` +
      text(200, 370, 20, "Desk Clock") +
      text(476, 370, 20, "$40") +
      `<rect x="56" y="450" width="512" height="56" rx="10"/>` +
      text(268, 486, 22, "Checkout", 500)
  ),
]

type Source = "photos" | "cards" | "none"

const SOURCES: { id: Source; label: string; images?: string[] }[] = [
  { id: "photos", label: "Photos", images: PHOTOS },
  { id: "cards", label: "Cards", images: CARDS },
  { id: "none", label: "None" },
]

export function RingTowerDemo() {
  const defaults = useMemo(
    () => ({
      rings: DEFAULT_RINGS,
      speed: DEFAULT_SPEED,
      parallax: DEFAULT_PARALLAX,
      backface: DEFAULT_BACKFACE,
      draggable: true,
      source: "photos" as Source,
    }),
    []
  )

  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(defaults)

  const images = SOURCES.find((s) => s.id === props.source)?.images

  return (
    <>
      <ComponentPreview
        title="Ring Tower"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[64svh] w-full overflow-hidden rounded-[inherit] bg-black">
          <RingTower
            images={images}
            rings={props.rings}
            speed={props.speed}
            parallax={props.parallax}
            backface={props.backface}
            draggable={props.draggable}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black via-black/60 to-transparent"
          />
          {props.source === "photos" ? (
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noreferrer"
              className="absolute right-3 bottom-3 text-xs text-white/50 transition-colors hover:text-white"
            >
              Photos from Unsplash
            </a>
          ) : null}
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="RingTower"
        snippetProps={{
          images:
            props.source === "none"
              ? undefined
              : ["/bands/0.jpg", "/bands/1.jpg", "/bands/2.jpg"],
          rings: props.rings === DEFAULT_RINGS ? undefined : props.rings,
          speed: props.speed === DEFAULT_SPEED ? undefined : props.speed,
          parallax:
            props.parallax === DEFAULT_PARALLAX ? undefined : props.parallax,
          backface:
            props.backface === DEFAULT_BACKFACE ? undefined : props.backface,
          draggable: props.draggable ? undefined : false,
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-foreground/85">Images</span>
          <div className="flex flex-wrap gap-1">
            {SOURCES.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="xs"
                variant={props.source === item.id ? "default" : "outline"}
                aria-pressed={props.source === item.id}
                onClick={() => updateProp("source", item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        <ControlSlider
          label="Rings"
          value={props.rings}
          min={1}
          max={24}
          step={1}
          onChange={(v) => updateProp("rings", v)}
        />
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={0}
          max={4}
          step={0.1}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSlider
          label="Parallax"
          value={props.parallax}
          min={0}
          max={90}
          step={1}
          onChange={(v) => updateProp("parallax", v)}
        />
        <ControlSlider
          label="Backface"
          value={props.backface}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateProp("backface", v)}
        />
        <ControlSwitch
          label="Draggable"
          description="Drag a band to spin the tower"
          checked={props.draggable}
          onChange={(v) => updateProp("draggable", v)}
        />
      </ComponentControls>
    </>
  )
}
