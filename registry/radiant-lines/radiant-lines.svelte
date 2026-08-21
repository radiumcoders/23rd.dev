<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createRadiantLines,
    DEFAULT_COLORS,
    type RadiantLinesInstance,
    type RadiantLinesOptions,
  } from "./radiant-lines-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends Omit<RadiantLinesOptions, "container"> {
    class?: string
    container?: HTMLElement
  }

  let {
    class: className = "",
    colors = DEFAULT_COLORS,
    starCount = 420,
    displacement = 1,
    container,
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let instance: RadiantLinesInstance | null = null

  onMount(() => {
    if (!canvas) return
    instance = createRadiantLines(canvas, {
      colors,
      starCount,
      displacement,
      container: container ?? null,
    })
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({
      colors,
      starCount,
      displacement,
      container: container ?? null,
    })
  })
</script>

<div
  data-slot="radiant-lines"
  aria-hidden="true"
  class={cn(
    "pointer-events-none absolute inset-0 overflow-hidden bg-background",
    className
  )}
>
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
