"use client"

import { IsoLattice, LIGHT_COLOR, type IsoLatticeShape } from "./iso-lattice"

const settings = {
  color: "#C2560C",
  speed: 1,
  size: 0.8,
  glow: 0.6,
  pillars: true,
  steps: true,
  cube: true,
  coil: true,
}

// The bar chart leads: it is the figure that holds under reduced motion.
const ORDER: IsoLatticeShape[] = ["pillars", "steps", "cube", "coil"]

export default function IsoLatticeDemo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }
  const on = { pillars: s.pillars, steps: s.steps, cube: s.cube, coil: s.coil }
  const picked = ORDER.filter((shape) => on[shape])
  const shapes = picked.length ? picked : ORDER

  // The stock orange follows the theme (burnt on light, amber on dark).
  const color =
    s.color.trim().toUpperCase() === LIGHT_COLOR ? undefined : s.color

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <IsoLattice
        shapes={shapes}
        color={color}
        speed={s.speed}
        size={s.size}
        glow={s.glow}
      />
    </div>
  )
}
