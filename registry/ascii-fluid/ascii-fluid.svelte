<script module>
</script>

<script>
  import { onMount } from "svelte"

  import { cn } from "$lib/utils"
  import {
    createAsciiFluid,
    DEFAULT_CHARSET,
    type AsciiFluidInstance,
    type AsciiFluidOptions,
  } from "./ascii-fluid-vanilla"

  interface Props extends AsciiFluidOptions {
    class?: string
  }

  let {
    class: className = "",
    charset = DEFAULT_CHARSET,
    cellSize = 12,
    color,
    backgroundColor,
    force = 1,
    dissipation = 0.05,
    brush = 0.55,
    animate = true,
    interactive = true,
    theme = "auto",
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let instance: AsciiFluidInstance | null = null

  onMount(() => {
    if (!canvas) return
    instance = createAsciiFluid(canvas, {
      charset,
      cellSize,
      color,
      backgroundColor,
      force,
      dissipation,
      brush,
      animate,
      interactive,
      theme,
    })
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({
      charset,
      cellSize,
      color,
      backgroundColor,
      force,
      dissipation,
      brush,
      animate,
      interactive,
      theme,
    })
  })
</script>

<div
  data-slot="ascii-fluid"
  aria-hidden="true"
  class={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
>
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
