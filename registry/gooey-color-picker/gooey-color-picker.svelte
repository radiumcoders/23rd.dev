<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    CLOSE_PATHS,
    clamp,
    isHexColor,
    PALETTE_PATHS,
    parseColor,
    toCss,
    toHex,
    type GooeyColor,
  } from "./gooey-color-picker-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  /** Minimal typing for the (still non-standard) EyeDropper API. */
  type EyeDropperResult = { sRGBHex: string }
  type EyeDropperConstructor = new () => {
    open: (options?: { signal?: AbortSignal }) => Promise<EyeDropperResult>
  }

  interface Props {
    value?: GooeyColor | string
    defaultValue?: GooeyColor | string
    onChange?: (color: GooeyColor, css: string) => void
    class?: string
    /** Accessible name for the trigger */
    label?: string
  }

  let {
    value,
    defaultValue,
    onChange,
    class: className = "",
    label = "Color picker",
  }: Props = $props()

  let rootEl: HTMLDivElement | undefined = $state()
  let wheelEl: HTMLDivElement | undefined = $state()
  let alphaEl: HTMLDivElement | undefined = $state()
  let open = $state(false)
  let uncontrolled = $state(parseColor(defaultValue ?? value))
  let hexDraft = $state(toHex(parseColor(defaultValue ?? value)))
  let hexFocused = false
  let supportsEyeDropper = $state(false)

  const color = $derived(
    value !== undefined ? parseColor(value) : uncontrolled
  )
  const css = $derived(toCss(color))
  const opaque = $derived(toCss({ ...color, a: 1 }))
  const hex = $derived(toHex(color))
  const wheelThumb = $derived({
    x: 50 + Math.sin((color.h * Math.PI) / 180) * color.s * 0.42,
    y: 50 - Math.cos((color.h * Math.PI) / 180) * color.s * 0.42,
  })

  $effect(() => {
    if (!hexFocused) hexDraft = hex
  })

  onMount(() => {
    supportsEyeDropper = "EyeDropper" in window
  })

  $effect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") open = false
    }
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootEl?.contains(event.target)) {
        open = false
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("pointerdown", onPointerDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("pointerdown", onPointerDown)
    }
  })

  function setColor(next: GooeyColor) {
    if (value === undefined) uncontrolled = next
    onChange?.(next, toCss(next))
  }

  function applyColor(next: GooeyColor) {
    setColor(next)
    hexDraft = toHex(next)
  }

  function bindDrag(onMove: (clientX: number, clientY: number) => void) {
    return (event: PointerEvent) => {
      event.preventDefault()
      const target = event.currentTarget
      if (!(target instanceof HTMLElement)) return
      target.setPointerCapture(event.pointerId)
      onMove(event.clientX, event.clientY)

      function move(e: PointerEvent) {
        onMove(e.clientX, e.clientY)
      }
      function up(e: PointerEvent) {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        try {
          target.releasePointerCapture(e.pointerId)
        } catch {
          // ignore
        }
      }
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
    }
  }

  function updateWheelFromPointer(clientX: number, clientY: number) {
    const el = wheelEl
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy
    const radius = rect.width / 2
    const dist = Math.min(Math.hypot(dx, dy) / radius, 1)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    const h = (angle + 90 + 360) % 360
    const s = clamp(dist * 100, 0, 100)
    applyColor({ ...color, h, s, l: 55 })
  }

  function updateAlphaFromPointer(clientX: number) {
    const el = alphaEl
    if (!el) return
    const rect = el.getBoundingClientRect()
    const t = clamp((clientX - rect.left) / rect.width, 0, 1)
    applyColor({ ...color, a: t })
  }

  function commitHex(raw: string) {
    const next = parseColor(raw.startsWith("#") ? raw : `#${raw}`)
    const normalized = toHex(next)
    if (isHexColor(raw.trim())) {
      setColor({ ...next })
      hexDraft = normalized
      return
    }
    hexDraft = hex
  }

  async function pickWithEyeDropper() {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperConstructor })
      .EyeDropper
    if (!Ctor) return
    try {
      const { sRGBHex } = await new Ctor().open()
      applyColor({ ...parseColor(sRGBHex), a: color.a })
    } catch {
      // user dismissed the eyedropper — no-op
    }
  }

  function onWheelKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      applyColor({ ...color, h: (color.h + 350) % 360 })
    }
    if (event.key === "ArrowRight") {
      event.preventDefault()
      applyColor({ ...color, h: (color.h + 10) % 360 })
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      applyColor({ ...color, s: clamp(color.s + 5, 0, 100) })
    }
    if (event.key === "ArrowDown") {
      event.preventDefault()
      applyColor({ ...color, s: clamp(color.s - 5, 0, 100) })
    }
  }

  function onAlphaKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault()
      applyColor({ ...color, a: clamp(color.a + 0.05, 0, 1) })
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault()
      applyColor({ ...color, a: clamp(color.a - 0.05, 0, 1) })
    }
  }

  function onHexKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      if (event.currentTarget instanceof HTMLElement) event.currentTarget.blur()
    }
    if (event.key === "Escape") {
      hexDraft = hex
      if (event.currentTarget instanceof HTMLElement) event.currentTarget.blur()
    }
  }
