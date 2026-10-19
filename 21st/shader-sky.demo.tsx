import { ShaderSky } from "./shader-sky"

const settings = {
  speed: 0.1,
  coverage: 0.5,
  amount: 0.5,
  lightning: true,
  glass: false,
  glassSize: 7,
  colors: ["#2478C8", "#8ECBF2", "#F7FBFF", "#C5D8EC"],
}

// The stock clear-sky palette. Left as is, the sky follows the site theme
// and turns to storm in dark mode; any other palette stays put in both.
const STOCK = ["#2478C8", "#8ECBF2", "#F7FBFF", "#C5D8EC"]

function isStock(colors: string[]) {
  return (
    colors.length === STOCK.length &&
    colors.every((c, i) => c.toUpperCase() === STOCK[i])
  )
}

export default function ShaderSkyDemo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <ShaderSky
        speed={s.speed}
        coverage={s.coverage}
        amount={s.amount}
        lightning={s.lightning}
        glass={s.glass}
        glassSize={s.glassSize}
        colors={isStock(s.colors) ? undefined : s.colors}
      />
    </div>
  )
}
