<script module>
</script>

<script>
  import { onMount } from "svelte"

  import { cn } from "$lib/utils"
  import {
    createAsciiLogo,
    DEFAULT_CHARSET,
    type AsciiLogoInstance,
    type AsciiLogoOptions,
  } from "./ascii-logo-vanilla"

  interface Props extends AsciiLogoOptions {
    class?: string
    /** Accessible name. Default is `text` or `"ASCII logo"`. */
    label?: string
  }

  let {
    class: className = "",
    text = "23rd",
    src,
    fit = 0.82,
    cellSize = 11,
    cellGap = 2,
    charset = DEFAULT_CHARSET,
    threshold = 0.2,
    invert,
    color,
    backgroundColor,
    hoverRadius = 7,
    hoverPush = 2.6,
    hoverEase = 0.18,
    scatterRange = 16,
    scatterEase = 0.055,
    gravity = 0.14,
    bounce = 0.28,
    resetEase = 0.08,
    staggerFrames = 18,
    interactive = true,
    theme = "auto",
    label,
    onPhaseChange,
  }: Props = $props()

  let root: HTMLDivElement | undefined = $state()
  let canvas: HTMLCanvasElement | undefined = $state()
  let instance: AsciiLogoInstance | null = null

  onMount(() => {
    if (!root || !canvas) return
    instance = createAsciiLogo(root, canvas, {
      text,
      src,
      fit,
      cellSize,
      cellGap,
      charset,
      threshold,
      invert,
      color,
      backgroundColor,
      hoverRadius,
      hoverPush,
      hoverEase,
      scatterRange,
      scatterEase,
      gravity,
      bounce,
      resetEase,
      staggerFrames,
      interactive,
      theme,
      onPhaseChange,
    })
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({
      text,
      src,
      fit,
      cellSize,
      cellGap,
      charset,
      threshold,
      invert,
      color,
      backgroundColor,
      hoverRadius,
      hoverPush,
      hoverEase,
      scatterRange,
      scatterEase,
      gravity,
      bounce,
      resetEase,
      staggerFrames,
      interactive,
      theme,
      onPhaseChange,
    })
  })

  const aria = $derived(label ?? (src ? "ASCII logo" : text))
</script>

<div
  bind:this={root}
  data-slot="ascii-logo"
  role="img"
  aria-label={aria}
  tabindex={interactive ? 0 : undefined}
  class={cn(
    "relative size-full overflow-hidden outline-none",
    interactive && "cursor-pointer",
    className
  )}
>
  <canvas
    bind:this={canvas}
    aria-hidden="true"
    class="absolute inset-0 size-full touch-none"
  ></canvas>
</div>
