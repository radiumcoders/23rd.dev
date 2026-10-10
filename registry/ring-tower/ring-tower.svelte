<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createRingTower,
    DEFAULT_BACKFACE,
    DEFAULT_PARALLAX,
    DEFAULT_RINGS,
    DEFAULT_SPEED,
    type RingTowerInstance,
    type RingTowerOptions,
  } from "./ring-tower-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends RingTowerOptions {
    class?: string
  }

  let {
    class: className = "",
    images,
    rings = DEFAULT_RINGS,
    speed = DEFAULT_SPEED,
    draggable = true,
    parallax = DEFAULT_PARALLAX,
    backface = DEFAULT_BACKFACE,
  }: Props = $props()

  let root: HTMLDivElement | undefined = $state()
  let instance: RingTowerInstance | null = null

  onMount(() => {
    if (!root) return
    instance = createRingTower(root, {
      images,
      rings,
      speed,
      draggable,
      parallax,
      backface,
    })
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({
      images,
      rings,
      speed,
      draggable,
      parallax,
      backface,
    })
  })
</script>

<div
  bind:this={root}
  data-slot="ring-tower"
  aria-hidden="true"
  class={cn("absolute inset-0 overflow-hidden rounded-[inherit] [mask-image:linear-gradient(#000,#000)]", className)}
></div>
