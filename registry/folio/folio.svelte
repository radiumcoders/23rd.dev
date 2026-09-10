<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import { createFolio, type FolioInstance } from "./folio-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props {
    class?: string
    /** Page content that leans while you scroll. */
    children?: import("svelte").Snippet
    /** Peak blur in px at full tilt. Default `4`. */
    blur?: number
    /** CSS perspective distance in px. Default `1000`. Floor `1000`. */
    perspective?: number
    /**
     * How long the lean takes to come back after the bottom, in ms.
     * Default `520`.
     */
    returnMs?: number
    /**
     * Bind to the window and tilt `contentSelector` instead of wrapping
     * children. Default `false` — this component *is* the scroller.
     */
    windowScroll?: boolean
    /**
     * Element to tilt when `windowScroll` is set.
     * Default `[data-folio-page]`.
     */
    contentSelector?: string
    /** Accessible name for the tilting page. */
    label?: string
    /**
     * Optional id for docs demos. `playFolioDemo({ target })` only
     * animates instances whose `demoId` matches.
     */
    demoId?: string
  }

  let {
    class: className = "",
    children,
    blur = 4,
    perspective = 1000,
    returnMs = 520,
    windowScroll = false,
    contentSelector = "[data-folio-page]",
    label = "Tilting page",
    demoId,
  }: Props = $props()

  let scrollerEl: HTMLDivElement | undefined = $state()
  let planeEl: HTMLDivElement | undefined = $state()
  let instance: FolioInstance | null = null

  onMount(() => {
    const scroller = windowScroll ? window : scrollerEl
    const plane = windowScroll
      ? document.querySelector<HTMLElement>(contentSelector)
      : planeEl
    if (!scroller || !plane) return

    instance = createFolio({
      plane,
      scroller,
      demoId,
      blur,
      perspective,
      returnMs,
    })

    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({ blur, perspective, returnMs })
  })
</script>

{#if !windowScroll}
  <div
    bind:this={scrollerEl}
    data-slot="folio"
    data-folio-demo={demoId}
    class={cn(
      "relative h-full overflow-x-hidden overflow-y-auto overscroll-contain",
      className
    )}
  >
    <div
      bind:this={planeEl}
      data-slot="folio-plane"
      aria-label={label}
      class="relative min-h-full overflow-x-clip [contain:paint]"
    >
      {@render children?.()}
    </div>
  </div>
{/if}
