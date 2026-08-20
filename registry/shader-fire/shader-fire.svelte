<script module>
</script>

<script>
  import { onMount } from "svelte"

  import { cn } from "$lib/utils"
  import {
    createShaderFire,
    DARK_FALLBACK,
    LIGHT_FALLBACK,
    type ShaderFireInstance,
    type ShaderFireOptions,
  } from "./shader-fire-vanilla"

  interface Props extends ShaderFireOptions {
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
    if (!canvas) return
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
      instance?.destroy()
      instance = null
    }
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
