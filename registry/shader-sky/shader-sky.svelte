<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createShaderSky,
    skyFallback,
    resolveDark,
    type ShaderSkyInstance,
    type ShaderSkyOptions,
  } from "./shader-sky-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends Omit<ShaderSkyOptions, "onThemeChange"> {
    class?: string
  }

  let {
    class: className = "",
    colors,
    speed = 0.1,
    coverage = 0.5,
    intensity = 0.9,
    amount = 0.5,
    scale = 0.4,
    variation = 0.7,
    interactive = false,
    glass = false,
    glassSize = 7,
    theme = "auto",
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let isDark = $state(false)
  let instance: ShaderSkyInstance | null = null

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
    instance = createShaderSky(canvas, {
      colors,
      speed,
      coverage,
      intensity,
      amount,
      scale,
      variation,
      interactive,
      glass,
      glassSize,
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
      coverage,
      intensity,
      amount,
      scale,
      variation,
      interactive,
      glass,
      glassSize,
      theme,
    })
  })

  const fallback = $derived(skyFallback(colors, isDark))
</script>

<div
  data-slot="shader-sky"
  aria-hidden="true"
  class={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
  style="background-color: {fallback.backgroundColor}; background-image: {fallback.backgroundImage};"
>
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
