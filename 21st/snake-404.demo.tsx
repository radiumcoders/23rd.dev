"use client"

import { Snake404 } from "./snake-404"

const settings = {
  code: "404",
  cellSize: 10,
  speed: 14,
  maxLength: 48,
  grid: true,
  lcd: false,
  score: true,
  playable: true,
}

export default function Snake404Demo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }

  return (
    <main className="flex h-screen min-h-[420px] w-full flex-col gap-4 bg-background p-4 sm:gap-5 sm:p-6">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] bg-muted/50 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <Snake404
          code={s.code}
          cellSize={s.cellSize}
          speed={s.speed}
          maxLength={s.maxLength}
          grid={s.grid}
          lcd={s.lcd}
          score={s.score}
          playable={s.playable}
        />
      </div>

      <footer className="flex items-center justify-between gap-4 px-2 pb-1">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-foreground">
            This page could not be found
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {s.playable
              ? "Click the board and steer with the arrow keys."
              : "It may have moved, or never existed."}
          </p>
        </div>
        <a
          href="/"
          className="inline-flex h-10 shrink-0 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity outline-none hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Back home
        </a>
      </footer>
    </main>
  )
}
