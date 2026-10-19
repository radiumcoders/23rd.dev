"use client"

import { useEffect, useState } from "react"

import { MechKeyboard } from "./mech-keyboard"

const SHORTCUT = ["MetaLeft", "KeyK"]

const settings = {
  scale: 1,
  platform: "mac",
  monochrome: false,
  recorder: true,
  hint: true,
  interactive: true,
  sound: false,
}

/** On wide stages the board fits by height; grow it into the spare width. */
function useWideBoost() {
  const [boost, setBoost] = useState(1)
  useEffect(() => {
    const measure = () => {
      const aspect = window.innerWidth / Math.max(1, window.innerHeight)
      setBoost(Math.min(1.2, Math.max(1, aspect / 1.45)))
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])
  return boost
}

export default function MechKeyboardDemo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }
  const boost = useWideBoost()

  return (
    <main className="relative h-screen min-h-[420px] w-full overflow-hidden bg-background">
      <MechKeyboard
        scale={s.scale * boost}
        platform={s.platform === "pc" ? "pc" : "mac"}
        monochrome={s.monochrome}
        recorder={s.recorder}
        defaultShortcut={SHORTCUT}
        highlight={s.hint ? SHORTCUT : undefined}
        interactive={s.interactive}
        sound={s.sound}
      />
    </main>
  )
}
