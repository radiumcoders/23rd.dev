<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createPhosphorScore,
    DARK_BG,
    DEFAULT_DENSITY,
    DEFAULT_GLOW,
    DEFAULT_ROTATE_X,
    DEFAULT_ROTATE_Y,
    DEFAULT_ROTATE_Z,
    DEFAULT_SEED,
    DEFAULT_SPEED,
    LIGHT_BG,
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
    rotateX = DEFAULT_ROTATE_X,
    rotateY = DEFAULT_ROTATE_Y,
    rotateZ = DEFAULT_ROTATE_Z,
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
      rotateX,
      rotateY,
      rotateZ,
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
      rotateX,
      rotateY,
      rotateZ,
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
  class={cn("absolute inset-0 overflow-hidden", className)}
  style="background-color: {isDark ? DARK_BG : LIGHT_BG}"
>
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
