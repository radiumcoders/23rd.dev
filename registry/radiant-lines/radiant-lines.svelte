<script module>
</script>

<script>
  import { onMount } from "svelte"

  import { cn } from "$lib/utils"
  import {
    createRadiantLines,
    DEFAULT_COLORS,
    type RadiantLinesInstance,
    type RadiantLinesOptions,
  } from "./radiant-lines-vanilla"

  interface Props extends Omit<RadiantLinesOptions, "container"> {
    class?: string
    container?: HTMLElement
  }

  let {
    class: className = "",
    colors = DEFAULT_COLORS,
    starCount = 420,
    container,
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let instance: RadiantLinesInstance | null = null

  onMount(() => {
    if (!canvas) return
    instance = createRadiantLines(canvas, {
      colors,
      starCount,
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
