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
    className,
  ]
    .filter(Boolean)
    .join(" ")}
>
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
