<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createImagePeel,
    IMAGE_PEEL_STRIPS,
    normalizeSide,
    type ImagePeelInstance,
    type ImagePeelSide,
  } from "./image-peel-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props {
    class?: string
    /** Image that peels away. Any URL the browser can draw. */
    src: string
    /** Accessible name for the sheet. Default `""`. */
    alt?: string
    /** Edge that lifts first. Default `"bottom"`. */
    side?: ImagePeelSide
    /**
     * How much of the sheet peels away at the end of the scroll, from 0 to 1.
     * `1` clears the sheet. `0.5` stops halfway. Default `1`.
     */
    amount?: number
    /** What is waiting under the sheet. */
    children?: import("svelte").Snippet
    /**
     * Optional id for docs demos. `playImagePeel({ target })` only
     * animates instances whose `demoId` matches.
     */
    demoId?: string
  }

  let {
    class: className = "",
    src,
    alt = "",
    side = "bottom",
    amount = 1,
    children,
    demoId,
  }: Props = $props()

  let rootEl: HTMLElement | undefined = $state()
  let failed = $state(false)
  let instance: ImagePeelInstance | null = null

  const strips = Array.from({ length: IMAGE_PEEL_STRIPS }, (_, index) => index)
  function stickerMask(index: number, isHorizontal: boolean) {
    const count = IMAGE_PEEL_STRIPS
    const offset = (index / (count - 1)) * 100
    const image = `url(${JSON.stringify(src)})`
    const size = isHorizontal ? `100% ${count * 100}%` : `${count * 100}% 100%`
    const position = isHorizontal ? `0% ${offset}%` : `${offset}% 0%`
    return [
      `mask-image:${image}`,
      `-webkit-mask-image:${image}`,
      "mask-repeat:no-repeat",
      "-webkit-mask-repeat:no-repeat",
      `mask-size:${size}`,
      `-webkit-mask-size:${size}`,
      `mask-position:${position}`,
      `-webkit-mask-position:${position}`,
      "mask-mode:alpha",
    ].join(";")
  }

  const shadeClass: Record<ImagePeelSide, string> = {
    top: "bg-gradient-to-b from-black via-black/70 to-transparent",
    bottom: "bg-gradient-to-t from-black via-black/70 to-transparent",
    left: "bg-gradient-to-r from-black via-black/70 to-transparent",
    right: "bg-gradient-to-l from-black via-black/70 to-transparent",
  }

  let resolvedSide = $derived(normalizeSide(side))
  let horizontal = $derived(resolvedSide === "top" || resolvedSide === "bottom")

  $effect(() => {
    const current = src
    failed = false
    if (!current) return
    let cancelled = false
    const probe = new Image()
    probe.onload = () => {
      if (!cancelled) failed = false
    }
    probe.onerror = () => {
      if (!cancelled) failed = true
    }
    probe.src = current
    return () => {
      cancelled = true
    }
  })

  onMount(() => {
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    const root = rootEl
    const currentSide = resolvedSide
    const currentDemo = demoId
    const currentFailed = failed
    const currentSrc = src
    if (!root || currentFailed || !currentSrc) return
    instance?.destroy()
    instance = createImagePeel(root, {
      side: currentSide,
      demoId: currentDemo,
    })
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({ side: resolvedSide, amount })
  })
</script>

<section
  bind:this={rootEl}
  data-slot="image-peel"
  data-image-peel-demo={demoId}
  aria-label={alt || undefined}
  class={cn("relative h-[240vh]", className)}
>
  <div data-peel-stage class="sticky top-0 h-svh w-full">
    <div data-peel-reveal class="absolute inset-0">
      {@render children?.()}
    </div>
    <img
      data-peel-drop
      src={src}
      alt=""
      aria-hidden="true"
      draggable="false"
      class="pointer-events-none absolute object-contain opacity-50 blur-2xl select-none"
    />
    <div data-peel-sheet class="absolute perspective-[1100px]">
      {#if failed}
        <div class="flex h-full items-end bg-muted p-8 text-sm text-muted-foreground">
          This image didn't load.
        </div>
      {:else}
        {#each strips as index (`${resolvedSide}-${index}`)}
          <div
            data-peel-strip
            data-index={index}
            aria-hidden="true"
            class={cn(
              "absolute [transform-style:preserve-3d]",
              horizontal ? "inset-x-0" : "inset-y-0"
            )}
            style={`${
              horizontal
                ? `top:${(index / IMAGE_PEEL_STRIPS) * 100}%;height:calc(${100 / IMAGE_PEEL_STRIPS}% + 2px);`
                : `left:${(index / IMAGE_PEEL_STRIPS) * 100}%;width:calc(${100 / IMAGE_PEEL_STRIPS}% + 2px);`
            }${stickerMask(index, horizontal)}`}
          >
            <div data-peel-front class="absolute inset-0 overflow-hidden">
              <img
                src={src}
                alt=""
                draggable="false"
                class="absolute max-w-none object-cover select-none"
                style={horizontal
                  ? `width:100%;height:${IMAGE_PEEL_STRIPS * 100}%;top:${-index * 100}%;left:0;`
                  : `height:100%;width:${IMAGE_PEEL_STRIPS * 100}%;left:${-index * 100}%;top:0;`}
              />
              <div
                data-peel-shade
                class={cn(
                  "pointer-events-none absolute inset-0 opacity-0",
                  shadeClass[resolvedSide]
                )}
              ></div>
            </div>
            <div
              data-peel-back
              class="absolute inset-0 bg-[#f4f0e6] shadow-[inset_0_0_24px_rgba(0,0,0,0.18)] dark:bg-[#2a2824]"
            >
              <div
                data-peel-shade
                class="pointer-events-none absolute inset-0 bg-black opacity-0"
              ></div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</section>
