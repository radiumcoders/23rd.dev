<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createPhosphorScore,
    DEFAULT_COLOR,
    DEFAULT_DENSITY,
    DEFAULT_GLOW,
    DEFAULT_ROTATE_X,
    DEFAULT_ROTATE_Y,
    DEFAULT_SEED,
    DEFAULT_SPEED,
    type PhosphorScoreInstance,
    type PhosphorScoreOptions,
  } from "./phosphor-score-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends PhosphorScoreOptions {
    class?: string
  }

  let {
    class: className = "",
    color = DEFAULT_COLOR,
    glow = DEFAULT_GLOW,
    rotateX = DEFAULT_ROTATE_X,
    rotateY = DEFAULT_ROTATE_Y,
    speed = DEFAULT_SPEED,
    density = DEFAULT_DENSITY,
    sway = true,
    seed = DEFAULT_SEED,
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let instance: PhosphorScoreInstance | null = null

  onMount(() => {
    if (!canvas) return
    instance = createPhosphorScore(canvas, {
      color,
      glow,
      rotateX,
      rotateY,
      speed,
      density,
      sway,
      seed,
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
      speed,
      density,
      sway,
      seed,
    })
  })
</script>

<div
  data-slot="phosphor-score"
  role="img"
  aria-label="Falling phosphor sheet music"
  class={cn("absolute inset-0 overflow-hidden bg-black", className)}
>
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
