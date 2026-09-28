<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createShaderAnimeFire,
    DARK_FALLBACK,
    DEFAULT_EMBERS,
    DEFAULT_HEIGHT,
    DEFAULT_INTENSITY,
    DEFAULT_SPEED,
    LIGHT_FALLBACK,
    resolveDark,
    type ShaderAnimeFireInstance,
    type ShaderAnimeFireOptions,
  } from "./shader-anime-fire-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends Omit<ShaderAnimeFireOptions, "onThemeChange"> {
    class?: string
  }

  let {
    class: className = "",
    colors,
    speed = DEFAULT_SPEED,
    intensity = DEFAULT_INTENSITY,
    height = DEFAULT_HEIGHT,
    embers = DEFAULT_EMBERS,
    interactive = true,
    dither = false,
    pixelSize = 1,
    theme = "auto",
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let isDark = $state(false)
  let instance: ShaderAnimeFireInstance | null = null

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
    instance = createShaderAnimeFire(canvas, {
      colors,
      speed,
      intensity,
      height,
      embers,
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
      embers,
      interactive,
      dither,
      pixelSize,
      theme,
    })
  })

  const fallback = $derived(isDark ? DARK_FALLBACK : LIGHT_FALLBACK)
</script>

<div
  data-slot="shader-anime-fire"
  aria-hidden="true"
  class={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] [mask-image:linear-gradient(#000,#000)]", className)}
  style="background-color: {fallback.backgroundColor}; background-image: {fallback.backgroundImage};"
>
  <!-- Firefox can hand an opaque WebGL canvas straight to the system
       compositor, which ignores rounded clips. The mask on the root keeps it
       in the page's own layer, so the parent's radius holds. -->
  <canvas bind:this={canvas} class="absolute inset-0 size-full rounded-[inherit]"></canvas>
</div>
