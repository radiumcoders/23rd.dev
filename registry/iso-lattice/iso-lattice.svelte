<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createIsoLattice,
    DEFAULT_GLOW,
    DEFAULT_INTERVAL,
    DEFAULT_SIZE,
    DEFAULT_SPACING,
    DEFAULT_SPEED,
    SHAPES,
    type IsoLatticeInstance,
    type IsoLatticeOptions,
  } from "./iso-lattice-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends Omit<IsoLatticeOptions, "onThemeChange"> {
    class?: string
  }

  let {
    class: className = "",
    shapes = SHAPES,
    interval = DEFAULT_INTERVAL,
    color,
    size = DEFAULT_SIZE,
    spacing = DEFAULT_SPACING,
    glow = DEFAULT_GLOW,
    speed = DEFAULT_SPEED,
    floor = true,
    interactive = true,
    theme = "auto",
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let instance: IsoLatticeInstance | null = null

  onMount(() => {
    if (!canvas) return
    instance = createIsoLattice(canvas, {
      shapes,
      interval,
      color,
      size,
      spacing,
      glow,
      speed,
      floor,
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
      shapes,
      interval,
      color,
      size,
      spacing,
      glow,
      speed,
      floor,
      interactive,
      theme,
    })
  })
</script>

<div
  data-slot="iso-lattice"
  aria-hidden="true"
  class={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
>
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
