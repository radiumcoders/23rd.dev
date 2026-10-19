import { ShaderAnimeFire } from "./shader-anime-fire"

const settings = {
  speed: 0.6,
  intensity: 1,
  height: 0.8,
  interactive: true,
  colors: ["#D8341A", "#F9731E", "#FFBA3A"],
}

// The stock light palette. Left as is, the fire follows the site theme and
// swaps to its own dark palette; any other palette is used in both themes.
const STOCK = ["#D8341A", "#F9731E", "#FFBA3A"]

function isStock(colors: string[]) {
  return (
    colors.length === STOCK.length &&
    colors.every((c, i) => c.toUpperCase() === STOCK[i])
  )
}

export default function ShaderAnimeFireDemo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <ShaderAnimeFire
        speed={s.speed}
        intensity={s.intensity}
        height={s.height}
        interactive={s.interactive}
        colors={isStock(s.colors) ? undefined : s.colors}
      />
    </div>
  )
}
