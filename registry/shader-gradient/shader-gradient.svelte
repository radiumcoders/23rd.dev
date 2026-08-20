<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createShaderGradient,
    DARK_FALLBACK,
    LIGHT_FALLBACK,
    resolveDark,
    type ShaderGradientInstance,
    type ShaderGradientOptions,
  } from "./shader-gradient-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends Omit<ShaderGradientOptions, "onThemeChange"> {
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
