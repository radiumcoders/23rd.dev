<script module>
</script>

<script>
  import { onMount } from "svelte"

  import { cn } from "$lib/utils"
  import {
    createLiveOrb,
    resolveVariant,
    type LiveOrbInstance,
    type LiveOrbOptions,
  } from "./live-orb-vanilla"

  interface Props extends LiveOrbOptions {
    class?: string
    /** Edge length in CSS pixels. Default `280`. */
    size?: number
  }

  let {
    class: className = "",
    size = 280,
    variant = "white",
    color,
    eyeColor,
    colors,
    interactive = true,
    blink = true,
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let hasGl = $state(false)
  let instance: LiveOrbInstance | null = null

  onMount(() => {
    if (!canvas) return
    instance = createLiveOrb(canvas, {
      variant,
      color,
      eyeColor,
      colors,
      interactive,
      blink,
      onHasGl: (ok) => {
        hasGl = ok
      },
    })
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({
      variant,
      color,
      eyeColor,
      colors,
      interactive,
      blink,
    })
  })

  const resolved = $derived(resolveVariant(variant, color, eyeColor, colors))
</script>

<div
  data-slot="live-orb"
  role="img"
  aria-label="Orb character"
  class={cn("relative shrink-0", className)}
  style="width: {size}px; height: {size}px;"
>
  {#if !hasGl}
    <div
      aria-hidden="true"
      class="absolute inset-[7%] overflow-hidden rounded-full"
      style="background-image: radial-gradient(circle at 38% 30%, {resolved.highlight} 0%, {resolved.body} 52%, {resolved.shade} 100%);"
    >
      <span
        class="absolute rounded-full"
        style="background-color: {resolved.eye}; width: 11%; height: 26%; left: 32%; top: 34%;"
      ></span>
      <span
        class="absolute rounded-full"
        style="background-color: {resolved.eye}; width: 11%; height: 26%; left: 57%; top: 34%;"
      ></span>
    </div>
  {/if}
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
