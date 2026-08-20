<script module>
</script>

<script>
  import { onMount } from "svelte"

  import { cn } from "$lib/utils"
  import {
    createShaderGradient,
    DARK_FALLBACK,
    LIGHT_FALLBACK,
    type ShaderGradientInstance,
    type ShaderGradientOptions,
  } from "./shader-gradient-vanilla"

  interface Props extends ShaderGradientOptions {
    class?: string
  }

  let {
    class: className = "",
    colors,
    speed = 0.14,
    blur = 0.7,
    intensity = 0.95,
    interactive = true,
    theme = "auto",
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let isDark = $state(false)
  let instance: ShaderGradientInstance | null = null

  onMount(() => {
    if (!canvas) return
    instance = createShaderGradient(canvas, {
      colors,
      speed,
      blur,
      intensity,
      interactive,
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
      blur,
      intensity,
      interactive,
      theme,
    })
  })

  const fallback = $derived(isDark ? DARK_FALLBACK : LIGHT_FALLBACK)
</script>

<div
  data-slot="shader-gradient"
  aria-hidden="true"
  class={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
  style="background-color: {fallback.backgroundColor}; background-image: {fallback.backgroundImage};"
>
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
