<script module lang="ts">
</script>

<script lang="ts">
  import { onMount, type Snippet } from "svelte"
  import {
    createLogoBurst,
    DEFAULT_COLOR,
    DEFAULT_CORE_SIZE,
    DEFAULT_DURATION,
    DEFAULT_PARTICLE_RATIO,
    DEFAULT_RADIUS,
    DEFAULT_SEED,
    DEFAULT_TENTACLE_COUNT,
    type LogoBurstInstance,
    type LogoBurstOptions,
  } from "./logo-burst-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends LogoBurstOptions {
    class?: string
    /** Centered mark. Defaults to a rounded chevron plate. */
    children?: Snippet
    /**
     * Increment to replay the explosion. Mount already plays once.
     */
    replayKey?: number
    /** Click / Enter on the mark replays the burst. Default `true`. */
    replayOnClick?: boolean
    /** Accessible name. Default `"Logo burst"`. */
    label?: string
  }

  let {
    class: className = "",
    children,
    tentacleCount = DEFAULT_TENTACLE_COUNT,
    color = DEFAULT_COLOR,
    coreSize,
    radius = DEFAULT_RADIUS,
    duration = DEFAULT_DURATION,
    seed = DEFAULT_SEED,
    particleRatio = DEFAULT_PARTICLE_RATIO,
    replayKey = 0,
    replayOnClick = true,
    label = "Logo burst",
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let core: HTMLElement | undefined = $state()
  let instance: LogoBurstInstance | null = null
  let lastReplayKey: number | null = null

  onMount(() => {
    if (!canvas) return
    instance = createLogoBurst(canvas, {
      tentacleCount,
      color,
      coreSize: coreSize ?? DEFAULT_CORE_SIZE,
      radius,
      duration,
      seed,
      particleRatio,
    })
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({
      tentacleCount,
      color,
      coreSize,
      radius,
      duration,
      seed,
      particleRatio,
    })
  })

  $effect(() => {
    const el = core
    const override = coreSize
    if (!el || override !== undefined) return
    const sync = () => {
      const box = el.getBoundingClientRect()
      const measured = Math.max(box.width, box.height)
      if (measured > 0) instance?.setOptions({ coreSize: measured })
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  })

  $effect(() => {
    const key = replayKey
    if (lastReplayKey === null) {
      lastReplayKey = key
      return
    }
    if (key === lastReplayKey) return
    lastReplayKey = key
    instance?.replay()
  })

  function replay() {
    instance?.replay()
  }
</script>

{#snippet mark()}
  {#if children}
    {@render children()}
  {:else}
    <span
      data-slot="logo-burst-mark"
      class="flex size-20 items-center justify-center rounded-[22%] bg-white text-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" class="size-10">
        <path
          d="M12 5.4 20.4 18.2h-3.7L12 10.3l-4.7 7.9H3.6Z"
          fill="currentColor"
        ></path>
      </svg>
    </span>
  {/if}
{/snippet}

<div
  data-slot="logo-burst"
  role={replayOnClick ? undefined : "img"}
  aria-label={replayOnClick ? undefined : label}
  class={cn("relative isolate size-full overflow-hidden", className)}
>
  <canvas
    bind:this={canvas}
    aria-hidden="true"
    class="absolute inset-0 size-full"
  ></canvas>
  <div
    class="pointer-events-none absolute inset-0 flex items-center justify-center"
  >
    {#if replayOnClick}
      <button
        bind:this={core}
        type="button"
        aria-label="Replay burst"
        onclick={replay}
        class="pointer-events-auto relative cursor-pointer rounded-[22%] border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        {@render mark()}
      </button>
    {:else}
      <div bind:this={core} class="pointer-events-auto relative">
        {@render mark()}
      </div>
    {/if}
  </div>
</div>
