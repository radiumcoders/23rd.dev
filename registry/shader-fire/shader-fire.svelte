<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createShaderFire,
    DARK_FALLBACK,
    LIGHT_FALLBACK,
    resolveDark,
    type ShaderFireInstance,
    type ShaderFireOptions,
  } from "./shader-fire-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends Omit<ShaderFireOptions, "onThemeChange"> {
    class?: string
  }

  let {
    class: className = "",
    colors,
    speed = 0.55,
    intensity = 0.55,
    height = 0.45,
    interactive = true,
    dither = false,
    pixelSize = 1,
    theme = "auto",
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let isDark = $state(false)
  let instance: ShaderFireInstance | null = null

  onMount(() => {
    const sync = () => {
      isDark = resolveDark(theme)
    }
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    })
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    mq.addEventListener("change", sync)

    if (!canvas) {
      return () => {
        mo.disconnect()
        mq.removeEventListener("change", sync)
      }
    }
    instance = createShaderFire(canvas, {
      colors,
      speed,
      intensity,
      height,
      interactive,
      dither,
      pixelSize,
      theme,
      onThemeChange: (dark) => {
        isDark = dark
      },
    })
    return () => {
      mo.disconnect()
      mq.removeEventListener("change", sync)
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    isDark = resolveDark(theme)
  })

  $effect(() => {
    instance?.setOptions({
      colors,
      speed,
      intensity,
      height,
      interactive,
      dither,
      pixelSize,
      theme,
    })
  })

  const fallback = $derived(isDark ? DARK_FALLBACK : LIGHT_FALLBACK)
</script>

<div
  data-slot="shader-fire"
  aria-hidden="true"
  class={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
  style="background-color: {fallback.backgroundColor}; background-image: {fallback.backgroundImage};"
>
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