</script>

<div
  bind:this={rootEl}
  data-slot="gooey-color-picker"
  data-open={open ? "true" : "false"}
  class={cn(
    "relative inline-flex h-12 w-48 items-end justify-center select-none",
    className
  )}
>
  <div
    data-gcp-panel
    aria-hidden={!open}
    class="absolute bottom-15 left-1/2 z-10 flex w-48 flex-col items-center overflow-hidden border border-white/15 bg-black p-3 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.65)]"
    style="border-radius: 6rem 6rem 1.35rem 1.35rem; transform-origin: bottom center; translate: -50% {open
      ? 0
      : 12}px; scale: {open
      ? '1 1'
      : '0.22 0.14'}; opacity: {open ? 1 : 0}; filter: blur({open
      ? 0
      : 12}px); pointer-events: {open ? 'auto' : 'none'};"
  >
    <div
      bind:this={wheelEl}
      role="slider"
      tabindex={open ? 0 : -1}
      aria-label="Color"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(color.h)}
      aria-valuetext="hue {Math.round(color.h)}, saturation {Math.round(color.s)}"
      class={cn(
        "relative size-40 shrink-0 touch-none rounded-full outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      )}
      style="background: radial-gradient(circle at center, #fff 0%, transparent 62%), conic-gradient(from 0deg, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%));"
      onpointerdown={bindDrag((x, y) => updateWheelFromPointer(x, y))}
      onkeydown={onWheelKeyDown}
    >
      <span
        class="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
        style="left: {wheelThumb.x}%; top: {wheelThumb.y}%; background: {opaque};"
      ></span>
    </div>

    <div
      bind:this={alphaEl}
      role="slider"
      tabindex={open ? 0 : -1}
      aria-label="Opacity"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(color.a * 100)}
      class={cn(
        "relative mt-3 h-9 w-full shrink-0 touch-none overflow-hidden rounded-xl outline-none ring-1 ring-white/10",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      )}
      style="background: linear-gradient(to right, transparent, {opaque});"
      onpointerdown={bindDrag((x) => updateAlphaFromPointer(x))}
      onkeydown={onAlphaKeyDown}
    >
      <span
        class="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
        style="left: {color.a * 100}%; background: {css};"
      ></span>
    </div>

    <div
      class="mt-3 flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10"
    >
      <span
        class="size-3.5 shrink-0 rounded-full ring-1 ring-white/25"
        style="background: {css};"
        aria-hidden="true"
      ></span>
      <input
        type="text"
        spellcheck="false"
        aria-label="Hex color"
        tabindex={open ? 0 : -1}
        bind:value={hexDraft}
        onfocus={() => {
          hexFocused = true
        }}
        onblur={() => {
          hexFocused = false
          commitHex(hexDraft)
        }}
        onkeydown={onHexKeyDown}
        class="min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/40"
      />
      {#if supportsEyeDropper}
        <button
          type="button"
          aria-label="Pick color from screen"
          tabindex={open ? 0 : -1}
          onclick={pickWithEyeDropper}
          class={cn(
            "-mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-white/60 outline-none",
            "transition-colors hover:bg-white/10 hover:text-white",
            "focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <svg
            viewBox="0 0 24 24"
            class="size-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m3 21 1-1h2.5l8-8"></path>
            <path d="m13.5 5.5 5 5"></path>
            <path
              d="M15 4.5 17.2 2.3a2 2 0 0 1 2.8 0l1.7 1.7a2 2 0 0 1 0 2.8L19.5 9"
            ></path>
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <button
    type="button"
    aria-label={open ? "Close color picker" : label}
    aria-expanded={open}
    aria-haspopup="dialog"
    class={cn(
      "relative z-20 flex size-12 items-center justify-center rounded-full border border-white/20 bg-black text-white outline-none",
      "transition-transform active:scale-[0.94]",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    )}
    onclick={() => {
      open = !open
    }}
  >
    <svg
      viewBox="0 0 24 24"
      class="size-5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {#if open}
        {#each CLOSE_PATHS as d}
          <path {d} class="opacity-100"></path>
        {/each}
      {:else}
        {#each PALETTE_PATHS as d}
          <path {d} class="opacity-100"></path>
        {/each}
      {/if}
    </svg>
  </button>
</div>

<style>
  [data-gcp-panel] {
    transition:
      opacity 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      translate 0.4s cubic-bezier(0.22, 1, 0.36, 1),
      scale 0.4s cubic-bezier(0.22, 1, 0.36, 1),
      filter 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }
</style>
