"use client"

import { useLayoutEffect, useMemo } from "react"

import {
  ComponentControls,
  ControlColor,
  ControlSlider,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { useHydratedTheme } from "@/hooks/use-hydrated-theme"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  DARK_COLOR,
  DEFAULT_GLOW,
  DEFAULT_INTERVAL,
  DEFAULT_SIZE,
  DEFAULT_SPACING,
  DEFAULT_SPEED,
  IsoLattice,
  LIGHT_COLOR,
  SHAPES,
  type IsoLatticeShape,
} from "@/registry/iso-lattice/iso-lattice"

function norm(hex: string) {
  return hex.trim().toUpperCase()
}

function isStockColor(color: string) {
  return norm(color) === norm(LIGHT_COLOR) || norm(color) === norm(DARK_COLOR)
}

const SHAPE_LABELS: Record<IsoLatticeShape, [string, string]> = {
  cube: ["Cube", "One solid block"],
  steps: ["Steps", "Four stairs climbing back"],
  pillars: ["Pillars", "A three-by-three bar chart"],
  coil: ["Coil", "A spring rising off the floor"],
}

export function IsoLatticeDemo() {
  const theme = useHydratedTheme()
  const stock = theme === "dark" ? DARK_COLOR : LIGHT_COLOR

  const defaults = useMemo(
    () => ({
      color: stock,
      cube: true,
      steps: true,
      pillars: true,
      coil: true,
      interval: DEFAULT_INTERVAL,
      size: DEFAULT_SIZE,
      spacing: DEFAULT_SPACING,
      glow: DEFAULT_GLOW,
      speed: DEFAULT_SPEED,
      floor: true,
      interactive: true,
    }),
    [stock]
  )

  const { props, updateProp, resetProps, hasChanges, setProps } =
    usePreviewProps(defaults)

  // Keep the stock amber on the active theme until the user picks a color.
  useLayoutEffect(() => {
    setProps((prev) => {
      if (!isStockColor(prev.color)) return prev
      if (norm(prev.color) === norm(stock)) return prev
      return { ...prev, color: stock }
    })
  }, [setProps, stock])

  const useAutoColor = isStockColor(props.color)
  const { cube, steps, pillars, coil } = props
  const shapes = useMemo(() => {
    const on = { cube, steps, pillars, coil }
    const picked = SHAPES.filter((shape) => on[shape])
    return picked.length ? picked : SHAPES
  }, [cube, steps, pillars, coil])
  const allShapes = shapes.length === SHAPES.length

  return (
    <>
      <ComponentPreview
        title="Iso Lattice"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="relative h-[56svh] w-full overflow-hidden rounded-[inherit] bg-background">
          <IsoLattice
            shapes={shapes}
            color={useAutoColor ? undefined : props.color}
            interval={props.interval}
            size={props.size}
            spacing={props.spacing}
            glow={props.glow}
            speed={props.speed}
            floor={props.floor}
            interactive={props.interactive}
          />
        </div>
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="IsoLattice"
        snippetProps={{
          shapes: allShapes ? undefined : shapes,
          color: useAutoColor ? undefined : props.color,
          interval:
            props.interval === DEFAULT_INTERVAL ? undefined : props.interval,
          size: props.size === DEFAULT_SIZE ? undefined : props.size,
          spacing:
            props.spacing === DEFAULT_SPACING ? undefined : props.spacing,
          glow: props.glow === DEFAULT_GLOW ? undefined : props.glow,
          speed: props.speed === DEFAULT_SPEED ? undefined : props.speed,
          floor: props.floor ? undefined : false,
          interactive: props.interactive ? undefined : false,
        }}
      >
        <ControlColor
          label="Tiles"
          value={props.color}
          onChange={(v) => updateProp("color", v)}
        />
        {SHAPES.map((shape) => (
          <ControlSwitch
            key={shape}
            label={SHAPE_LABELS[shape][0]}
            description={SHAPE_LABELS[shape][1]}
            checked={props[shape]}
            onChange={(v) => updateProp(shape, v)}
          />
        ))}
        <ControlSlider
          label="Interval"
          value={props.interval}
          min={1}
          max={10}
          step={0.5}
          format={(v) => `${v}s`}
          onChange={(v) => updateProp("interval", v)}
        />
        <ControlSlider
          label="Size"
          value={props.size}
          min={0.3}
          max={0.9}
          step={0.02}
          onChange={(v) => updateProp("size", v)}
        />
        <ControlSlider
          label="Spacing"
          value={props.spacing}
          min={5}
          max={16}
          step={1}
          format={(v) => `${v}px`}
          onChange={(v) => updateProp("spacing", v)}
        />
        <ControlSlider
          label="Glow"
          value={props.glow}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => updateProp("glow", v)}
        />
        <ControlSlider
          label="Speed"
          value={props.speed}
          min={0}
          max={3}
          step={0.1}
          onChange={(v) => updateProp("speed", v)}
        />
        <ControlSwitch
          label="Floor"
          description="Faint grid under the figure"
          checked={props.floor}
          onChange={(v) => updateProp("floor", v)}
        />
        <ControlSwitch
          label="Interactive"
          description="The pointer lights the lattice"
          checked={props.interactive}
          onChange={(v) => updateProp("interactive", v)}
        />
      </ComponentControls>
    </>
  )
}
