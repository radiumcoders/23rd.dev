"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

type Piece = {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  rot: number
  vr: number
  color: string
  tilt: number
  vt: number
  drag: number
  life: number
}

const LIGHT_COLORS = [
  "#18181b",
  "#3f3f46",
  "#a1a1aa",
  "#d4d4d8",
  "#c5b358",
  "#e8c547",
  "#b8bcc4",
]

const DARK_COLORS = [
  "#fafafa",
  "#e4e4e7",
  "#a1a1aa",
  "#71717a",
  "#e8c547",
  "#c5b358",
  "#d4d4d8",
]

function palette(): string[] {
  const dark = document.documentElement.classList.contains("dark")
  return dark ? DARK_COLORS : LIGHT_COLORS
}

function spawnBurst(
  pieces: Piece[],
  originX: number,
  originY: number,
  count: number,
  colors: string[],
  spread: number,
  speed: number,
  upward: number
) {
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread
    const mag = speed * (0.55 + Math.random() * 0.7)
    pieces.push({
      x: originX + (Math.random() - 0.5) * 24,
      y: originY + (Math.random() - 0.5) * 12,
      vx: Math.cos(angle) * mag,
      vy: Math.sin(angle) * mag - upward,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 12,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.28,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      tilt: Math.random() * Math.PI,
      vt: 0.08 + Math.random() * 0.12,
      drag: 0.985 + Math.random() * 0.01,
      life: 1,
    })
  }
}

export function ThanksConfetti({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const pieces: Piece[] = []
    const colors = palette()
    let frame = 0
    let running = true
    let dpr = 1

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { innerWidth: w, innerHeight: h } = window
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener("resize", resize)

    const w = () => window.innerWidth
    const h = () => window.innerHeight

    spawnBurst(pieces, w() * 0.5, h() * 0.28, 90, colors, Math.PI * 0.95, 11, 4)
    spawnBurst(
      pieces,
      w() * 0.12,
      h() * 0.92,
      55,
      colors,
      Math.PI * 0.55,
      16,
      14
    )
    spawnBurst(
      pieces,
      w() * 0.88,
      h() * 0.92,
      55,
      colors,
      Math.PI * 0.55,
      16,
      14
    )

    const later = window.setTimeout(() => {
      spawnBurst(pieces, w() * 0.5, h() * 0.22, 50, colors, Math.PI * 0.7, 9, 3)
    }, 420)

    const tick = () => {
      if (!running) return
      frame = window.requestAnimationFrame(tick)
      const width = w()
      const height = h()
      ctx.clearRect(0, 0, width, height)

      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i]!
        p.vy += 0.18
        p.vx *= p.drag
        p.vy *= p.drag
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        p.tilt += p.vt
        p.life -= 0.0045

        if (p.life <= 0 || p.y > height + 40) {
          pieces.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.scale(Math.cos(p.tilt), 1)
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }

      if (pieces.length === 0) running = false
    }

    frame = window.requestAnimationFrame(tick)

    return () => {
      running = false
      window.cancelAnimationFrame(frame)
      window.clearTimeout(later)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 z-40 h-svh w-svw",
        className
      )}
    />
  )
}
