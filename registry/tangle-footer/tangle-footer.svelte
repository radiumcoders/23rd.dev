<script module lang="ts">
</script>

<script lang="ts">
  import { onMount, untrack } from "svelte"
  import {
    createTangleFooter,
    DEFAULT_LINES,
    DEFAULT_SEED,
    DEFAULT_SPEED,
    DEFAULT_VINES,
    type TangleFooterInstance,
    type TangleFooterOptions,
    type TangleFooterTheme,
  } from "./tangle-footer-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends TangleFooterOptions {
    class?: string
    /**
     * Field behind the vines. Omit for theme-aware defaults (warm cream on
     * light, near-black on dark). Pass `"transparent"` when the parent
     * already paints the stage.
     */
    background?: string
    /** Footer height in px. Default `320`. */
    height?: number
    /** Accessible label. */
    label?: string
  }

  let {
    class: className = "",
    lines = DEFAULT_LINES,
    ribbon,
    textColor,
    background,
    height = 320,
    vines = DEFAULT_VINES,
    speed = DEFAULT_SPEED,
    thickness,
    seed = DEFAULT_SEED,
    theme = "auto",
    label = "Site footer",
  }: Props = $props()

  /** Stage color before and behind the canvas; hex literals for Tailwind. */
  const SURFACE: Record<TangleFooterTheme, string> = {
    auto: "bg-[#EFEAE2] dark:bg-[#121210]",
    dark: "bg-[#121210]",
    light: "bg-[#EFEAE2]",
  }

  let canvas: HTMLCanvasElement | undefined = $state()
  let instance: TangleFooterInstance | null = null

  onMount(() => {
    if (!canvas) return
    instance = createTangleFooter(
      canvas,
      untrack(() => ({
        lines,
        ribbon,
        textColor,
        vines,
        speed,
        thickness,
        seed,
        theme,
      }))
    )
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({
      lines,
      ribbon,
      textColor,
      vines,
      speed,
      thickness,
      seed,
      theme,
    })
  })
</script>

<footer
  data-slot="tangle-footer"
  aria-label={label}
  class={cn(
    "relative w-full overflow-hidden",
    background === undefined && (SURFACE[theme] ?? SURFACE.auto),
    className
  )}
  style:background={background}
  style:height="{height}px"
>
  <canvas bind:this={canvas} aria-hidden="true" class="absolute inset-0 size-full"
  ></canvas>
  <p class="sr-only">{lines.join(" ")}</p>
</footer>
