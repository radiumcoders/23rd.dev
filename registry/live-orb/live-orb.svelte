<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createLiveOrb,
    fallbackFaceStyle,
    resolveVariant,
    type LiveOrbInstance,
    type LiveOrbOptions,
  } from "./live-orb-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends Omit<LiveOrbOptions, "onHasGl"> {
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
  const face = $derived(fallbackFaceStyle(resolved))
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
      class="absolute inset-[2%] overflow-hidden rounded-full"
      style={[
        face.backgroundColor && `background-color: ${face.backgroundColor}`,
        face.backgroundImage && `background-image: ${face.backgroundImage}`,
      ]
        .filter(Boolean)
        .join("; ")}
    >
      <span
        class="absolute rounded-full"
        style="background-color: {resolved.eye}; width: 13%; height: 28%; left: 31%; top: 34%;"
      ></span>
      <span
        class="absolute rounded-full"
        style="background-color: {resolved.eye}; width: 13%; height: 28%; left: 56%; top: 34%;"
      ></span>
    </div>
  {/if}
  <canvas bind:this={canvas} class="absolute inset-0 size-full"></canvas>
</div>
