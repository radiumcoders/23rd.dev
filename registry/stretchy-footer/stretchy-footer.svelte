<script module lang="ts">
</script>

<script lang="ts">
  import { onMount, untrack } from "svelte"
  import {
    createStretchyFooter,
    DEFAULT_BLUR,
    DEFAULT_COLORS,
    DEFAULT_COLUMNS,
    DEFAULT_DAMPING,
    DEFAULT_GLOW,
    DEFAULT_MAX_STRETCH,
    DEFAULT_STIFFNESS,
    type StretchyFooterInstance,
    type StretchyFooterOptions,
  } from "./stretchy-footer-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends StretchyFooterOptions {
    class?: string
    /**
     * Page content inside the overflow scroller.
     * Ignored when `scrollEl` / `windowScroll` paint overlay-only.
     */
    children?: import("svelte").Snippet
    /**
     * External scroll container. When set, this component only paints the
     * aurora overlay and binds overscroll to that element.
     * When omitted (and `windowScroll` is false), this component *is* the scroller.
     */
    scrollEl?: HTMLElement
    /**
     * Bind overscroll to the window and paint a fixed bottom aurora.
     * Use on full pages instead of a nested scroller.
     */
    windowScroll?: boolean
    /**
     * Element that lifts with the stretch (CSS selector).
     * Used with `windowScroll` / `scrollEl`. Default `[data-stretchy-page]`.
     */
    contentSelector?: string
    /** Accessible label for the scroll region. */
    label?: string
  }

  let {
    class: className = "",
    children,
    scrollEl,
    windowScroll = false,
    contentSelector = "[data-stretchy-page]",
    maxStretch = DEFAULT_MAX_STRETCH,
    colors = DEFAULT_COLORS,
    stiffness = DEFAULT_STIFFNESS,
    damping = DEFAULT_DAMPING,
    columns = DEFAULT_COLUMNS,
    blur = DEFAULT_BLUR,
    glow = DEFAULT_GLOW,
    flip = false,
    rotate = 0,
    label = "Stretchy overflow",
    demoId,
  }: Props = $props()

  let mounted = $state(false)
  let canvas: HTMLCanvasElement | undefined = $state()
  let scroller: HTMLDivElement | undefined = $state()
  let content: HTMLDivElement | undefined = $state()
  let instance: StretchyFooterInstance | null = null

  onMount(() => {
    mounted = true
  })

  // Remount only when the wiring changes; options stream in below.
  $effect(() => {
    const target = windowScroll ? window : (scrollEl ?? scroller)
    if (!canvas || !target) return
    const lifted = windowScroll || scrollEl ? contentSelector : content
    const next = createStretchyFooter(
      { canvas, scroller: target, content: lifted },
      untrack(() => ({
        maxStretch,
        colors,
        stiffness,
        damping,
        columns,
        blur,
        glow,
        flip,
        rotate,
        demoId,
      }))
    )
    instance = next
    return () => {
      next?.destroy()
      if (instance === next) instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({
      maxStretch,
      colors,
      stiffness,
      damping,
      columns,
      blur,
      glow,
      flip,
      rotate,
      demoId,
    })
  })

  function portalToBody(node: HTMLElement) {
    document.body.appendChild(node)
    return {
      destroy() {
        node.remove()
      },
    }
  }
</script>

{#snippet aurora()}
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-x-0 bottom-0 z-20 overflow-hidden"
    style="height: {maxStretch}px;"
  >
    <canvas bind:this={canvas} class="invisible absolute"></canvas>
  </div>
{/snippet}

{#if windowScroll}
  {#if mounted}
    <!-- Portal so `fixed` stays on the viewport; the lifted page is
         transformed and would otherwise pin it to the content. -->
    <div
      use:portalToBody
      data-slot="stretchy-footer"
      class={cn("pointer-events-none fixed inset-x-0 bottom-0 z-50", className)}
      style="height: {maxStretch}px;"
    >
      {@render aurora()}
    </div>
  {/if}
{:else if scrollEl}
  <div
    data-slot="stretchy-footer"
    class={cn("pointer-events-none absolute inset-x-0 bottom-0", className)}
    style="height: {maxStretch}px;"
  >
    {@render aurora()}
  </div>
{:else}
  <!-- The aurora sits beside the scroller, not in it, so it stays on the
       viewport floor instead of scrolling away with the content. -->
  <div
    data-slot="stretchy-footer"
    class={cn("relative isolate overflow-hidden", className)}
  >
    <div
      bind:this={scroller}
      role="region"
      aria-label={label}
      class="h-full overflow-x-hidden overflow-y-auto"
    >
      <div bind:this={content} class="relative z-10 min-h-full">
        {@render children?.()}
      </div>
    </div>
    {@render aurora()}
  </div>
{/if}
