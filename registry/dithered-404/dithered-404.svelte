<script module>
</script>

<script>
  import { onMount } from "svelte"

  import { cn } from "$lib/utils"
  import {
    createDithered404,
    type Dithered404Instance,
    type Dithered404Options,
  } from "./dithered-404-vanilla"

  interface Props extends Dithered404Options {
    class?: string
  }

  let {
    class: className = "",
    color,
    pixelSize = 4,
    brush = 28,
    interactive = true,
    dither = true,
    theme = "auto",
  }: Props = $props()

  let wrap: HTMLDivElement | undefined = $state()
  let canvas: HTMLCanvasElement | undefined = $state()
  let hideCursor = $state(false)
  let instance: Dithered404Instance | null = null

  onMount(() => {
    if (!wrap || !canvas) return
    instance = createDithered404(wrap, canvas, {
      color,
      pixelSize,
      brush,
      interactive,
      dither,
      theme,
      onHideCursor: (hide) => {
        hideCursor = hide
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
      pixelSize,
      brush,
      interactive,
      dither,
      theme,
    })
  })
</script>

<div
  bind:this={wrap}
  data-slot="dithered-404"
  class={cn(
    "absolute inset-0 touch-none overflow-hidden",
    hideCursor && interactive && "cursor-none",
    className
  )}
>
  <span class="sr-only">404</span>
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
