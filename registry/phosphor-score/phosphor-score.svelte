<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createPhosphorScore,
    DEFAULT_DENSITY,
    DEFAULT_GLOW,
    DEFAULT_SEED,
    DEFAULT_SPEED,
    type PhosphorScoreInstance,
    type PhosphorScoreOptions,
    type PhosphorScoreTheme,
  } from "./phosphor-score-vanilla"

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
    rotateX = 0,
    rotateY = 0,
    rotateZ = 0,
    theme = "auto",
  }: Props = $props()

  /**
   * Background before the first frame, so dark mode never flashes light.
   * `#050505` is `DARK_BG`; Tailwind needs the literal.
   */
  const SURFACE: Record<PhosphorScoreTheme, string> = {
    auto: "bg-background dark:bg-[#050505]",
    dark: "bg-[#050505]",
    light: "bg-background",
  }

  let canvas: HTMLCanvasElement | undefined = $state()
  let instance: PhosphorScoreInstance | null = null

  onMount(() => {
    if (!canvas) return
    instance = createPhosphorScore(canvas, {
      color,
      glow,
      speed,
      density,
      sway,
      seed,
      rotateX,
      rotateY,
      rotateZ,
      theme,
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
      rotateX,
      rotateY,
      rotateZ,
      theme,
    })
  })
</script>

<div
  data-slot="phosphor-score"
  role="img"
  aria-label="Falling phosphor sheet music"
  class={[
    "absolute inset-0 overflow-hidden",
    SURFACE[theme] ?? SURFACE.auto,
    className,
  ]
    .filter(Boolean)
    .join(" ")}
>
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
