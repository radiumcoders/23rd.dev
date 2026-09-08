<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createPhosphorScore,
    DARK_BG,
    DEFAULT_DENSITY,
    DEFAULT_GLOW,
    DEFAULT_SEED,
    DEFAULT_SPEED,
    resolveDark,
    type PhosphorScoreInstance,
    type PhosphorScoreOptions,
  } from "./phosphor-score-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends Omit<PhosphorScoreOptions, "onThemeChange"> {
    class?: string
  }

  let {
    class: className = "",
    color,
    glow = DEFAULT_GLOW,
    speed = DEFAULT_SPEED,
    density = DEFAULT_DENSITY,
    sway = true,
    seed = DEFAULT_SEED,
    theme = "auto",
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let isDark = $state(false)
  let instance: PhosphorScoreInstance | null = null

  onMount(() => {
    isDark = resolveDark(theme)
    if (!canvas) return
    instance = createPhosphorScore(canvas, {
      color,
      glow,
      speed,
      density,
      sway,
      seed,
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
      color,
      glow,
      speed,
      density,
      sway,
      seed,
      theme,
    })
  })
</script>

<div
  data-slot="phosphor-score"
  role="img"
  aria-label="Falling phosphor sheet music"
  class={cn("absolute inset-0 overflow-hidden bg-background", className)}
  style={isDark ? `background-color: ${DARK_BG}` : ""}
>
  <canvas
    bind:this={canvas}
    class="absolute inset-0 size-full mask-[linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)]"
  ></canvas>
  <div
    aria-hidden="true"
    class={cn(
      "pointer-events-none absolute inset-x-0 top-0 z-10 h-28",
      !isDark &&
        "bg-linear-to-b from-background from-20% via-background/55 to-transparent"
    )}
    style={isDark
      ? `background-image: linear-gradient(to bottom, ${DARK_BG} 18%, rgba(5,5,5,0.55) 48%, transparent)`
      : ""}
  ></div>
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 backdrop-blur-md mask-[linear-gradient(to_bottom,black,transparent)]"
  ></div>
  <div
    aria-hidden="true"
    class={cn(
      "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28",
      !isDark &&
        "bg-linear-to-t from-background from-20% via-background/55 to-transparent"
    )}
    style={isDark
      ? `background-image: linear-gradient(to top, ${DARK_BG} 18%, rgba(5,5,5,0.55) 48%, transparent)`
      : ""}
  ></div>
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 backdrop-blur-md mask-[linear-gradient(to_top,black,transparent)]"
  ></div>
</div>
