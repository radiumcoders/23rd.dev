<script module lang="ts">
</script>

<script lang="ts">
  import { onMount, untrack } from "svelte"
  import {
    createTangleFooter,
    DEFAULT_SEED,
    DEFAULT_VINES,
    type TangleFooterInstance,
    type TangleFooterOptions,
  } from "./tangle-footer-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends TangleFooterOptions {
    class?: string
    /** Footer height in px. Default `320`. */
    height?: number
  }

  let {
    class: className = "",
    color,
    height = 320,
    vines = DEFAULT_VINES,
    thickness,
    seed = DEFAULT_SEED,
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let instance: TangleFooterInstance | null = null

  onMount(() => {
    if (!canvas) return
    instance = createTangleFooter(
      canvas,
      untrack(() => ({ color, vines, thickness, seed }))
    )
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({ color, vines, thickness, seed })
  })
</script>

<footer
  data-slot="tangle-footer"
  class={cn("relative w-full overflow-hidden", className)}
  style:height="{height}px"
>
  <canvas bind:this={canvas} aria-hidden="true" class="absolute inset-0 size-full"
  ></canvas>
</footer>
