<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createAsciiFluid,
    DEFAULT_CHARSET,
    type AsciiFluidInstance,
    type AsciiFluidOptions,
  } from "./ascii-fluid-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

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
  class={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] [mask-image:linear-gradient(#000,#000)]", className)}
>
  <!-- Firefox can hand an opaque WebGL canvas straight to the system
       compositor, which ignores rounded clips. The mask on the root keeps it
       in the page's own layer, so the parent's radius holds. -->
  <canvas bind:this={canvas} class="absolute inset-0 size-full rounded-[inherit]"></canvas>
</div>
