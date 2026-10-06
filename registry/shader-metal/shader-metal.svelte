<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createShaderMetal,
    DEFAULT_IRIDESCENCE,
    DEFAULT_METAL,
    DEFAULT_RIBBONS,
    DEFAULT_SPEED,
    type ShaderMetalInstance,
    type ShaderMetalOptions,
  } from "./shader-metal-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends Omit<ShaderMetalOptions, "onThemeChange"> {
    class?: string
  }

  let {
    class: className = "",
    metal = DEFAULT_METAL,
    color,
    ribbons = DEFAULT_RIBBONS,
    speed = DEFAULT_SPEED,
    iridescence = DEFAULT_IRIDESCENCE,
    interactive = true,
    theme = "auto",
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let instance: ShaderMetalInstance | null = null

  onMount(() => {
    if (!canvas) return
    instance = createShaderMetal(canvas, {
      metal,
      color,
      ribbons,
      speed,
      iridescence,
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
      metal,
      color,
      ribbons,
      speed,
      iridescence,
      interactive,
      theme,
    })
  })
</script>

<div
  data-slot="shader-metal"
  aria-hidden="true"
  class={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] [mask-image:linear-gradient(#000,#000)]", className)}
>
  <!-- Firefox can hand a WebGL canvas straight to the system compositor,
       which ignores rounded clips. The mask on the root keeps it in the
       page's own layer, so the parent's radius holds. -->
  <canvas bind:this={canvas} class="absolute inset-0 size-full rounded-[inherit]"></canvas>
</div>
